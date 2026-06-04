<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NSpin, NIcon, NProgress } from 'naive-ui'
import {
  HomeOutline as HomeIcon,
  CheckmarkCircleOutline as CheckIcon,
  AlertCircleOutline as AlertIcon,
  WifiOutline as WifiIcon,
  SpeedometerOutline as SpeedIcon,
  CalendarOutline as CalendarIcon,
  PersonOutline as PersonIcon,
  ReceiptOutline as InvoiceIcon,
  CardOutline as CardIcon,
  ChatbubbleEllipsesOutline as ChatIcon,
  ChevronForwardOutline as ChevronIcon,
  WarningOutline as WarningIcon,
  RocketOutline as RocketIcon,
  PeopleOutline as PeopleIcon,
  GiftOutline as GiftIcon,
  TimeOutline as TimeIcon,
  ArrowUpOutline as UpIcon,
  ArrowDownOutline as DownIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/theme'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const loading = ref(true)
const profile = ref<any>({})
const invoices = ref<any[]>([])
const referralInfo = ref<any>(null)
const gatewayAvailable = ref(false)

onMounted(async () => {
  try {
    const [profRes, invRes, cfgRes] = await Promise.all([
      portalApi.customer(),
      portalApi.invoices({ per_page: 5 }),
      portalApi.paymentConfig(),
    ])
    profile.value = profRes.data.data || profRes.data
    invoices.value = (invRes.data.data || []).slice(0, 5)
    gatewayAvailable.value = cfgRes.data.data?.available === true
    // load referral silently
    try {
      const refRes = await portalApi.referral()
      referralInfo.value = refRes.data.data
    } catch { /* referral optional */ }
  } catch { /* ignore */ }
  loading.value = false
})

const status = computed(() => profile.value.status || 'active')
const statusConfig = computed(() => {
  const m: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Aktif', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    isolated: { label: 'Terisolir', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    suspended: { label: 'Ditangguhkan', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  }
  return m[status.value] || m.active
})

const unpaidInvoices = computed(() => invoices.value.filter((i: any) => i.status === 'unpaid' || i.status === 'overdue'))
const totalUnpaid = computed(() => unpaidInvoices.value.reduce((s: number, i: any) => s + (i.total_amount || 0), 0))
const hasOverdue = computed(() => invoices.value.some((i: any) => i.status === 'overdue'))

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Selamat Pagi'
  if (h < 15) return 'Selamat Siang'
  if (h < 18) return 'Selamat Sore'
  return 'Selamat Malam'
})

const packageName = computed(() => profile.value.package?.name || '-')
const bwDown = computed(() => profile.value.package?.bandwidth_down || 0)
const bwUp = computed(() => profile.value.package?.bandwidth_up || 0)

const rewardBalance = computed(() => referralInfo.value?.balance || 0)
const referralCode = computed(() => referralInfo.value?.referral_code || profile.value.referral_code || '')
const referralCount = computed(() => (referralInfo.value?.referrals || []).length)

function statusType(s: string): 'success' | 'warning' | 'error' | 'info' {
  const m: Record<string, any> = { paid: 'success', overdue: 'error', unpaid: 'warning' }
  return m[s] || 'info'
}

function formatCurrency(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
}

function copyReferral() {
  if (referralCode.value) {
    navigator.clipboard.writeText(referralCode.value)
  }
}
</script>

