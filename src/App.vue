<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider, darkTheme } from 'naive-ui'
import { useThemeStore } from './stores/theme'
import { useAuthStore } from './stores/auth'
import { darkThemeOverrides, lightThemeOverrides } from './config/themeOverrides'

const themeStore = useThemeStore()
const authStore = useAuthStore()

// Initialize auth store on app start
onMounted(() => {
  authStore.init()
})

const theme = computed(() => themeStore.isDark ? darkTheme : null)
const themeOverrides = computed(() => themeStore.isDark ? darkThemeOverrides : lightThemeOverrides)
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
