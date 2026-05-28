<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, NTag, NSpin, useMessage } from 'naive-ui'
import {
  ArrowBackOutline as BackIcon,
  ReceiptOutline as InvoiceIcon,
  CalendarOutline as CalendarIcon,
  WalletOutline as WalletIcon,
  CheckmarkCircleOutline as PaidIcon,
  TimeOutline as UnpaidIcon,
  AlertCircleOutline as OverdueIcon,
  CardOutline as PaymentIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const invoice = ref<any>({})
const payments = ref<any[]>([])
const id = route.params.id as string

onMounted(async () => {
  try {
    const [invRes, payRes] = await Promise.all([
      portalApi.invoice(id),
      portalApi.invoicePayments(id),
    ])
    invoice.value = invRes.data.data || invRes.data
    payments.value = payRes.data.data || []
  } catch {
    message.error('Gagal memuat detail invoice')
  }
  loading.value = false
})

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
</script>

<template>
  <div class="invoice-detail-page">
    <n-spin :show="loading" style="min-height: 200px">
      <!-- Back button -->
      <button class="back-btn" @click="router.push('/portal/invoices')">
        <n-icon :component="BackIcon" :size="18" />
        <span>Kembali ke Tagihan</span>
      </button>

      <!-- Invoice header card -->
      <div class="inv-header-card">
        <div class="inv-header-top">
          <div class="inv-badge" :class="'st-' + invoice.status">
            <n-icon :component="statusIcon(invoice.status)" :size="24" />
          </div>
          <div>
            <div class="inv-title">{{ invoice.invoice_number || '-' }}</div>
            <div class="inv-period">Periode {{ invoice.period_month }}/{{ invoice.period_year }}</div>
          </div>
          <n-tag :type="statusType(invoice.status)" size="medium" round style="margin-left: auto">
            {{ statusLabel(invoice.status) }}
          </n-tag>
        </div>

        <div class="inv-amount-hero">
          {{ formatCurrency(invoice.total_amount) }}
        </div>
      </div>

      <!-- Detail rows -->
      <div class="detail-card">
        <div class="detail-row">
          <div class="detail-icon"><n-icon :component="CalendarIcon" :size="18" /></div>
          <div class="detail-label">Jatuh Tempo</div>
          <div class="detail-value">{{ formatDate(invoice.due_date) }}</div>
        </div>
        <div class="detail-row" v-if="invoice.paid_at">
          <div class="detail-icon" style="color: #22c55e"><n-icon :component="PaidIcon" :size="18" /></div>
          <div class="detail-label">Tanggal Bayar</div>
          <div class="detail-value">{{ formatDate(invoice.paid_at) }}</div>
        </div>
        <div class="detail-row" v-if="invoice.payment_method">
          <div class="detail-icon"><n-icon :component="PaymentIcon" :size="18" /></div>
          <div class="detail-label">Metode Bayar</div>
          <div class="detail-value">{{ invoice.payment_method }}</div>
        </div>
        <div class="detail-row" v-if="invoice.notes">
          <div class="detail-icon"><n-icon :component="InvoiceIcon" :size="18" /></div>
          <div class="detail-label">Catatan</div>
          <div class="detail-value">{{ invoice.notes }}</div>
        </div>
      </div>

      <!-- Payments history -->
      <div class="payments-section" v-if="payments.length > 0">
        <h3 class="section-title">Riwayat Pembayaran</h3>
        <div class="payment-list">
          <div v-for="pay in payments" :key="pay.id" class="payment-item">
            <div class="payment-icon">
              <n-icon :component="WalletIcon" :size="18" />
            </div>
            <div class="payment-info">
              <div class="payment-method">{{ pay.payment_method || 'Pembayaran' }}</div>
              <div class="payment-date">{{ formatDate(pay.paid_at) }}</div>
            </div>
            <div class="payment-amount">{{ formatCurrency(pay.amount) }}</div>
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.invoice-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  color: var(--app-accent);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 0;
  margin-bottom: 4px;
  transition: opacity 0.2s;
}
.back-btn:hover { opacity: 0.7; }

/* Header */
.inv-header-card {
  border-radius: 16px;
  padding: 24px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
}

.inv-header-top {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.inv-badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.inv-badge.st-paid { background: rgba(34,197,94,0.1); color: #22c55e; }
.inv-badge.st-unpaid { background: rgba(245,158,11,0.1); color: #f59e0b; }
.inv-badge.st-overdue { background: rgba(239,68,68,0.1); color: #ef4444; }

.inv-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.inv-period {
  font-size: 13px;
  color: var(--app-text-muted);
  margin-top: 2px;
}

.inv-amount-hero {
  font-size: 32px;
  font-weight: 800;
  color: var(--app-text-primary);
  margin-top: 20px;
  letter-spacing: -0.5px;
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

.detail-icon {
  color: var(--app-accent);
  flex-shrink: 0;
  display: flex;
}

.detail-label {
  font-size: 13px;
  color: var(--app-text-muted);
  min-width: 120px;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text-primary);
  margin-left: auto;
}

/* Payments */
.payments-section { display: flex; flex-direction: column; gap: 10px; }

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text-primary);
  margin: 0;
}

.payment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.payment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-card-border);
}

.payment-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(34,197,94,0.1);
  color: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.payment-method {
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text-primary);
}

.payment-date {
  font-size: 12px;
  color: var(--app-text-muted);
}

.payment-amount {
  font-size: 14px;
  font-weight: 700;
  color: #22c55e;
  margin-left: auto;
}

@media (max-width: 480px) {
  .inv-amount-hero { font-size: 26px; }
  .detail-label { min-width: 100px; }
}
</style>
