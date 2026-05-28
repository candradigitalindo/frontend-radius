<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton, NIcon } from 'naive-ui'
import { InfoCircle, Home, ArrowLeft } from '@vicons/tabler'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function goHome() {
  const role = authStore.user?.role || ''
  if (role === 'superadmin') router.push('/superadmin')
  else if (role === 'customer') router.push('/portal')
  else router.push('/')
}

function goBack() {
  if (window.history.length > 1) router.back()
  else goHome()
}
</script>

<template>
  <div class="forbidden-page">
    <!-- Animated background shapes -->
    <div class="bg-shapes">
      <div class="shape shape-1" />
      <div class="shape shape-2" />
      <div class="shape shape-3" />
    </div>

    <div class="forbidden-card">
      <!-- Shield icon -->
      <div class="icon-wrap">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff1744" />
              <stop offset="100%" stop-color="#ff6e40" />
            </linearGradient>
          </defs>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      </div>

      <div class="error-code">403</div>
      <h1 class="error-title">Akses Ditolak</h1>
      <p class="error-desc">
        Anda tidak memiliki izin untuk mengakses halaman ini.
        Hubungi administrator jika Anda merasa ini adalah kesalahan.
      </p>

      <div class="info-box">
        <n-icon :component="InfoCircle" :size="16" />
        <span>Akses ke halaman ini memerlukan permission tertentu yang belum diberikan ke role Anda.</span>
      </div>

      <div class="btn-group">
        <n-button type="primary" strong @click="goHome" class="action-btn">
          <template #icon>
            <n-icon :component="Home" :size="16" />
          </template>
          Beranda
        </n-button>
        <n-button strong secondary @click="goBack" class="action-btn">
          <template #icon>
            <n-icon :component="ArrowLeft" :size="16" />
          </template>
          Kembali
        </n-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forbidden-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--telecom-gradient);
  position: relative;
  overflow: hidden;
}

.bg-shapes {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.07;
}

.shape-1 {
  width: 400px;
  height: 400px;
  background: #ff1744;
  top: -120px;
  right: -80px;
  animation: float 8s ease-in-out infinite;
}

.shape-2 {
  width: 300px;
  height: 300px;
  background: #00e5ff;
  bottom: -100px;
  left: -60px;
  animation: float 10s ease-in-out infinite reverse;
}

.shape-3 {
  width: 200px;
  height: 200px;
  background: #7c4dff;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float 12s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.shape-3 {
  animation: float3 12s ease-in-out infinite;
}

@keyframes float3 {
  0%, 100% { transform: translate(-50%, -50%); }
  50% { transform: translate(-50%, calc(-50% - 20px)); }
}

.forbidden-card {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 440px;
  width: 100%;
  padding: 48px 36px;
  background: rgba(15, 22, 64, 0.8);
  backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 23, 68, 0.08);
}

.icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(255, 23, 68, 0.08);
  border: 1px solid rgba(255, 23, 68, 0.15);
  margin-bottom: 20px;
  animation: pulse-ring 3s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 23, 68, 0.15); }
  50% { box-shadow: 0 0 0 12px rgba(255, 23, 68, 0); }
}

.error-code {
  font-size: 64px;
  font-weight: 800;
  background: linear-gradient(135deg, #ff1744, #ff6e40);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 8px;
  letter-spacing: -2px;
}

.error-title {
  font-size: 22px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 12px;
}

.error-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin: 0 0 20px;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(0, 229, 255, 0.06);
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 28px;
  text-align: left;
}

.info-box svg {
  flex-shrink: 0;
  color: #00e5ff;
  margin-top: 2px;
}

.info-box span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
}

.btn-group {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  min-width: 120px;
  border-radius: 10px;
}

@media (max-width: 480px) {
  .forbidden-card {
    padding: 36px 24px;
  }

  .error-code {
    font-size: 48px;
  }

  .error-title {
    font-size: 18px;
  }

  .btn-group {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
