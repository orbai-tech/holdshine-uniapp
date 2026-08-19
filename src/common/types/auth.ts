export type WxLoginPlatform = 'mp-weixin' | 'h5' | 'devtools'

/** uni.login 拿到的临时码；consent 在换票时由 session 合并。 */
export interface WxLoginCodePayload {
  code: string
  platform: WxLoginPlatform
  wxPhoneCode?: string
}

/** 文档 DTO：POST /api/mp/customer/auth/wx-login 入参。platform 只给本地取 code，不发给后端。 */
export interface WxLoginPayload extends WxLoginCodePayload {
  agreePrivacyPolicy: boolean
  privacyPolicyVersion: string
  agreeUserHandbook: boolean
  userHandbookVersion: string
}

export interface MpUserInfoRes {
  uid: number | string
  user_type: string
  wechat_openid: string | null
  unionid: string | null
  mobile: string | null
  nickname: string | null
  avatar_path: string | null
  status: number
  member_no: string | null
  member_level_id: number | string | null
  last_login_at: string | null
  need_reconsent?: boolean
}

export interface MpLoginRes {
  token: string
  userinfo: MpUserInfoRes
}

export interface MpUpdateProfileReq {
  nickname?: string | null
  avatar_path?: string | null
}

export interface MpBindPhoneReq {
  mobile: string
  wx_phone_code?: string | null
}

export interface MpAvatarUploadRes {
  avatar_path: string
  userinfo: MpUserInfoRes
}

/** 页面/本地会话用的瘦模型。 */
export interface AuthUser {
  openid: string
  nickname: string
  avatarInitial: string
  memberNo: string
  mobile: string
  avatarPath: string
  needReconsent: boolean
}

export interface LoginResult {
  token: string
  user: AuthUser
}

export interface LoginConsent {
  privacyPolicyVersion: string
  userHandbookVersion: string
}

export interface LoginOptions {
  wxPhoneCode?: string
  consent: LoginConsent
}
