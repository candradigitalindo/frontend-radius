<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NPopconfirm,
  NModal, NForm, NFormItem, NInputNumber, NSelect, useMessage
} from 'naive-ui'
import { resellerApi } from '../../api'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)

const form = ref({ name: '', email: '', phone: '', company_name: '', commission_rate: 10, status: 'active' })

function resetForm() {
  form.value = { name: '', email: '', phone: '', company_name: '', commission_rate: 10, status: 'active' }
  editId.value = null
}

const statusMap: Record<string, { type: any; label: string }> = {
  active: { type: 'success', label: 'Aktif' },
  inactive: { type: 'default', label: 'Nonaktif' },
  suspended: { type: 'error', label: 'Suspended' },
}

const columns = [
  { title: 'Nama', key: 'name' },
  { title: 'Perusahaan', key: 'company_name' },
  { title: 'Email', key: 'email' },
  { title: 'Telepon', key: 'phone' },
  { title: 'Komisi (%)', key: 'commission_rate' },
  { title: 'Status', key: 'status', render: (r: any) => { const s = statusMap[r.status] || { type: 'default', label: r.status }; return h(NTag, { type: s.type, size: 'small' }, () => s.label) } },
  {
    title: 'Aksi', key: 'actions', render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', type: 'info', title: 'Detail', onClick: () => router.push(`/resellers/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) }),
      h(NButton, { size: 'tiny', type: 'warning', title: 'Edit', onClick: () => openEdit(r), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' }) }),
      h(NPopconfirm, { onPositiveClick: () => handleDelete(r.id) }, { trigger: () => h(NButton, { size: 'tiny', type: 'error', title: 'Hapus', renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' }) }), default: () => 'Yakin hapus?' }),
    ])
  },
]

function openEdit(r: any) {
  editId.value = r.id
  form.value = { name: r.name, email: r.email, phone: r.phone, company_name: r.company_name || '', commission_rate: r.commission_rate, status: r.status || 'active' }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.email) { message.warning('Nama & email wajib diisi'); return }
  saving.value = true
  try {
    if (editId.value) { await resellerApi.update(editId.value, form.value); message.success('Reseller diperbarui') }
    else { await resellerApi.create(form.value); message.success('Reseller ditambahkan') }
    showModal.value = false; resetForm(); fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan') }
  saving.value = false
}

async function handleDelete(id: string) {
  try { await resellerApi.delete(id); message.success('Reseller dihapus'); fetchData() }
  catch { message.error('Gagal menghapus') }
}

async function fetchData() {
  loading.value = true
  try { const { data: res } = await resellerApi.list({ search: search.value }); data.value = res.data || [] }
  catch { message.error('Gagal memuat data') }
  loading.value = false
}
onMounted(fetchData)
</script>

<template>
  <n-card title="Reseller / Agen">
    <template #header-extra>
      <n-space :vertical="isMobile" :size="isMobile ? 8 : 12">
        <n-input v-model:value="search" placeholder="Cari reseller..." clearable @clear="fetchData" @keyup.enter="fetchData" :style="{ width: isMobile ? '100%' : '200px' }" />
        <n-button type="primary" @click="resetForm(); showModal = true" :style="isMobile ? { alignSelf: 'flex-end' } : {}">+ Tambah</n-button>
      </n-space>
    </template>

    <!-- Desktop: table -->
    <n-data-table v-if="isDesktop" :columns="columns" :data="data" :loading="loading" :bordered="false" />

    <!-- Tablet & Mobile: cards -->
    <div v-else>
      <div v-if="loading" style="text-align:center;padding:24px">Memuat...</div>
      <div v-else-if="!data.length" style="text-align:center;padding:24px;opacity:0.6">Tidak ada reseller</div>
      <div v-else class="reseller-grid">
        <n-card v-for="r in data" :key="r.id" size="small" hoverable style="cursor:pointer" @click="router.push(`/resellers/${r.id}`)">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">
            <span style="font-weight:600">{{ r.name }}</span>
            <n-tag :type="(statusMap[r.status] || {}).type || 'default'" size="small">{{ (statusMap[r.status] || {}).label || r.status }}</n-tag>
          </div>
          <div v-if="r.company_name" style="font-size:12px;opacity:0.7;margin-bottom:2px">{{ r.company_name }}</div>
          <div style="font-size:12px;margin-bottom:2px">{{ r.email }}</div>
          <div style="font-size:12px;margin-bottom:6px">{{ r.phone }}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <n-tag size="tiny" :bordered="false">Komisi: {{ r.commission_rate }}%</n-tag>
            <n-space size="small" @click.stop>
              <n-button size="tiny" type="warning" @click="openEdit(r)">Edit</n-button>
              <n-popconfirm @positive-click="handleDelete(r.id)">
                <template #trigger><n-button size="tiny" type="error">Hapus</n-button></template>
                Yakin hapus?
              </n-popconfirm>
            </n-space>
          </div>
        </n-card>
      </div>
    </div>
  </n-card>

  <n-modal v-model:show="showModal" preset="card" :title="editId ? 'Edit Reseller' : 'Tambah Reseller'" :style="{ maxWidth: '500px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 130">
      <n-form-item label="Nama"><n-input v-model:value="form.name" /></n-form-item>
      <n-form-item label="Perusahaan"><n-input v-model:value="form.company_name" /></n-form-item>
      <n-form-item label="Email"><n-input v-model:value="form.email" /></n-form-item>
      <n-form-item label="Telepon"><n-input v-model:value="form.phone" /></n-form-item>
      <n-form-item label="Komisi (%)"><n-input-number v-model:value="form.commission_rate" :min="0" :max="100" style="width:100%" /></n-form-item>
      <n-form-item label="Status">
        <n-select v-model:value="form.status" :options="[{label:'Aktif',value:'active'},{label:'Nonaktif',value:'inactive'},{label:'Suspended',value:'suspended'}]" />
      </n-form-item>
      <n-space justify="end">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleSave">Simpan</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<style scoped>
.reseller-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .reseller-grid {
    grid-template-columns: 1fr;
  }
}
</style>
