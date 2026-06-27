<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NSpin, NIcon } from 'naive-ui'
import {
  CheckmarkCircleOutline as CheckIcon,
  WifiOutline as WifiIcon,
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

const router = useRouter()
const authStore = useAuthStore()
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

// ── Billing emphasis: nearest upcoming/overdue bill + countdown ──
const nextDueInvoice = computed(() => {
  return unpaidInvoices.value
    .slice()
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0] || null
})
const daysToDue = computed<number | null>(() => {
  if (!nextDueInvoice.value?.due_date) return null
  const d = new Date(nextDueInvoice.value.due_date); d.setHours(0, 0, 0, 0)
  const t = new Date(); t.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - t.getTime()) / 86400000)
})
const dueLabel = computed(() => {
  const n = daysToDue.value
  if (n === null) return ''
  if (n < 0) return `Telat ${Math.abs(n)} hari`
  if (n === 0) return 'Jatuh tempo hari ini'
  if (n === 1) return 'Jatuh tempo besok'
  return `${n} hari lagi`
})

// ── Connection emphasis ──
const isOnline = computed(() => status.value === 'active')
const connConfig = computed(() => {
  const m: Record<string, { label: string; color: string; desc: string }> = {
    active: { label: 'Online', color: '#22c55e', desc: 'Internet Anda aktif & berjalan normal' },
    isolated: { label: 'Terisolir', color: '#ef4444', desc: 'Koneksi diputus karena tagihan tertunggak' },
    suspended: { label: 'Ditangguhkan', color: '#f59e0b', desc: 'Layanan sedang ditangguhkan sementara' },
  }
  return m[status.value] || m.active
})
</script>

