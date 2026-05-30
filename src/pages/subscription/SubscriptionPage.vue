<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  NButton, NIcon, NTabs, NTabPane,
  NSpin, NEmpty, useMessage, useDialog,
} from 'naive-ui'
import {
  CircleCheck, AlertCircle, Package, LayoutGrid, Star,
  Check, User, Bolt, ChartBar, Stack2, Briefcase, Users,
  FileText, Calendar, Clock, CreditCard, Hash, AlignLeft, ExternalLink,
} from '@vicons/tabler'
import { subscriptionApi, tenantApi } from '../../api'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()
const loading = ref(true)
const subscribing = ref(false)
const paying = ref<string | null>(null)
const billingCycle = ref<'monthly' | 'yearly'>('monthly')
const plans = ref<any[]>([])
const orders = ref<any[]>([])
const tenant = ref<any>({})
const activeTab = ref('plans')

function normalizePlanSlug(plan: string | undefined | null): string {
  if (!plan) return ''
  const lower = plan.toLowerCase().trim()
  if (lower === 'free') return 'gratis'
  return lower
}

const currentPlan = computed(() => {
  const slug = normalizePlanSlug(tenant.value.plan)
  if (!slug) return null
  return plans.value.find((p: any) => p.slug === slug) || null
})

const isFreePlan = computed(() => normalizePlanSlug(tenant.value.plan) === 'gratis')

const isExpired = computed(() => {
  if (!tenant.value.plan) return true
  if (isFreePlan.value) return false
  if (!tenant.value.plan_expires_at) return true
  return new Date(tenant.value.plan_expires_at) < new Date()
})

const planExpiresFormatted = computed(() => {
  if (!tenant.value.plan_expires_at) return '-'
  return new Date(tenant.value.plan_expires_at).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})

function formatRupiah(n: number) {
  if (n === 0) return 'Gratis'
  return 'Rp ' + n.toLocaleString('id-ID')
}

function originalYearlyPrice(plan: any) {
  return (plan.price * 12).toLocaleString('id-ID')
}

function discountedYearlyPrice(plan: any) {
  return Math.floor(plan.price * 12 * 80 / 100).toLocaleString('id-ID')
}

function monthlyEquivalent(plan: any) {
  if (plan.price === 0) return ''
  const yearly = Math.floor(plan.price * 12 * 80 / 100)
  const monthly = Math.floor(yearly / 12)
  return 'Rp ' + monthly.toLocaleString('id-ID') + '/bulan'
}

function limitLabel(n: number) {
  return n < 0 || n >= 99999 ? 'Unlimited' : n.toLocaleString('id-ID')
}

function isCurrent(plan: any) {
  return normalizePlanSlug(tenant.value.plan) === plan.slug && !isExpired.value
}

async function fetchData() {
  loading.value = true
  try {
     const [plansRes, tenantRes, ordersRes] = await Promise.all([
       subscriptionApi.plans(),
       tenantApi.current(),
       subscriptionApi.orders({ per_page: 50 }),
     ])
    plans.value = plansRes.data?.data || []
    tenant.value = tenantRes.data?.data || tenantRes.data || {}
    orders.value = ordersRes.data?.data || []
  } catch {
    message.error('Gagal memuat data langganan')
  } finally {
    loading.value = false
  }
}

async function handleSubscribe(plan: any) {
  if (isCurrent(plan)) {
    message.info('Anda sudah menggunakan paket ini')
    return
  }

  const action = plan.price === 0 ? 'mengaktifkan' : 'berlangganan'
  const duration = billingCycle.value === 'yearly' ? 12 : 1
  const periodLabel = duration === 12 ? ' (Tahunan, diskon 20%)' : ''
  dialog.warning({
    title: 'Konfirmasi',
    content: `${action === 'mengaktifkan' ? 'Aktifkan' : 'Berlangganan'} paket ${plan.name}${periodLabel}?`,
    positiveText: 'Ya, Lanjutkan',
    negativeText: 'Batal',
    onPositiveClick: async () => {
      subscribing.value = true
      try {
        const res = await subscriptionApi.subscribe(plan.id, plan.price === 0 ? 1 : duration)
        const order = res.data?.data
        message.success(plan.price === 0 ? 'Paket berhasil diaktifkan!' : 'Order berhasil dibuat!')
        await authStore.fetchUser()
        await fetchData()
        if (plan.price > 0) {
          activeTab.value = 'orders'
          // Auto-create payment
          if (order?.id) {
            await handlePay(order.id)
          }
        }
      } catch (err: any) {
        message.error(err.response?.data?.error || 'Gagal membuat order')
      } finally {
        subscribing.value = false
      }
    },
  })
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Menunggu Pembayaran' },
  paid: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', label: 'Lunas' },
  expired: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Kedaluwarsa' },
  cancelled: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', label: 'Dibatalkan' },
}

