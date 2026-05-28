<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NA, NIcon, useMessage } from 'naive-ui'
import {
  ArrowBackOutline as BackIcon,
  KeyOutline as KeyIcon,
  SendOutline as SendIcon,
  CheckmarkCircleOutline as CheckIcon,
  LogInOutline as LoginIcon,
} from '@vicons/ionicons5'
import {
  ShieldCheck as ShieldCheckIcon,
  ChartBar as ChartBarIcon,
  Star as StarFilledIcon,
  Clock as ClockIcon,
} from '@vicons/tabler'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/theme'
import { authApi } from '../../api'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)
const message = useMessage()
const loading = ref(false)
const showTenantField = ref(false)

const form = ref({
  tenant_id: '',
  email: '',
  password: '',
})

// Reset password state
const resetMode = ref(false)
const resetStep = ref(1)
const resetLoading = ref(false)
const resetForm = ref({ email: '', phone: '', pin: '', new_password: '' })
const maskedPhone = ref('')

const features = [
  { icon: 'tower', title: 'Multi-Tenant', desc: 'Kelola banyak ISP dalam satu platform terpusat' },
  { icon: 'fiber', title: 'FTTH Ready', desc: 'Dukungan penuh jaringan fiber optic to the home' },
  { icon: 'shield', title: 'RADIUS AAA', desc: 'Autentikasi, Autorisasi & Akuntansi standar industri' },
  { icon: 'chart', title: 'Real-time Analytics', desc: 'Monitoring bandwidth, trafik & performa jaringan' },
]

const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '10K+', label: 'Pelanggan' },
  { value: '<1ms', label: 'Latency' },
  { value: '24/7', label: 'Monitoring' },
]

async function handleLogin() {
  if (!form.value.email || !form.value.password) {
    message.warning('Email dan password wajib diisi')
    return
  }
  if (showTenantField.value && !form.value.tenant_id) {
    message.warning('Tenant ID wajib diisi')
    return
  }
  loading.value = true
  try {
    await authStore.login(form.value.email, form.value.password, form.value.tenant_id || undefined)
    message.success('Login berhasil')
    const role = authStore.user?.role || ''
    if (role === 'superadmin') router.push('/superadmin')
    else if (role === 'customer') router.push('/portal')
    else router.push('/')
  } catch (e: any) {
    const code = e.response?.data?.code
    if (code === 'MULTIPLE_TENANTS') {
      showTenantField.value = true
      message.warning('Email terdaftar di beberapa tenant, silakan masukkan Tenant ID')
    } else {
      message.error(e.response?.data?.error || 'Login gagal')
    }
  } finally {
    loading.value = false
  }
}

function enterResetMode() {
  resetMode.value = true
  resetStep.value = 1
  resetForm.value = { email: '', phone: '', pin: '', new_password: '' }
  maskedPhone.value = ''
}

function exitResetMode() {
  resetMode.value = false
  resetStep.value = 1
  resetForm.value = { email: '', phone: '', pin: '', new_password: '' }
  maskedPhone.value = ''
}

async function requestPIN() {
  if (!resetForm.value.email.trim() || !resetForm.value.phone.trim()) {
    message.warning('Email dan nomor WhatsApp wajib diisi')
    return
  }
  resetLoading.value = true
  try {
    const { data } = await authApi.requestResetPIN({
      email: resetForm.value.email,
      phone: resetForm.value.phone,
    })
    if (data.phone) maskedPhone.value = data.phone
    message.success(data.message || 'PIN telah dikirim melalui WhatsApp')
    resetStep.value = 2
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal mengirim PIN')
  } finally {
    resetLoading.value = false
  }
}

async function resetPassword() {
  if (!resetForm.value.pin.trim()) {
    message.warning('PIN wajib diisi')
    return
  }
  if (!resetForm.value.new_password.trim() || resetForm.value.new_password.length < 8) {
    message.warning('Password baru minimal 8 karakter')
    return
  }
  resetLoading.value = true
  try {
    const { data } = await authApi.resetPassword({
      email: resetForm.value.email,
      phone: resetForm.value.phone,
      pin: resetForm.value.pin,
      new_password: resetForm.value.new_password,
    })
    message.success(data.message || 'Password berhasil direset')
    resetStep.value = 3
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal mereset password')
  } finally {
    resetLoading.value = false
  }
}
</script>

