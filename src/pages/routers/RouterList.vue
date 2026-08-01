<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NPopconfirm,
  NModal, NForm, NFormItem, NSwitch, useMessage,
  NProgress, NText, NTooltip, NAlert, NSpin, NIcon
} from 'naive-ui'
import { Search, Plus, Clock, Server } from '@vicons/tabler'
import { routerApi } from '../../api'

const vueRouter = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const isMobile = ref(window.innerWidth < 1024)
function onResize() { isMobile.value = window.innerWidth < 1024 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const form = ref({
  name: '',
  router_type: 'mikrotik',
  is_active: true,
})

function resetForm() {
  form.value = { name: '', router_type: 'mikrotik', is_active: true }
  editId.value = null
  typeSearch.value = ''
}

// Create form needs name + router type
const createForm = ref({ name: '', router_type: 'mikrotik' })

const routerTypeOptions = [
  { label: 'MikroTik', sub: 'RouterOS', value: 'mikrotik', desc: 'IP Publik, L2TP/SSTP & WireGuard VPN', badge: 'WireGuard', color: '#e11d48' },
  { label: 'VyOS / EdgeRouter', sub: 'VyOS / EdgeOS', value: 'vyos', desc: 'IP Publik & WireGuard VPN', badge: 'WireGuard', color: '#0891b2' },
  { label: 'Cisco', sub: 'IOS / IOS-XE', value: 'cisco', desc: 'AAA RADIUS via IP Publik', badge: 'IP Publik', color: '#2563eb' },
  { label: 'Huawei', sub: 'VRP / BRAS', value: 'huawei', desc: 'RADIUS template via IP Publik', badge: 'IP Publik', color: '#dc2626' },
  { label: 'Juniper', sub: 'JunOS', value: 'juniper', desc: 'access-profile RADIUS', badge: 'IP Publik', color: '#0d9488' },
  { label: 'Ruijie', sub: 'RG-OS', value: 'ruijie', desc: 'RADIUS via IP Publik', badge: 'IP Publik', color: '#7c3aed' },
]
// Pemilih jenis router (kartu + search), dipakai create & edit
const typeSearch = ref('')
const filteredTypes = computed(() => {
  const q = typeSearch.value.toLowerCase().trim()
  if (!q) return routerTypeOptions
  return routerTypeOptions.filter(o =>
    o.label.toLowerCase().includes(q) ||
    o.sub.toLowerCase().includes(q) ||
    o.value.includes(q) ||
    o.desc.toLowerCase().includes(q),
  )
})
const selectedRouterType = computed<string>({
  get: () => (editId.value ? form.value.router_type : createForm.value.router_type),
  set: (v) => { if (editId.value) form.value.router_type = v; else createForm.value.router_type = v },
})

function formatBytes(b: number | null) {
  if (!b) return '-'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i]
}

function memPercent(free: number | null, total: number | null): number {
  if (!total || !free) return 0
  return Math.round(((total - free) / total) * 100)
}

function timeAgo(ts: string | null): string {
  if (!ts) return '-'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return m + ' menit lalu'
  const hr = Math.floor(m / 60)
  if (hr < 24) return hr + ' jam lalu'
  return Math.floor(hr / 24) + ' hari lalu'
}

