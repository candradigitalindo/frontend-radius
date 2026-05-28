<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NSpin, NIcon } from 'naive-ui'
import {
  User as UserIcon,
  Check as CheckIcon,
  AlertCircle as AlertCircleIcon,
  Bolt as BoltIcon,
  DeviceDesktop as DeviceDesktopIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  FileInvoice as FileInvoiceIcon,
  CurrencyDollar as CurrencyDollarIcon,
  MessageCircle as MessageCircleIcon,
  FileText as FileTextIcon,
  ArrowRight as ArrowRightIcon,
  CircleCheck as CircleCheckIcon,
  Clock as ClockIcon,
  LayoutGrid as LayoutGridIcon,
  CreditCard as CreditCardIcon,
  Message as MessageIcon,
} from '@vicons/tabler'
import { portalApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/theme'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const loading = ref(true)
const profile = ref<any>({})
const invoices = ref<any[]>([])

onMounted(async () => {
  try {
    const [profRes, invRes] = await Promise.all([
      portalApi.customer(),
      portalApi.invoices({ per_page: 5 }),
    ])
    profile.value = profRes.data.data || profRes.data
    invoices.value = (invRes.data.data || []).slice(0, 5)
  } catch { /* ignore */ }
  loading.value = false
})

const status = computed(() => profile.value.status || 'active')
const statusConfig = computed(() => {
  const m: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Aktif', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
    isolated: { label: 'Terisolir', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    suspended: { label: 'Ditangguhkan', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  }
  return m[status.value] || m.active
})

const unpaidCount = computed(() => invoices.value.filter((i: any) => i.status === 'unpaid' || i.status === 'overdue').length)
const totalUnpaid = computed(() => invoices.value.filter((i: any) => i.status === 'unpaid' || i.status === 'overdue').reduce((s: number, i: any) => s + (i.total_amount || 0), 0))

const heroColor = computed(() => {
  const d = themeStore.isDark
  return {
    color: d ? '#60a5fa' : '#3b82f6',
    bg: d ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)',
    iconBg: d ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
  }
})

const infoCards = computed(() => {
  const d = themeStore.isDark
  const p = profile.value
  const cards = [
    {
      label: 'Paket Internet',
      value: p.package?.name || '-',
      desc: p.package ? `${p.package?.bandwidth_up || '-'} / ${p.package?.bandwidth_down || '-'} Mbps` : '',
      color: d ? '#818cf8' : '#6366f1',
      bg: d ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
      iconBg: d ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
      icon: 'bolt',
    },
    {
      label: 'Tipe Koneksi',
      value: connectionLabel.value,
      desc: p.ip_address || '',
      color: d ? '#38bdf8' : '#0ea5e9',
      bg: d ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.05)',
      iconBg: d ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.1)',
      icon: 'monitor',
    },
    {
      label: 'Tanggal Tagihan',
      value: p.billing_date ? `Setiap tanggal ${p.billing_date}` : '-',
      desc: '',
      color: d ? '#fbbf24' : '#d97706',
      bg: d ? 'rgba(217,119,6,0.08)' : 'rgba(217,119,6,0.05)',
      iconBg: d ? 'rgba(217,119,6,0.15)' : 'rgba(217,119,6,0.1)',
      icon: 'calendar',
    },
    {
      label: 'Pelanggan Sejak',
      value: memberSince.value,
      desc: '',
      color: d ? '#34d399' : '#10b981',
      bg: d ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
      iconBg: d ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
      icon: 'user',
    },
  ]
  return cards
})

