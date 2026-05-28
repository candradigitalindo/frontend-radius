<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  NCard, NGrid, NGridItem, NStatistic, NButton, NSpace, NSelect,
  NTabs, NTabPane, NDataTable, NProgress, NText, NSpin, useMessage,
} from 'naive-ui'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { reportApi } from '../../api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

use([CanvasRenderer, BarChart, LineChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent])

const message = useMessage()
const loading = ref(true)
const activeTab = ref('revenue')

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const yearOptions = Array.from({ length: 5 }, (_, i) => {
  const y = now.getFullYear() - i
  return { label: String(y), value: y }
})
const monthOptions = monthNames.map((m, i) => ({ label: m, value: i + 1 }))

const revenueData = ref<any[]>([])
const customerGrowth = ref<any[]>([])
const paymentBreakdown = ref<any[]>([])
const collectionRate = ref<any>({})
const profitLoss = ref<any>({})
const voucherSales = ref<any>({})

function fmt(v: number) { return 'Rp ' + (v || 0).toLocaleString('id-ID') }
function fmtNum(v: number) { return (v || 0).toLocaleString('id-ID') }

// Aggregated stats from yearly revenue data
const totalRevenue = computed(() => revenueData.value.reduce((s, r) => s + (r.revenue || 0), 0))
const totalExpenses = computed(() => revenueData.value.reduce((s, r) => s + (r.expenses || 0), 0))
const totalProfit = computed(() => revenueData.value.reduce((s, r) => s + (r.profit || 0), 0))
const totalInvoicesPaid = computed(() => revenueData.value.reduce((s, r) => s + (r.invoices_paid || 0), 0))
const totalInvoices = computed(() => revenueData.value.reduce((s, r) => s + (r.invoices_total || 0), 0))

// --- Revenue Chart ---
const revenueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: any) => {
      let tip = `<b>${params[0].axisValue}</b>`
      for (const p of params) {
        tip += `<br/>${p.marker} ${p.seriesName}: <b>${fmt(p.value)}</b>`
      }
      return tip
    },
  },
  legend: { data: ['Revenue', 'Expenses', 'Profit'], top: 0 },
  grid: { left: 80, right: 20, bottom: 30, top: 40 },
  xAxis: { type: 'category', data: monthNames, axisTick: { alignWithLabel: true } },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + 'jt' : v >= 1_000 ? (v / 1_000).toFixed(0) + 'rb' : String(v) },
  },
  series: [
    { name: 'Revenue', type: 'bar', data: revenueData.value.map(r => r.revenue), itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] }, barGap: '30%' },
    { name: 'Expenses', type: 'bar', data: revenueData.value.map(r => r.expenses), itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }, barGap: '30%' },
    { name: 'Profit', type: 'line', data: revenueData.value.map(r => r.profit), itemStyle: { color: '#3b82f6' }, smooth: true },
  ],
}))

// --- Customer Growth Chart ---
const growthChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['Aktif', 'Baru', 'Churn'], top: 0 },
  grid: { left: 60, right: 20, bottom: 30, top: 40 },
  xAxis: { type: 'category', data: monthNames, axisTick: { alignWithLabel: true } },
  yAxis: { type: 'value' },
  series: [
    { name: 'Aktif', type: 'line', data: customerGrowth.value.map(r => r.total_active), itemStyle: { color: '#3b82f6' }, smooth: true, areaStyle: { opacity: 0.1 } },
    { name: 'Baru', type: 'bar', data: customerGrowth.value.map(r => r.new_joined), itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] }, barGap: '30%' },
    { name: 'Churn', type: 'bar', data: customerGrowth.value.map(r => r.churned), itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }, barGap: '30%' },
  ],
}))

