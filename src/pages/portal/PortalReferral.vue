<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NIcon, NSpin, NTag, useMessage } from 'naive-ui'
import {
  PeopleOutline as PeopleIcon,
  GiftOutline as GiftIcon,
  CopyOutline as CopyIcon,
  ShareSocialOutline as ShareIcon,
  CheckmarkCircleOutline as CheckIcon,
  TimeOutline as TimeIcon,
  AlertCircleOutline as AlertIcon,
  ChevronForwardOutline as ChevronIcon,
} from '@vicons/ionicons5'
import { portalApi } from '../../api'

const message = useMessage()
const loading = ref(true)
const data = ref<any>({
  referral_code: '',
  referrals: [],
  balance: 0,
  claims: [],
})

onMounted(async () => {
  try {
    const { data: res } = await portalApi.referral()
    data.value = res.data || {}
  } catch { /* ignore */ }
  loading.value = false
})

const referralCode = computed(() => data.value.referral_code || '')
const referrals = computed(() => data.value.referrals || [])
const balance = computed(() => data.value.balance || 0)
const claims = computed(() => data.value.claims || [])

const qualifiedCount = computed(() => referrals.value.filter((r: any) => r.status === 'qualified' || r.status === 'rewarded').length)
const pendingCount = computed(() => referrals.value.filter((r: any) => r.status === 'pending').length)