const statCards = computed(() => {
  const d = themeStore.isDark
  return [
    {
      label: 'Tagihan Belum Lunas',
      value: unpaidCount.value,
      desc: 'Perlu pembayaran',
      color: '#ef4444',
      bg: d ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
      iconBg: d ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
      icon: 'invoice',
      route: '/portal/invoices',
    },
    ...(totalUnpaid.value > 0 ? [{
      label: 'Total Tunggakan',
      value: formatCurrency(totalUnpaid.value),
      desc: 'Belum terbayar',
      color: d ? '#fbbf24' : '#d97706',
      bg: d ? 'rgba(217,119,6,0.08)' : 'rgba(217,119,6,0.05)',
      iconBg: d ? 'rgba(217,119,6,0.15)' : 'rgba(217,119,6,0.1)',
      icon: 'money',
      route: '/portal/invoices',
    }] : []),
    {
      label: 'Bantuan Support',
      value: 'Buat Tiket',
      desc: 'Lapor masalah',
      color: d ? '#818cf8' : '#6366f1',
      bg: d ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
      iconBg: d ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
      icon: 'chat',
      route: '/portal/tickets',
    },
  ]
})

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

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Selamat Pagi'
  if (h < 15) return 'Selamat Siang'
  if (h < 18) return 'Selamat Sore'
  return 'Selamat Malam'
})

const connectionLabel = computed(() => {
  const t = profile.value.connection_type
  if (!t) return '-'
  if (t === 'pppoe') return 'PPPoE'
  if (t === 'static') return 'Static IP'
  if (t === 'hotspot') return 'Hotspot'
  return t.charAt(0).toUpperCase() + t.slice(1)
})

const memberSince = computed(() => {
  const d = profile.value.join_date
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
})
</script>

