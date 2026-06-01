<script setup lang="ts">
import { h, ref, onMounted, computed, watch } from 'vue'
import {
  NCard, NDataTable, NButton, NSpace, NModal, NForm, NFormItem,
  NInput, NInputNumber, NSelect, NTag, NText, NPagination,
  useMessage, useDialog, NIcon, NGrid, NGridItem, NDatePicker,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  Plus, Pencil, Trash, Search, Refresh, Check,
} from '@vicons/tabler'
import { adminApi } from '../../api'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingId = ref<string | null>(null)

const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)

const filterStatus = ref('')
const filterSearch = ref('')
const plans = ref<any[]>([])
const tenants = ref<any[]>([])

const statusOptions = [
  { label: 'Semua Status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Lunas', value: 'paid' },
  { label: 'Expired', value: 'expired' },
  { label: 'Dibatalkan', value: 'cancelled' },
]

const emptyForm = () => ({
  tenant_id: '',
  plan_id: '',
  duration_months: 1,
  status: 'pending',
  payment_method: '',
  payment_ref: '',
  notes: '',
  paid_at: null as number | null,
  starts_at: null as number | null,
  expires_at: null as number | null,
})

const form = ref(emptyForm())
const isCreate = computed(() => !editingId.value)

async function fetchOrders() {
  loading.value = true
  try {
    const res = await adminApi.listSubOrders({
      page: page.value,
      per_page: perPage.value,
      status: filterStatus.value || undefined,
      search: filterSearch.value || undefined,
    })
    orders.value = res.data?.data || []
    total.value = res.data?.total || 0
  } catch {
    message.error('Gagal memuat data transaksi')
  } finally {
    loading.value = false
  }
}

async function fetchPlansAndTenants() {
  try {
    const [plansRes, tenantsRes] = await Promise.all([
      adminApi.listSubscriptionPlans(),
      adminApi.tenants(),
    ])
    plans.value = (plansRes.data?.data || []).map((p: any) => ({
      label: `${p.name} — Rp ${Number(p.price).toLocaleString('id')}`,
      value: p.id,
    }))
    tenants.value = (tenantsRes.data?.data || []).map((t: any) => ({
      label: t.name,
      value: t.id,
    }))
  } catch {}
}

onMounted(() => {
  fetchOrders()
  fetchPlansAndTenants()
})

watch([page, perPage, filterStatus], fetchOrders)

let searchTimer: ReturnType<typeof setTimeout>
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchOrders() }, 400)
}

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  form.value = {
    tenant_id: row.tenant_id,
    plan_id: row.plan_id,
    duration_months: row.duration_months,
    status: row.status,
    payment_method: row.payment_method || '',
    payment_ref: row.payment_ref || '',
    notes: row.notes || '',
    paid_at: row.paid_at ? new Date(row.paid_at).getTime() : null,
    starts_at: row.starts_at ? new Date(row.starts_at).getTime() : null,
    expires_at: row.expires_at ? new Date(row.expires_at).getTime() : null,
  }
  showModal.value = true
}

function toISO(ts: number | null): string | undefined {
  if (!ts) return undefined
  return new Date(ts).toISOString()
}

