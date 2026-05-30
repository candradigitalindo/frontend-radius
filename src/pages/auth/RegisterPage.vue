<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NA, NIcon, useMessage } from 'naive-ui'
import { Rocket, World, Users as UsersIcon, Lock } from '@vicons/tabler'
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { authApi } from '../../api'
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const message = useMessage()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const isDark = computed(() => themeStore.isDark)
const loading = ref(false)
const showOTP = ref(false)
const otp = ref('')
const sendingOTP = ref(false)

const form = ref({
  name: '',
  email: '',
  password: '',
  phone: '',
  fingerprint: '',
})

const benefits = [
  { icon: 'rocket', title: 'Setup Instan', desc: 'Aktivasi akun dan konfigurasi jaringan dalam hitungan menit' },
  { icon: 'globe', title: 'Akses Global', desc: 'Pantau dan kelola jaringan dari mana saja, kapan saja' },
  { icon: 'users', title: 'Multi-Role', desc: 'Buat tim dengan hak akses berbeda: admin, teknisi, dan lainnya' },
  { icon: 'lock', title: 'Enterprise Security', desc: 'Enkripsi end-to-end dan autentikasi RADIUS standar industri' },
]

const steps = [
  { num: '01', text: 'Buat akun dengan email aktif' },
  { num: '02', text: 'Konfigurasi tenant & paket layanan' },
  { num: '03', text: 'Koneksikan NAS/Router Anda' },
  { num: '04', text: 'Mulai kelola pelanggan & billing' },
]

async function handleSendOTP() {
  if (!form.value.name || !form.value.email || !form.value.password || !form.value.phone) {
    message.warning('Harap isi semua kolom untuk melanjutkan')
    return
  }
  if (form.value.password.length < 8) {
    message.warning('Password minimal 8 karakter')
    return
  }
  
  sendingOTP.value = true
  try {
    await authApi.sendRegisterOTP({ 
      email: form.value.email, 
      phone: form.value.phone 
    })
    message.success('Kode verifikasi telah dikirim ke WhatsApp Anda')
    showOTP.value = true
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Gagal mengirim kode verifikasi')
  } finally {
    sendingOTP.value = false
  }
}