<template>
  <n-spin :show="loading">
    <div class="portal-dashboard">

      <!-- ===== Hero / Welcome ===== -->
      <div class="hero-card" :style="{ background: heroColor.bg }">
        <div class="hero-icon-wrap" :style="{ background: heroColor.iconBg }">
          <n-icon size="22" :color="heroColor.color"><UserIcon /></n-icon>
        </div>
        <div class="hero-body">
          <span class="hero-greeting">{{ greeting }} 👋</span>
          <span class="hero-name" :style="{ color: heroColor.color }">{{ authStore.user?.name || 'Pelanggan' }}</span>
          <span class="hero-desc">ID: {{ profile.customer_code || '-' }}</span>
        </div>
        <div class="hero-status">
          <span class="status-badge" :style="{ background: statusConfig.bg, color: statusConfig.color }">
            <n-icon v-if="status === 'active'" size="12"><CheckIcon /></n-icon>
            <n-icon v-else size="12"><AlertCircleIcon /></n-icon>
            {{ statusConfig.label }}
          </span>
        </div>
      </div>

      <!-- ===== Info Cards ===== -->
      <div class="info-grid">
        <div
          v-for="(card, i) in infoCards"
          :key="i"
          class="info-card"
          :style="{ background: card.bg }"
        >
          <div class="info-icon-wrap" :style="{ background: card.iconBg }">
            <n-icon v-if="card.icon === 'bolt'" size="20" :color="card.color"><BoltIcon /></n-icon>
            <n-icon v-else-if="card.icon === 'monitor'" size="20" :color="card.color"><DeviceDesktopIcon /></n-icon>
            <n-icon v-else-if="card.icon === 'calendar'" size="20" :color="card.color"><CalendarIcon /></n-icon>
            <n-icon v-else-if="card.icon === 'user'" size="20" :color="card.color"><UsersIcon /></n-icon>
          </div>
          <div class="info-body">
            <span class="info-label">{{ card.label }}</span>
            <span class="info-value" :style="{ color: card.color }">{{ card.value }}</span>
            <span v-if="card.desc" class="info-desc">{{ card.desc }}</span>
          </div>
        </div>
      </div>

      <!-- ===== Stat Cards ===== -->
      <div class="stat-grid">
        <div
          v-for="(card, i) in statCards"
          :key="i"
          class="stat-card"
          :style="{ background: card.bg }"
          @click="card.route && router.push(card.route)"
        >
          <div class="stat-icon-wrap" :style="{ background: card.iconBg }">
            <n-icon v-if="card.icon === 'invoice'" size="20" :color="card.color"><FileInvoiceIcon /></n-icon>
            <n-icon v-else-if="card.icon === 'money'" size="20" :color="card.color"><CurrencyDollarIcon /></n-icon>
            <n-icon v-else-if="card.icon === 'chat'" size="20" :color="card.color"><MessageCircleIcon /></n-icon>
          </div>
          <div class="stat-body">
            <span class="stat-label">{{ card.label }}</span>
            <span class="stat-value" :style="{ color: card.color }">{{ card.value }}</span>
            <span class="stat-desc">{{ card.desc }}</span>
          </div>
        </div>
      </div>

      <!-- ===== Recent Invoices ===== -->
      <div class="section">
        <div class="section-header">
          <div class="section-title-group">
            <div class="section-icon">
              <n-icon size="15"><FileTextIcon /></n-icon>
            </div>
            <h3>Tagihan Terbaru</h3>
          </div>
          <button class="see-all-btn" @click="router.push('/portal/invoices')">
            Lihat Semua
            <n-icon size="14"><ArrowRightIcon /></n-icon>
          </button>
        </div>

        <div v-if="invoices.length === 0" class="empty-state">
          <n-icon size="40" style="opacity: 0.3"><CircleCheckIcon /></n-icon>
          <p>Tidak ada tagihan saat ini</p>
        </div>

        <div v-else class="invoice-list">
          <div
            v-for="inv in invoices" :key="inv.id"
            class="invoice-item"
            @click="router.push(`/portal/invoices/${inv.id}`)"
          >
            <div class="inv-left">
              <div class="inv-icon" :class="'inv-' + inv.status">
                <n-icon v-if="inv.status === 'paid'" size="18"><CircleCheckIcon /></n-icon>
                <n-icon v-else-if="inv.status === 'overdue'" size="18"><ClockIcon /></n-icon>
                <n-icon v-else size="18"><ClockIcon /></n-icon>
              </div>
              <div class="inv-info">
                <span class="inv-number">{{ inv.invoice_number || '#' + inv.id?.slice(0, 8) }}</span>
                <span class="inv-date">Jatuh tempo {{ formatDate(inv.due_date) }}</span>
              </div>
            </div>
            <div class="inv-right">
              <span class="inv-amount">{{ formatCurrency(inv.total_amount) }}</span>
              <n-tag :type="statusType(inv.status)" size="small" round>{{ inv.status === 'paid' ? 'Lunas' : inv.status === 'overdue' ? 'Lewat Tempo' : 'Belum Bayar' }}</n-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Quick Actions ===== -->
      <div class="section">
        <div class="section-title-group">
          <div class="section-icon">
            <n-icon size="15"><LayoutGridIcon /></n-icon>
          </div>
          <h3>Aksi Cepat</h3>
        </div>
        <div class="quick-actions">
          <div class="action-card" @click="router.push('/portal/invoices')">
            <div class="action-icon-wrap" :style="{ background: themeStore.isDark ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.1)' }">
              <n-icon size="20" :color="themeStore.isDark ? '#38bdf8' : '#0ea5e9'"><CreditCardIcon /></n-icon>
            </div>
            <div class="action-body">
              <span class="action-label">Bayar Tagihan</span>
              <span class="action-desc">Lunasi tagihan internet</span>
            </div>
          </div>
          <div class="action-card" @click="router.push('/portal/tickets/create')">
            <div class="action-icon-wrap" :style="{ background: themeStore.isDark ? 'rgba(129,140,248,0.15)' : 'rgba(99,102,241,0.1)' }">
              <n-icon size="20" :color="themeStore.isDark ? '#818cf8' : '#6366f1'"><MessageIcon /></n-icon>
            </div>
            <div class="action-body">
              <span class="action-label">Lapor Masalah</span>
              <span class="action-desc">Buat tiket bantuan baru</span>
            </div>
          </div>
          <div class="action-card" @click="router.push('/portal/profile')">
            <div class="action-icon-wrap" :style="{ background: themeStore.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)' }">
              <n-icon size="20" :color="themeStore.isDark ? '#4ade80' : '#22c55e'"><UserIcon /></n-icon>
            </div>
            <div class="action-body">
              <span class="action-label">Profil Saya</span>
              <span class="action-desc">Lihat info akun & koneksi</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </n-spin>
</template>

