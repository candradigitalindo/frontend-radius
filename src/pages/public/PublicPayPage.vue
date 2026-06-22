<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { publicPayApi } from '../../api/services/publicPay'

const route = useRoute()
const tenantId = route.params.tenantId as string
const customerCode = route.params.customerCode as string

const loading = ref(true)
const notFound = ref(false)
const errorMsg = ref('')
const customer = ref<any>(null)
const invoices = ref<any[]>([])

// Pay modal
const showPay = ref(false)
const paying = ref(false)
const selectedInvoice = ref<any>(null)
const payMethod = ref('qris')
const payMethodOptions = [
  { label: 'QRIS', value: 'qris' },
  { label: 'Transfer Bank (VA)', value: 'bank_transfer' },
  { label: 'GoPay', value: 'gopay' },
  { label: 'OVO', value: 'ovo' },
  { label: 'Dana', value: 'dana' },
  { label: 'ShopeePay', value: 'shopeepay' },
]

const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const totalUnpaid = computed(() =>
  invoices.value.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
)

// Online payment only when the tenant's gateway is live (configured + production).
const payActive = computed(() => !!customer.value?.online_payment_active)

function rp(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}
function periodLabel(inv: any) {
  return `${monthNames[inv.period_month] || ''} ${inv.period_year}`.trim()
}
function dueLabel(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function load() {
  loading.value = true
  notFound.value = false
  errorMsg.value = ''
  try {
    const { data: res } = await publicPayApi.info(tenantId, customerCode)
    customer.value = res.data?.customer || null
    invoices.value = res.data?.invoices || []
  } catch (e: any) {
    if (e?.response?.status === 404) notFound.value = true
    else errorMsg.value = e?.response?.data?.message || 'Gagal memuat data. Coba lagi nanti.'
  }
  loading.value = false
}

function openPay(inv: any) {
  selectedInvoice.value = inv
  payMethod.value = 'qris'
  showPay.value = true
}

async function submitPay() {
  if (!selectedInvoice.value) return
  paying.value = true
  try {
    const { data: res } = await publicPayApi.create(tenantId, customerCode, {
      invoice_id: selectedInvoice.value.invoice_id,
      payment_method: payMethod.value,
      customer_name: customer.value?.name,
      customer_phone: customer.value?.phone,
      return_url: window.location.href,
    })
    const d = res.data || {}
    const url = d.payment_url || d.checkout_url || d.redirect_url
    if (url) {
      // Same-tab redirect — most reliable inside the WhatsApp in-app browser.
      window.location.href = url
    } else {
      errorMsg.value = 'Link pembayaran tidak tersedia. Hubungi admin Anda.'
      showPay.value = false
    }
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || 'Gagal membuat pembayaran. Coba lagi.'
    showPay.value = false
  }
  paying.value = false
}

onMounted(load)
</script>

<template>
  <div class="pp-wrap">
    <div class="pp-card">
      <!-- Header -->
      <div class="pp-head">
        <div class="pp-logo">D</div>
        <div class="pp-head-text">
          <div class="pp-title">Pembayaran Tagihan</div>
          <div class="pp-sub">Bayar tagihan internet Anda dengan mudah</div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="pp-state">
        <div class="pp-spinner" />
        <span>Memuat tagihan...</span>
      </div>

      <!-- Not found -->
      <div v-else-if="notFound" class="pp-state">
        <div class="pp-emoji">🔍</div>
        <div class="pp-state-title">Pelanggan tidak ditemukan</div>
        <div class="pp-state-desc">Periksa kembali tautan dari pesan WhatsApp Anda.</div>
      </div>

      <!-- Loaded -->
      <template v-else>
        <div class="pp-cust">
          <div class="pp-cust-name">{{ customer?.name || '-' }}</div>
          <div class="pp-cust-meta">
            <span>{{ customer?.customer_code }}</span>
            <span v-if="customer?.package_name">· {{ customer.package_name }}</span>
          </div>
        </div>

        <div v-if="errorMsg" class="pp-alert">{{ errorMsg }}</div>

        <!-- No unpaid -->
        <div v-if="!invoices.length" class="pp-state">
          <div class="pp-emoji">🎉</div>
          <div class="pp-state-title">Tidak ada tagihan</div>
          <div class="pp-state-desc">Semua tagihan Anda sudah lunas. Terima kasih!</div>
        </div>

        <!-- Invoice list -->
        <template v-else>
          <div class="pp-total">
            <span>Total Tertunggak</span>
            <strong>{{ rp(totalUnpaid) }}</strong>
          </div>

          <div v-if="!payActive" class="pp-notice">
            💬 Pembayaran online belum tersedia. Silakan hubungi admin untuk konfirmasi metode pembayaran.
          </div>

          <div class="pp-list">
            <div v-for="inv in invoices" :key="inv.invoice_id" class="pp-inv">
              <div class="pp-inv-info">
                <div class="pp-inv-period">{{ periodLabel(inv) }}</div>
                <div class="pp-inv-num">{{ inv.invoice_number }}</div>
                <div class="pp-inv-due">Jatuh tempo {{ dueLabel(inv.due_date) }}</div>
              </div>
              <div class="pp-inv-right">
                <div class="pp-inv-amt">{{ rp(inv.total_amount) }}</div>
                <button v-if="payActive" class="pp-pay-btn" @click="openPay(inv)">Bayar</button>
              </div>
            </div>
          </div>
        </template>
      </template>

      <div class="pp-foot">Dilindungi gateway pembayaran resmi · D Radius</div>
    </div>

    <!-- Pay method modal -->
    <div v-if="showPay" class="pp-modal-bg" @click.self="!paying && (showPay = false)">
      <div class="pp-modal">
        <div class="pp-modal-sum">
          <div class="pp-modal-label">Total Bayar</div>
          <div class="pp-modal-amt">{{ rp(selectedInvoice?.total_amount) }}</div>
          <div class="pp-modal-num">{{ selectedInvoice?.invoice_number }}</div>
        </div>

        <div class="pp-modal-label2">Pilih Metode Pembayaran</div>
        <div class="pp-methods">
          <button
            v-for="opt in payMethodOptions"
            :key="opt.value"
            class="pp-method"
            :class="{ active: payMethod === opt.value }"
            @click="payMethod = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <div class="pp-modal-note">Anda akan diarahkan ke halaman pembayaran. Status tagihan diperbarui otomatis setelah lunas.</div>

        <div class="pp-modal-actions">
          <button class="pp-btn-cancel" :disabled="paying" @click="showPay = false">Batal</button>
          <button class="pp-btn-pay" :disabled="paying" @click="submitPay">
            {{ paying ? 'Memproses...' : 'Lanjut Bayar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pp-wrap {
  min-height: 100vh;
  background: linear-gradient(160deg, #eef2ff 0%, #f8fafc 45%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 14px 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1e293b;
}
.pp-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 10px 40px rgba(30, 41, 59, 0.1);
  padding: 22px 20px 16px;
}

.pp-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.pp-logo {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-weight: 800; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
}
.pp-title { font-size: 17px; font-weight: 700; }
.pp-sub { font-size: 12.5px; color: #64748b; margin-top: 1px; }

.pp-state { text-align: center; padding: 40px 10px; color: #64748b; }
.pp-emoji { font-size: 44px; margin-bottom: 10px; }
.pp-state-title { font-size: 16px; font-weight: 700; color: #334155; }
.pp-state-desc { font-size: 13px; margin-top: 4px; }
.pp-spinner {
  width: 34px; height: 34px; margin: 0 auto 12px;
  border: 3px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%;
  animation: ppspin 0.8s linear infinite;
}
@keyframes ppspin { to { transform: rotate(360deg); } }

.pp-cust {
  background: #f1f5f9; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;
}
.pp-cust-name { font-size: 15px; font-weight: 700; }
.pp-cust-meta { font-size: 12.5px; color: #64748b; margin-top: 2px; display: flex; gap: 5px; flex-wrap: wrap; }

.pp-alert {
  background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
  font-size: 13px; padding: 10px 12px; border-radius: 10px; margin-bottom: 14px;
}
.pp-notice {
  background: #fffbeb; border: 1px solid #fde68a; color: #92400e;
  font-size: 12.5px; padding: 11px 13px; border-radius: 10px; margin-bottom: 12px; line-height: 1.5;
}

.pp-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; border-radius: 12px; margin-bottom: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
}
.pp-total span { font-size: 13px; opacity: 0.9; }
.pp-total strong { font-size: 18px; font-weight: 800; }

.pp-list { display: flex; flex-direction: column; gap: 10px; }
.pp-inv {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;
}
.pp-inv-period { font-size: 14px; font-weight: 700; }
.pp-inv-num { font-size: 12px; color: #64748b; margin-top: 1px; font-family: monospace; }
.pp-inv-due { font-size: 11.5px; color: #94a3b8; margin-top: 3px; }
.pp-inv-right { text-align: right; flex-shrink: 0; }
.pp-inv-amt { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.pp-pay-btn {
  border: none; border-radius: 8px; padding: 7px 18px; cursor: pointer;
  background: #6366f1; color: #fff; font-size: 13px; font-weight: 700;
  transition: background 0.15s;
}
.pp-pay-btn:hover { background: #4f46e5; }

.pp-foot { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 18px; }

/* Modal */
.pp-modal-bg {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(15, 23, 42, 0.5);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0;
}
.pp-modal {
  width: 100%; max-width: 460px;
  background: #fff; border-radius: 18px 18px 0 0;
  padding: 20px;
  animation: ppslide 0.2s ease;
}
@keyframes ppslide { from { transform: translateY(30px); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
.pp-modal-sum { text-align: center; margin-bottom: 16px; }
.pp-modal-label { font-size: 12px; color: #64748b; }
.pp-modal-amt { font-size: 26px; font-weight: 800; color: #4f46e5; margin: 2px 0; }
.pp-modal-num { font-size: 12px; color: #94a3b8; font-family: monospace; }
.pp-modal-label2 { font-size: 13px; font-weight: 700; margin-bottom: 10px; }
.pp-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pp-method {
  border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 6px; cursor: pointer;
  background: #fff; font-size: 12px; font-weight: 600; color: #475569; transition: all 0.15s;
}
.pp-method.active { border-color: #6366f1; background: #eef2ff; color: #4f46e5; }
.pp-modal-note { font-size: 11.5px; color: #94a3b8; margin: 14px 0; line-height: 1.5; }
.pp-modal-actions { display: flex; gap: 10px; }
.pp-btn-cancel, .pp-btn-pay {
  flex: 1; border: none; border-radius: 10px; padding: 13px; cursor: pointer;
  font-size: 14px; font-weight: 700;
}
.pp-btn-cancel { background: #f1f5f9; color: #475569; }
.pp-btn-pay { background: #6366f1; color: #fff; }
.pp-btn-pay:disabled, .pp-btn-cancel:disabled { opacity: 0.6; cursor: default; }

@media (min-width: 520px) {
  .pp-modal-bg { align-items: center; padding: 16px; }
  .pp-modal { border-radius: 18px; }
}
</style>