<template>
  <div class="login-page" :class="{ 'light-mode': !isDark }">
    <!-- Background effects -->
    <div class="bg-grid"></div>
    <div class="bg-particles">
      <div class="particle" v-for="i in 30" :key="i" :style="{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`
      }"></div>
    </div>

    <!-- Fiber optic lines spanning full width -->
    <svg class="fiber-lines" viewBox="0 0 1440 900" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fiberGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#00e5ff;stop-opacity:0" />
          <stop offset="30%" style="stop-color:#00e5ff;stop-opacity:0.4" />
          <stop offset="50%" style="stop-color:#7c4dff;stop-opacity:0.6" />
          <stop offset="70%" style="stop-color:#00e5ff;stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:#00e5ff;stop-opacity:0" />
        </linearGradient>
        <linearGradient id="fiberGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#7c4dff;stop-opacity:0" />
          <stop offset="40%" style="stop-color:#00e5ff;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#00e5ff;stop-opacity:0" />
        </linearGradient>
      </defs>
      <path d="M0,200 Q360,120 720,220 T1440,180" stroke="url(#fiberGrad1)" stroke-width="1.5" fill="none" class="fiber-path" />
      <path d="M0,450 Q360,550 720,400 T1440,480" stroke="url(#fiberGrad2)" stroke-width="1" fill="none" class="fiber-path delay" />
      <path d="M0,700 Q480,620 960,720 T1440,650" stroke="url(#fiberGrad1)" stroke-width="1" fill="none" class="fiber-path delay2" />
    </svg>

    <div class="login-wrapper">
      <!-- HERO SECTION (Left Side) -->
      <div class="hero-section">
        <div class="hero-content">
          <!-- Animated tower illustration -->
          <div class="hero-illustration">
            <svg viewBox="0 0 320 280" fill="none" class="hero-svg">
              <!-- Globe/Earth circle -->
              <circle cx="160" cy="140" r="90" stroke="rgba(0,229,255,0.12)" stroke-width="1" fill="none" />
              <circle cx="160" cy="140" r="70" stroke="rgba(0,229,255,0.08)" stroke-width="0.8" fill="none" stroke-dasharray="4 6" class="orbit-ring" />
              <circle cx="160" cy="140" r="110" stroke="rgba(124,77,255,0.06)" stroke-width="0.8" fill="none" stroke-dasharray="3 8" class="orbit-ring reverse" />

              <!-- Network nodes -->
              <circle cx="160" cy="50" r="6" fill="rgba(0,229,255,0.15)" stroke="#00e5ff" stroke-width="1.2" />
              <circle cx="160" cy="50" r="3" fill="#00e5ff" class="animate-pulse" />

              <circle cx="80" cy="170" r="5" fill="rgba(124,77,255,0.15)" stroke="#7c4dff" stroke-width="1" />
              <circle cx="80" cy="170" r="2.5" fill="#7c4dff" class="animate-pulse" />

              <circle cx="240" cy="170" r="5" fill="rgba(0,229,255,0.15)" stroke="#00e5ff" stroke-width="1" />
              <circle cx="240" cy="170" r="2.5" fill="#00e5ff" class="animate-pulse" />

              <circle cx="120" cy="240" r="4" fill="rgba(0,229,255,0.15)" stroke="#00e5ff" stroke-width="0.8" />
              <circle cx="200" cy="240" r="4" fill="rgba(124,77,255,0.15)" stroke="#7c4dff" stroke-width="0.8" />

              <!-- Connection lines -->
              <line x1="160" y1="56" x2="86" y2="166" stroke="rgba(0,229,255,0.15)" stroke-width="0.8" stroke-dasharray="4 4" class="data-flow" />
              <line x1="160" y1="56" x2="234" y2="166" stroke="rgba(0,229,255,0.15)" stroke-width="0.8" stroke-dasharray="4 4" class="data-flow delay" />
              <line x1="86" y1="174" x2="116" y2="236" stroke="rgba(124,77,255,0.12)" stroke-width="0.6" stroke-dasharray="3 5" class="data-flow delay2" />
              <line x1="234" y1="174" x2="204" y2="236" stroke="rgba(124,77,255,0.12)" stroke-width="0.6" stroke-dasharray="3 5" class="data-flow" />
              <line x1="86" y1="174" x2="234" y2="174" stroke="rgba(0,229,255,0.08)" stroke-width="0.6" stroke-dasharray="6 4" class="data-flow delay" />

              <!-- Central tower -->
              <polygon points="148,160 172,160 166,100 154,100" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.3)" stroke-width="0.8"/>
              <line x1="154" y1="100" x2="166" y2="160" stroke="rgba(0,229,255,0.12)" stroke-width="0.4"/>
              <line x1="166" y1="100" x2="154" y2="160" stroke="rgba(0,229,255,0.12)" stroke-width="0.4"/>
              <line x1="155" y1="115" x2="165" y2="115" stroke="rgba(0,229,255,0.15)" stroke-width="0.4"/>
              <line x1="155" y1="130" x2="165" y2="130" stroke="rgba(0,229,255,0.15)" stroke-width="0.4"/>
              <line x1="156" y1="145" x2="164" y2="145" stroke="rgba(0,229,255,0.15)" stroke-width="0.4"/>
              <!-- Antenna -->
              <line x1="160" y1="100" x2="160" y2="75" stroke="rgba(0,229,255,0.5)" stroke-width="1.2"/>
              <circle cx="160" cy="73" r="2.5" fill="#00e5ff" class="animate-pulse"/>
              <!-- Signal waves from tower -->
              <path d="M145,85 Q160,78 175,85" stroke="rgba(0,229,255,0.25)" stroke-width="0.8" fill="none" class="signal-wave"/>
              <path d="M138,90 Q160,80 182,90" stroke="rgba(0,229,255,0.15)" stroke-width="0.6" fill="none" class="signal-wave delay"/>

              <!-- Satellite (floating) -->
              <g class="animate-float" style="transform-origin: 260px 60px">
                <rect x="248" y="55" width="24" height="12" rx="2" fill="rgba(124,77,255,0.1)" stroke="rgba(124,77,255,0.4)" stroke-width="0.8"/>
                <rect x="230" y="57" width="16" height="8" rx="1" fill="rgba(124,77,255,0.06)" stroke="rgba(124,77,255,0.25)" stroke-width="0.5"/>
                <rect x="274" y="57" width="16" height="8" rx="1" fill="rgba(124,77,255,0.06)" stroke="rgba(124,77,255,0.25)" stroke-width="0.5"/>
                <circle cx="260" cy="48" r="3" stroke="rgba(0,229,255,0.3)" fill="none" class="signal-wave"/>
              </g>

              <!-- Data packets animated -->
              <circle r="2" fill="#00e5ff" class="data-packet">
                <animateMotion dur="3s" repeatCount="indefinite" path="M160,56 L86,166" />
              </circle>
              <circle r="1.5" fill="#7c4dff" class="data-packet">
                <animateMotion dur="4s" repeatCount="indefinite" path="M160,56 L234,166" />
              </circle>
              <circle r="1.5" fill="#00e5ff" class="data-packet">
                <animateMotion dur="3.5s" repeatCount="indefinite" path="M86,174 L234,174" />
              </circle>
            </svg>
          </div>

          <!-- Brand & tagline -->
          <div class="hero-brand">
            <h1 class="hero-title">D RADIUS</h1>
            <p class="hero-tagline">Platform Manajemen Infrastruktur<br/>Jaringan Telekomunikasi Terpadu</p>
          </div>

          <!-- Feature cards -->
          <div class="hero-features">
            <div class="feature-card" v-for="(f, i) in features" :key="i">
              <div class="feature-icon">
                <svg v-if="f.icon === 'tower'" viewBox="0 0 24 24" width="20" height="20" fill="none">
                  <path d="M12 2v20M12 6l-4 3M12 6l4 3M8 22h8M9 14h6" stroke="#00e5ff" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="12" cy="3" r="1.5" fill="#00e5ff"/>
                </svg>
                <svg v-else-if="f.icon === 'fiber'" viewBox="0 0 24 24" width="20" height="20" fill="none">
                  <path d="M2 12 Q7 6 12 12 Q17 18 22 12" stroke="#00e5ff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                  <circle cx="2" cy="12" r="2" fill="#00e5ff" opacity="0.5"/>
                  <circle cx="22" cy="12" r="2" fill="#7c4dff" opacity="0.5"/>
                </svg>
                <n-icon v-else-if="f.icon === 'shield'" :component="ShieldCheckIcon" :size="20" color="#00e5ff" />
                <n-icon v-else :component="ChartBarIcon" :size="20" color="#00e5ff" />
              </div>
              <div class="feature-text">
                <span class="feature-title">{{ f.title }}</span>
                <span class="feature-desc">{{ f.desc }}</span>
              </div>
            </div>
          </div>

          <!-- Stats bar -->
          <div class="hero-stats">
            <div class="stat-item" v-for="(s, i) in stats" :key="i">
              <span class="stat-value">{{ s.value }}</span>
              <span class="stat-label">{{ s.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FORM SECTION (Right Side) -->
      <div class="form-section">
        <div class="form-container">
          <div class="form-card">
            <div class="fiber-accent"></div>

            <template v-if="!resetMode">
            <div class="form-header">
              <div class="logo-icon">
                <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="#00e5ff" stroke-width="1.5" fill="rgba(0,229,255,0.06)"/>
                  <path d="M24 8 L24 40" stroke="#00e5ff" stroke-width="1.5"/>
                  <path d="M24 14 L16 20" stroke="#00e5ff" stroke-width="1"/>
                  <path d="M24 14 L32 20" stroke="#00e5ff" stroke-width="1"/>
                  <circle cx="24" cy="10" r="2" fill="#00e5ff"/>
                  <circle cx="24" cy="10" r="5" stroke="rgba(0,229,255,0.4)" fill="none" class="signal-wave"/>
                  <circle cx="24" cy="10" r="8" stroke="rgba(0,229,255,0.2)" fill="none" class="signal-wave delay"/>
                  <path d="M12 32 Q24 26 36 32" stroke="rgba(124,77,255,0.5)" stroke-width="1" fill="none"/>
                  <path d="M8 36 Q24 28 40 36" stroke="rgba(124,77,255,0.25)" stroke-width="1" fill="none"/>
                </svg>
              </div>
              <h2 class="form-title">Selamat Datang</h2>
              <p class="form-subtitle">Masuk ke panel manajemen jaringan</p>
            </div>

            <n-form @submit.prevent="handleLogin" class="login-form">
              <n-form-item v-if="showTenantField" label="Tenant ID">
                <n-input v-model:value="form.tenant_id" placeholder="ID Tenant Anda" size="large" />
              </n-form-item>
              <n-form-item label="Email">
                <n-input v-model:value="form.email" placeholder="admin@isp.com" size="large" />
              </n-form-item>
              <n-form-item label="Password">
                <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="Password" size="large" @keyup.enter="handleLogin" />
              </n-form-item>
              <n-button type="primary" block size="large" :loading="loading" @click="handleLogin" class="login-btn" style="margin-top: 8px; font-weight: 600; height: 44px;">
                Masuk ke Dashboard
              </n-button>
            </n-form>

            <div class="form-footer">
              <p style="margin: 0 0 8px; text-align: center;">
                <n-a class="reset-link" @click.prevent="enterResetMode" style="font-size: 13px; cursor: pointer;">
                  Lupa password? Reset via WhatsApp
                </n-a>
              </p>
              <n-a @click="router.push('/register')" class="register-link">
                Belum punya akun? <span>Daftar sekarang</span>
              </n-a>
            </div>
            </template>

            <!-- === RESET PASSWORD VIEW === -->
            <template v-else>
              <!-- Step 1: Enter email + phone -->
              <template v-if="resetStep === 1">
                <div class="form-header">
                  <n-a class="back-link" @click="exitResetMode" style="display: inline-flex; align-items: center; gap: 4px; font-size: 13px; margin-bottom: 12px; cursor: pointer;">
                    <n-icon :component="BackIcon" :size="16" /> Kembali ke login
                  </n-a>
                  <h2 class="form-title">Reset Password</h2>
                  <p class="form-subtitle">Masukkan email dan nomor WhatsApp terdaftar. PIN reset akan dikirim via WhatsApp.</p>
                </div>

                <n-form @submit.prevent="requestPIN" class="login-form">
                  <n-form-item label="Email">
                    <n-input v-model:value="resetForm.email" placeholder="Email terdaftar" size="large" />
                  </n-form-item>
                  <n-form-item label="Nomor WhatsApp">
                    <n-input v-model:value="resetForm.phone" placeholder="081234567890" size="large" />
                  </n-form-item>
                  <n-button type="primary" block size="large" :loading="resetLoading" @click="requestPIN" class="login-btn" style="margin-top: 8px; font-weight: 600; height: 44px;">
                    <template #icon><n-icon :component="SendIcon" /></template>
                    {{ resetLoading ? 'Mengirim...' : 'Kirim PIN via WhatsApp' }}
                  </n-button>
                </n-form>
              </template>

              <!-- Step 2: Enter PIN + new password -->
              <template v-else-if="resetStep === 2">
                <div class="form-header">
                  <n-a class="back-link" @click="resetStep = 1" style="display: inline-flex; align-items: center; gap: 4px; font-size: 13px; margin-bottom: 12px; cursor: pointer;">
                    <n-icon :component="BackIcon" :size="16" /> Kembali
                  </n-a>
                  <h2 class="form-title">Verifikasi PIN</h2>
                  <p class="form-subtitle">PIN telah dikirim ke WhatsApp <strong>{{ maskedPhone }}</strong>. Masukkan PIN dan password baru.</p>
                </div>

                <n-form @submit.prevent="resetPassword" class="login-form">
                  <n-form-item label="Kode PIN">
                    <n-input v-model:value="resetForm.pin" placeholder="Masukkan 6 digit PIN" maxlength="6" size="large" />
                  </n-form-item>
                  <n-form-item label="Password Baru">
                    <n-input v-model:value="resetForm.new_password" type="password" show-password-on="click" placeholder="Minimal 8 karakter" size="large" />
                  </n-form-item>
                  <n-button type="primary" block size="large" :loading="resetLoading" @click="resetPassword" class="login-btn" style="margin-top: 8px; font-weight: 600; height: 44px;">
                    <template #icon><n-icon :component="KeyIcon" /></template>
                    {{ resetLoading ? 'Memproses...' : 'Reset Password' }}
                  </n-button>
                </n-form>

                <div class="form-footer" style="text-align: center;">
                  <p style="color: rgba(148,163,184,0.7); font-size: 13px;">PIN berlaku selama 5 menit</p>
                </div>
              </template>

              <!-- Step 3: Success -->
              <template v-else-if="resetStep === 3">
                <div style="text-align: center; padding: 24px 0;">
                  <n-icon :component="CheckIcon" :size="48" color="#22c55e" />
                  <h2 class="form-title" style="margin-top: 16px;">Password Berhasil Direset</h2>
                  <p class="form-subtitle">Silakan login dengan password baru Anda.</p>
                  <n-button type="primary" block size="large" @click="exitResetMode" class="login-btn" style="margin-top: 20px; font-weight: 600; height: 44px;">
                    <template #icon><n-icon :component="LoginIcon" /></template>
                    Kembali ke Login
                  </n-button>
                </div>
              </template>
            </template>

            <!-- Trust badges -->
            <div class="trust-badges">
              <div class="badge">
                <n-icon :component="StarFilledIcon" :size="14" color="rgba(0,229,255,0.6)" />
                <span>SSL Secured</span>
              </div>
              <div class="badge">
                <n-icon :component="ShieldCheckIcon" :size="14" color="rgba(0,229,255,0.6)" />
                <span>Terenkripsi</span>
              </div>
              <div class="badge">
                <n-icon :component="ClockIcon" :size="14" color="rgba(0,229,255,0.6)" />
                <span>24/7 Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  max-height: 100vh;
  background: linear-gradient(135deg, #060a20 0%, #0a0e27 30%, #0f1640 60%, #0a0e27 100%);
  position: relative;
  overflow: hidden;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

.bg-particles { position: absolute; inset: 0; pointer-events: none; }
.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #00e5ff;
  border-radius: 50%;
  animation: pulse 3s ease-in-out infinite;
}

.fiber-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.fiber-path {
  stroke-dasharray: 1200;
  stroke-dashoffset: 1200;
  animation: drawFiber 4s ease-in-out infinite;
}
.fiber-path.delay { animation-delay: 1.5s; }
.fiber-path.delay2 { animation-delay: 3s; }

@keyframes drawFiber {
  0% { stroke-dashoffset: 1200; }
  50% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -1200; }
}

/* ======= LAYOUT ======= */
.login-wrapper {
  position: relative;
  z-index: 10;
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* ======= HERO SECTION ======= */
.hero-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 40px;
  position: relative;
  overflow: hidden;
}
.hero-section::after {
  content: '';
  position: absolute;
  right: 0;
  top: 10%;
  bottom: 10%;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(0,229,255,0.15) 30%, rgba(124,77,255,0.15) 70%, transparent);
}

