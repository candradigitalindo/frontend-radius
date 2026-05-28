<script setup lang="ts">
import { h, ref, onMounted, onUnmounted } from 'vue'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NPopconfirm, NSpin,
  NModal, NForm, NFormItem, NInputNumber, NSwitch, NIcon, useMessage
} from 'naive-ui'
import { Search, Plus, Upload, Download, CurrencyDollar, Package } from '@vicons/tabler'
import { packageApi } from '../../api'

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
  name: '', bandwidth_up: 0, bandwidth_down: 0, price: 0,
  burst_limit: '', address_list: '', is_active: true,
})

const fmtRp = (v: number | null) => v != null ? v.toLocaleString('id-ID') : ''
const parseRp = (s: string) => { const n = Number(s.replace(/\./g, '').replace(/,/g, '.')); return isNaN(n) ? null : n }
const priceDisplay = ref(fmtRp(0))
function onPriceInput(val: string) {
  const num = parseRp(val)
  form.value.price = num ?? 0
  priceDisplay.value = num != null ? fmtRp(num) : val
}
function syncPriceDisplay() {
  priceDisplay.value = fmtRp(form.value.price)
}

function resetForm() {
  form.value = { name: '', bandwidth_up: 0, bandwidth_down: 0, price: 0, burst_limit: '', address_list: '', is_active: true }
  editId.value = null
  priceDisplay.value = fmtRp(0)
}

