<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NForm, NFormItem, NInput, NSwitch, NSelect, NSpin,
  NButton, NTag, NDatePicker, NText, NIcon, NModal, NSpace,
  useMessage,
} from 'naive-ui'
import {
  AlertCircleOutline, LogoWhatsapp, InformationCircleOutline, TrashOutline,
} from '@vicons/ionicons5'
import { tenantApi } from '../../api'
import { adminApi } from '../../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const id = route.params.id as string

const loading = ref(true)
const saving = ref(false)
const resettingPass = ref(false)
const approving = ref(false)
const showDeleteModal = ref(false)
const deleteConfirmName = ref('')
const deleting = ref(false)
const plans = ref<any[]>([])
const isMobile = ref(false)

const MOBILE_BREAKPOINT = 768
function checkMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

const form = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  is_active: true,
  status: 'active',
  plan: 'trial',
  plan_expires_at: null as string | null,
  max_customers: 50,
  fingerprint: '',
  registration_ip: '',
  risk_score: 0,
  risk_reasons: '',
})

const planOptions = computed(() =>
  plans.value.map((p: any) => ({
    label: `${p.name} — maks. ${p.max_customers > 0 ? p.max_customers + ' pelanggan' : 'tidak terbatas'}`,
    value: p.slug,
    max_customers: p.max_customers,
    duration_months: p.duration_months,
  }))
)

const allPlanOptions = computed(() => [
  { label: 'Gratis (Tanpa Batas)', value: 'gratis', max_customers: 50, duration_months: 0 },
  ...planOptions.value,
])

const isOnTrial = computed(() => form.value.plan === 'trial')

const avatarInitials = computed(() =>
  (form.value.name || 'T').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
)

const statusConfig = computed(() => {
  const map: Record<string, any> = {
    active:    { type: 'success' as const, label: 'Aktif' },
    pending:   { type: 'warning' as const, label: 'Menunggu Approval' },
    suspended: { type: 'error'   as const, label: 'Suspended' },
  }
  return map[form.value.status] || map.active
})

const planConfig = computed(() => {
  const map: Record<string, any> = {
    trial:  { type: 'default' as const, label: 'Trial' },
    gratis: { type: 'info'    as const, label: 'Gratis' },
    free:   { type: 'info'    as const, label: 'Gratis' },
  }
  return map[form.value.plan?.toLowerCase()] || { type: 'success' as const, label: form.value.plan }
})

const riskLevel = computed(() => {
  const s = form.value.risk_score
  if (s >= 40) return { pct: Math.min(s, 100), color: '#ef4444', label: 'Tinggi' }
  if (s >= 20) return { pct: Math.min(s, 100), color: '#f59e0b', label: 'Sedang' }
  return { pct: Math.min(s, 100), color: '#22c55e', label: 'Rendah' }
})

const daysLeft = computed(() => {
  if (!form.value.plan_expires_at) return null
  return Math.ceil((new Date(form.value.plan_expires_at).getTime() - Date.now()) / 86400000)
})

const expiryLabel = computed(() => {
  if (!form.value.plan_expires_at) return null
  return new Date(form.value.plan_expires_at).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})

const expiresTimestamp = computed({
  get: () => form.value.plan_expires_at ? new Date(form.value.plan_expires_at).getTime() : null,
  set: (ts: number | null) => {
    form.value.plan_expires_at = ts ? new Date(ts).toISOString().slice(0, 10) : null
  },
})

