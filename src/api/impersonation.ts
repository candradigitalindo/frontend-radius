import { getStoredAccessToken, getStoredRefreshToken, getStoredTenantId } from './authSession'

const STASH_KEY = 'impersonation_stash'

interface ImpersonationStash {
  accessToken: string
  refreshToken: string
  tenantId: string
  user: Record<string, any> | null
  targetTenantId: string
  targetTenantName: string
}

/** Snapshot the current (superadmin) session before swapping in an impersonated one. */
export function stashCurrentSession(user: Record<string, any> | null, targetTenantId: string, targetTenantName: string) {
  const stash: ImpersonationStash = {
    accessToken: getStoredAccessToken(),
    refreshToken: getStoredRefreshToken(),
    tenantId: getStoredTenantId(),
    user,
    targetTenantId,
    targetTenantName,
  }
  sessionStorage.setItem(STASH_KEY, JSON.stringify(stash))
}

export function getImpersonationStash(): ImpersonationStash | null {
  try {
    const raw = sessionStorage.getItem(STASH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function isImpersonating() {
  return !!sessionStorage.getItem(STASH_KEY)
}

export function clearImpersonationStash() {
  sessionStorage.removeItem(STASH_KEY)
}
