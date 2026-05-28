<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NPopconfirm,
  NModal, NForm, NFormItem, NSelect, NText, useMessage
} from 'naive-ui'
import { ontApi, customerApi } from '../../api'

const vueRouter = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)

const isMobile = ref(window.innerWidth < 640)
const isTablet = ref(window.innerWidth >= 640 && window.innerWidth < 1024)
const isDesktop = ref(window.innerWidth >= 1024)
function onResize() {
  isMobile.value = window.innerWidth < 640
  isTablet.value = window.innerWidth >= 640 && window.innerWidth < 1024
  isDesktop.value = window.innerWidth >= 1024
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const form = ref({
  serial_number: '', vendor: '', model: '', notes: '', customer_id: null as string | null,
})

const customerOptions = ref<any[]>([])
const customerLoading = ref(false)

async function fetchCustomers(query = '') {
  customerLoading.value = true
  try {
    const res = await customerApi.list({ search: query, per_page: 50 })
    const list = res.data?.data || []
    customerOptions.value = list.map((c: any) => ({ label: `${c.customer_code} - ${c.name}`, value: c.id }))
  } catch {}
  customerLoading.value = false
}

function resetForm() {
  form.value = { serial_number: '', vendor: '', model: '', notes: '', customer_id: null }
  editId.value = null
}

const statusMap: Record<string, { type: 'success' | 'error' | 'info' | 'default'; label: string }> = {
  active: { type: 'success', label: 'Active' },
  online: { type: 'success', label: 'Online' },
  offline: { type: 'error', label: 'Offline' },
  registered: { type: 'info', label: 'Registered' },
}

function statusInfo(s: string) {
  return statusMap[s] || { type: 'default', label: s || 'unknown' }
}

const columns = [
  {
    title: 'Status', key: 'status', width: 100, align: 'center' as const,
    render: (r: any) => {
      const s = statusInfo(r.status)
      return h(NTag, { type: s.type, size: 'small', round: true }, () => s.label)
    }
  },
  { title: 'Serial Number', key: 'serial_number', render: (r: any) => h('span', { style: 'font-family: monospace' }, r.serial_number) },
  { title: 'Vendor', key: 'vendor', render: (r: any) => r.vendor || '-' },
  { title: 'Model', key: 'model', render: (r: any) => r.model || '-' },
  { title: 'Pelanggan', key: 'customer', render: (r: any) => r.customer?.name || r.customer_name || '-' },
  {
    title: 'Aksi', key: 'actions', width: 200,
    render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Detail', onClick: () => vueRouter.push(`/onts/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) }),
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus ONT ini?' }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = {
    serial_number: r.serial_number, vendor: r.vendor || '', model: r.model || '', notes: r.notes || '',
    customer_id: r.customer_id || null,
  }
  fetchCustomers()
  showModal.value = true
}

async function handleSave() {
  if (!form.value.serial_number) { message.warning('Serial number wajib diisi'); return }
  saving.value = true
  try {
    const payload: any = {
      serial_number: form.value.serial_number,
      customer_id: form.value.customer_id || null,
      vendor: form.value.vendor || undefined,
      model: form.value.model || undefined,
      notes: form.value.notes || undefined,
    }
    if (editId.value) {
      payload.status = 'active'
      await ontApi.update(editId.value, payload)
      message.success('ONT diperbarui')
    } else {
      await ontApi.create(payload)
      message.success('ONT ditambahkan')
    }
    showModal.value = false; resetForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleDelete(id: string) {
  try { await ontApi.delete(id); message.success('ONT dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function fetchData() {
  loading.value = true
  try {
    const res = await ontApi.list({ search: search.value })
    // More robust extraction
    const body = res.data
    const raw = body?.data || body?.onts || (Array.isArray(body) ? body : [])
    data.value = Array.isArray(raw) ? raw : []
  } catch { message.error('Gagal memuat data') }
  loading.value = false
}

const filteredData = computed(() => {
  const items = data.value || []
  if (!search.value) return items
  const q = search.value.toLowerCase()
  return items.filter((r: any) =>
    r.serial_number?.toLowerCase().includes(q) ||
    r.vendor?.toLowerCase().includes(q) ||
    r.model?.toLowerCase().includes(q) ||
    r.customer?.name?.toLowerCase().includes(q) ||
    r.customer_name?.toLowerCase().includes(q)
  )
})

const onlineCount = computed(() => data.value.filter(r => r.status === 'online').length)

onMounted(fetchData)
</script>

<template>
  <n-space vertical :size="16">
    <n-card>
      <template #header>
        <div class="ont-header">
          <span class="ont-title">ONT (Optical Network Terminal)</span>
          <div class="ont-tags">
            <n-tag type="success" size="small" round>{{ onlineCount }} Online</n-tag>
            <n-tag type="default" size="small" round>{{ data.length }} Total</n-tag>
          </div>
        </div>
      </template>
      <template #header-extra>
        <div class="ont-actions">
          <n-input v-model:value="search" placeholder="Cari ONT..." clearable @clear="fetchData" @keyup.enter="fetchData" :style="{ width: isMobile ? '100%' : '200px' }" />
          <n-button type="primary" @click="resetForm(); fetchCustomers(); showModal = true" :style="isMobile ? { width: '100%' } : {}">
            + {{ isMobile ? 'Tambah' : 'Tambah ONT' }}
          </n-button>
        </div>
      </template>

      <!-- Desktop table -->
      <n-data-table v-if="isDesktop" :columns="columns" :data="data" :loading="loading" :bordered="false" size="small" />

      <!-- Mobile / Tablet cards -->
      <div v-else>
        <div v-if="loading" style="text-align: center; padding: 32px 0">
          <n-text depth="3">Memuat data...</n-text>
        </div>
        <div v-else-if="!filteredData.length" style="text-align: center; padding: 32px 0">
          <n-text depth="3">Tidak ada data ONT</n-text>
        </div>
        <div v-else class="ont-card-grid">
          <div v-for="r in filteredData" :key="r.id" class="ont-card" @click="vueRouter.push(`/onts/${r.id}`)">
            <div class="ont-card-head">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0">
                <n-tag :type="statusInfo(r.status).type" size="small" round>{{ statusInfo(r.status).label }}</n-tag>
                <span class="ont-card-sn">{{ r.serial_number }}</span>
              </div>
              <div class="ont-card-btns" @click.stop>
                <n-button size="tiny" type="warning" @click="openEdit(r)">Edit</n-button>
                <n-popconfirm @positive-click="handleDelete(r.id)">
                  <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                  Yakin hapus ONT ini?
                </n-popconfirm>
              </div>
            </div>
            <div class="ont-card-body">
              <div class="ont-card-row" v-if="r.vendor || r.model">
                <span class="ont-label">Perangkat</span>
                <span>{{ [r.vendor, r.model].filter(Boolean).join(' · ') || '-' }}</span>
              </div>
              <div class="ont-card-row" v-if="r.customer">
                <span class="ont-label">Pelanggan</span>
                <span class="ont-val">{{ r.customer.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-card>
  </n-space>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit ONT' : 'Tambah ONT'" :style="{ maxWidth: '480px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 140">
      <n-form-item label="Serial Number" required><n-input v-model:value="form.serial_number" placeholder="HWTC12345678" style="text-transform: uppercase" /></n-form-item>
      <n-form-item label="Pelanggan">
        <n-select
          v-model:value="form.customer_id"
          :options="customerOptions"
          :loading="customerLoading"
          filterable
          remote
          clearable
          placeholder="Pilih pelanggan..."
          @search="fetchCustomers"
          @focus="() => { if (!customerOptions.length) fetchCustomers() }"
        />
      </n-form-item>
      <n-form-item label="Vendor"><n-input v-model:value="form.vendor" placeholder="Huawei, ZTE, dll" /></n-form-item>
      <n-form-item label="Model"><n-input v-model:value="form.model" placeholder="HG8245H, F660" /></n-form-item>
      <n-form-item label="Catatan"><n-input v-model:value="form.notes" type="textarea" :rows="2" /></n-form-item>
      <n-space justify="end" :size="12">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<style scoped>
.ont-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ont-title {
  font-size: 16px;
  font-weight: 600;
}
.ont-tags {
  display: flex;
  gap: 6px;
}
.ont-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
@media (max-width: 639px) {
  .ont-actions {
    flex-direction: column;
    width: 100%;
  }
}
.ont-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 640px) and (max-width: 1023px) {
  .ont-card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.ont-card {
  border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.09));
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.ont-card:hover {
  border-color: var(--n-color-target, #63e2b7);
}
.ont-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.ont-card-sn {
  font-weight: 600;
  font-size: 13px;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ont-card-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.ont-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ont-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.ont-label {
  color: var(--n-text-color-3, #999);
  font-size: 12px;
  flex-shrink: 0;
}
.ont-val {
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
</style>
