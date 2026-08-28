import { http } from '@/plugins/request'
import { ensureApiHost } from '@/config/apiHost'
import type {
  AuthUser,
  LoginResult,
  MpAvatarUploadRes,
  MpBindPhoneReq,
  MpLoginRes,
  MpUpdateProfileReq,
  MpUserInfoRes,
  WxLoginPayload,
} from '@/common/types/auth'
import { TOKEN_KEY } from '@/utils/authStorage'

async function apiBaseURL(): Promise<string> {
  return (await ensureApiHost()).replace(/\/$/, '')
}

/** 文档 snake_case → 页面 AuthUser，只在本层映射一次。 */
export function toAuthUser(info: MpUserInfoRes): AuthUser {
  const nickname = info.nickname || ''
  return {
    openid: info.wechat_openid || '',
    nickname,
    avatarInitial: nickname.slice(0, 1) || '?',
    memberNo: info.member_no || '',
    mobile: info.mobile || '',
    avatarPath: info.avatar_path || '',
  }
}

function assertLoginConsent(payload: WxLoginPayload) {
  if (!payload.agreePrivacyPolicy || !payload.agreeUserHandbook) {
    throw new Error('请先勾选用户须知与隐私政策')
  }
  if (!payload.privacyPolicyVersion.trim() || !payload.userHandbookVersion.trim()) {
    throw new Error('协议版本加载失败，请稍后重试')
  }
}

/** 用微信临时 code 换会话；须带双协议同意与版本号。可选 wx_phone_code。 */
export async function loginByWxCode(payload: WxLoginPayload): Promise<LoginResult> {
  assertLoginConsent(payload)
  const body: {
    code: string
    wx_phone_code?: string
    agree_privacy_policy: boolean
    privacy_policy_version: string
    agree_user_handbook: boolean
    user_handbook_version: string
  } = {
    code: payload.code,
    agree_privacy_policy: true,
    privacy_policy_version: payload.privacyPolicyVersion.trim(),
    agree_user_handbook: true,
    user_handbook_version: payload.userHandbookVersion.trim(),
  }
  if (payload.wxPhoneCode) body.wx_phone_code = payload.wxPhoneCode
  const data = await http.post<MpLoginRes>(
    '/api/mp/customer/auth/wx-login',
    body,
    { showError: false },
  )
  return { token: data.token, user: toAuthUser(data.userinfo) }
}

export async function fetchAuthProfile(): Promise<AuthUser> {
  const info = await http.get<MpUserInfoRes>('/api/mp/customer/auth/me', undefined, { showError: false })
  return toAuthUser(info)
}

export function logoutRemote() {
  return http.post<null>('/api/mp/customer/auth/logout', {}, { showError: false })
}

/** PUT /api/mp/customer/auth/profile → MpUserInfoRes */
export async function updateProfile(body: MpUpdateProfileReq): Promise<AuthUser> {
  const info = await http.put<MpUserInfoRes>('/api/mp/customer/auth/profile', body, { showError: false })
  return toAuthUser(info)
}

/** POST /api/mp/customer/auth/bind-phone → MpUserInfoRes */
export async function bindPhone(body: MpBindPhoneReq): Promise<AuthUser> {
  const info = await http.post<MpUserInfoRes>('/api/mp/customer/auth/bind-phone', body, { showError: false })
  return toAuthUser(info)
}

/**
 * POST /api/mp/customer/auth/avatar（multipart field=`file`）。
 * 成功返回 avatar_path + userinfo。
 */
export async function uploadAvatar(filePath: string): Promise<MpAvatarUploadRes> {
  const token = (uni.getStorageSync(TOKEN_KEY) as string) || ''
  const base = await apiBaseURL()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${base}/api/mp/customer/auth/avatar`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(response) {
        if (response.statusCode === 401) {
          reject(new Error('UNAUTHORIZED'))
          return
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }
        try {
          const raw = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
          const code = Number(raw?.code)
          if (code === 40100 || code === 40101 || code === 40102 || code === 40103) {
            reject(new Error('UNAUTHORIZED'))
            return
          }
          if (code !== 0) {
            reject(new Error(raw?.message || '上传失败'))
            return
          }
          resolve(raw.data as MpAvatarUploadRes)
        } catch {
          reject(new Error('上传响应无效'))
        }
      },
      fail(error) {
        reject(new Error(error.errMsg || '上传失败'))
      },
    })
  })
}
