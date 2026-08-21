import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.mjs'
import {
  addCartItem,
  cancelOrder,
  clearCart,
  createOrderFromCart,
  getCart,
  getCartOverview,
  getOrder,
  listOrders,
  mockPaid,
  prepay,
  quoteLine,
  removeCartItem,
  updateCartItem,
} from './lib/commerce.mjs'
import {
  createAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  updateAddress,
} from './lib/addresses.mjs'
import {
  claimCoupon,
  getMyCouponDetail,
  listAvailableCoupons,
  listMyCoupons,
  listUsableCoupons,
  previewCheckout,
  redeemCoupon,
} from './lib/coupons.mjs'
import { buildMenu, getStoreDetail, stores } from './lib/fixtures.mjs'
import { getMallCatalog, getMallProduct } from './lib/mall.mjs'
import { listAvailableTables, occupyTable, resolveTable } from './lib/tables.mjs'
import { getPointsAccount, listPointsLedger } from './lib/points.mjs'
import {
  applyMemberPaid,
  getMemberBenefits,
  getMemberLevels,
  getMemberSummary,
  listMemberSubscriptions,
  subscribeMember,
} from './lib/member.mjs'
import {
  getTakeawayDispatch,
  listDeliveryChannels,
  quoteDelivery,
} from './lib/delivery.mjs'
import {
  bumpLegalVersion,
  getLegalDocument,
  listLegalDocuments,
  currentLegalVersions,
} from './lib/legal.mjs'
import { forgetSession, getUser, hasSession, patchUser, rememberSession, toMpUserinfo } from './lib/store.mjs'
import { issueToken, verifyToken } from './lib/token.mjs'
import { exchangeCode } from './lib/wechat.mjs'

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  })
  res.end(payload)
}

function ok(res, data, message = 'success') {
  json(res, 200, { code: 0, message, data })
}

function fail(res, status, message, code = status) {
  json(res, status, { code, message, data: null })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      if (!chunks.length) {
        resolve({})
        return
      }
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) {
        resolve({})
        return
      }
      try {
        let parsed
        if (raw.startsWith('{') || raw.startsWith('[')) {
          parsed = JSON.parse(raw)
        } else {
          parsed = Object.fromEntries(new URLSearchParams(raw))
        }
        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function bearer(req) {
  const header = req.headers.authorization || ''
  const matched = header.match(/^Bearer\s+(.+)$/i)
  return matched ? matched[1] : ''
}

function isAgreedFlag(value) {
  if (value === true || value === 1 || value === '1') return true
  if (typeof value === 'string' && value.trim().toLowerCase() === 'true') return true
  return false
}

function pickBody(body, ...keys) {
  for (const key of keys) {
    if (body[key] != null && body[key] !== '') return body[key]
  }
  return undefined
}

function requireUser(req, res) {
  const token = bearer(req)
  try {
    const payload = verifyToken(token)
    if (!hasSession(token)) {
      fail(res, 401, '登录已失效', 401)
      return null
    }
    const user = getUser(payload.sub)
    if (!user) {
      fail(res, 401, '用户不存在', 401)
      return null
    }
    return { token, user }
  } catch {
    fail(res, 401, '未登录或登录已过期', 401)
    return null
  }
}

/** 已实现接口：HTTP 恒 200，鉴权失败看 body.code */
function requireMpSession(req, res) {
  const token = bearer(req)
  if (!token) {
    json(res, 200, { code: 40100, message: '缺少Authorization', data: null })
    return null
  }
  try {
    const payload = verifyToken(token)
    if (!hasSession(token)) {
      json(res, 200, { code: 40101, message: 'Token过期', data: null })
      return null
    }
    const user = getUser(payload.sub)
    if (!user) {
      json(res, 200, { code: 40102, message: 'Token无效', data: null })
      return null
    }
    return { token, user }
  } catch {
    json(res, 200, { code: 40102, message: 'Token无效', data: null })
    return null
  }
}

function pageQuery(url) {
  const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1)
  const pageSize = Math.max(1, Number(url.searchParams.get('page_size') || 20) || 20)
  return { page, pageSize }
}

