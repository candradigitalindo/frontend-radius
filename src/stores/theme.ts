import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<'light' | 'dark' | 'system'>(
    (localStorage.getItem('app_theme') as any) || 'light'
  )

  const systemDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    systemDark.value = e.matches
  })

  const isDark = computed(() => {
    if (mode.value === 'system') return systemDark.value
    return mode.value === 'dark'
  })

  function setMode(m: 'light' | 'dark' | 'system') {
    mode.value = m
    localStorage.setItem('app_theme', m)
  }

  watch(isDark, (dark) => {
    document.documentElement.classList.toggle('dark', dark)
  }, { immediate: true })

  return { mode, isDark, setMode }
})
