import type { AuthUser } from '@/common/types/auth'

export const TOKEN_KEY = 'access_token'
export const USER_KEY = 'yuanqi_user'
export const EXPIRES_KEY = 'token_expires_at'

export function readStoredToken(): string {
  return (uni.getStorageSync(TOKEN_KEY) as string) || ''
}

export function readStoredUser(): AuthUser | null {
  const raw = uni.getStorageSync(USER_KEY) as string | AuthUser | undefined
  if (!raw) return null
  let user: AuthUser | null = null
  if (typeof raw === 'object') user = raw
  else {
    try {
      user = JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  }
  if (!user) return null
  return {
    openid: user.openid || '',
    nickname: user.nickname || '',
    avatarInitial: user.avatarInitial || (user.nickname || '?').slice(0, 1),
    memberNo: user.memberNo || '',
    mobile: user.mobile || '',
    avatarPath: user.avatarPath || '',
    needReconsent: Boolean(user.needReconsent),
  }
}

export function readStoredExpiresAt(): number {
  const value = uni.getStorageSync(EXPIRES_KEY)
  return Number(value) || 0
}

export function persistSession(token: string, user: AuthUser, expiresIn?: number) {
  uni.setStorageSync(TOKEN_KEY, token)
  uni.setStorageSync(USER_KEY, JSON.stringify(user))
  if (expiresIn) {
    uni.setStorageSync(EXPIRES_KEY, String(Date.now() + expiresIn * 1000))
    return
  }
  uni.removeStorageSync(EXPIRES_KEY)
}

export function clearSessionStorage() {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
  uni.removeStorageSync(EXPIRES_KEY)
}

type UnauthorizedHandler = () => void
const unauthorizedHandlers = new Set<UnauthorizedHandler>()

export function subscribeUnauthorized(handler: UnauthorizedHandler) {
  unauthorizedHandlers.add(handler)
  return () => unauthorizedHandlers.delete(handler)
}

export function notifyUnauthorized() {
  clearSessionStorage()
  unauthorizedHandlers.forEach((handler) => handler())
}

export function isSessionExpired(): boolean {
  const expiresAt = readStoredExpiresAt()
  if (!expiresAt) return false
  return expiresAt <= Date.now()
}