function formatCurrency(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function referralStatusType(s: string): 'success' | 'warning' | 'error' | 'info' {
  const m: Record<string, any> = { qualified: 'success', rewarded: 'success', pending: 'warning', expired: 'error' }
  return m[s] || 'info'
}

function referralStatusLabel(s: string) {
  const m: Record<string, string> = {
    pending: 'Menunggu',
    qualified: 'Memenuhi Syarat',
    rewarded: 'Reward Diterima',
    expired: 'Kadaluarsa',
  }
  return m[s] || s
}

function claimStatusType(s: string): 'success' | 'warning' | 'error' | 'info' {
  const m: Record<string, any> = { applied: 'success', pending: 'warning', expired: 'error' }
  return m[s] || 'info'
}

function claimStatusLabel(s: string) {
  const m: Record<string, string> = { pending: 'Menunggu', applied: 'Diterapkan', expired: 'Kadaluarsa' }
  return m[s] || s
}

function copyCode() {
  if (!referralCode.value) return
  navigator.clipboard.writeText(referralCode.value)
  message.success('Kode referral disalin!')
}

function shareCode() {
  const text = `Daftar internet di sini dan gunakan kode referral saya: ${referralCode.value} untuk mendapatkan keuntungan spesial!`
  if (navigator.share) {
    navigator.share({ title: 'Kode Referral', text }).catch(() => {})
  } else {
    navigator.clipboard.writeText(text)
    message.success('Teks referral disalin!')
  }
}
</script>

<template>
  <n-spin :show="loading">
    <div class="referral-page">

      <!-- Header -->
      <div class="page-header">
        <div class="header-icon">
          <n-icon :component="GiftIcon" :size="22" color="#a855f7" />
        </div>
        <div>
          <div class="page-title">Program Referral</div>
          <div class="page-sub">Ajak teman, dapatkan reward setiap bulan</div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-icon" style="background: rgba(168,85,247,.1)">
            <n-icon :component="GiftIcon" :size="20" color="#a855f7" />
          </div>
          <div class="stat-info">
            <div class="stat-val">{{ formatCurrency(balance) }}</div>
            <div class="stat-label">Saldo Reward</div>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon" style="background: rgba(34,197,94,.1)">
            <n-icon :component="CheckIcon" :size="20" color="#22c55e" />
          </div>
          <div class="stat-info">
            <div class="stat-val">{{ qualifiedCount }}</div>
            <div class="stat-label">Referral Sukses</div>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-icon" style="background: rgba(245,158,11,.1)">
            <n-icon :component="TimeIcon" :size="20" color="#f59e0b" />
          </div>
          <div class="stat-info">
            <div class="stat-val">{{ pendingCount }}</div>
            <div class="stat-label">Menunggu</div>
          </div>
        </div>
      </div>

      <!-- Referral code card -->
      <div class="code-card">
        <div class="code-label">Kode Referral Anda</div>
        <div class="code-value">{{ referralCode || 'Belum tersedia' }}</div>
        <div class="code-sub">Bagikan kode ini ke teman untuk mendapatkan reward</div>
        <div class="code-actions">
          <button class="code-btn copy-btn" @click="copyCode" :disabled="!referralCode">
            <n-icon :component="CopyIcon" :size="16" />
            Salin Kode
          </button>
          <button class="code-btn share-btn" @click="shareCode" :disabled="!referralCode">
            <n-icon :component="ShareIcon" :size="16" />
            Bagikan
          </button>
        </div>
      </div>

      <!-- How it works -->
      <div class="how-section">
        <div class="section-title">Cara Kerja</div>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-text">
              <div class="step-title">Bagikan Kode</div>
              <div class="step-desc">Kirim kode referral Anda ke teman yang ingin berlangganan internet</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-text">
              <div class="step-title">Teman Mendaftar</div>
              <div class="step-desc">Teman mendaftar dan menyebutkan kode referral Anda saat registrasi</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-text">
              <div class="step-title">Dapatkan Reward</div>
              <div class="step-desc">Setelah teman aktif, Anda mendapatkan reward yang akan dikreditkan ke akun</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Referral history -->
      <div class="section">
        <div class="section-title">Riwayat Referral ({{ referrals.length }})</div>

        <div v-if="referrals.length === 0" class="empty-state">
          <n-icon :component="PeopleIcon" :size="40" style="opacity:.2" />
          <span>Belum ada referral. Mulai ajak teman sekarang!</span>
        </div>

        <div v-else class="referral-list">
          <div v-for="ref in referrals" :key="ref.id" class="referral-item">
            <div class="ref-avatar">
              {{ (ref.referred_name || 'P').charAt(0).toUpperCase() }}
            </div>
            <div class="ref-info">
              <div class="ref-name">{{ ref.referred_name || 'Pelanggan Baru' }}</div>
              <div class="ref-date">Didaftarkan {{ formatDate(ref.created_at) }}</div>
              <div v-if="ref.qualified_at" class="ref-qual">
                Memenuhi syarat: {{ formatDate(ref.qualified_at) }}
              </div>
            </div>
            <div class="ref-right">
              <n-tag :type="referralStatusType(ref.status)" size="small" round>
                {{ referralStatusLabel(ref.status) }}
              </n-tag>
              <div v-if="ref.reward_amount" class="ref-reward">
                +{{ formatCurrency(ref.reward_amount) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reward claims -->
      <div v-if="claims.length > 0" class="section">
        <div class="section-title">Riwayat Klaim Reward</div>
        <div class="claims-list">
          <div v-for="claim in claims" :key="claim.id" class="claim-item">
            <div class="claim-icon">
              <n-icon :component="GiftIcon" :size="16" />
            </div>
            <div class="claim-info">
              <div class="claim-name">{{ claim.reward_name || 'Reward' }}</div>
              <div class="claim-date">{{ formatDate(claim.created_at) }}</div>
            </div>
            <div class="claim-right">
              <div class="claim-amount">{{ formatCurrency(claim.amount) }}</div>
              <n-tag :type="claimStatusType(claim.status)" size="small" round>
                {{ claimStatusLabel(claim.status) }}
              </n-tag>
            </div>
          </div>
        </div>
      </div>

    </div>
  </n-spin>
</template>

<style scoped>
.referral-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 800px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(168,85,247,.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -.3px;
}

.page-sub {
  font-size: 13px;
  opacity: .5;
  margin-top: 2px;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--app-border, rgba(0,0,0,.06));
}

:root.dark .stat-box {
  border-color: rgba(255,255,255,.06);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  min-width: 0;
}

.stat-val {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -.3px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 11px;
  opacity: .5;
  font-weight: 600;
}

/* Referral code card */
.code-card {
  padding: 28px 24px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(168,85,247,.1), rgba(99,102,241,.1));
  border: 1px solid rgba(168,85,247,.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.code-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  opacity: .5;
}

.code-value {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: 4px;
  color: #a855f7;
  font-family: 'SF Mono', 'Fira Code', monospace;
  line-height: 1.1;
}

.code-sub {
  font-size: 13px;
  opacity: .5;
  max-width: 280px;
  line-height: 1.4;
}

.code-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.code-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all .2s;
}

.code-btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.copy-btn {
  background: rgba(168,85,247,.12);
  border: 1px solid rgba(168,85,247,.3);
  color: #a855f7;
}

.copy-btn:not(:disabled):hover {
  background: rgba(168,85,247,.2);
}

.share-btn {
  background: rgba(99,102,241,.12);
  border: 1px solid rgba(99,102,241,.3);
  color: #6366f1;
}

.share-btn:not(:disabled):hover {
  background: rgba(99,102,241,.2);
}

/* How it works */
.how-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  opacity: .75;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 14px;
  border: 1px solid var(--app-border, rgba(0,0,0,.06));
  overflow: hidden;
}

