<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NCard, NGrid, NGridItem, NStatistic, NDataTable, NInputNumber,
  NButton, NIcon, NTag, NSpin, NEmpty, NTooltip, NProgress,
  useMessage,
} from 'naive-ui'
import { SpeedometerOutline as SpeedIcon, RefreshOutline as RefreshIcon, ArrowDownOutline as DownIcon, ArrowUpOutline as UpIcon, WarningOutline as WarnIcon, PeopleOutline as PeopleIcon } from '@vicons/ionicons5'
import type { DataTableColumns } from 'naive-ui'
import { bandwidthApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
const message = useMessage()
const authStore = useAuthStore()
const loading = ref(false)
const data = ref<any[]>([])

const hours = ref(24)
const threshold = ref(80)
const limit = ref(20)

// Responsive
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 768)
const isDesktop = computed(() => windowWidth.value >= 1024)

function formatSpeed(bps: number) {
  if (!bps) return '0 bps'
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps']
  const i = Math.floor(Math.log(bps) / Math.log(1000))
  return (bps / Math.pow(1000, Math.max(i, 0))).toFixed(1) + ' ' + units[Math.max(i, 0)]
}

function saturationColor(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 95) return 'error'
  if (pct >= 80) return 'warning'
  return 'success'
}

function saturationLabel(pct: number): string {
  if (pct >= 95) return 'Kritis'
  if (pct >= 90) return 'Tinggi'
  if (pct >= 80) return 'Peringatan'
  return 'Normal'
}

// Summary stats
const totalCustomers = computed(() => data.value.length)
const criticalCount = computed(() => data.value.filter(d => (d.saturation_pct || 0) >= 95).length)
const warningCount = computed(() => data.value.filter(d => { const p = d.saturation_pct || 0; return p >= 80 && p < 95 }).length)
const avgSaturation = computed(() => {
  if (!data.value.length) return 0
  return data.value.reduce((sum: number, d: any) => sum + (d.saturation_pct || 0), 0) / data.value.length
})

// Table columns
const columns = computed<DataTableColumns<any>>(() => [
  {
    title: '#', key: 'rank', width: 45, align: 'center',
    render: (_: any, idx: number) => idx + 1,
  },
  {
    title: 'Pelanggan', key: 'customer_name', minWidth: 150, ellipsis: { tooltip: true },
    render: (row: any) => row.customer_name || row.name || '-',
  },
  {
    title: 'Paket', key: 'package_name', width: 130, ellipsis: { tooltip: true },
    render: (row: any) => row.package_name || row.package?.name || '-',
  },
  {
    title: 'Saturasi', key: 'saturation_pct', width: 100, align: 'center',
    sorter: (a: any, b: any) => (a.saturation_pct || 0) - (b.saturation_pct || 0),
    defaultSortOrder: 'descend',
  },
  {
    title: 'Peak Download', key: 'peak_download_bps', width: 130,
    sorter: (a: any, b: any) => (a.peak_download_bps || 0) - (b.peak_download_bps || 0),
    render: (row: any) => formatSpeed(row.peak_download_bps || 0),
  },
  {
    title: 'Peak Upload', key: 'peak_upload_bps', width: 130,
    sorter: (a: any, b: any) => (a.peak_upload_bps || 0) - (b.peak_upload_bps || 0),
    render: (row: any) => formatSpeed(row.peak_upload_bps || 0),
  },
  {
    title: 'Avg Download', key: 'avg_download_bps', width: 130,
    render: (row: any) => formatSpeed(row.avg_download_bps || 0),
  },
  {
    title: 'Avg Upload', key: 'avg_upload_bps', width: 130,
    render: (row: any) => formatSpeed(row.avg_upload_bps || 0),
  },
  {
    title: 'Samples', key: 'total_samples', width: 100, align: 'center',
    render: (row: any) => `${row.saturated_download || 0}↓ ${row.saturated_upload || 0}↑ / ${row.total_samples || 0}`,
  },
])