function distanceKm(from, to) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const earth = 6371
  const dLat = toRad(to.latitude - from.latitude)
  const dLng = toRad(to.longitude - from.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** admin fixture → MpStoreRes；有顾客坐标时填 distance_km。 */
function toMpStore(store, point) {
  const lat = store.latitude != null ? Number(store.latitude) : null
  const lng = store.longitude != null ? Number(store.longitude) : null
  let distance_km = null
  if (point && Number.isFinite(lat) && Number.isFinite(lng)) {
    distance_km = Math.round(distanceKm(point, { latitude: lat, longitude: lng }) * 1000) / 1000
  }
  return {
    store_id: store.store_id,
    store_code: store.store_code,
    store_name: store.store_name,
    status: store.status,
    mobile: store.mobile,
    cover_path: store.cover_path,
    logo_path: store.logo_path,
    city: store.city,
    district: store.district,
    address: store.address,
    business_hours: store.business_hours,
    coffee_open_now: store.coffee_open_now !== false,
    status_label: store.status_label || (store.coffee_open_now === false ? '休息中' : '营业中'),
    enable_dine_in: store.enable_dine_in,
    enable_takeaway: store.enable_takeaway,
    enable_mall: store.enable_mall,
    enable_points: store.enable_points,
    latitude: store.latitude,
    longitude: store.longitude,
    distance_km,
  }
}

async function handle(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (req.method === 'OPTIONS') {
    json(res, 204, { code: 0, message: 'ok', data: null })
    return
  }

  if (req.method === 'GET' && (path === '/' || path === '/health')) {
    ok(res, {
      name: 'yuanqi-mock',
      wxAppId: config.wxAppId ? `${config.wxAppId.slice(0, 6)}…` : '',
      liveLogin: config.wxLiveLogin,
      routes: [
        'POST /api/mp/customer/auth/wx-login',
        'GET /api/mp/customer/auth/me',
        'POST /api/mp/customer/auth/logout',
        'PUT /api/mp/customer/auth/profile',
        'POST /api/mp/customer/auth/bind-phone',
        'POST /api/mp/customer/auth/avatar',
        'GET /api/mp/customer/stores',
        'GET /api/mp/customer/stores/:id',
        'GET /api/mp/customer/stores/:id/menu',
        'GET /api/mp/customer/cart',
        'GET /api/mp/customer/cart/overview',
        'POST /api/mp/customer/cart/quote',
        'POST /api/mp/customer/cart/items',
        'POST /api/mp/customer/cart/clear',
        'GET /api/mp/customer/coupons/mine',
        'GET /api/mp/customer/coupons/mine/:id',
        'GET /api/mp/customer/coupons/available',
        'GET /api/mp/customer/coupons/usable',
        'POST /api/mp/customer/coupons/claim',
        'POST /api/mp/customer/coupons/redeem',
        'POST /api/mp/customer/checkout/preview',
        'GET /api/mp/customer/addresses',
        'POST /api/mp/customer/addresses',
        'GET|PUT|DELETE /api/mp/customer/addresses/:id',
        'GET /api/mp/customer/orders',
        'POST /api/mp/customer/orders',
        'GET /api/mp/customer/orders/{id}',
        'POST /api/mp/customer/orders/{id}/cancel',
        'POST /api/mp/customer/payments/prepay',
        'POST /api/mp/customer/payments/mock-paid',
        'GET /api/mp/customer/mall',
        'GET /api/mp/customer/mall/products/:id',
        'GET /api/mp/customer/tables/resolve',
        'POST /api/mp/customer/tables/:id/occupy',
        'GET /api/mp/customer/stores/:id/tables/available',
        'GET /api/mp/customer/points/account',
        'GET /api/mp/customer/points/ledger',
        'GET /api/mp/customer/member/summary',
        'GET /api/mp/customer/member/levels',
        'GET /api/mp/customer/member/benefits',
        'POST /api/mp/customer/member/subscribe',
        'GET /api/mp/customer/member/subscriptions',
        'GET /api/mp/customer/delivery/channels',
        'POST /api/mp/customer/delivery/quote',
        'GET /api/mp/customer/delivery/orders/:id',
        'GET /api/mp/customer/legal/documents',
        'GET /api/mp/customer/legal/documents/:doc_type',
      ],
    })
    return
  }

  if (req.method === 'POST' && path === '/auth/wx-login') {
    const body = await readBody(req)
    const { user, mock } = await exchangeCode(body.code, body.platform)
    const issued = issueToken({ sub: user.openid, nickname: user.nickname })
    rememberSession(issued.token, user.openid)
    ok(res, {
      token: issued.token,
      expiresIn: issued.expiresIn,
      user,
      mock,
    })
    return
  }

  if (req.method === 'GET' && path === '/auth/profile') {
    const session = requireUser(req, res)
    if (!session) return
    ok(res, session.user)
    return
  }

  if (req.method === 'POST' && path === '/auth/logout') {
    const token = bearer(req)
    if (token) forgetSession(token)
    ok(res, { ok: true })
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/auth/wx-login') {
    const body = await readBody(req)
    const privacyFlag = pickBody(body, 'agree_privacy_policy', 'agreePrivacyPolicy')
    const handbookFlag = pickBody(body, 'agree_user_handbook', 'agreeUserHandbook')
    const agreedPrivacy = isAgreedFlag(privacyFlag)
    const agreedHandbook = isAgreedFlag(handbookFlag)
    const privacyVer = String(pickBody(body, 'privacy_policy_version', 'privacyPolicyVersion') || '').trim()
    const handbookVer = String(pickBody(body, 'user_handbook_version', 'userHandbookVersion') || '').trim()
    if (!agreedPrivacy || !agreedHandbook) {
      json(res, 200, { code: 41000, message: '须同意隐私协议与用户手册', data: null })
      return
    }
    if (!privacyVer || !handbookVer) {
      json(res, 200, { code: 41000, message: '缺少协议版本', data: null })
      return
    }
    const current = currentLegalVersions()
    if (privacyVer !== current.privacy || handbookVer !== current.handbook) {
      json(res, 200, { code: 41000, message: '协议版本已更新，请重新阅读', data: null })
      return
    }
    const { user } = await exchangeCode(body.code, body.platform)
    const wxPhone = body.wx_phone_code != null ? String(body.wx_phone_code).trim() : ''
    const mobileRaw = body.mobile != null ? String(body.mobile).trim() : ''
    const patch = {
      privacy_policy_version: privacyVer,
      user_handbook_version: handbookVer,
    }
    if (wxPhone || mobileRaw) {
      patch.mobile = mobileRaw || '13800138000'
    }
    const nextUser = patchUser(user.openid, patch) || user
    const issued = issueToken({ sub: nextUser.openid, nickname: nextUser.nickname })
    rememberSession(issued.token, nextUser.openid)
    ok(res, { token: issued.token, userinfo: toMpUserinfo(nextUser) })
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/legal/documents') {
    ok(res, { list: listLegalDocuments() })
    return
  }

  /** mock 专用：升版隐私协议+用户手册，便于小程序验收 need_reconsent（勿对真后端调用） */
  if (req.method === 'POST' && path === '/api/mp/customer/legal/__bump') {
    bumpLegalVersion(2)
    bumpLegalVersion(3)
    ok(res, { list: listLegalDocuments() })
    return
  }

  const legalDocMatch = path.match(/^\/api\/mp\/customer\/legal\/documents\/([^/]+)$/)
  if (req.method === 'GET' && legalDocMatch) {
    const doc = getLegalDocument(legalDocMatch[1])
    if (!doc) {
      json(res, 200, { code: 40400, message: '文档不存在', data: null })
      return
    }
    ok(res, doc)
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/auth/me') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, toMpUserinfo(session.user))
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/auth/logout') {
    const token = bearer(req)
    if (token) forgetSession(token)
    ok(res, null)
    return
  }

  if (req.method === 'PUT' && path === '/api/mp/customer/auth/profile') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      const patch = {}
      if (body.nickname != null) patch.nickname = String(body.nickname).trim() || session.user.nickname
      if (body.avatar_path != null) patch.avatar_path = body.avatar_path || null
      const updated = patchUser(session.user.openid, patch)
      ok(res, toMpUserinfo(updated))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/auth/bind-phone') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      let mobile = body.mobile != null ? String(body.mobile).trim() : ''
      const wxCode = body.wx_phone_code != null ? String(body.wx_phone_code).trim() : ''
      if (wxCode && !mobile) {
        mobile = '13800138000'
      }
      if (!mobile) {
        json(res, 200, { code: 40000, message: '缺少 mobile', data: null })
        return
      }
      if (!/^1\d{10}$/.test(mobile)) {
        json(res, 200, { code: 40000, message: '手机号格式不正确', data: null })
        return
      }
      const updated = patchUser(session.user.openid, { mobile })
      ok(res, toMpUserinfo(updated))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/auth/avatar') {
    const session = requireMpSession(req, res)
    if (!session) return
    // multipart：不解析文件内容，写入固定封面路径
    await new Promise((resolve) => {
      req.on('data', () => {})
      req.on('end', resolve)
      req.on('error', resolve)
    })
    const avatar_path = '/static/images/products/latte.jpg'
    const updated = patchUser(session.user.openid, { avatar_path })
    ok(res, { avatar_path, userinfo: toMpUserinfo(updated) })
    return
  }

  if (req.method === 'GET' && path === '/api/admin/stores') {
    const keyword = (url.searchParams.get('keyword') || '').trim()
    const statusRaw = url.searchParams.get('status')
    const { page, pageSize } = pageQuery(url)
    let list = stores
    if (keyword) list = list.filter((item) => item.store_name.includes(keyword) || item.store_code.includes(keyword))
    if (statusRaw != null && statusRaw !== '') {
      const status = Number(statusRaw)
      list = list.filter((item) => item.status === status)
    }
    const start = (page - 1) * pageSize
    ok(res, {
      list: list.slice(start, start + pageSize),
      total: list.length,
      page,
      page_size: pageSize,
    })
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/stores') {
    const keyword = (url.searchParams.get('keyword') || '').trim()
    const { page, pageSize } = pageQuery(url)
    const latRaw = url.searchParams.get('latitude')
    const lngRaw = url.searchParams.get('longitude')
    const lat = latRaw != null && latRaw !== '' ? Number(latRaw) : null
    const lng = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : null
    const hasPoint = Number.isFinite(lat) && Number.isFinite(lng)

    let list = stores.map((item) => toMpStore(item, hasPoint ? { latitude: lat, longitude: lng } : null))
    if (keyword) {
      list = list.filter((item) => item.store_name.includes(keyword) || item.store_code.includes(keyword))
    }
    if (hasPoint) {
      list = [...list].sort((a, b) => {
        const da = a.distance_km == null ? Number.POSITIVE_INFINITY : a.distance_km
        const db = b.distance_km == null ? Number.POSITIVE_INFINITY : b.distance_km
        return da - db
      })
    }
    const start = (page - 1) * pageSize
    ok(res, {
      list: list.slice(start, start + pageSize),
      total: list.length,
      page,
      page_size: pageSize,
    })
    return
  }

  const menuMatch = path.match(/^\/api\/mp\/customer\/stores\/(\d+)\/menu$/)
  if (req.method === 'GET' && menuMatch) {
    const menu = buildMenu(menuMatch[1])
    if (!menu) {
      json(res, 200, { code: 40000, message: '门店不存在', data: null })
      return
    }
    ok(res, menu)
    return
  }

  const storeDetailMatch = path.match(/^\/api\/mp\/customer\/stores\/(\d+)$/)
  if (req.method === 'GET' && storeDetailMatch) {
    const detail = getStoreDetail(storeDetailMatch[1])
    if (!detail) {
      json(res, 200, { code: 40000, message: '门店不存在', data: null })
      return
    }
    ok(res, detail)
    return
  }

  const availableTablesMatch = path.match(
    /^\/api\/mp\/customer\/stores\/(\d+)\/tables\/available$/,
  )
  if (req.method === 'GET' && availableTablesMatch) {
    try {
      ok(res, listAvailableTables(availableTablesMatch[1]))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/points/account') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, getPointsAccount(session.user.openid))
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/points/ledger') {
    const session = requireMpSession(req, res)
    if (!session) return
    const page = Number(url.searchParams.get('page') || 1)
    const pageSize = Number(url.searchParams.get('page_size') || 20)
    ok(res, listPointsLedger(session.user.openid, { page, page_size: pageSize }))
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/member/summary') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, getMemberSummary(session.user.openid))
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/member/levels') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, getMemberLevels(session.user.openid))
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/member/benefits') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, getMemberBenefits(session.user.openid))
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/member/subscriptions') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, listMemberSubscriptions(session.user.openid))
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/member/subscribe') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, subscribeMember(session.user.openid, await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/cart/overview') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, getCartOverview(session.user.openid))
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/cart') {
    const session = requireMpSession(req, res)
    if (!session) return
    const storeId = Number(url.searchParams.get('store_id'))
    if (!Number.isInteger(storeId) || storeId <= 0) {
      json(res, 200, { code: 40000, message: '缺少 store_id', data: null })
      return
    }
    const serviceModeRaw = url.searchParams.get('service_mode')
    const serviceMode =
      serviceModeRaw == null || serviceModeRaw === '' ? 1 : Number(serviceModeRaw)
    try {
      ok(res, getCart(session.user.openid, storeId, serviceMode))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/cart/quote') {
    try {
      ok(res, quoteLine(await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/cart/items') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, addCartItem(session.user.openid, await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  const cartItemMatch = path.match(/^\/api\/mp\/customer\/cart\/items\/(\d+)$/)
  if (cartItemMatch && (req.method === 'PUT' || req.method === 'DELETE')) {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const itemId = cartItemMatch[1]
      if (req.method === 'PUT') {
        ok(res, updateCartItem(session.user.openid, itemId, await readBody(req)))
      } else {
        ok(res, removeCartItem(session.user.openid, itemId))
      }
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/cart/clear') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, clearCart(session.user.openid, await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/tables/resolve') {
    try {
      ok(res, resolveTable(url.searchParams.get('qr_token')))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/delivery/channels') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, listDeliveryChannels())
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/delivery/quote') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, quoteDelivery(await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  {
    const deliveryOrderMatch = path.match(/^\/api\/mp\/customer\/delivery\/orders\/(\d+)$/)
    if (req.method === 'GET' && deliveryOrderMatch) {
      const session = requireMpSession(req, res)
      if (!session) return
      try {
        ok(res, getTakeawayDispatch(deliveryOrderMatch[1]))
      } catch (error) {
        json(res, 200, { code: error.code || 40000, message: error.message, data: null })
      }
      return
    }
  }

  {
    const occupyMatch = path.match(/^\/api\/mp\/customer\/tables\/(\d+)\/occupy$/)
    if (req.method === 'POST' && occupyMatch) {
      const session = requireMpSession(req, res)
      if (!session) return
      try {
        ok(res, occupyTable(occupyMatch[1]))
      } catch (error) {
        json(res, 200, { code: error.code || 40000, message: error.message, data: null })
      }
      return
    }
  }

  if (req.method === 'GET' && path === '/api/mp/customer/mall') {
    try {
      ok(res, getMallCatalog(url.searchParams.get('store_id')))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  {
    const mallProductMatch = path.match(/^\/api\/mp\/customer\/mall\/products\/(\d+)$/)
    if (req.method === 'GET' && mallProductMatch) {
      try {
        ok(res, getMallProduct(mallProductMatch[1], url.searchParams.get('store_id')))
      } catch (error) {
        json(res, 200, { code: error.code || 40000, message: error.message, data: null })
      }
      return
    }
  }

  if (req.method === 'GET' && path === '/api/mp/customer/coupons/mine') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, listMyCoupons(url.searchParams.get('coupon_status')))
    return
  }

  {
    const mineIdMatch = path.match(/^\/api\/mp\/customer\/coupons\/mine\/(\d+)$/)
    if (req.method === 'GET' && mineIdMatch) {
      const session = requireMpSession(req, res)
      if (!session) return
      try {
        ok(res, getMyCouponDetail(mineIdMatch[1]))
      } catch (error) {
        json(res, 200, { code: error.code || 40000, message: error.message, data: null })
      }
      return
    }
  }

  if (req.method === 'GET' && path === '/api/mp/customer/coupons/available') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, listAvailableCoupons(url.searchParams.get('store_id')))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/coupons/usable') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(
        res,
        listUsableCoupons({
          store_id: url.searchParams.get('store_id'),
          goods_amount: url.searchParams.get('goods_amount'),
          service_mode: url.searchParams.get('service_mode'),
          member_summary: getMemberSummary(session.user.openid),
        }),
      )
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/coupons/claim') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, claimCoupon(await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/coupons/redeem') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      ok(res, redeemCoupon(body))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/checkout/preview') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      const storeId = String(body.store_id ?? '')
      if (!/^\d+$/.test(storeId) || storeId === '0') {
        json(res, 200, { code: 40000, message: '缺少 store_id', data: null })
        return
      }
      const serviceMode =
        body.service_mode == null || body.service_mode === '' ? 1 : Number(body.service_mode)
      const cart = getCart(session.user.openid, storeId, serviceMode)
      ok(res, previewCheckout(cart, body))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/addresses') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, listAddresses(session.user.openid))
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/addresses') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, createAddress(session.user.openid, await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  const addressMatch = path.match(/^\/api\/mp\/customer\/addresses\/(\d+)$/)
  if (addressMatch && (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE')) {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const addressId = addressMatch[1]
      if (req.method === 'GET') {
        ok(res, getAddress(session.user.openid, addressId))
      } else if (req.method === 'PUT') {
        ok(res, updateAddress(session.user.openid, addressId, await readBody(req)))
      } else {
        ok(res, deleteAddress(session.user.openid, addressId))
      }
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'GET' && path === '/api/mp/customer/orders') {
    const session = requireMpSession(req, res)
    if (!session) return
    const { page, pageSize } = pageQuery(url)
    ok(
      res,
      listOrders(session.user.openid, page, pageSize, {
        status: url.searchParams.get('status'),
        service_mode: url.searchParams.get('service_mode'),
      }),
    )
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/orders') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, createOrderFromCart(session.user.openid, await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  const orderCancelMatch = path.match(/^\/api\/mp\/customer\/orders\/(\d+)\/cancel$/)
  if (req.method === 'POST' && orderCancelMatch) {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, cancelOrder(session.user.openid, orderCancelMatch[1]))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  const orderMatch = path.match(/^\/api\/mp\/customer\/orders\/(\d+)$/)
  if (req.method === 'GET' && orderMatch) {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, getOrder(session.user.openid, orderMatch[1]))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/payments/prepay') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      ok(res, prepay(session.user.openid, body.order_id, body.client_token))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/customer/payments/mock-paid') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      const result = mockPaid(session.user.openid, body.order_id, body.client_token)
      applyMemberPaid(session.user.openid, body.order_id)
      ok(res, result)
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  fail(res, 404, `未找到接口 ${req.method} ${path}`)
}

export function createServer() {
  return http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error('[mock]', error)
      fail(res, 500, error instanceof Error ? error.message : '服务器错误')
    })
  })
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isDirectRun) {
  const server = createServer()
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[mock] 元气善筑假后端已启动 http://127.0.0.1:${config.port}`)
    console.log(
      '[mock] 已接入路径：/api/mp/customer/auth/*  /api/mp/customer/stores  /api/mp/customer/stores/:id  /api/mp/customer/stores/:id/menu  /api/mp/customer/cart  /api/mp/customer/cart/overview  /api/mp/customer/points/*  /api/mp/customer/member/*  /api/mp/customer/coupons/*  /api/mp/customer/addresses  /api/mp/customer/orders  /api/mp/customer/payments/*  /api/mp/customer/mall*  /api/mp/customer/tables*  /api/mp/customer/delivery*',
    )
    if (!config.wxAppId || !config.wxSecret) {
      console.warn('[mock] 未配置 WX_APPID / WX_SECRET，仅提供模拟会话')
    }
  })
}
