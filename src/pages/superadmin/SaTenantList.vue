<script setup lang="ts">
import { h, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NDataTable, NButton, NSpace, NInput,
  NModal, NForm, NFormItem, NSwitch, useMessage
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { tenantApi } from '../../api'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const form = ref({ name: '', domain: '', is_active: true })

const columns: DataTableColumns = [
  { title: 'Nama', key: 'name', render: (r: any) => h('a', { style: 'cursor:pointer;color:#6366f1', onClick: () => router.push(`/superadmin/tenants/${r.id}`) }, r.name) },
  { title: 'Domain', key: 'domain' },
  { title: 'ID', key: 'id', render: (r: any) => r.id?.slice(0, 8) + '...' },
  { title: 'Dibuat', key: 'created_at', render: (r: any) => r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-' },
  {
    title: 'Aksi', key: 'actions', width: 120,
    render: (r: any) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'small', title: 'Detail', onClick: () => router.push(`/superadmin/tenants/${r.id}`), renderIcon: () => h('span', { innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }) }),
    ]),
  },
]

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await tenantApi.list()
    let items = res.data || []
    if (search.value) {
      const q = search.value.toLowerCase()
      items = items.filter((t: any) => t.name?.toLowerCase().includes(q) || t.domain?.toLowerCase().includes(q))
    }
    data.value = items
  } catch {
    message.error('Gagal memuat tenant')
  }
  loading.value = false
}

async function handleCreate() {
  if (!form.value.name) {
    message.warning('Nama tenant wajib diisi')
    return
  }
  saving.value = true
  try {
    await tenantApi.create(form.value)
    message.success('Tenant berhasil dibuat')
    showModal.value = false
    form.value = { name: '', domain: '', is_active: true }
    fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal membuat tenant')
  }
  saving.value = false
}

onMounted(fetchData)
</script>

<template>
  <n-card title="Manajemen Tenant">
    <template #header-extra>
      <n-space>
        <n-input v-model:value="search" placeholder="Cari tenant..." clearable @clear="fetchData" @keyup.enter="fetchData" style="width: 200px" />
        <n-button type="primary" @click="showModal = true">Tambah Tenant</n-button>
      </n-space>
    </template>
    <n-data-table :columns="columns" :data="data" :loading="loading" :bordered="false" />
  </n-card>

  <n-modal v-model:show="showModal" preset="card" title="Buat Tenant Baru" style="max-width: 480px">
    <n-form label-placement="left" label-width="100">
      <n-form-item label="Nama"><n-input v-model:value="form.name" placeholder="PT Internet Sejahtera" /></n-form-item>
      <n-form-item label="Domain"><n-input v-model:value="form.domain" placeholder="isp.example.com" /></n-form-item>
      <n-form-item label="Aktif"><n-switch v-model:value="form.is_active" /></n-form-item>
      <n-space justify="end">
        <n-button @click="showModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handleCreate">Simpan</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>
