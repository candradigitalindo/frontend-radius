<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, NTag, NSpin, NModal, NSelect, useMessage } from 'naive-ui'
import {
  ArrowBackOutline as BackIcon,
  ReceiptOutline as InvoiceIcon,
  CalendarOutline as CalendarIcon,
  WalletOutline as WalletIcon,
  CheckmarkCircleOutline as PaidIcon,
  TimeOutline as UnpaidIcon,
  AlertCircleOutline as OverdueIcon,
  CardOutline as PaymentIcon,
  OpenOutline as OpenIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const invoice = ref<any>({})
const payments = ref<any[]>([])
const id = route.params.id as string

// Payment modal
const showPayModal = ref(false)
const paying = ref(false)
const payMethod = ref('qris')
const paymentConfig = ref<{ available: boolean; provider: string; sandbox: boolean }>({
  available: false,
  provider: '',
  sandbox: true,
})
const payMethodOptions = [
  { label: 'QRIS', value: 'qris' },
  { label: 'Transfer Bank (VA)', value: 'bank_transfer' },
  { label: 'GoPay', value: 'gopay' },
  { label: 'OVO', value: 'ovo' },
  { label: 'Dana', value: 'dana' },
  { label: 'ShopeePay', value: 'shopeepay' },
]

onMounted(async () => {
  try {
    const [invRes, payRes, cfgRes] = await Promise.all([
      portalApi.invoice(id),
      portalApi.invoicePayments(id),
      portalApi.paymentConfig(),
    ])
    invoice.value = invRes.data.data || invRes.data
    payments.value = payRes.data.data || []
    paymentConfig.value = cfgRes.data.data || { available: false, provider: '', sandbox: true }
  } catch {
    message.error('Gagal memuat detail invoice')
  }
  loading.value = false
})

// Bayar online hanya jika tagihan belum lunas DAN gateway aktif di mode produksi
const canPay = computed(() =>
  (invoice.value.status === 'unpaid' || invoice.value.status === 'overdue') &&
  paymentConfig.value.available
)

function formatCurrency(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
}

function statusType(s: string): 'success' | 'warning' | 'error' | 'info' {
  const m: Record<string, any> = { paid: 'success', overdue: 'error', unpaid: 'warning' }
  return m[s] || 'info'
}

function statusLabel(s: string) {
  const m: Record<string, string> = { paid: 'Lunas', overdue: 'Lewat Tempo', unpaid: 'Belum Bayar' }
  return m[s] || s
}

function statusIcon(s: string) {
  const m: Record<string, any> = { paid: PaidIcon, overdue: OverdueIcon, unpaid: UnpaidIcon }
  return m[s] || InvoiceIcon
}

async function openPayModal() {
  showPayModal.value = true
}

async function submitPayment() {
  paying.value = true
  try {
    const returnUrl = window.location.href
    const { data: res } = await portalApi.payInvoiceGateway(id, {
      payment_method: payMethod.value,
      return_url: returnUrl,
    })
    const payData = res.data
    if (payData?.checkout_url || payData?.payment_url || payData?.redirect_url) {
      window.open(payData.checkout_url || payData.payment_url || payData.redirect_url, '_blank')
      showPayModal.value = false
      message.success('Link pembayaran dibuka di tab baru')
    } else {
      message.success('Pembayaran berhasil diproses')
      showPayModal.value = false
      const [invRes, payRes] = await Promise.all([portalApi.invoice(id), portalApi.invoicePayments(id)])
      invoice.value = invRes.data.data || invRes.data
      payments.value = payRes.data.data || []
    }
  } catch (e: any) {
    message.error(e?.response?.data?.error || 'Gagal membuat link pembayaran')
  }
  paying.value = false
}
</script>

<template>
  <div class="detail-page">
    <n-spin :show="loading" style="min-height: 200px">
      <!-- Back -->
      <button class="back-btn" @click="router.push('/portal/invoices')">
        <n-icon :component="BackIcon" :size="18" />
        <span>Kembali ke Tagihan</span>
      </button>

      <!-- Header card -->
      <div class="header-card">
        <div class="header-top">
          <div class="status-badge-wrap" :class="'st-' + invoice.status">
            <n-icon :component="statusIcon(invoice.status)" :size="24" />
          </div>
          <div class="header-info">
            <div class="inv-number">{{ invoice.invoice_number || '-' }}</div>
            <div class="inv-period">Periode {{ invoice.period_month }}/{{ invoice.period_year }}</div>
          </div>
          <n-tag :type="statusType(invoice.status)" size="medium" round style="margin-left:auto;flex-shrink:0">
            {{ statusLabel(invoice.status) }}
          </n-tag>
        </div>
        <div class="amount-hero">{{ formatCurrency(invoice.total_amount) }}</div>

        <!-- Pay online button -->
        <button v-if="canPay" class="pay-btn" @click="openPayModal">
          <n-icon :component="PaymentIcon" :size="18" />
          Bayar Online Sekarang
        </button>
      </div>

      <!-- Detail rows -->
      <div class="detail-card">
        <div class="detail-row">
          <div class="det-icon"><n-icon :component="CalendarIcon" :size="17" /></div>
          <div class="det-label">Jatuh Tempo</div>
          <div class="det-value">{{ formatDate(invoice.due_date) }}</div>
        </div>
        <div class="detail-row" v-if="invoice.paid_at">
          <div class="det-icon" style="color:#22c55e"><n-icon :component="PaidIcon" :size="17" /></div>
          <div class="det-label">Tanggal Bayar</div>
          <div class="det-value">{{ formatDate(invoice.paid_at) }}</div>
        </div>
        <div class="detail-row" v-if="invoice.payment_method">
          <div class="det-icon"><n-icon :component="PaymentIcon" :size="17" /></div>
          <div class="det-label">Metode Bayar</div>
          <div class="det-value">{{ invoice.payment_method }}</div>
        </div>
        <div class="detail-row" v-if="invoice.notes">
          <div class="det-icon"><n-icon :component="InvoiceIcon" :size="17" /></div>
          <div class="det-label">Catatan</div>
          <div class="det-value">{{ invoice.notes }}</div>
        </div>
      </div>

      <!-- Payment history -->
      <div v-if="payments.length > 0" class="pay-section">
        <div class="section-title">Riwayat Pembayaran</div>
        <div class="pay-list">
          <div v-for="pay in payments" :key="pay.id" class="pay-item">
            <div class="pay-icon">
              <n-icon :component="WalletIcon" :size="17" />
            </div>
            <div class="pay-info">
              <div class="pay-method">{{ pay.payment_method || 'Pembayaran' }}</div>
              <div class="pay-date">{{ formatDate(pay.paid_at) }}</div>
            </div>
            <div class="pay-amount">{{ formatCurrency(pay.amount) }}</div>
          </div>
        </div>
      </div>
    </n-spin>
  </div>

  <!-- Payment Modal -->
  <n-modal
    v-model:show="showPayModal"
    preset="card"
    title="Bayar Online"
    :style="{ maxWidth: '420px', width: '95vw' }"
  >
    <div class="pay-modal-body">
      <div class="pay-summary">
        <div class="pay-sum-label">Total Tagihan</div>
        <div class="pay-sum-amount">{{ formatCurrency(invoice.total_amount) }}</div>
        <div class="pay-sum-num">{{ invoice.invoice_number }}</div>
      </div>

      <div class="pay-method-label">Pilih Metode Pembayaran</div>
      <div class="pay-method-grid">
        <div
          v-for="opt in payMethodOptions"
          :key="opt.value"
          class="pay-method-option"
          :class="{ active: payMethod === opt.value }"
          @click="payMethod = opt.value"
        >
          {{ opt.label }}
        </div>
      </div>

      <div class="pay-info-note">
        Link pembayaran akan dibuka di tab baru. Setelah pembayaran selesai, status tagihan akan diperbarui otomatis.
      </div>

      <div class="pay-modal-actions">
        <button class="btn-cancel" @click="showPayModal = false">Batal</button>
        <button class="btn-pay" :disabled="paying" @click="submitPayment">
          <n-icon :component="OpenIcon" :size="16" v-if="!paying" />
          {{ paying ? 'Memproses...' : 'Lanjut Bayar' }}
        </button>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 700px;
  margin: 0 auto;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  color: var(--app-accent, #6366f1);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 0;
  transition: opacity .2s;
}

.back-btn:hover { opacity: .7; }

/* Header card */
.header-card {
  border-radius: 16px;
  padding: 24px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.status-badge-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.st-paid { background: rgba(34,197,94,.1); color: #22c55e; }
.st-unpaid { background: rgba(245,158,11,.1); color: #f59e0b; }
.st-overdue { background: rgba(239,68,68,.1); color: #ef4444; }

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inv-number {
  font-size: 16px;
  font-weight: 700;
}

.inv-period {
  font-size: 13px;
  opacity: .5;
}

.amount-hero {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -.6px;
}

.pay-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .2s, transform .2s;
}

.pay-btn:hover {
  opacity: .92;
  transform: translateY(-1px);
}

/* Detail card */
.detail-card {
  border-radius: 14px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
  overflow: hidden;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--app-card-border);
}

.detail-row:last-child { border-bottom: none; }

.det-icon {
  color: var(--app-accent, #6366f1);
  flex-shrink: 0;
  display: flex;
}

.det-label {
  font-size: 13px;
  opacity: .55;
  min-width: 120px;
}

.det-value {
  font-size: 14px;
  font-weight: 500;
  margin-left: auto;
  text-align: right;
}

/* Payment history */
.pay-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  opacity: .75;
}

.pay-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pay-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
}

.pay-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(34,197,94,.1);
  color: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pay-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pay-method {
  font-size: 14px;
  font-weight: 500;
}

.pay-date {
  font-size: 12px;
  opacity: .45;
}

.pay-amount {
  font-size: 14px;
  font-weight: 700;
  color: #22c55e;
}

/* Pay modal */
.pay-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pay-summary {
  padding: 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(14,165,233,.08));
  border: 1px solid rgba(99,102,241,.15);
  text-align: center;
}

.pay-sum-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  opacity: .5;
  margin-bottom: 4px;
}

