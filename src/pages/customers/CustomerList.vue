<script setup lang="ts">
import { ref, onMounted, h, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NDataTable, NButton, NInput, NPopconfirm, NIcon, NSpin, NModal, NTabs, NTabPane, useMessage, useDialog } from 'naive-ui'
import { Search, Plus, ChevronLeft, ChevronRight } from '@vicons/tabler'
import type { DataTableColumns } from 'naive-ui'
import { customerApi, invoiceApi } from '../../api'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const isMobile = ref(window.innerWidth < 1024)

function onResize() { isMobile.value = window.innerWidth < 1024 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
const countActive = ref(0)
const countIsolated = ref(0)
const countOnline = ref(0)
const countOffline = ref(0)

async function fetchStats() {
  try {
    const { data: s } = await customerApi.stats()
    countActive.value = s.active || 0
    countIsolated.value = s.isolated || 0
    countOnline.value = s.online || 0
    countOffline.value = s.offline || 0
  } catch {
    // fallback: hitung dari data halaman saat ini
    countActive.value = data.value.filter(r => r.status === 'active').length
    countIsolated.value = data.value.filter(r => r.status === 'isolated').length
    countOnline.value = data.value.filter(r => r.connection_status === 'online').length
    countOffline.value = data.value.filter(r => r.connection_status === 'offline').length
  }
}

// ── Filter status via tombol strip (usulan tenant): klik untuk menyaring,
// klik lagi untuk kembali ke semua. ──
type StatusFilter = '' | 'active' | 'online' | 'offline' | 'isolated'
const statusFilter = ref<StatusFilter>('')
function toggleFilter(key: StatusFilter) {
  statusFilter.value = statusFilter.value === key ? '' : key
  page.value = 1
  fetchData()
}
function filterParams(): Record<string, any> {
  switch (statusFilter.value) {
    case 'active': return { status: 'active' }
    case 'isolated': return { status: 'isolated' }
    case 'online': return { connection: 'online' }
    case 'offline': return { connection: 'offline' }
    default: return {}
  }
}

// ── Modal Detail Pelanggan (quick view, usulan tenant) ──
const showDrawer = ref(false)
const drawerLoading = ref(false)
const det = ref<any>(null)
const qvTab = ref('informasi')
const qvUsageHistory = ref<any[]>([])
const qvConnections = ref<any[]>([])
const qvInvoices = ref<any[]>([])
async function openQuickView(row: any) {
  showDrawer.value = true
  drawerLoading.value = true
  det.value = null
  qvTab.value = 'informasi'
  qvUsageHistory.value = []
  qvConnections.value = []
  qvInvoices.value = []
  try {
    const [detRes, usageRes, connRes, invRes] = await Promise.all([
      customerApi.get(row.id),
      customerApi.bandwidthHistory(row.id, { year: new Date().getFullYear() }).catch(() => ({ data: { data: [] } })),
      customerApi.connections(row.id, { per_page: 5 }).catch(() => ({ data: { data: [] } })),
      invoiceApi.list({ customer_id: row.id, per_page: 5 }).catch(() => ({ data: { data: [] } })),
    ])
    det.value = detRes.data?.data || detRes.data
    // Bulan terbaru dulu, dan hanya bulan yang sudah ada pemakaian.
    qvUsageHistory.value = (usageRes.data?.data || [])
      .filter((m: any) => m.session_count > 0 || m.total_bytes > 0)
      .sort((a: any, b: any) => b.month - a.month)
    qvConnections.value = connRes.data?.data || []
    qvInvoices.value = invRes.data?.data || []
  } catch { message.error('Gagal memuat detail pelanggan') }
  drawerLoading.value = false
}
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
function fmtDuration(seconds?: number | null) {
  let s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60)
  if (h) return `${h} jam ${m} menit`
  return `${m} menit`
}
const connStatusLabel = (c: any) => c.status === 'active'
  ? { label: 'Sedang Online', color: '#16a34a', bg: '#dcfce7' }
  : { label: c.terminate_cause || 'Terputus', color: '#64748b', bg: '#f1f5f9' }
