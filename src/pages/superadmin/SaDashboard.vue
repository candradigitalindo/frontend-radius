<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NCard, NSpin, NText, NIcon } from 'naive-ui'
import { Building, Users, Wifi, CurrencyDollar } from '@vicons/tabler'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { adminApi } from '../../api'
import { useThemeStore } from '../../stores/theme'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent])

const themeStore = useThemeStore()
const loading = ref(true)
const stats = ref<any>({})
const revenueData = ref<any[]>([])
const subRevenueData = ref<any[]>([])

const formatRupiah = (v: number) => {
  if (!v) return '0'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return v.toLocaleString('id-ID')
}

const formatFullRupiah = (v: number) => 'Rp ' + (v || 0).toLocaleString('id-ID')

onMounted(async () => {
  try {
    const [d, r, s] = await Promise.all([
      adminApi.dashboard(),
      adminApi.rollingRevenue(),
      adminApi.subscriptionRevenue(),
    ])
    stats.value = d.data?.data || d.data || {}
    revenueData.value = r.data?.data || []
    subRevenueData.value = s.data?.data || []
  } catch { /* ignore */ }
  loading.value = false
})

const statCards = computed(() => {
  const d = themeStore.isDark
  const s = stats.value
  return [
    {
      label: 'Total Tenant',
      value: s.total_tenants || 0,
      icon: 'building',
      color: d ? '#60a5fa' : '#3b82f6',
      bg: d ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)',
      iconBg: d ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
      desc: `${s.active_tenants || 0} aktif`,
    },
    {
      label: 'Total Pelanggan',
      value: s.total_customers || 0,
      icon: 'users',
      color: '#22c55e',
      bg: d ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)',
      iconBg: d ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
      desc: `${s.active_customers || 0} aktif`,
    },
    {
      label: 'Total Router',
      value: s.total_routers || 0,
      icon: 'wifi',
      color: '#f97316',
      bg: d ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.05)',
      iconBg: d ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.1)',
      desc: `${s.online_routers || 0} online`,
    },
    {
      label: 'Revenue Bulan Ini',
      value: formatFullRupiah(s.total_revenue || 0),
      icon: 'revenue',
      color: d ? '#a78bfa' : '#7c3aed',
      bg: d ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)',
      iconBg: d ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)',
      desc: 'Semua tenant',
    },
  ]
})

const iconMap: Record<string, any> = {
  building: Building,
  users: Users,
  wifi: Wifi,
  revenue: CurrencyDollar,
}

const revenueLabels = computed(() => revenueData.value.map((d: any) => d.month_label || ''))
const subLabels = computed(() => subRevenueData.value.map((d: any) => d.month_label || ''))

const revenueChartOption = computed(() => {
  const dark = themeStore.isDark
  const labels = revenueLabels.value
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
      axisLabel: { color: textColor, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: formatRupiah, color: textColor, fontSize: 11 },
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
})

const subChartOption = computed(() => {
  const dark = themeStore.isDark
  const labels = subLabels.value
  const values = subRevenueData.value.map((d: any) => d.revenue || 0)
  const textColor = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: dark ? '#1e1e2e' : '#ffffff',
      borderColor: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
      textStyle: { color: dark ? '#e2e8f0' : '#374151', fontSize: 12 },
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
          <div><b>Rp ${(p.value || 0).toLocaleString('id-ID')}</b></div>`
      },
    },
    xAxis: {
      type: 'category', data: labels, boundaryGap: true,
      axisLine: { lineStyle: { color: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' } },
      axisLabel: { color: textColor, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: formatRupiah, color: textColor, fontSize: 11 },
      splitLine: { lineStyle: { color: dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Pendapatan Subscribe', type: 'bar', data: values, barMaxWidth: 28,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: dark ? '#34d399' : '#10b981' },
            { offset: 1, color: dark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.15)' },
          ]},
        },
      },
    ],
    grid: { left: 50, right: 12, top: 12, bottom: 28, containLabel: false },
    animationDuration: 600,
    animationEasing: 'cubicOut' as const,
  }
})

const tenantStats = computed(() => stats.value?.tenant_stats || [])
</script>

<template>
  <n-spin :show="loading">
    <div class="sa-dashboard">
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

      <!-- Revenue Charts — 2 columns -->
      <div class="chart-grid">
        <!-- Global Revenue -->
        <n-card class="chart-card" size="small">
          <template #header>
            <div class="chart-header">
              <div class="chart-icon-wrap chart-icon-purple">
                <n-icon :component="CurrencyDollar" :size="15" />
              </div>
              <div>
                <n-text style="font-size: 13px; font-weight: 600">Pendapatan Global</n-text>
                <n-text depth="3" style="font-size: 11px; display: block">Revenue vs Pengeluaran — 6 bulan terakhir (semua tenant)</n-text>
              </div>
            </div>
          </template>
          <v-chart :option="revenueChartOption" autoresize style="height: 280px" />
        </n-card>

        <!-- Subscription Revenue -->
        <n-card class="chart-card" size="small">
          <template #header>
            <div class="chart-header">
              <div class="chart-icon-wrap chart-icon-emerald">
                <n-icon :component="CurrencyDollar" :size="15" />
              </div>
              <div>
                <n-text style="font-size: 13px; font-weight: 600">Pendapatan Subscribe</n-text>
                <n-text depth="3" style="font-size: 11px; display: block">Pembayaran subscription tenant — 6 bulan terakhir</n-text>
              </div>
            </div>
          </template>
          <v-chart :option="subChartOption" autoresize style="height: 280px" />
        </n-card>
      </div>

      <!-- Tenant List -->
      <n-card class="chart-card" size="small">
        <template #header>
          <div class="chart-header">
            <div class="chart-icon-wrap chart-icon-blue">
              <n-icon :component="Building" :size="15" />
            </div>
            <div>
              <n-text style="font-size: 13px; font-weight: 600">Daftar Tenant</n-text>
              <n-text depth="3" style="font-size: 11px; display: block">{{ tenantStats.length }} tenant terdaftar</n-text>
            </div>
          </div>
        </template>
        <div v-if="tenantStats.length === 0" style="text-align: center; color: #999; padding: 32px">Belum ada tenant</div>
        <div v-for="t in tenantStats.slice(0, 10)" :key="t.tenant_id" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(128,128,128,0.1)">
          <div>
            <strong>{{ t.tenant_name }}</strong>
            <div style="font-size: 12px; opacity: 0.5">{{ t.slug }} · {{ t.plan }}</div>
          </div>
          <div style="display: flex; gap: 16px; font-size: 12px; opacity: 0.6">
            <span>{{ t.total_customers }} pelanggan</span>
            <span>{{ t.total_routers }} router</span>
            <span :style="{ color: t.is_active ? '#22c55e' : '#ef4444' }">{{ t.is_active ? 'Aktif' : 'Nonaktif' }}</span>
          </div>
        </div>
      </n-card>
    </div>
  </n-spin>
</template>

<style scoped>
.sa-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.chart-icon-emerald {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

:root.dark .chart-icon-emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}

.chart-icon-blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

:root.dark .chart-icon-blue {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
}

@media (max-width: 1024px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .chart-grid {
    grid-template-columns: 1fr;
  }
}

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
  }
  .stat-value {
    font-size: 17px;
  }
}
</style>