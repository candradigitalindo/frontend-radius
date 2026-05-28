<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NCard, NIcon, NSpin, NText, useMessage } from 'naive-ui'
import { Users as UsersIcon, Wifi, Ban, CurrencyDollar, CircleCheck, FileInvoice, Activity, Message, ChartBar, ChartPie, TrendingUp } from '@vicons/tabler'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { dashboardApi } from '../../api'
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'

use([CanvasRenderer, BarChart, LineChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent])

const themeStore = useThemeStore()
const authStore = useAuthStore()
const message = useMessage()
const loading = ref(true)

const iconMap: Record<string, any> = {
  people: UsersIcon,
  signal: Wifi,
  block: Ban,
  revenue: CurrencyDollar,
  check: CircleCheck,
  invoice: FileInvoice,
  session: Activity,
  ticket: Message,
}
const stats = ref<any>({})
const revenueData = ref<any[]>([])

const formatRupiah = (v: number) => {
  if (!v) return '0'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return v.toLocaleString('id-ID')
}

const formatFullRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID')

onMounted(async () => {
  // Ensure user is authenticated before making API calls
  if (!authStore.isAuthenticated) {
    message.warning('Sesi Anda telah habis. Silakan login kembali.')
    // Redirect to login page
    window.location.href = '/login'
    return
  }

  try {
    const [s, r] = await Promise.all([
      dashboardApi.stats().catch(err => {
        message.error('Gagal memuat statistik dashboard')
        throw err
      }),
      dashboardApi.rollingRevenue().catch(err => {
        message.error('Gagal memuat data pendapatan')
        throw err
      })
    ])
    stats.value = s.data?.data || s.data || {}
    revenueData.value = r.data?.data || []
  } catch (error: any) {
    if (error.response?.status === 401) {
      message.error('Autentikasi gagal. Silakan login kembali.')
      authStore.logout()
      window.location.href = '/login'
    }
  } finally {
    loading.value = false
  }
})

const statCards = computed(() => {
  const d = themeStore.isDark
  const s = stats.value
  return [
    {
      label: 'Total Pelanggan',
      value: s.total_customers || 0,
      icon: 'people',
      color: d ? '#60a5fa' : '#3b82f6',
      bg: d ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)',
      iconBg: d ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
      desc: 'Terdaftar di sistem',
    },
    {
      label: 'Pelanggan Aktif',
      value: s.active_customers || 0,
      icon: 'signal',
      color: '#22c55e',
      bg: d ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)',
      iconBg: d ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
      desc: 'Online & terhubung',
    },
    {
      label: 'Pelanggan Isolir',
      value: s.isolated_customers || 0,
      icon: 'block',
      color: '#f97316',
      bg: d ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.05)',
      iconBg: d ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.1)',
      desc: 'Layanan dinonaktifkan',
    },
    {
      label: 'Revenue Bulan Ini',
      value: formatFullRupiah(s.total_revenue || 0),
      icon: 'revenue',
      color: d ? '#a78bfa' : '#7c3aed',
      bg: d ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)',
      iconBg: d ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)',
      desc: 'Pendapatan periode ini',
    },
    {
      label: 'Invoice Lunas',
      value: s.paid_invoices || 0,
      icon: 'check',
      color: '#10b981',
      bg: d ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
      iconBg: d ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
      desc: 'Sudah dibayar',
    },
    {
      label: 'Invoice Belum Bayar',
      value: s.unpaid_invoices || 0,
      icon: 'invoice',
      color: '#ef4444',
      bg: d ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
      iconBg: d ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
      desc: 'Perlu penagihan',
    },
    {
      label: 'Sesi Aktif',
      value: s.active_sessions || 0,
      icon: 'session',
      color: d ? '#38bdf8' : '#0ea5e9',
      bg: d ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.05)',
      iconBg: d ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.1)',
      desc: 'Koneksi RADIUS',
    },
    {
      label: 'Tiket Terbuka',
      value: s.open_tickets || 0,
      icon: 'ticket',
      color: d ? '#fbbf24' : '#d97706',
      bg: d ? 'rgba(217,119,6,0.08)' : 'rgba(217,119,6,0.05)',
      iconBg: d ? 'rgba(217,119,6,0.15)' : 'rgba(217,119,6,0.1)',
      desc: 'Perlu ditangani',
    },
  ]
})

const monthLabels = computed(() => revenueData.value.map((d: any) => d.month_label || ''))