const invoiceStatusMap: Record<string, { label: string; color: string; bg: string }> = {
  paid:    { label: 'Lunas',       color: '#16a34a', bg: '#dcfce7' },
  unpaid:  { label: 'Belum Bayar', color: '#d97706', bg: '#fef3c7' },
  overdue: { label: 'Lewat Tempo', color: '#dc2626', bg: '#fee2e2' },
}
function fmtBytes(n?: number | null) {
  const v = Number(n || 0)
  if (v >= 1e9) return (v / 1e9).toFixed(2) + ' GB'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + ' MB'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + ' KB'
  return v + ' B'
}
function fmtDate(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtUptime(startedAt?: string | null) {
  if (!startedAt) return '-'
  let s = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  const d = Math.floor(s / 86400); s -= d * 86400
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60)
  const parts: string[] = []
  if (d) parts.push(`${d} hari`)
  if (h) parts.push(`${h} jam`)
  parts.push(`${m} menit`)
  return parts.join(' ')
}
function dueInfo(): string {
  const due = det.value?.billing?.billing_due_date
  if (!due) return '-'
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)
  const dateStr = new Date(due).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return days >= 0 ? `${dateStr} (${days} hari lagi)` : `${dateStr} (lewat ${-days} hari)`
}
const detMac = computed(() => det.value?.connection?.active_session?.caller_id || det.value?.ont?.network?.mac_address || '-')
const detLastSeen = computed(() => {
  const c = det.value?.connection
  if (!c) return '-'
  if (c.status === 'online') return 'Sedang online'
  return fmtDate(c.active_session?.ended_at || c.active_session?.updated_at || det.value?.ont?.last_online_at)
})
async function drawerIsolate() {
  if (!det.value) return
  handleIsolate({ id: det.value.id, name: det.value.name })
}
async function drawerActivate() {
  if (!det.value) return
  try {
    await customerApi.activate(det.value.id)
    message.success('Pelanggan berhasil diaktifkan')
    fetchData(); fetchStats(); openQuickView({ id: det.value.id })
  } catch { message.error('Gagal mengaktifkan pelanggan') }
}
function drawerDelete() {
  if (!det.value) return
  const id = det.value.id
  dialog.error({
    title: 'Hapus Pelanggan',
    content: `Yakin hapus ${det.value.name}? Data pelanggan akan dihapus permanen.`,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      showDrawer.value = false
      await handleDelete(id)
    },
  })
}

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Aktif',    color: '#16a34a', bg: '#dcfce7' },
  isolated: { label: 'Isolir',   color: '#ea580c', bg: '#fff7ed' },
  inactive: { label: 'Nonaktif', color: '#94a3b8', bg: '#f1f5f9' },
}

const connMap: Record<string, { label: string; color: string; dot: string }> = {
  online:   { label: 'Online',  color: '#16a34a', dot: '#22c55e' },
  offline:  { label: 'Offline', color: '#94a3b8', dot: '#cbd5e1' },
  isolated: { label: 'Isolir',  color: '#ea580c', dot: '#f97316' },
}

function maskPhone(phone: string): string {
  if (!phone) return '-'
  // 081234567890 → 0812xxxx7890
  if (phone.length >= 8) {
    const prefix = phone.slice(0, 4)
    const suffix = phone.slice(-4)
    return prefix + 'xxxx' + suffix
  }
  return phone
}

function fmtCurrency(v: any) {
  const n = Number(v || 0)
  if (!n) return ''
  return 'Rp ' + n.toLocaleString('id-ID')
}

