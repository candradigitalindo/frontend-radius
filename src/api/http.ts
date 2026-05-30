import axios, { type InternalAxiosRequestConfig } from 'axios'
import router from '../router'
import { API_BASE_URL } from '../config/api'
import { clearAuthSession, getStoredAccessToken, getStoredRefreshToken, getStoredTenantId, persistAuthSession } from './authSession'

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  skipAuthRefresh?: boolean
}

function normalizeRequestPath(url?: string) {
  if (!url) return ''
  const baseURL = http.defaults.baseURL || ''
  return url.startsWith(baseURL) ? url.slice(baseURL.length) : url
}

function shouldSkipRefresh(config?: RetryableRequestConfig) {
  if (!config || config.skipAuthRefresh) return true
  const path = normalizeRequestPath(config.url)
  if (!path) return false

  if (path === '/auth/login' || path === '/auth/register' || path === '/auth/logout' || path === '/auth/reset-pin' || path === '/auth/reset-password') {
    return true
  }

  return /^\/public\/portal\/[^/]+\/(login|reset-pin|reset-password)$/.test(path)
}

http.interceptors.request.use((config) => {
  // Remove Content-Type for FormData so browser can set it with correct boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  const token = getStoredAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    delete config.headers.Authorization
  }
  const tenantId = getStoredTenantId()
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId
  }
  const lang = localStorage.getItem('app_language') || 'id'
  config.headers['Accept-Language'] = lang
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = []

function processQueue(error: any, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(error)
  })
  failedQueue = []
}

function forceLogout() {
  clearAuthSession()
  const currentPath = router.currentRoute.value.path
  // Already on a login page — no redirect needed
  if (currentPath === '/login' || currentPath.startsWith('/portal/login/')) return
  // Portal customers → redirect back to portal login
  if (currentPath.startsWith('/portal')) {
    const slug = localStorage.getItem('portal_tenant_slug')
    localStorage.removeItem('portal_tenant_slug')
    if (slug) {
      router.replace(`/portal/login/${slug}`)
      return
    }
  }
  router.replace('/login')
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    
    // Removed debug logging
    
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh(originalRequest)) {
      const refreshToken = getStoredRefreshToken()
      
      // If no refresh token exists, force logout
      if (!refreshToken) {
        forceLogout()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue the request to retry after token refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${token}`
          return http(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
        
        // Handle both flat { access_token } and nested { token: { access_token } } formats
        const refreshAccessToken = data?.access_token || data?.token?.access_token
        if (!refreshAccessToken) {
          throw new Error('Invalid refresh response')
        }
        
        const tokens = persistAuthSession(data, refreshToken)
        processQueue(null, tokens.accessToken)
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
        return http(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        forceLogout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    if (error.response?.status === 402) {
      const data = error.response.data
      if (data?.code === 'subscription_expired') {
        const currentPath = router.currentRoute.value.path
        if (currentPath !== '/isolasi') {
          sessionStorage.setItem('sub_expired_data', JSON.stringify(data))
          router.replace('/isolasi')
        }
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default http
