<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NForm, NFormItem, NButton,
  NTabs, NTabPane, NSelect,
  NSpin, useMessage,
} from 'naive-ui'
import { settingApi } from '../../api'
import { useThemeStore } from '../../stores/theme'

const message = useMessage()
const themeStore = useThemeStore()
const loading = ref(true)
const savingTheme = ref(false)

const theme = ref({ theme: 'dark', language: 'id' })
const themeOptions = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Mengikuti Sistem', value: 'system' },
]
const langOptions = [
  { label: 'Bahasa Indonesia', value: 'id' },
  { label: 'English', value: 'en' },
]

async function loadTheme() {
  try {
    const { data: res } = await settingApi.getTheme()
    if (res.data) {
      theme.value.theme = res.data.app_theme || 'dark'
      theme.value.language = res.data.app_language || 'id'
    }
  } catch { /* defaults */ }
}

async function saveTheme() {
  savingTheme.value = true
  try {
    await settingApi.updateTheme({ theme: theme.value.theme, language: theme.value.language })
    themeStore.setMode(theme.value.theme as any)
    message.success('Pengaturan tema disimpan')
  } catch { message.error('Gagal menyimpan') }
  savingTheme.value = false
}

onMounted(async () => {
  await loadTheme()
  loading.value = false
})
</script>

<template>
  <n-spin :show="loading">
    <div class="settings-page">
      <h2 class="settings-title">Pengaturan Tampilan</h2>
      <p class="page-desc">Pengaturan default tampilan untuk semua pengguna di organisasi ini.</p>

      <n-form label-placement="top">
        <div class="form-grid">
          <div class="form-col-1">
            <n-form-item label="Mode Tema">
              <n-select v-model:value="theme.theme" :options="themeOptions" />
            </n-form-item>
          </div>
          <div class="form-col-1">
            <n-form-item label="Bahasa">
              <n-select v-model:value="theme.language" :options="langOptions" />
            </n-form-item>
          </div>
        </div>
        <div class="form-actions">
          <n-button type="primary" :loading="savingTheme" @click="saveTheme">Simpan</n-button>
        </div>
      </n-form>
    </div>
  </n-spin>
</template>

<style scoped>
.settings-page {
  background: rgba(128, 128, 128, 0.04);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(128, 128, 128, 0.1);
  max-width: 600px;
}

:root.dark .settings-page {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
}

.settings-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
}

.page-desc {
  font-size: 13px;
  opacity: 0.5;
  margin: 0 0 20px;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

.form-col-1 { grid-column: span 1; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

@media (max-width: 640px) {
  .settings-page { padding: 16px; }
  .settings-title { font-size: 18px; }
  .form-grid { grid-template-columns: 1fr; }
  .form-col-1 { grid-column: 1 / -1; }
}

@media (max-width: 480px) {
  .settings-page { padding: 14px; border-radius: 10px; }
  .settings-title { font-size: 16px; }
  .form-actions { justify-content: stretch; }
  .form-actions :deep(.n-button) { width: 100%; }
}
</style>
