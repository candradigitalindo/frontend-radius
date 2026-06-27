<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NTag, NSpin, NEmpty, useMessage } from 'naive-ui'
import {
  ReceiptOutline as InvoiceIcon,
  CheckmarkCircleOutline as PaidIcon,
  TimeOutline as UnpaidIcon,
  AlertCircleOutline as OverdueIcon,
  ArrowForwardOutline as ArrowIcon,
  CardOutline as PayIcon,
  OpenOutline as OpenIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'

const router = useRouter()
const message = useMessage()
const loading = ref(true)
const data = ref<any[]>([])
const activeFilter = ref<string>('all')
const gatewayAvailable = ref(false)
const payingId = ref<string | null>(null)

const filters = [
  { key: 'all', label: 'Semua' },
  { key: 'unpaid', label: 'Belum Bayar' },
  { key: 'overdue', label: 'Lewat Tempo' },
  { key: 'paid', label: 'Lunas' },
]

onMounted(async () => {
  try {
    const [invRes, cfgRes] = await Promise.all([
      portalApi.invoices(),
      portalApi.paymentConfig(),
    ])
    data.value = invRes.data.data || []
    gatewayAvailable.value = cfgRes.data.data?.available === true
  } catch { /* ignore */ }
  loading.value = false
})

const filteredData = computed(() => {
  if (activeFilter.value === 'all') return data.value
  return data.value.filter((i: any) => i.status === activeFilter.value)
})

const summary = computed(() => ({
  total: data.value.length,
  unpaid: data.value.filter((i: any) => i.status === 'unpaid').length,
  overdue: data.value.filter((i: any) => i.status === 'overdue').length,
  paid: data.value.filter((i: any) => i.status === 'paid').length,
  totalUnpaid: data.value
    .filter((i: any) => i.status === 'unpaid' || i.status === 'overdue')
    .reduce((s: number, i: any) => s + (i.total_amount || 0), 0),
}))

function formatCurrency(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
}

function statusIcon(s: string) {
  const m: Record<string, any> = { paid: PaidIcon, overdue: OverdueIcon, unpaid: UnpaidIcon }
  return m[s] || InvoiceIcon
}

function statusType(s: string): 'success' | 'warning' | 'error' | 'info' {
  const m: Record<string, any> = { paid: 'success', overdue: 'error', unpaid: 'warning' }
  return m[s] || 'info'
}

function statusLabel(s: string) {
  const m: Record<string, string> = { paid: 'Lunas', overdue: 'Lewat Tempo', unpaid: 'Belum Bayar' }
  return m[s] || s
}

function canPayOnline(inv: any) {
  return gatewayAvailable.value && (inv.status === 'unpaid' || inv.status === 'overdue')
}

async function quickPay(e: Event, inv: any) {
  e.stopPropagation()
  payingId.value = inv.id
  try {
    const returnUrl = window.location.href
    const { data: res } = await portalApi.payInvoiceGateway(inv.id, {
      payment_method: 'qris',
      return_url: returnUrl,
    })
    const payData = res.data
    const url = payData?.checkout_url || payData?.payment_url || payData?.redirect_url
    if (url) {
      window.open(url, '_blank')
    } else {
      message.success('Pembayaran diproses')
    }
  } catch (err: any) {
    message.error(err?.response?.data?.error || 'Gagal membuat link pembayaran')
  }
  payingId.value = null
}
</script>

<template>
  <div class="invoices-page">
    <n-spin :show="loading" style="min-height: 200px">

      <!-- Summary bar -->
      <div class="summary-bar" v-if="summary.totalUnpaid > 0">
        <div class="summary-icon">
          <n-icon :component="UnpaidIcon" :size="20" />
        </div>
        <div class="summary-text">
          <span class="summary-label">Total tunggakan Anda</span>
          <span class="summary-amount">{{ formatCurrency(summary.totalUnpaid) }}</span>
        </div>
        <div v-if="gatewayAvailable" class="summary-online-badge">
          <n-icon :component="PayIcon" :size="13" />
          Bayar Online Tersedia
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="filter-row">
        <button
          v-for="f in filters" :key="f.key"
          class="filter-btn" :class="{ active: activeFilter === f.key }"
          @click="activeFilter = f.key"
        >
          {{ f.label }}
          <span class="filter-count" v-if="f.key === 'unpaid' && summary.unpaid > 0">{{ summary.unpaid }}</span>
          <span class="filter-count overdue" v-if="f.key === 'overdue' && summary.overdue > 0">{{ summary.overdue }}</span>
        </button>
      </div>

      <!-- Invoice list -->
      <div class="inv-list" v-if="filteredData.length > 0">
        <div
          v-for="inv in filteredData" :key="inv.id"
          class="inv-card"
          @click="router.push(`/portal/invoices/${inv.id}`)"
        >
          <div class="inv-card-left">
            <div class="inv-status-icon" :class="'st-' + inv.status">
              <n-icon :component="statusIcon(inv.status)" :size="20" />
            </div>
            <div class="inv-card-info">
              <div class="inv-card-number">{{ inv.invoice_number || '#' + inv.id?.slice(0, 8) }}</div>
              <div class="inv-card-period">Periode {{ inv.period_month || '-' }}/{{ inv.period_year || '-' }}</div>
              <div class="inv-card-due">Jatuh tempo {{ formatDate(inv.due_date) }}</div>
            </div>
          </div>
          <div class="inv-card-right">
            <div class="inv-card-amount">{{ formatCurrency(inv.total_amount) }}</div>
            <n-tag :type="statusType(inv.status)" size="small" round>{{ statusLabel(inv.status) }}</n-tag>
            <!-- Tombol bayar online: hanya jika gateway aktif & produksi & belum lunas -->
            <button
              v-if="canPayOnline(inv)"
              class="quick-pay-btn"
              :disabled="payingId === inv.id"
              @click="quickPay($event, inv)"
            >
              <n-icon :component="OpenIcon" :size="13" />
              {{ payingId === inv.id ? '...' : 'Bayar' }}
            </button>
            <n-icon v-else :component="ArrowIcon" :size="14" class="inv-card-arrow" />
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-box">
        <n-empty description="Tidak ada tagihan ditemukan" />
      </div>

    </n-spin>
  </div>
</template>

<style scoped>
.invoices-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Summary */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  flex-wrap: wrap;
}