<template>
  <n-spin :show="loading">
    <div class="dash">

      <!-- ===== HERO ===== -->
      <div class="hero">
        <div class="hero-left">
          <div class="greeting">{{ greeting }} 👋</div>
          <div class="hero-name">{{ authStore.user?.name || 'Pelanggan' }}</div>
          <div class="hero-sub">ID: {{ profile.customer_code || '-' }}</div>
          <div class="hero-status">
            <span class="status-pill" :style="{ background: statusConfig.bg, color: statusConfig.color }">
              <n-icon v-if="status === 'active'" :component="CheckIcon" :size="13" />
              <n-icon v-else :component="AlertIcon" :size="13" />
              {{ statusConfig.label }}
            </span>
          </div>
        </div>
        <div class="hero-pkg-card">
          <div class="pkg-label">Paket Aktif</div>
          <div class="pkg-name">{{ packageName }}</div>
          <div class="pkg-speed">
            <div class="speed-row">
              <n-icon :component="DownIcon" :size="13" color="#22c55e" />
              <span>{{ bwDown }} Mbps</span>
            </div>
            <div class="speed-sep">·</div>
            <div class="speed-row">
              <n-icon :component="UpIcon" :size="13" color="#3b82f6" />
              <span>{{ bwUp }} Mbps</span>
            </div>
          </div>
          <button class="pkg-change-btn" @click="router.push('/portal/package')">
            Ubah Paket <n-icon :component="ChevronIcon" :size="13" />
          </button>
        </div>
      </div>

      <!-- ===== ALERT tagihan ===== -->
      <div v-if="unpaidInvoices.length > 0" class="alert-banner" :class="hasOverdue ? 'alert-danger' : 'alert-warn'" @click="router.push('/portal/invoices')">
        <n-icon :component="hasOverdue ? WarningIcon : TimeIcon" :size="20" />
        <div class="alert-body">
          <div class="alert-title">{{ hasOverdue ? 'Tagihan Jatuh Tempo!' : 'Tagihan Menunggu Pembayaran' }}</div>
          <div class="alert-sub">{{ unpaidInvoices.length }} tagihan · Total {{ formatCurrency(totalUnpaid) }}</div>
        </div>
        <div class="alert-cta">Bayar <n-icon :component="ChevronIcon" :size="14" /></div>
      </div>

      <!-- ===== STAT ROW ===== -->
      <div class="stat-row">
        <div class="stat-card" @click="router.push('/portal/invoices')">
          <div class="stat-icon-wrap" style="background: rgba(14,165,233,0.1)">
            <n-icon :component="InvoiceIcon" :size="20" color="#0ea5e9" />
          </div>
          <div class="stat-body">
            <span class="stat-val">{{ invoices.filter((i:any) => i.status !== 'paid').length }}</span>
            <span class="stat-label">Tagihan Aktif</span>
          </div>
        </div>
        <div class="stat-card" @click="router.push('/portal/referral')">
          <div class="stat-icon-wrap" style="background: rgba(168,85,247,0.1)">
            <n-icon :component="GiftIcon" :size="20" color="#a855f7" />
          </div>
          <div class="stat-body">
            <span class="stat-val">{{ formatCurrency(rewardBalance) }}</span>
            <span class="stat-label">Saldo Reward</span>
          </div>
        </div>
        <div class="stat-card" @click="router.push('/portal/referral')">
          <div class="stat-icon-wrap" style="background: rgba(34,197,94,0.1)">
            <n-icon :component="PeopleIcon" :size="20" color="#22c55e" />
          </div>
          <div class="stat-body">
            <span class="stat-val">{{ referralCount }}</span>
            <span class="stat-label">Referral Sukses</span>
          </div>
        </div>
      </div>

      <!-- ===== QUICK ACTIONS ===== -->
      <div class="section">
        <div class="section-title">Aksi Cepat</div>
        <div class="quick-grid">
          <div class="quick-card" @click="router.push('/portal/invoices')">
            <div class="quick-icon" style="background: rgba(14,165,233,0.1)">
              <n-icon :component="CardIcon" :size="22" color="#0ea5e9" />
            </div>
            <span class="quick-label">Bayar Tagihan</span>
            <span class="quick-desc">{{ gatewayAvailable ? 'Bayar online / transfer' : 'Lihat tagihan' }}</span>
          </div>
          <div class="quick-card" @click="router.push('/portal/package')">
            <div class="quick-icon" style="background: rgba(99,102,241,0.1)">
              <n-icon :component="RocketIcon" :size="22" color="#6366f1" />
            </div>
            <span class="quick-label">Ganti Paket</span>
            <span class="quick-desc">Upgrade atau downgrade</span>
          </div>
          <div class="quick-card" @click="router.push('/portal/device')">
            <div class="quick-icon" style="background: rgba(6,182,212,0.1)">
              <n-icon :component="WifiIcon" :size="22" color="#06b6d4" />
            </div>
            <span class="quick-label">Kelola WiFi</span>
            <span class="quick-desc">Ubah SSID & password</span>
          </div>
          <div class="quick-card" @click="router.push('/portal/referral')">
            <div class="quick-icon" style="background: rgba(168,85,247,0.1)">
              <n-icon :component="GiftIcon" :size="22" color="#a855f7" />
            </div>
            <span class="quick-label">Referral</span>
            <span class="quick-desc">Ajak teman, dapat reward</span>
          </div>
          <div class="quick-card" @click="router.push('/portal/tickets/create')">
            <div class="quick-icon" style="background: rgba(245,158,11,0.1)">
              <n-icon :component="ChatIcon" :size="22" color="#f59e0b" />
            </div>
            <span class="quick-label">Lapor Masalah</span>
            <span class="quick-desc">Buat tiket bantuan</span>
          </div>
          <div class="quick-card" @click="router.push('/portal/profile')">
            <div class="quick-icon" style="background: rgba(34,197,94,0.1)">
              <n-icon :component="PersonIcon" :size="22" color="#22c55e" />
            </div>
            <span class="quick-label">Profil Saya</span>
            <span class="quick-desc">Info akun & koneksi</span>
          </div>
        </div>
      </div>

      <!-- ===== REFERRAL CARD ===== -->
      <div v-if="referralCode" class="referral-card" @click="router.push('/portal/referral')">
        <div class="ref-left">
          <div class="ref-title">Kode Referral Anda</div>
          <div class="ref-code">{{ referralCode }}</div>
          <div class="ref-sub">Ajak teman & dapatkan reward setiap bulan</div>
        </div>
        <div class="ref-right">
          <button class="ref-copy-btn" @click.stop="copyReferral">Salin</button>
          <n-icon :component="ChevronIcon" :size="18" style="opacity:.4" />
        </div>
      </div>

      <!-- ===== TAGIHAN TERBARU ===== -->
      <div class="section">
        <div class="section-header">
          <div class="section-title">Tagihan Terbaru</div>
          <button class="see-all" @click="router.push('/portal/invoices')">
            Lihat Semua <n-icon :component="ChevronIcon" :size="14" />
          </button>
        </div>

        <div v-if="invoices.length === 0" class="empty">
          <n-icon :component="CheckIcon" :size="40" style="opacity:.25" />
          <span>Tidak ada tagihan</span>
        </div>

        <div v-else class="inv-list">
          <div
            v-for="inv in invoices" :key="inv.id"
            class="inv-row"
            @click="router.push(`/portal/invoices/${inv.id}`)"
          >
            <div class="inv-icon-wrap" :class="'st-' + inv.status">
              <n-icon :component="InvoiceIcon" :size="17" />
            </div>
            <div class="inv-info">
              <span class="inv-num">{{ inv.invoice_number || '#' + inv.id?.slice(0,8) }}</span>
              <span class="inv-date">Jatuh tempo {{ formatDate(inv.due_date) }}</span>
            </div>
            <div class="inv-right">
              <span class="inv-amount">{{ formatCurrency(inv.total_amount) }}</span>
              <n-tag :type="statusType(inv.status)" size="small" round>
                {{ inv.status === 'paid' ? 'Lunas' : inv.status === 'overdue' ? 'Lewat Tempo' : 'Belum Bayar' }}
              </n-tag>
            </div>
          </div>
        </div>
      </div>

    </div>
  </n-spin>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 900px;
  margin: 0 auto;
}