const columns = [
  { title: 'Nama Paket', key: 'name', ellipsis: { tooltip: true } },
  { title: 'Upload (Mbps)', key: 'bandwidth_up', width: 130 },
  { title: 'Download (Mbps)', key: 'bandwidth_down', width: 140 },
  { title: 'Harga', key: 'price', width: 120, render: (r: any) => (r.price || 0).toLocaleString('id-ID') },
  { title: 'Status', key: 'is_active', width: 90, render: (r: any) => h(NTag, { type: r.is_active ? 'success' : 'default', size: 'small' }, () => r.is_active ? 'Aktif' : 'Nonaktif') },
  {
    title: 'Aksi', key: 'actions', width: 90, fixed: 'right' as const, render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus?' }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = { name: r.name, bandwidth_up: r.bandwidth_up, bandwidth_down: r.bandwidth_down, price: r.price, burst_limit: r.burst_limit || '', address_list: r.address_list || '', is_active: r.is_active }
  priceDisplay.value = fmtRp(r.price)
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name) { message.warning('Nama paket wajib diisi'); return }
  if (!form.value.bandwidth_up) { message.warning('Bandwidth upload wajib diisi'); return }
  if (!form.value.bandwidth_down) { message.warning('Bandwidth download wajib diisi'); return }
  saving.value = true
  try {
    const payload = JSON.parse(JSON.stringify({
      name: String(form.value.name || ''),
      bandwidth_up: Number(form.value.bandwidth_up) || 0,
      bandwidth_down: Number(form.value.bandwidth_down) || 0,
      price: Number(form.value.price) || 0,
      burst_limit: form.value.burst_limit || '',
      address_list: form.value.address_list || '',
      is_active: form.value.is_active ?? true,
    }))
    if (editId.value) {
      await packageApi.update(editId.value, payload)
      message.success('Paket diperbarui')
    } else {
      await packageApi.create(payload)
      message.success('Paket ditambahkan')
    }
    showModal.value = false
    resetForm()
    fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleDelete(id: string) {
  try { await packageApi.delete(id); message.success('Paket dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await packageApi.list({ search: search.value })
    data.value = res.data || []
  } catch { message.error('Gagal memuat data') }
  loading.value = false
}
onMounted(fetchData)
</script>

<template>
  <div class="pkg-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">Paket Internet</h2>
      <div class="header-actions">
        <n-input
          v-model:value="search"
          placeholder="Cari paket..."
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
          <span class="add-btn-text">Tambah</span>
        </n-button>
      </div>
    </div>

    <!-- Desktop Table -->
    <n-card v-if="!isMobile" class="table-card" :bordered="true">
      <n-data-table :columns="columns" :data="data" :loading="loading" :bordered="false" :scroll-x="700" />
    </n-card>

    <!-- Mobile/Tablet Cards -->
    <div v-else class="pkg-list">
      <div v-if="loading" class="pkg-empty"><n-spin :show="true" /></div>
      <template v-else-if="data.length">
        <div v-for="row in data" :key="row.id" class="pkg-card">
          <div class="pkg-card-top">
            <div class="pkg-card-name">{{ row.name }}</div>
            <div class="pkg-card-status" :class="row.is_active ? 'active' : 'inactive'">
              <span class="status-dot" />
              {{ row.is_active ? 'Aktif' : 'Nonaktif' }}
            </div>
          </div>

          <div class="pkg-card-stats">
            <div class="pkg-stat">
              <n-icon :component="Upload" :size="14" />
              <span class="stat-val">{{ row.bandwidth_up }} <small>Mbps</small></span>
              <span class="stat-label">Upload</span>
            </div>
            <div class="pkg-stat">
              <n-icon :component="Download" :size="14" />
              <span class="stat-val">{{ row.bandwidth_down }} <small>Mbps</small></span>
              <span class="stat-label">Download</span>
            </div>
            <div class="pkg-stat">
              <n-icon :component="CurrencyDollar" :size="14" />
              <span class="stat-val">{{ (row.price || 0).toLocaleString('id-ID') }}</span>
              <span class="stat-label">Harga</span>
            </div>
          </div>

          <div class="pkg-card-actions">
            <n-button size="tiny" type="info" @click="openEdit(row)">Edit</n-button>
            <n-popconfirm @positive-click="handleDelete(row.id)">
              <template #trigger>
                <n-button size="tiny" type="error">Hapus</n-button>
              </template>
              Yakin hapus paket ini?
            </n-popconfirm>
          </div>
        </div>
      </template>
      <div v-else class="pkg-empty">
        <n-icon :component="Package" :size="48" style="opacity: 0.2" />
        <span>Belum ada paket</span>
      </div>
    </div>
  </div>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit Paket' : 'Tambah Paket'" :style="{ maxWidth: '460px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 130">
      <n-form-item label="Nama Paket"><n-input v-model:value="form.name" /></n-form-item>
      <n-form-item label="Upload (Mbps)"><n-input-number v-model:value="form.bandwidth_up" :min="0" style="width:100%" /></n-form-item>
      <n-form-item label="Download (Mbps)"><n-input-number v-model:value="form.bandwidth_down" :min="0" style="width:100%" /></n-form-item>
      <n-form-item label="Harga"><n-input :value="priceDisplay" @input="onPriceInput" @blur="syncPriceDisplay" style="width:100%" /></n-form-item>
      <n-form-item label="Burst Limit"><n-input v-model:value="form.burst_limit" placeholder="Optional" /></n-form-item>
      <n-form-item label="Address List"><n-input v-model:value="form.address_list" placeholder="Optional" /></n-form-item>
      <n-form-item label="Aktif"><n-switch v-model:value="form.is_active" /></n-form-item>
      <div class="modal-actions">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style scoped>
.pkg-page {
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

.search-input {
  width: 240px;
}

.table-card {
  border-radius: 12px !important;
}

:root:not(.dark) .table-card { border-color: rgba(0,0,0,0.08) !important; }
:root.dark .table-card { border-color: rgba(255,255,255,0.08) !important; }

/* ── Cards ── */
.pkg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pkg-card {
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(128,128,128,0.12);
  background: rgba(128,128,128,0.02);
}

:root.dark .pkg-card {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.08);
}

.pkg-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.pkg-card-name {
  font-weight: 700;
  font-size: 15px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pkg-card-status {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.pkg-card-status .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.pkg-card-status.active {
  color: #22c55e;
  background: rgba(34,197,94,0.1);
}
.pkg-card-status.active .status-dot { background: #22c55e; }

.pkg-card-status.inactive {
  color: #6b7280;
  background: rgba(107,114,128,0.1);
}
.pkg-card-status.inactive .status-dot { background: #6b7280; }

.pkg-card-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.pkg-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(128,128,128,0.05);
  flex: 1;
  min-width: 0;
}

:root.dark .pkg-stat { background: rgba(255,255,255,0.04); }

.pkg-stat svg {
  flex-shrink: 0;
  opacity: 0.5;
}

.stat-val {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
}

.stat-val small {
  font-weight: 400;
  font-size: 11px;
  opacity: 0.5;
}

.stat-label {
  font-size: 11px;
  opacity: 0.45;
  margin-left: auto;
  white-space: nowrap;
}

.pkg-card-actions {
  display: flex;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(128,128,128,0.08);
}

:root.dark .pkg-card-actions { border-top-color: rgba(255,255,255,0.06); }

.pkg-empty {
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
}

/* ── Tablet 2-col grid ── */
@media (min-width: 640px) and (max-width: 1023px) {
  .pkg-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .pkg-empty {
    grid-column: 1 / -1;
  }
}

/* ── Responsive header ── */
@media (max-width: 1023px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
  }

  .search-input {
    flex: 1;
    width: auto;
  }

  .add-btn {
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 18px;
  }

  .add-btn-text {
    display: none;
  }

  .pkg-card-stats {
    flex-direction: column;
    gap: 6px;
  }
}


</style>
