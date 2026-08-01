<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  NCard, NButton, NSpace, NTag, NText, NSpin, NAlert,
  NRadioGroup, NRadioButton, useMessage
} from 'naive-ui'
import { subscriptionApi, tenantApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/theme'
import BankTransferModal from '../../components/BankTransferModal.vue'

const message = useMessage()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const loading = ref(true)
const paying = ref(false)
const plans = ref<any[]>([])
const tenantDetail = ref<any>({})
const selectedPlanId = ref('')
const duration = ref<1 | 12>(1)
const showBankTransferModal = ref(false)
const bankTransferInfo = ref<any>(null)

const expiredData = computed(() => {
  try {
    const raw = sessionStorage.getItem('sub_expired_data')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
})

const tenantInfo = computed(() => expiredData.value?.tenant || authStore.user)
const planName = computed(() => tenantInfo.value?.plan || 'Trial')
const expiresAt = computed(() => {
  const d = tenantInfo.value?.plan_expires_at
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
})

const selectedPlan = computed(() => plans.value.find(p => p.id === selectedPlanId.value))

const originalPrice = computed(() => {
  if (!selectedPlan.value) return 0
  return selectedPlan.value.price * duration.value
})

const price = computed(() => {
  if (!selectedPlan.value) return 0
  return duration.value === 12 ? Math.floor(originalPrice.value * 0.8) : originalPrice.value
})

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

async function fetchPlans() {
  loading.value = true
  try {
    const { data } = await subscriptionApi.plans()
    plans.value = (data.data || []).filter((p: any) => p.is_active && p.price > 0)
    if (plans.value.length > 0) {
      selectedPlanId.value = plans.value[0].id
    }
  } catch {
    message.error('Gagal memuat paket')
  }
  loading.value = false
}

function loadSnapScript(sandbox: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const src = sandbox
      ? 'https://app.sandbox.midtrans.com/snap/snap.js'
      : 'https://app.midtrans.com/snap/snap.js'
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const el = document.createElement('script')
    el.src = src
    const clientKey = tenantDetail.value?.pg_api_key || ''
    if (clientKey) el.setAttribute('data-client-key', clientKey)
    el.onload = () => resolve()
    el.onerror = () => reject(new Error('Gagal memuat Midtrans Snap.js'))
    document.head.appendChild(el)
  })
}

