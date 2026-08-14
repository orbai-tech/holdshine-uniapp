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
  const firstProduct = menu.json.data.categories[0].products[0]
  const sku = firstProduct.skus[0]
  const optionDeltas = (firstProduct.option_groups ?? [])
    .flatMap((group) => group.values)
    .filter((item) => [101, 111].includes(item.option_id))
  const localOptionSum = optionDeltas.reduce((sum, item) => sum + Number(item.price_delta || 0), 0)
  assert.ok(Number(sku.sale_price) > 0)

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

  // 契约已删 quote：mock 仍可通，但主路径改为菜单本地试算
  const quoted = await request('/api/mp/cart/quote', {
    method: 'POST',
    body: { store_id: 1, product_id: 1, sku_id: 11, option_ids: [101, 111], quantity: 1 },
  })
  assert.equal(quoted.json.code, 0)
  assert.equal(quoted.json.data.sku_id, 11)
  assert.ok(Number(quoted.json.data.unit_price) > 0)
  assert.equal(quoted.json.data.option_amount, '8.00')
  assert.equal(Number(quoted.json.data.option_amount), localOptionSum || 8)

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
  const cartSubtotal =
    Number(cart.json.data.product_amount) + Number(cart.json.data.option_amount)

  const mine = await request('/api/mp/coupons/mine', { token: mpToken })
  assert.equal(mine.json.code, 0)
  assert.ok(Array.isArray(mine.json.data.list))
  assert.ok(mine.json.data.list.length >= 2)
  const usable = mine.json.data.list.find((item) => {
    const threshold = Number(item.template.threshold_amount)
    return cartSubtotal + 1e-9 >= threshold
  })
  assert.ok(usable, '满额后应有可用券')
  const expectedDiscount = Math.min(
    Number(usable.template.discount_amount),
    cartSubtotal,
  ).toFixed(2)
  const clientPayable = Math.max(0, cartSubtotal - Number(expectedDiscount)).toFixed(2)

  // 地址 CRUD
  const addrCreated = await request('/api/mp/addresses', {
    method: 'POST',
    token: mpToken,
    body: {
      contact_name: '陈先生',
      mobile: '13800138000',
      province: '上海市',
      city: '上海市',
      district: '徐汇区',
      address: '漕溪北路1号',
      tag: '家',
      is_default: 1,
      latitude: 31.19,
      longitude: 121.43,
    },
  })
  assert.equal(addrCreated.json.code, 0)
  assert.equal(typeof addrCreated.json.data.address_id, 'string')
  assert.equal(addrCreated.json.data.is_default, 1)
  const addressId = addrCreated.json.data.address_id

  const addrList = await request('/api/mp/addresses', { token: mpToken })
  assert.equal(addrList.json.code, 0)
  assert.ok(addrList.json.data.list.some((row) => row.address_id === addressId))

  const addrGet = await request(`/api/mp/addresses/${addressId}`, { token: mpToken })
  assert.equal(addrGet.json.code, 0)
  assert.equal(addrGet.json.data.contact_name, '陈先生')

  const addrUpdated = await request(`/api/mp/addresses/${addressId}`, {
    method: 'PUT',
    token: mpToken,
    body: {
      contact_name: '陈女士',
      mobile: '13900139000',
      province: '上海市',
      city: '上海市',
      district: '黄浦区',
      address: '外滩18号',
      tag: '公司',
      is_default: 1,
    },
  })
  assert.equal(addrUpdated.json.code, 0)
  assert.equal(addrUpdated.json.data.contact_name, '陈女士')
  assert.equal(addrUpdated.json.data.district, '黄浦区')

  // 可领券：模板 4（品茗礼）初始可领；1/2 已有未使用样例券 → can_claim=false
  const available = await request('/api/mp/coupons/available?store_id=1', { token: mpToken })
  assert.equal(available.json.code, 0)
  assert.ok(Array.isArray(available.json.data.list))
  const claimable = available.json.data.list.find((item) => item.can_claim === true)
  assert.ok(claimable, '应有可领模板')
  assert.equal(typeof claimable.coupon_template_id, 'string')

  const claimed = await request('/api/mp/coupons/claim', {
    method: 'POST',
    token: mpToken,
    body: { coupon_template_id: Number(claimable.coupon_template_id), store_id: 1 },
  })
  assert.equal(claimed.json.code, 0)
  assert.ok(claimed.json.data.customer_coupon_id)
  assert.equal(Number(claimed.json.data.template.coupon_template_id), Number(claimable.coupon_template_id))

  const mineWithClaim = await request('/api/mp/coupons/mine', { token: mpToken })
  assert.equal(mineWithClaim.json.code, 0)
  assert.ok(
    mineWithClaim.json.data.list.some(
      (item) => item.customer_coupon_id === claimed.json.data.customer_coupon_id,
    ),
    'claim 后 mine 应含新券',
  )

  const addrDeleted = await request(`/api/mp/addresses/${addressId}`, {
    method: 'DELETE',
    token: mpToken,
  })
  assert.equal(addrDeleted.json.code, 0)
  const addrListAfter = await request('/api/mp/addresses', { token: mpToken })
  assert.equal(
    addrListAfter.json.data.list.some((row) => row.address_id === addressId),
    false,
  )

  // 预留核销 path：独立调用会标记已用；此处只断言接口存在（用第二张券测独立核销会污染下单）
  // 正式下单路径：createOrder 内原子核销
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
      customer_coupon_id: usable.customer_coupon_id,
      client_payable_amount: clientPayable,
    },
  })
  assert.equal(created.json.code, 0)
  assert.equal(created.json.data.order_status, 0)
  assert.equal(created.json.data.service_mode, 2)
  assert.equal(created.json.data.discount_amount, expectedDiscount)
  assert.equal(created.json.data.customer_coupon_id, usable.customer_coupon_id)
  assert.equal(created.json.data.payable_amount, clientPayable)
  assert.ok(created.json.data.items[0].options.length >= 1)
  const orderId = created.json.data.order_id
  assert.ok(orderId)

  const mineAfter = await request('/api/mp/coupons/mine', { token: mpToken })
  assert.equal(mineAfter.json.code, 0)
  assert.equal(
    mineAfter.json.data.list.some((item) => item.customer_coupon_id === usable.customer_coupon_id),
    false,
    '核销后 mine 不应再返回该券',
  )

  const cartAfterCreate = await request('/api/mp/cart?store_id=1', { token: mpToken })
  assert.equal(cartAfterCreate.json.data.item_count, 0)

  // 独立预留核销接口：对另一张未用券
  const another = mineAfter.json.data.list[0]
  assert.ok(another)
  const redeemed = await request('/api/mp/coupons/redeem', {
    method: 'POST',
    token: mpToken,
    body: { customer_coupon_id: another.customer_coupon_id, store_id: 1 },
  })
  assert.equal(redeemed.json.code, 0)
  assert.equal(redeemed.json.data.status, 'success')
  assert.equal(redeemed.json.data.customer_coupon_id, another.customer_coupon_id)

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
    '[smoke] 已接入路径通过：mp/stores → menu → mp-login → me → cart → addresses CRUD → available/claim → mine → createOrder(核销) → redeem → prepay → mock-paid → orders',
  )
  console.log(`[smoke] mock 默认端口 ${config.port}，本次探测端口 ${port}`)
} finally {
  server.close()
}
