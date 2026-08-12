import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.mjs'
import { addCartItem, getCart, listOrders, removeCartItem, updateCartItem } from './lib/commerce.mjs'
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
        'GET /api/admin/stores',
        'GET /api/mp/stores/:id/menu',
        'GET /api/mp/cart',
        'POST /api/mp/cart/items',
        'GET /api/mp/orders',
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

  if (req.method === 'GET' && path === '/api/mp/orders') {
    const session = requireMpSession(req, res)
    if (!session) return
    const { page, pageSize } = pageQuery(url)
    ok(res, listOrders(session.user.openid, page, pageSize))
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
    console.log('[mock] 已接入路径：/api/mp/auth/*  /api/admin/stores  /api/mp/stores/:id/menu  /api/mp/cart  /api/mp/orders')
    if (!config.wxAppId || !config.wxSecret) {
      console.warn('[mock] 未配置 WX_APPID / WX_SECRET，仅提供模拟会话')
    }
  })
}
