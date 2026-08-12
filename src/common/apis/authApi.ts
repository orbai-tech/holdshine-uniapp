import { http } from '@/plugin/request'
import type { AuthUser, LoginResult, MpLoginRes, MpUserInfoRes, WxLoginPayload } from '@/common/types/auth'

/** 文档 snake_case → 页面 AuthUser，只在本层映射一次。 */
export function toAuthUser(info: MpUserInfoRes): AuthUser {
  const nickname = info.nickname || ''
  return {
    openid: info.wechat_openid || '',
    nickname,
    avatarInitial: nickname.slice(0, 1) || '?',
    memberNo: info.member_no || '',
  }
}

/** 用微信临时 code 换会话。鉴权走 HTTP，不走 catalog mock。 */
export async function loginByWxCode(payload: WxLoginPayload): Promise<LoginResult> {
  const data = await http.post<MpLoginRes>(
    '/api/mp/auth/wx-login',
    { code: payload.code, login_role: 'customer' },
    { showError: false },
  )
  return { token: data.token, user: toAuthUser(data.userinfo) }
}

export async function fetchAuthProfile(): Promise<AuthUser> {
  const info = await http.get<MpUserInfoRes>('/api/mp/auth/me', undefined, { showError: false })
  return toAuthUser(info)
}

export function logoutRemote() {
  return http.post<null>('/api/mp/auth/logout', {}, { showError: false })
}
