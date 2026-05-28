<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NTag, NButton, NSpace,
  NDataTable, NStatistic, NGrid, NGridItem, useMessage
} from 'naive-ui'
import { resellerApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(true)
const reseller = ref<any>({})
const customers = ref<any[]>([])
const commissions = ref<any[]>([])
const id = route.params.id as string

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isMobile = computed(() => windowWidth.value < 640)
const isDesktop = computed(() => windowWidth.value >= 1024)

const statusMap: Record<string, { type: any; label: string }> = {
  active: { type: 'success', label: 'Aktif' },
  inactive: { type: 'default', label: 'Nonaktif' },
  suspended: { type: 'error', label: 'Suspended' },
}

const commStatusMap: Record<string, { type: any; label: string }> = {
  pending: { type: 'warning', label: 'Pending' },
  paid: { type: 'success', label: 'Dibayar' },
  cancelled: { type: 'error', label: 'Batal' },
}

const custCols = [
  { title: 'Kode', key: 'customer_code' },
  { title: 'Nama', key: 'name' },
  { title: 'Paket', key: 'package', render: (r: any) => r.package?.name || '-' },
  { title: 'Status', key: 'status' },
]

const commCols = [
  { title: 'Pelanggan', key: 'customer_name', render: (r: any) => r.customer_name || '-' },
  { title: 'Jumlah', key: 'amount', render: (r: any) => (r.amount || 0).toLocaleString('id-ID') },
  { title: 'Status', key: 'status' },
  { title: 'Tanggal', key: 'created_at', render: (r: any) => r.created_at?.split('T')[0] || '-' },
]

onMounted(async () => {
  try {
    const [rRes, cRes, comRes] = await Promise.all([
      resellerApi.get(id),
      resellerApi.customers(id).catch(() => ({ data: [] })),
      resellerApi.commissions(id).catch(() => ({ data: [] })),
    ])
    reseller.value = rRes.data?.data || rRes.data
    customers.value = cRes.data?.data || []
    commissions.value = comRes.data?.data || []
  } catch { message.error('Gagal memuat data reseller') }
  loading.value = false
})
</script>

<template>
  <n-space vertical :size="16">
    <n-card :loading="loading">
      <template #header>
        <div :style="isMobile ? 'display:flex;flex-direction:column;gap:8px' : 'display:flex;justify-content:space-between;align-items:center'">
          <span style="font-weight:600;word-break:break-word">Reseller — {{ reseller.name }}</span>
          <n-button size="small" @click="router.push('/resellers')">Kembali</n-button>
        </div>
      </template>

      <n-grid :cols="4" :x-gap="16" :y-gap="12" responsive="screen" item-responsive>
        <n-grid-item span="4 m:1"><n-statistic label="Perusahaan" :value="reseller.company_name || '-'" /></n-grid-item>
        <n-grid-item span="4 m:1"><n-statistic label="Komisi" :value="`${reseller.commission_rate || 0}%`" /></n-grid-item>
        <n-grid-item span="4 m:1"><n-statistic label="Pelanggan" :value="customers.length" /></n-grid-item>
        <n-grid-item span="4 m:1">
          <n-statistic label="Status">
            <n-tag :type="(statusMap[reseller.status] || {}).type || 'default'" size="small">{{ (statusMap[reseller.status] || {}).label || reseller.status }}</n-tag>
          </n-statistic>
        </n-grid-item>
      </n-grid>
    </n-card>

    <n-card title="Pelanggan Reseller">
      <!-- Desktop: table -->
      <n-data-table v-if="isDesktop" :columns="custCols" :data="customers" :bordered="false" size="small" />

      <!-- Tablet & Mobile: cards -->
      <div v-else>
        <div v-if="!customers.length && !loading" style="text-align:center;padding:24px;opacity:0.6">Tidak ada pelanggan</div>
        <div v-else class="detail-grid">
          <n-card v-for="r in customers" :key="r.id" size="small">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">
              <span style="font-weight:600;font-size:13px">{{ r.name }}</span>
              <n-tag size="small" :type="r.status === 'active' ? 'success' : 'default'">{{ r.status }}</n-tag>
            </div>
            <div style="font-size:12px;opacity:0.7">{{ r.customer_code }}</div>
            <div style="font-size:12px;margin-top:2px">{{ r.package?.name || '-' }}</div>
          </n-card>
        </div>
      </div>
    </n-card>

    <n-card title="Riwayat Komisi">
      <!-- Desktop: table -->
      <n-data-table v-if="isDesktop" :columns="commCols" :data="commissions" :bordered="false" size="small" />

      <!-- Tablet & Mobile: cards -->
      <div v-else>
        <div v-if="!commissions.length && !loading" style="text-align:center;padding:24px;opacity:0.6">Tidak ada riwayat komisi</div>
        <div v-else class="detail-grid">
          <n-card v-for="r in commissions" :key="r.id" size="small">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">
              <span style="font-weight:600;font-size:13px">{{ r.customer_name || '-' }}</span>
              <n-tag :type="(commStatusMap[r.status] || {}).type || 'default'" size="small">{{ (commStatusMap[r.status] || {}).label || r.status }}</n-tag>
            </div>
            <div style="font-weight:600;margin-bottom:2px">Rp {{ (r.amount || 0).toLocaleString('id-ID') }}</div>
            <div style="font-size:11px;opacity:0.5">{{ r.created_at?.split('T')[0] || '-' }}</div>
          </n-card>
        </div>
      </div>
    </n-card>
  </n-space>
</template>

<style scoped>
.detail-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