function onPlanChange(slug: string) {
  const opt = allPlanOptions.value.find(p => p.value === slug)
  if (!opt) return
  if ((opt as any).max_customers > 0) form.value.max_customers = (opt as any).max_customers
  const now = new Date()
  if (slug === 'trial') {
    now.setDate(now.getDate() + 30)
    form.value.plan_expires_at = now.toISOString().slice(0, 10)
  } else if (slug === 'gratis') {
    form.value.plan_expires_at = null
  } else if ((opt as any).duration_months > 0) {
    now.setMonth(now.getMonth() + (opt as any).duration_months)
    form.value.plan_expires_at = now.toISOString().slice(0, 10)
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [tenantRes, plansRes] = await Promise.all([
      tenantApi.getById(id),
      adminApi.listSubscriptionPlans(),
    ])
    const t = tenantRes.data?.data || tenantRes.data
    plans.value = plansRes.data?.data || []
    form.value = {
      name: t.name || '',
      email: t.email || '',
      phone: t.phone || '',
      address: t.address || '',
      is_active: t.is_active !== false,
      status: t.status || 'active',
      plan: t.plan || 'trial',
      plan_expires_at: t.plan_expires_at ? t.plan_expires_at.slice(0, 10) : null,
      max_customers: t.max_customers || 50,
      fingerprint: t.fingerprint || '',
      registration_ip: t.registration_ip || '',
      risk_score: t.risk_score || 0,
      risk_reasons: t.risk_reasons || '',
    }
  } catch {
    message.error('Gagal memuat data tenant')
  }
  loading.value = false
}

async function handleApprove() {
  approving.value = true
  try {
    await tenantApi.approve(id)
    message.success('Tenant berhasil disetujui dan diaktifkan')
    fetchData()
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menyetujui tenant')
  }
  approving.value = false
}

async function handleResetPassword() {
  if (!confirm('Reset password tenant ini? Password baru akan dikirim via WhatsApp.')) return
  resettingPass.value = true
  try {
    const res = await tenantApi.resetPassword(id)
    message.success(res.data?.message || 'Password berhasil direset')
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal me-reset password')
  }
  resettingPass.value = false
}

async function handleSave() {
  if (!form.value.name || !form.value.email) {
    message.warning('Nama dan email wajib diisi')
    return
  }
  saving.value = true
  try {
    await tenantApi.adminUpdate(id, {
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone,
      address: form.value.address,
      is_active: form.value.is_active,
      status: form.value.status,
      plan: form.value.plan,
      plan_expires_at: form.value.plan_expires_at || null,
      max_customers: form.value.max_customers,
    })
    message.success('Perubahan berhasil disimpan')
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menyimpan')
  }
  saving.value = false
}

async function handleDelete() {
  if (deleteConfirmName.value !== form.value.name) {
    message.warning('Nama tenant tidak sesuai')
    return
  }
  deleting.value = true
  try {
    await tenantApi.delete(id)
    message.success('Tenant berhasil dihapus')
    router.push('/superadmin/tenants')
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal menghapus tenant')
  }
  deleting.value = false
}

