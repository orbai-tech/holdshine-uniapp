import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.mjs'
import {
  addCartItem,
  createOrderFromCart,
  getCart,
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
  listAvailableCoupons,
  listMyCoupons,
  previewCheckout,
  redeemCoupon,
} from './lib/coupons.mjs'
import { buildMenu, stores } from './lib/fixtures.mjs'
import { forgetSession, getUser, hasSession, rememberSession, toMpUserinfo } from './lib/store.mjs'
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
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
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
        'POST /api/mp/auth/wx-login',
        'GET /api/mp/auth/me',
        'POST /api/mp/auth/logout',
        'GET /api/mp/stores',
        'GET /api/mp/stores/:id/menu',
        'GET /api/mp/cart',
        'POST /api/mp/cart/quote',
        'POST /api/mp/cart/items',
        'GET /api/mp/coupons/mine',
        'GET /api/mp/coupons/available',
        'POST /api/mp/coupons/claim',
        'POST /api/mp/coupons/redeem',
        'POST /api/mp/checkout/preview',
        'GET /api/mp/addresses',
        'POST /api/mp/addresses',
        'GET|PUT|DELETE /api/mp/addresses/:id',
        'GET /api/mp/orders',
        'POST /api/mp/orders',
        'POST /api/mp/payments/prepay',
        'POST /api/mp/payments/mock-paid',
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

  if (req.method === 'POST' && path === '/api/mp/auth/wx-login') {
    const body = await readBody(req)
    const { user } = await exchangeCode(body.code, body.platform)
    const issued = issueToken({ sub: user.openid, nickname: user.nickname })
    rememberSession(issued.token, user.openid)
    ok(res, { token: issued.token, userinfo: toMpUserinfo(user) })
    return
  }

  if (req.method === 'GET' && path === '/api/mp/auth/me') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, toMpUserinfo(session.user))
    return
  }

  if (req.method === 'POST' && path === '/api/mp/auth/logout') {
    const token = bearer(req)
    if (token) forgetSession(token)
    ok(res, null)
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

  if (req.method === 'GET' && path === '/api/mp/stores') {
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

  const menuMatch = path.match(/^\/api\/mp\/stores\/(\d+)\/menu$/)
  if (req.method === 'GET' && menuMatch) {
    const menu = buildMenu(menuMatch[1])
    if (!menu) {
      json(res, 200, { code: 40000, message: '门店不存在', data: null })
      return
    }
    ok(res, menu)
    return
  }

  if (req.method === 'GET' && path === '/api/mp/cart') {
    const session = requireMpSession(req, res)
    if (!session) return
    const storeId = Number(url.searchParams.get('store_id'))
    if (!Number.isInteger(storeId) || storeId <= 0) {
      json(res, 200, { code: 40000, message: '缺少 store_id', data: null })
      return
    }
    ok(res, getCart(session.user.openid, storeId))
    return
  }

  if (req.method === 'POST' && path === '/api/mp/cart/quote') {
    try {
      ok(res, quoteLine(await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/cart/items') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, addCartItem(session.user.openid, await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  const cartItemMatch = path.match(/^\/api\/mp\/cart\/items\/(\d+)$/)
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

  if (req.method === 'GET' && path === '/api/mp/coupons/mine') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, listMyCoupons())
    return
  }

  if (req.method === 'GET' && path === '/api/mp/coupons/available') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, listAvailableCoupons(url.searchParams.get('store_id')))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/coupons/claim') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, claimCoupon(await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/coupons/redeem') {
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

  if (req.method === 'POST' && path === '/api/mp/checkout/preview') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      const storeId = Number(body.store_id)
      if (!Number.isInteger(storeId) || storeId <= 0) {
        json(res, 200, { code: 40000, message: '缺少 store_id', data: null })
        return
      }
      const cart = getCart(session.user.openid, storeId)
      ok(res, previewCheckout(cart, body))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'GET' && path === '/api/mp/addresses') {
    const session = requireMpSession(req, res)
    if (!session) return
    ok(res, listAddresses(session.user.openid))
    return
  }

  if (req.method === 'POST' && path === '/api/mp/addresses') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, createAddress(session.user.openid, await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  const addressMatch = path.match(/^\/api\/mp\/addresses\/(\d+)$/)
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

  if (req.method === 'GET' && path === '/api/mp/orders') {
    const session = requireMpSession(req, res)
    if (!session) return
    const { page, pageSize } = pageQuery(url)
    ok(res, listOrders(session.user.openid, page, pageSize))
    return
  }

  if (req.method === 'POST' && path === '/api/mp/orders') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      ok(res, createOrderFromCart(session.user.openid, await readBody(req)))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  const orderMatch = path.match(/^\/api\/mp\/orders\/(\d+)$/)
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

  if (req.method === 'POST' && path === '/api/mp/payments/prepay') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      ok(res, prepay(session.user.openid, body.order_id))
    } catch (error) {
      json(res, 200, { code: error.code || 40000, message: error.message, data: null })
    }
    return
  }

  if (req.method === 'POST' && path === '/api/mp/payments/mock-paid') {
    const session = requireMpSession(req, res)
    if (!session) return
    try {
      const body = await readBody(req)
      ok(res, mockPaid(session.user.openid, body.order_id))
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
      '[mock] 已接入路径：/api/mp/auth/*  /api/mp/stores  /api/mp/stores/:id/menu  /api/mp/cart  /api/mp/coupons/*  /api/mp/addresses  /api/mp/orders  /api/mp/payments/*',
    )
    if (!config.wxAppId || !config.wxSecret) {
      console.warn('[mock] 未配置 WX_APPID / WX_SECRET，仅提供模拟会话')
    }
  })
}