.pay-sum-amount {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -.5px;
  color: var(--app-accent, #6366f1);
}

.pay-sum-num {
  font-size: 12px;
  opacity: .4;
  margin-top: 4px;
}

.pay-method-label {
  font-size: 13px;
  font-weight: 600;
  opacity: .6;
}

.pay-method-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.pay-method-option {
  padding: 10px 8px;
  border-radius: 10px;
  border: 1px solid var(--app-border, rgba(0,0,0,.08));
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}

.pay-method-option:hover,
.pay-method-option.active {
  border-color: var(--app-accent, #6366f1);
  background: rgba(99,102,241,.08);
  color: var(--app-accent, #6366f1);
}

.pay-info-note {
  font-size: 12px;
  opacity: .5;
  line-height: 1.5;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(0,0,0,.03);
}

:root.dark .pay-info-note {
  background: rgba(255,255,255,.03);
}

.pay-modal-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border, rgba(0,0,0,.1));
  background: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}

.btn-cancel:hover {
  background: rgba(0,0,0,.04);
}

.btn-pay {
  flex: 2;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity .2s;
}

.btn-pay:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.btn-pay:not(:disabled):hover {
  opacity: .9;
}

@media (max-width: 480px) {
  .amount-hero { font-size: 28px; }
  .det-label { min-width: 90px; }
  .pay-method-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