async function fetchData(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await bandwidthApi.saturation({
      hours: hours.value,
      threshold: threshold.value,
      limit: limit.value,
    })
    const raw = res.data?.data ?? res.data ?? []
    data.value = Array.isArray(raw) ? raw : []
  } catch (error: any) {
    if (error.response?.status === 401) {
      message.error('Sesi Anda telah habis. Silakan login kembali.')
      authStore.logout()
      window.location.href = '/login'
    } else if (!silent) {
      message.error('Gagal memuat data monitoring')
    }
    if (!silent) data.value = []
  } finally {
    if (!silent) loading.value = false
  }
}

// Auto-refresh tiap 15 detik (silent, hanya saat tab terlihat).
let pollTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  fetchData()
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') fetchData(true)
  }, 15000)
})
onUnmounted(() => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } })
</script>

<template>
  <div class="monitoring-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-left">
        <n-icon :size="24" color="var(--primary-color)"><SpeedIcon /></n-icon>
        <h2 class="page-title">Monitoring Speed</h2>
      </div>
      <n-button
        type="primary"
        :loading="loading"
        @click="() => fetchData()"
        size="small"
      >
        <template #icon><n-icon><RefreshIcon /></n-icon></template>
        Refresh
      </n-button>
    </div>

    <!-- Filter -->
    <n-card class="filter-card" size="small">
      <div class="filter-grid">
        <div class="filter-item">
          <label class="filter-label">Threshold (%)</label>
          <n-input-number
            v-model:value="threshold"
            :min="10"
            :max="100"
            :step="5"
            size="small"
            placeholder="80"
            @update:value="() => fetchData()"
          />
          <span class="filter-hint">Batas saturasi minimum</span>
        </div>
        <div class="filter-item">
          <label class="filter-label">Periode (jam)</label>
          <n-input-number
            v-model:value="hours"
            :min="1"
            :max="168"
            :step="1"
            size="small"
            placeholder="24"
            @update:value="() => fetchData()"
          />
          <span class="filter-hint">Rentang waktu analisis</span>
        </div>
        <div class="filter-item">
          <label class="filter-label">Limit</label>
          <n-input-number
            v-model:value="limit"
            :min="5"
            :max="100"
            :step="5"
            size="small"
            placeholder="20"
            @update:value="() => fetchData()"
          />
          <span class="filter-hint">Maks pelanggan ditampilkan</span>
        </div>
      </div>
    </n-card>

    <!-- Summary Cards -->
    <n-grid :cols="isMobile ? 2 : 4" :x-gap="12" :y-gap="12">
      <n-grid-item>
        <n-card size="small" class="summary-card">
          <div class="summary-icon" style="background: rgba(59,130,246,0.1); color: #3b82f6">
            <n-icon :size="20"><PeopleIcon /></n-icon>
          </div>
          <n-statistic label="Total Terdeteksi" :value="totalCustomers" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small" class="summary-card">
          <div class="summary-icon" style="background: rgba(239,68,68,0.1); color: #ef4444">
            <n-icon :size="20"><WarnIcon /></n-icon>
          </div>
          <n-statistic label="Kritis (≥95%)" :value="criticalCount" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small" class="summary-card">
          <div class="summary-icon" style="background: rgba(245,158,11,0.1); color: #f59e0b">
            <n-icon :size="20"><WarnIcon /></n-icon>
          </div>
          <n-statistic label="Peringatan (≥80%)" :value="warningCount" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small" class="summary-card">
          <div class="summary-icon" style="background: rgba(34,197,94,0.1); color: #22c55e">
            <n-icon :size="20"><SpeedIcon /></n-icon>
          </div>
          <n-statistic label="Rata-rata Saturasi">
            <template #default>{{ avgSaturation.toFixed(1) }}%</template>
          </n-statistic>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- Desktop Table -->
    <n-card v-if="isDesktop" size="small" class="table-card">
      <template #header>
        <span style="font-size:14px;font-weight:700">Daftar Pelanggan Saturasi Tinggi</span>
      </template>
      <n-data-table
        :columns="columns"
        :data="data"
        :loading="loading"
        :bordered="false"
        :scroll-x="1000"
        striped
        size="small"
        :row-class-name="(row: any) => (row.saturation_pct || 0) >= 95 ? 'row-critical' : ''"
      >
        <template #empty>
          <n-empty description="Semua pelanggan di bawah threshold — jaringan sehat!" />
        </template>
      </n-data-table>
    </n-card>

    <!-- Mobile/Tablet Cards -->
    <div v-else>
      <div v-if="loading" style="display:flex;justify-content:center;padding:40px 0">
        <n-spin :size="32" />
      </div>
      <div v-else-if="!data.length" style="text-align:center;padding:40px 0">
        <n-empty description="Semua pelanggan di bawah threshold — jaringan sehat!" />
      </div>
      <div v-else class="mobile-card-list">
        <n-card
          v-for="(item, idx) in data"
          :key="item.customer_id || item.id || idx"
          size="small"
          class="mobile-item-card"
        >
          <div class="m-item-header">
            <div class="m-item-info">
              <span class="m-item-rank">#{{ idx + 1 }}</span>
              <span class="m-item-name">{{ item.customer_name || item.name || '-' }}</span>
            </div>
            <n-tag :type="saturationColor(item.saturation_pct || 0)" size="small" round>
              {{ saturationLabel(item.saturation_pct || 0) }} · {{ (item.saturation_pct || 0).toFixed(0) }}%
            </n-tag>
          </div>

          <n-progress
            type="line"
            :percentage="Math.min(item.saturation_pct || 0, 100)"
            :status="(item.saturation_pct || 0) >= 95 ? 'error' : (item.saturation_pct || 0) >= 80 ? 'warning' : 'success'"
            :show-indicator="false"
            style="margin: 8px 0"
          />

          <div class="m-item-stats">
            <div class="m-stat-group">
              <span class="m-stat-title">Peak</span>
              <div class="m-stat-values">
                <n-tag size="tiny" :bordered="false" type="info">
                  <template #icon><n-icon :size="10"><DownIcon /></n-icon></template>
                  {{ formatSpeed(item.peak_download_bps || 0) }}
                </n-tag>
                <n-tag size="tiny" :bordered="false" type="warning">
                  <template #icon><n-icon :size="10"><UpIcon /></n-icon></template>
                  {{ formatSpeed(item.peak_upload_bps || 0) }}
                </n-tag>
              </div>
            </div>
            <div class="m-stat-group">
              <span class="m-stat-title">Avg</span>
              <div class="m-stat-values">
                <n-tag size="tiny" :bordered="false" type="info">
                  <template #icon><n-icon :size="10"><DownIcon /></n-icon></template>
                  {{ formatSpeed(item.avg_download_bps || 0) }}
                </n-tag>
                <n-tag size="tiny" :bordered="false" type="warning">
                  <template #icon><n-icon :size="10"><UpIcon /></n-icon></template>
                  {{ formatSpeed(item.avg_upload_bps || 0) }}
                </n-tag>
              </div>
            </div>
          </div>

          <div class="m-item-footer">
            <span v-if="item.package_name || item.package?.name" class="m-item-package">
              {{ item.package_name || item.package?.name }}
            </span>
            <span class="m-item-samples">
              {{ item.saturated_download || 0 }}↓ / {{ item.saturated_upload || 0 }}↑ dari {{ item.total_samples || 0 }} sample
            </span>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.monitoring-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