async function handlePay() {
  if (!selectedPlanId.value) {
    message.warning('Pilih paket terlebih dahulu')
    return
  }
  paying.value = true
  try {
    const { data: orderData } = await subscriptionApi.subscribe(selectedPlanId.value, duration.value)
    const orderId = orderData.data?.id
    if (!orderId) throw new Error('Gagal membuat order')

    const returnURL = window.location.origin + '/subscription'
    const { data: payData } = await subscriptionApi.createPayment(orderId, returnURL)
    const snapToken: string | undefined = payData.data?.snap_token
    const payURL: string | undefined = payData.data?.payment_url

    if (payData.data?.bank_account_number) {
      bankTransferInfo.value = payData.data
      showBankTransferModal.value = true
      paying.value = false
    } else if (snapToken) {
      const sandbox = payURL?.includes('sandbox') ?? false
      await loadSnapScript(sandbox)
      ;(window as any).snap.pay(snapToken, {
        language: 'id',
        onSuccess: () => { window.location.href = returnURL },
        onPending: () => { window.location.href = returnURL },
        onError: () => { message.error('Pembayaran gagal'); paying.value = false },
        onClose: () => { paying.value = false },
      })
    } else if (payURL) {
      window.location.href = payURL
    } else {
      throw new Error('Gagal membuat pembayaran')
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal memproses pembayaran')
    paying.value = false
  }
}

function handleLogout() {
  authStore.logout()
  window.location.href = '/login'
}

onMounted(async () => {
  await fetchPlans()
  try {
    const { data } = await tenantApi.current()
    tenantDetail.value = data?.data || data || {}
  } catch { /* non-fatal — snap.js will load without data-client-key */ }
})
</script>

<template>
  <div class="isolation-root">
    <!-- Header bar -->
    <div class="iso-header">
      <span class="iso-brand">
        <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
          <rect x="3" y="3" width="26" height="26" rx="6" stroke="#ff1744" stroke-width="1.5" fill="rgba(255,23,68,0.08)"/>
          <path d="M10 16 L16 10 L22 16 L16 22 Z" stroke="#ff1744" stroke-width="1.5" fill="rgba(255,23,68,0.1)"/>
          <circle cx="16" cy="16" r="2.5" fill="#ff1744"/>
        </svg>
        D Radius
      </span>
      <n-button text size="small" @click="handleLogout" style="color:#888">Keluar</n-button>
    </div>

    <div class="iso-body">
      <!-- SVG Illustration -->
      <div class="iso-illustration">
        <svg viewBox="0 0 200 200" width="160" height="160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Background circle -->
          <circle cx="100" cy="100" r="90" fill="rgba(255,23,68,0.06)" stroke="rgba(255,23,68,0.12)" stroke-width="1.5"/>
          <!-- Shield shape -->
          <path d="M100 30 L145 52 L145 100 C145 128 124 150 100 162 C76 150 55 128 55 100 L55 52 Z"
                fill="rgba(255,23,68,0.1)" stroke="rgba(255,23,68,0.4)" stroke-width="2" stroke-linejoin="round"/>
          <!-- Lock body -->
          <rect x="82" y="100" width="36" height="28" rx="5"
                fill="rgba(255,23,68,0.25)" stroke="#ff1744" stroke-width="2"/>
          <!-- Lock shackle -->
          <path d="M89 100 L89 90 C89 80 111 80 111 90 L111 100"
                stroke="#ff1744" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <!-- Keyhole -->
          <circle cx="100" cy="112" r="4" fill="#ff1744"/>
          <rect x="98" y="113" width="4" height="8" rx="1" fill="#ff1744"/>
          <!-- Warning lines -->
          <line x1="68" y1="52" x2="62" y2="46" stroke="rgba(255,23,68,0.3)" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="132" y1="52" x2="138" y2="46" stroke="rgba(255,23,68,0.3)" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="62" cy="46" r="3" fill="rgba(255,23,68,0.2)" stroke="rgba(255,23,68,0.4)" stroke-width="1"/>
          <circle cx="138" cy="46" r="3" fill="rgba(255,23,68,0.2)" stroke="rgba(255,23,68,0.4)" stroke-width="1"/>
        </svg>
      </div>

      <!-- Title -->
      <div class="iso-title">Langganan Berakhir</div>
      <div class="iso-subtitle">
        Akses layanan tidak tersedia karena masa langganan telah berakhir.
        Perpanjang sekarang untuk melanjutkan penggunaan.
      </div>

      <!-- Info card -->
      <div class="iso-info-card">
        <div class="iso-info-row">
          <span class="iso-info-label">ISP</span>
          <span class="iso-info-value">{{ tenantInfo?.name || '-' }}</span>
        </div>
        <div class="iso-info-row">
          <span class="iso-info-label">Paket</span>
          <n-tag type="error" size="small" round>{{ planName }}</n-tag>
        </div>
        <div class="iso-info-row">
          <span class="iso-info-label">Berakhir</span>
          <span class="iso-info-value" style="color:#ff1744;font-weight:600">{{ expiresAt }}</span>
        </div>
      </div>

      <!-- Plans -->
      <div class="iso-plans-section">
        <div class="iso-section-title">Pilih Paket Perpanjangan</div>

        <n-spin :show="loading">
          <div v-if="!loading && plans.length === 0" style="text-align:center;color:#888;padding:16px">
            Tidak ada paket tersedia. Hubungi administrator.
          </div>

          <div v-else class="iso-plans-grid">
            <div
              v-for="plan in plans"
              :key="plan.id"
              class="iso-plan-card"
              :class="{ 'iso-plan-card--selected': selectedPlanId === plan.id }"
              @click="selectedPlanId = plan.id"
            >
              <div class="iso-plan-header">
                <span class="iso-plan-name">{{ plan.name }}</span>
                <n-tag v-if="plan.is_popular" type="warning" size="tiny" round>Populer</n-tag>
              </div>

              <!-- Harga per bulan + harga tahunan jika dipilih -->
              <template v-if="duration === 1">
                <div class="iso-plan-price">
                  {{ formatRp(plan.price) }}<span class="iso-plan-unit">/bln</span>
                </div>
              </template>
              <template v-else>
                <div class="iso-plan-price-orig">
                  {{ formatRp(plan.price * 12) }}<span class="iso-plan-unit">/thn</span>
                </div>
                <div class="iso-plan-price" style="color:#22c55e">
                  {{ formatRp(Math.floor(plan.price * 12 * 0.8)) }}<span class="iso-plan-unit">/thn</span>
                </div>
                <div style="font-size:10px;color:#888;margin-bottom:2px">
                  ≈ {{ formatRp(Math.floor(plan.price * 12 * 0.8 / 12)) }}/bln
                </div>
              </template>

              <div class="iso-plan-limit">
                {{ plan.max_customers > 0 ? `Maks. ${plan.max_customers} pelanggan` : 'Pelanggan tak terbatas' }}
              </div>
              <ul v-if="plan.features?.length" class="iso-plan-features">
                <li v-for="f in plan.features.slice(0, 3)" :key="f">{{ f }}</li>
              </ul>
            </div>
          </div>

          <!-- Duration selector -->
          <div v-if="plans.length > 0" class="iso-duration">
            <n-radio-group v-model:value="duration" size="medium">
              <n-radio-button :value="1">Bulanan</n-radio-button>
              <n-radio-button :value="12">
                Tahunan <span class="iso-discount">Hemat 20%</span>
              </n-radio-button>
            </n-radio-group>
          </div>

          <!-- Price summary & Pay button -->
          <div v-if="selectedPlan" class="iso-pay-section">
            <div class="iso-pay-summary">
              <div>
                <div style="font-size:14px">{{ selectedPlan.name }} · {{ duration === 12 ? '12 bulan' : '1 bulan' }}</div>
                <div v-if="duration === 12" style="font-size:11px;color:#888;text-decoration:line-through">
                  {{ formatRp(originalPrice) }}
                </div>
              </div>
              <div>
                <span v-if="duration === 12" class="iso-discount-badge">-20%</span>
                <span class="iso-pay-total">{{ formatRp(price) }}</span>
              </div>
            </div>
            <n-button
              type="primary"
              size="large"
              :loading="paying"
              :disabled="loading"
              @click="handlePay"
              style="width:100%;background:#ff1744;border-color:#ff1744;border-radius:10px;font-size:15px;height:48px"
            >
              Bayar Sekarang
            </n-button>
            <div class="iso-pay-note">
              Transfer bank dengan kode unik untuk verifikasi otomatis lebih cepat
            </div>
          </div>
        </n-spin>
      </div>
    </div>

    <BankTransferModal v-model:show="showBankTransferModal" :info="bankTransferInfo" />
  </div>
</template>

<style scoped>
.isolation-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--iso-bg, #f8f9fc);
}