function getStatus(status: string) {
  return statusConfig[status] || { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', label: status }
}

async function handlePay(orderId: string) {
  paying.value = orderId
  try {
    const res = await subscriptionApi.createPayment(orderId, window.location.href)
    const paymentURL = res.data?.data?.payment_url
    if (paymentURL) {
      window.open(paymentURL, '_blank')
      await fetchData()
    } else {
      message.warning('Gagal mendapatkan link pembayaran')
    }
  } catch (err: any) {
    message.error(err.response?.data?.error || 'Gagal membuat pembayaran')
  } finally {
    paying.value = null
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit yang lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam yang lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari yang lalu`
  return formatDate(d)
}

onMounted(fetchData)
</script>

<template>
  <n-spin :show="loading" style="min-height: 400px">

    <!-- ── Current Plan Banner ────────────────────── -->
    <div v-if="!loading" class="sub-banner" :class="!tenant.plan ? 'warn' : isExpired ? 'expired' : 'active'">
      <div class="sb-icon">
        <n-icon :size="20"><CircleCheck v-if="!isExpired && tenant.plan" /><AlertCircle v-else-if="isExpired" /><Package v-else /></n-icon>
      </div>
      <div class="sb-body">
        <div class="sb-title">{{ !tenant.plan ? 'Belum Ada Paket' : isExpired ? 'Langganan Berakhir' : 'Paket Aktif' }}</div>
        <div class="sb-sub">
          <template v-if="tenant.plan">
            <strong class="sb-plan-name">{{ currentPlan?.name || tenant.plan }}</strong>
            <span v-if="isFreePlan"> — tidak ada batas waktu</span>
            <span v-else-if="!isExpired"> — berlaku hingga {{ planExpiresFormatted }}</span>
            <span v-else> — berakhir {{ planExpiresFormatted }}</span>
          </template>
          <template v-else>Pilih paket di bawah untuk mulai menggunakan layanan.</template>
        </div>
      </div>
      <span class="sb-badge" :class="!tenant.plan ? 'warn' : isExpired ? 'expired' : 'active'">
        {{ !tenant.plan ? 'Tidak Aktif' : isExpired ? 'Expired' : 'Aktif' }}
      </span>
    </div>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- ── Plans Tab ──────────────────────────── -->
      <n-tab-pane name="plans">
        <template #tab>
          <div class="tab-label"><n-icon :size="15"><LayoutGrid /></n-icon>Pilihan Paket</div>
        </template>

        <!-- Billing toggle -->
        <div class="billing-row">
          <span class="toggle-opt" :class="{ on: billingCycle === 'monthly' }" @click="billingCycle = 'monthly'">Bulanan</span>
          <div class="toggle-track" :class="{ yearly: billingCycle === 'yearly' }" @click="billingCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly'">
            <div class="toggle-knob" />
          </div>
          <span class="toggle-opt" :class="{ on: billingCycle === 'yearly' }" @click="billingCycle = 'yearly'">Tahunan</span>
          <span v-if="billingCycle === 'yearly'" class="save-badge">Hemat 20%</span>
        </div>

        <!-- Plan cards -->
        <div class="plans-grid">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="plan-card"
            :class="{ popular: plan.is_popular, current: isCurrent(plan) }"
            :style="{ '--pc': plan.is_popular ? '#3b82f6' : isCurrent(plan) ? '#22c55e' : 'transparent' }"
          >
            <!-- Top badge -->
            <div v-if="plan.is_popular || isCurrent(plan)" class="pc-badge" :class="{ popular: plan.is_popular, current: isCurrent(plan) }">
              <n-icon :size="11"><Star v-if="plan.is_popular" /><Check v-else /></n-icon>
              {{ plan.is_popular ? 'Populer' : 'Saat Ini' }}
            </div>

            <!-- accent bar -->
            <div class="pc-accent" />

            <!-- Header -->
            <div class="pc-header">
              <div class="pc-icon" :class="{ 'pc-icon-popular': plan.is_popular, 'pc-icon-current': isCurrent(plan) }">
                <n-icon :size="20">
                  <User v-if="plan.price === 0" />
                  <Bolt v-else-if="plan.slug === 'starter'" />
                  <ChartBar v-else-if="plan.slug === 'growth'" />
                  <Stack2 v-else-if="plan.slug === 'professional'" />
                  <Briefcase v-else />
                </n-icon>
              </div>
              <div class="pc-name">{{ plan.name }}</div>
              <div v-if="plan.description" class="pc-desc">{{ plan.description }}</div>
            </div>

            <!-- Price -->
            <div class="pc-price">
              <template v-if="billingCycle === 'monthly' || plan.price === 0">
                <span class="pc-amount">{{ formatRupiah(plan.price) }}</span>
                <span v-if="plan.price > 0" class="pc-period">/bln</span>
              </template>
              <template v-else>
                <span class="pc-orig">Rp {{ originalYearlyPrice(plan) }}/thn</span>
                <div class="pc-yearly-row">
                  <span class="pc-amount">Rp {{ discountedYearlyPrice(plan) }}</span>
                  <span class="pc-period">/thn</span>
                </div>
                <span class="pc-equiv">≈ {{ monthlyEquivalent(plan) }}</span>
              </template>
            </div>

            <!-- Max customers chip -->
            <div class="pc-limit">
              <n-icon :size="13"><Users /></n-icon>
              <span><strong>{{ limitLabel(plan.max_customers) }}</strong> Pelanggan</span>
            </div>

            <!-- Features -->
            <ul class="pc-features">
              <li v-for="(feat, i) in plan.features" :key="i">
                <n-icon :size="13" style="color:#22c55e;flex-shrink:0"><Check /></n-icon>
                {{ feat }}
              </li>
            </ul>

            <!-- Action -->
            <div class="pc-action">
              <n-button v-if="isCurrent(plan)" type="success" block disabled ghost style="border-radius:8px">
                Paket Saat Ini
              </n-button>
              <n-button
                v-else
                :type="plan.is_popular ? 'primary' : 'default'"
                block
                :loading="subscribing"
                style="border-radius:8px"
                @click="handleSubscribe(plan)"
              >
                {{ plan.price === 0 ? 'Aktifkan Gratis' : 'Berlangganan' }}
              </n-button>
            </div>
          </div>
        </div>
      </n-tab-pane>

      <!-- ── Orders Tab ─────────────────────────── -->
      <n-tab-pane name="orders">
        <template #tab>
          <div class="tab-label">
            <n-icon :size="15"><FileText /></n-icon>
            Riwayat Order
            <span v-if="orders.filter(o => o.status === 'pending').length" class="tab-badge">
              {{ orders.filter(o => o.status === 'pending').length }}
            </span>
          </div>
        </template>

        <!-- Orders summary chips -->
        <div v-if="orders.length" class="orders-stats">
          <div class="os-chip" v-for="s in ['paid','pending','expired','cancelled']" :key="s">
            <span class="os-dot" :style="{ background: getStatus(s).color }" />
            <span class="os-num" :style="{ color: getStatus(s).color }">{{ orders.filter(o => o.status === s).length }}</span>
            <span class="os-lbl">{{ getStatus(s).label }}</span>
          </div>
        </div>

        <!-- Orders list -->
        <div v-if="orders.length" class="orders-list">
          <div v-for="order in orders" :key="order.id" class="order-card">
            <div class="oc-stripe" :style="{ background: getStatus(order.status).color }" />
            <div class="oc-body">
              <!-- Top -->
              <div class="oc-top">
                <div class="oc-left">
                  <span class="oc-plan">{{ order.plan_name }}</span>
                  <span v-if="order.duration_months" class="oc-dur">{{ order.duration_months }} bulan</span>
                </div>
                <div class="oc-status" :style="{ color: getStatus(order.status).color, background: getStatus(order.status).bg }">
                  <span class="oc-dot" :style="{ background: getStatus(order.status).color }" />
                  {{ getStatus(order.status).label }}
                </div>
              </div>

              <!-- Amount + time -->
              <div class="oc-amount-row">
                <span class="oc-amount">{{ formatRupiah(order.amount) }}</span>
                <span class="oc-time">{{ relativeTime(order.created_at) }}</span>
              </div>

              <!-- Details grid -->
              <div class="oc-details">
                <div class="oc-detail">
                  <n-icon :size="13"><Calendar /></n-icon>
                  <span class="od-lbl">Dibuat</span>
                  <span class="od-val">{{ formatDateTime(order.created_at) }}</span>
                </div>
                <div v-if="order.starts_at" class="oc-detail">
                  <n-icon :size="13"><Clock /></n-icon>
                  <span class="od-lbl">Berlaku</span>
                  <span class="od-val">{{ formatDate(order.starts_at) }} — {{ formatDate(order.expires_at) }}</span>
                </div>
                <div v-if="order.payment_method" class="oc-detail">
                  <n-icon :size="13"><CreditCard /></n-icon>
                  <span class="od-lbl">Metode</span>
                  <span class="od-val">{{ order.payment_method }}</span>
                </div>
                <div v-if="order.paid_at" class="oc-detail">
                  <n-icon :size="13" style="color:#22c55e"><CircleCheck /></n-icon>
                  <span class="od-lbl">Dibayar</span>
                  <span class="od-val">{{ formatDateTime(order.paid_at) }}</span>
                </div>
                <div v-if="order.payment_ref" class="oc-detail">
                  <n-icon :size="13"><Hash /></n-icon>
                  <span class="od-lbl">Ref</span>
                  <span class="od-val mono">{{ order.payment_ref }}</span>
                </div>
              </div>

              <!-- Notes -->
              <div v-if="order.notes" class="oc-notes">
                <n-icon :size="12"><AlignLeft /></n-icon>
                {{ order.notes }}
              </div>

              <!-- Pay action -->
              <div v-if="order.status === 'pending'" class="oc-action">
                <n-button
                  v-if="order.payment_url"
                  type="warning" size="small"
                  tag="a" :href="order.payment_url" target="_blank"
                  style="border-radius:6px"
                >
                  <template #icon><n-icon :size="13"><ExternalLink /></n-icon></template>
                  Bayar Sekarang
                </n-button>
                <n-button
                  v-else
                  type="warning" size="small"
                  :loading="paying === order.id"
                  style="border-radius:6px"
                  @click="handlePay(order.id)"
                >
                  <template #icon><n-icon :size="13"><CreditCard /></n-icon></template>
                  Buat Pembayaran
                </n-button>
              </div>
            </div>
          </div>
        </div>

        <n-empty v-if="!loading && !orders.length" style="padding:60px 0">
          <template #icon><n-icon :size="44" style="opacity:0.25"><FileText /></n-icon></template>
          <template #default>Belum ada riwayat order</template>
          <template #extra><span style="font-size:13px;opacity:0.45">Order muncul setelah Anda berlangganan</span></template>
        </n-empty>
      </n-tab-pane>
    </n-tabs>
  </n-spin>
</template>
<style scoped>
/* ── Banner ─────────────────────────────────────── */
.sub-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid;
}
.sub-banner.active  { background: rgba(34,197,94,0.07);  border-color: rgba(34,197,94,0.2);  color: #22c55e; }
.sub-banner.expired { background: rgba(239,68,68,0.07);  border-color: rgba(239,68,68,0.2);  color: #ef4444; }
.sub-banner.warn    { background: rgba(234,179,8,0.07);  border-color: rgba(234,179,8,0.2);  color: #ca8a04; }

.sb-icon {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sub-banner.active  .sb-icon { background: rgba(34,197,94,0.12); }
.sub-banner.expired .sb-icon { background: rgba(239,68,68,0.12); }
.sub-banner.warn    .sb-icon { background: rgba(234,179,8,0.12); }

.sb-body { flex: 1; min-width: 0; }
.sb-title { font-weight: 700; font-size: 13px; }
.sb-sub   { font-size: 12px; opacity: 0.75; margin-top: 2px; }
.sb-plan-name { text-transform: capitalize; }

.sb-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.sb-badge.active  { background: rgba(34,197,94,0.15);  color: #22c55e; }
.sb-badge.expired { background: rgba(239,68,68,0.15);  color: #ef4444; }
.sb-badge.warn    { background: rgba(234,179,8,0.15);  color: #ca8a04; }

/* ── Tab label ──────────────────────────────────── */
.tab-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(245,158,11,0.2);
  color: #f59e0b;
}

/* ── Billing toggle ─────────────────────────────── */
.billing-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0 20px;
}

.toggle-opt {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.4;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s;
}
.toggle-opt.on { opacity: 1; }

.toggle-track {
  position: relative;
  width: 44px; height: 24px;
  border-radius: 12px;
  background: rgba(128,128,128,0.2);
  cursor: pointer;
  transition: background 0.25s;
  flex-shrink: 0;
}
:root.dark .toggle-track { background: rgba(255,255,255,0.12); }
.toggle-track.yearly { background: linear-gradient(135deg, #3b82f6, #6366f1); }

.toggle-knob {
  position: absolute;
  top: 3px; left: 3px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-track.yearly .toggle-knob { transform: translateX(20px); }

.save-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
  white-space: nowrap;
}

/* ── Plans Grid ─────────────────────────────────── */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  padding: 4px 0;
}

.plan-card {
  position: relative;
  border-radius: 12px;
  padding: 24px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1.5px solid rgba(128,128,128,0.22);
  background: rgba(128,128,128,0.02);
  transition: transform 0.18s, border-color 0.15s, box-shadow 0.18s;
  overflow: hidden;
}
:root.dark .plan-card { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.14); }

.plan-card:hover { transform: translateY(-3px); border-color: rgba(128,128,128,0.4); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
:root.dark .plan-card:hover { border-color: rgba(255,255,255,0.24); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
.plan-card.popular { border-color: rgba(59,130,246,0.55) !important; box-shadow: 0 0 0 1px rgba(59,130,246,0.15); }
.plan-card.current { border-color: rgba(34,197,94,0.55) !important; box-shadow: 0 0 0 1px rgba(34,197,94,0.15); }

:root.dark .plan-card.popular { border-color: rgba(59,130,246,0.5) !important; }
:root.dark .plan-card.current { border-color: rgba(34,197,94,0.5) !important; }

.pc-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--pc);
  opacity: 0.8;
}

.pc-badge {
  position: absolute;
  top: 8px; right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  letter-spacing: 0.3px;
}
.pc-badge.popular { background: linear-gradient(135deg,#3b82f6,#6366f1); color:#fff; }
.pc-badge.current { background: linear-gradient(135deg,#22c55e,#16a34a); color:#fff; }

.pc-header { text-align: center; }

.pc-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px; height: 44px;
  border-radius: 11px;
  margin-bottom: 10px;
  background: rgba(128,128,128,0.08);
  color: rgba(128,128,128,0.6);
}
:root.dark .pc-icon { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.55); }
.pc-icon.pc-icon-popular { background: rgba(59,130,246,0.12); color: #3b82f6; }
.pc-icon.pc-icon-current  { background: rgba(34,197,94,0.12);  color: #22c55e; }

.pc-name {
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.pc-desc {
  font-size: 12px;
  opacity: 0.5;
  line-height: 1.4;
}

/* Price */
.pc-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}
.pc-price { flex-wrap: wrap; }

.pc-amount { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
.pc-period { font-size: 13px; opacity: 0.45; }
.pc-orig   { font-size: 12px; opacity: 0.35; text-decoration: line-through; width: 100%; text-align: center; }
.pc-yearly-row { display: flex; align-items: baseline; gap: 4px; justify-content: center; width: 100%; }
.pc-equiv  { font-size: 11px; opacity: 0.4; width: 100%; text-align: center; margin-top: 1px; }

/* Limit chip */
.pc-limit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(128,128,128,0.05);
  font-size: 13px;
  opacity: 0.75;
}
:root.dark .pc-limit { background: rgba(255,255,255,0.04); }

/* Features */
.pc-features {
  list-style: none;
  padding: 0; margin: 0;
  flex: 1;
}
.pc-features li {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid rgba(128,128,128,0.07);
}
:root.dark .pc-features li { border-bottom-color: rgba(255,255,255,0.05); }
.pc-features li:last-child { border-bottom: none; }

/* Action */
.pc-action { margin-top: auto; }

/* ── Orders ─────────────────────────────────────── */
.orders-stats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  margin-bottom: 14px;
  scrollbar-width: none;
}
.orders-stats::-webkit-scrollbar { display: none; }

.os-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(128,128,128,0.09);
  white-space: nowrap;
  flex-shrink: 0;
}
:root.dark .os-chip { border-color: rgba(255,255,255,0.06); }

.os-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.os-num { font-size: 16px; font-weight: 800; line-height: 1; }
.os-lbl { font-size: 11px; opacity: 0.5; }

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card {
  display: flex;
  border-radius: 10px;
  border: 1.5px solid rgba(128,128,128,0.2);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.18s;
}
:root.dark .order-card { border-color: rgba(255,255,255,0.12); }
.order-card:hover { border-color: rgba(128,128,128,0.4); box-shadow: 0 4px 14px rgba(0,0,0,0.07); }
:root.dark .order-card:hover { border-color: rgba(255,255,255,0.22); box-shadow: 0 4px 14px rgba(0,0,0,0.25); }

.oc-stripe { width: 4px; flex-shrink: 0; }

.oc-body {
  flex: 1;
  padding: 14px 16px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.oc-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.oc-plan {
  font-weight: 700;
  font-size: 14px;
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oc-dur {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(128,128,128,0.09);
  opacity: 0.6;
  white-space: nowrap;
  flex-shrink: 0;
}
:root.dark .oc-dur { background: rgba(255,255,255,0.07); }

.oc-status {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.oc-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

.oc-amount-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.oc-amount { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
.oc-time   { font-size: 11px; opacity: 0.38; white-space: nowrap; }

.oc-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 7px 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(128,128,128,0.04);
}
:root.dark .oc-details { background: rgba(255,255,255,0.03); }

.oc-detail {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}
.oc-detail svg { flex-shrink: 0; opacity: 0.38; }

.od-lbl { opacity: 0.45; white-space: nowrap; }
.od-lbl::after { content: ':'; }
.od-val { opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono   { font-family: ui-monospace, monospace; font-size: 11px; }

.oc-notes {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  opacity: 0.4;
  font-style: italic;
}

.oc-action { display: flex; }

/* ── Responsive ─────────────────────────────────── */
@media (max-width: 768px) {
  .plans-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .plan-card  { padding: 20px 14px 16px; }
  .pc-amount  { font-size: 22px; }
  .oc-details { grid-template-columns: 1fr 1fr; }
  .oc-amount  { font-size: 17px; }
}

@media (max-width: 640px) {
  .sub-banner { flex-wrap: wrap; }
  .plans-grid { grid-template-columns: 1fr; gap: 14px; }
  .oc-top     { flex-wrap: wrap; }
  .oc-details { grid-template-columns: 1fr; }
  .oc-amount-row { flex-wrap: wrap; }
}

@media (max-width: 480px) {
  .plan-card  { padding: 20px 14px 14px; }
  .pc-name    { font-size: 14px; }
  .pc-amount  { font-size: 21px; }
  .pc-features li { font-size: 11px; }
  .oc-body    { padding: 12px 12px; }
}
</style>