<template>
  <n-spin :show="loading">
    <div class="dash">

      <!-- ===== HERO ===== -->
      <div class="hero glass-card glass-strong">
        <div class="hero-left">
          <div class="greeting">{{ greeting }} 👋</div>
          <div class="hero-name">{{ authStore.user?.name || 'Pelanggan' }}</div>
          <div class="hero-sub">ID: {{ profile.customer_code || '-' }}</div>
        </div>
        <div class="hero-avatar">{{ (authStore.user?.name || 'P').charAt(0) }}</div>
      </div>

      <!-- ===== FOCUS: KONEKSI + TAGIHAN ===== -->
      <div class="focus-grid">
        <!-- Connection status -->
        <div class="focus-card conn-card glass-card glass-interactive" @click="router.push('/portal/device')">
          <div class="conn-top">
            <div class="conn-dot-wrap">
              <span class="conn-dot" :style="{ background: connConfig.color }" :class="{ live: isOnline }"></span>
            </div>
            <div class="conn-status" :style="{ color: connConfig.color }">{{ connConfig.label }}</div>
            <n-icon :component="WifiIcon" :size="20" class="conn-wifi" :style="{ color: connConfig.color }" />
          </div>
          <div class="conn-desc">{{ connConfig.desc }}</div>
          <div class="conn-pkg">
            <span class="conn-pkg-name">{{ packageName }}</span>
          </div>
          <div class="conn-speeds">
            <div class="speed-chip">
              <n-icon :component="DownIcon" :size="14" color="#22c55e" />
              <b>{{ bwDown }}</b><span>Mbps</span>
            </div>
            <div class="speed-chip">
              <n-icon :component="UpIcon" :size="14" color="#3b82f6" />
              <b>{{ bwUp }}</b><span>Mbps</span>
            </div>
          </div>
        </div>

        <!-- Billing -->
        <div
          class="focus-card bill-card glass-card glass-interactive"
          :class="{ 'is-overdue': hasOverdue, 'is-clear': unpaidInvoices.length === 0 }"
          @click="router.push('/portal/invoices')"
        >
          <template v-if="unpaidInvoices.length > 0">
            <div class="bill-top">
              <span class="bill-label">{{ hasOverdue ? 'Tagihan Lewat Tempo' : 'Tagihan Berikutnya' }}</span>
              <span class="bill-countdown" :class="hasOverdue ? 'cd-danger' : 'cd-warn'">
                <n-icon :component="hasOverdue ? WarningIcon : TimeIcon" :size="13" /> {{ dueLabel }}
              </span>
            </div>
            <div class="bill-amount">{{ formatCurrency(totalUnpaid) }}</div>
            <div class="bill-meta">
              {{ unpaidInvoices.length }} tagihan · Jatuh tempo {{ formatDate(nextDueInvoice?.due_date) }}
            </div>
            <button class="bill-btn" @click.stop="router.push('/portal/invoices')">
              <n-icon :component="CardIcon" :size="16" /> {{ gatewayAvailable ? 'Bayar Sekarang' : 'Lihat Tagihan' }}
            </button>
          </template>
          <template v-else>
            <div class="bill-clear">
              <div class="bill-clear-icon"><n-icon :component="CheckIcon" :size="26" /></div>
              <div>
                <div class="bill-clear-title">Semua Lunas 🎉</div>
                <div class="bill-clear-sub">Tidak ada tagihan tertunggak</div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ===== STAT ROW ===== -->
      <div class="stat-row">
        <div class="stat-card glass-card glass-interactive" @click="router.push('/portal/invoices')">
          <div class="stat-icon-wrap" style="background: rgba(14,165,233,0.14)">
            <n-icon :component="InvoiceIcon" :size="20" color="#0ea5e9" />
          </div>
          <div class="stat-body">
            <span class="stat-val">{{ invoices.filter((i:any) => i.status !== 'paid').length }}</span>
            <span class="stat-label">Tagihan Aktif</span>
          </div>
        </div>
        <div class="stat-card glass-card glass-interactive" @click="router.push('/portal/referral')">
          <div class="stat-icon-wrap" style="background: rgba(168,85,247,0.14)">
            <n-icon :component="GiftIcon" :size="20" color="#a855f7" />
          </div>
          <div class="stat-body">
            <span class="stat-val">{{ formatCurrency(rewardBalance) }}</span>
            <span class="stat-label">Saldo Reward</span>
          </div>
        </div>
        <div class="stat-card glass-card glass-interactive" @click="router.push('/portal/referral')">
          <div class="stat-icon-wrap" style="background: rgba(34,197,94,0.14)">
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
          <div class="quick-card glass-card glass-interactive" @click="router.push('/portal/invoices')">
            <div class="quick-icon" style="background: rgba(14,165,233,0.1)">
              <n-icon :component="CardIcon" :size="22" color="#0ea5e9" />
            </div>
            <span class="quick-label">Bayar Tagihan</span>
            <span class="quick-desc">{{ gatewayAvailable ? 'Bayar online / transfer' : 'Lihat tagihan' }}</span>
          </div>
          <div class="quick-card glass-card glass-interactive" @click="router.push('/portal/package')">
            <div class="quick-icon" style="background: rgba(99,102,241,0.1)">
              <n-icon :component="RocketIcon" :size="22" color="#6366f1" />
            </div>
            <span class="quick-label">Ganti Paket</span>
            <span class="quick-desc">Upgrade atau downgrade</span>
          </div>
          <div class="quick-card glass-card glass-interactive" @click="router.push('/portal/device')">
            <div class="quick-icon" style="background: rgba(6,182,212,0.1)">
              <n-icon :component="WifiIcon" :size="22" color="#06b6d4" />
            </div>
            <span class="quick-label">Kelola WiFi</span>
            <span class="quick-desc">Ubah SSID & password</span>
          </div>
          <div class="quick-card glass-card glass-interactive" @click="router.push('/portal/referral')">
            <div class="quick-icon" style="background: rgba(168,85,247,0.1)">
              <n-icon :component="GiftIcon" :size="22" color="#a855f7" />
            </div>
            <span class="quick-label">Referral</span>
            <span class="quick-desc">Ajak teman, dapat reward</span>
          </div>
          <div class="quick-card glass-card glass-interactive" @click="router.push('/portal/tickets/create')">
            <div class="quick-icon" style="background: rgba(245,158,11,0.1)">
              <n-icon :component="ChatIcon" :size="22" color="#f59e0b" />
            </div>
            <span class="quick-label">Lapor Masalah</span>
            <span class="quick-desc">Buat tiket bantuan</span>
          </div>
          <div class="quick-card glass-card glass-interactive" @click="router.push('/portal/profile')">
            <div class="quick-icon" style="background: rgba(34,197,94,0.1)">
              <n-icon :component="PersonIcon" :size="22" color="#22c55e" />
            </div>
            <span class="quick-label">Profil Saya</span>
            <span class="quick-desc">Info akun & koneksi</span>
          </div>
        </div>
      </div>

      <!-- ===== REFERRAL CARD ===== -->
      <div v-if="referralCode" class="referral-card glass-card glass-interactive" @click="router.push('/portal/referral')">
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

        <div v-else class="inv-list glass-card">
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
  gap: 16px;
  max-width: 920px;
  margin: 0 auto;
}

