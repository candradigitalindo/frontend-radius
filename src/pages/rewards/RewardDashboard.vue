<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NCard, NDataTable, NGrid, NGridItem, NStatistic, NSpace, NSelect,
  NTag, NButton, NPopconfirm, useMessage,
} from 'naive-ui'
import { rewardApi, rewardClaimApi } from '../../api'

const message = useMessage()
const loading = ref(true)
const months = ref(12)

const stats = ref({
  total_referrals: 0,
  qualified_referrals: 0,
  total_rewarded: 0,
  pending_claims: 0,
  active_rewards: 0,
})
const monthlyTrends = ref<any[]>([])
const topReferrers = ref<any[]>([])
const recentReferrals = ref<any[]>([])
const recentClaims = ref<any[]>([])
const claimBreakdown = ref<any[]>([])

const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const isDesktop = computed(() => windowWidth.value >= 1024)

const monthsOptions = [
  { label: '3 Bulan', value: 3 },
  { label: '6 Bulan', value: 6 },
  { label: '12 Bulan', value: 12 },
  { label: '24 Bulan', value: 24 },
]

const fmtRp = (v: number | null) => v != null ? v.toLocaleString('id-ID') : '0'

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const referralStatusMap: Record<string, { type: any; label: string }> = {
  pending: { type: 'warning', label: 'Pending' },
  qualified: { type: 'info', label: 'Qualified' },
  rewarded: { type: 'success', label: 'Rewarded' },
  expired: { type: 'error', label: 'Expired' },
}
const claimStatusMap: Record<string, { type: any; label: string }> = {
  pending: { type: 'warning', label: 'Pending' },
  applied: { type: 'success', label: 'Diterapkan' },
  expired: { type: 'error', label: 'Expired' },
}

const applyingId = ref<string | null>(null)

async function handleApplyClaim(id: string) {
  applyingId.value = id
  try {
    await rewardClaimApi.apply(id)
    message.success('Klaim diterapkan')
    await fetchDashboard()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menerapkan klaim')
  }
  applyingId.value = null
}

// Monthly Trends columns
const trendCols = [
  {
    title: 'Bulan', key: 'month',
    render: (r: any) => `${monthNames[(r.month || 1) - 1]} ${r.year}`,
  },
  { title: 'Referral', key: 'referrals' },
  { title: 'Qualified', key: 'qualified' },
  { title: 'Klaim', key: 'claims' },
  { title: 'Nominal Reward', key: 'claimed_amount', render: (r: any) => `Rp ${fmtRp(r.claimed_amount)}` },
]

// Top Referrers columns
const referrerCols = [
  { title: 'Pelanggan', key: 'customer_name' },
  { title: 'Total Referral', key: 'referral_count' },
  { title: 'Qualified', key: 'qualified_count' },
  { title: 'Total Reward', key: 'total_rewarded', render: (r: any) => `Rp ${fmtRp(r.total_rewarded)}` },
]

// Recent Referrals columns
const recentRefCols = [
  { title: 'Referrer', key: 'referrer_name', render: (r: any) => r.referrer_name || '-' },
  { title: 'Referred', key: 'referred_name', render: (r: any) => r.referred_name || '-' },
  { title: 'Kode', key: 'referral_code' },
  {
    title: 'Status', key: 'status',
    render: (r: any) => {
      const s = referralStatusMap[r.status] || { type: 'default', label: r.status }
      return h(NTag, { type: s.type, size: 'small' }, () => s.label)
    },
  },
  { title: 'Reward', key: 'reward_amount', render: (r: any) => `Rp ${fmtRp(r.reward_amount)}` },
  { title: 'Tanggal', key: 'created_at', render: (r: any) => r.created_at?.split('T')[0] || '-' },
]

// Recent Claims columns
const recentClaimCols = [
  { title: 'Pelanggan', key: 'customer_name', render: (r: any) => r.customer_name || '-' },
  { title: 'Reward', key: 'reward_name', render: (r: any) => r.reward_name || '-' },
  { title: 'Jumlah', key: 'amount', render: (r: any) => `Rp ${fmtRp(r.amount)}` },
  {
    title: 'Tipe', key: 'type',
    render: (r: any) => r.type === 'invoice_discount' ? 'Diskon Invoice' : r.type === 'balance_credit' ? 'Kredit Saldo' : r.type,
  },
  {
    title: 'Status', key: 'status',
    render: (r: any) => {
      const s = claimStatusMap[r.status] || { type: 'default', label: r.status }
      return h(NTag, { type: s.type, size: 'small' }, () => s.label)
    },
  },
  { title: 'Kadaluarsa', key: 'expires_at', render: (r: any) => r.expires_at?.split('T')[0] || '-' },
  {
    title: 'Aksi', key: 'actions',
    render: (r: any) => r.status === 'pending'
      ? h(NPopconfirm,
          { onPositiveClick: () => handleApplyClaim(r.id) },
          {
            trigger: () => h(NButton, {
              size: 'tiny', type: 'success',
              loading: applyingId.value === r.id,
            }, () => 'Terapkan'),
            default: () => 'Terapkan klaim ini ke customer?',
          })
      : '-',
  },
]