// --- Payment Pie Chart ---
const paymentPieOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ${fmt(p.value)} (${p.percent}%)` },
  legend: { orient: 'vertical', left: 'left' },
  series: [{
    type: 'pie', radius: ['40%', '70%'],
    data: paymentBreakdown.value.map(p => ({ name: p.method, value: p.amount })),
    emphasis: { itemStyle: { shadowBlur: 10 } },
  }],
}))

// --- Collection Rate Pie ---
const collectionPieOption = computed(() => {
  const c = collectionRate.value
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: [
        { name: 'Tepat Waktu', value: c.paid_on_time || 0, itemStyle: { color: '#22c55e' } },
        { name: 'Terlambat', value: c.paid_late || 0, itemStyle: { color: '#f59e0b' } },
        { name: 'Belum Bayar', value: c.unpaid || 0, itemStyle: { color: '#ef4444' } },
      ],
    }],
  }
})

// --- Revenue Table ---
const revenueCols = [
  { title: 'Bulan', key: 'month', render: (r: any) => monthNames[(r.month || 1) - 1] },
  { title: 'Revenue', key: 'revenue', render: (r: any) => fmt(r.revenue) },
  { title: 'Expenses', key: 'expenses', render: (r: any) => fmt(r.expenses) },
  { title: 'Profit', key: 'profit', render: (r: any) => fmt(r.profit) },
  { title: 'Invoice Lunas', key: 'invoices_paid' },
  { title: 'Total Invoice', key: 'invoices_total' },
]

// --- Customer Growth Table ---
const growthCols = [
  { title: 'Bulan', key: 'month', render: (r: any) => monthNames[(r.month || 1) - 1] },
  { title: 'Baru', key: 'new_joined' },
  { title: 'Aktif', key: 'total_active' },
  { title: 'Total', key: 'total_all' },
  { title: 'Churn', key: 'churned' },
  { title: 'Net', key: 'net', render: (r: any) => (r.new_joined || 0) - (r.churned || 0) },
]

// --- Payment Table ---
const paymentCols = [
  { title: 'Metode', key: 'method' },
  { title: 'Jumlah Transaksi', key: 'count' },
  { title: 'Total', key: 'amount', render: (r: any) => fmt(r.amount) },
]

// --- Voucher Gateway Table ---
const voucherGatewayCols = [
  { title: 'Gateway', key: 'method' },
  { title: 'Transaksi', key: 'count' },
  { title: 'Total', key: 'amount', render: (r: any) => fmt(r.amount) },
]

async function fetchYearlyData() {
  const yearParams = { year: selectedYear.value }
  const [revRes, growthRes] = await Promise.all([
    reportApi.revenue(yearParams).catch(() => ({ data: { data: [] } })),
    reportApi.customers(yearParams).catch(() => ({ data: { data: [] } })),
  ])
  revenueData.value = revRes.data?.data || []
  customerGrowth.value = growthRes.data?.data || []
}

async function fetchMonthlyData() {
  const monthParams = { month: selectedMonth.value, year: selectedYear.value }
  const [payRes, colRes, plRes, vRes] = await Promise.all([
    reportApi.payments(monthParams).catch(() => ({ data: { data: [] } })),
    reportApi.collectionRate(monthParams).catch(() => ({ data: {} })),
    reportApi.profitLoss(monthParams).catch(() => ({ data: {} })),
    reportApi.vouchers(monthParams).catch(() => ({ data: {} })),
  ])
  paymentBreakdown.value = payRes.data?.data || []
  collectionRate.value = colRes.data || {}
  profitLoss.value = plRes.data || {}
  voucherSales.value = vRes.data || {}
}

async function fetchAll() {
  loading.value = true
  try {
    await Promise.all([fetchYearlyData(), fetchMonthlyData()])
  } catch { message.error('Gagal memuat laporan') }
  loading.value = false
}

function exportPDF() {
  const doc = new jsPDF()
  const monthLabel = monthNames[selectedMonth.value - 1]
  const title = `Laporan Revenue ${monthLabel} ${selectedYear.value}`

  doc.setFontSize(16)
  doc.text(title, 14, 20)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString('id-ID')}`, 14, 28)

  // Revenue table
  const revRows = revenueData.value.map((r: any) => [
    monthNames[(r.month || 1) - 1],
    `Rp ${(r.revenue || 0).toLocaleString('id-ID')}`,
    `Rp ${(r.expenses || 0).toLocaleString('id-ID')}`,
    `Rp ${(r.profit || 0).toLocaleString('id-ID')}`,
    String(r.invoices_paid || 0),
    String(r.invoices_total || 0),
  ])

  autoTable(doc, {
    head: [['Bulan', 'Revenue', 'Expenses', 'Profit', 'Invoice Lunas', 'Total Invoice']],
    body: revRows,
    startY: 34,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 131, 143] },
  })

  // Customer growth table
  const growthRows = customerGrowth.value.map((r: any) => [
    monthNames[(r.month || 1) - 1],
    String(r.new_joined || 0),
    String(r.total_active || 0),
    String(r.total_all || 0),
    String(r.churned || 0),
    String((r.new_joined || 0) - (r.churned || 0)),
  ])

  const y = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.text('Pertumbuhan Pelanggan', 14, y)
  autoTable(doc, {
    head: [['Bulan', 'Baru', 'Aktif', 'Total', 'Churn', 'Net']],
    body: growthRows,
    startY: y + 4,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 131, 143] },
  })

  doc.save(`laporan-revenue-${selectedYear.value}.pdf`)
  message.success('PDF berhasil diunduh')
}

