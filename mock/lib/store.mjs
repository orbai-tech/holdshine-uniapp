import { createHash } from 'node:crypto'

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
    mobile: null,
    nickname: user.nickname,
    avatar_path: null,
    status: 1,
    member_no: user.memberNo,
    member_level_id: 1,
    last_login_at: null,
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
