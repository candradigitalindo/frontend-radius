<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon, NAvatar, NDropdown, NSwitch } from 'naive-ui'
import {
  HomeOutline as HomeIcon,
  ReceiptOutline as InvoiceIcon,
  ChatbubbleEllipsesOutline as TicketIcon,
  PersonOutline as ProfileIcon,
  WifiOutline as DeviceIcon,
  RocketOutline as PackageIcon,
  PeopleOutline as ReferralIcon,
  MoonOutline as MoonIcon,
  SunnyOutline as SunIcon,
  MenuOutline as MenuIcon,
  CloseOutline as CloseIcon,
  LogOutOutline as LogoutIcon,
  ChevronForwardOutline as ChevronIcon,
} from '@vicons/ionicons5'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const showMobileMenu = ref(false)
const isMobile = ref(false)

const MOBILE_BREAKPOINT = 768

function checkMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
  if (!isMobile.value) showMobileMenu.value = false
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

interface NavItem {
  key: string
  label: string
  icon: any
  path: string
}

const navItems: NavItem[] = [
  { key: 'portal-dashboard', label: 'Beranda', icon: HomeIcon, path: '/portal' },
  { key: 'portal-invoices', label: 'Tagihan', icon: InvoiceIcon, path: '/portal/invoices' },
  { key: 'portal-package', label: 'Paket', icon: PackageIcon, path: '/portal/package' },
  { key: 'portal-device', label: 'Perangkat', icon: DeviceIcon, path: '/portal/device' },
  { key: 'portal-referral', label: 'Referral', icon: ReferralIcon, path: '/portal/referral' },
  { key: 'portal-tickets', label: 'Bantuan', icon: TicketIcon, path: '/portal/tickets' },
  { key: 'portal-profile', label: 'Profil', icon: ProfileIcon, path: '/portal/profile' },
]

const activeKey = computed(() => {
  const name = route.name as string
  if (name?.startsWith('portal-invoice')) return 'portal-invoices'
  if (name?.startsWith('portal-ticket')) return 'portal-tickets'
  return name || 'portal-dashboard'
})

function navigate(path: string) {
  router.push(path)
  showMobileMenu.value = false
}

const userDropdownOptions = [
  { label: 'Profil Saya', key: 'profile' },
  { type: 'divider', key: 'd' },
  { label: 'Logout', key: 'logout' },
]

function portalLogoutRedirect() {
  const slug = localStorage.getItem('portal_tenant_slug')
  authStore.logout()
  localStorage.removeItem('portal_tenant_slug')
  if (slug) {
    router.push(`/portal/login/${slug}`)
  } else {
    router.push('/login')
  }
}

function onUserAction(key: string) {
  if (key === 'logout') {
    portalLogoutRedirect()
  } else if (key === 'profile') {
    router.push('/portal/profile')
  }
}

function handleLogout() {
  portalLogoutRedirect()
}
</script>

