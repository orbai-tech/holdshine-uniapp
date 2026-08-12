/** 文档 DTO：POST /api/mp/auth/wx-login 入参。platform 只给本地取 code，不发给后端。 */
export interface WxLoginRequest {
  code: string
  login_role: 'customer'
}

export interface WxLoginPayload {
  code: string
  platform: 'mp-weixin' | 'h5' | 'devtools'
}

export interface MpUserInfoRes {
  uid: number
  user_type: string
  wechat_openid: string | null
  unionid: string | null
  mobile: string | null
  nickname: string | null
  avatar_path: string | null
  status: number
  member_no: string | null
  member_level_id: number | null
  last_login_at: string | null
}

export interface MpLoginRes {
  token: string
  userinfo: MpUserInfoRes
}

/** 页面/本地会话用的瘦模型。 */
export interface AuthUser {
  openid: string
  nickname: string
  avatarInitial: string
  memberNo: string
}

export interface LoginResult {
  token: string
  user: AuthUser
}
