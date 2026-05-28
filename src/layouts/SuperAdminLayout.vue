<script setup lang="ts">
import { h, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent, NMenu, NIcon, NAvatar, NDropdown, NSwitch, NSpace, NText, NTag } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  GridOutline as DashboardIcon,
  BusinessOutline as TenantIcon,
  MoonOutline as MoonIcon,
  SunnyOutline as SunIcon,
} from '@vicons/ionicons5'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const collapsed = ref(false)

const ri = (icon: any) => () => h(NIcon, null, { default: () => h(icon) })

const menuOptions: MenuOption[] = [
  { label: 'Dashboard', key: 'sa-dashboard', icon: ri(DashboardIcon) },
  { label: 'Tenants', key: 'sa-tenants', icon: ri(TenantIcon) },
]

const activeKey = computed(() => {
  const name = route.name as string
  if (name?.startsWith('sa-tenant')) return 'sa-tenants'
  return name || 'sa-dashboard'
})

function onMenuSelect(key: string) {
  const map: Record<string, string> = {
    'sa-dashboard': '/superadmin',
    'sa-tenants': '/superadmin/tenants',
  }
  router.push(map[key] || '/superadmin')
}

const userDropdownOptions = [
  { type: 'divider', key: 'd' },
  { label: 'Logout', key: 'logout' },
]

function onUserAction(key: string) {
  if (key === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}
</script>

<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider
      :collapsed="collapsed"
      collapse-mode="width"
      :collapsed-width="64"
      :width="230"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
      :native-scrollbar="false"
      class="sa-sider"
    >
      <div class="sider-logo">
        <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
          <rect x="3" y="3" width="26" height="26" rx="6" stroke="#ff1744" stroke-width="1.2" fill="rgba(255,23,68,0.08)"/>
          <path d="M10 16 L16 10 L22 16 L16 22 Z" stroke="#ff1744" stroke-width="1" fill="rgba(255,23,68,0.1)"/>
          <circle cx="16" cy="16" r="2" fill="#ff1744"/>
        </svg>
        <transition name="fade">
          <span v-if="!collapsed" class="logo-text">Super Admin</span>
        </transition>
      </div>
      <div style="margin: 0 16px; height: 2px; background: linear-gradient(90deg, #ff1744, #7c4dff, #ff1744); background-size: 300% 300%; animation: fiberFlow 4s ease infinite;"></div>
      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="20"
        :options="menuOptions"
        :value="activeKey"
        @update:value="onMenuSelect"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header class="sa-header">
        <n-text strong style="font-size: 15px">Super Admin Panel</n-text>
        <n-space align="center" :size="16">
          <n-tag
            :bordered="false"
            size="small"
            round
            style="background: rgba(255,23,68,0.1); color: #ff1744; border: 1px solid rgba(255,23,68,0.2)"
          >
            <template #icon>
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 2px; background: #ff1744"></span>
            </template>
            superadmin
          </n-tag>
          <n-switch :value="themeStore.isDark" @update:value="themeStore.setMode(themeStore.isDark ? 'light' : 'dark')" size="small">
            <template #checked>
              <n-icon :component="MoonIcon" :size="12" />
            </template>
            <template #unchecked>
              <n-icon :component="SunIcon" :size="12" />
            </template>
          </n-switch>
          <n-dropdown :options="userDropdownOptions" @select="onUserAction" trigger="click">
            <div class="user-badge">
              <n-avatar round :size="32" class="user-avatar">
                {{ authStore.user?.name?.charAt(0) || 'S' }}
              </n-avatar>
              <span class="user-name">{{ authStore.user?.name || 'Admin' }}</span>
            </div>
          </n-dropdown>
        </n-space>
      </n-layout-header>

      <n-layout-content content-style="padding: 24px" :native-scrollbar="false" class="sa-content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.sa-sider {
  background: linear-gradient(180deg, #1a0a0e 0%, #200f18 60%, #2a1028 100%) !important;
  border-right: 1px solid rgba(255, 23, 68, 0.08) !important;
}
.sa-sider :deep(.n-layout-sider-scroll-container) { background: transparent !important; }

.sider-logo {
  display: flex; align-items: center; gap: 10px;
  padding: 18px 20px; min-height: 60px;
}
.sider-logo svg { filter: drop-shadow(0 0 6px rgba(255,23,68,0.4)); flex-shrink: 0; }
.logo-text {
  font-weight: 800; font-size: 17px; white-space: nowrap;
  background: linear-gradient(135deg, #ff1744, #ff5252);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sa-sider :deep(.n-menu) { background: transparent !important; padding: 8px; }
.sa-sider :deep(.n-menu-item-content) { border-radius: 8px !important; }
.sa-sider :deep(.n-menu-item-content:hover) { background: rgba(255,23,68,0.06) !important; }
.sa-sider :deep(.n-menu-item-content--selected) { background: rgba(255,23,68,0.1) !important; }
.sa-sider :deep(.n-menu .n-menu-item-content__icon) { color: rgba(255,23,68,0.5) !important; }
.sa-sider :deep(.n-menu .n-menu-item-content--selected .n-menu-item-content__icon) { color: #ff1744 !important; }
.sa-sider :deep(.n-layout-toggle-button) { background: #200f18 !important; border-color: rgba(255,23,68,0.2) !important; color: #ff1744 !important; }

.sa-header {
  height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
  border-bottom: 1px solid rgba(255,23,68,0.06);
  background: rgba(26,10,14,0.6); backdrop-filter: blur(12px);
}

.user-badge {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 4px 10px 4px 4px; border-radius: 20px; transition: background 0.2s;
}
.user-badge:hover { background: rgba(255,23,68,0.06); }
.user-avatar { background: linear-gradient(135deg, #ff1744, #d50000) !important; color: #fff !important; font-weight: 700; font-size: 13px; }
.user-name { font-size: 13px; font-weight: 500; color: #ffcdd2; }

.sa-content { background: #120810; }

@keyframes fiberFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ===== LIGHT MODE ===== */
html:not(.dark) .sa-sider {
  background: linear-gradient(180deg, #fff5f5 0%, #fef2f2 60%, #fce4ec 100%) !important;
  border-right: 1px solid #fecdd3 !important;
}
html:not(.dark) .sa-sider :deep(.n-menu-item-content:hover) { background: rgba(255,23,68,0.05) !important; }
html:not(.dark) .sa-sider :deep(.n-menu-item-content--selected) { background: rgba(255,23,68,0.08) !important; }
html:not(.dark) .sa-sider :deep(.n-menu .n-menu-item-content__icon) { color: rgba(255,23,68,0.4) !important; }
html:not(.dark) .sa-sider :deep(.n-layout-toggle-button) { background: #ffffff !important; border-color: #fecdd3 !important; }

html:not(.dark) .sa-header {
  border-bottom-color: #fecdd3;
  background: rgba(255, 255, 255, 0.85);
}
html:not(.dark) .user-badge:hover { background: rgba(255,23,68,0.05); }
html:not(.dark) .user-name { color: #4a5568; }
html:not(.dark) .sa-content { background: #f0f4f8; }
</style>
