import { createHash } from 'node:crypto'
import { userNeedsReconsent } from './legal.mjs'

const users = new Map()
const sessions = new Map()
let nextUid = 1001

function avatarInitial(name) {
  return (name || '素').slice(0, 1)
}

export function upsertUser({ openid, nickname, memberNo }) {
  const existing = users.get(openid)
  const name = nickname || existing?.nickname || '陈先生'
  const next = {
    uid: existing?.uid || nextUid++,
    openid,
    nickname: name,
    memberNo: memberNo || existing?.memberNo || '8800 1266',
    avatarInitial: avatarInitial(name),
    mobile: existing?.mobile ?? null,
    avatar_path: existing?.avatar_path ?? null,
    privacy_policy_version: existing?.privacy_policy_version ?? '',
    user_handbook_version: existing?.user_handbook_version ?? '',
  }
  users.set(openid, next)
  return next
}

export function patchUser(openid, patch) {
  const existing = users.get(openid)
  if (!existing) return null
  const nickname = patch.nickname != null ? String(patch.nickname) : existing.nickname
  const next = {
    ...existing,
    ...patch,
    nickname,
    avatarInitial: avatarInitial(nickname),
  }
  users.set(openid, next)
  return next
}

export function toMpUserinfo(user) {
  return {
    uid: user.uid,
    user_type: 'customer',
    wechat_openid: user.openid,
    unionid: null,
    mobile: user.mobile ?? null,
    nickname: user.nickname,
    avatar_path: user.avatar_path ?? null,
    status: 1,
    member_no: user.memberNo,
    member_level_id: 1,
    last_login_at: null,
    need_reconsent: userNeedsReconsent(user),
  }
}

export function getUser(openid) {
  return users.get(openid) || null
}

export function mockOpenidFromCode(code) {
  const digest = createHash('sha1').update(code).digest('hex').slice(0, 16)
  return `oYQSZ_mock_${digest}`
}

export function rememberSession(token, openid) {
  sessions.set(token, openid)
}

export function forgetSession(token) {
  sessions.delete(token)
}

export function hasSession(token) {
  return sessions.has(token)
}