<style scoped>
.portal-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== Hero Card ===== */
.hero-card {
  border-radius: 12px;
  padding: 20px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

:root:not(.dark) .hero-card {
  border-color: rgba(0, 0, 0, 0.06);
}

:root.dark .hero-card {
  border-color: rgba(255, 255, 255, 0.06);
}

.hero-icon-wrap {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.hero-greeting {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.5;
}

.hero-name {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-desc {
  font-size: 12px;
  opacity: 0.4;
  font-family: 'SF Mono', 'Fira Code', monospace;
  margin-top: 1px;
}

.hero-status {
  flex-shrink: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 20px;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

/* ===== Info Grid ===== */
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.info-card {
  border-radius: 12px;
  padding: 18px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
  border: 1px solid transparent;
}

:root:not(.dark) .info-card {
  border-color: rgba(0, 0, 0, 0.06);
}

:root.dark .info-card {
  border-color: rgba(255, 255, 255, 0.06);
}

.info-card:hover {
  transform: translateY(-2px);
}

:root:not(.dark) .info-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

:root.dark .info-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.info-icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.5;
}

.info-value {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.3px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-desc {
  font-size: 11px;
  opacity: 0.35;
  margin-top: 1px;
}

/* ===== Stat Grid ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.stat-card {
  border-radius: 12px;
  padding: 18px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  border: 1px solid transparent;
}

:root:not(.dark) .stat-card {
  border-color: rgba(0, 0, 0, 0.06);
}

:root.dark .stat-card {
  border-color: rgba(255, 255, 255, 0.06);
}

.stat-card:hover {
  transform: translateY(-2px);
}

:root:not(.dark) .stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

:root.dark .stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.stat-icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.5;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-desc {
  font-size: 11px;
  opacity: 0.35;
  margin-top: 1px;
}

/* ===== Section ===== */
.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:root:not(.dark) .section-icon {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

:root.dark .section-icon {
  background: rgba(129, 140, 248, 0.12);
  color: #818cf8;
}

.section-title-group h3 {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
}

.see-all-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

:root:not(.dark) .see-all-btn {
  color: #6366f1;
}

:root.dark .see-all-btn {
  color: #818cf8;
}

:root:not(.dark) .see-all-btn:hover {
  background: rgba(99, 102, 241, 0.06);
}

:root.dark .see-all-btn:hover {
  background: rgba(129, 140, 248, 0.08);
}

/* ===== Invoice List ===== */
.invoice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invoice-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

:root:not(.dark) .invoice-item {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.04);
}

:root.dark .invoice-item {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.04);
}

.invoice-item:hover {
  transform: translateX(3px);
}

:root:not(.dark) .invoice-item:hover {
  background: rgba(0, 0, 0, 0.03);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

:root.dark .invoice-item:hover {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.inv-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.inv-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.inv-paid { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.inv-unpaid { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.inv-overdue { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.inv-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inv-number {
  font-size: 13px;
  font-weight: 600;
}

.inv-date {
  font-size: 11px;
  opacity: 0.45;
}

.inv-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}

.inv-amount {
  font-size: 14px;
  font-weight: 700;
}

/* ===== Quick Actions ===== */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

:root:not(.dark) .action-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.06);
}

:root.dark .action-card {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
}

.action-card:hover {
  transform: translateY(-2px);
}

:root:not(.dark) .action-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

:root.dark .action-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.action-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.action-label {
  font-size: 13px;
  font-weight: 700;
}

.action-desc {
  font-size: 11px;
  opacity: 0.35;
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  opacity: 0.6;
}

:root:not(.dark) .empty-state {
  background: rgba(0, 0, 0, 0.02);
  border: 1px dashed rgba(0, 0, 0, 0.08);
}

:root.dark .empty-state {
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.06);
}

.empty-state p {
  font-size: 13px;
  margin: 0;
}

/* ===== Responsive ===== */
@media (max-width: 1024px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .portal-dashboard {
    gap: 16px;
  }

  .hero-card {
    flex-wrap: wrap;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .info-card {
    padding: 14px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .info-icon-wrap {
    width: 36px;
    height: 36px;
  }

  .info-value {
    font-size: 14px;
  }

  .info-desc {
    display: none;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    flex-direction: row;
    align-items: flex-start;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .info-card {
    padding: 12px 10px;
  }

  .info-label {
    font-size: 10px;
  }

  .info-value {
    font-size: 13px;
  }

  .hero-name {
    font-size: 18px;
  }

  .hero-icon-wrap {
    width: 40px;
    height: 40px;
  }
}
</style>
