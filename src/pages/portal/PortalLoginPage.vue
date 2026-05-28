<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, useMessage } from 'naive-ui'
import {
  WifiOutline as WifiIcon,
  SpeedometerOutline as SpeedIcon,
  ShieldCheckmarkOutline as ShieldIcon,
  ChatbubbleEllipsesOutline as SupportIcon,
  EyeOutline as EyeIcon,
  EyeOffOutline as EyeOffIcon,
  LogInOutline as LoginIcon,
  ArrowBackOutline as BackIcon,
  KeyOutline as KeyIcon,
  SendOutline as SendIcon,
  CheckmarkCircleOutline as CheckIcon,
} from '@vicons/ionicons5'
import { FileText as FileTextIcon, Lock as LockIcon } from '@vicons/tabler'
import { portalApi } from '../../api'
import { persistAuthSession } from '../../api/authSession'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const slug = route.params.slug as string

const tenant = ref<{ name: string; slug: string; logo_url: string } | null>(null)
const pageLoading = ref(true)
const notFound = ref(false)
const loading = ref(false)
const showPassword = ref(false)
const form = ref({ customer_code: '', password: '' })

// Reset password state
const resetMode = ref(false)
const resetStep = ref(1) // 1: enter customer_code, 2: enter PIN + new password, 3: success
const resetLoading = ref(false)
const resetForm = ref({ customer_code: '', pin: '', new_password: '' })
const maskedPhone = ref('')
const showNewPassword = ref(false)

const features = [
  { icon: WifiIcon, title: 'Cek Koneksi', desc: 'Pantau status internet Anda secara realtime' },
  { icon: SpeedIcon, title: 'Info Paket', desc: 'Lihat detail paket & kecepatan yang aktif' },
  { icon: SupportIcon, title: 'Tiket Bantuan', desc: 'Laporkan masalah, kami tanggapi dengan cepat' },
  { icon: ShieldIcon, title: 'Kelola Akun', desc: 'Ubah password & lihat riwayat pembayaran' },
]

const initials = computed(() => {
  if (!tenant.value?.name) return '?'
  return tenant.value.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
})

onMounted(async () => {
  try {
    const { data } = await portalApi.tenantInfo(slug)
    tenant.value = data.data
  } catch {
    notFound.value = true
  }
  pageLoading.value = false
})

async function handleLogin() {
  if (!form.value.customer_code.trim() || !form.value.password.trim()) {
    message.warning('Nomor pelanggan dan password wajib diisi')
    return
  }
  loading.value = true
  try {
    const { data } = await portalApi.login(slug, form.value)
    // Store tokens & user
    persistAuthSession(data)
    localStorage.setItem('portal_tenant_slug', slug)
    authStore.user = data.user
    message.success('Login berhasil!')
    router.push('/portal')
  } catch (e: any) {
    const msg = e.response?.data?.error || 'Login gagal'
    message.error(msg)
  } finally {
    loading.value = false
  }
}

function enterResetMode() {
  resetMode.value = true
  resetStep.value = 1
  resetForm.value = { customer_code: '', pin: '', new_password: '' }
  maskedPhone.value = ''
}

function exitResetMode() {
  resetMode.value = false
  resetStep.value = 1
  resetForm.value = { customer_code: '', pin: '', new_password: '' }
  maskedPhone.value = ''
}

async function requestPIN() {
  if (!resetForm.value.customer_code.trim()) {
    message.warning('Nomor pelanggan wajib diisi')
    return
  }
  resetLoading.value = true
  try {
    const { data } = await portalApi.requestResetPIN(slug, {
      customer_code: resetForm.value.customer_code,
    })
    if (data.phone) {
      maskedPhone.value = data.phone
    }
    message.success(data.message || 'PIN telah dikirim melalui WhatsApp')
    resetStep.value = 2
  } catch (e: any) {
    const msg = e.response?.data?.error || 'Gagal mengirim PIN'
    message.error(msg)
  } finally {
    resetLoading.value = false
  }
}

