const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const TENANT_ID_KEY = 'tenant_id'

export const AUTH_SESSION_CLEARED_EVENT = 'auth:session-cleared'

type AuthTokenPayload = {
  access_token?: string | null
  refresh_token?: string | null
  token?: {
    access_token?: string | null
    refresh_token?: string | null
  } | null
} | null | undefined

function normalizeTokenValue(value: string | null | undefined) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  if (!normalized || normalized === 'undefined' || normalized === 'null') return ''
  return normalized
}

function getTokenSource(payload: AuthTokenPayload) {
  if (payload?.token && typeof payload.token === 'object') return payload.token
  return payload ?? {}
}

export function getStoredAccessToken() {
  return normalizeTokenValue(localStorage.getItem(ACCESS_TOKEN_KEY))
}

export function getStoredRefreshToken() {
  return normalizeTokenValue(localStorage.getItem(REFRESH_TOKEN_KEY))
}

export function getStoredTenantId() {
  return localStorage.getItem(TENANT_ID_KEY) || ''
}

export function persistTenantId(tenantId: string) {
  if (tenantId) localStorage.setItem(TENANT_ID_KEY, tenantId)
}

export function persistAuthSession(payload: AuthTokenPayload, fallbackRefreshToken?: string | null) {
  const tokenSource = getTokenSource(payload)
  const accessToken = normalizeTokenValue(tokenSource.access_token)
  const refreshToken = normalizeTokenValue(tokenSource.refresh_token) || normalizeTokenValue(fallbackRefreshToken)

  if (!accessToken) {
    throw new Error('Missing access token in auth response')
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  return { accessToken, refreshToken }
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(TENANT_ID_KEY)
  window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT))
}