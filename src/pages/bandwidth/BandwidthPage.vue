<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NGrid, NGridItem, NStatistic, NDataTable, NButton,
  NSpace, NSelect, NTag, NText, NProgress, NIcon, useMessage
} from 'naive-ui'
import { Refresh } from '@vicons/tabler'
import { bandwidthApi } from '../../api'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const topUsers = ref<any[]>([])
const summary = ref<any>({})

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const monthOptions = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 },
  { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 },
  { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 },
  { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]
const yearOptions = Array.from({ length: 3 }, (_, i) => {
  const y = now.getFullYear() - i
  return { label: String(y), value: y }
})

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isDesktop = computed(() => windowWidth.value >= 1024)

function formatBytes(b: number) {
  if (!b) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i]
}

function formatDuration(sec: number) {
  if (!sec) return '-'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}j ${m}m`
  return `${m}m`
}

const maxBytes = computed(() => Math.max(...topUsers.value.map((u: any) => u.total_bytes || 0), 1))

const topCols = computed(() => [
  {
    title: '#', key: 'rank', width: 44,
    render: (_: any, idx: number) => idx + 1
  },
  {
    title: 'Pelanggan', key: 'customer_name', minWidth: 150,
    render: (r: any) => h('div', [
      h('div', { style: 'font-weight:600;font-size:13px' }, r.customer_name || '-'),
      h('div', { style: 'font-size:11px;opacity:0.5;font-family:monospace' }, r.username || ''),
    ])
  },
  {
    title: 'Total Konsumsi', key: 'total_bytes', minWidth: 180,
    render: (r: any) => h('div', { style: 'min-width:160px' }, [
      h(NProgress, {
        type: 'line',
        percentage: Math.round(((r.total_bytes || 0) / maxBytes.value) * 100),
        showIndicator: false,
        style: 'margin-bottom:4px',
        status: ((r.total_bytes || 0) / maxBytes.value) > 0.8 ? 'error'
              : ((r.total_bytes || 0) / maxBytes.value) > 0.5 ? 'warning' : 'success',
      }),
      h('span', { style: 'font-size:12px;font-weight:600' }, formatBytes(r.total_bytes || 0)),
    ])
  },
  {
    title: 'Download', key: 'total_download', width: 110,
    render: (r: any) => h(NTag, { type: 'info', size: 'small', bordered: false }, () => '↓ ' + formatBytes(r.total_download))
  },
  {
    title: 'Upload', key: 'total_upload', width: 110,
    render: (r: any) => h(NTag, { type: 'warning', size: 'small', bordered: false }, () => '↑ ' + formatBytes(r.total_upload))
  },
  {
    title: 'Aksi', key: 'action', width: 80, align: 'right' as const,
    render: (r: any) => r.customer_id
      ? h(NButton, { size: 'tiny', secondary: true, onClick: () => router.push(`/customers/${r.customer_id}`) }, () => 'Detail')
      : null
  },
])

import { h } from 'vue'

async function fetchData() {
  loading.value = true
  try {
    const [topRes, sumRes] = await Promise.all([
      bandwidthApi.topUsers({ month: selectedMonth.value, year: selectedYear.value, limit: 10 }),
      bandwidthApi.summary({ month: selectedMonth.value, year: selectedYear.value }),
    ])
    topUsers.value = topRes.data?.data || []
    summary.value = sumRes.data?.data || {}
  } catch {
    message.error('Gagal memuat data konsumsi')
  }
  loading.value = false
}

onMounted(fetchData)
</script>

<template>
  <div style="display:flex;flex-direction:column;gap:16px">

    <!-- Filter + Refresh -->
    <n-card size="small">
      <n-space align="center" :wrap="true" :size="12">
        <span style="font-weight:600;font-size:14px">Konsumsi Data Pelanggan</span>
        <n-select v-model:value="selectedMonth" :options="monthOptions" size="small" style="width:130px" @update:value="fetchData" />
        <n-select v-model:value="selectedYear" :options="yearOptions" size="small" style="width:90px" @update:value="fetchData" />
        <n-button size="small" :loading="loading" @click="fetchData">
          <template #icon><n-icon :component="Refresh" /></template>
          Refresh
        </n-button>
      </n-space>
    </n-card>

    <!-- Summary Cards -->
    <n-grid :cols="windowWidth < 640 ? 2 : 4" :x-gap="16" :y-gap="12">
      <n-grid-item>
        <n-card size="small">
          <n-statistic label="Total Download" :value="formatBytes(summary.total_download || 0)" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small">
          <n-statistic label="Total Upload" :value="formatBytes(summary.total_upload || 0)" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small">
          <n-statistic label="Total Transfer" :value="formatBytes(summary.total_bytes || 0)" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card size="small">
          <n-statistic label="Sesi Aktif / Total" :value="`${summary.active_sessions || 0} / ${summary.total_sessions || 0}`" />
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- Top Users Table -->
    <n-card :loading="loading" size="small">
      <template #header>
        <span style="font-weight:600">Top 10 Pengguna Terbanyak</span>
      </template>
      <template #header-extra>
        <n-text depth="3" style="font-size:12px">{{ summary.unique_users || 0 }} pengguna aktif bulan ini</n-text>
      </template>

      <!-- Desktop: table -->
      <n-data-table v-if="isDesktop" :columns="topCols" :data="topUsers" :bordered="false" size="small" />

      <!-- Mobile: cards -->
      <div v-else>
        <div v-if="!topUsers.length && !loading" style="text-align:center;padding:24px;opacity:0.5">Tidak ada data</div>
        <div v-else style="display:flex;flex-direction:column;gap:10px">
          <n-card v-for="(r, idx) in topUsers" :key="r.customer_id" size="small" :bordered="true">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
              <div>
                <span style="font-weight:700;font-size:13px">{{ idx + 1 }}. {{ r.customer_name }}</span>
                <div style="font-size:11px;opacity:0.5;font-family:monospace">{{ r.username }}</div>
              </div>
              <n-button v-if="r.customer_id" size="tiny" secondary @click="router.push(`/customers/${r.customer_id}`)">Detail</n-button>
            </div>
            <n-progress
              type="line"
              :percentage="Math.round(((r.total_bytes || 0) / maxBytes) * 100)"
              :show-indicator="false"
              style="margin-bottom:6px"
            />
            <n-space :size="6" :wrap="true">
              <n-tag type="default" size="small" :bordered="false">Total: {{ formatBytes(r.total_bytes || 0) }}</n-tag>
              <n-tag type="info" size="small" :bordered="false">↓ {{ formatBytes(r.total_download) }}</n-tag>
              <n-tag type="warning" size="small" :bordered="false">↑ {{ formatBytes(r.total_upload) }}</n-tag>
            </n-space>
          </n-card>
        </div>
      </div>
    </n-card>

  </div>
</template>
