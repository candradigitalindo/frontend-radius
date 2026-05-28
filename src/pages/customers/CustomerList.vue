<script setup lang="ts">
import { ref, onMounted, h, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NDataTable, NButton, NInput, NPopconfirm, NIcon, NSpin, useMessage, useDialog } from 'naive-ui'
import { Search, Plus, ChevronLeft, ChevronRight } from '@vicons/tabler'
import type { DataTableColumns } from 'naive-ui'
import { customerApi } from '../../api'

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

async function fetchStats() {
  try {
    const { data: res } = await customerApi.list({ per_page: 9999 })
    const all: any[] = res.data || []
    countActive.value = all.filter(r => r.status === 'active').length
    countIsolated.value = all.filter(r => r.status === 'isolated').length
    countOnline.value = all.filter(r => r.connection_status === 'online').length
  } catch {
    // fallback: hitung dari data halaman saat ini
    countActive.value = data.value.filter(r => r.status === 'active').length
    countIsolated.value = data.value.filter(r => r.status === 'isolated').length
    countOnline.value = data.value.filter(r => r.connection_status === 'online').length
  }
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
        onClick: (e: MouseEvent) => { e.stopPropagation(); router.push(`/customers/${row.id}`) },
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
    const { data: res } = await customerApi.list({ page: page.value, per_page: pageSize.value, search: search.value || undefined })
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
      try { await customerApi.isolate(row.id); message.success('Pelanggan berhasil diisolir'); fetchData(); fetchStats() }
      catch { message.error('Gagal mengisolir pelanggan') }
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

    <!-- Stats strip -->
    <div class="stats-strip">
      <div class="stat-item">
        <span class="stat-val">{{ countActive }}</span>
        <span class="stat-lbl">Aktif</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-val online">{{ countOnline }}</span>
        <span class="stat-lbl">Online</span>
      </div>
      <div class="stat-divider" />
      <div class="stat-item">
        <span class="stat-val warn">{{ countIsolated }}</span>
        <span class="stat-lbl">Diisolir</span>
      </div>
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
        :row-props="(row: any) => ({ style: 'cursor:pointer', onClick: () => router.push(`/customers/${row.id}`) })"
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
          @click="router.push(`/customers/${row.id}`)"
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
            <n-button size="tiny" quaternary type="info" title="Detail" class="maction-btn" @click="router.push(`/customers/${row.id}`)">
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
.stat-lbl { font-size: 11px; color: var(--app-text-muted); font-weight: 600; text-transform: uppercase; }
.stat-divider { width: 1px; height: 28px; background: var(--app-card-border); }

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
