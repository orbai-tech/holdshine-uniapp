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
  assert.equal(health.json.data.name, 'yuanqi-mock')

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
  assert.ok(login.json.data.user.openid.startsWith('oYQSZ_mock_'))
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

  const stores = await request('/api/mp/stores?page=1&page_size=100&latitude=31.22&longitude=121.44')
  assert.equal(stores.status, 200)
  assert.equal(stores.json.code, 0)
  assert.ok(stores.json.data.list.length >= 1)
  assert.equal(typeof stores.json.data.list[0].store_id, 'string')
  assert.equal(typeof stores.json.data.list[0].distance_km, 'number')

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

  const quoted = await request('/api/mp/cart/quote', {
    method: 'POST',
    body: { store_id: 1, product_id: 1, sku_id: 11, option_ids: [101, 111], quantity: 1 },
  })
  assert.equal(quoted.json.code, 0)
  assert.equal(quoted.json.data.sku_id, 11)
  assert.ok(Number(quoted.json.data.unit_price) > 0)
  assert.equal(quoted.json.data.option_amount, '8.00')
  assert.equal(quoted.json.data.options.length, 2)

  const added = await request('/api/mp/cart/items', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, product_id: 1, sku_id: 11, option_ids: [101, 111], quantity: 2 },
  })
  assert.equal(added.json.code, 0)
  assert.equal(added.json.data.item_count, 2)
  assert.equal(added.json.data.items[0].options.length, 2)

  const cart = await request('/api/mp/cart?store_id=1', { token: mpToken })
  assert.equal(cart.json.data.items.length, 1)

  const previewNoCoupon = await request('/api/mp/checkout/preview', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1 },
  })
  assert.equal(previewNoCoupon.json.code, 0)
  assert.equal(previewNoCoupon.json.data.discount_amount, '0.00')
  assert.ok(previewNoCoupon.json.data.coupons.length >= 2)

  const usable = previewNoCoupon.json.data.coupons.find((item) => item.usable)
  assert.ok(usable, '满额后应有可用券')
  const previewWithCoupon = await request('/api/mp/checkout/preview', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, coupon_id: usable.coupon_id },
  })
  assert.equal(previewWithCoupon.json.code, 0)
  assert.ok(Number(previewWithCoupon.json.data.discount_amount) > 0)

  const emptyOrders = await request('/api/mp/orders?page=1&page_size=20', { token: mpToken })
  assert.equal(emptyOrders.json.code, 0)
  assert.equal(emptyOrders.json.data.total, 0)

  const created = await request('/api/mp/orders', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      service_mode: 2,
      from_cart: true,
      table_id: null,
      coupon_id: usable.coupon_id,
    },
  })
  assert.equal(created.json.code, 0)
  assert.equal(created.json.data.order_status, 0)
  assert.equal(created.json.data.service_mode, 2)
  assert.equal(created.json.data.discount_amount, previewWithCoupon.json.data.discount_amount)
  assert.ok(created.json.data.items[0].options.length >= 1)
  const orderId = created.json.data.order_id
  assert.ok(orderId)

  const cartAfterCreate = await request('/api/mp/cart?store_id=1', { token: mpToken })
  assert.equal(cartAfterCreate.json.data.item_count, 0)

  const prepayRes = await request('/api/mp/payments/prepay', {
    method: 'POST',
    token: mpToken,
    body: { order_id: orderId },
  })
  assert.equal(prepayRes.json.code, 0)
  assert.equal(prepayRes.json.data.mock, true)

  const paid = await request('/api/mp/payments/mock-paid', {
    method: 'POST',
    token: mpToken,
    body: { order_id: orderId },
  })
  assert.equal(paid.json.code, 0)

  const orders = await request('/api/mp/orders?page=1&page_size=20', { token: mpToken })
  assert.equal(orders.json.code, 0)
  assert.equal(orders.json.data.total, 1)
  assert.equal(orders.json.data.list[0].order_id, orderId)
  assert.equal(orders.json.data.list[0].order_status, 1)
  assert.equal(orders.json.data.list[0].paid_amount, orders.json.data.list[0].payable_amount)
  assert.ok(orders.json.data.list[0].items[0].sku_name)
  assert.ok(orders.json.data.list[0].items[0].options.length >= 1)

  console.log('[smoke] 鉴权链路通过：health → 未登录 401 → wx-login → profile → logout → 失效 401')
  console.log(
    '[smoke] 已接入路径通过：mp/stores → menu → mp-login → me → quote → cart → preview → createOrder → prepay → mock-paid → orders',
  )
  console.log(`[smoke] mock 默认端口 ${config.port}，本次探测端口 ${port}`)
} finally {
  server.close()
}