async function resetPassword() {
  if (!resetForm.value.pin.trim()) {
    message.warning('PIN wajib diisi')
    return
  }
  if (!resetForm.value.new_password.trim() || resetForm.value.new_password.length < 6) {
    message.warning('Password baru minimal 6 karakter')
    return
  }
  resetLoading.value = true
  try {
    const { data } = await portalApi.resetPassword(slug, {
      customer_code: resetForm.value.customer_code,
      pin: resetForm.value.pin,
      new_password: resetForm.value.new_password,
    })
    message.success(data.message || 'Password berhasil direset')
    resetStep.value = 3
  } catch (e: any) {
    const msg = e.response?.data?.error || 'Gagal mereset password'
    message.error(msg)
  } finally {
    resetLoading.value = false
  }
}
</script>

<template>
  <!-- Loading state -->
  <div v-if="pageLoading" class="page-loading">
    <div class="loader-ring"></div>
  </div>

  <!-- Not found -->
  <div v-else-if="notFound" class="not-found-page">
    <div class="nf-card">
      <div class="nf-icon">
        <svg viewBox="0 0 80 80" width="80" height="80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="rgba(239,68,68,0.3)" stroke-width="2" fill="rgba(239,68,68,0.05)" />
          <path d="M28 28l24 24M52 28L28 52" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
      <h2>Halaman Tidak Ditemukan</h2>
      <p>Portal pelanggan yang Anda cari tidak tersedia atau sudah tidak aktif.</p>
    </div>
  </div>

  <!-- Login page -->
  <div v-else class="portal-login">
    <!-- Animated background -->
    <div class="bg-gradient"></div>
    <div class="bg-pattern"></div>
    <div class="bg-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div class="login-container">
      <!-- Left: Info panel -->
      <div class="info-panel">
        <div class="info-content">
          <!-- Tenant branding -->
          <div class="brand-section">
            <div class="brand-logo" v-if="tenant?.logo_url">
              <img :src="tenant.logo_url" :alt="tenant.name" />
            </div>
            <div class="brand-avatar" v-else>
              {{ initials }}
            </div>
            <h1 class="brand-name">{{ tenant?.name }}</h1>
            <p class="brand-tagline">Portal Pelanggan</p>
          </div>

          <!-- Divider -->
          <div class="info-divider">
            <div class="divider-line"></div>
            <span class="divider-text">Layanan Portal</span>
            <div class="divider-line"></div>
          </div>

          <!-- Feature cards -->
          <div class="feature-grid">
            <div class="feature-card" v-for="(f, i) in features" :key="i">
              <div class="feature-icon-wrap">
                <n-icon :component="f.icon" :size="20" />
              </div>
              <div class="feature-text">
                <div class="feature-title">{{ f.title }}</div>
                <div class="feature-desc">{{ f.desc }}</div>
              </div>
            </div>
          </div>

          <!-- Footer trust -->
          <div class="info-footer">
            <div class="trust-item">
              <n-icon :component="ShieldIcon" :size="14" />
              Koneksi terenkripsi
            </div>
            <div class="trust-dot"></div>
            <div class="trust-item">
              <n-icon :component="WifiIcon" :size="14" />
              24/7 Online
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Form panel -->
      <div class="form-panel">
        <div class="form-card">
          <!-- Mobile brand (shown on small screens) -->
          <div class="mobile-brand">
            <div class="brand-logo-sm" v-if="tenant?.logo_url">
              <img :src="tenant.logo_url" :alt="tenant.name" />
            </div>
            <div class="brand-avatar-sm" v-else>{{ initials }}</div>
            <h2 class="mobile-name">{{ tenant?.name }}</h2>
          </div>

          <!-- === LOGIN VIEW === -->
          <template v-if="!resetMode">
            <div class="form-header">
              <h2 class="form-title">Masuk ke Portal</h2>
              <p class="form-subtitle">Gunakan nomor pelanggan dan password Anda</p>
            </div>

            <form @submit.prevent="handleLogin" class="login-form">
              <!-- Nomor Pelanggan -->
              <div class="input-group">
                <label class="input-label">Nomor Pelanggan</label>
                <div class="input-wrap">
                  <n-icon :component="FileTextIcon" :size="18" class="input-icon" />
                  <input
                    v-model="form.customer_code"
                    type="text"
                    placeholder="Masukkan nomor pelanggan"
                    autocomplete="username"
                    class="input-field"
                  />
                </div>
              </div>

              <!-- Password -->
              <div class="input-group">
                <label class="input-label">Password</label>
                <div class="input-wrap">
                  <n-icon :component="LockIcon" :size="18" class="input-icon" />
                  <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Password Anda"
                    autocomplete="current-password"
                    class="input-field"
                    @keyup.enter="handleLogin"
                  />
                  <button type="button" class="pw-toggle" @click="showPassword = !showPassword">
                    <n-icon :component="showPassword ? EyeOffIcon : EyeIcon" :size="16" />
                  </button>
                </div>
              </div>

              <!-- Submit -->
              <button type="submit" class="submit-btn" :disabled="loading">
                <span class="btn-loader" v-if="loading"></span>
                <n-icon :component="LoginIcon" :size="18" v-else />
                <span>{{ loading ? 'Memproses...' : 'Masuk' }}</span>
              </button>
            </form>

            <div class="form-footer">
              <p class="footer-help">
                Lupa password?
                <a href="#" class="reset-link" @click.prevent="enterResetMode">Reset via WhatsApp</a>
              </p>
            </div>
          </template>

          <!-- === RESET PASSWORD VIEW === -->
          <template v-else>
            <!-- Step 1: Enter customer code -->
            <template v-if="resetStep === 1">
              <div class="form-header">
                <button class="back-btn" @click="exitResetMode">
                  <n-icon :component="BackIcon" :size="18" />
                  <span>Kembali ke login</span>
                </button>
                <h2 class="form-title">Reset Password</h2>
                <p class="form-subtitle">Masukkan nomor pelanggan Anda. PIN reset akan dikirim melalui WhatsApp.</p>
              </div>

              <form @submit.prevent="requestPIN" class="login-form">
                <div class="input-group">
                  <label class="input-label">Nomor Pelanggan</label>
                  <div class="input-wrap">
                    <n-icon :component="FileTextIcon" :size="18" class="input-icon" />
                    <input
                      v-model="resetForm.customer_code"
                      type="text"
                      placeholder="Masukkan nomor pelanggan"
                      class="input-field"
                    />
                  </div>
                </div>

                <button type="submit" class="submit-btn" :disabled="resetLoading">
                  <span class="btn-loader" v-if="resetLoading"></span>
                  <n-icon :component="SendIcon" :size="18" v-else />
                  <span>{{ resetLoading ? 'Mengirim...' : 'Kirim PIN via WhatsApp' }}</span>
                </button>
              </form>
            </template>

            <!-- Step 2: Enter PIN + new password -->
            <template v-else-if="resetStep === 2">
              <div class="form-header">
                <button class="back-btn" @click="resetStep = 1">
                  <n-icon :component="BackIcon" :size="18" />
                  <span>Kembali</span>
                </button>
                <h2 class="form-title">Verifikasi PIN</h2>
                <p class="form-subtitle">
                  PIN telah dikirim ke WhatsApp <strong>{{ maskedPhone }}</strong>.
                  Masukkan PIN dan password baru Anda.
                </p>
              </div>

              <form @submit.prevent="resetPassword" class="login-form">
                <div class="input-group">
                  <label class="input-label">Kode PIN</label>
                  <div class="input-wrap">
                    <n-icon :component="KeyIcon" :size="18" class="input-icon-component" />
                    <input
                      v-model="resetForm.pin"
                      type="text"
                      inputmode="numeric"
                      maxlength="6"
                      placeholder="Masukkan 6 digit PIN"
                      class="input-field pin-input"
                    />
                  </div>
                </div>

                <div class="input-group">
                  <label class="input-label">Password Baru</label>
                  <div class="input-wrap">
                    <n-icon :component="LockIcon" :size="18" class="input-icon" />
                    <input
                      v-model="resetForm.new_password"
                      :type="showNewPassword ? 'text' : 'password'"
                      placeholder="Minimal 6 karakter"
                      class="input-field"
                    />
                    <button type="button" class="pw-toggle" @click="showNewPassword = !showNewPassword">
                      <n-icon :component="showNewPassword ? EyeOffIcon : EyeIcon" :size="16" />
                    </button>
                  </div>
                </div>

                <button type="submit" class="submit-btn" :disabled="resetLoading">
                  <span class="btn-loader" v-if="resetLoading"></span>
                  <n-icon :component="KeyIcon" :size="18" v-else />
                  <span>{{ resetLoading ? 'Memproses...' : 'Reset Password' }}</span>
                </button>
              </form>

              <div class="form-footer">
                <p class="footer-help">PIN berlaku selama 5 menit</p>
              </div>
            </template>

            <!-- Step 3: Success -->
            <template v-else-if="resetStep === 3">
              <div class="reset-success">
                <div class="success-icon-wrap">
                  <n-icon :component="CheckIcon" :size="48" />
                </div>
                <h2 class="form-title" style="text-align: center">Password Berhasil Direset</h2>
                <p class="form-subtitle" style="text-align: center">
                  Silakan login dengan password baru Anda.
                </p>
                <button class="submit-btn" @click="exitResetMode">
                  <n-icon :component="LoginIcon" :size="18" />
                  <span>Kembali ke Login</span>
                </button>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Page States ===== */
