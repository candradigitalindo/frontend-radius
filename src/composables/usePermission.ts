import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { permMenuMap, permRouteMap, saMenus, saRoutes, customerMenus, customerRoutes } from '../config/permissions'

export type Role = 'superadmin' | 'owner' | 'admin' | 'technician' | 'customer' | string

export function usePermission() {
  const authStore = useAuthStore()

  const role = computed<Role>(() => (authStore.user?.role as Role) || 'customer')
  const permissions = computed<string[]>(() => authStore.user?.permissions || [])

  const isSuperAdmin = computed(() => role.value === 'superadmin')
  const isOwner = computed(() => role.value === 'owner')
  const isAdmin = computed(() => role.value === 'admin')
  const isTechnician = computed(() => role.value === 'technician')
  const isCustomer = computed(() => role.value === 'customer')
  const isAdminLevel = computed(() => ['owner', 'admin'].includes(role.value))
  const isStaff = computed(() => !isSuperAdmin.value && !isCustomer.value)

  // Build sets for fast lookup
  const menuSet = computed<Set<string>>(() => {
    if (isSuperAdmin.value) return new Set(saMenus)
    if (isCustomer.value) return new Set(customerMenus)
    // 'help' (Panduan Penggunaan) is available to every staff member
    const s = new Set<string>(['help'])
    for (const p of permissions.value) {
      const menus = permMenuMap[p]
      if (menus) menus.forEach(m => s.add(m))
    }
    return s
  })

  const routeSet = computed<Set<string>>(() => {
    if (isSuperAdmin.value) return new Set(saRoutes)
    if (isCustomer.value) return new Set(customerRoutes)
    const s = new Set<string>()
    for (const p of permissions.value) {
      const routes = permRouteMap[p]
      if (routes) routes.forEach(r => s.add(r))
    }
    return s
  })

  function canAccessMenu(key: string): boolean {
    return menuSet.value.has(key)
  }

  function canAccessRoute(routeName: string): boolean {
    return routeSet.value.has(routeName)
  }

  function hasPermission(perm: string): boolean {
    if (isSuperAdmin.value || isOwner.value) return true
    return permissions.value.includes(perm)
  }

  function getHomeRoute(): string {
    if (isSuperAdmin.value) return '/superadmin'
    if (isCustomer.value) return '/portal'
    return '/'
  }

  return {
    role, permissions,
    isSuperAdmin, isOwner, isAdmin, isTechnician, isCustomer,
    isAdminLevel, isStaff,
    canAccessMenu, canAccessRoute, hasPermission, getHomeRoute,
  }
}