.hero-content {
  max-width: 520px;
  width: 100%;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.hero-illustration {
  margin-bottom: 16px;
  flex-shrink: 1;
  min-height: 0;
}
.hero-svg {
  width: 100%;
  max-width: 260px;
  max-height: 28vh;
  height: auto;
}

.orbit-ring {
  animation: orbitSpin 20s linear infinite;
  transform-origin: 160px 140px;
}
.orbit-ring.reverse {
  animation: orbitSpin 30s linear infinite reverse;
}
@keyframes orbitSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.data-flow {
  stroke-dasharray: 4 4;
  animation: dataFlowAnim 2s linear infinite;
}
.data-flow.delay { animation-delay: 0.7s; }
.data-flow.delay2 { animation-delay: 1.4s; }
@keyframes dataFlowAnim {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -16; }
}

.data-packet { opacity: 0.8; }

.hero-brand {
  margin-bottom: 20px;
  flex-shrink: 0;
}
.hero-title {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: 3px;
  font-family: "Courier New", "SF Mono", "Fira Code", "JetBrains Mono", monospace;
  text-shadow: 0 0 20px rgba(0, 229, 255, 0.3), 0 0 40px rgba(0, 229, 255, 0.1);
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #00e5ff 0%, #7c4dff 50%, #00e5ff 100%);
  background-size: 200% 200%;
  animation: gradientShift 4s ease-in-out infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.hero-tagline {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(200, 220, 255, 0.6);
  margin: 0;
  letter-spacing: 0.3px;
}

/* Feature cards */
.hero-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.08);
  border-radius: 10px;
  transition: all 0.3s ease;
}
.feature-card:hover {
  background: rgba(0, 229, 255, 0.06);
  border-color: rgba(0, 229, 255, 0.15);
  transform: translateY(-2px);
}
.feature-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 229, 255, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(0, 229, 255, 0.12);
}
.feature-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.feature-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 230, 255, 0.9);
}
.feature-desc {
  font-size: 11px;
  color: rgba(160, 190, 230, 0.5);
  line-height: 1.3;
}