async function handleRegister() {
  if (!otp.value) {
    message.warning('Silakan masukkan kode OTP')
    return
  }
  
  loading.value = true
  try {
    // Get fingerprint
    try {
      const fp = await FingerprintJS.load()
      const result = await fp.get()
      form.value.fingerprint = result.visitorId
    } catch (e) {
      console.error('Failed to get fingerprint:', e)
    }

    const { data } = await authApi.register({
      ...form.value,
      otp: otp.value
    })
    
    if (data.status === 'pending') {
      message.success('Registrasi berhasil! Akun Anda sedang dalam peninjauan keamanan.')
      router.push('/pending-approval')
    } else {
      // Auto-login for active accounts and go to plan selection
      authStore.setAuth(data)
      message.success('Registrasi berhasil! Silakan pilih paket layanan Anda.')
      router.push('/select-plan')
    }
  } catch (e: any) {
    message.error(e.response?.data?.error || 'Verifikasi OTP gagal')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page" :class="{ 'light-mode': !isDark }">
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

    <svg class="fiber-lines" viewBox="0 0 1440 900" preserveAspectRatio="none">
      <defs>
        <linearGradient id="regFiber1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#7c4dff;stop-opacity:0" />
          <stop offset="40%" style="stop-color:#7c4dff;stop-opacity:0.4" />
          <stop offset="60%" style="stop-color:#00e5ff;stop-opacity:0.5" />
          <stop offset="100%" style="stop-color:#00e5ff;stop-opacity:0" />
        </linearGradient>
        <linearGradient id="regFiber2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#00e5ff;stop-opacity:0" />
          <stop offset="50%" style="stop-color:#7c4dff;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#7c4dff;stop-opacity:0" />
        </linearGradient>
      </defs>
      <path d="M0,250 Q360,150 720,280 T1440,220" stroke="url(#regFiber1)" stroke-width="1.5" fill="none" class="fiber-path" />
      <path d="M0,550 Q480,450 960,580 T1440,520" stroke="url(#regFiber2)" stroke-width="1" fill="none" class="fiber-path delay" />
      <path d="M0,750 Q360,680 720,760 T1440,700" stroke="url(#regFiber1)" stroke-width="0.8" fill="none" class="fiber-path delay2" />
    </svg>

    <div class="register-wrapper">
      <!-- FORM SECTION (Left Side) -->
      <div class="form-section">
        <div class="form-container">
          <div class="form-card">
            <div class="fiber-accent"></div>

            <div class="form-header">
              <div class="logo-icon">
                <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="#7c4dff" stroke-width="1.5" fill="rgba(124,77,255,0.06)"/>
                  <path d="M14 34 L24 12 L34 34" stroke="#00e5ff" stroke-width="1.5" fill="none"/>
                  <line x1="18" y1="28" x2="30" y2="28" stroke="#00e5ff" stroke-width="1"/>
                  <circle cx="24" cy="12" r="2" fill="#00e5ff"/>
                  <circle cx="24" cy="12" r="5" stroke="rgba(0,229,255,0.4)" fill="none" class="signal-wave"/>
                  <circle cx="24" cy="12" r="8" stroke="rgba(0,229,255,0.2)" fill="none" class="signal-wave delay"/>
                </svg>
              </div>
              <h2 class="form-title">Buat Akun Baru</h2>
              <p class="form-subtitle">Mulai kelola infrastruktur jaringan Anda</p>
            </div>

            <n-form @submit.prevent="handleRegister" class="register-form" v-if="!showOTP">
              <n-form-item label="Nama Lengkap">
                <n-input v-model:value="form.name" placeholder="Nama lengkap" size="large" />
              </n-form-item>
              <n-form-item label="Email">
                <n-input v-model:value="form.email" placeholder="admin@isp.com" size="large" />
              </n-form-item>
              <n-form-item label="Telepon (WhatsApp)">
                <n-input v-model:value="form.phone" placeholder="Contoh: 081260268381" size="large" />
              </n-form-item>
              <n-form-item label="Password">
                <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="Min. 8 karakter" size="large" @keyup.enter="handleSendOTP" />
              </n-form-item>
              <n-button type="primary" block size="large" :loading="sendingOTP" @click="handleSendOTP" class="register-btn" style="margin-top: 8px; font-weight: 600; height: 44px;">
                Lanjut ke Verifikasi
              </n-button>
            </n-form>

            <n-form @submit.prevent="handleRegister" class="register-form" v-else>
              <div style="text-align: center; margin-bottom: 20px">
                <n-text depth="3" :style="{ color: isDark ? 'rgba(255,255,255,0.6)' : '#666' }">Masukkan 6 digit kode OTP yang dikirim ke</n-text><br/>
                <n-text strong :style="{ color: isDark ? '#fff' : '#000' }">{{ form.phone }}</n-text>
              </div>
              <n-form-item label="Kode OTP">
                <n-input v-model:value="otp" placeholder="6 digit angka" size="large" maxlength="6" style="text-align: center; letter-spacing: 8px; font-size: 18px" />
              </n-form-item>
              <n-button type="primary" block size="large" :loading="loading" @click="handleRegister" class="register-btn" style="margin-top: 8px; font-weight: 600; height: 44px;">
                Verifikasi & Daftar
              </n-button>
              <n-button text block @click="showOTP = false" style="margin-top: 16px; color: #888">
                ← Kembali
              </n-button>
            </n-form>

            <div class="form-footer">
              <n-a @click="router.push('/login')" class="login-link">
                Sudah punya akun? <span>Masuk</span>
              </n-a>
            </div>
          </div>
        </div>
      </div>

      <!-- HERO SECTION (Right Side) -->
      <div class="hero-section">
        <div class="hero-content">
          <!-- Animated network illustration -->
          <div class="hero-illustration">
            <svg viewBox="0 0 320 240" fill="none" class="hero-svg">
              <!-- Fiber optic bundle -->
              <defs>
                <linearGradient id="fiberBundle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#7c4dff;stop-opacity:0.5" />
                  <stop offset="100%" style="stop-color:#00e5ff;stop-opacity:0.5" />
                </linearGradient>
              </defs>

              <!-- Central hub -->
              <circle cx="160" cy="120" r="30" stroke="rgba(124,77,255,0.2)" stroke-width="1" fill="rgba(124,77,255,0.04)"/>
              <circle cx="160" cy="120" r="15" stroke="rgba(0,229,255,0.3)" stroke-width="1" fill="rgba(0,229,255,0.06)"/>
              <circle cx="160" cy="120" r="5" fill="#00e5ff" class="animate-pulse"/>

              <!-- Radiating connections -->
              <path d="M160,120 Q100,60 40,80" stroke="url(#fiberBundle)" stroke-width="2" fill="none" class="fiber-anim"/>
              <path d="M160,120 Q220,60 280,80" stroke="url(#fiberBundle)" stroke-width="2" fill="none" class="fiber-anim d1"/>
              <path d="M160,120 Q100,180 40,160" stroke="url(#fiberBundle)" stroke-width="1.5" fill="none" class="fiber-anim d2"/>
              <path d="M160,120 Q220,180 280,160" stroke="url(#fiberBundle)" stroke-width="1.5" fill="none" class="fiber-anim d3"/>
              <path d="M160,120 L160,30" stroke="url(#fiberBundle)" stroke-width="1.5" fill="none" class="fiber-anim d1"/>
              <path d="M160,120 L160,210" stroke="url(#fiberBundle)" stroke-width="1.5" fill="none" class="fiber-anim d2"/>

              <!-- End nodes -->
              <circle cx="40" cy="80" r="8" fill="rgba(124,77,255,0.1)" stroke="rgba(124,77,255,0.3)" stroke-width="0.8"/>
              <circle cx="40" cy="80" r="3" fill="#7c4dff" class="animate-pulse"/>
              <circle cx="280" cy="80" r="8" fill="rgba(0,229,255,0.1)" stroke="rgba(0,229,255,0.3)" stroke-width="0.8"/>
              <circle cx="280" cy="80" r="3" fill="#00e5ff" class="animate-pulse"/>
              <circle cx="40" cy="160" r="6" fill="rgba(0,229,255,0.1)" stroke="rgba(0,229,255,0.25)" stroke-width="0.6"/>
              <circle cx="40" cy="160" r="2.5" fill="#00e5ff"/>
              <circle cx="280" cy="160" r="6" fill="rgba(124,77,255,0.1)" stroke="rgba(124,77,255,0.25)" stroke-width="0.6"/>
              <circle cx="280" cy="160" r="2.5" fill="#7c4dff"/>
              <circle cx="160" cy="30" r="7" fill="rgba(0,229,255,0.1)" stroke="rgba(0,229,255,0.3)" stroke-width="0.8"/>
              <circle cx="160" cy="30" r="3" fill="#00e5ff" class="animate-pulse"/>
              <circle cx="160" cy="210" r="7" fill="rgba(124,77,255,0.1)" stroke="rgba(124,77,255,0.3)" stroke-width="0.8"/>
              <circle cx="160" cy="210" r="3" fill="#7c4dff" class="animate-pulse"/>

              <!-- Data packets traversing -->
              <circle r="2.5" fill="#00e5ff" opacity="0.8">
                <animateMotion dur="2.5s" repeatCount="indefinite" path="M160,120 Q100,60 40,80" />
              </circle>
              <circle r="2" fill="#7c4dff" opacity="0.8">
                <animateMotion dur="3s" repeatCount="indefinite" path="M160,120 Q220,60 280,80" />
              </circle>
              <circle r="2" fill="#00e5ff" opacity="0.7">
                <animateMotion dur="2s" repeatCount="indefinite" path="M160,120 L160,30" />
              </circle>
              <circle r="2" fill="#7c4dff" opacity="0.7">
                <animateMotion dur="3.5s" repeatCount="indefinite" path="M160,120 Q220,180 280,160" />
              </circle>

              <!-- Pulse rings from center -->
              <circle cx="160" cy="120" r="35" stroke="rgba(0,229,255,0.15)" fill="none" class="signal-wave"/>
              <circle cx="160" cy="120" r="50" stroke="rgba(124,77,255,0.08)" fill="none" class="signal-wave delay"/>
            </svg>
          </div>

          <!-- Brand & tagline -->
          <div class="hero-brand">
            <h1 class="hero-title">Bergabung Sekarang</h1>
            <p class="hero-tagline">Kelola ISP Anda dengan platform yang dirancang khusus untuk infrastruktur telekomunikasi modern</p>
          </div>

          <!-- Benefits grid -->
          <div class="hero-benefits">
            <div class="benefit-card" v-for="(b, i) in benefits" :key="i">
              <div class="benefit-icon">
                <n-icon v-if="b.icon === 'rocket'" :size="18" color="#7c4dff"><Rocket /></n-icon>
                <n-icon v-else-if="b.icon === 'globe'" :size="18" color="#7c4dff"><World /></n-icon>
                <n-icon v-else-if="b.icon === 'users'" :size="18" color="#7c4dff"><UsersIcon /></n-icon>
                <n-icon v-else :size="18" color="#7c4dff"><Lock /></n-icon>
              </div>
              <div class="benefit-text">
                <span class="benefit-title">{{ b.title }}</span>
                <span class="benefit-desc">{{ b.desc }}</span>
              </div>
            </div>
          </div>

          <!-- Steps timeline -->
          <div class="hero-steps">
            <span class="steps-label">Langkah Memulai</span>
            <div class="steps-row">
              <div class="step-item" v-for="(s, i) in steps" :key="i">
                <span class="step-num">{{ s.num }}</span>
                <span class="step-text">{{ s.text }}</span>
                <div v-if="i < steps.length - 1" class="step-connector"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  height: 100vh;
  max-height: 100vh;
  background: linear-gradient(135deg, #060a20 0%, #0a0e27 30%, #12084a 60%, #0a0e27 100%);
  position: relative;
  overflow: hidden;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(124,77,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124,77,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}
.bg-particles { position: absolute; inset: 0; pointer-events: none; }
.particle {
  position: absolute; width: 2px; height: 2px;
  background: #7c4dff; border-radius: 50%;
  animation: pulse 3s ease-in-out infinite;
}

.fiber-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.fiber-path {
  stroke-dasharray: 1200; stroke-dashoffset: 1200;
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
.register-wrapper {
  position: relative;
  z-index: 10;
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* ======= FORM SECTION (Left) ======= */
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
  border: 1px solid rgba(124, 77, 255, 0.12);
  border-radius: 20px;
  padding: 28px 28px 22px;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 0 50px rgba(124, 77, 255, 0.06),
    0 25px 60px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(124, 77, 255, 0.08);
}
.fiber-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #7c4dff, #00e5ff, #7c4dff);
  background-size: 200% 100%;
  animation: fiberFlow 4s linear infinite;
}
@keyframes fiberFlow {
  from { background-position: 0% 0%; }
  to { background-position: 200% 0%; }
}

.form-header {
  text-align: center;
  margin-bottom: 16px;
}
.logo-icon {
  display: inline-block;
  margin-bottom: 8px;
}
.form-title {
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 4px 0;
  background: linear-gradient(135deg, #7c4dff, #00e5ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.form-subtitle {
  font-size: 13px;
  color: rgba(160, 180, 230, 0.45);
  margin: 0;
}

.register-form { margin-bottom: 12px; }

/* Dark mode input field borders - more visible */
.register-form :deep(.n-input) {
  --n-border: 1px solid rgba(124, 77, 255, 0.25) !important;
  --n-border-hover: 1px solid rgba(124, 77, 255, 0.5) !important;
  --n-border-focus: 1px solid #7c4dff !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(124, 77, 255, 0.15) !important;
  --n-color: rgba(15, 22, 64, 0.6) !important;
  --n-color-focus: rgba(15, 22, 64, 0.8) !important;
  --n-text-color: rgba(220, 240, 255, 0.9) !important;
  --n-placeholder-color: rgba(160, 200, 240, 0.35) !important;
  --n-caret-color: #7c4dff !important;
  border-radius: 10px !important;
}
.register-form :deep(.n-input--focus) {
  box-shadow: 0 0 0 2px rgba(124, 77, 255, 0.15), 0 0 12px rgba(124, 77, 255, 0.08) !important;
}
.register-form :deep(.n-form-item-label__text) {
  color: rgba(200, 230, 255, 0.7) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px;
}
.register-form :deep(.n-input__eye) {
  color: rgba(124, 77, 255, 0.5) !important;
}
.register-form :deep(.n-input__eye:hover) {
  color: #7c4dff !important;
}

.register-btn {
  background: linear-gradient(135deg, #7c4dff, #00e5ff) !important;
  border: none !important;
  box-shadow: 0 4px 20px rgba(124, 77, 255, 0.25);
  transition: all 0.3s ease;
  font-size: 14px !important;
  border-radius: 10px !important;
}
.register-btn:hover {
  box-shadow: 0 6px 30px rgba(124, 77, 255, 0.45);
  transform: translateY(-1px);
}

.form-footer { text-align: center; }
.login-link {
  color: rgba(160, 180, 230, 0.5);
  font-size: 13px;
  cursor: pointer;
}
.login-link span {
  color: #7c4dff;
  font-weight: 600;
}

/* ======= HERO SECTION (Right) ======= */
.hero-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 40px;
  position: relative;
  overflow: hidden;
}
.hero-section::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(124,77,255,0.15) 30%, rgba(0,229,255,0.15) 70%, transparent);
}

.hero-content {
  max-width: 540px;
  width: 100%;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.hero-illustration {
  margin-bottom: 14px;
  flex-shrink: 1;
  min-height: 0;
}
.hero-svg {
  width: 100%;
  max-width: 260px;
  max-height: 24vh;
  height: auto;
}

.fiber-anim {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: drawFiberAnim 3s ease-in-out infinite;
}
.fiber-anim.d1 { animation-delay: 0.5s; }
.fiber-anim.d2 { animation-delay: 1s; }
.fiber-anim.d3 { animation-delay: 1.5s; }
@keyframes drawFiberAnim {
  0% { stroke-dashoffset: 200; }
  50% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -200; }
}

.hero-brand {
  margin-bottom: 18px;
  flex-shrink: 0;
}
.hero-title {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.5px;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #7c4dff 0%, #00e5ff 50%, #7c4dff 100%);
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
  font-size: 13.5px;
  line-height: 1.5;
  color: rgba(200, 210, 255, 0.55);
  margin: 0;
}

/* Benefits grid */
.hero-benefits {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
  flex-shrink: 0;
}
.benefit-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(124, 77, 255, 0.03);
  border: 1px solid rgba(124, 77, 255, 0.08);
  border-radius: 10px;
  transition: all 0.3s ease;
}
.benefit-card:hover {
  background: rgba(124, 77, 255, 0.06);
  border-color: rgba(124, 77, 255, 0.18);
  transform: translateY(-2px);
}
.benefit-icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(124, 77, 255, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(124, 77, 255, 0.12);
}
.benefit-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.benefit-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 210, 255, 0.85);
}
.benefit-desc {
  font-size: 10.5px;
  color: rgba(160, 180, 230, 0.45);
  line-height: 1.3;
}

