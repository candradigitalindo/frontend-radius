<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NDescriptions, NDescriptionsItem, NTag, NButton, NSpace,
  NDataTable, NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, useMessage
} from 'naive-ui'
import { invoiceApi, paymentApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const invoice = ref<any>({})
const payments = ref<any[]>([])
const showPayModal = ref(false)
const saving = ref(false)
const notifying = ref(false)
const id = route.params.id as string

async function handleNotify() {
  notifying.value = true
  try {
    await invoiceApi.notify(id)
    message.success('Notifikasi WhatsApp berhasil dikirim')
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Gagal mengirim notifikasi')
  }
  notifying.value = false
}
const isMobile = ref(window.innerWidth < 768)
const descCols = computed(() => isMobile.value ? 1 : 2)
function onResize() { isMobile.value = window.innerWidth < 768 }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const fmtRp = (v: number | null) => v != null ? v.toLocaleString('id-ID') : ''
const parseRp = (s: string) => { const n = Number(s.replace(/\./g, '').replace(/,/g, '.')); return isNaN(n) ? null : n }
const payAmountDisplay = ref(fmtRp(0))
function onPayAmountInput(val: string) {
  const num = parseRp(val)
  payForm.value.amount = num ?? 0
  payAmountDisplay.value = num != null ? fmtRp(num) : val
}
function syncPayAmountDisplay() { payAmountDisplay.value = fmtRp(payForm.value.amount) }

const payForm = ref({ amount: 0, payment_method: 'cash', reference: '', notes: '' })
const payMethods = [
  { label: 'Cash', value: 'cash' },
  { label: 'Transfer Bank', value: 'bank_transfer' },
  { label: 'QRIS', value: 'qris' },
  { label: 'E-Wallet', value: 'ewallet' },
]

const payCols = [
  { title: 'Tanggal', key: 'created_at', width: 110, render: (r: any) => r.created_at?.split('T')[0] || '-' },
  { title: 'Jumlah', key: 'amount', width: 120, render: (r: any) => (r.amount || 0).toLocaleString('id-ID') },
  { title: 'Metode', key: 'payment_method', width: 120 },
  { title: 'Referensi', key: 'reference', ellipsis: { tooltip: true } },
]

const statusMap: Record<string, { type: 'success' | 'warning' | 'error' | 'info'; color: string; bg: string }> = {
  paid: { type: 'success', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  unpaid: { type: 'warning', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  overdue: { type: 'error', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  cancelled: { type: 'info', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

function statusType(s: string) {
  return statusMap[s]?.type || 'default' as any
}

function openPay() {
  const remaining = (invoice.value.total_amount || 0) - (invoice.value.paid_amount || 0)
  payForm.value = { amount: remaining > 0 ? remaining : invoice.value.total_amount || 0, payment_method: 'cash', reference: '', notes: '' }
  payAmountDisplay.value = fmtRp(payForm.value.amount)
  showPayModal.value = true
}

async function handlePay() {
  if (payForm.value.amount <= 0) { message.warning('Jumlah harus lebih dari 0'); return }
  saving.value = true
  try {
    await invoiceApi.pay(id, payForm.value)
    message.success('Pembayaran berhasil dicatat')
    showPayModal.value = false
    fetchData()
  } catch (e: any) { message.error(e.response?.data?.error || 'Gagal menyimpan pembayaran') }
  saving.value = false
}

async function fetchData() {
  loading.value = true
  try {
    const { data: res } = await invoiceApi.get(id)
    invoice.value = res.data || res
    payments.value = invoice.value.payments || []
  } catch { message.error('Gagal memuat invoice') }
  loading.value = false
}
onMounted(fetchData)
</script>

<template>
  <div class="inv-detail">
    <n-card :loading="loading">
      <template #header>
        <div class="detail-header">
          <span class="detail-title">Invoice {{ invoice.invoice_number }}</span>
          <div class="detail-actions">
            <n-button size="small" secondary :loading="notifying" @click="handleNotify">Kirim WA</n-button>
            <n-button v-if="invoice.status !== 'paid'" type="primary" size="small" @click="openPay">Bayar</n-button>
            <n-button size="small" @click="router.push('/invoices')">Kembali</n-button>
          </div>
        </div>
      </template>

      <n-descriptions bordered :column="descCols" label-placement="left">
        <n-descriptions-item label="No. Invoice">{{ invoice.invoice_number }}</n-descriptions-item>
        <n-descriptions-item label="Status">
          <n-tag :type="statusType(invoice.status)" size="small">{{ invoice.status }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="Pelanggan">{{ invoice.customer?.name || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Periode">{{ invoice.period_month && invoice.period_year ? `${String(invoice.period_month).padStart(2, '0')}/${invoice.period_year}` : '-' }}</n-descriptions-item>
        <n-descriptions-item label="Harga Paket">{{ (invoice.package_price || 0).toLocaleString('id-ID') }}</n-descriptions-item>
        <n-descriptions-item label="Diskon">{{ invoice.discount ? invoice.discount.toLocaleString('id-ID') : '-' }}</n-descriptions-item>
        <n-descriptions-item label="Biaya Tambahan">{{ invoice.additional_fee ? invoice.additional_fee.toLocaleString('id-ID') : '-' }}</n-descriptions-item>
        <n-descriptions-item label="Total">{{ (invoice.total_amount || 0).toLocaleString('id-ID') }}</n-descriptions-item>
        <n-descriptions-item label="Terbayar">{{ (invoice.paid_amount || 0).toLocaleString('id-ID') }}</n-descriptions-item>
        <n-descriptions-item label="Jatuh Tempo">{{ invoice.due_date?.split('T')[0] || '-' }}</n-descriptions-item>
        <n-descriptions-item label="Dibayar Pada">{{ invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('id-ID') : '-' }}</n-descriptions-item>
        <n-descriptions-item label="Catatan">{{ invoice.notes || '-' }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <n-card title="Riwayat Pembayaran">
      <n-data-table :columns="payCols" :data="payments" :bordered="false" size="small" :scroll-x="450" />
    </n-card>
  </div>

  <n-modal v-model:show="showPayModal" preset="card" title="Catat Pembayaran" :style="{ maxWidth: '420px', width: '90vw' }">
    <n-form :label-placement="isMobile ? 'top' : 'left'" :label-width="isMobile ? undefined : 120">
      <n-form-item label="Jumlah"><n-input :value="payAmountDisplay" @input="onPayAmountInput" @blur="syncPayAmountDisplay" style="width:100%" /></n-form-item>
      <n-form-item label="Metode"><n-select v-model:value="payForm.payment_method" :options="payMethods" filterable /></n-form-item>
      <n-form-item label="Referensi"><n-input v-model:value="payForm.reference" placeholder="No. transfer, dll" /></n-form-item>
      <n-form-item label="Catatan"><n-input v-model:value="payForm.notes" /></n-form-item>
      <div class="modal-actions">
        <n-button @click="showPayModal = false">Batal</n-button>
        <n-button type="primary" :loading="saving" @click="handlePay">Simpan</n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style scoped>
.inv-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-title {
  font-weight: 700;
  font-size: 16px;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.n-descriptions) {
  overflow-x: auto;
}



@media (max-width: 640px) {
  .detail-header {
    flex-direction: column;
    align-items: stretch;
  }
  .detail-actions {
    justify-content: flex-start;
  }
  .modal-actions {
    flex-direction: column;
  }
  .modal-actions .n-button {
    width: 100%;
  }
}
</style>
