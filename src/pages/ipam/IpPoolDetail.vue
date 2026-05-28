<script setup lang="ts">
import { h, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NDataTable, NTag, NButton, NSpace,
  NStatistic, NGrid, NGridItem, NPagination, useMessage
} from 'naive-ui'
import { ipamApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const addrLoading = ref(false)
const pool = ref<any>({})
const addresses = ref<any[]>([])
const addrPage = ref(1)
const addrPerPage = ref(50)
const addrTotal = ref(0)

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)

const statusMap: Record<string, { type: any; label: string }> = {
  available: { type: 'success', label: 'Tersedia' },
  assigned: { type: 'warning', label: 'Terpakai' },
  reserved: { type: 'info', label: 'Reserved' },
  disabled: { type: 'default', label: 'Disabled' },
}

const addrCols = [
  { title: 'IP Address', key: 'address' },
  { title: 'Status', key: 'status', render: (r: any) => h(NTag, { type: r.status === 'available' ? 'success' : r.status === 'assigned' ? 'warning' : 'info', size: 'small' }, () => r.status) },
  { title: 'Pelanggan', key: 'customer_name', render: (r: any) => r.customer_name || '-' },
  { title: 'Catatan', key: 'notes' },
]

function extractAddressList(payload: any): any[] {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
    payload?.data?.items,
    payload?.data?.rows,
    payload?.items,
    payload?.rows,
    payload?.addresses,
    payload?.data?.addresses,
    payload?.result,
    payload?.result?.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  const objectCandidates = [payload?.data, payload?.data?.data, payload?.result]
  for (const candidate of objectCandidates) {
    if (candidate && typeof candidate === 'object') {
      const nestedArray = Object.values(candidate).find((value) => Array.isArray(value))
      if (Array.isArray(nestedArray)) return nestedArray
    }
  }

  return []
}

let currentPoolId = ''

async function fetchAddresses(poolId: string, page = 1) {
  addrLoading.value = true
  try {
    const aRes = await ipamApi.addresses(poolId, { page, per_page: addrPerPage.value }).catch(() => ({ data: { data: [], total: 0 } }))
    const raw = aRes.data
    addresses.value = extractAddressList(raw)
    addrTotal.value = raw?.total ?? raw?.data?.total ?? addresses.value.length
    addrPage.value = page
  } finally {
    addrLoading.value = false
  }
}

async function fetchDetail(poolId: string) {
  loading.value = true
  currentPoolId = poolId
  pool.value = {}
  addresses.value = []
  addrPage.value = 1
  addrTotal.value = 0
  try {
    const pRes = await ipamApi.getPool(poolId)
    pool.value = pRes.data?.data || pRes.data
    await fetchAddresses(poolId, 1)
  } catch { message.error('Gagal memuat data pool') }
  loading.value = false
}

function handleAddrPageChange(page: number) {
  fetchAddresses(currentPoolId, page)
}

watch(
  () => route.params.id,
  (paramId) => {
    const poolId = Array.isArray(paramId) ? paramId[0] : paramId
    if (poolId) fetchDetail(poolId)
  },
  { immediate: true }
)
</script>

<template>
  <n-space vertical :size="16">
    <n-card :loading="loading">
      <template #header>
        <div :style="isMobile ? 'display:flex;flex-direction:column;gap:8px' : 'display:flex;justify-content:space-between;align-items:center'">
          <span style="font-weight:600;word-break:break-word">IP Pool — {{ pool.name }}</span>
          <n-button size="small" @click="router.push('/ip-pools')">Kembali</n-button>
        </div>
      </template>

      <n-grid :cols="4" :x-gap="16" :y-gap="12" responsive="screen" item-responsive>
        <n-grid-item span="2 m:1"><n-statistic label="Network" :value="pool.network || '-'" /></n-grid-item>
        <n-grid-item span="2 m:1"><n-statistic label="Gateway" :value="pool.gateway || '-'" /></n-grid-item>
        <n-grid-item span="2 m:1"><n-statistic label="Total IP" :value="pool.total_ips || 0" /></n-grid-item>
        <n-grid-item span="2 m:1"><n-statistic label="Terpakai" :value="pool.used_ips || 0" /></n-grid-item>
      </n-grid>
    </n-card>

    <n-card title="Daftar IP Address">
      <!-- Desktop: table -->
      <n-data-table v-if="isDesktop" :columns="addrCols" :data="addresses" :bordered="false" size="small" :loading="addrLoading" />

      <!-- Tablet & Mobile: cards -->
      <div v-else>
        <div v-if="!addresses.length && !addrLoading" style="text-align:center;padding:24px;opacity:0.6">Tidak ada IP address</div>
        <div v-else class="addr-grid">
          <n-card v-for="r in addresses" :key="r.id" size="small">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-family:monospace;font-weight:600;font-size:13px">{{ r.address }}</span>
              <n-tag :type="(statusMap[r.status] || {}).type || 'default'" size="small">{{ (statusMap[r.status] || {}).label || r.status }}</n-tag>
            </div>
            <div v-if="r.customer_name" style="font-size:12px;margin-bottom:2px">{{ r.customer_name }}</div>
            <div v-if="r.notes" style="font-size:11px;opacity:0.6">{{ r.notes }}</div>
          </n-card>
        </div>
      </div>

      <div v-if="addrTotal > addrPerPage" style="display:flex;justify-content:flex-end;margin-top:16px">
        <n-pagination
          v-model:page="addrPage"
          :page-count="Math.ceil(addrTotal / addrPerPage)"
          :page-slot="5"
          @update:page="handleAddrPageChange"
        />
      </div>
    </n-card>
  </n-space>
</template>

<style scoped>
.addr-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .addr-grid {
    grid-template-columns: 1fr;
  }
}
</style>
