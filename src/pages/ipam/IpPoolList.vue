<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NPopconfirm,
  NModal, NForm, NFormItem, NInputNumber, NSelect, useMessage
} from 'naive-ui'
import { ipamApi, routerApi } from '../../api'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)
const routerOptions = ref<any[]>([])

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)

const form = ref<any>({ name: '', network: '', prefix_length: 24, gateway: '', dns_primary: '', dns_secondary: '', router_id: null, notes: '' })

function resetForm() {
  form.value = { name: '', network: '', prefix_length: 24, gateway: '', dns_primary: '', dns_secondary: '', router_id: null, notes: '' }
  editId.value = null
}

const columns = [
  { title: 'Nama', key: 'name' },
  { title: 'Network', key: 'network' },
  { title: 'Gateway', key: 'gateway' },
  { title: 'Router', key: 'router_id', render: (r: any) => { const rt = routerOptions.value.find((o: any) => o.value === r.router_id); return rt ? rt.label : '-' } },
  { title: 'Total IP', key: 'total_ips' },
  { title: 'Terpakai', key: 'used_ips' },
  { title: 'Tersedia', key: 'available', render: (r: any) => (r.total_ips || 0) - (r.used_ips || 0) },
  {
    title: 'Aksi', key: 'actions', render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Detail', onClick: () => router.push(`/ip-pools/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) }),
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus?' }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  const parts = (r.network || '').split('/')
  form.value = { name: r.name, network: parts[0] || r.network, prefix_length: parseInt(parts[1]) || 24, gateway: r.gateway, dns_primary: r.dns_primary || '', dns_secondary: r.dns_secondary || '', router_id: r.router_id || null, notes: r.notes || '' }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.network) { message.warning('Nama & network wajib diisi'); return }
  saving.value = true
  const payload = { ...form.value, network: `${form.value.network}/${form.value.prefix_length}` }
  try {
    if (editId.value) { await ipamApi.updatePool(editId.value, payload); message.success('Pool diperbarui') }
    else { await ipamApi.createPool(payload); message.success('Pool ditambahkan') }
    showModal.value = false; resetForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleDelete(id: string) {
  try { await ipamApi.deletePool(id); message.success('Pool dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function fetchData() {
  loading.value = true
  try { const { data: res } = await ipamApi.pools({ search: search.value }); data.value = res.data || [] }
  catch { message.error('Gagal memuat data') }
  loading.value = false
}

async function fetchRouters() {
  try { const { data: res } = await routerApi.list(); routerOptions.value = (res.data || []).map((r: any) => ({ label: `${r.name} (${r.vpn_ip || '-'})`, value: r.id })) }
  catch { /* ignore */ }
}

onMounted(() => { fetchData(); fetchRouters() })
</script>

<template>
  <n-card title="IP Pool (IPAM)">
    <template #header-extra>
      <n-space :vertical="isMobile" :size="isMobile ? 8 : 12">
        <n-input v-model:value="search" placeholder="Cari pool..." clearable @clear="fetchData" @keyup.enter="fetchData" :style="{ width: isMobile ? '100%' : '200px' }" />
        <n-button type="primary" @click="resetForm(); showModal = true" :style="isMobile ? { alignSelf: 'flex-end' } : {}">+ Tambah Pool</n-button>
      </n-space>
    </template>

    <!-- Desktop: table -->
    <n-data-table v-if="isDesktop" :columns="columns" :data="data" :loading="loading" :bordered="false" />

    <!-- Tablet & Mobile: cards -->
    <div v-else>
      <div v-if="loading" style="text-align:center;padding:24px">Memuat...</div>
      <div v-else-if="!data.length" style="text-align:center;padding:24px;opacity:0.6">Tidak ada pool</div>
      <div v-else class="pool-grid">
        <n-card v-for="r in data" :key="r.id" size="small" hoverable style="cursor:pointer" @click="router.push(`/ip-pools/${r.id}`)">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">
            <span style="font-weight:600">{{ r.name }}</span>
          </div>
          <div style="font-family:monospace;font-size:13px;margin-bottom:4px">{{ r.network }}</div>
          <div style="font-size:12px;opacity:0.7;margin-bottom:4px">GW: {{ r.gateway }}</div>
          <div style="font-size:12px;margin-bottom:6px">
            IP: {{ r.used_ips || 0 }}/{{ r.total_ips || 0 }} terpakai
            <span style="opacity:0.6"> • Tersedia: {{ (r.total_ips || 0) - (r.used_ips || 0) }}</span>
          </div>
          <n-space size="small" @click.stop>
            <n-button size="tiny" type="warning" @click="openEdit(r)">Edit</n-button>
            <n-popconfirm @positive-click="handleDelete(r.id)">
              <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
              Yakin hapus?
            </n-popconfirm>
          </n-space>
        </n-card>
      </div>
    </div>
  </n-card>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit IP Pool' : 'Tambah IP Pool'" :style="{ maxWidth: '500px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 130">
      <n-form-item label="Nama"><n-input v-model:value="form.name" /></n-form-item>
      <n-form-item label="Network"><n-input v-model:value="form.network" placeholder="10.0.0.0" /></n-form-item>
      <n-form-item label="Prefix Length"><n-input-number v-model:value="form.prefix_length" :min="8" :max="30" style="width:100%" /></n-form-item>
      <n-form-item label="Gateway"><n-input v-model:value="form.gateway" placeholder="10.0.0.1" /></n-form-item>
      <n-form-item label="DNS Primary"><n-input v-model:value="form.dns_primary" placeholder="8.8.8.8" /></n-form-item>
      <n-form-item label="DNS Secondary"><n-input v-model:value="form.dns_secondary" placeholder="8.8.4.4" /></n-form-item>
      <n-form-item label="Router">
        <n-select v-model:value="form.router_id" :options="routerOptions" placeholder="Pilih router (opsional)" clearable />
      </n-form-item>
      <n-form-item label="Catatan"><n-input v-model:value="form.notes" /></n-form-item>
      <n-space justify="end">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<style scoped>
.pool-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .pool-grid {
    grid-template-columns: 1fr;
  }
}
</style>