.page-loading {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0e1a;
}

.loader-ring {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 229, 255, 0.15);
  border-top-color: #00e5ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.not-found-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0e1a;
  padding: 24px;
}

.nf-card {
  text-align: center;
  max-width: 360px;
}

.nf-card h2 {
  color: #e2e8f0;
  font-size: 22px;
  font-weight: 700;
  margin: 20px 0 8px;
}

.nf-card p {
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

/* ===== Login Page ===== */
.portal-login {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* ===== Background ===== */
.bg-gradient {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #0a0e1a 0%, #0d1326 30%, #111936 60%, #0d1326 100%);
  z-index: 0;
}

.bg-pattern {
  position: fixed;
  inset: 0;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(0, 229, 255, 0.03) 1px, transparent 0);
  background-size: 40px 40px;
  z-index: 0;
}

.bg-orbs {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: orbFloat 12s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: rgba(0, 229, 255, 0.06);
  top: -10%;
  right: -5%;
  animation-delay: 0s;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: rgba(99, 102, 241, 0.05);
  bottom: -5%;
  left: -5%;
  animation-delay: -4s;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: rgba(0, 229, 255, 0.04);
  top: 40%;
  left: 30%;
  animation-delay: -8s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* ===== Container ===== */
.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: 960px;
  min-height: 580px;
  margin: 24px;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(15, 20, 40, 0.6);
  border: 1px solid rgba(0, 229, 255, 0.08);
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 0 1px rgba(0, 229, 255, 0.05),
    0 25px 60px rgba(0, 0, 0, 0.4),
    0 0 120px rgba(0, 229, 255, 0.03);
}

/* ===== Info Panel (Left) ===== */
.info-panel {
  flex: 1;
  background: linear-gradient(160deg, rgba(0, 229, 255, 0.04) 0%, rgba(99, 102, 241, 0.03) 100%);
  border-right: 1px solid rgba(0, 229, 255, 0.06);
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
  height: 100%;
}

.brand-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  overflow: hidden;
  border: 2px solid rgba(0, 229, 255, 0.15);
  background: rgba(0, 229, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-avatar {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(99, 102, 241, 0.15));
  border: 2px solid rgba(0, 229, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: #00e5ff;
  letter-spacing: 1px;
}

.brand-name {
  font-size: 22px;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
  line-height: 1.2;
}

.brand-tagline {
  font-size: 13px;
  color: #00e5ff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
}

/* Divider */
.info-divider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.12), transparent);
}