/* Stats bar */
.hero-stats {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  background: rgba(0, 229, 255, 0.03);
  border: 1px solid rgba(0, 229, 255, 0.08);
  border-radius: 10px;
  flex-shrink: 0;
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  position: relative;
}
.stat-item + .stat-item::before {
  content: '';
  position: absolute;
  left: -3px;
  top: 15%;
  bottom: 15%;
  width: 1px;
  background: rgba(0, 229, 255, 0.1);
}
.stat-value {
  font-size: 16px;
  font-weight: 800;
  color: #00e5ff;
  letter-spacing: -0.5px;
}
.stat-label {
  font-size: 11px;
  color: rgba(160, 190, 230, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ======= FORM SECTION ======= */
.form-section {
  width: 460px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 32px;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.form-card {
  background: rgba(10, 14, 39, 0.85);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 229, 255, 0.1);
  border-radius: 20px;
  padding: 32px 32px 24px;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 0 50px rgba(0, 229, 255, 0.06),
    0 25px 60px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(0, 229, 255, 0.08);
}

.fiber-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00e5ff, #7c4dff, #00e5ff);
  background-size: 200% 100%;
  animation: fiberFlow 4s linear infinite;
}
@keyframes fiberFlow {
  from { background-position: 0% 0%; }
  to { background-position: 200% 0%; }
}

.form-header {
  text-align: center;
  margin-bottom: 20px;
}
.logo-icon {
  display: inline-block;
  margin-bottom: 10px;
}
.form-title {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 6px 0;
  color: rgba(220, 240, 255, 0.95);
}
.form-subtitle {
  font-size: 13px;
  color: rgba(160, 200, 240, 0.45);
  margin: 0;
  letter-spacing: 0.3px;
}

.login-form {
  margin-bottom: 14px;
}

/* Dark mode input field borders - more visible */
.login-form :deep(.n-input) {
  --n-border: 1px solid rgba(0, 229, 255, 0.25) !important;
  --n-border-hover: 1px solid rgba(0, 229, 255, 0.5) !important;
  --n-border-focus: 1px solid #00e5ff !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(0, 229, 255, 0.15) !important;
  --n-color: rgba(15, 22, 64, 0.6) !important;
  --n-color-focus: rgba(15, 22, 64, 0.8) !important;
  --n-text-color: rgba(220, 240, 255, 0.9) !important;
  --n-placeholder-color: rgba(160, 200, 240, 0.35) !important;
  --n-caret-color: #00e5ff !important;
  border-radius: 10px !important;
}
.login-form :deep(.n-input--focus) {
  box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.15), 0 0 12px rgba(0, 229, 255, 0.08) !important;
}
.login-form :deep(.n-form-item-label__text) {
  color: rgba(200, 230, 255, 0.7) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px;
}
/* Password eye icon */
.login-form :deep(.n-input__eye) {
  color: rgba(0, 229, 255, 0.5) !important;
}
.login-form :deep(.n-input__eye:hover) {
  color: #00e5ff !important;
}

