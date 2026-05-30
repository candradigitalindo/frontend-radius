<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent, NMenu, NIcon, NAvatar, NDropdown, NSwitch, NSpace, NText, NTag, type MenuOption } from 'naive-ui'
import {
  MoonOutline as MoonIcon,
  SunnyOutline as SunIcon,
} from '@vicons/ionicons5'
import { Menu2 } from '@vicons/tabler'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { usePermission } from '../composables/usePermission'
import { allMenuItems, buildChildToGroup } from '../config/menuItems'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const { canAccessMenu, role } = usePermission()
const collapsed = ref(false)
const isMobile = ref(false)
const showMobileSidebar = ref(false)
const siderCollapsed = computed(() => isMobile.value ? false : collapsed.value)

const MOBILE_BREAKPOINT = 768

function checkMobile() {
  const mobile = window.innerWidth < MOBILE_BREAKPOINT
  isMobile.value = mobile
  if (mobile) {
    collapsed.value = true
    showMobileSidebar.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const childToGroup = buildChildToGroup(allMenuItems)

const expandedKeys = ref<string[]>([])

const menuOptions = computed<MenuOption[]>(() => {
  return allMenuItems
    .map(item => {
      if (item.children) {
        const visibleChildren = item.children.filter(child => canAccessMenu(child.key as string))
        if (visibleChildren.length === 0) return null
        return { ...item, children: visibleChildren }
      }
      return canAccessMenu(item.key as string) ? item : null
    })
    .filter(Boolean) as MenuOption[]
})

const activeKey = computed(() => {
  const name = route.name as string
  if (name?.startsWith('customer')) return 'customers'
  if (name?.startsWith('invoice')) return 'invoices'
  if (name?.startsWith('router')) return 'routers'
  if (name?.startsWith('ticket')) return 'tickets'
  if (name?.startsWith('ip-pool')) return 'ip-pools'
  if (name?.startsWith('reseller')) return 'resellers'
  if (name?.startsWith('olt')) return 'olts'
  if (name?.startsWith('odp')) return 'odps'
  if (name?.startsWith('ont')) return 'onts'
  return name || 'dashboard'
})

// Auto-expand group containing active menu item
watch(activeKey, (key) => {
  const group = childToGroup[key]
  if (group && !expandedKeys.value.includes(group)) {
    expandedKeys.value = [group]
  }
}, { immediate: true })

function onMenuSelect(key: string) {
  // Some keys need a custom path (contain dashes that map to nested routes)
  const customPaths: Record<string, string> = {
    'rewards-dashboard': '/rewards/dashboard',
  }
  if (customPaths[key]) {
    router.push(customPaths[key])
  } else {
    router.push(`/${key === 'dashboard' ? '' : key}`)
  }
  if (isMobile.value) showMobileSidebar.value = false
}

const userDropdownOptions = [
  { label: 'Profil', key: 'profile' },
  { label: 'Pengaturan', key: 'settings' },
  { type: 'divider', key: 'd' },
  { label: 'Logout', key: 'logout' },
]

function onUserAction(key: string) {
  if (key === 'logout') {
    authStore.logout()
    router.push('/login')
  } else if (key === 'settings') {
    router.push('/settings')
  } else if (key === 'profile') {
    router.push('/profile')
  }
}

const roleColors: Record<string, string> = {
  owner: '#22c55e',
  admin: '#00e5ff',
  technician: '#f59e0b',
}
</script>

<template>
  <n-layout has-sider style="height: 100vh">
    <!-- Mobile overlay backdrop -->
    <Transition name="fade-overlay">
      <div v-if="isMobile && showMobileSidebar" class="mobile-overlay" @click="showMobileSidebar = false"></div>
    </Transition>

    <n-layout-sider
      v-show="!isMobile || showMobileSidebar"
      :collapsed="siderCollapsed"
      collapse-mode="width"
      :collapsed-width="64"
      :width="250"
      :show-trigger="!isMobile"
      @collapse="collapsed = true"
      @expand="collapsed = false"
      :native-scrollbar="false"
      :class="['app-sider', { 'mobile-sider': isMobile }]"
      :position="isMobile ? 'absolute' : 'static'"
    >
      <!-- Logo -->
      <div class="sider-logo">
        <div class="logo-mark">
          <svg v-if="!siderCollapsed" viewBox="0 0 32 32" width="28" height="28" fill="none">
            <circle cx="16" cy="16" r="14" :stroke="themeStore.isDark ? '#00e5ff' : '#00838f'" stroke-width="1.2" :fill="themeStore.isDark ? 'rgba(0,229,255,0.08)' : 'rgba(0,131,143,0.08)'"/>
            <path d="M16 6 L16 26" :stroke="themeStore.isDark ? '#00e5ff' : '#00838f'" stroke-width="1.2"/>
            <path d="M16 10 L10 15" :stroke="themeStore.isDark ? '#00e5ff' : '#00838f'" stroke-width="0.8"/>
            <path d="M16 10 L22 15" :stroke="themeStore.isDark ? '#00e5ff' : '#00838f'" stroke-width="0.8"/>
            <circle cx="16" cy="7" r="1.5" :fill="themeStore.isDark ? '#00e5ff' : '#00838f'"/>
          </svg>
          <svg v-else viewBox="0 0 32 32" width="24" height="24" fill="none">
            <circle cx="16" cy="16" r="14" :stroke="themeStore.isDark ? '#00e5ff' : '#00838f'" stroke-width="1.2" :fill="themeStore.isDark ? 'rgba(0,229,255,0.08)' : 'rgba(0,131,143,0.08)'"/>
            <circle cx="16" cy="10" r="2" :fill="themeStore.isDark ? '#00e5ff' : '#00838f'"/>
            <path d="M16 12 L16 24" :stroke="themeStore.isDark ? '#00e5ff' : '#00838f'" stroke-width="1.2"/>
          </svg>
        </div>
<transition name="fade">
  <span v-if="!siderCollapsed" class="logo-text">D RADIUS</span>
</transition>
      </div>

      <!-- Fiber accent line -->
      <div class="fiber-line" style="margin: 0 16px"></div>

      <n-menu
        :collapsed="siderCollapsed"
        :collapsed-width="64"
        :collapsed-icon-size="20"
        :options="menuOptions"
        :value="activeKey"
        :expanded-keys="expandedKeys"
        accordion
        @update:value="onMenuSelect"
        @update:expanded-keys="expandedKeys = $event"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header class="app-header">
        <div class="header-left">
          <!-- Hamburger for mobile -->
          <button v-if="isMobile" class="hamburger-btn" @click="showMobileSidebar = !showMobileSidebar" aria-label="Toggle menu">
            <n-icon :component="Menu2" :size="22" />
          </button>
          <n-text strong style="font-size: 15px; letter-spacing: 0.3px">
            {{ (route.meta as any).title || (route.name as string || 'Dashboard').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) }}
          </n-text>
        </div>
        <n-space align="center" :size="16">
          <n-tag
            :bordered="false"
            size="small"
            round
            :style="{
              background: `${roleColors[role] || '#00e5ff'}15`,
              color: roleColors[role] || '#00e5ff',
              border: `1px solid ${roleColors[role] || '#00e5ff'}30`,
            }"
          >
            <template #icon>
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 2px" :style="{ background: roleColors[role] || '#00e5ff' }"></span>
            </template>
            {{ role }}
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
                {{ authStore.user?.name?.charAt(0) || 'U' }}
              </n-avatar>
              <span class="user-name">{{ authStore.user?.name || 'User' }}</span>
            </div>
          </n-dropdown>
        </n-space>
      </n-layout-header>

      <n-layout-content content-style="padding: 24px; max-width: 100%; overflow-x: hidden; box-sizing: border-box" :native-scrollbar="false" class="app-content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.app-sider {
  background: var(--app-sidebar-bg) !important;
  border-right: 1px solid var(--app-sidebar-border) !important;
}