<template>
  <div class="portal-shell">
    <!-- ===== Ambient aurora background ===== -->
    <div class="portal-aurora"><div class="aurora-blob"></div></div>

    <!-- ===== Top Navbar ===== -->
    <header class="portal-topbar">
      <div class="topbar-inner glass-card">
        <div class="topbar-left">
          <div class="brand" @click="navigate('/portal')">
            <div class="brand-icon">
              <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
                <circle cx="16" cy="16" r="14" stroke="var(--app-accent)" stroke-width="1.2" fill="var(--app-accent-soft)"/>
                <circle cx="16" cy="12" r="4" stroke="var(--app-accent)" stroke-width="1" fill="none"/>
                <path d="M8 26 Q8 18 16 18 Q24 18 24 26" stroke="var(--app-accent)" stroke-width="1" fill="none"/>
              </svg>
            </div>
            <span class="brand-text">Portal Pelanggan</span>
          </div>
        </div>

        <!-- Desktop nav -->
        <nav class="topbar-nav" v-if="!isMobile">
          <button
            v-for="item in navItems" :key="item.key"
            class="nav-btn" :class="{ active: activeKey === item.key }"
            @click="navigate(item.path)"
          >
            <n-icon :component="item.icon" :size="18" />
            <span>{{ item.label }}</span>
          </button>
        </nav>

        <div class="topbar-right">
          <n-switch
            :value="themeStore.isDark"
            @update:value="themeStore.setMode(themeStore.isDark ? 'light' : 'dark')"
            size="small"
          >
            <template #checked><n-icon :component="MoonIcon" :size="12" /></template>
            <template #unchecked><n-icon :component="SunIcon" :size="12" /></template>
          </n-switch>

          <n-dropdown v-if="!isMobile" :options="userDropdownOptions" @select="onUserAction" trigger="click">
            <div class="user-chip">
              <n-avatar round :size="32" class="user-avatar">
                {{ authStore.user?.name?.charAt(0) || 'U' }}
              </n-avatar>
              <span class="user-chip-name">{{ authStore.user?.name || 'Pelanggan' }}</span>
              <n-icon :component="ChevronIcon" :size="14" style="opacity: 0.5" />
            </div>
          </n-dropdown>

          <!-- Mobile hamburger -->
          <button v-if="isMobile" class="hamburger" @click="showMobileMenu = !showMobileMenu">
            <n-icon :component="showMobileMenu ? CloseIcon : MenuIcon" :size="22" />
          </button>
        </div>
      </div>
    </header>

    <!-- ===== Mobile slide menu ===== -->
    <Transition name="slide-menu">
      <div v-if="isMobile && showMobileMenu" class="mobile-menu-overlay" @click.self="showMobileMenu = false">
        <div class="mobile-menu glass-card glass-strong">
          <div class="mobile-menu-user">
            <n-avatar round :size="48" class="user-avatar">
              {{ authStore.user?.name?.charAt(0) || 'U' }}
            </n-avatar>
            <div>
              <div class="mobile-user-name">{{ authStore.user?.name || 'Pelanggan' }}</div>
              <div class="mobile-user-email">{{ authStore.user?.email || '' }}</div>
            </div>
          </div>
          <div class="mobile-menu-items">
            <button
              v-for="item in navItems" :key="item.key"
              class="mobile-nav-btn" :class="{ active: activeKey === item.key }"
              @click="navigate(item.path)"
            >
              <n-icon :component="item.icon" :size="20" />
              <span>{{ item.label }}</span>
            </button>
          </div>
          <button class="mobile-nav-btn logout-btn" @click="handleLogout">
            <n-icon :component="LogoutIcon" :size="20" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- ===== Main content ===== -->
    <main class="portal-main" :class="{ 'has-bottom-nav': isMobile }">
      <div class="portal-content-inner">
        <router-view />
      </div>
    </main>

    <!-- ===== Mobile bottom tab bar ===== -->
    <nav v-if="isMobile" class="bottom-tab-bar glass-card glass-strong">
      <button
        v-for="item in navItems" :key="item.key"
        class="tab-btn" :class="{ active: activeKey === item.key }"
        @click="navigate(item.path)"
      >
        <n-icon :component="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* ===== Shell ===== */
.portal-shell {
  min-height: 100vh;
  min-height: 100dvh; /* avoid phantom scroll from mobile browser toolbar */
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 0;
}

/* ===== Top Bar — floating glass ===== */
.portal-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 12px 16px 0;
}

.topbar-inner {
  max-width: 1180px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  gap: 16px;
  border-radius: var(--glass-radius);
  /* promote to its own layer so backdrop-filter paints reliably on mobile */
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

.topbar-left {
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.brand-icon {
  display: flex;
  filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.4));
}