function formatUptime(raw: string | null): string {
  if (!raw) return '-'
  // Handle numeric seconds (backend stores as integer)
  const asNum = Number(raw)
  if (!isNaN(asNum) && String(raw).trim() !== '') {
    let total = Math.floor(asNum)
    const weeks = Math.floor(total / 604800); total %= 604800
    const days = Math.floor(total / 86400); total %= 86400
    const hours = Math.floor(total / 3600); total %= 3600
    const mins = Math.floor(total / 60)
    const parts: string[] = []
    if (weeks) parts.push(weeks + ' minggu')
    if (days) parts.push(days + ' hari')
    if (hours) parts.push(hours + ' jam')
    if (mins) parts.push(mins + ' menit')
    return parts.length ? parts.join(' ') : '-'
  }
  const parts: string[] = []
  const w = raw.match(/(\d+)w/); if (w) parts.push(w[1] + ' minggu')
  const d = raw.match(/(\d+)d/); if (d) parts.push(d[1] + ' hari')
  const h = raw.match(/(\d+)h/); if (h) parts.push(h[1] + ' jam')
  const m = raw.match(/(\d+)m(?!s)/); if (m) parts.push(m[1] + ' menit')
  const s = raw.match(/(\d+)s/); if (s) parts.push(s[1] + ' detik')
  // Handle HH:MM:SS format (e.g. "1d 02:03:04" or "02:03:04")
  if (!h && !m) {
    const colon = raw.match(/(\d{1,2}):(\d{2}):(\d{2})/)
    if (colon) {
      const hh = parseInt(colon[1])
      const mm = parseInt(colon[2])
      if (hh) parts.push(hh + ' jam')
      if (mm) parts.push(mm + ' menit')
    }
  }
  return parts.length ? parts.join(' ') : raw
}

const columns = [
  {
    title: 'Status VPN', key: 'is_online', width: 110, align: 'center' as const,
    render: (r: any) => h(NTooltip, {}, {
      trigger: () => h(NTag, {
        type: r.is_online ? 'success' : 'error',
        size: 'small',
        round: true,
      }, () => r.is_online ? '● Online' : '● Offline'),
      default: () => r.last_seen_at ? 'Terakhir: ' + timeAgo(r.last_seen_at) : 'Belum pernah terhubung',
    })
  },
  { title: 'Nama', key: 'name' },
  { title: 'VPN IP', key: 'vpn_ip', render: (r: any) => r.vpn_ip || '-' },
  {
    title: 'RouterOS', key: 'router_os_ver',
    render: (r: any) => r.router_os_ver || '-',
  },
  {
    title: 'Board', key: 'board_name',
    render: (r: any) => r.board_name || '-',
  },
  {
    title: 'Uptime', key: 'uptime',
    render: (r: any) => formatUptime(r.uptime),
  },
  {
    title: 'CPU', key: 'cpu_load', width: 100,
    render: (r: any) => {
      const cpu = r.cpu_load ?? 0
      const type = cpu > 80 ? 'error' : cpu > 50 ? 'warning' : 'success'
      return h(NTooltip, {}, {
        trigger: () => h(NProgress, { type: 'line', percentage: cpu, status: type, showIndicator: false, style: 'width: 60px' }),
        default: () => `CPU: ${cpu}%`,
      })
    }
  },
  {
    title: 'Memory', key: 'memory', width: 100,
    render: (r: any) => {
      const pct = memPercent(r.free_memory, r.total_memory)
      const type = pct > 80 ? 'error' : pct > 60 ? 'warning' : 'success'
      return h(NTooltip, {}, {
        trigger: () => h(NProgress, { type: 'line', percentage: pct, status: type, showIndicator: false, style: 'width: 60px' }),
        default: () => `RAM: ${formatBytes(r.total_memory ? r.total_memory - (r.free_memory || 0) : 0)} / ${formatBytes(r.total_memory)}`,
      })
    }
  },
  {
    title: 'Aksi', key: 'actions', width: 180,
    render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Detail', onClick: () => vueRouter.push(`/routers/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) }),
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, {
        trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }),
        default: () => 'Yakin hapus router ini?',
      }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = {
    name: r.name,
    router_type: r.router_type || 'mikrotik',
    is_active: r.is_active,
  }
  typeSearch.value = ''
  showModal.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editId.value) {
      if (!form.value.name) { message.warning('Nama wajib diisi'); saving.value = false; return }
      const payload = { ...form.value, name: form.value.name.toUpperCase() }
      await routerApi.update(editId.value, payload)
      message.success('Router diperbarui')
    } else {
      if (!createForm.value.name) { message.warning('Nama router wajib diisi'); saving.value = false; return }
      await routerApi.create({ name: createForm.value.name.toUpperCase(), router_type: createForm.value.router_type })
      message.success('Router berhasil didaftarkan')
    }
    showModal.value = false
    resetForm()
    createForm.value = { name: '', router_type: 'mikrotik' }
    fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menyimpan')
  }
  saving.value = false
}

