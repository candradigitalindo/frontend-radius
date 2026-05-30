import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, userApi } from '../api'
import { AUTH_SESSION_CLEARED_EVENT, clearAuthSession, getStoredAccessToken, persistAuthSession, persistTenantId } from '../api/authSession'

interface User {
  id: string
  tenant_id: string
  name: string
  email: string
  role: string
  phone: string
  plan?: string
  plan_expires_at?: string
  permissions?: string[]
}

const CACHED_USER_KEY = 'cached_user'

function loadCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveCachedUser(u: User | null) {
  if (u) {
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(u))
  } else {
    localStorage.removeItem(CACHED_USER_KEY)
  }
}

export const useAuthStore = defineStore('auth', () => {
  // Load cached user instantly (no API call)
  const user = ref<User | null>(loadCachedUser())
  const userRequest = ref<Promise<User | null> | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  const tenantId = computed(() => user.value?.tenant_id || '')

  window.addEventListener(AUTH_SESSION_CLEARED_EVENT, () => {
    user.value = null
    userRequest.value = null
    saveCachedUser(null)
  })

  async function login(email: string, password: string, tenant_id?: string) {
    const { data } = await authApi.login({ email, password, tenant_id })
    persistAuthSession(data)
    user.value = data.user
    saveCachedUser(data.user)
    if (data.user?.tenant_id) persistTenantId(data.user.tenant_id)
    // Load preferences
    try {
      const { data: prefs } = await userApi.getPreferences()
      if (prefs.data?.theme) localStorage.setItem('app_theme', prefs.data.theme)
      if (prefs.data?.language) localStorage.setItem('app_language', prefs.data.language)
    } catch { /* ignore */ }
  }

  async function fetchUser() {
    // If fetch already in-flight, return existing promise
    if (userRequest.value) return userRequest.value

    userRequest.value = (async () => {
    try {
      const { data } = await authApi.me()
      user.value = data
      saveCachedUser(data)
      if (data?.tenant_id) persistTenantId(data.tenant_id)
      return data
    } catch (error: any) {
        const is401 = error.response?.status === 401
        if (is401) {
          // Token expired / invalid — but we might have cached user data
          const cached = loadCachedUser()
          if (cached) {
            // Keep using cached data; don't force logout yet
            // Real API calls that fail 401 will trigger refresh via axios interceptor
            user.value = cached
            return cached
          }
          // No cache either — clear everything
          user.value = null
          saveCachedUser(null)
        }
        return user.value
      } finally {
        userRequest.value = null
      }
    })()

    return userRequest.value
  }

  function logout() {
    user.value = null
    userRequest.value = null
    saveCachedUser(null)
    clearAuthSession()
  }

  function setAuth(data: any) {
    persistAuthSession(data)
    user.value = data.user
    saveCachedUser(data.user)
    if (data.user?.tenant_id) persistTenantId(data.user.tenant_id)
  }

  const role = computed(() => user.value?.role || '')
  const isSuperAdmin = computed(() => role.value === 'superadmin')
  const isCustomer = computed(() => role.value === 'customer')
  const isStaff = computed(() => role.value !== '' && role.value !== 'superadmin' && role.value !== 'customer')

  function init() {
    const token = getStoredAccessToken()
    if (!token) {
      user.value = null
      userRequest.value = null
      saveCachedUser(null)
      return
    }
    // Don't eagerly fetch /auth/me — use cached data first
    // Real API calls will trigger refresh if token is expired
    if (!user.value) {
      void fetchUser()
    }
  }

  return { user, isAuthenticated, tenantId, role, isSuperAdmin, isCustomer, isStaff, login, fetchUser, logout, init, setAuth }
})