/* ===== Hero ===== */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px;
}
.hero-left { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.greeting { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--app-text-muted); }
.hero-name {
  font-size: 26px; font-weight: 800; letter-spacing: -.6px; line-height: 1.15;
  color: var(--app-text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hero-sub { font-size: 12px; font-family: 'SF Mono', ui-monospace, monospace; color: var(--app-text-muted); opacity: .8; margin-top: 2px; }
.hero-avatar {
  flex-shrink: 0;
  width: 54px; height: 54px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 800; color: #fff;
  background: var(--glass-accent-grad);
  box-shadow: 0 8px 20px rgba(124,77,255,0.35);
}

/* ===== Focus grid (connection + billing) ===== */
.focus-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.focus-card { padding: 18px; display: flex; flex-direction: column; gap: 10px; min-height: 168px; }

/* Connection */
.conn-top { display: flex; align-items: center; gap: 9px; }
.conn-dot-wrap { position: relative; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center; }
.conn-dot { width: 11px; height: 11px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
.conn-dot.live::after {
  content: ''; position: absolute; inset: 0; border-radius: 50%;
  background: inherit; animation: signalWave 1.8s ease-out infinite;
}
.conn-status { font-size: 18px; font-weight: 800; letter-spacing: -.3px; }
.conn-wifi { margin-left: auto; opacity: .9; }
.conn-desc { font-size: 12.5px; color: var(--app-text-muted); line-height: 1.45; }
.conn-pkg { margin-top: auto; }
.conn-pkg-name {
  display: inline-block; font-size: 13px; font-weight: 700; color: var(--app-text-secondary);
  padding: 4px 12px; border-radius: 20px; background: var(--app-accent-soft);
}
.conn-speeds { display: flex; gap: 8px; }
.speed-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 11px; border-radius: 14px;
  background: var(--glass-bg-soft); border: 1px solid var(--glass-border);
  font-size: 12px; color: var(--app-text-muted);
}
.speed-chip b { font-size: 14px; font-weight: 800; color: var(--app-text-primary); }

/* Billing */
.bill-card { justify-content: flex-start; }
.bill-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bill-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--app-text-muted); }
.bill-countdown { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 20px; white-space: nowrap; }
.cd-warn { color: #f59e0b; background: rgba(245,158,11,0.14); }
.cd-danger { color: #ef4444; background: rgba(239,68,68,0.16); }
.bill-amount { font-size: 28px; font-weight: 800; letter-spacing: -.8px; color: var(--app-text-primary); margin-top: 4px; }
.bill-meta { font-size: 12px; color: var(--app-text-muted); }
.bill-btn {
  margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 12px; border: none; border-radius: 16px; cursor: pointer;
  font-size: 14px; font-weight: 700; color: #fff;
  background: var(--glass-accent-grad);
  box-shadow: 0 8px 18px rgba(124,77,255,0.30);
  transition: transform .15s, box-shadow .2s;
}
.bill-btn:active { transform: scale(0.97); }
.bill-card.is-overdue .bill-btn { background: linear-gradient(135deg,#ef4444,#f97316); box-shadow: 0 8px 18px rgba(239,68,68,0.32); }
.bill-card.is-overdue { border-color: rgba(239,68,68,0.4); }
.bill-clear { display: flex; align-items: center; gap: 14px; height: 100%; }
.bill-clear-icon {
  width: 56px; height: 56px; border-radius: 18px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #22c55e; background: rgba(34,197,94,0.14);
}
.bill-clear-title { font-size: 17px; font-weight: 800; color: var(--app-text-primary); }
.bill-clear-sub { font-size: 12.5px; color: var(--app-text-muted); margin-top: 2px; }

/* ===== Stat row ===== */
.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.stat-card { padding: 14px; display: flex; align-items: center; gap: 11px; }
.stat-icon-wrap { width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.stat-body { display: flex; flex-direction: column; min-width: 0; }
.stat-val { font-size: 17px; font-weight: 800; color: var(--app-text-primary); letter-spacing: -.4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-label { font-size: 11.5px; color: var(--app-text-muted); }

/* ===== Sections ===== */
.section { display: flex; flex-direction: column; gap: 12px; }
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 15px; font-weight: 800; color: var(--app-text-primary); letter-spacing: -.3px; }
.see-all { display: flex; align-items: center; gap: 3px; border: none; background: transparent; color: var(--app-accent); font-size: 13px; font-weight: 600; cursor: pointer; }

/* ===== Quick actions ===== */
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.quick-card { padding: 16px 12px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 7px; }
.quick-icon { width: 46px; height: 46px; border-radius: 15px; display: flex; align-items: center; justify-content: center; }
.quick-label { font-size: 13px; font-weight: 700; color: var(--app-text-primary); }
.quick-desc { font-size: 11px; color: var(--app-text-muted); line-height: 1.3; }

/* ===== Referral ===== */
.referral-card { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.referral-card::before {
  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: var(--glass-accent-grad-soft);
}
.ref-left { display: flex; flex-direction: column; gap: 3px; }
.ref-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--app-text-muted); }
.ref-code { font-size: 22px; font-weight: 800; letter-spacing: 1px; color: var(--app-text-primary); font-family: 'SF Mono', ui-monospace, monospace; }
.ref-sub { font-size: 12px; color: var(--app-text-muted); }
.ref-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.ref-copy-btn { padding: 8px 16px; border: none; border-radius: 14px; background: var(--glass-accent-grad); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.ref-copy-btn:active { transform: scale(0.96); }

/* ===== Invoice list ===== */
.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px; color: var(--app-text-muted); font-size: 13px; }
.inv-list { padding: 6px; display: flex; flex-direction: column; }
.inv-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--glass-radius-sm); cursor: pointer; transition: background .18s; }
.inv-row:hover { background: var(--glass-bg-soft); }
.inv-icon-wrap { width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.inv-icon-wrap.st-paid { color: #22c55e; background: rgba(34,197,94,0.14); }
.inv-icon-wrap.st-unpaid { color: #f59e0b; background: rgba(245,158,11,0.14); }
.inv-icon-wrap.st-overdue { color: #ef4444; background: rgba(239,68,68,0.14); }
.inv-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.inv-num { font-size: 13.5px; font-weight: 700; color: var(--app-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.inv-date { font-size: 11.5px; color: var(--app-text-muted); }
.inv-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
.inv-amount { font-size: 14px; font-weight: 800; color: var(--app-text-primary); }

/* ===== Responsive ===== */
@media (max-width: 560px) {
  .focus-grid { grid-template-columns: 1fr; }
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
  .hero-name { font-size: 22px; }
  .bill-amount { font-size: 26px; }
}
@media (max-width: 380px) {
  .stat-row { grid-template-columns: 1fr; }
}
</style>