:root.dark .steps {
  border-color: rgba(255,255,255,.06);
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--app-border, rgba(0,0,0,.05));
}

:root.dark .step {
  border-color: rgba(255,255,255,.05);
}

.step:last-child {
  border-bottom: none;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a855f7, #6366f1);
  color: white;
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-text {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 700;
}

.step-desc {
  font-size: 12px;
  opacity: .55;
  margin-top: 3px;
  line-height: 1.4;
}

/* Section */
.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Referral list */
.referral-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.referral-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--app-border, rgba(0,0,0,.05));
  transition: all .2s;
}

:root:not(.dark) .referral-item {
  background: rgba(0,0,0,.01);
}

:root.dark .referral-item {
  background: rgba(255,255,255,.02);
  border-color: rgba(255,255,255,.05);
}

.ref-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a855f7, #6366f1);
  color: white;
  font-size: 16px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ref-info {
  flex: 1;
  min-width: 0;
}

.ref-name {
  font-size: 14px;
  font-weight: 600;
}

.ref-date {
  font-size: 11px;
  opacity: .45;
  margin-top: 2px;
}

.ref-qual {
  font-size: 11px;
  color: #22c55e;
  margin-top: 2px;
}

.ref-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}

.ref-reward {
  font-size: 13px;
  font-weight: 700;
  color: #22c55e;
}

/* Claims list */
.claims-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.claim-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--app-border, rgba(0,0,0,.05));
}

:root:not(.dark) .claim-item {
  background: rgba(0,0,0,.01);
}

:root.dark .claim-item {
  background: rgba(255,255,255,.02);
  border-color: rgba(255,255,255,.05);
}

.claim-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(168,85,247,.1);
  color: #a855f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.claim-info {
  flex: 1;
  min-width: 0;
}

.claim-name {
  font-size: 13px;
  font-weight: 600;
}

.claim-date {
  font-size: 11px;
  opacity: .45;
  margin-top: 2px;
}

.claim-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}

.claim-amount {
  font-size: 14px;
  font-weight: 700;
  color: #22c55e;
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 50px;
  border-radius: 14px;
  border: 1px dashed var(--app-border, rgba(0,0,0,.08));
  opacity: .5;
  font-size: 13px;
  text-align: center;
}

/* Responsive */
@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .stat-box {
    padding: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .code-value {
    font-size: 28px;
    letter-spacing: 2px;
  }

  .code-actions {
    flex-direction: column;
    width: 100%;
  }

  .code-btn {
    justify-content: center;
    width: 100%;
  }
}

@media (max-width: 400px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-box {
    flex-direction: row;
  }
}
</style>