.login-btn {
  background: linear-gradient(135deg, #00e5ff, #00b8d4) !important;
  border: none !important;
  box-shadow: 0 4px 20px rgba(0, 229, 255, 0.25);
  transition: all 0.3s ease;
  font-size: 14px !important;
  border-radius: 10px !important;
}
.login-btn:hover {
  box-shadow: 0 6px 30px rgba(0, 229, 255, 0.45);
  transform: translateY(-1px);
}

.form-footer {
  text-align: center;
  margin-bottom: 16px;
}
.register-link {
  color: rgba(160, 200, 240, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s;
}
.register-link span {
  color: #00e5ff;
  font-weight: 600;
}
.register-link:hover {
  color: rgba(200, 230, 255, 0.7);
}

.trust-badges {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 229, 255, 0.06);
}
.badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(160, 200, 240, 0.35);
}

/* Signal wave animation */
.signal-wave { animation: signalWave 2s ease-out infinite; }
.signal-wave.delay { animation-delay: 0.6s; }
.signal-wave.delay2 { animation-delay: 1.2s; }
@keyframes signalWave {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}

/* Responsive */
@media (max-width: 960px) {
  .login-wrapper { flex-direction: column; overflow-y: auto; }
  .hero-section {
    padding: 24px 24px 16px;
    min-height: auto;
  }
  .hero-section::after { display: none; }
  .hero-illustration { display: none; }
  .hero-features { grid-template-columns: 1fr; }
  .form-section {
    width: 100%;
    padding: 0 20px 24px;
  }
}
@media (max-width: 640px) {
  .login-page { height: auto; max-height: none; }
  .login-wrapper { height: auto; }
  .hero-brand { text-align: center; }
  .hero-title { font-size: 26px; }
  .hero-stats { flex-wrap: wrap; }
  .stat-item + .stat-item::before { display: none; }
  .form-card { padding: 28px 22px 22px; }
}