/* ===== Hero ===== */
.hero {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.hero-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 22px 20px;
  border-radius: 16px;
  border: 1px solid var(--app-border, rgba(0,0,0,.06));
  background: var(--app-card-bg, transparent);
}

:root.dark .hero-left {
  border-color: rgba(255,255,255,.06);
}

.greeting {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  opacity: .45;
}

.hero-name {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -.6px;
  background: var(--app-logo-gradient, linear-gradient(135deg,#6366f1,#0ea5e9));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.hero-sub {
  font-size: 12px;
  font-family: 'SF Mono', monospace;
  opacity: .4;
  margin-top: 2px;
}

.hero-status {
  margin-top: 8px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  letter-spacing: .2px;
}

.hero-pkg-card {
  width: 200px;
  flex-shrink: 0;
  padding: 20px 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: white;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pkg-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  opacity: .7;
}

.pkg-name {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -.3px;
  margin-top: 2px;
}

.pkg-speed {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: .85;
  margin-top: 4px;
}

.speed-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.speed-sep {
  opacity: .5;
}

.pkg-change-btn {
  margin-top: auto;
  padding-top: 12px;
  background: rgba(255,255,255,.2);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background .2s;
  margin-top: 14px;
}

.pkg-change-btn:hover {
  background: rgba(255,255,255,.3);
}

/* ===== Alert Banner ===== */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 14px;
  cursor: pointer;
  transition: opacity .2s;
}

.alert-banner:hover { opacity: .9; }

.alert-warn {
  background: rgba(245,158,11,.12);
  border: 1px solid rgba(245,158,11,.25);
  color: #d97706;
}

.alert-danger {
  background: rgba(239,68,68,.12);
  border: 1px solid rgba(239,68,68,.25);
  color: #dc2626;
}

.alert-body {
  flex: 1;
}

.alert-title {
  font-size: 14px;
  font-weight: 700;
}

.alert-sub {
  font-size: 12px;
  opacity: .75;
  margin-top: 2px;
}

.alert-cta {
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

/* ===== Stat Row ===== */
.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--app-border, rgba(0,0,0,.06));
  cursor: pointer;
  transition: transform .2s, box-shadow .2s;
}