const columns: DataTableColumns<any> = [
  {
    title: 'Pelanggan',
    key: 'name',
    minWidth: 180,
    render: (row) => h('div', { style: 'line-height:1.4' }, [
      h('div', { style: 'font-weight:700;font-size:13px;color:var(--app-text-primary);text-transform:uppercase' }, row.name),
      h('div', { style: 'font-size:11px;color:var(--app-text-muted);font-family:monospace' }, row.customer_code),
    ]),
  },
  {
    title: 'Kontak',
    key: 'phone',
    width: 150,
    render: (row) => h('div', { style: 'line-height:1.4' }, [
      h('div', { style: 'font-size:13px' }, maskPhone(row.phone)),
      row.address ? h('div', { style: 'font-size:11px;color:var(--app-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px', title: row.address }, row.address) : null,
    ]),
  },
  {
    title: 'Paket',
    key: 'package',
    width: 160,
    render: (row) => h('div', { style: 'line-height:1.4' }, [
      h('div', { style: 'font-size:13px;font-weight:600' }, row.package?.name || '-'),
      row.package?.price ? h('div', { style: 'font-size:11px;color:var(--app-text-muted)' }, fmtCurrency(row.package.price) + '/bln') : null,
    ]),
  },
  {
    title: 'Status',
    key: 'status',
    width: 110,
    render: (row) => {
      const s = statusMap[row.status] || statusMap.inactive
      return h('span', {
        style: `display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;background:${s.bg};color:${s.color}`
      }, s.label)
    },
  },
  {
    title: 'Koneksi',
    key: 'connection_status',
    width: 110,
    render: (row) => {
      const cs = row.connection_status || 'offline'
      const c = connMap[cs] || connMap.offline
      return h('div', { style: 'display:flex;align-items:center;gap:6px' }, [
        h('span', { style: `width:7px;height:7px;border-radius:50%;background:${c.dot};flex-shrink:0;${cs === 'online' ? 'box-shadow:0 0 0 2px rgba(34,197,94,0.25)' : ''}` }),
        h('span', { style: `font-size:12px;font-weight:600;color:${c.color}` }, c.label),
      ])
    },
  },
  {
    title: '',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h('div', { style: 'display:flex;gap:4px;align-items:center' }, [
      h(NButton, {
        size: 'small', quaternary: true, type: 'info', title: 'Detail',
        style: 'padding:0 6px;min-width:28px',
        onClick: (e: MouseEvent) => { e.stopPropagation(); openQuickView(row) },
      }, { default: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' }) }),
      row.status === 'active'
        ? h(NButton, {
            size: 'small', quaternary: true, type: 'warning', title: 'Isolir',
            style: 'padding:0 6px;min-width:28px',
            onClick: (e: MouseEvent) => { e.stopPropagation(); handleIsolate(row) },
          }, { default: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' }) })
        : row.status === 'isolated'
          ? h(NButton, {
              size: 'small', quaternary: true, type: 'success', title: 'Aktifkan',
              style: 'padding:0 6px;min-width:28px',
              onClick: (e: MouseEvent) => { e.stopPropagation(); handleActivate(row) },
            }, { default: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>' }) })
          : null,
      h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
        trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error', title: 'Hapus', style: 'padding:0 6px;min-width:28px', onClick: (e: MouseEvent) => e.stopPropagation() }, {
          default: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }),
        }),
        default: () => 'Yakin hapus pelanggan ini?',
      }),
    ]),
  },
]

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await customerApi.list({
      page: page.value, per_page: pageSize.value,
      search: search.value || undefined,
      ...filterParams(),
    })
    data.value = res.data || []
    total.value = res.total || res.meta?.total || data.value.length
  } catch { message.error('Gagal memuat data pelanggan') }
  loading.value = false
}

async function handleIsolate(row: any) {
  dialog.warning({
    title: 'Isolir Pelanggan',
    content: `Yakin isolir ${row.name}? Koneksi internet akan diputus.`,
    positiveText: 'Ya, Isolir',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      try {
        await customerApi.isolate(row.id)
        message.success('Pelanggan berhasil diisolir')
        fetchData(); fetchStats()
        if (showDrawer.value && det.value?.id === row.id) openQuickView(row)
      } catch { message.error('Gagal mengisolir pelanggan') }
    },
  })
}

async function handleActivate(row: any) {
  try { await customerApi.activate(row.id); message.success('Pelanggan berhasil diaktifkan'); fetchData(); fetchStats() }
  catch { message.error('Gagal mengaktifkan pelanggan') }
}

async function handleDelete(id: string) {
  try { await customerApi.delete(id); message.success('Pelanggan berhasil dihapus'); fetchData(); fetchStats() }
  catch { message.error('Gagal menghapus pelanggan') }
}

function handlePageChange(p: number) { page.value = p; fetchData() }

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchData() }, 400)
}

onMounted(() => { fetchData(); fetchStats() })
</script>