.app-sider :deep(.n-layout-sider-scroll-container) {
  background: transparent !important;
}

.sider-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  min-height: 60px;
}

.logo-mark {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.4));
}

.logo-text {
  font-weight: 900;
  font-size: 18px;
  background: var(--app-logo-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
  letter-spacing: 3px;
  font-family: "Courier New", "SF Mono", "Fira Code", "JetBrains Mono", monospace;
  text-shadow: 0 0 20px rgba(0, 229, 255, 0.3), 0 0 40px rgba(0, 229, 255, 0.1);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.app-sider :deep(.n-menu) {
  background: transparent !important;
  padding: 8px;
}

.app-sider :deep(.n-menu-item-content) {
  border-radius: 8px !important;
  margin: 1px 0;
}

.app-sider :deep(.n-menu-item-content:hover) {
  background: var(--app-accent-soft) !important;
}

.app-sider :deep(.n-menu-item-content--selected) {
  background: var(--app-menu-selected-bg) !important;
}

.app-sider :deep(.n-menu-item-content--selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--app-accent);
  box-shadow: 0 0 8px var(--app-accent-strong);
}

.app-sider :deep(.n-menu .n-menu-item-content__icon) {
  color: var(--app-menu-icon) !important;
}

.app-sider :deep(.n-menu .n-menu-item-content--selected .n-menu-item-content__icon) {
  color: var(--app-menu-icon-active) !important;
}

.app-sider :deep(.n-menu-item-content__arrow) {
  color: var(--app-text-muted) !important;
}

/* Submenu group header */
.app-sider :deep(.n-submenu > .n-menu-item-content) {
  font-weight: 600 !important;
  opacity: 0.9;
  transition: opacity 0.2s;
}

.app-sider :deep(.n-submenu > .n-menu-item-content:hover) {
  opacity: 1;
}

/* Subtle left line for submenu children */
.app-sider :deep(.n-submenu-children) {
  position: relative;
}

.app-sider :deep(.n-submenu-children::before) {
  content: '';
  position: absolute;
  left: 24px;
  top: 4px;
  bottom: 4px;
  width: 1px;
  background: var(--app-accent-soft);
  border-radius: 1px;
}

.app-sider :deep(.n-layout-toggle-button) {
  background: var(--app-toggle-bg) !important;
  border-color: var(--app-toggle-border) !important;
  color: var(--app-accent) !important;
}

.app-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--app-header-border);
  background: var(--app-header-bg);
  backdrop-filter: blur(12px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 10px 4px 4px;
  border-radius: 20px;
  transition: background 0.2s;
}
.user-badge:hover {
  background: var(--app-badge-hover);
}

.user-avatar {
  background: var(--app-avatar-gradient) !important;
  color: #ffffff !important;
  font-weight: 700;
  font-size: 13px;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-secondary);
}

.app-content {
  background: var(--app-bg);
}

/* ===== Mobile Sidebar ===== */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  backdrop-filter: blur(2px);
}

.mobile-sider {
  position: fixed !important;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 1000;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
}

.hamburger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.hamburger-btn:hover {
  background: var(--app-badge-hover);
}

.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

/* Hide user name on small screens */
@media (max-width: 640px) {
  .user-name {
    display: none;
  }
  .app-header {
    padding: 0 12px;
  }
}
</style>