async function save() {
  saving.value = true
  try {
    if (isCreate.value) {
      await adminApi.createSubOrder({
        tenant_id: form.value.tenant_id,
        plan_id: form.value.plan_id,
        duration_months: form.value.duration_months,
      })
      message.success('Order berhasil dibuat')
    } else {
      const payload: Record<string, any> = {
        status: form.value.status,
        payment_method: form.value.payment_method,
        payment_ref: form.value.payment_ref,
        notes: form.value.notes,
      }
      const paidAt = toISO(form.value.paid_at)
      const startsAt = toISO(form.value.starts_at)
      const expiresAt = toISO(form.value.expires_at)
      if (paidAt) payload.paid_at = paidAt
      if (startsAt) payload.starts_at = startsAt
      if (expiresAt) payload.expires_at = expiresAt
      await adminApi.updateSubOrder(editingId.value!, payload)
      message.success('Transaksi berhasil diperbarui')
    }
    showModal.value = false
    fetchOrders()
  } catch (err: any) {
    message.error(err.response?.data?.error || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

function confirmDelete(row: any) {
  dialog.warning({
    title: 'Hapus Transaksi',
    content: `Hapus order ${row.id.slice(-8).toUpperCase()} dari ${row.tenant_name}?`,
    positiveText: 'Hapus',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      try {
        await adminApi.deleteSubOrder(row.id)
        message.success('Transaksi dihapus')
        fetchOrders()
      } catch {
        message.error('Gagal menghapus transaksi')
      }
    },
  })
}

async function confirmPaid(row: any) {
  dialog.warning({
    title: 'Konfirmasi Pembayaran',
    content: `Tandai order ${row.id.slice(-8).toUpperCase()} sebagai LUNAS?`,
    positiveText: 'Ya, Konfirmasi',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      try {
        await adminApi.updateSubOrder(row.id, { status: 'paid' })
        message.success('Pembayaran dikonfirmasi')
        fetchOrders()
      } catch (err: any) {
        message.error(err.response?.data?.error || 'Gagal konfirmasi')
      }
    },
  })
}

function statusTag(status: string) {
  const map: Record<string, { type: any; label: string }> = {
    pending: { type: 'warning', label: 'Pending' },
    paid: { type: 'success', label: 'Lunas' },
    expired: { type: 'default', label: 'Expired' },
    cancelled: { type: 'error', label: 'Dibatalkan' },
  }
  const s = map[status] || { type: 'default', label: status }
  return h(NTag, { type: s.type, size: 'small', round: true, bordered: false }, { default: () => s.label })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtRp(v: number) {
  return 'Rp ' + Number(v).toLocaleString('id')
}

const columns: DataTableColumns = [
  {
    title: 'Tenant',
    key: 'tenant_name',
    width: 140,
    render: (row: any) => h(NText, { strong: true, style: 'font-size:13px' }, { default: () => row.tenant_name }),
  },
  {
    title: 'Paket',
    key: 'plan_name',
    width: 120,
    render: (row: any) => h('span', { style: 'font-size:13px' }, row.plan_name),
  },
  {
    title: 'Durasi',
    key: 'duration_months',
    width: 80,
    render: (row: any) => h('span', { style: 'font-size:12px; color:#888' }, `${row.duration_months} bln`),
  },
  {
    title: 'Jumlah',
    key: 'amount',
    width: 120,
    render: (row: any) => h('span', { style: 'font-size:13px; font-weight:600' }, fmtRp(row.amount)),
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
    render: (row: any) => statusTag(row.status),
  },
  {
    title: 'Metode',
    key: 'payment_method',
    width: 100,
    render: (row: any) => h('span', { style: 'font-size:12px' }, row.payment_method || '—'),
  },
  {
    title: 'Tanggal',
    key: 'created_at',
    width: 110,
    render: (row: any) => h('span', { style: 'font-size:12px; color:#888' }, fmtDate(row.created_at)),
  },
  {
    title: 'Berlaku s/d',
    key: 'expires_at',
    width: 110,
    render: (row: any) => h('span', { style: 'font-size:12px' }, fmtDate(row.expires_at)),
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 130,
    fixed: 'right',
    render: (row: any) => h(NSpace, { size: 4 }, {
      default: () => [
        row.status === 'pending' && h(NButton, {
          size: 'small', type: 'success', quaternary: true,
          title: 'Konfirmasi Lunas',
          onClick: () => confirmPaid(row),
        }, { icon: () => h(NIcon, null, { default: () => h(Check) }) }),
        h(NButton, {
          size: 'small', quaternary: true,
          onClick: () => openEdit(row),
        }, { icon: () => h(NIcon, null, { default: () => h(Pencil) }) }),
        h(NButton, {
          size: 'small', type: 'error', quaternary: true,
          onClick: () => confirmDelete(row),
        }, { icon: () => h(NIcon, null, { default: () => h(Trash) }) }),
      ].filter(Boolean),
    }),
  },
]

const statusEditOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Lunas', value: 'paid' },
  { label: 'Expired', value: 'expired' },
  { label: 'Dibatalkan', value: 'cancelled' },
]
</script>

<template>
  <div class="sa-transaksi">
    <div class="page-header">
      <div>
        <div class="page-title">Transaksi Berlangganan</div>
        <div class="page-sub">Kelola semua order langganan tenant</div>
      </div>
      <n-button type="primary" @click="openCreate">
        <template #icon><n-icon><Plus /></n-icon></template>
        Buat Order
      </n-button>
    </div>

    <n-card class="filter-card">
      <n-grid :cols="3" :x-gap="12" responsive="screen" :item-responsive="true">
        <n-grid-item span="3 m:1">
          <n-input
            v-model:value="filterSearch"
            placeholder="Cari tenant, paket, ref..."
            clearable
            @input="onSearchInput"
          >
            <template #prefix><n-icon><Search /></n-icon></template>
          </n-input>
        </n-grid-item>
        <n-grid-item span="3 m:1">
          <n-select
            v-model:value="filterStatus"
            :options="statusOptions"
            @update:value="() => { page = 1; fetchOrders() }"
          />
        </n-grid-item>
        <n-grid-item span="3 m:1">
          <n-button @click="fetchOrders" :loading="loading" style="width:100%">
            <template #icon><n-icon><Refresh /></n-icon></template>
            Refresh
          </n-button>
        </n-grid-item>
      </n-grid>
    </n-card>

    <n-card>
      <n-data-table
        :columns="columns"
        :data="orders"
        :loading="loading"
        :bordered="false"
        size="small"
        :scroll-x="900"
        :row-key="(r: any) => r.id"
      />
      <div class="pagination-wrap">
        <n-text depth="3" style="font-size:12px">Total: {{ total }} transaksi</n-text>
        <n-pagination
          v-model:page="page"
          :page-count="Math.ceil(total / perPage)"
          :page-size="perPage"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page-size="(s: number) => { perPage = s; page = 1; fetchOrders() }"
        />
      </div>
    </n-card>

    <!-- Modal Create / Edit -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="isCreate ? 'Buat Order Baru' : 'Edit Transaksi'"
      style="max-width: 520px"
      :segmented="{ footer: true }"
    >
      <n-form label-placement="top" :label-width="120">

        <template v-if="isCreate">
          <n-form-item label="Tenant" required>
            <n-select
              v-model:value="form.tenant_id"
              :options="tenants"
              filterable
              placeholder="Pilih tenant"
            />
          </n-form-item>
          <n-form-item label="Paket" required>
            <n-select
              v-model:value="form.plan_id"
              :options="plans"
              filterable
              placeholder="Pilih paket"
            />
          </n-form-item>
          <n-form-item label="Durasi (bulan)">
            <n-input-number v-model:value="form.duration_months" :min="1" :max="24" style="width:100%" />
          </n-form-item>
        </template>

        <template v-else>
          <n-form-item label="Status">
            <n-select v-model:value="form.status" :options="statusEditOptions" />
          </n-form-item>
          <n-form-item label="Metode Pembayaran">
            <n-input v-model:value="form.payment_method" placeholder="transfer, midtrans, dll" />
          </n-form-item>
          <n-form-item label="Referensi Pembayaran">
            <n-input v-model:value="form.payment_ref" placeholder="No. referensi / order ID PG" />
          </n-form-item>
          <n-form-item label="Tanggal Bayar">
            <n-date-picker
              v-model:value="form.paid_at"
              type="datetime"
              clearable
              style="width:100%"
            />
          </n-form-item>
          <n-form-item label="Mulai Berlaku">
            <n-date-picker
              v-model:value="form.starts_at"
              type="date"
              clearable
              style="width:100%"
            />
          </n-form-item>
          <n-form-item label="Berlaku Hingga">
            <n-date-picker
              v-model:value="form.expires_at"
              type="date"
              clearable
              style="width:100%"
            />
          </n-form-item>
          <n-form-item label="Catatan">
            <n-input v-model:value="form.notes" type="textarea" :rows="2" />
          </n-form-item>
        </template>

      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">Batal</n-button>
          <n-button type="primary" :loading="saving" @click="save">
            {{ isCreate ? 'Buat Order' : 'Simpan' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.sa-transaksi { display: flex; flex-direction: column; gap: 16px; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
}
.page-title { font-size: 20px; font-weight: 700; }
.page-sub { font-size: 13px; opacity: 0.5; margin-top: 2px; }

.filter-card :deep(.n-card__content) { padding: 14px 16px; }

.pagination-wrap {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 14px; flex-wrap: wrap; gap: 8px;
}
</style>