/* ===== LIGHT MODE ===== */
.light-mode {
  background: linear-gradient(135deg, #e8f0fe 0%, #f0f4f8 30%, #e3ecf5 60%, #f0f4f8 100%);
}
.light-mode .bg-grid {
  background-image:
    linear-gradient(rgba(0,131,143,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,131,143,0.04) 1px, transparent 1px);
}
.light-mode .particle {
  background: #00838f;
  opacity: 0.4;
}
.light-mode .hero-section::after {
  background: linear-gradient(to bottom, transparent, rgba(0,131,143,0.15) 30%, rgba(124,77,255,0.1) 70%, transparent);
}
.light-mode .hero-title {
  background: linear-gradient(135deg, #00838f 0%, #7c4dff 50%, #00838f 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.light-mode .hero-tagline {
  color: #718096;
}
.light-mode .feature-card {
  background: rgba(0, 131, 143, 0.04);
  border-color: rgba(0, 131, 143, 0.12);
}
.light-mode .feature-card:hover {
  background: rgba(0, 131, 143, 0.08);
  border-color: rgba(0, 131, 143, 0.2);
}
.light-mode .feature-icon {
  background: rgba(0, 131, 143, 0.08);
  border-color: rgba(0, 131, 143, 0.15);
}
.light-mode .feature-title {
  color: #1a202c;
}
.light-mode .feature-desc {
  color: #718096;
}
.light-mode .hero-stats {
  background: rgba(0, 131, 143, 0.04);
  border-color: rgba(0, 131, 143, 0.12);
}
.light-mode .stat-value {
  color: #00838f;
}
.light-mode .stat-label {
  color: #718096;
}
.light-mode .stat-item + .stat-item::before {
  background: rgba(0, 131, 143, 0.12);
}
.light-mode .form-card {
  background: rgba(255, 255, 255, 0.92);
  border-color: #e2e8f0;
  box-shadow:
    0 0 50px rgba(0, 131, 143, 0.06),
    0 25px 60px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.light-mode .fiber-accent {
  background: linear-gradient(90deg, #00838f, #7c4dff, #00838f);
  background-size: 200% 100%;
}
.light-mode .form-title {
  color: #1a202c;
}
.light-mode .form-subtitle {
  color: #718096;
}
.light-mode .login-btn {
  background: linear-gradient(135deg, #00838f, #006064) !important;
  box-shadow: 0 4px 20px rgba(0, 131, 143, 0.25);
}
.light-mode .login-btn:hover {
  box-shadow: 0 6px 30px rgba(0, 131, 143, 0.4);
}
.light-mode .register-link {
  color: #718096;
}
.light-mode .register-link span {
  color: #00838f;
}
.light-mode .register-link:hover {
  color: #4a5568;
}
.light-mode .trust-badges {
  border-top-color: #e2e8f0;
}
.light-mode .badge {
  color: #a0aec0;
}
/* Light mode input overrides */
.light-mode .login-form :deep(.n-input) {
  --n-border: 1px solid #cbd5e0 !important;
  --n-border-hover: 1px solid #00838f !important;
  --n-border-focus: 1px solid #00838f !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(0, 131, 143, 0.12) !important;
  --n-color: #ffffff !important;
  --n-color-focus: #ffffff !important;
  --n-text-color: #1a202c !important;
  --n-placeholder-color: #a0aec0 !important;
  --n-caret-color: #00838f !important;
  border-radius: 10px !important;
}
.light-mode .login-form :deep(.n-form-item-label__text) {
  color: #4a5568 !important;
}
.light-mode .login-form :deep(.n-input__eye) {
  color: #a0aec0 !important;
}
.light-mode .login-form :deep(.n-input__eye:hover) {
  color: #00838f !important;
}
</style>