const revenueChartOption = () => {
  const dark = themeStore.isDark
  const labels = monthLabels.value
  const revValues = revenueData.value.map((d: any) => d.revenue || 0)
  const expValues = revenueData.value.map((d: any) => d.expenses || 0)
  const textColor = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: dark ? '#1e1e2e' : '#ffffff',
      borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
      textStyle: { color: dark ? '#e2e8f0' : '#374151', fontSize: 12 },
      formatter: (params: any) => {
        let html = `<div style="font-weight:600;margin-bottom:4px">${params[0].name}</div>`
        params.forEach((p: any) => {
          html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
            ${p.seriesName}: <b>Rp ${(p.value || 0).toLocaleString('id-ID')}</b>
          </div>`
        })
        return html
      },
    },
    legend: {
      bottom: 0, left: 'center',
      textStyle: { color: textColor, fontSize: 11 },
      itemWidth: 12, itemHeight: 8, itemGap: 20,
    },
    xAxis: {
      type: 'category', data: labels, boundaryGap: true,
      axisLine: { lineStyle: { color: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' } },
      axisLabel: { color: textColor, fontSize: 11, rotate: labels.length > 6 ? 30 : 0 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: formatRupiah,
        color: textColor, fontSize: 11,
      },
      splitLine: { lineStyle: { color: dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Revenue', type: 'bar', data: revValues, barMaxWidth: 24, barGap: '20%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: dark ? '#818cf8' : '#6366f1' },
            { offset: 1, color: dark ? 'rgba(129,140,248,0.15)' : 'rgba(99,102,241,0.15)' },
          ]},
        },
      },
      {
        name: 'Pengeluaran', type: 'bar', data: expValues, barMaxWidth: 24,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: dark ? '#f87171' : '#ef4444' },
            { offset: 1, color: dark ? 'rgba(248,113,113,0.15)' : 'rgba(239,68,68,0.15)' },
          ]},
        },
      },
    ],
    grid: { left: 50, right: 12, top: 12, bottom: 40, containLabel: false },
    animationDuration: 600,
    animationEasing: 'cubicOut' as const,
  }
}

const customerPieOption = () => {
  const dark = themeStore.isDark
  const s = stats.value
  const total = (s.active_customers || 0) + (s.isolated_customers || 0)
  const inactive = (s.total_customers || 0) - total
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: dark ? '#1e1e2e' : '#ffffff',
      borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
      textStyle: { color: dark ? '#e2e8f0' : '#374151', fontSize: 12 },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 0, left: 'center', orient: 'horizontal',
      textStyle: { color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', fontSize: 11 },
      itemWidth: 10, itemHeight: 10, itemGap: 16,
    },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 13, fontWeight: 'bold', color: dark ? '#f1f5f9' : '#111827' },
        scaleSize: 5,
      },
      data: [
        { value: s.active_customers || 0, name: 'Aktif', itemStyle: { color: '#22c55e' } },
        { value: s.isolated_customers || 0, name: 'Isolir', itemStyle: { color: '#f97316' } },
        ...(inactive > 0 ? [{ value: inactive, name: 'Nonaktif', itemStyle: { color: dark ? '#475569' : '#94a3b8' } }] : []),
      ],
    }],
    animationDuration: 600,
  }
}

const revenueChartOptionComputed = computed(() => revenueChartOption())
const customerPieOptionComputed = computed(() => customerPieOption())
const profitChartOptionComputed = computed(() => profitChartOption())

const profitChartOption = () => {
  const dark = themeStore.isDark
  const labels = monthLabels.value
  const revValues = revenueData.value.map((d: any) => d.revenue || 0)
  const expValues = revenueData.value.map((d: any) => d.expenses || 0)
  const profitValues = revValues.map((r: number, i: number) => r - expValues[i])
  const textColor = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: dark ? '#1e1e2e' : '#ffffff',
      borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
      textStyle: { color: dark ? '#e2e8f0' : '#374151', fontSize: 12 },
      formatter: (params: any) => {
        const p = params[0]
        const color = p.value >= 0 ? '#22c55e' : '#ef4444'
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
          <span style="color:${color}"><b>Rp ${(p.value || 0).toLocaleString('id-ID')}</b></span>`
      },
    },
    xAxis: {
      type: 'category', data: labels, boundaryGap: false,
      axisLine: { lineStyle: { color: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' } },
      axisLabel: { color: textColor, fontSize: 11, rotate: labels.length > 6 ? 30 : 0 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: formatRupiah,
        color: textColor, fontSize: 11,
      },
      splitLine: { lineStyle: { color: dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      name: 'Profit', type: 'line', data: profitValues, smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { width: 2.5, color: '#22c55e' },
      itemStyle: { color: '#22c55e', borderWidth: 2 },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: dark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)' },
          { offset: 1, color: 'rgba(34,197,94,0)' },
        ]},
      },
    }],
    grid: { left: 50, right: 12, top: 12, bottom: 28, containLabel: false },
    animationDuration: 600,
  }
}
</script>

