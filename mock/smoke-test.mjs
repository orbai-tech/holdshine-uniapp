import assert from 'node:assert/strict'
import { createServer } from './server.mjs'
import { config } from './config.mjs'

const server = createServer()

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const { port } = server.address()
const base = `http://127.0.0.1:${port}`

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json()
  return { status: response.status, json }
}

try {
  const health = await request('/health')
  assert.equal(health.status, 200)
  assert.equal(health.json.code, 0)
  assert.equal(health.json.data.name, 'soorak-mock')

  const denied = await request('/auth/profile')
  assert.equal(denied.status, 401)

  const login = await request('/auth/wx-login', {
    method: 'POST',
    body: { code: 'h5-dev-smoke', platform: 'h5' },
  })
  assert.equal(login.status, 200)
  assert.equal(login.json.code, 0)
  assert.equal(login.json.data.mock, true)
  assert.ok(login.json.data.token)
  assert.ok(login.json.data.user.openid.startsWith('oSOORAK_mock_'))
  assert.equal(login.json.data.user.nickname, '陈先生')

  const profile = await request('/auth/profile', { token: login.json.data.token })
  assert.equal(profile.status, 200)
  assert.equal(profile.json.data.openid, login.json.data.user.openid)

  const logout = await request('/auth/logout', {
    method: 'POST',
    token: login.json.data.token,
  })
  assert.equal(logout.status, 200)

  const afterLogout = await request('/auth/profile', { token: login.json.data.token })
  assert.equal(afterLogout.status, 401)

  const stores = await request('/api/admin/stores?page=1&page_size=100')
  assert.equal(stores.status, 200)
  assert.equal(stores.json.code, 0)
  assert.ok(stores.json.data.list.length >= 1)
  assert.equal(typeof stores.json.data.list[0].store_id, 'string')

  const menu = await request('/api/mp/stores/1/menu')
  assert.equal(menu.json.code, 0)
  assert.ok(menu.json.data.categories.length >= 1)
  assert.ok(menu.json.data.categories[0].products[0].skus.length >= 1)

  const cartDenied = await request('/api/mp/cart?store_id=1')
  assert.equal(cartDenied.status, 200)
  assert.equal(cartDenied.json.code, 40100)

  const mpLogin = await request('/api/mp/auth/wx-login', {
    method: 'POST',
    body: { code: 'h5-dev-smoke-mp', login_role: 'customer' },
  })
  assert.equal(mpLogin.json.code, 0)
  assert.ok(mpLogin.json.data.token)
  assert.equal(mpLogin.json.data.userinfo.user_type, 'customer')
  const mpToken = mpLogin.json.data.token

  const me = await request('/api/mp/auth/me', { token: mpToken })
  assert.equal(me.json.code, 0)
  assert.equal(me.json.data.uid, mpLogin.json.data.userinfo.uid)

  const added = await request('/api/mp/cart/items', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, product_id: 1, sku_id: 11, option_ids: [101], quantity: 1 },
  })
  assert.equal(added.json.code, 0)
  assert.equal(added.json.data.item_count, 1)

  const cart = await request('/api/mp/cart?store_id=1', { token: mpToken })
  assert.equal(cart.json.data.items.length, 1)

  const orders = await request('/api/mp/orders?page=1&page_size=20', { token: mpToken })
  assert.equal(orders.json.code, 0)
  assert.equal(orders.json.data.total, 0)

  console.log('[smoke] 鉴权链路通过：health → 未登录 401 → wx-login → profile → logout → 失效 401')
  console.log('[smoke] 已接入路径通过：admin/stores → menu → mp-login → me → cart → orders')
  console.log(`[smoke] mock 默认端口 ${config.port}，本次探测端口 ${port}`)
} finally {
  server.close()
}