function exportExcel() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Revenue
  const revData = [
    ['Bulan', 'Revenue', 'Expenses', 'Profit', 'Invoice Lunas', 'Total Invoice'],
    ...revenueData.value.map((r: any) => [
      monthNames[(r.month || 1) - 1],
      r.revenue || 0,
      r.expenses || 0,
      r.profit || 0,
      r.invoices_paid || 0,
      r.invoices_total || 0,
    ]),
  ]
  const revSheet = XLSX.utils.aoa_to_sheet(revData)
  XLSX.utils.book_append_sheet(wb, revSheet, 'Revenue')

  // Sheet 2: Customer Growth
  const growthData = [
    ['Bulan', 'Baru', 'Aktif', 'Total', 'Churn', 'Net'],
    ...customerGrowth.value.map((r: any) => [
      monthNames[(r.month || 1) - 1],
      r.new_joined || 0,
      r.total_active || 0,
      r.total_all || 0,
      r.churned || 0,
      (r.new_joined || 0) - (r.churned || 0),
    ]),
  ]
  const growthSheet = XLSX.utils.aoa_to_sheet(growthData)
  XLSX.utils.book_append_sheet(wb, growthSheet, 'Pertumbuhan Pelanggan')

  // Sheet 3: Payment Breakdown
  const payData = [
    ['Metode', 'Jumlah Transaksi', 'Total'],
    ...paymentBreakdown.value.map((p: any) => [p.method, p.count || 0, p.amount || 0]),
  ]
  const paySheet = XLSX.utils.aoa_to_sheet(payData)
  XLSX.utils.book_append_sheet(wb, paySheet, 'Pembayaran')

  // Sheet 4: Voucher
  const vocRows = (voucherSales.value.by_gateway || []).map((g: any) => [g.method, g.count || 0, g.amount || 0])
  const vocData = [
    ['Gateway', 'Transaksi', 'Total'],
    ...vocRows,
    [],
    ['Total Terjual', voucherSales.value.total_sold || 0, ''],
    ['Total Pendapatan', '', voucherSales.value.total_amount || 0],
  ]
  const vocSheet = XLSX.utils.aoa_to_sheet(vocData)
  XLSX.utils.book_append_sheet(wb, vocSheet, 'Voucher')

  XLSX.writeFile(wb, `laporan-lengkap-${selectedYear.value}.xlsx`)
  message.success('Excel berhasil diunduh')
}

