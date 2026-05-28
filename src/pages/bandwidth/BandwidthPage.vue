<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NCard, NGrid, NGridItem, NStatistic, NDataTable, useMessage } from 'naive-ui'
import { bandwidthApi } from '../../api'
import { useAuthStore } from '../../stores/auth'
const message = useMessage()
const authStore = useAuthStore()
const loading = ref(true)
const topUsers = ref<any[]>([])
const summary = ref<any>({ total_download: 0, total_upload: 0 })

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isDesktop = computed(() => windowWidth.value >= 1024)

const topCols = [
  { title: '#', key: 'rank', width: 40, render: (_: any, idx: number) => idx + 1 },
  { title: 'Pelanggan', key: 'customer_name' },
  { title: 'Download', key: 'total_download', render: (r: any) => formatBytes(r.total_download) },
  { title: 'Upload', key: 'total_upload', render: (r: any) => formatBytes(r.total_upload) },
  { title: 'Total', key: 'total_bytes', render: (r: any) => formatBytes(r.total_bytes || 0) },
]

function formatBytes(b: number) {
  if (!b) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i]
}

onMounted(async () => {
  try {
    const [topRes, sumRes] = await Promise.all([
      bandwidthApi.topUsers().catch(err => {
        if (err.response?.status === 401) {
          message.error('Sesi Anda telah habis. Silakan login kembali.')
          authStore.logout()
          window.location.href = '/login'
        } else {
          message.error('Gagal memuat data pengguna teratas')
        }
        return { data: [] }
      }),
      bandwidthApi.summary().catch(err => {
        if (err.response?.status === 401) {
          message.error('Sesi Anda telah habis. Silakan login kembali.')
          authStore.logout()
          window.location.href = '/login'
        } else {
          message.error('Gagal memuat ringkasan bandwidth')
        }
        return { data: {} }
      }),
    ])
    topUsers.value = topRes.data?.data || []
    summary.value = sumRes.data?.data || []
  } catch (error: any) {
    if (error.response?.status === 401) {
      message.error('Autentikasi gagal. Silakan login kembali.')
      authStore.logout()
      window.location.href = '/login'
    } else {
      message.error('Gagal memuat data bandwidth')
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <n-space vertical :size="16">
    <n-grid :cols="2" :x-gap="16" :y-gap="12" responsive="screen" item-responsive>
      <n-grid-item span="2 m:1">
        <n-card><n-statistic label="Total Download" :value="formatBytes(summary.total_download)" /></n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card><n-statistic label="Total Upload" :value="formatBytes(summary.total_upload)" /></n-card>
      </n-grid-item>
    </n-grid>

    <n-card title="Top Users - Bandwidth" :loading="loading">
      <!-- Desktop: table -->
      <n-data-table v-if="isDesktop" :columns="topCols" :data="topUsers" :bordered="false" size="small" />

      <!-- Tablet & Mobile: cards -->
      <div v-else>
        <div v-if="!topUsers.length && !loading" style="text-align:center;padding:24px;opacity:0.6">Tidak ada data</div>
        <div v-else class="bandwidth-grid">
          <n-card v-for="(r, idx) in topUsers" :key="r.customer_id" size="small">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
              <span style="font-weight:600">{{ idx + 1 }}. {{ r.customer_name }}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <n-tag size="small" type="info">↓ {{ formatBytes(r.total_download) }}</n-tag>
              <n-tag size="small" type="warning">↑ {{ formatBytes(r.total_upload) }}</n-tag>
            </div>
            <div style="font-size:12px;opacity:0.7">Total: {{ formatBytes(r.total_bytes || 0) }}</div>
          </n-card>
        </div>
      </div>
    </n-card>
  </n-space>
</template>

<style scoped>
.bandwidth-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .bandwidth-grid {
    grid-template-columns: 1fr;
  }
}
</style>