async function handleDelete(id: string) {
  try {
    await routerApi.delete(id)
    message.success('Router dihapus')
    fetchData()
  } catch {
    message.error('Gagal menghapus')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await routerApi.list({ search: search.value })
    data.value = res.data || []
  } catch {
    message.error('Gagal memuat data')
  }
  loading.value = false
}

const onlineCount = computed(() => data.value.filter(r => r.is_online).length)
const offlineCount = computed(() => data.value.filter(r => !r.is_online).length)

onMounted(fetchData)
</script>

<template>
  <div class="rtr-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">VPN Router</h2>
      <div class="header-actions">
        <n-tag type="success" size="small" round>● {{ onlineCount }} Online</n-tag>
        <n-tag type="error" size="small" round>● {{ offlineCount }} Offline</n-tag>
        <n-input
          v-model:value="search"
          placeholder="Cari..."
          clearable
          @clear="fetchData"
          @keyup.enter="fetchData"
          class="search-input"
        >
          <template #prefix>
            <n-icon :component="Search" :size="16" style="opacity: 0.4" />
          </template>
        </n-input>
        <n-button type="primary" @click="resetForm(); showModal = true" class="add-btn">
          <template #icon>
            <n-icon :component="Plus" :size="16" />
          </template>
          <span class="btn-text">Daftarkan Router</span>
        </n-button>
      </div>
    </div>

    <!-- Desktop Table -->
    <n-card v-if="!isMobile" class="table-card" :bordered="true">
      <n-data-table :columns="columns" :data="data" :loading="loading" :bordered="false" size="small" :scroll-x="1000" />
    </n-card>

    <!-- Mobile/Tablet Cards -->
    <div v-else class="rtr-list">
      <div v-if="loading" class="rtr-empty"><n-spin :show="true" /></div>
      <template v-else-if="data.length">
        <div v-for="row in data" :key="row.id" class="rtr-card" @click="vueRouter.push(`/routers/${row.id}`)">
          <div class="rtr-card-top">
            <div class="rtr-card-info">
              <div class="rtr-card-name">{{ row.name }}</div>
              <n-tag :type="row.is_online ? 'success' : 'error'" size="tiny" round>
                {{ row.is_online ? '● Online' : '● Offline' }}
              </n-tag>
            </div>
            <div class="rtr-card-ip">{{ row.vpn_ip || '-' }}</div>
          </div>

          <div class="rtr-card-stats">
            <div class="rtr-stat" v-if="row.router_os_ver">
              <span class="rtr-stat-label">RouterOS</span>
              <span class="rtr-stat-value">{{ row.router_os_ver }}</span>
            </div>
            <div class="rtr-stat" v-if="row.board_name">
              <span class="rtr-stat-label">Board</span>
              <span class="rtr-stat-value">{{ row.board_name }}</span>
            </div>
            <div class="rtr-stat" v-if="row.uptime">
              <span class="rtr-stat-label">Uptime</span>
              <span class="rtr-stat-value">{{ row.uptime }}</span>
            </div>
            <div class="rtr-stat" v-if="row.cpu_load != null">
              <span class="rtr-stat-label">CPU</span>
              <span class="rtr-stat-value rtr-stat-bar">
                <n-progress type="line" :percentage="row.cpu_load || 0" :status="(row.cpu_load || 0) > 80 ? 'error' : (row.cpu_load || 0) > 50 ? 'warning' : 'success'" :show-indicator="false" style="width: 50px" />
                {{ row.cpu_load }}%
              </span>
            </div>
            <div class="rtr-stat" v-if="row.total_memory">
              <span class="rtr-stat-label">RAM</span>
              <span class="rtr-stat-value rtr-stat-bar">
                <n-progress type="line" :percentage="memPercent(row.free_memory, row.total_memory)" :status="memPercent(row.free_memory, row.total_memory) > 80 ? 'error' : memPercent(row.free_memory, row.total_memory) > 60 ? 'warning' : 'success'" :show-indicator="false" style="width: 50px" />
                {{ memPercent(row.free_memory, row.total_memory) }}%
              </span>
            </div>
          </div>

          <div class="rtr-card-meta" v-if="row.last_seen_at">
            <n-icon :component="Clock" :size="13" />
            {{ timeAgo(row.last_seen_at) }}
          </div>

          <div class="rtr-card-actions" @click.stop>
            <n-button size="tiny" type="warning" @click="openEdit(row)">Edit</n-button>
            <n-popconfirm @positive-click="handleDelete(row.id)">
              <template #trigger>
                <n-button size="tiny" type="error">Hapus</n-button>
              </template>
              Yakin hapus router ini?
            </n-popconfirm>
          </div>
        </div>
      </template>
      <div v-else class="rtr-empty">
        <n-icon :component="Server" :size="48" style="opacity: 0.2" />
        <span>Belum ada router terdaftar</span>
      </div>
    </div>
  </div>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit Router' : 'Daftarkan Router Baru'" :style="{ maxWidth: '680px', width: '94vw' }">
    <n-form label-placement="top" :show-feedback="false">
      <n-alert v-if="!editId" type="info" :bordered="false" style="margin-bottom: 16px; font-size: 13px">
        RADIUS Secret, CoA Port, dan Heartbeat Token di-generate otomatis. Panduan konfigurasi menyesuaikan jenis router yang dipilih.
      </n-alert>

      <div class="rf-grid">
        <!-- Nama + status -->
        <n-form-item label="Nama Router *">
          <n-input
            :value="editId ? form.name : createForm.name"
            placeholder="Contoh: ROUTER-PERUMAHAN-A"
            style="text-transform: uppercase"
            size="large"
            @update:value="(v: string) => editId ? (form.name = v) : (createForm.name = v)"
          />
        </n-form-item>
        <n-form-item v-if="editId" label="Status">
          <n-space align="center" style="height: 40px">
            <n-switch v-model:value="form.is_active" />
            <n-text :depth="form.is_active ? 1 : 3">{{ form.is_active ? 'Aktif' : 'Nonaktif' }}</n-text>
          </n-space>
        </n-form-item>
      </div>

      <!-- Pemilih jenis router (kartu + search) -->
      <div class="rf-type-head">
        <span class="rf-type-title">Jenis Router *</span>
        <n-input v-model:value="typeSearch" placeholder="Cari merek..." size="small" clearable class="rf-type-search">
          <template #prefix><n-icon :component="Search" :size="14" style="opacity:0.5" /></template>
        </n-input>
      </div>

      <div class="rf-type-grid">
        <button
          v-for="t in filteredTypes"
          :key="t.value"
          type="button"
          class="rf-type-card"
          :class="{ active: selectedRouterType === t.value }"
          :style="selectedRouterType === t.value ? { borderColor: t.color, boxShadow: `0 0 0 1px ${t.color}` } : {}"
          @click="selectedRouterType = t.value"
        >
          <div class="rf-type-icon" :style="{ background: t.color }">{{ t.label.charAt(0) }}</div>
          <div class="rf-type-body">
            <div class="rf-type-name">
              {{ t.label }}
              <span class="rf-type-badge" :style="{ color: t.color, background: t.color + '1a' }">{{ t.badge }}</span>
            </div>
            <div class="rf-type-sub">{{ t.sub }}</div>
            <div class="rf-type-desc">{{ t.desc }}</div>
          </div>
          <div v-if="selectedRouterType === t.value" class="rf-type-check" :style="{ color: t.color }">✓</div>
        </button>
        <div v-if="!filteredTypes.length" class="rf-type-empty">Tidak ada merek cocok dengan "{{ typeSearch }}"</div>
      </div>

      <div class="modal-actions">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" size="large" :loading="saving" @click="handleSave">{{ editId ? 'Perbarui Router' : 'Daftarkan Router' }}</n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style scoped>