html.dark .isolation-root { --iso-bg: #0f0f13; }

.iso-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(8px);
}
html.dark .iso-header {
  border-bottom-color: rgba(255,255,255,0.06);
  background: rgba(15,15,19,0.85);
}

.iso-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  color: #1a1a2e;
}
html.dark .iso-brand { color: #f0f0f0; }

.iso-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

.iso-illustration { margin-bottom: 24px; }

.iso-title {
  font-size: 26px;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 8px;
  text-align: center;
}
html.dark .iso-title { color: #f0f0f0; }

.iso-subtitle {
  font-size: 14px;
  color: #888;
  text-align: center;
  max-width: 420px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.iso-info-card {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 28px;
  border: 1px solid rgba(255,23,68,0.1);
  box-shadow: 0 2px 12px rgba(255,23,68,0.06);
}
html.dark .iso-info-card {
  background: #1a1a24;
  border-color: rgba(255,23,68,0.15);
}

.iso-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}
.iso-info-row + .iso-info-row { border-top: 1px solid rgba(0,0,0,0.05); }
html.dark .iso-info-row + .iso-info-row { border-top-color: rgba(255,255,255,0.05); }

.iso-info-label { font-size: 13px; color: #888; }
.iso-info-value { font-size: 13px; font-weight: 600; color: #1a1a2e; }
html.dark .iso-info-value { color: #e0e0e0; }

.iso-plans-section { width: 100%; }

.iso-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #444;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
html.dark .iso-section-title { color: #aaa; }

.iso-plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.iso-plan-card {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.iso-plan-card:hover { border-color: rgba(255,23,68,0.4); }
.iso-plan-card--selected {
  border-color: #ff1744;
  box-shadow: 0 0 0 3px rgba(255,23,68,0.1);
}
html.dark .iso-plan-card { background: #1a1a24; border-color: #2a2a38; }
html.dark .iso-plan-card:hover { border-color: rgba(255,23,68,0.4); }
html.dark .iso-plan-card--selected { border-color: #ff1744; }

.iso-plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.iso-plan-name { font-weight: 700; font-size: 14px; color: #1a1a2e; }
html.dark .iso-plan-name { color: #f0f0f0; }

.iso-plan-price { font-size: 18px; font-weight: 800; color: #ff1744; margin-bottom: 4px; }
.iso-plan-price-orig { font-size: 12px; color: #aaa; text-decoration: line-through; margin-bottom: 2px; }
.iso-plan-unit { font-size: 12px; font-weight: 400; color: #888; }

.iso-plan-limit { font-size: 11px; color: #888; margin-bottom: 8px; }

.iso-plan-features {
  list-style: none;
  padding: 0; margin: 0;
  font-size: 11px;
  color: #666;
}
html.dark .iso-plan-features { color: #aaa; }
.iso-plan-features li::before { content: "✓ "; color: #22c55e; }

.iso-duration {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}
.iso-discount {
  font-size: 10px;
  color: #22c55e;
  font-weight: 600;
  margin-left: 4px;
}

.iso-pay-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}
html.dark .iso-pay-section { background: #1a1a24; border-color: #2a2a38; }

.iso-pay-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}
html.dark .iso-pay-summary { color: #aaa; }
.iso-pay-total { font-size: 20px; font-weight: 800; color: #1a1a2e; }
html.dark .iso-pay-total { color: #f0f0f0; }
.iso-discount-badge {
  display: inline-block; background: #22c55e; color: #fff;
  font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 6px;
  margin-right: 6px; vertical-align: middle;
}

.iso-pay-note {
  text-align: center;
  font-size: 11px;
  color: #aaa;
  margin-top: 10px;
}
</style>