.brand-text {
  font-weight: 800;
  font-size: 17px;
  background: var(--app-logo-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
  letter-spacing: -0.3px;
}

/* ===== Desktop Nav ===== */
.topbar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--app-text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-btn:hover {
  background: var(--app-accent-soft);
  color: var(--app-text-primary);
}

.nav-btn.active {
  background: var(--app-accent-medium);
  color: var(--app-accent);
  font-weight: 600;
  box-shadow: 0 0 12px var(--app-accent-soft);
}

/* ===== Top Right ===== */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 24px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-chip:hover {
  background: var(--app-badge-hover);
}

.user-avatar {
  background: var(--app-avatar-gradient) !important;
  color: #ffffff !important;
  font-weight: 700;
  font-size: 14px;
}

.user-chip-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-secondary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hamburger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  cursor: pointer;
  transition: background 0.2s;
}

.hamburger:hover {
  background: var(--app-accent-medium);
}

/* ===== Main Content ===== */
.portal-main {
  flex: 1;
  padding: 20px 16px;
  position: relative;
  z-index: 1;
  /* base text colour so portal pages that don't set an explicit colour don't
     fall back to the UA default (black), which is invisible in dark mode */
  color: var(--app-text-primary);
}

.portal-main.has-bottom-nav {
  padding-bottom: 96px;
}

.portal-content-inner {
  max-width: 1180px;
  margin: 0 auto;
}

/* ===== Mobile Menu ===== */
.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 101;
  background: rgba(0, 0, 0, 0.45);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}

.mobile-menu {
  position: absolute;
  right: 12px;
  top: 12px;
  bottom: 12px;
  width: 280px;
  height: auto;
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: var(--glass-radius-lg);
}

.mobile-menu-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: var(--app-accent-soft);
  margin-bottom: 16px;
}

.mobile-user-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--app-text-primary);
}

.mobile-user-email {
  font-size: 12px;
  color: var(--app-text-muted);
  margin-top: 2px;
}

.mobile-menu-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.mobile-nav-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.mobile-nav-btn:hover { background: var(--app-accent-soft); }
.mobile-nav-btn.active {
  background: var(--app-accent-medium);
  color: var(--app-accent);
  font-weight: 600;
}

.logout-btn {
  margin-top: auto;
  color: #ef4444;
  border-top: 1px solid var(--app-header-border);
  padding-top: 16px;
  border-radius: 0 0 10px 10px;
}

/* ===== Bottom Tab Bar (Mobile) — floating glass pill ===== */
.bottom-tab-bar {
  position: fixed;
  bottom: calc(12px + env(safe-area-inset-bottom, 0));
  left: 12px;
  right: 12px;
  z-index: 100;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 6px;
  border-radius: 22px;
  /* promote to its own compositing layer so the fixed glass bar paints on
     initial load / refresh (WebKit drops backdrop-filter on fixed els otherwise) */
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  will-change: transform;
}

.tab-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--app-text-muted);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, transform 0.15s;
  min-width: 52px;
}

.tab-btn:active { transform: scale(0.92); }

.tab-btn.active {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}

.tab-btn.active::before {
  content: '';
  position: absolute;
  top: 3px;
  width: 22px;
  height: 3px;
  border-radius: 3px;
  background: var(--glass-accent-grad);
}

/* ===== Transitions ===== */
.slide-menu-enter-active,
.slide-menu-leave-active {
  transition: opacity 0.25s ease;
}
.slide-menu-enter-active .mobile-menu,
.slide-menu-leave-active .mobile-menu {
  transition: transform 0.25s ease;
}
.slide-menu-enter-from,
.slide-menu-leave-to {
  opacity: 0;
}
.slide-menu-enter-from .mobile-menu {
  transform: translateX(100%);
}
.slide-menu-leave-to .mobile-menu {
  transform: translateX(100%);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .topbar-inner { padding: 0 16px; }
  .portal-main { padding: 16px; }
  .brand-text { display: none; }
}

@media (max-width: 480px) {
  .portal-main { padding: 12px; }
  .tab-btn { min-width: 48px; padding: 6px 8px; }
}
</style>