.summary-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 13px;
  opacity: .6;
}

.summary-amount {
  font-size: 20px;
  font-weight: 800;
  color: #ef4444;
}

.summary-online-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(34,197,94,.1);
  color: #22c55e;
  border: 1px solid rgba(34,197,94,.2);
  flex-shrink: 0;
}

/* Filters */
.filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--app-card-border);
  border-radius: 20px;
  background: transparent;
  color: var(--app-text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}

.filter-btn:hover { background: var(--app-accent-soft); }

.filter-btn.active {
  background: var(--app-accent-medium);
  color: var(--app-accent);
  border-color: var(--app-accent);
}

.filter-count {
  background: #f59e0b;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  line-height: 1.4;
}

.filter-count.overdue { background: #ef4444; }

/* Invoice list */
.inv-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inv-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: var(--glass-radius-sm);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.22,1,0.36,1), border-color 0.2s;
}

.inv-card:hover {
  border-color: var(--glass-border-strong);
  transform: translateY(-2px);
}

.inv-card-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.inv-status-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.st-paid { background: rgba(34,197,94,0.1); color: #22c55e; }
.st-unpaid { background: rgba(245,158,11,0.1); color: #f59e0b; }
.st-overdue { background: rgba(239,68,68,0.1); color: #ef4444; }

.inv-card-info {
  min-width: 0;
}

.inv-card-number {
  font-size: 14px;
  font-weight: 600;
}

.inv-card-period {
  font-size: 12px;
  opacity: .5;
  margin-top: 2px;
}

.inv-card-due {
  font-size: 12px;
  opacity: .5;
}

.inv-card-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.inv-card-amount {
  font-size: 15px;
  font-weight: 700;
}

.inv-card-arrow {
  opacity: 0.3;
}

/* Quick pay button */
.quick-pay-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .2s;
  white-space: nowrap;
}

.quick-pay-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.quick-pay-btn:not(:disabled):hover {
  opacity: .9;
}

.empty-box { padding: 40px 0; }

@media (max-width: 480px) {
  .inv-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .inv-card-right {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    width: 100%;
    justify-content: space-between;
  }
}
</style>