.divider-text {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  white-space: nowrap;
}

/* Features */
.feature-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.06);
  transition: all 0.3s ease;
}

.feature-card:hover {
  background: rgba(0, 229, 255, 0.06);
  border-color: rgba(0, 229, 255, 0.12);
  transform: translateX(4px);
}

.feature-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(0, 229, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00e5ff;
  flex-shrink: 0;
}

.feature-title {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
}

.feature-desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 1px;
}

/* Footer trust */
.info-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 229, 255, 0.06);
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #475569;
  font-weight: 500;
}

.trust-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #334155;
}

/* ===== Form Panel (Right) ===== */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 36px;
}

.form-card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.mobile-brand {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.brand-logo-sm {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid rgba(0, 229, 255, 0.15);
  background: rgba(0, 229, 255, 0.05);
}

.brand-logo-sm img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-avatar-sm {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(99, 102, 241, 0.15));
  border: 2px solid rgba(0, 229, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  color: #00e5ff;
}

.mobile-name {
  font-size: 18px;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
}

.form-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-title {
  font-size: 24px;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
}

.form-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* ===== Form ===== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.input-wrap {
  display: flex;
  align-items: center;
  background: rgba(15, 23, 42, 0.6);
  border: 1.5px solid rgba(100, 116, 139, 0.2);
  border-radius: 12px;
  padding: 0 14px;
  transition: all 0.2s ease;
  height: 48px;
}

.input-wrap:focus-within {
  border-color: rgba(0, 229, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.08);
  background: rgba(15, 23, 42, 0.8);
}

.input-icon {
  color: #475569;
  flex-shrink: 0;
  margin-right: 10px;
  transition: color 0.2s;
}

.input-wrap:focus-within .input-icon {
  color: #00e5ff;
}

.input-field {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #e2e8f0;
  font-size: 14px;
  font-family: inherit;
  height: 100%;
}

.input-field::placeholder {
  color: #475569;
}

.pw-toggle {
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
  margin-left: 4px;
}

.pw-toggle:hover {
  color: #94a3b8;
}

/* ===== Submit Button ===== */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  margin-top: 4px;
}