// Claim Breakdown columns
const breakdownCols = [
  {
    title: 'Tipe', key: 'type',
    render: (r: any) => r.type === 'invoice_discount' ? 'Diskon Invoice' : r.type === 'balance_credit' ? 'Kredit Saldo' : r.type,
  },
  {
    title: 'Status', key: 'status',
    render: (r: any) => {
      const s = claimStatusMap[r.status] || { type: 'default', label: r.status }
      return h(NTag, { type: s.type, size: 'small' }, () => s.label)
    },
  },
  { title: 'Jumlah Klaim', key: 'count' },
  { title: 'Total Nominal', key: 'total_amount', render: (r: any) => `Rp ${fmtRp(r.total_amount)}` },
]

async function fetchDashboard() {
  loading.value = true
  try {
    const res = await rewardApi.dashboard({ months: months.value })
    const d = res.data?.data || {}
    const s = d.stats || {}
    stats.value = {
      total_referrals: s.total_referrals || 0,
      qualified_referrals: s.qualified_referrals || 0,
      total_rewarded: s.total_rewarded || 0,
      pending_claims: s.pending_claims || 0,
      active_rewards: s.active_rewards || 0,
    }
    monthlyTrends.value = d.monthly_trends || []
    topReferrers.value = d.top_referrers || []
    recentReferrals.value = d.recent_referrals || []
    recentClaims.value = d.recent_claims || []
    claimBreakdown.value = d.claim_breakdown || []
  } catch {
    message.error('Gagal memuat dashboard reward')
  }
  loading.value = false
}

function onMonthsChange() {
  fetchDashboard()
}

onMounted(fetchDashboard)
</script>

<template>
  <n-space vertical :size="16">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h2 style="margin:0;font-size:18px;font-weight:600">Dashboard Reward</h2>
      <n-select
        v-model:value="months"
        :options="monthsOptions"
        style="width:130px"
        size="small"
        @update:value="onMonthsChange"
      />
    </div>

    <!-- Stats Cards -->
    <n-grid :cols="2" :x-gap="12" :y-gap="12" responsive="screen" item-responsive>
      <n-grid-item span="2 m:1">
        <n-card size="small" :loading="loading">
          <n-statistic label="Total Referral" :value="stats.total_referrals" />
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small" :loading="loading">
          <n-statistic label="Qualified" :value="stats.qualified_referrals" />
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small" :loading="loading">
          <n-statistic label="Total Reward Dibayarkan" :value="`Rp ${fmtRp(stats.total_rewarded)}`" />
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small" :loading="loading">
          <n-statistic label="Klaim Pending" :value="stats.pending_claims" />
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small" :loading="loading">
          <n-statistic label="Program Aktif" :value="stats.active_rewards" />
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- Monthly Trends -->
    <n-card title="Tren Bulanan" :loading="loading">
      <n-data-table
        :columns="trendCols"
        :data="monthlyTrends"
        :bordered="false"
        size="small"
      />
    </n-card>

    <!-- Top Referrers + Claim Breakdown (side by side on desktop) -->
    <n-grid :cols="1" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
      <n-grid-item span="1 l:1" style="display:contents">
        <n-grid :cols="1" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
          <n-grid-item span="1 m:1" v-if="isDesktop" style="display:contents">
            <!-- side by side layout for desktop -->
          </n-grid-item>
        </n-grid>
      </n-grid-item>
    </n-grid>

    <div :style="isDesktop ? 'display:grid;grid-template-columns:1fr 1fr;gap:16px' : ''">
      <n-card title="Top Referrer" :loading="loading">
        <n-data-table
          :columns="referrerCols"
          :data="topReferrers"
          :bordered="false"
          size="small"
        />
      </n-card>

      <n-card title="Rekap Klaim" :loading="loading">
        <n-data-table
          :columns="breakdownCols"
          :data="claimBreakdown"
          :bordered="false"
          size="small"
        />
      </n-card>
    </div>

    <!-- Recent Referrals -->
    <n-card title="Referral Terbaru" :loading="loading">
      <n-data-table
        :columns="recentRefCols"
        :data="recentReferrals"
        :bordered="false"
        size="small"
      />
    </n-card>

    <!-- Recent Claims -->
    <n-card title="Klaim Terbaru" :loading="loading">
      <n-data-table
        :columns="recentClaimCols"
        :data="recentClaims"
        :bordered="false"
        size="small"
      />
    </n-card>
  </n-space>
</template>
