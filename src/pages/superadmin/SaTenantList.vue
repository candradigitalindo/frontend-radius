<script setup lang="ts">
import { h, ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NDataTable, NButton, NSpace, NInput, NTag, NText,
  NModal, NForm, NFormItem, NSwitch, NSelect, useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { tenantApi } from '../../api'
import { adminApi } from '../../api'

const router = useRouter()
const message = useMessage()
const isMobile = ref(false)
const loading = ref(false)

const MOBILE_BREAKPOINT = 768
function checkMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}
const data = ref<any[]>([])
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const plans = ref<any[]>([])

const emptyForm = () => ({
  name: '',
  slug: '',
  email: '',
  phone: '',
  address: '',
  plan: 'trial',
  max_customers: 50,
  is_active: true,
})
const form = ref(emptyForm())

const planOptions = computed(() =>
  plans.value.map((p: any) => ({ label: `${p.name} (maks. ${p.max_customers || '∞'} pelanggan)`, value: p.slug }))
)

function onNameInput(val: string) {
  form.value.slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function onPlanChange(slug: string) {
  const plan = plans.value.find((p: any) => p.slug === slug)
  if (plan && plan.max_customers > 0) {
    form.value.max_customers = plan.max_customers
  }
}

const planTag = (plan: string) => {
  const map: Record<string, any> = {
    trial: { type: 'default', label: 'Trial' },
    gratis: { type: 'info', label: 'Gratis' },
    free: { type: 'info', label: 'Gratis' },
  }
  return map[plan?.toLowerCase()] || { type: 'success', label: plan || 'Trial' }
}

const columns: DataTableColumns = [
  {
    title: 'Nama',
    key: 'name',
    render: (r: any) => h('a', {
      style: 'cursor:pointer;color:#6366f1;font-weight:500',
      onClick: () => router.push(`/superadmin/tenants/${r.id}`),
    }, r.name),
  },
  { title: 'Email', key: 'email', render: (r: any) => r.email || '-' },
  { title: 'Telepon', key: 'phone', render: (r: any) => r.phone || '-' },
  {
    title: 'Paket',
    key: 'plan',
    render: (r: any) => {
      const t = planTag(r.plan)
      return h(NTag, { type: t.type, size: 'small', round: true }, () => t.label)
    },
  },
  {
    title: 'Maks. Pelanggan',
    key: 'max_customers',
    render: (r: any) => r.max_customers === 0 ? '∞' : (r.max_customers || '-'),
  },
  {
    title: 'Status',
    key: 'status',
    render: (r: any) => {
      const map: Record<string, any> = {
        active: { type: 'success', label: 'Aktif' },
        pending: { type: 'warning', label: 'Pending' },
        suspended: { type: 'error', label: 'Suspended' },
      }
      const s = map[r.status] || { type: 'default', label: r.status || 'Aktif' }
      return h(NTag, { type: s.type, size: 'small' }, () => s.label)
    },
  },
  {
    title: 'Risiko',
    key: 'risk_score',
    render: (r: any) => {
      if (!r.risk_score) return h(NText, { depth: 3 }, () => '-')
      const type = r.risk_score >= 40 ? 'error' : 'warning'
      return h(NTag, { type, size: 'small', ghost: true }, () => `Skor: ${r.risk_score}`)
    },
  },
  {
    title: 'Terdaftar',
    key: 'created_at',
    render: (r: any) => r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-',
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 80,
    render: (r: any) => h(NButton, {
      size: 'small', type: 'primary', ghost: true,
      onClick: () => router.push(`/superadmin/tenants/${r.id}`),
    }, () => 'Edit'),
  },
]

const filteredData = computed(() => {
  if (!search.value) return data.value
  const q = search.value.toLowerCase()
  return data.value.filter((t: any) =>
    t.name?.toLowerCase().includes(q) ||
    t.email?.toLowerCase().includes(q) ||
    t.phone?.includes(q)
  )
})

async function fetchData() {
  loading.value = true
  try {
    const [tenantsRes, plansRes] = await Promise.all([
      tenantApi.list(),
      adminApi.listSubscriptionPlans(),
    ])
    data.value = tenantsRes.data?.data || []
    plans.value = (plansRes.data?.data || []).filter((p: any) => p.is_active)
  } catch {
    message.error('Gagal memuat data')
  }
  loading.value = false
}

function openCreate() {
  form.value = emptyForm()
  showModal.value = true
}

async function handleCreate() {
  if (!form.value.name || !form.value.email) {
    message.warning('Nama dan email wajib diisi')
    return
  }
  saving.value = true
  try {
    await tenantApi.create({
      name: form.value.name,
      slug: form.value.slug || form.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      email: form.value.email,
      phone: form.value.phone,
      address: form.value.address,
      plan: form.value.plan,
      max_customers: form.value.max_customers,
      is_active: form.value.is_active,
    })
    message.success('Tenant berhasil dibuat')
    showModal.value = false
    fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal membuat tenant')
  }
  saving.value = false
}

onMounted(() => {
  fetchData()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <n-card title="Manajemen Tenant" class="sa-page-card">
    <template #header-extra>
      <div class="header-actions">
        <n-input
          v-model:value="search"
          placeholder="Cari nama / email / telepon..."
          clearable
          class="search-input"
        />
        <n-button type="primary" @click="openCreate" class="add-btn">+ Tambah Tenant</n-button>
      </div>
    </template>

    <div class="table-wrapper">
      <n-data-table
        :columns="columns"
        :data="filteredData"
        :loading="loading"
        :bordered="false"
        :row-key="(r: any) => r.id"
        :scroll-x="1000"
      />
    </div>
  </n-card>

  <n-modal
    v-model:show="showModal"
    preset="card"
    title="Buat Tenant Baru"
    :style="{ maxWidth: '520px', width: '95vw' }"
    :mask-closable="false"
  >
    <n-form :label-placement="isMobile ? 'top' : 'left'" label-width="130">
      <n-form-item label="Nama ISP">
        <n-input
          v-model:value="form.name"
          placeholder="PT Internet Sejahtera"
          @input="onNameInput"
        />
      </n-form-item>

      <n-form-item label="Slug">
        <n-input v-model:value="form.slug" placeholder="pt-internet-sejahtera" />
      </n-form-item>

      <n-form-item label="Email">
        <n-input v-model:value="form.email" placeholder="admin@isp.com" />
      </n-form-item>

      <n-form-item label="Telepon">
        <n-input v-model:value="form.phone" placeholder="081234567890" />
      </n-form-item>

      <n-form-item label="Alamat">
        <n-input
          v-model:value="form.address"
          type="textarea"
          :rows="2"
          placeholder="Jl. Contoh No. 1, Kota"
        />
      </n-form-item>

      <n-form-item label="Paket Awal">
        <div style="width:100%">
          <n-select
            v-model:value="form.plan"
            :options="[{ label: 'Trial 30 Hari (Default)', value: 'trial' }, { label: 'Gratis (Tanpa Batas)', value: 'gratis' }, ...planOptions]"
            @update:value="onPlanChange"
            placeholder="Pilih paket"
            style="width: 100%"
          />
          <n-text depth="3" style="font-size:11px;margin-top:4px;display:block">
            Trial otomatis berakhir 30 hari sejak tenant dibuat.
          </n-text>
        </div>
      </n-form-item>

      <n-form-item label="Maks. Pelanggan">
        <n-input
          :value="String(form.max_customers)"
          @input="(v) => form.max_customers = parseInt(v) || 0"
          placeholder="50"
          style="width: 120px"
        />
        <span style="margin-left:8px;font-size:12px;color:#888">0 = tidak terbatas</span>
      </n-form-item>

      <n-form-item label="Aktif">
        <n-switch v-model:value="form.is_active" />
      </n-form-item>
    </n-form>

    <n-space justify="end" style="margin-top: 16px">
      <n-button @click="showModal = false">Batal</n-button>
      <n-button type="primary" :loading="saving" @click="handleCreate">Simpan</n-button>
    </n-space>
  </n-modal>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 240px;
}

.table-wrapper {
  margin-top: 8px;
}

@media (max-width: 640px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 8px;
  }

  .search-input {
    width: 100%;
  }

  :deep(.n-card-header) {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 12px;
  }

  :deep(.n-card-header__extra) {
    width: 100%;
    padding: 0 !important;
  }
}
</style>