.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.submit-btn:hover:not(:disabled)::before {
  opacity: 1;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0, 188, 212, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ===== Footer ===== */
.form-footer {
  text-align: center;
}

.footer-help {
  font-size: 13px;
  color: #475569;
  margin: 0;
  line-height: 1.5;
}

.footer-help strong {
  color: #94a3b8;
  font-weight: 600;
}

.reset-link {
  color: #00e5ff;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.reset-link:hover {
  color: #00bcd4;
  text-decoration: underline;
}

/* ===== Back Button ===== */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  margin-bottom: 8px;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #00e5ff;
}

/* ===== PIN Input ===== */
.input-icon-component {
  color: #475569;
  flex-shrink: 0;
  margin-right: 10px;
  transition: color 0.2s;
}

.input-wrap:focus-within .input-icon-component {
  color: #00e5ff;
}

.pin-input {
  letter-spacing: 6px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

/* ===== Reset Success ===== */
.reset-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px 0;
}

.success-icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.1);
  border: 2px solid rgba(16, 185, 129, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
  animation: scaleIn 0.4s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    max-width: 440px;
    min-height: auto;
    margin: 16px;
    border-radius: 20px;
  }

  .info-panel {
    display: none;
  }

  .mobile-brand {
    display: flex;
  }

  .form-panel {
    padding: 32px 24px;
  }

  .form-card {
    gap: 24px;
  }

  .form-title {
    text-align: center;
    font-size: 20px;
  }

  .form-subtitle {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .login-container {
    margin: 12px;
    border-radius: 16px;
  }

  .form-panel {
    padding: 24px 20px;
  }
}

/* ===== Animations ===== */
@media (prefers-reduced-motion: no-preference) {
  .login-container {
    animation: fadeUp 0.5s ease-out;
  }

  .feature-card {
    animation: fadeUp 0.5s ease-out both;
  }

  .feature-card:nth-child(1) { animation-delay: 0.1s; }
  .feature-card:nth-child(2) { animation-delay: 0.2s; }
  .feature-card:nth-child(3) { animation-delay: 0.3s; }
  .feature-card:nth-child(4) { animation-delay: 0.4s; }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