<template>
  <div class="clist-page">

    <!-- Header -->
    <div class="clist-header">
      <div class="clist-title-block">
        <h2 class="clist-title">Pelanggan</h2>
        <span class="clist-total">{{ total.toLocaleString('id-ID') }} total</span>
      </div>
      <div class="clist-header-right">
        <n-input
          v-model:value="search"
          placeholder="Cari nama / kode / telp..."
          clearable
          class="clist-search"
          @input="onSearchInput"
          @clear="() => { page = 1; fetchData() }"
        >
          <template #prefix><n-icon :size="15" style="opacity:0.4"><Search /></n-icon></template>
        </n-input>
        <n-button type="primary" @click="router.push('/customers/create')" class="clist-add-btn">
          <template #icon><n-icon :size="15"><Plus /></n-icon></template>
          <span class="add-label">Tambah</span>
        </n-button>
      </div>
    </div>

    <!-- Stats strip: tombol filter status (klik untuk saring, klik lagi untuk semua) -->
    <div class="stats-strip">
      <button class="stat-item stat-btn" :class="{ selected: statusFilter === 'active' }" title="Tampilkan hanya pelanggan aktif" @click="toggleFilter('active')">
        <span class="stat-val">{{ countActive }}</span>
        <span class="stat-lbl">Aktif</span>
      </button>
      <div class="stat-divider" />
      <button class="stat-item stat-btn" :class="{ selected: statusFilter === 'online' }" title="Tampilkan hanya pelanggan online" @click="toggleFilter('online')">
        <span class="stat-val online">{{ countOnline }}</span>
        <span class="stat-lbl">Online</span>
      </button>
      <div class="stat-divider" />
      <button class="stat-item stat-btn" :class="{ selected: statusFilter === 'offline' }" title="Tampilkan hanya pelanggan offline" @click="toggleFilter('offline')">
        <span class="stat-val danger">{{ countOffline }}</span>
        <span class="stat-lbl">Offline</span>
      </button>
      <div class="stat-divider" />
      <button class="stat-item stat-btn" :class="{ selected: statusFilter === 'isolated' }" title="Tampilkan hanya pelanggan isolir" @click="toggleFilter('isolated')">
        <span class="stat-val warn">{{ countIsolated }}</span>
        <span class="stat-lbl">Isolir</span>
      </button>
      <template v-if="statusFilter">
        <div class="stat-divider" />
        <button class="stat-item stat-btn stat-reset" title="Hapus filter" @click="toggleFilter(statusFilter)">✕ Semua</button>
      </template>
    </div>

    <!-- Desktop Table -->
    <n-card v-if="!isMobile" class="clist-table-card" :bordered="false">
      <n-data-table
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="{
          page, pageSize, itemCount: total,
          onUpdatePage: handlePageChange,
          onUpdatePageSize: (s: number) => { pageSize = s; page = 1; fetchData() },
          showSizePicker: true,
          pageSizes: [10, 20, 50],
        }"
        :scroll-x="860"
        size="small"
        :row-props="(row: any) => ({ style: 'cursor:pointer', onClick: () => openQuickView(row) })"
        remote
      />
    </n-card>

    <!-- Mobile List -->
    <div v-else class="mlist">
      <div v-if="loading" class="mlist-center"><n-spin /></div>
      <template v-else-if="data.length">
        <div
          v-for="row in data"
          :key="row.id"
          class="mcard"
          @click="openQuickView(row)"
        >
          <!-- top row -->
          <div class="mcard-top">
            <div class="mcard-left">
              <div class="mcard-name" style="text-transform: uppercase">{{ row.name }}</div>
              <div class="mcard-code">{{ row.customer_code }}</div>
            </div>
            <div class="mcard-right">
              <span class="mpill" :style="{ background: statusMap[row.status]?.bg, color: statusMap[row.status]?.color }">
                {{ statusMap[row.status]?.label || row.status }}
              </span>
              <div class="mconn" :class="row.connection_status || 'offline'">
                <span class="mconn-dot" />
                {{ connMap[row.connection_status || 'offline']?.label }}
              </div>
            </div>
          </div>

          <!-- meta row -->
          <div class="mcard-meta">
            <span v-if="row.phone" class="mmeta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.07 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 23 17z"/></svg>
              {{ maskPhone(row.phone) }}
            </span>
            <span v-if="row.package?.name" class="mmeta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
              {{ row.package.name }}
            </span>
            <span v-if="row.package?.price" class="mmeta-item price">{{ fmtCurrency(row.package.price) }}/bln</span>
          </div>

          <!-- actions -->
          <div class="mcard-actions" @click.stop>
            <n-button size="tiny" quaternary type="info" title="Detail" class="maction-btn" @click="openQuickView(row)">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </template>
            </n-button>
            <n-button v-if="row.status === 'active'" size="tiny" quaternary type="warning" title="Isolir" class="maction-btn" @click="handleIsolate(row)">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </template>
            </n-button>
            <n-button v-else-if="row.status === 'isolated'" size="tiny" quaternary type="success" title="Aktifkan" class="maction-btn" @click="handleActivate(row)">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              </template>
            </n-button>
            <n-popconfirm @positive-click="handleDelete(row.id)">
              <template #trigger>
                <n-button size="tiny" quaternary type="error" title="Hapus" class="maction-btn">
                  <template #icon>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </template>
                </n-button>
              </template>
              Yakin hapus pelanggan ini?
            </n-popconfirm>
          </div>
        </div>

        <!-- pagination -->
        <div class="mpagination">
          <n-button size="small" :disabled="page <= 1" @click="handlePageChange(page - 1)">
            <n-icon :size="16"><ChevronLeft /></n-icon>
          </n-button>
          <span class="mpage-info">{{ page }} / {{ totalPages }} &nbsp;•&nbsp; {{ total }} pelanggan</span>
          <n-button size="small" :disabled="page >= totalPages" @click="handlePageChange(page + 1)">
            <n-icon :size="16"><ChevronRight /></n-icon>
          </n-button>
        </div>
      </template>
      <div v-else class="mlist-center" style="flex-direction:column;gap:8px;opacity:0.4;padding:60px 0">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span style="font-size:14px">Belum ada pelanggan</span>
      </div>
    </div>

    <!-- Modal Detail Pelanggan (quick view di tengah, sesuai mockup tenant) -->
    <n-modal v-model:show="showDrawer" preset="card" title="Detail Pelanggan"
             :style="{ maxWidth: '680px', width: '95vw' }" :bordered="false">
      <div v-if="drawerLoading" class="mlist-center"><n-spin /></div>
      <template v-else-if="det">
      <div class="qv-modal-body">
        <!-- Header: avatar + identitas -->
        <div class="qv-head">
          <div class="qv-avatar">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.8 1.7-9.8 4.9v2.4h19.6v-2.4c0-3.2-6.5-4.9-9.8-4.9z"/></svg>
          </div>
          <div class="qv-head-text">
            <div class="qv-name-row">
              <span class="qv-name">{{ det.name }}</span>
              <span class="mpill" :style="{ background: statusMap[det.status]?.bg, color: statusMap[det.status]?.color }">
                {{ statusMap[det.status]?.label || det.status }}
              </span>
            </div>
            <div class="qv-sub"><span class="qv-sub-lbl">ID Pelanggan</span><span class="qv-sub-colon">:</span><span class="mono">{{ det.customer_code }}</span></div>
            <div class="qv-sub"><span class="qv-sub-lbl">Paket</span><span class="qv-sub-colon">:</span><span>{{ det.package?.name || '-' }}{{ det.package?.price ? ' - ' + fmtCurrency(det.package.price) + '/bln' : '' }}</span></div>
            <div v-if="det.address" class="qv-sub"><span class="qv-sub-lbl">Alamat</span><span class="qv-sub-colon">:</span><span>{{ det.address }}</span></div>
          </div>
        </div>

        <n-tabs v-model:value="qvTab" type="line" size="medium" class="qv-tabs">
          <!-- TAB: Informasi -->
          <n-tab-pane name="informasi" tab="Informasi">
            <div class="qv-box qv-grid">
              <div class="qv-item"><span class="qv-lbl">Kontak</span><span class="qv-val">{{ det.phone || '-' }}</span></div>
              <div class="qv-item">
                <span class="qv-lbl">Status Koneksi</span>
                <span class="qv-val mconn" :class="det.connection?.status || 'offline'">
                  <span class="mconn-dot" /> {{ connMap[det.connection?.status || 'offline']?.label }}
                </span>
              </div>
              <div class="qv-item"><span class="qv-lbl">IP Address</span><span class="qv-val mono">{{ det.connection?.current_ip || det.connection?.configured_ip || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Uptime</span><span class="qv-val">{{ det.connection?.status === 'online' ? fmtUptime(det.connection?.active_session?.started_at) : '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">MAC Address</span><span class="qv-val mono">{{ detMac }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Download</span><span class="qv-val">{{ (det.connection?.realtime_download_mbps ?? 0).toFixed(1) }} Mbps</span></div>
              <div class="qv-item"><span class="qv-lbl">Tanggal Daftar</span><span class="qv-val">{{ fmtDate(det.billing?.join_date) }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Upload</span><span class="qv-val">{{ (det.connection?.realtime_upload_mbps ?? 0).toFixed(1) }} Mbps</span></div>
              <div class="qv-item"><span class="qv-lbl">Expired</span><span class="qv-val strong">{{ dueInfo() }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Last Seen</span><span class="qv-val">{{ detLastSeen }}</span></div>
            </div>
          </n-tab-pane>

          <!-- TAB: Koneksi -->
          <n-tab-pane name="koneksi" tab="Koneksi">
            <div class="qv-box qv-grid">
              <div class="qv-item"><span class="qv-lbl">Tipe Koneksi</span><span class="qv-val" style="text-transform:uppercase">{{ det.connection?.type || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Router</span><span class="qv-val">{{ det.router?.name || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Username PPPoE</span><span class="qv-val mono">{{ det.access?.pppoe_username || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">NAS IP</span><span class="qv-val mono">{{ det.connection?.active_session?.nas_ip_address || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Sesi Dimulai</span><span class="qv-val">{{ fmtDate(det.connection?.active_session?.started_at) }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Session ID</span><span class="qv-val mono">{{ det.connection?.active_session?.session_id || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Pemakaian Sesi ↓</span><span class="qv-val">{{ fmtBytes(det.connection?.active_session?.output_octets) }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Pemakaian Sesi ↑</span><span class="qv-val">{{ fmtBytes(det.connection?.active_session?.input_octets) }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Kecepatan Paket</span><span class="qv-val">{{ det.package ? `${det.package.bandwidth_down || '-'} / ${det.package.bandwidth_up || '-'} Mbps` : '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Port ODP</span><span class="qv-val">{{ det.odp_port ? 'Port ' + det.odp_port.port_number : '-' }}</span></div>
            </div>
          </n-tab-pane>

          <!-- TAB: Riwayat (Konsumsi Data + Koneksi) -->
          <n-tab-pane name="riwayat" tab="Riwayat">
            <div class="qv-subhead">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>Riwayat Konsumsi Data</span>
            </div>
            <div class="qv-box">
              <div v-if="!qvUsageHistory.length" class="qv-empty">Belum ada data konsumsi tahun ini</div>
              <div v-for="m in qvUsageHistory" :key="m.month" class="qv-log-row">
                <div class="qv-log-main">
                  <span class="qv-log-action">{{ monthNames[m.month - 1] }} {{ new Date().getFullYear() }}</span>
                  <span class="qv-log-desc">{{ m.session_count }} sesi koneksi</span>
                </div>
                <div class="qv-usage-vals">
                  <span class="qv-usage-down">↓ {{ fmtBytes(m.total_download) }}</span>
                  <span class="qv-usage-up">↑ {{ fmtBytes(m.total_upload) }}</span>
                </div>
              </div>
            </div>

            <div class="qv-subhead" style="margin-top: 16px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              <span>Riwayat Koneksi <em>(5 terakhir)</em></span>
            </div>
            <div class="qv-box">
              <div v-if="!qvConnections.length" class="qv-empty">Belum ada riwayat koneksi</div>
              <div v-for="c in qvConnections" :key="c.id" class="qv-log-row">
                <div class="qv-log-main">
                  <span class="qv-log-action">{{ fmtDate(c.started_at) }}</span>
                  <span class="qv-log-desc">IP {{ c.ip || '-' }} · durasi {{ fmtDuration(c.uptime) }} · ↓{{ fmtBytes(c.download) }} ↑{{ fmtBytes(c.upload) }}</span>
                </div>
                <span class="mpill" :style="{ background: connStatusLabel(c).bg, color: connStatusLabel(c).color }">
                  {{ connStatusLabel(c).label }}
                </span>
              </div>
            </div>
          </n-tab-pane>

          <!-- TAB: Pembayaran -->
          <n-tab-pane name="pembayaran" tab="Pembayaran">
            <div class="qv-subhead">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <span>Pembayaran <em>(5 terakhir)</em></span>
            </div>
            <div class="qv-box">
              <div v-if="!qvInvoices.length" class="qv-empty">Belum ada invoice</div>
              <div v-for="inv in qvInvoices" :key="inv.id" class="qv-log-row">
                <div class="qv-log-main">
                  <span class="qv-log-action">{{ String(inv.period_month).padStart(2, '0') }}/{{ inv.period_year }} — {{ fmtCurrency(inv.total_amount) }}</span>
                  <span class="qv-log-desc">Jatuh tempo {{ inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-' }}{{ inv.paid_at ? ' · dibayar ' + new Date(inv.paid_at).toLocaleDateString('id-ID') : '' }}</span>
                </div>
                <span class="mpill" :style="{ background: invoiceStatusMap[inv.status]?.bg || '#f1f5f9', color: invoiceStatusMap[inv.status]?.color || '#64748b' }">
                  {{ invoiceStatusMap[inv.status]?.label || inv.status }}
                </span>
              </div>
            </div>
          </n-tab-pane>

          <!-- TAB: Perangkat -->
          <n-tab-pane name="perangkat" tab="Perangkat">
            <div v-if="det.ont" class="qv-box qv-grid">
              <div class="qv-item"><span class="qv-lbl">Serial Number</span><span class="qv-val mono">{{ det.ont.serial_number || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Vendor / Model</span><span class="qv-val">{{ [det.ont.vendor, det.ont.model].filter(Boolean).join(' ') || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Status ONT</span><span class="qv-val" style="text-transform:capitalize">{{ det.ont.status || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Terakhir Online</span><span class="qv-val">{{ fmtDate(det.ont.last_online_at) }}</span></div>
              <div class="qv-item"><span class="qv-lbl">WiFi SSID</span><span class="qv-val">{{ det.ont.wifi?.ssid || '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Perangkat Terhubung</span><span class="qv-val">{{ det.ont.connected_hosts?.count ?? '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">Redaman (Rx)</span><span class="qv-val">{{ det.ont.signal?.rx_power != null ? det.ont.signal.rx_power + ' dBm' : '-' }}</span></div>
              <div class="qv-item"><span class="qv-lbl">IP WAN ONT</span><span class="qv-val mono">{{ det.ont.network?.wan_ip || '-' }}</span></div>
            </div>
            <div v-else class="qv-box">
              <div class="qv-empty">
                Belum ada ONT terhubung.<br>
                <span v-if="det.access?.acs_url" style="font-size:12px">Arahkan ONT ke ACS: <span class="mono">{{ det.access.acs_url }}</span></span>
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>

        <!-- Footer aksi -->
        <div class="qv-footer">
          <n-button tertiary size="medium" class="qv-btn-detail" @click="router.push(`/customers/${det.id}`)" title="Buka halaman detail lengkap pelanggan ini">
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </template>
            Buka Detail Lengkap
          </n-button>
          <div class="qv-footer-right">
            <n-button v-if="det.status === 'active'" type="warning" @click="drawerIsolate" title="Putus sementara akses internet pelanggan ini">
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </template>
              Isolir
            </n-button>
            <n-button v-else-if="det.status === 'isolated'" type="success" @click="drawerActivate" title="Aktifkan kembali akses internet pelanggan ini">
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              </template>
              Aktifkan
            </n-button>
            <n-button type="error" secondary @click="drawerDelete" title="Hapus data pelanggan ini secara permanen">
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </template>
              Hapus
            </n-button>
          </div>
        </div>
      </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.clist-page { display: flex; flex-direction: column; gap: 14px; }

/* Header */
.clist-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.clist-title-block { display: flex; align-items: baseline; gap: 10px; }
.clist-title { margin: 0; font-size: 20px; font-weight: 700; }
.clist-total { font-size: 12px; color: var(--app-text-muted); font-weight: 600; }
.clist-header-right { display: flex; align-items: center; gap: 8px; }
.clist-search { width: 260px; }
.add-label {}

/* Stats strip */
.stats-strip { display: flex; align-items: center; gap: 0; background: var(--clist-strip-bg); border: 1px solid var(--app-card-border); border-radius: 8px; padding: 10px 20px; width: fit-content; }
.stat-item { display: flex; align-items: center; gap: 8px; padding: 0 16px; }
.stat-item:first-child { padding-left: 0; }
.stat-item:last-child { padding-right: 0; }
.stat-val { font-size: 20px; font-weight: 700; color: var(--app-text-primary); }
.stat-val.online { color: #22c55e; }
.stat-val.warn { color: #f97316; }
.stat-val.danger { color: #ef4444; }
.stat-lbl { font-size: 11px; color: var(--app-text-muted); font-weight: 600; text-transform: uppercase; }
.stat-divider { width: 1px; height: 28px; background: var(--app-card-border); }
.stat-btn { background: transparent; border: 1.5px solid transparent; border-radius: 8px; cursor: pointer; transition: border-color 0.15s, background 0.15s; margin: -4px 0; padding-top: 4px; padding-bottom: 4px; }
.stat-btn:hover { background: var(--app-accent-soft, rgba(128,128,128,0.08)); }
.stat-btn.selected { border-color: var(--app-accent, #2563eb); background: var(--app-accent-soft, rgba(37,99,235,0.08)); }
.stat-reset { font-size: 12px; font-weight: 700; color: var(--app-text-muted); }

/* Quick view modal */
.qv-head { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 4px; }
.qv-avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--clist-strip-bg); border: 1px solid var(--app-card-border); display: flex; align-items: center; justify-content: center; color: var(--app-text-muted); flex-shrink: 0; }
.qv-head-text { min-width: 0; }
.qv-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.qv-name { font-size: 17px; font-weight: 800; text-transform: uppercase; }
.qv-sub { display: flex; font-size: 12.5px; color: var(--app-text-secondary); line-height: 1.6; }
.qv-sub-lbl { flex: 0 0 82px; }
.qv-sub-colon { flex: 0 0 auto; margin-right: 6px; }
.qv-box { border: 1px solid var(--app-card-border); border-radius: 10px; padding: 14px 16px; min-height: 150px; }
.qv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; }
.qv-item { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.qv-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--app-text-muted); }
.qv-val { font-size: 13px; color: var(--app-text-primary); overflow-wrap: anywhere; }
.qv-val.strong { font-weight: 700; }
.qv-val.mono, .mono { font-family: monospace; }
.qv-empty { text-align: center; color: var(--app-text-muted); font-size: 13px; padding: 34px 0; line-height: 1.7; }
.qv-log-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--app-card-border); }
.qv-log-row:last-child { border-bottom: none; }
.qv-log-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.qv-log-action { font-size: 13px; font-weight: 600; }
.qv-log-desc { font-size: 11.5px; color: var(--app-text-muted); }
.qv-log-time { font-size: 11px; color: var(--app-text-muted); white-space: nowrap; flex-shrink: 0; }
.qv-usage-vals { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; font-size: 12px; font-weight: 600; }
.qv-usage-down { color: #2563eb; }
.qv-usage-up { color: #16a34a; }
.qv-subhead { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; font-size: 12.5px; font-weight: 700; color: var(--app-text-secondary); }
.qv-subhead em { font-style: normal; font-weight: 500; color: var(--app-text-muted); }

/* Body scroll wrapper — jaga modal tetap muat di layar pendek/mobile */
.qv-modal-body { max-height: 76vh; overflow-y: auto; padding-right: 2px; }
.qv-tabs :deep(.n-tabs-nav) { overflow-x: auto; }
.qv-tabs :deep(.n-tabs-tab) { white-space: nowrap; }

/* Footer aksi */
.qv-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--app-card-border); flex-wrap: wrap; }
.qv-footer-right { display: flex; gap: 8px; flex-wrap: wrap; }

@media (max-width: 640px) {
  .qv-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .qv-head { flex-wrap: wrap; }
  .qv-avatar { width: 52px; height: 52px; }
  .qv-name { font-size: 15px; }
  .qv-subhead { font-size: 12px; }
  .qv-modal-body { max-height: 80vh; }
  .qv-footer { flex-direction: column; align-items: stretch; }
  .qv-btn-detail { width: 100%; justify-content: center; }
  .qv-footer-right { width: 100%; }
  .qv-footer-right .n-button { flex: 1; }
}

/* Table */
.clist-table-card { border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

/* Mobile list */
.mlist { display: flex; flex-direction: column; gap: 10px; }
.mlist-center { display: flex; justify-content: center; padding: 40px 0; }
.mcard { background: var(--clist-card-bg); border: 1px solid var(--app-card-border); border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: box-shadow 0.15s; }
.mcard:active { box-shadow: 0 0 0 2px var(--app-accent-medium); }
.mcard-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.mcard-left { min-width: 0; }
.mcard-name { font-size: 15px; font-weight: 700; color: var(--app-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mcard-code { font-size: 11px; color: var(--app-text-muted); font-family: monospace; margin-top: 2px; }
.mcard-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.mpill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
.mconn { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; }
.mconn.online { color: #22c55e; }
.mconn.offline { color: var(--app-text-muted); }
.mconn.isolated { color: #f97316; }
.mconn-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.mcard-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
.mmeta-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--app-text-secondary); }
.mmeta-item.price { font-weight: 700; color: var(--app-text-primary); }
.mcard-actions { display: flex; gap: 6px; padding-top: 10px; border-top: 1px solid var(--clist-action-divider); }
.maction-btn { padding: 0 6px !important; min-width: 30px !important; }
.mpagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 0; }
.mpage-info { font-size: 12px; color: var(--app-text-muted); font-weight: 600; }

/* dark (default) */
:root {
  --clist-strip-bg: rgba(255,255,255,0.03);
  --clist-card-bg: rgba(255,255,255,0.03);
  --clist-action-divider: rgba(0,229,255,0.08);
}
/* light */
html:not(.dark) {
  --clist-strip-bg: #ffffff;
  --clist-card-bg: #ffffff;
  --clist-action-divider: #f1f5f9;
}

@media (min-width: 640px) and (max-width: 1023px) {
  .mlist { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .mpagination { grid-column: 1 / -1; }
}

@media (max-width: 1023px) {
  .clist-header { flex-direction: column; align-items: stretch; }
  .clist-header-right { width: 100%; }
  .clist-search { flex: 1; width: auto; }
  .stats-strip { width: 100%; justify-content: space-around; }
  .stat-item { padding: 0 8px; }
}

@media (max-width: 480px) {
  .clist-title { font-size: 18px; }
  .add-label { display: none; }
}
</style>