/* Steps timeline */
.hero-steps {
  padding: 12px 16px;
  background: rgba(124, 77, 255, 0.03);
  border: 1px solid rgba(124, 77, 255, 0.08);
  border-radius: 10px;
  flex-shrink: 0;
}
.steps-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: rgba(124, 77, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}
.steps-row {
  display: flex;
  gap: 0;
}
.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  text-align: center;
}
.step-num {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: 50%;
}
.step-text {
  font-size: 10.5px;
  color: rgba(160, 180, 230, 0.45);
  line-height: 1.3;
  max-width: 110px;
}
.step-connector {
  position: absolute;
  top: 14px;
  left: calc(50% + 18px);
  width: calc(100% - 36px);
  height: 1px;
  background: linear-gradient(90deg, rgba(0,229,255,0.2), rgba(124,77,255,0.2));
}

/* Signal animation */
.signal-wave { animation: signalWave 2s ease-out infinite; }
.signal-wave.delay { animation-delay: 0.6s; }
@keyframes signalWave {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}

/* Responsive */
@media (max-width: 960px) {
  .register-wrapper { flex-direction: column; overflow-y: auto; }
  .form-section {
    width: 100%;
    padding: 24px 20px 16px;
    order: 1;
  }
  .hero-section {
    padding: 16px 24px 24px;
    order: 2;
  }
  .hero-section::before { display: none; }
  .hero-illustration { display: none; }
  .hero-benefits { grid-template-columns: 1fr; }
  .steps-row { flex-wrap: wrap; gap: 8px; }
  .step-connector { display: none; }
}
@media (max-width: 640px) {
  .register-page { height: auto; max-height: none; }
  .register-wrapper { height: auto; }
  .hero-title { font-size: 24px; }
  .form-card { padding: 24px 20px 20px; }
}