<template>
  <n-spin :show="loading">
    <div class="dashboard">
      <!-- Stat Cards -->
      <div class="stat-grid">
        <div
          v-for="(card, i) in statCards"
          :key="i"
          class="stat-card"
          :style="{ background: card.bg }"
        >
          <div class="stat-icon-wrap" :style="{ background: card.iconBg }">
            <n-icon :component="iconMap[card.icon]" :size="20" :color="card.color" />
          </div>
          <div class="stat-body">
            <span class="stat-label">{{ card.label }}</span>
            <span class="stat-value" :style="{ color: card.color }">{{ card.value }}</span>
            <span class="stat-desc">{{ card.desc }}</span>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="chart-grid">
        <!-- Revenue vs Expenses -->
        <n-card class="chart-card" size="small">
          <template #header>
            <div class="chart-header">
              <div class="chart-icon-wrap chart-icon-purple">
                <n-icon :component="ChartBar" :size="15" />
              </div>
              <div>
                <n-text style="font-size: 13px; font-weight: 600">Revenue vs Pengeluaran</n-text>
                <n-text depth="3" style="font-size: 11px; display: block">12 bulan terakhir</n-text>
              </div>
            </div>
          </template>
          <v-chart :option="revenueChartOptionComputed" autoresize style="height: 280px" />
        </n-card>

        <!-- Customer Pie -->
        <n-card class="chart-card" size="small">
          <template #header>
            <div class="chart-header">
              <div class="chart-icon-wrap chart-icon-green">
                <n-icon :component="ChartPie" :size="15" />
              </div>
              <div>
                <n-text style="font-size: 13px; font-weight: 600">Status Pelanggan</n-text>
                <n-text depth="3" style="font-size: 11px; display: block">Distribusi status langganan</n-text>
              </div>
            </div>
          </template>
          <v-chart :option="customerPieOptionComputed" autoresize style="height: 280px" />
        </n-card>

        <!-- Profit Trend -->
        <n-card class="chart-card chart-card-full" size="small">
          <template #header>
            <div class="chart-header">
              <div class="chart-icon-wrap chart-icon-emerald">
                <n-icon :component="TrendingUp" :size="15" />
              </div>
              <div>
                <n-text style="font-size: 13px; font-weight: 600">Tren Profit</n-text>
                <n-text depth="3" style="font-size: 11px; display: block">Revenue - Pengeluaran (12 bulan terakhir)</n-text>
              </div>
            </div>
          </template>
          <v-chart :option="profitChartOptionComputed" autoresize style="height: 240px" />
        </n-card>
      </div>
    </div>
  </n-spin>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== Stat Cards ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.stat-card {
  border-radius: 12px;
  padding: 18px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
  border: 1px solid transparent;
}

:root:not(.dark) .stat-card {
  border-color: rgba(0, 0, 0, 0.12);
}

:root.dark .stat-card {
  border-color: rgba(255, 255, 255, 0.12);
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

/* ===== Charts ===== */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.chart-card {
  border-radius: 12px !important;
  overflow: hidden;
}

:root:not(.dark) .chart-card {
  border-color: rgba(0, 0, 0, 0.06) !important;
}

:root.dark .chart-card {
  border-color: rgba(255, 255, 255, 0.06) !important;
}

.chart-card-full {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chart-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chart-icon-purple {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

:root.dark .chart-icon-purple {
  background: rgba(129, 140, 248, 0.12);
  color: #818cf8;
}

.chart-icon-green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

:root.dark .chart-icon-green {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
}

.chart-icon-emerald {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

:root.dark .chart-icon-emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}

/* ===== Tablet ===== */
@media (max-width: 1200px) {
  .stat-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .stat-card {
    padding: 14px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .stat-icon-wrap {
    width: 36px;
    height: 36px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-desc {
    display: none;
  }
}

@media (max-width: 1024px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-card {
    flex-direction: row;
    align-items: flex-start;
  }

  .stat-desc {
    display: block;
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== Mobile ===== */
@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stat-card {
    padding: 12px 10px;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .stat-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .stat-icon-wrap svg {
    width: 16px;
    height: 16px;
  }

  .stat-label {
    font-size: 10px;
  }

  .stat-value {
    font-size: 17px;
  }

  .stat-desc {
    display: none;
  }
}

@media (max-width: 380px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
  }

  .stat-desc {
    display: block;
  }
}
</style>
