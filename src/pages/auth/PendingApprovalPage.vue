<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NResult, NButton, NSpace } from 'naive-ui'
import { useThemeStore } from '../../stores/theme'

const router = useRouter()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)
</script>

<template>
  <div class="pending-page" :class="{ 'light-mode': !isDark }">
    <div class="content-wrapper">
      <n-result
        status="info"
        title="Pendaftaran Dalam Peninjauan"
        description="Terima kasih telah mendaftar di D Radius."
      >
        <template #icon>
          <div class="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shield-icon">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <circle cx="12" cy="11" r="3"></circle>
            </svg>
          </div>
        </template>
        
        <div class="message-container">
          <p>
            Untuk menjaga keamanan dan kualitas layanan, sistem kami mendeteksi bahwa pendaftaran Anda memerlukan <strong>verifikasi manual</strong> oleh tim kami.
          </p>
          <p>
            Hal ini adalah prosedur standar untuk memastikan lingkungan yang aman bagi seluruh pengguna D Radius. Tim kami sedang meninjau data Anda dan akan segera memprosesnya.
          </p>
          <p class="highlight">
            Setelah disetujui, kami akan mengirimkan detail akses (termasuk Password) ke nomor WhatsApp yang telah Anda daftarkan.
          </p>
        </div>

        <template #footer>
          <n-space justify="center" style="margin-top: 24px">
            <n-button type="primary" size="large" @click="router.push('/')">
              Kembali ke Beranda
            </n-button>
          </n-space>
        </template>
      </n-result>
    </div>
  </div>
</template>

<style scoped>
.pending-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  background-color: #1a1b26;
  color: #fff;
}

.pending-page.light-mode {
  background-color: #f7fafc;
  color: #1a202c;
}

.content-wrapper {
  max-width: 600px;
  width: 100%;
  background-color: #24283b;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.light-mode .content-wrapper {
  background-color: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  border-color: #e2e8f0;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.shield-icon {
  width: 40px;
  height: 40px;
  color: #6366f1;
}

.message-container {
  margin-top: 24px;
  text-align: center;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
}

.light-mode .message-container {
  color: #4a5568;
}

.message-container p {
  margin-bottom: 16px;
}

.message-container .highlight {
  background: rgba(99, 102, 241, 0.1);
  padding: 16px;
  border-radius: 8px;
  color: #818cf8;
  font-weight: 500;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.light-mode .message-container .highlight {
  background: #e0e7ff;
  color: #4f46e5;
  border-color: #c7d2fe;
}

:deep(.n-result-header__title) {
  font-size: 24px !important;
  font-weight: 700 !important;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-top: 20px;
}

:deep(.n-result-header__description) {
  font-size: 16px !important;
}
</style>