/* ===== LIGHT MODE ===== */
.light-mode {
  background: linear-gradient(135deg, #ede7f6 0%, #f0f4f8 30%, #e8eaf6 60%, #f0f4f8 100%);
}
.light-mode .bg-grid {
  background-image:
    linear-gradient(rgba(124,77,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124,77,255,0.04) 1px, transparent 1px);
}
.light-mode .particle {
  background: #7c4dff;
  opacity: 0.3;
}
.light-mode .hero-section::before {
  background: linear-gradient(to bottom, transparent, rgba(124,77,255,0.12) 30%, rgba(0,131,143,0.1) 70%, transparent);
}
.light-mode .hero-title {
  background: linear-gradient(135deg, #7c4dff 0%, #00838f 50%, #7c4dff 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.light-mode .hero-tagline {
  color: #718096;
}
.light-mode .benefit-card {
  background: rgba(124, 77, 255, 0.04);
  border-color: rgba(124, 77, 255, 0.12);
}
.light-mode .benefit-card:hover {
  background: rgba(124, 77, 255, 0.08);
  border-color: rgba(124, 77, 255, 0.2);
}
.light-mode .benefit-icon {
  background: rgba(124, 77, 255, 0.08);
  border-color: rgba(124, 77, 255, 0.15);
}
.light-mode .benefit-title {
  color: #1a202c;
}
.light-mode .benefit-desc {
  color: #718096;
}
.light-mode .hero-steps {
  background: rgba(124, 77, 255, 0.04);
  border-color: rgba(124, 77, 255, 0.12);
}
.light-mode .steps-label {
  color: #7c4dff;
}
.light-mode .step-num {
  color: #00838f;
  background: rgba(0, 131, 143, 0.08);
  border-color: rgba(0, 131, 143, 0.2);
}
.light-mode .step-text {
  color: #718096;
}
.light-mode .step-connector {
  background: linear-gradient(90deg, rgba(0,131,143,0.2), rgba(124,77,255,0.2));
}
.light-mode .form-card {
  background: rgba(255, 255, 255, 0.92);
  border-color: #e2e8f0;
  box-shadow:
    0 0 50px rgba(124, 77, 255, 0.06),
    0 25px 60px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.light-mode .fiber-accent {
  background: linear-gradient(90deg, #7c4dff, #00838f, #7c4dff);
  background-size: 200% 100%;
}
.light-mode .form-title {
  color: #1a202c;
  background: linear-gradient(135deg, #7c4dff, #00838f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.light-mode .form-subtitle {
  color: #718096;
}
.light-mode .register-btn {
  background: linear-gradient(135deg, #7c4dff, #00838f) !important;
  box-shadow: 0 4px 20px rgba(124, 77, 255, 0.25);
}
.light-mode .register-btn:hover {
  box-shadow: 0 6px 30px rgba(124, 77, 255, 0.4);
}
.light-mode .login-link {
  color: #718096;
}
.light-mode .login-link span {
  color: #7c4dff;
}
/* Light mode input overrides */
.light-mode .register-form :deep(.n-input) {
  --n-border: 1px solid #cbd5e0 !important;
  --n-border-hover: 1px solid #7c4dff !important;
  --n-border-focus: 1px solid #7c4dff !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(124, 77, 255, 0.12) !important;
  --n-color: #ffffff !important;
  --n-color-focus: #ffffff !important;
  --n-text-color: #1a202c !important;
  --n-placeholder-color: #a0aec0 !important;
  --n-caret-color: #7c4dff !important;
  border-radius: 10px !important;
}
.light-mode .register-form :deep(.n-form-item-label__text) {
  color: #4a5568 !important;
}
.light-mode .register-form :deep(.n-input__eye) {
  color: #a0aec0 !important;
}
.light-mode .register-form :deep(.n-input__eye:hover) {
  color: #7c4dff !important;
}
</style>