.rtr-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input { width: 200px; }

.table-card { border-radius: 12px !important; }
:root:not(.dark) .table-card { border-color: rgba(0,0,0,0.08) !important; }
:root.dark .table-card { border-color: rgba(255,255,255,0.08) !important; }

/* ── Cards ── */
.rtr-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rtr-card {
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(128,128,128,0.12);
  background: rgba(128,128,128,0.02);
  cursor: pointer;
  transition: border-color 0.15s;
}
.rtr-card:hover { border-color: rgba(99,140,255,0.3); }
:root.dark .rtr-card {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.08);
}
:root.dark .rtr-card:hover { border-color: rgba(99,140,255,0.4); }

.rtr-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.rtr-card-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.rtr-card-name {
  font-weight: 700;
  font-size: 15px;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rtr-card-ip {
  font-family: monospace;
  font-size: 13px;
  opacity: 0.6;
  flex-shrink: 0;
}

.rtr-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-bottom: 8px;
}

.rtr-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.rtr-stat-label {
  opacity: 0.45;
  font-size: 12px;
}

.rtr-stat-value {
  font-weight: 500;
}

.rtr-stat-bar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rtr-card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  opacity: 0.45;
  margin-bottom: 10px;
}

.rtr-card-meta svg { flex-shrink: 0; }

