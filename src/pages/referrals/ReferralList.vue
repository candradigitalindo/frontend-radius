<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NCard, NDataTable, NTag, NStatistic, NGrid, NGridItem, NSpace,
  NSelect, NButton, NPopconfirm, useMessage,
} from 'naive-ui'
import { rewardApi, referralApi } from '../../api'

const message = useMessage()
const loading = ref(true)
const referrals = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const filterStatus = ref('')
const applyingId = ref<string | null>(null)

const stats = ref({
  total_referrals: 0,
  qualified_referrals: 0,
  total_rewarded: 0,
  pending_claims: 0,
  active_rewards: 0,
})

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isDesktop = computed(() => windowWidth.value >= 1024)

const statusMap: Record<string, { type: any; label: string }> = {
  pending: { type: 'warning', label: 'Pending' },
  qualified: { type: 'info', label: 'Qualified' },
  rewarded: { type: 'success', label: 'Rewarded' },
  expired: { type: 'error', label: 'Expired' },
}

const statusOptions = [
  { label: 'Semua Status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Rewarded', value: 'rewarded' },
  { label: 'Expired', value: 'expired' },
]

const fmtRp = (v: number | null) => v != null ? v.toLocaleString('id-ID') : '0'

async function handleMarkRewarded(id: string) {
  applyingId.value = id
  try {
    await referralApi.markRewarded(id)
    message.success('Referral ditandai diberi reward')
    await fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menandai referral')
  }
  applyingId.value = null
}

const columns = [
  { title: 'Referrer', key: 'referrer_name', render: (r: any) => r.referrer_name || '-' },
  { title: 'Referred', key: 'referred_name', render: (r: any) => r.referred_name || '-' },
  { title: 'Kode', key: 'referral_code' },
  {
    title: 'Status', key: 'status',
    render: (r: any) => {
      const s = statusMap[r.status] || { type: 'default', label: r.status }
      return h(NTag, { type: s.type, size: 'small' }, () => s.label)
    },
  },
  { title: 'Reward', key: 'reward_amount', render: (r: any) => `Rp ${fmtRp(r.reward_amount)}` },
  { title: 'Qualified', key: 'qualified_at', render: (r: any) => r.qualified_at?.split('T')[0] || '-' },
  { title: 'Rewarded', key: 'rewarded_at', render: (r: any) => r.rewarded_at?.split('T')[0] || '-' },
  { title: 'Tanggal Daftar', key: 'created_at', render: (r: any) => r.created_at?.split('T')[0] || '-' },
  {
    title: 'Aksi', key: 'actions',
    render: (r: any) => r.status === 'qualified'
      ? h(NPopconfirm,
          { onPositiveClick: () => handleMarkRewarded(r.id) },
          {
            trigger: () => h(NButton, {
              size: 'tiny', type: 'success',
              loading: applyingId.value === r.id,
            }, () => 'Tandai Rewarded'),
            default: () => 'Tandai referral ini sudah diberi reward?',
          })
      : '-',
  },
]

const pagination = computed(() => ({
  page: page.value,
  pageSize: perPage.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (p: number) => { page.value = p; fetchData() },
  onUpdatePageSize: (s: number) => { perPage.value = s; page.value = 1; fetchData() },
}))

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, per_page: perPage.value }
    if (filterStatus.value) params.status = filterStatus.value


    const [refRes, statsRes] = await Promise.all([
      referralApi.list(params),
      rewardApi.stats(),
    ])
    referrals.value = refRes.data?.data || []
    total.value = refRes.data?.total || referrals.value.length

    const s = statsRes.data?.data || {}
    stats.value = {
      total_referrals: s.total_referrals || 0,
      qualified_referrals: s.qualified_referrals || 0,
      total_rewarded: s.total_rewarded || 0,
      pending_claims: s.pending_claims || 0,
      active_rewards: s.active_rewards || 0,
    }
  } catch {
    message.error('Gagal memuat data referral')
  }
  loading.value = false
}

function onFilterChange() {
  page.value = 1
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <n-space vertical :size="16">
    <!-- Stats Cards -->
    <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen" item-responsive>
      <n-grid-item span="2 m:1">
        <n-card size="small"><n-statistic label="Total Referral" :value="stats.total_referrals" /></n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small"><n-statistic label="Qualified" :value="stats.qualified_referrals" /></n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small">
          <n-statistic label="Total Reward Diberikan" :value="`Rp ${fmtRp(stats.total_rewarded)}`" />
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small"><n-statistic label="Klaim Pending" :value="stats.pending_claims" /></n-card>
      </n-grid-item>
    </n-grid>

    <!-- Filter & Table -->
    <n-card title="Daftar Referral">
      <template #header-extra>
        <n-select
          v-model:value="filterStatus"
          :options="statusOptions"
          style="width: 160px"
          size="small"
          placeholder="Filter Status"
          @update:value="onFilterChange"
        />
      </template>

      <!-- Desktop: table -->
      <n-data-table
        v-if="isDesktop"
        :columns="columns"
        :data="referrals"
        :loading="loading"
        :bordered="false"
        :pagination="pagination"
        remote
        size="small"
      />

      <!-- Tablet & Mobile: cards -->
      <div v-else>
        <div v-if="loading" style="text-align:center;padding:24px">Memuat...</div>
        <div v-else-if="!referrals.length" style="text-align:center;padding:24px;opacity:0.6">
          Tidak ada data referral
        </div>
        <div v-else class="referral-grid">
          <n-card v-for="r in referrals" :key="r.id" size="small">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
              <span style="font-weight:600;font-size:13px">{{ r.referral_code }}</span>
              <n-tag :type="(statusMap[r.status] || {}).type || 'default'" size="small">
                {{ (statusMap[r.status] || {}).label || r.status }}
              </n-tag>
            </div>
            <div style="font-size:12px;margin-bottom:2px"><span style="opacity:0.6">Referrer:</span> {{ r.referrer_name || '-' }}</div>
            <div style="font-size:12px;margin-bottom:4px"><span style="opacity:0.6">Referred:</span> {{ r.referred_name || '-' }}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-weight:600">Rp {{ fmtRp(r.reward_amount) }}</span>
              <span style="font-size:11px;opacity:0.5">{{ r.created_at?.split('T')[0] || '-' }}</span>
            </div>
            <div v-if="r.rewarded_at" style="font-size:11px;opacity:0.6;margin-bottom:6px">
              Rewarded: {{ r.rewarded_at?.split('T')[0] }}
            </div>
            <n-popconfirm v-if="r.status === 'qualified'" @positive-click="handleMarkRewarded(r.id)">
              <template #trigger>
                <n-button size="tiny" type="success" :loading="applyingId === r.id">Tandai Rewarded</n-button>
              </template>
              Tandai referral ini sudah diberi reward?
            </n-popconfirm>
          </n-card>
        </div>
      </div>
    </n-card>
  </n-space>
</template>

<style scoped>
.referral-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 639px) {
  .referral-grid {
    grid-template-columns: 1fr;
  }
}
</style>
