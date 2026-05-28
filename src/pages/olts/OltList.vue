<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NPopconfirm,
  NModal, NForm, NFormItem, NInputNumber, NSelect, NTooltip, NDivider,
  NGrid, NGridItem, NAlert, NText, useMessage
} from 'naive-ui'
import { oltApi, routerApi } from '../../api'

const vueRouter = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const routers = ref<any[]>([])

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
  name: '', router_id: null as string | null, ip_address: '', vendor: '', model: '',
  serial_number: '', total_pon_ports: 8, snmp_community: 'public',
  latitude: null as number | null, longitude: null as number | null,
  status: 'active', notes: '',
})

function resetForm() {
  form.value = {
    name: '', router_id: null, ip_address: '', vendor: '', model: '',
    serial_number: '', total_pon_ports: 8, snmp_community: 'public',
    latitude: null, longitude: null, status: 'active', notes: '',
  }
  editId.value = null
}

const statusOptions = [
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
  { label: 'Maintenance', value: 'maintenance' },
]

const columns = [
  {
    title: 'Status', key: 'status', width: 110, align: 'center' as const,
    render: (r: any) => {
      const map: Record<string, { type: any; label: string }> = {
        active: { type: 'success', label: 'Aktif' },
        inactive: { type: 'default', label: 'Nonaktif' },
        maintenance: { type: 'warning', label: 'Maintenance' },
      }
      const s = map[r.status] || map.inactive
      return h(NTag, { type: s.type, size: 'small', round: true }, () => s.label)
    }
  },
  { title: 'Nama', key: 'name' },
  { title: 'IP Address', key: 'ip_address' },
  {
    title: 'Router', key: 'router', render: (r: any) => {
      if (!r.router) return '-'
      return h(NTag, { type: r.router.is_online ? 'success' : 'default', size: 'small', round: true }, () => r.router.name)
    }
  },
  { title: 'Vendor', key: 'vendor', render: (r: any) => r.vendor || '-' },
  { title: 'Model', key: 'model', render: (r: any) => r.model || '-' },
  { title: 'PON Ports', key: 'total_pon_ports', width: 100, align: 'center' as const },
  {
    title: 'Aksi', key: 'actions', width: 200,
    render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Detail', onClick: () => vueRouter.push(`/olts/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) }),
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus OLT ini?' }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = {
    name: r.name, router_id: r.router_id || null, ip_address: r.ip_address,
    vendor: r.vendor || '', model: r.model || '', serial_number: r.serial_number || '',
    total_pon_ports: r.total_pon_ports, snmp_community: r.snmp_community || 'public',
    latitude: r.latitude, longitude: r.longitude, status: r.status || 'active', notes: r.notes || '',
  }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.ip_address) { message.warning('Nama dan IP Address wajib diisi'); return }
  saving.value = true
  try {
    const payload = {
      ...form.value,
      router_id: form.value.router_id || undefined,
      vendor: form.value.vendor || undefined,
      model: form.value.model || undefined,
      serial_number: form.value.serial_number || undefined,
      notes: form.value.notes || undefined,
    }
    if (editId.value) { await oltApi.update(editId.value, payload); message.success('OLT diperbarui') }
    else { await oltApi.create(payload); message.success('OLT ditambahkan') }
    showModal.value = false; resetForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleDelete(id: string) {
  try { await oltApi.delete(id); message.success('OLT dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function fetchData() {
  loading.value = true
  try { const { data: res } = await oltApi.list({ search: search.value }); data.value = res.data || [] }
  catch { message.error('Gagal memuat data') }
  loading.value = false
}

async function fetchRouters() {
  try { const { data: res } = await routerApi.list({ per_page: 100 }); routers.value = res.data || [] }
  catch { /* ignore */ }
}

const routerOptions = computed(() => routers.value.map((r: any) => ({ label: `${r.name} (${r.vpn_ip})`, value: r.id })))

const activeCount = computed(() => data.value.filter(r => r.status === 'active').length)

onMounted(() => { fetchData(); fetchRouters() })

const filteredData = computed(() => {
  if (!search.value) return data.value
  const q = search.value.toLowerCase()
  return data.value.filter((r: any) =>
    r.name?.toLowerCase().includes(q) ||
    r.ip_address?.toLowerCase().includes(q) ||
    r.vendor?.toLowerCase().includes(q) ||
    r.model?.toLowerCase().includes(q)
  )
})

function statusInfo(s: string) {
  const map: Record<string, { type: any; label: string }> = {
    active: { type: 'success', label: 'Aktif' },
    inactive: { type: 'default', label: 'Nonaktif' },
    maintenance: { type: 'warning', label: 'Maintenance' },
  }
  return map[s] || map.inactive
}
</script>

<template>
  <n-space vertical :size="16">
    <n-card>
      <template #header>
        <div class="olt-header">
          <span class="olt-title">OLT (Optical Line Terminal)</span>
          <div class="olt-tags">
            <n-tag type="success" size="small" round>{{ activeCount }} Aktif</n-tag>
            <n-tag type="default" size="small" round>{{ data.length }} Total</n-tag>
          </div>
        </div>
      </template>
      <template #header-extra>
        <div class="olt-actions">
          <n-input v-model:value="search" placeholder="Cari OLT..." clearable @clear="fetchData" @keyup.enter="fetchData" :style="{ width: isMobile ? '100%' : '200px' }" />
          <n-button type="primary" @click="resetForm(); showModal = true" :style="isMobile ? { width: '100%' } : {}">
            + {{ isMobile ? 'Tambah' : 'Tambah OLT' }}
          </n-button>
        </div>
      </template>

      <!-- Desktop table -->
      <n-data-table v-if="isDesktop" :columns="columns" :data="data" :loading="loading" :bordered="false" size="small" />

      <!-- Mobile / Tablet card layout -->
      <div v-else>
        <div v-if="loading" style="text-align: center; padding: 32px 0">
          <n-text depth="3">Memuat data...</n-text>
        </div>
        <div v-else-if="!filteredData.length" style="text-align: center; padding: 32px 0">
          <n-text depth="3">Tidak ada data OLT</n-text>
        </div>
        <div v-else class="olt-card-grid">
          <div v-for="r in filteredData" :key="r.id" class="olt-card" @click="vueRouter.push(`/olts/${r.id}`)">
            <div class="olt-card-head">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0">
                <n-tag :type="statusInfo(r.status).type" size="small" round>{{ statusInfo(r.status).label }}</n-tag>
                <span class="olt-card-name">{{ r.name }}</span>
              </div>
              <div class="olt-card-actions" @click.stop>
                <n-button size="tiny" type="warning" @click="openEdit(r)">Edit</n-button>
                <n-popconfirm @positive-click="handleDelete(r.id)">
                  <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                  Yakin hapus OLT ini?
                </n-popconfirm>
              </div>
            </div>
            <div class="olt-card-body">
              <div class="olt-card-row">
                <span class="olt-label">IP</span>
                <span>{{ r.ip_address }}</span>
              </div>
              <div class="olt-card-row" v-if="r.router">
                <span class="olt-label">Router</span>
                <n-tag :type="r.router.is_online ? 'success' : 'default'" size="small" round>{{ r.router.name }}</n-tag>
              </div>
              <div class="olt-card-row" v-if="r.vendor || r.model">
                <span class="olt-label">Perangkat</span>
                <span>{{ [r.vendor, r.model].filter(Boolean).join(' · ') || '-' }}</span>
              </div>
              <div class="olt-card-row">
                <span class="olt-label">PON Ports</span>
                <span>{{ r.total_pon_ports }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-card>
  </n-space>

  <n-modal v-model:show="showModal" preset="card" class="olt-modal" :style="{ maxWidth: '820px', width: '95vw' }">
    <template #header>
      <div class="olt-modal-header">
        <div>
          <div class="olt-modal-title">{{ editId ? 'Edit OLT' : 'Tambah OLT' }}</div>
          <div class="olt-modal-subtitle">Lengkapi identitas, jaringan, dan lokasi perangkat untuk monitoring.</div>
        </div>
        <n-tag v-if="editId" size="small" type="info" round>Mode Edit</n-tag>
      </div>
    </template>
    <n-form label-placement="top" :show-feedback="false">
      <n-alert :type="editId ? 'warning' : 'info'" :bordered="false" class="olt-alert">
        <span v-if="!editId">Field bertanda <n-text strong>*</n-text> wajib diisi. Pastikan IP management OLT sudah benar.</span>
        <span v-else>Perubahan akan tersimpan dan mempengaruhi monitoring perangkat.</span>
      </n-alert>

      <!-- Identitas -->
      <div class="olt-section">
        <div class="olt-section-title">Identitas Perangkat</div>
        <n-divider class="olt-section-divider" />
        <n-grid :cols="isMobile ? 1 : 2" :x-gap="16" :y-gap="14">
          <n-grid-item>
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>Nama OLT *</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    Gunakan nama lokasi agar mudah dicari.
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-input v-model:value="form.name" placeholder="Contoh: OLT-PUSAT-01" />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>Serial Number</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    Bisa diisi SN atau ID perangkat.
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-input v-model:value="form.serial_number" placeholder="Opsional" />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="Vendor">
              <div class="olt-field">
                <n-input v-model:value="form.vendor" placeholder="Huawei, ZTE, Fiberhome" />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="Model">
              <div class="olt-field">
                <n-input v-model:value="form.model" placeholder="MA5608T, C320, AN5516" />
              </div>
            </n-form-item>
          </n-grid-item>
        </n-grid>
      </div>

      <!-- Jaringan -->
      <div class="olt-section">
        <div class="olt-section-title">Konfigurasi Jaringan</div>
        <n-divider class="olt-section-divider" />
        <n-grid :cols="isMobile ? 1 : 2" :x-gap="16" :y-gap="14">
          <n-grid-item>
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>IP Address *</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    IP management OLT yang bisa diakses server.
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-input v-model:value="form.ip_address" placeholder="192.168.1.1" />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>Router (Gateway VPN)</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    Pilih router yang terhubung ke VPN.
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-select v-model:value="form.router_id" :options="routerOptions" clearable filterable placeholder="Pilih router..." />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>SNMP Community</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    Pastikan community sesuai konfigurasi OLT.
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-input v-model:value="form.snmp_community" placeholder="public" />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>Total PON Ports</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    Jumlah port PON fisik di perangkat.
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-input-number v-model:value="form.total_pon_ports" :min="1" :max="128" style="width:100%" />
              </div>
            </n-form-item>
          </n-grid-item>
        </n-grid>
      </div>

      <!-- Lokasi & Lainnya -->
      <div class="olt-section">
        <div class="olt-section-title">Lokasi &amp; Lainnya</div>
        <n-divider class="olt-section-divider" />
        <n-grid :cols="isMobile ? 1 : 2" :x-gap="16" :y-gap="14">
          <n-grid-item>
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>Latitude</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    Contoh: -6.200123
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-input-number v-model:value="form.latitude" :precision="6" style="width:100%" placeholder="Opsional" />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>Longitude</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    Contoh: 106.845432
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-input-number v-model:value="form.longitude" :precision="6" style="width:100%" placeholder="Opsional" />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item v-if="editId">
            <n-form-item label="Status">
              <div class="olt-field">
                <n-select v-model:value="form.status" :options="statusOptions" filterable />
              </div>
            </n-form-item>
          </n-grid-item>
          <n-grid-item :span="editId ? 1 : (isMobile ? 1 : 2)">
            <n-form-item>
              <template #label>
                <div class="olt-label-with-tip">
                  <span>Catatan</span>
                  <n-tooltip trigger="hover">
                    <template #trigger><span class="olt-label-tip">?</span></template>
                    Contoh: lokasi rack, VLAN, atau info teknis.
                  </n-tooltip>
                </div>
              </template>
              <div class="olt-field">
                <n-input v-model:value="form.notes" type="textarea" placeholder="Catatan opsional..." :autosize="{ minRows: 2, maxRows: 4 }" />
              </div>
            </n-form-item>
          </n-grid-item>
        </n-grid>
      </div>

      <n-divider style="margin: 14px 0" />
      <n-space justify="end">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">{{ editId ? 'Perbarui OLT' : 'Simpan OLT' }}</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<style scoped>
.olt-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.olt-title {
  font-size: 16px;
  font-weight: 600;
}
.olt-tags {
  display: flex;
  gap: 6px;
}
.olt-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
@media (max-width: 639px) {
  .olt-actions {
    flex-direction: column;
    width: 100%;
  }
}
.olt-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 640px) and (max-width: 1023px) {
  .olt-card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.olt-card {
  border: 1px solid var(--n-border-color, rgba(255, 255, 255, 0.09));
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.olt-card:hover {
  border-color: var(--n-color-target, #63e2b7);
}
.olt-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.olt-card-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.olt-card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.olt-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.olt-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.olt-label {
  color: var(--n-text-color-3, #999);
  font-size: 12px;
}
.olt-modal :deep(.n-card) {
  border-radius: 16px;
}
.olt-modal :deep(.n-card-header) {
  padding-bottom: 10px;
}
.olt-modal :deep(.n-card__content) {
  padding-top: 6px;
}
.olt-modal :deep(.n-form-item) {
  margin-bottom: 6px;
}
.olt-modal :deep(.n-form-item-label) {
  font-weight: 600;
  margin-bottom: 6px;
}
.olt-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.olt-modal-title {
  font-size: 18px;
  font-weight: 700;
}
.olt-modal-subtitle {
  font-size: 12px;
  color: var(--n-text-color-3, #999);
}
.olt-alert {
  margin-bottom: 16px;
}
.olt-section {
  margin-top: 10px;
  padding: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.7);
}
.olt-section-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
  color: var(--n-text-color-3, #999);
}
.olt-section-divider {
  margin: 8px 0 12px;
}
.olt-field {
  width: 100%;
}
.olt-label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.olt-label-tip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #0f766e;
  background: rgba(15, 118, 110, 0.12);
  cursor: help;
}
@media (max-width: 639px) {
  .olt-section {
    padding: 12px;
  }
  .olt-modal :deep(.n-form-item-label) {
    margin-bottom: 5px;
  }
}
</style>