onMounted(() => {
  fetchData()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <n-spin :show="loading">
    <div class="detail-wrap">

      <!-- Top bar -->
      <div class="topbar">
        <button class="back-link" @click="router.push('/superadmin/tenants')">
          ← Daftar Tenant
        </button>
        <div v-if="!isMobile" class="topbar-actions">
          <n-button ghost size="small" @click="router.push('/superadmin/tenants')">Batal</n-button>
          <n-button type="primary" size="small" :loading="saving" @click="handleSave">
            Simpan Perubahan
          </n-button>
        </div>
      </div>

      <!-- Pending Approval Banner -->
      <div v-if="form.status === 'pending'" class="approval-banner">
        <div class="banner-left">
          <n-icon :component="AlertCircleOutline" :size="18" color="#f59e0b" style="flex-shrink:0;margin-top:1px" />
          <div>
            <div class="banner-title">Tenant Menunggu Approval</div>
            <div class="banner-desc">
              Pendaftaran baru memerlukan persetujuan manual sebelum dapat menggunakan panel.
              <span v-if="form.risk_score >= 40" style="color:#ef4444;font-weight:600"> Skor risiko tinggi ({{ form.risk_score }}).</span>
            </div>
          </div>
        </div>
        <n-button type="warning" size="small" :loading="approving" @click="handleApprove" style="flex-shrink:0">
          Setujui & Aktifkan
        </n-button>
      </div>

      <!-- Hero Card -->
      <div class="hero-card">
        <div class="hero-avatar">{{ avatarInitials }}</div>
        <div class="hero-identity">
          <h1 class="hero-name">{{ form.name || '—' }}</h1>
          <div class="hero-badges">
            <n-tag :type="planConfig.type" size="small" round :bordered="false">{{ planConfig.label }}</n-tag>
            <n-tag :type="statusConfig.type" size="small" :bordered="false">{{ statusConfig.label }}</n-tag>
            <n-tag v-if="!form.is_active" type="error" size="small" :bordered="false">Login Nonaktif</n-tag>
          </div>
          <div class="hero-contact">
            <span v-if="form.email">{{ form.email }}</span>
            <span v-if="form.phone" class="contact-sep">·</span>
            <span v-if="form.phone">{{ form.phone }}</span>
            <span v-if="form.address" class="contact-sep">·</span>
            <span v-if="form.address" class="contact-addr">{{ form.address }}</span>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="main-grid">

        <!-- Left: Edit Form -->
        <div class="form-col">

          <!-- Informasi Dasar -->
          <n-card class="section-card" size="small">
            <div class="section-hd">
              <span class="section-dot"></span>
              Informasi Dasar
            </div>
            <n-form label-placement="top" class="clean-form">
              <n-form-item label="Nama ISP">
                <n-input v-model:value="form.name" placeholder="PT Internet Sejahtera" />
              </n-form-item>
              <div class="form-row">
                <n-form-item label="Email" style="flex:1;min-width:0">
                  <n-input v-model:value="form.email" placeholder="admin@isp.com" />
                </n-form-item>
                <n-form-item label="Telepon" style="flex:1;min-width:0">
                  <n-input v-model:value="form.phone" placeholder="081234567890" />
                </n-form-item>
              </div>
              <n-form-item label="Alamat">
                <n-input
                  v-model:value="form.address"
                  type="textarea"
                  :rows="2"
                  placeholder="Jl. Contoh No. 1, Kota"
                />
              </n-form-item>
            </n-form>
          </n-card>

          <!-- Paket Langganan -->
          <n-card class="section-card" size="small">
            <div class="section-hd">
              <span class="section-dot dot-purple"></span>
              Paket Langganan
            </div>

            <!-- Trial info strip -->
            <div v-if="isOnTrial" class="trial-strip">
              <div class="trial-left">
                <span class="trial-badge">Trial 30 Hari</span>
                <span class="trial-label">Masa Percobaan</span>
              </div>
              <div class="trial-right">
                <span
                  class="trial-days"
                  :class="{ expired: (daysLeft ?? 0) <= 0, urgent: (daysLeft ?? 99) > 0 && (daysLeft ?? 99) <= 5 }"
                >
                  {{ daysLeft === null ? '—' : daysLeft > 0 ? `${daysLeft} hari lagi` : 'Sudah berakhir' }}
                </span>
                <span v-if="expiryLabel" class="trial-date">berakhir {{ expiryLabel }}</span>
              </div>
            </div>

            <n-form label-placement="top" class="clean-form">
              <div class="form-row">
                <n-form-item label="Paket" style="flex:1;min-width:0">
                  <n-select
                    v-model:value="form.plan"
                    :options="allPlanOptions"
                    @update:value="onPlanChange"
                    placeholder="Pilih paket"
                  />
                </n-form-item>
                <n-form-item label="Maks. Pelanggan" style="width:150px;flex-shrink:0">
                  <div style="display:flex;align-items:center;gap:6px">
                    <n-input
                      :value="String(form.max_customers)"
                      @input="(v: string) => form.max_customers = parseInt(v) || 0"
                      placeholder="50"
                    />
                  </div>
                </n-form-item>
              </div>
              <n-form-item v-if="!isOnTrial" label="Berlaku Sampai">
                <n-date-picker
                  v-model:value="expiresTimestamp"
                  type="date"
                  clearable
                  placeholder="Pilih tanggal berakhir"
                  style="width:100%"
                />
              </n-form-item>
              <n-text v-if="!isOnTrial" depth="3" style="font-size:11px;display:block;margin-top:-4px">
                Kosongkan untuk langganan tanpa batas waktu.
              </n-text>
            </n-form>
          </n-card>

        </div>

        <!-- Right: Sidebar -->
        <div class="sidebar-col">

          <!-- Status & Akses -->
          <n-card class="section-card" size="small">
            <div class="section-hd">
              <span class="section-dot dot-green"></span>
              Status & Akses
            </div>
            <div class="sidebar-rows">
              <div class="sidebar-row">
                <div>
                  <div class="sidebar-label">Status Akun</div>
                  <div class="sidebar-sublabel">Visibilitas dan akses tenant</div>
                </div>
                <n-select
                  v-model:value="form.status"
                  :options="[
                    { label: 'Aktif', value: 'active' },
                    { label: 'Menunggu Approval', value: 'pending' },
                    { label: 'Suspended', value: 'suspended' },
                  ]"
                  size="small"
                  style="width:160px"
                />
              </div>
              <div class="sidebar-divider"></div>
              <div class="sidebar-row">
                <div>
                  <div class="sidebar-label">Login Panel</div>
                  <div class="sidebar-sublabel">Izinkan masuk ke panel</div>
                </div>
                <n-switch v-model:value="form.is_active" size="small" />
              </div>
            </div>
          </n-card>

          <!-- Risk Score (only shown if has score or reasons) -->
          <n-card v-if="form.risk_score > 0 || form.risk_reasons" class="section-card" size="small">
            <div class="section-hd">
              <span class="section-dot" :style="{ background: riskLevel.color }"></span>
              Analisis Risiko
            </div>
            <div class="risk-wrap">
              <div class="risk-top">
                <span class="risk-num" :style="{ color: riskLevel.color }">{{ form.risk_score }}</span>
                <div class="risk-meta">
                  <n-tag
                    :type="form.risk_score >= 40 ? 'error' : form.risk_score >= 20 ? 'warning' : 'success'"
                    size="small" round :bordered="false"
                  >{{ riskLevel.label }}</n-tag>
                  <span class="risk-label-sub">Skor risiko</span>
                </div>
              </div>
              <div class="risk-bar-bg">
                <div
                  class="risk-bar-fill"
                  :style="{ width: `${riskLevel.pct}%`, background: riskLevel.color }"
                ></div>
              </div>
              <p v-if="form.risk_reasons" class="risk-reasons">{{ form.risk_reasons }}</p>
            </div>
          </n-card>

          <!-- Metadata Registrasi -->
          <n-card class="section-card" size="small">
            <div class="section-hd">
              <span class="section-dot dot-gray"></span>
              Metadata Registrasi
            </div>
            <div class="meta-rows">
              <div class="meta-row">
                <span class="meta-key">IP Registrasi</span>
                <span class="meta-val">{{ form.registration_ip || '—' }}</span>
              </div>
              <div class="meta-divider"></div>
              <div class="meta-row">
                <span class="meta-key">Device Fingerprint</span>
                <span class="meta-val fingerprint">{{ form.fingerprint || '—' }}</span>
              </div>
            </div>
          </n-card>

          <!-- Tindakan -->
          <n-card class="section-card" size="small">
            <div class="section-hd">
              <span class="section-dot dot-red"></span>
              Tindakan Akun
            </div>
            <p class="action-desc">
              Kirim password baru ke nomor WhatsApp terdaftar tenant ini. Tenant harus ganti password setelah login.
            </p>
            <n-button
              type="warning"
              ghost
              size="small"
              :loading="resettingPass"
              @click="handleResetPassword"
              style="width:100%;margin-bottom:10px"
            >
              <template #icon><n-icon :component="LogoWhatsapp" /></template>
              Reset Password & Kirim WA
            </n-button>
            <div class="delete-divider"></div>
            <p class="action-desc" style="margin-top:10px;color:#ef4444">
              Hapus tenant beserta seluruh data secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <n-button
              type="error"
              ghost
              size="small"
              @click="showDeleteModal = true"
              style="width:100%"
            >
              <template #icon><n-icon :component="TrashOutline" /></template>
              Hapus Tenant
            </n-button>
          </n-card>

        </div>
      </div>

      <!-- Mobile Action Bar -->
      <div v-if="isMobile" class="mobile-actions">
        <n-button block ghost @click="router.push('/superadmin/tenants')">Batal</n-button>
        <n-button block type="primary" :loading="saving" @click="handleSave">Simpan Perubahan</n-button>
      </div>

    </div>
  </n-spin>

  <!-- Delete Confirmation Modal -->
  <n-modal
    v-model:show="showDeleteModal"
    preset="card"
    title="Hapus Tenant"
    :style="{ maxWidth: '440px', width: '95vw' }"
    :mask-closable="false"
  >
    <div style="margin-bottom:16px">
      <p style="margin:0 0 12px;line-height:1.6">
        Tindakan ini akan menghapus <strong>{{ form.name }}</strong> beserta semua data secara permanen dan tidak dapat dibatalkan.
      </p>
      <p style="margin:0 0 8px;font-size:13px;opacity:0.6">Ketik nama tenant untuk konfirmasi:</p>
      <n-input
        v-model:value="deleteConfirmName"
        :placeholder="form.name"
        @keydown.enter="handleDelete"
      />
    </div>
    <n-space justify="end">
      <n-button @click="showDeleteModal = false; deleteConfirmName = ''">Batal</n-button>
      <n-button
        type="error"
        :loading="deleting"
        :disabled="deleteConfirmName !== form.name"
        @click="handleDelete"
      >
        Hapus Permanen
      </n-button>
    </n-space>
  </n-modal>
</template>

<style scoped>
/* ── Layout ── */
.detail-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1020px;
}

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.topbar-actions { display: flex; gap: 8px; }