.rtr-card-actions {
  display: flex;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(128,128,128,0.08);
}
:root.dark .rtr-card-actions { border-top-color: rgba(255,255,255,0.06); }

.rtr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  opacity: 0.5;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(128,128,128,0.1);
}

/* ── Router register form ── */
.rf-grid {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 14px;
  margin-bottom: 18px;
}

.rf-type-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.rf-type-title { font-size: 13px; font-weight: 600; }
.rf-type-search { width: 200px; }

.rf-type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.rf-type-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 14px;
  border: 1.5px solid rgba(128,128,128,0.16);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}
.rf-type-card:hover { border-color: rgba(128,128,128,0.4); transform: translateY(-1px); }
.rf-type-card.active { background: rgba(128,128,128,0.04); }
:root.dark .rf-type-card.active { background: rgba(255,255,255,0.03); }

.rf-type-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 800; font-size: 18px;
}

.rf-type-body { min-width: 0; flex: 1; }
.rf-type-name {
  font-size: 14px; font-weight: 700; line-height: 1.3;
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
}
.rf-type-badge {
  font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 10px;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.rf-type-sub { font-size: 11.5px; opacity: 0.5; margin-top: 1px; font-family: ui-monospace, monospace; }
.rf-type-desc { font-size: 12px; opacity: 0.65; margin-top: 4px; line-height: 1.35; }

.rf-type-check {
  position: absolute; top: 10px; right: 12px;
  font-size: 16px; font-weight: 800;
}

.rf-type-empty {
  grid-column: 1 / -1; text-align: center; padding: 24px;
  font-size: 13px; opacity: 0.5;
}

@media (max-width: 560px) {
  .rf-grid { grid-template-columns: 1fr; }
  .rf-type-grid { grid-template-columns: 1fr; }
  .rf-type-search { width: 140px; }
}

/* ── Tablet 2-col ── */
@media (min-width: 640px) and (max-width: 1023px) {
  .rtr-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .rtr-empty { grid-column: 1 / -1; }
}

@media (max-width: 1023px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions { width: 100%; flex-wrap: wrap; }
  .search-input { flex: 1; min-width: 120px; width: auto; }
  .add-btn { flex-shrink: 0; }
}

@media (max-width: 480px) {
  .page-title { font-size: 18px; }
  .btn-text { display: none; }
  .modal-actions { flex-direction: column; }
  .modal-actions .n-button { width: 100%; }
}
</style>