/* Filter */
.filter-card {
  border-radius: 12px !important;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}

.filter-hint {
  font-size: 11px;
  opacity: 0.4;
}

/* Summary */
.summary-card {
  border-radius: 12px !important;
  position: relative;
}

.summary-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

/* Table */
.table-card {
  border-radius: 12px !important;
}

:deep(.row-critical) {
  background: rgba(239, 68, 68, 0.04) !important;
}

:root.dark :deep(.row-critical) {
  background: rgba(239, 68, 68, 0.08) !important;
}

/* Mobile Cards */
.mobile-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-item-card {
  border-radius: 12px !important;
}

.m-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.m-item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.m-item-rank {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.4;
  flex-shrink: 0;
}

.m-item-name {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-item-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.m-stat-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.m-stat-title {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.4;
  text-transform: uppercase;
  width: 30px;
  flex-shrink: 0;
}

.m-stat-values {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.m-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(128, 128, 128, 0.08);
}

.m-item-package {
  font-size: 11px;
  opacity: 0.5;
  font-weight: 600;
}

.m-item-samples {
  font-size: 10px;
  opacity: 0.4;
  font-family: monospace;
}

/* Responsive */
@media (max-width: 767px) {
  .filter-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .page-title {
    font-size: 18px;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .mobile-card-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
</style>