async function handleExport(type: string) {
  try {
    if (type === 'pdf') {
      exportPDF()
    } else {
      exportExcel()
    }
  } catch {
    message.error('Gagal export, coba lagi nanti')
  }
}

watch(selectedYear, fetchAll)
watch(selectedMonth, fetchMonthlyData)
onMounted(fetchAll)

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
window.addEventListener('resize', onResize)
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)
</script>

<template>
  <n-spin :show="loading">
    <n-space vertical :size="16">
      <!-- Header + Filters -->
      <n-card title="Laporan">
        <template #header-extra>
          <n-space align="center" wrap :size="8">
            <n-select v-model:value="selectedYear" :options="yearOptions" style="width: 100px" size="small" />
            <n-select v-model:value="selectedMonth" :options="monthOptions" style="width: 90px" size="small" />
            <n-button size="small" @click="handleExport('pdf')">{{ isMobile ? 'PDF' : 'Export PDF' }}</n-button>
            <n-button size="small" @click="handleExport('excel')">{{ isMobile ? 'Excel' : 'Export Excel' }}</n-button>
          </n-space>
        </template>

        <!-- Summary Cards (Yearly Aggregated) -->
        <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
          <n-grid-item span="4 s:2 m:1"><n-statistic label="Total Revenue" :value="fmt(totalRevenue)" /></n-grid-item>
          <n-grid-item span="4 s:2 m:1"><n-statistic label="Total Expenses" :value="fmt(totalExpenses)" /></n-grid-item>
          <n-grid-item span="4 s:2 m:1"><n-statistic label="Profit Bersih" :value="fmt(totalProfit)" /></n-grid-item>
          <n-grid-item span="4 s:2 m:1"><n-statistic label="Invoice Lunas" :value="`${fmtNum(totalInvoicesPaid)} / ${fmtNum(totalInvoices)}`" /></n-grid-item>
        </n-grid>
      </n-card>

      <!-- Tabs -->
      <n-card>
        <n-tabs v-model:value="activeTab" type="line">
          <!-- Revenue Tab -->
          <n-tab-pane name="revenue" tab="Revenue">
            <n-space vertical :size="16">
              <div :style="{ height: isMobile ? '250px' : '350px' }">
                <v-chart :option="revenueChartOption" autoresize />
              </div>
              <n-data-table v-if="isDesktop" :columns="revenueCols" :data="revenueData" :bordered="false" size="small" />
              <div v-else class="report-cards">
                <n-card v-for="r in revenueData" :key="r.month" size="small">
                  <div class="rc-title">{{ monthNames[(r.month || 1) - 1] }}</div>
                  <div class="rc-grid">
                    <span class="rc-label">Revenue</span><span class="rc-value" style="color:#22c55e">{{ fmt(r.revenue) }}</span>
                    <span class="rc-label">Expenses</span><span class="rc-value" style="color:#ef4444">{{ fmt(r.expenses) }}</span>
                    <span class="rc-label">Profit</span><span class="rc-value" style="color:#3b82f6">{{ fmt(r.profit) }}</span>
                    <span class="rc-label">Invoice Lunas</span><span class="rc-value">{{ r.invoices_paid }} / {{ r.invoices_total }}</span>
                  </div>
                </n-card>
              </div>
            </n-space>
          </n-tab-pane>

          <!-- Customer Growth Tab -->
          <n-tab-pane name="growth" :tab="isMobile ? 'Pelanggan' : 'Pertumbuhan Pelanggan'">
            <n-space vertical :size="16">
              <div :style="{ height: isMobile ? '250px' : '350px' }">
                <v-chart :option="growthChartOption" autoresize />
              </div>
              <n-data-table v-if="isDesktop" :columns="growthCols" :data="customerGrowth" :bordered="false" size="small" />
              <div v-else class="report-cards">
                <n-card v-for="r in customerGrowth" :key="r.month" size="small">
                  <div class="rc-title">{{ monthNames[(r.month || 1) - 1] }}</div>
                  <div class="rc-grid">
                    <span class="rc-label">Baru</span><span class="rc-value" style="color:#22c55e">{{ r.new_joined }}</span>
                    <span class="rc-label">Aktif</span><span class="rc-value" style="color:#3b82f6">{{ r.total_active }}</span>
                    <span class="rc-label">Total</span><span class="rc-value">{{ r.total_all }}</span>
                    <span class="rc-label">Churn</span><span class="rc-value" style="color:#ef4444">{{ r.churned }}</span>
                    <span class="rc-label">Net</span><span class="rc-value">{{ (r.new_joined || 0) - (r.churned || 0) }}</span>
                  </div>
                </n-card>
              </div>
            </n-space>
          </n-tab-pane>

          <!-- Payment Breakdown Tab -->
          <n-tab-pane name="payments" :tab="isMobile ? 'Pembayaran' : `Pembayaran (${monthNames[selectedMonth - 1]})`">
            <n-space vertical :size="16">
              <div :style="{ height: isMobile ? '220px' : '300px' }">
                <v-chart :option="paymentPieOption" autoresize />
              </div>
              <n-data-table v-if="isDesktop" :columns="paymentCols" :data="paymentBreakdown" :bordered="false" size="small" />
              <div v-else class="report-cards">
                <n-card v-for="p in paymentBreakdown" :key="p.method" size="small">
                  <div class="rc-title">{{ p.method }}</div>
                  <div class="rc-grid">
                    <span class="rc-label">Jumlah Transaksi</span><span class="rc-value">{{ p.count }}</span>
                    <span class="rc-label">Total</span><span class="rc-value">{{ fmt(p.amount) }}</span>
                  </div>
                </n-card>
              </div>
            </n-space>
          </n-tab-pane>

          <!-- Collection Rate Tab -->
          <n-tab-pane name="collection" :tab="isMobile ? 'Koleksi' : `Tingkat Koleksi (${monthNames[selectedMonth - 1]})`">
            <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
              <n-grid-item span="3 m:1">
                <n-card size="small">
                  <n-statistic label="Collection Rate">
                    <template #default>
                      <n-text :type="(collectionRate.collection_rate || 0) >= 80 ? 'success' : 'warning'" strong>
                        {{ (collectionRate.collection_rate || 0).toFixed(1) }}%
                      </n-text>
                    </template>
                  </n-statistic>
                  <n-progress type="line" :percentage="Math.round(collectionRate.collection_rate || 0)" :indicator-placement="'inside'" status="success" style="margin-top: 8px" />
                  <n-text depth="3" style="font-size: 12px; margin-top: 4px; display: block">
                    {{ fmtNum(collectionRate.paid_invoices || 0) }} / {{ fmtNum(collectionRate.total_invoices || 0) }} invoice lunas
                  </n-text>
                </n-card>
              </n-grid-item>
              <n-grid-item span="3 m:1">
                <n-card size="small">
                  <n-statistic label="On-Time Rate">
                    <template #default>
                      <n-text :type="(collectionRate.on_time_rate || 0) >= 70 ? 'success' : 'error'" strong>
                        {{ (collectionRate.on_time_rate || 0).toFixed(1) }}%
                      </n-text>
                    </template>
                  </n-statistic>
                  <n-progress type="line" :percentage="Math.round(collectionRate.on_time_rate || 0)" :indicator-placement="'inside'" status="info" style="margin-top: 8px" />
                  <n-text depth="3" style="font-size: 12px; margin-top: 4px; display: block">
                    {{ fmtNum(collectionRate.paid_on_time || 0) }} tepat waktu dari {{ fmtNum(collectionRate.paid_invoices || 0) }} lunas
                  </n-text>
                </n-card>
              </n-grid-item>
              <n-grid-item span="3 m:1">
                <n-card size="small">
                  <n-statistic label="Total Terkumpul" :value="fmt(collectionRate.total_collected || 0)" />
                  <n-text depth="3" style="font-size: 12px; margin-top: 4px; display: block">
                    dari {{ fmt(collectionRate.total_billed || 0) }} total tagihan
                  </n-text>
                </n-card>
              </n-grid-item>
            </n-grid>
            <div :style="{ height: isMobile ? '220px' : '300px', marginTop: '16px' }">
              <v-chart :option="collectionPieOption" autoresize />
            </div>
          </n-tab-pane>

          <!-- Profit & Loss Tab -->
          <n-tab-pane name="profitloss" :tab="isMobile ? 'Laba Rugi' : `Laba Rugi (${monthNames[selectedMonth - 1]})`">
            <n-grid :cols="5" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
              <n-grid-item span="5 m:1">
                <n-card size="small"><n-statistic label="Revenue Invoice" :value="fmt(profitLoss.revenue || 0)" /></n-card>
              </n-grid-item>
              <n-grid-item span="5 m:1">
                <n-card size="small"><n-statistic label="Penjualan Voucher" :value="fmt(profitLoss.voucher_sales || 0)" /></n-card>
              </n-grid-item>
              <n-grid-item span="5 m:1">
                <n-card size="small">
                  <n-statistic label="Expenses">
                    <template #default><n-text type="error">{{ fmt(profitLoss.expenses || 0) }}</n-text></template>
                  </n-statistic>
                </n-card>
              </n-grid-item>
              <n-grid-item span="5 m:1">
                <n-card size="small">
                  <n-statistic label="Profit (Invoice)">
                    <template #default>
                      <n-text :type="(profitLoss.profit || 0) >= 0 ? 'success' : 'error'">{{ fmt(profitLoss.profit || 0) }}</n-text>
                    </template>
                  </n-statistic>
                </n-card>
              </n-grid-item>
              <n-grid-item span="5 m:1">
                <n-card size="small">
                  <n-statistic label="Grand Total">
                    <template #default>
                      <n-text :type="(profitLoss.grand_total || 0) >= 0 ? 'success' : 'error'" strong style="font-size: 1.2em">
                        {{ fmt(profitLoss.grand_total || 0) }}
                      </n-text>
                    </template>
                  </n-statistic>
                </n-card>
              </n-grid-item>
            </n-grid>
          </n-tab-pane>

          <!-- Voucher Sales Tab -->
          <n-tab-pane name="vouchers" :tab="isMobile ? 'Voucher' : `Voucher (${monthNames[selectedMonth - 1]})`">
            <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive style="margin-bottom: 16px">
              <n-grid-item span="2 m:1">
                <n-statistic label="Total Voucher Terjual" :value="fmtNum(voucherSales.total_sold || 0)" />
              </n-grid-item>
              <n-grid-item span="2 m:1">
                <n-statistic label="Total Pendapatan Voucher" :value="fmt(voucherSales.total_amount || 0)" />
              </n-grid-item>
            </n-grid>
            <n-data-table v-if="isDesktop" :columns="voucherGatewayCols" :data="voucherSales.by_gateway || []" :bordered="false" size="small" />
            <div v-else class="report-cards">
              <n-card v-for="g in (voucherSales.by_gateway || [])" :key="g.method" size="small">
                <div class="rc-title">{{ g.method }}</div>
                <div class="rc-grid">
                  <span class="rc-label">Transaksi</span><span class="rc-value">{{ g.count }}</span>
                  <span class="rc-label">Total</span><span class="rc-value">{{ fmt(g.amount) }}</span>
                </div>
              </n-card>
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </n-space>
  </n-spin>
</template>

<style scoped>
@media (max-width: 639px) {
  :deep(.n-card-header) {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 8px;
  }
  :deep(.n-card-header__extra) {
    width: 100%;
  }
}

.report-cards {
  display: grid;
  gap: 8px;
}

.rc-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.rc-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  font-size: 13px;
}

.rc-label {
  color: rgba(255, 255, 255, 0.5);
}

.rc-value {
  text-align: right;
  font-weight: 500;
}
</style>