:root.dark .stat-card {
  border-color: rgba(255,255,255,.06);
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.stat-val {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -.3px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 11px;
  opacity: .5;
  font-weight: 600;
}

/* ===== Section ===== */
.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  opacity: .75;
}

.see-all {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-accent, #6366f1);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background .2s;
}

.see-all:hover {
  background: rgba(99,102,241,.06);
}

/* ===== Quick Grid ===== */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 12px;
  border-radius: 14px;
  border: 1px solid var(--app-border, rgba(0,0,0,.06));
  cursor: pointer;
  text-align: center;
  transition: transform .2s, box-shadow .2s;
}

:root.dark .quick-card {
  border-color: rgba(255,255,255,.06);
}

.quick-card:hover {
  transform: translateY(-3px);
}

:root:not(.dark) .quick-card:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,.06);
}

:root.dark .quick-card:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,.2);
}

.quick-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-label {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.quick-desc {
  font-size: 11px;
  opacity: .4;
  line-height: 1.3;
}

/* ===== Referral Card ===== */
.referral-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(168,85,247,.08), rgba(99,102,241,.08));
  border: 1px solid rgba(168,85,247,.2);
  cursor: pointer;
  transition: opacity .2s;
}

.referral-card:hover { opacity: .9; }

.ref-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ref-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  opacity: .5;
}

.ref-code {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #a855f7;
  font-family: 'SF Mono', monospace;
}

.ref-sub {
  font-size: 11px;
  opacity: .45;
  margin-top: 2px;
}

.ref-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ref-copy-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(168,85,247,.4);
  background: rgba(168,85,247,.1);
  color: #a855f7;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background .2s;
}

.ref-copy-btn:hover {
  background: rgba(168,85,247,.2);
}

/* ===== Invoice List ===== */
.inv-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--app-border, rgba(0,0,0,.05));
  cursor: pointer;
  transition: all .2s;
}

:root:not(.dark) .inv-row {
  background: rgba(0,0,0,.015);
}

:root.dark .inv-row {
  background: rgba(255,255,255,.02);
  border-color: rgba(255,255,255,.05);
}

.inv-row:hover {
  transform: translateX(3px);
}

.inv-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.st-paid { background: rgba(34,197,94,.1); color: #22c55e; }
.st-unpaid { background: rgba(245,158,11,.1); color: #f59e0b; }
.st-overdue { background: rgba(239,68,68,.1); color: #ef4444; }

.inv-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.inv-num {
  font-size: 13px;
  font-weight: 600;
}

.inv-date {
  font-size: 11px;
  opacity: .45;
}

.inv-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}

.inv-amount {
  font-size: 13px;
  font-weight: 700;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px;
  border-radius: 14px;
  border: 1px dashed var(--app-border, rgba(0,0,0,.08));
  opacity: .5;
  font-size: 13px;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .hero {
    flex-direction: column;
  }

  .hero-pkg-card {
    width: 100%;
  }

  .stat-row {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .stat-val {
    font-size: 14px;
  }

  .quick-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .quick-card {
    padding: 14px 8px;
  }

  .quick-icon {
    width: 40px;
    height: 40px;
  }

  .quick-label {
    font-size: 11px;
  }

  .quick-desc {
    display: none;
  }
}

@media (max-width: 480px) {
  .hero-name {
    font-size: 22px;
  }

  .stat-row {
    gap: 6px;
  }

  .stat-card {
    padding: 12px;
    gap: 8px;
  }

  .stat-icon-wrap {
    width: 36px;
    height: 36px;
  }

  .quick-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