.back-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  opacity: 0.45;
  padding: 0;
  color: inherit;
  transition: opacity 0.15s;
}
.back-link:hover { opacity: 0.9; }

/* ── Approval Banner ── */
.approval-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 10px;
  background: rgba(245,158,11,0.07);
  border: 1px solid rgba(245,158,11,0.2);
}
.banner-left { display: flex; align-items: flex-start; gap: 10px; flex: 1; }
.banner-title { font-size: 13px; font-weight: 600; color: #f59e0b; margin-bottom: 3px; }
.banner-desc { font-size: 12px; opacity: 0.65; line-height: 1.5; }

/* ── Hero Card ── */
.hero-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 22px;
  border-radius: 14px;
  border: 1px solid rgba(255,23,68,0.1);
  background: linear-gradient(120deg, rgba(255,23,68,0.05) 0%, rgba(124,77,255,0.03) 100%);
}

.hero-avatar {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  background: linear-gradient(135deg, #ff1744 0%, #c0002d 100%);
  color: #fff;
  font-weight: 800;
  font-size: 19px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(255,23,68,0.3);
}

.hero-identity { flex: 1; min-width: 0; }

.hero-name {
  font-size: 19px;
  font-weight: 700;
  margin: 0 0 7px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hero-badges {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 7px;
}

.hero-contact {
  font-size: 12px;
  opacity: 0.45;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  line-height: 1.4;
}
.contact-sep { opacity: 0.4; }
.contact-addr {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* ── Main Grid ── */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 290px;
  gap: 14px;
  align-items: start;
}
.form-col, .sidebar-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Section Cards ── */
.section-card { border-radius: 12px !important; }
:root:not(.dark) .section-card { border-color: rgba(0,0,0,0.06) !important; }
:root.dark .section-card { border-color: rgba(255,255,255,0.06) !important; }

.section-hd {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  opacity: 0.45;
  margin-bottom: 14px;
}

.section-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ff1744;
  flex-shrink: 0;
}
.dot-purple { background: #818cf8; }
.dot-green  { background: #22c55e; }
.dot-gray   { background: #9ca3af; }
.dot-red    { background: #ef4444; }

/* ── Form ── */
.clean-form :deep(.n-form-item) { margin-bottom: 10px; }
.clean-form :deep(.n-form-item:last-child) { margin-bottom: 0; }
.clean-form :deep(.n-form-item-label) {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.5;
  padding-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-row { display: flex; gap: 10px; }

/* ── Trial Strip ── */
.trial-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(99,102,241,0.06);
  border: 1px solid rgba(99,102,241,0.14);
  margin-bottom: 14px;
  gap: 8px;
}
.trial-left { display: flex; align-items: center; gap: 8px; }
.trial-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(99,102,241,0.12);
  color: #818cf8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.trial-label { font-size: 12px; opacity: 0.6; }
.trial-right { text-align: right; }
.trial-days { font-size: 13px; font-weight: 700; color: #818cf8; display: block; }
.trial-days.expired { color: #ef4444; }
.trial-days.urgent  { color: #f59e0b; }
.trial-date { font-size: 11px; opacity: 0.4; white-space: nowrap; }

/* ── Sidebar ── */
.sidebar-rows { display: flex; flex-direction: column; gap: 12px; }
.sidebar-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sidebar-label { font-size: 13px; font-weight: 500; }
.sidebar-sublabel { font-size: 11px; opacity: 0.4; margin-top: 1px; }
.sidebar-divider { height: 1px; background: rgba(128,128,128,0.08); margin: 0 -2px; }

/* ── Risk ── */
.risk-wrap { display: flex; flex-direction: column; gap: 10px; }
.risk-top { display: flex; align-items: center; gap: 12px; }
.risk-num {
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -2px;
}
.risk-meta { display: flex; flex-direction: column; gap: 4px; }
.risk-label-sub { font-size: 11px; opacity: 0.4; }
.risk-bar-bg {
  height: 3px;
  border-radius: 3px;
  background: rgba(128,128,128,0.1);
  overflow: hidden;
}
.risk-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(.4,0,.2,1);
}
.risk-reasons {
  font-size: 12px;
  opacity: 0.5;
  margin: 0;
  line-height: 1.5;
}

/* ── Metadata ── */
.meta-rows { display: flex; flex-direction: column; gap: 10px; }
.meta-divider { height: 1px; background: rgba(128,128,128,0.08); }
.meta-row { display: flex; flex-direction: column; gap: 3px; }
.meta-key {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.4;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.meta-val { font-size: 12px; font-weight: 500; }
.fingerprint {
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  opacity: 0.6;
}

/* ── Tindakan ── */
.action-desc {
  font-size: 12px;
  opacity: 0.5;
  line-height: 1.55;
  margin: 0 0 10px;
}
.delete-divider {
  height: 1px;
  background: rgba(239, 68, 68, 0.15);
  margin: 0 -2px;
}

/* ── Mobile Action Bar ── */
.mobile-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Light Mode ── */
html:not(.dark) .hero-card {
  background: linear-gradient(120deg, rgba(255,23,68,0.03) 0%, rgba(124,77,255,0.02) 100%);
  border-color: rgba(255,23,68,0.08);
}
html:not(.dark) .approval-banner {
  background: rgba(245,158,11,0.05);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .main-grid { grid-template-columns: 1fr; }
  .hero-name { font-size: 17px; }
}

@media (max-width: 640px) {
  .hero-card { padding: 16px; gap: 14px; }
  .hero-avatar { width: 46px; height: 46px; font-size: 16px; border-radius: 11px; }
  .form-row { flex-direction: column; gap: 0; }
  .approval-banner { flex-direction: column; align-items: flex-start; }
  .trial-strip { flex-direction: column; align-items: flex-start; gap: 6px; }
  .trial-right { text-align: left; }
}
</style>
