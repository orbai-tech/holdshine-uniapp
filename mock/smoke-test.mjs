import assert from 'node:assert/strict'
import { bumpLegalVersion } from './lib/legal.mjs'
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

function smokeClientToken(label) {
  return `smoke_${label}_${Date.now().toString(36)}`.slice(0, 64)
}

function assertOrderAmounts(order) {
  assert.ok(order.product_amount != null)
  assert.ok(order.option_amount != null)
  assert.ok(order.packing_fee != null)
  assert.ok(order.delivery_fee != null)
  assert.ok(order.coupon_amount != null)
  assert.ok(order.member_discount_amount != null)
  assert.ok(order.discount_amount != null)
  assert.ok(order.payable_amount != null)
  assert.ok(order.paid_amount != null)
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

  const stores = await request('/api/mp/customer/stores?page=1&page_size=100&latitude=31.22&longitude=121.44')
  assert.equal(stores.status, 200)
  assert.equal(stores.json.code, 0)
  assert.ok(stores.json.data.list.length >= 1)
  assert.equal(typeof stores.json.data.list[0].store_id, 'string')
  assert.equal(typeof stores.json.data.list[0].distance_km, 'number')
  assert.equal(typeof stores.json.data.list[0].coffee_open_now, 'boolean')
  assert.equal(typeof stores.json.data.list[0].status_label, 'string')
  const jingAn = stores.json.data.list.find((item) => item.store_id === '1')
  const xuHui = stores.json.data.list.find((item) => item.store_id === '2')
  assert.ok(jingAn, '静安店应在列表中')
  assert.ok(xuHui, '徐汇店应在列表中')
  assert.equal(jingAn.coffee_open_now, false)
  assert.equal(jingAn.status_label, '休息中')
  assert.equal(jingAn.status, 1)
  assert.equal(xuHui.coffee_open_now, true)
  assert.equal(xuHui.status_label, '营业中')

  const storeDetail = await request('/api/mp/customer/stores/1')
  assert.equal(storeDetail.json.code, 0)
  assert.equal(storeDetail.json.data.store_id, '1')
  assert.equal(typeof storeDetail.json.data.packing_fee, 'string')
  assert.ok(storeDetail.json.data.enable_dine_in === 1)
  assert.equal(typeof storeDetail.json.data.coffee_open_now, 'boolean')
  assert.equal(typeof storeDetail.json.data.status_label, 'string')
  assert.equal(storeDetail.json.data.coffee_open_now, false)
  assert.equal(storeDetail.json.data.status_label, '休息中')

  const storeDetailOpen = await request('/api/mp/customer/stores/2')
  assert.equal(storeDetailOpen.json.code, 0)
  assert.equal(storeDetailOpen.json.data.coffee_open_now, true)
  assert.equal(storeDetailOpen.json.data.status_label, '营业中')

  const availableTables = await request('/api/mp/customer/stores/1/tables/available')
  assert.equal(availableTables.json.code, 0)
  assert.equal(availableTables.json.data.store_id, '1')
  assert.ok(Array.isArray(availableTables.json.data.list))
  assert.ok(availableTables.json.data.list.some((item) => item.selectable === true))
  assert.ok(availableTables.json.data.list.some((item) => item.selectable === false))

  const menu = await request('/api/mp/customer/stores/1/menu')
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

  const cartDenied = await request('/api/mp/customer/cart?store_id=1')
  assert.equal(cartDenied.status, 200)
  assert.equal(cartDenied.json.code, 40100)

  const legalList = await request('/api/mp/customer/legal/documents')
  assert.equal(legalList.status, 200)
  assert.equal(legalList.json.code, 0)
  assert.ok(Array.isArray(legalList.json.data.list))
  assert.equal(legalList.json.data.list.length, 2)
  const privacyDoc = legalList.json.data.list.find((item) => item.doc_type === 2)
  const handbookDoc = legalList.json.data.list.find((item) => item.doc_type === 3)
  assert.ok(privacyDoc?.version)
  assert.ok(handbookDoc?.version)
  assert.ok(String(privacyDoc.content_html).includes('<p>'))

  const legalDetail = await request('/api/mp/customer/legal/documents/2')
  assert.equal(legalDetail.json.code, 0)
  assert.equal(legalDetail.json.data.doc_type, 2)
  assert.equal(legalDetail.json.data.version, privacyDoc.version)
  assert.ok(legalDetail.json.data.content_html)

  const consent = {
    agree_privacy_policy: true,
    privacy_policy_version: privacyDoc.version,
    agree_user_handbook: true,
    user_handbook_version: handbookDoc.version,
  }

  const loginNoConsent = await request('/api/mp/customer/auth/wx-login', {
    method: 'POST',
    body: { code: 'h5-dev-smoke-mp-nocon sent' },
  })
  assert.equal(loginNoConsent.status, 200)
  assert.equal(loginNoConsent.json.code, 41000)

  const loginStringConsent = await request('/api/mp/customer/auth/wx-login', {
    method: 'POST',
    body: {
      code: 'h5-dev-smoke-mp-string-consent',
      agree_privacy_policy: 'true',
      privacy_policy_version: privacyDoc.version,
      agree_user_handbook: 'true',
      user_handbook_version: handbookDoc.version,
    },
  })
  assert.equal(loginStringConsent.json.code, 0)

  const mpLogin = await request('/api/mp/customer/auth/wx-login', {
    method: 'POST',
    body: { code: 'h5-dev-smoke-mp', ...consent },
  })
  assert.equal(mpLogin.json.code, 0)
  assert.ok(mpLogin.json.data.token)
  assert.equal(mpLogin.json.data.userinfo.user_type, 'customer')
  const mpToken = mpLogin.json.data.token

  const me = await request('/api/mp/customer/auth/me', { token: mpToken })
  assert.equal(me.json.code, 0)
  assert.equal(me.json.data.uid, mpLogin.json.data.userinfo.uid)
  assert.equal(me.json.data.need_reconsent, false)

  const profileUpdated = await request('/api/mp/customer/auth/profile', {
    method: 'PUT',
    token: mpToken,
    body: { nickname: '元气测客' },
  })
  assert.equal(profileUpdated.json.code, 0)
  assert.equal(profileUpdated.json.data.nickname, '元气测客')

  const phoneBound = await request('/api/mp/customer/auth/bind-phone', {
    method: 'POST',
    token: mpToken,
    body: { mobile: '13912345678' },
  })
  assert.equal(phoneBound.json.code, 0)
  assert.equal(phoneBound.json.data.mobile, '13912345678')

  const phoneByWx = await request('/api/mp/customer/auth/bind-phone', {
    method: 'POST',
    token: mpToken,
    body: { mobile: '', wx_phone_code: 'mock-phone-code' },
  })
  assert.equal(phoneByWx.json.code, 0)
  assert.equal(phoneByWx.json.data.mobile, '13800138000')

  const meAfterProfile = await request('/api/mp/customer/auth/me', { token: mpToken })
  assert.equal(meAfterProfile.json.data.nickname, '元气测客')
  assert.equal(meAfterProfile.json.data.mobile, '13800138000')
  assert.equal(meAfterProfile.json.data.need_reconsent, false)

  bumpLegalVersion(2)
  bumpLegalVersion(3)
  const meAfterBump = await request('/api/mp/customer/auth/me', { token: mpToken })
  assert.equal(meAfterBump.json.code, 0)
  assert.equal(meAfterBump.json.data.need_reconsent, true)

  const staleLogin = await request('/api/mp/customer/auth/wx-login', {
    method: 'POST',
    body: { code: 'h5-dev-smoke-mp', ...consent },
  })
  assert.equal(staleLogin.json.code, 41000)

  const legalAfterBump = await request('/api/mp/customer/legal/documents')
  const privacyNext = legalAfterBump.json.data.list.find((item) => item.doc_type === 2)
  const handbookNext = legalAfterBump.json.data.list.find((item) => item.doc_type === 3)
  const reconsentLogin = await request('/api/mp/customer/auth/wx-login', {
    method: 'POST',
    body: {
      code: 'h5-dev-smoke-mp',
      agree_privacy_policy: true,
      privacy_policy_version: privacyNext.version,
      agree_user_handbook: true,
      user_handbook_version: handbookNext.version,
    },
  })
  assert.equal(reconsentLogin.json.code, 0)
  assert.equal(reconsentLogin.json.data.userinfo.need_reconsent, false)
  const mpToken2 = reconsentLogin.json.data.token
  const meAfterReconsent = await request('/api/mp/customer/auth/me', { token: mpToken2 })
  assert.equal(meAfterReconsent.json.data.need_reconsent, false)

  const pointsAccount = await request('/api/mp/customer/points/account', { token: mpToken })
  assert.equal(pointsAccount.json.code, 0)
  assert.ok(pointsAccount.json.data.customer_id)
  assert.equal(typeof pointsAccount.json.data.available_points, 'number')
  assert.ok(pointsAccount.json.data.available_points > 0)

  const pointsLedger = await request('/api/mp/customer/points/ledger?page=1&page_size=20', {
    token: mpToken,
  })
  assert.equal(pointsLedger.json.code, 0)
  assert.ok(Array.isArray(pointsLedger.json.data.list))
  assert.ok(pointsLedger.json.data.list.length >= 1)
  assert.equal(typeof pointsLedger.json.data.list[0].change_points, 'number')
  assert.equal(typeof pointsLedger.json.data.total, 'number')

  const memberSummary = await request('/api/mp/customer/member/summary', { token: mpToken })
  assert.equal(memberSummary.json.code, 0)
  assert.equal(memberSummary.json.data.level_code, 'gold')
  assert.equal(memberSummary.json.data.level_name, '金卡')
  assert.ok(String(memberSummary.json.data.benefits_description || '').includes('全场饮品 9 折'))
  assert.equal(typeof memberSummary.json.data.available_points, 'number')
  assert.ok(memberSummary.json.data.available_points > 0)
  const daysBefore = Number(memberSummary.json.data.remaining_days || 0)
  assert.ok(daysBefore > 0)

  const memberLevels = await request('/api/mp/customer/member/levels', { token: mpToken })
  assert.equal(memberLevels.json.code, 0)
  assert.ok(Array.isArray(memberLevels.json.data.list))
  const goldOffer = memberLevels.json.data.list.find((item) => item.level_code === 'gold')
  assert.ok(goldOffer, '应有金卡档位')
  assert.equal(
    memberLevels.json.data.list.some((item) => item.level_code === 'platinum'),
    false,
    '不提供铂金档',
  )
  assert.equal(goldOffer.purchasable, true)
  assert.equal(goldOffer.action_type, 2)

  const memberBenefits = await request('/api/mp/customer/member/benefits', { token: mpToken })
  assert.equal(memberBenefits.json.code, 0)
  assert.equal(memberBenefits.json.data.current.level_code, 'gold')
  assert.equal(memberBenefits.json.data.current.level_name, '金卡')
  assert.ok(String(memberBenefits.json.data.current.benefits_description || '').includes('全场饮品 9 折'))
  assert.ok(memberBenefits.json.data.description)
  assert.ok(Array.isArray(memberBenefits.json.data.levels?.list))

  const memberSubs = await request('/api/mp/customer/member/subscriptions', { token: mpToken })
  assert.equal(memberSubs.json.code, 0)
  assert.ok(Array.isArray(memberSubs.json.data.list))
  assert.ok(memberSubs.json.data.list.length >= 1)

  const subscribeNoToken = await request('/api/mp/customer/member/subscribe', {
    method: 'POST',
    token: mpToken,
    body: { target_level_id: Number(goldOffer.member_level_id) },
  })
  assert.equal(subscribeNoToken.json.code, 40000)

  const goldToken = smokeClientToken('member_gold')
  const goldSub = await request('/api/mp/customer/member/subscribe', {
    method: 'POST',
    token: mpToken,
    body: { target_level_id: Number(goldOffer.member_level_id), client_token: goldToken },
  })
  assert.equal(goldSub.json.code, 0)
  assert.ok(goldSub.json.data.order_id)
  const goldMemberOrder = await request(`/api/mp/customer/orders/${goldSub.json.data.order_id}`, {
    token: mpToken,
  })
  assert.equal(goldMemberOrder.json.code, 0)
  assert.equal(goldMemberOrder.json.data.service_mode, 5)
  assert.equal(goldMemberOrder.json.data.order_status, 1)
  assertOrderAmounts(goldMemberOrder.json.data)
  const memberCardList = await request(
    '/api/mp/customer/orders?page=1&page_size=20&service_mode=5',
    { token: mpToken },
  )
  assert.equal(memberCardList.json.code, 0)
  assert.ok(memberCardList.json.data.list.some((row) => row.order_id === goldSub.json.data.order_id))
  assert.ok(memberCardList.json.data.list.every((row) => row.service_mode === 5))
  const goldReplay = await request('/api/mp/customer/member/subscribe', {
    method: 'POST',
    token: mpToken,
    body: { target_level_id: Number(goldOffer.member_level_id), client_token: goldToken },
  })
  assert.equal(goldReplay.json.code, 0)
  assert.equal(goldReplay.json.data.order_id, goldSub.json.data.order_id)

  const goldOrderId = Number(goldSub.json.data.order_id)
  const goldPayToken = smokeClientToken('member_gold_pay')
  const goldPrepay = await request('/api/mp/customer/payments/prepay', {
    method: 'POST',
    token: mpToken,
    body: { order_id: goldOrderId, client_token: goldPayToken },
  })
  assert.equal(goldPrepay.json.code, 0)
  const goldPaid = await request('/api/mp/customer/payments/mock-paid', {
    method: 'POST',
    token: mpToken,
    body: { order_id: goldOrderId, client_token: goldPayToken },
  })
  assert.equal(goldPaid.json.code, 0)

  const afterGold = await request('/api/mp/customer/member/summary', { token: mpToken })
  assert.equal(afterGold.json.code, 0)
  assert.equal(afterGold.json.data.level_code, 'gold')
  assert.ok(Number(afterGold.json.data.remaining_days || 0) > daysBefore)

  // 契约已删 quote：mock 仍可通，但主路径改为菜单本地试算
  const quoted = await request('/api/mp/customer/cart/quote', {
    method: 'POST',
    body: { store_id: 1, product_id: 1, sku_id: 11, option_ids: [101, 111], quantity: 1 },
  })
  assert.equal(quoted.json.code, 0)
  assert.equal(quoted.json.data.sku_id, '11')
  assert.ok(Number(quoted.json.data.unit_price) > 0)
  assert.equal(quoted.json.data.option_amount, '8.00')
  assert.equal(Number(quoted.json.data.option_amount), localOptionSum || 8)

  const added = await request('/api/mp/customer/cart/items', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, product_id: 1, sku_id: 11, option_ids: [101, 111], quantity: 2, service_mode: 1 },
  })
  assert.equal(added.json.code, 0)
  assert.equal(added.json.data.item_count, 2)
  assert.equal(added.json.data.service_mode, 1)
  assert.equal(added.json.data.items[0].options.length, 2)
  const itemId = added.json.data.items[0].item_id

  const cartByMode = await request('/api/mp/customer/cart?store_id=1&service_mode=1', { token: mpToken })
  assert.equal(cartByMode.json.code, 0)
  assert.equal(cartByMode.json.data.item_count, 2)
  assert.equal(cartByMode.json.data.service_mode, 1)

  const cartOtherMode = await request('/api/mp/customer/cart?store_id=1&service_mode=3', { token: mpToken })
  assert.equal(cartOtherMode.json.code, 0)
  assert.equal(cartOtherMode.json.data.item_count, 0)

  const cartOverview = await request('/api/mp/customer/cart/overview', { token: mpToken })
  assert.equal(cartOverview.json.code, 0)
  assert.ok(Array.isArray(cartOverview.json.data.dine_in))
  assert.ok(Array.isArray(cartOverview.json.data.takeaway))
  assert.ok(Array.isArray(cartOverview.json.data.mall))
  assert.equal(cartOverview.json.data.dine_in.length, 1)
  assert.equal(cartOverview.json.data.dine_in[0].item_count, 2)
  assert.equal(cartOverview.json.data.takeaway.length, 0)

  const qtyUpdated = await request(`/api/mp/customer/cart/items/${itemId}`, {
    method: 'PUT',
    token: mpToken,
    body: { quantity: 3 },
  })
  assert.equal(qtyUpdated.json.code, 0)
  assert.equal(qtyUpdated.json.data.items[0].quantity, 3)
  assert.equal(qtyUpdated.json.data.item_count, 3)

  const cart = await request('/api/mp/customer/cart?store_id=1&service_mode=1', { token: mpToken })
  assert.equal(cart.json.data.items.length, 1)
  assert.equal(cart.json.data.items[0].quantity, 3)
  const cartSubtotal =
    Number(cart.json.data.product_amount) + Number(cart.json.data.option_amount)

  const mine = await request('/api/mp/customer/coupons/mine', { token: mpToken })
  assert.equal(mine.json.code, 0)
  assert.ok(Array.isArray(mine.json.data.list))
  assert.ok(mine.json.data.list.length >= 2)
  assert.ok(mine.json.data.counts)
  assert.equal(typeof mine.json.data.counts.unused, 'number')
  assert.equal(typeof mine.json.data.counts.total, 'number')
  const usable = mine.json.data.list.find((item) => {
    const threshold = Number(item.template.threshold_amount)
    return cartSubtotal + 1e-9 >= threshold
  })
  assert.ok(usable, '满额后应有可用券')
  const expectedDiscount = Math.min(
    Number(usable.template.discount_amount),
    cartSubtotal,
  ).toFixed(2)

  const usableApi = await request(
    `/api/mp/customer/coupons/usable?store_id=1&service_mode=1&goods_amount=${cartSubtotal.toFixed(2)}`,
    { token: mpToken },
  )
  assert.equal(usableApi.json.code, 0)
  assert.ok(Array.isArray(usableApi.json.data.list))
  assert.ok(usableApi.json.data.list.some((item) => item.usable === true))

  // 地址 CRUD
  const addrCreated = await request('/api/mp/customer/addresses', {
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

  const addrList = await request('/api/mp/customer/addresses', { token: mpToken })
  assert.equal(addrList.json.code, 0)
  assert.ok(addrList.json.data.list.some((row) => row.address_id === addressId))

  const addrGet = await request(`/api/mp/customer/addresses/${addressId}`, { token: mpToken })
  assert.equal(addrGet.json.code, 0)
  assert.equal(addrGet.json.data.contact_name, '陈先生')

  const addrUpdated = await request(`/api/mp/customer/addresses/${addressId}`, {
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
  const available = await request('/api/mp/customer/coupons/available?store_id=1', { token: mpToken })
  assert.equal(available.json.code, 0)
  assert.ok(Array.isArray(available.json.data.list))
  const claimable = available.json.data.list.find((item) => item.can_claim === true)
  assert.ok(claimable, '应有可领模板')
  assert.equal(typeof claimable.coupon_template_id, 'string')

  const claimed = await request('/api/mp/customer/coupons/claim', {
    method: 'POST',
    token: mpToken,
    body: { coupon_template_id: Number(claimable.coupon_template_id), store_id: 1 },
  })
  assert.equal(claimed.json.code, 0)
  assert.ok(claimed.json.data.customer_coupon_id)
  assert.equal(Number(claimed.json.data.template.coupon_template_id), Number(claimable.coupon_template_id))

  const mineWithClaim = await request('/api/mp/customer/coupons/mine', { token: mpToken })
  assert.equal(mineWithClaim.json.code, 0)
  assert.ok(
    mineWithClaim.json.data.list.some(
      (item) => item.customer_coupon_id === claimed.json.data.customer_coupon_id,
    ),
    'claim 后 mine 应含新券',
  )

  const claimedId = claimed.json.data.customer_coupon_id
  const couponDetail = await request(`/api/mp/customer/coupons/mine/${claimedId}`, { token: mpToken })
  assert.equal(couponDetail.json.code, 0)
  assert.equal(couponDetail.json.data.customer_coupon_id, String(claimedId))
  assert.ok(couponDetail.json.data.template?.coupon_name)

  const addrDeleted = await request(`/api/mp/customer/addresses/${addressId}`, {
    method: 'DELETE',
    token: mpToken,
  })
  assert.equal(addrDeleted.json.code, 0)
  const addrListAfter = await request('/api/mp/customer/addresses', { token: mpToken })
  assert.equal(
    addrListAfter.json.data.list.some((row) => row.address_id === addressId),
    false,
  )

  // 预留核销 path：独立调用会标记已用；此处只断言接口存在（用第二张券测独立核销会污染下单）
  // 正式下单路径：createOrder 内原子核销
  const emptyOrders = await request(
    '/api/mp/customer/orders?page=1&page_size=20&service_mode=1',
    { token: mpToken },
  )
  assert.equal(emptyOrders.json.code, 0)
  assert.equal(emptyOrders.json.data.total, 0)

  const createClientToken = smokeClientToken('coupon_order')
  const created = await request('/api/mp/customer/orders', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      client_token: createClientToken,
      service_mode: 1,
      from_cart: true,
      table_id: null,
      customer_coupon_id: String(usable.customer_coupon_id),
    },
  })
  assert.equal(created.json.code, 0)
  assert.equal(created.json.data.order_status, 1)
  assert.equal(created.json.data.service_mode, 1)
  assert.equal(created.json.data.discount_amount, expectedDiscount)
  assert.equal(created.json.data.customer_coupon_id, usable.customer_coupon_id)
  const memberOff = Number(created.json.data.member_discount_amount || 0)
  const expectedPayable = Math.max(
    0,
    cartSubtotal - Number(expectedDiscount) - memberOff,
  ).toFixed(2)
  assert.equal(created.json.data.payable_amount, expectedPayable)
  assert.equal(created.json.data.coupon_amount, expectedDiscount)
  assertOrderAmounts(created.json.data)
  assert.ok(created.json.data.items[0].options.length >= 1)
  const orderId = created.json.data.order_id
  assert.ok(orderId)
  assert.equal(typeof orderId, 'string')
  assert.equal(typeof created.json.data.store_id, 'string')
  assert.equal(typeof created.json.data.items[0].item_id, 'string')
  assert.equal(typeof created.json.data.items[0].product_id, 'string')
  const firstOpt = created.json.data.items[0].options[0]
  assert.equal(typeof firstOpt.group_name, 'string')
  assert.equal(typeof firstOpt.option_name, 'string')
  assert.ok(firstOpt.price_delta != null)

  const duplicateCreate = await request('/api/mp/customer/orders', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      client_token: createClientToken,
      service_mode: 1,
      from_cart: true,
      table_id: null,
      customer_coupon_id: String(usable.customer_coupon_id),
    },
  })
  assert.equal(duplicateCreate.json.code, 0)
  assert.equal(duplicateCreate.json.data.order_id, orderId, '同 client_token 应幂等返回同一订单')

  // 订单详情 GET
  const detail = await request(`/api/mp/customer/orders/${orderId}`, { token: mpToken })
  assert.equal(detail.json.code, 0)
  assert.equal(detail.json.data.order_id, orderId)
  assert.equal(detail.json.data.order_status, 1)
  assert.equal(detail.json.data.payable_amount, expectedPayable)
  assert.ok(detail.json.data.items[0].options.length >= 1)

  const mineAfter = await request('/api/mp/customer/coupons/mine', { token: mpToken })
  assert.equal(mineAfter.json.code, 0)
  const redeemedRow = mineAfter.json.data.list.find(
    (item) => item.customer_coupon_id === usable.customer_coupon_id,
  )
  assert.ok(redeemedRow, '核销后 mine 仍应返回该券（契约：除已作废外）')
  assert.equal(redeemedRow.coupon_status, 3, '核销后 status 应为已使用(3)')

  const cartAfterCreate = await request('/api/mp/customer/cart?store_id=1&service_mode=1', { token: mpToken })
  assert.equal(cartAfterCreate.json.data.item_count, 0)

  // 独立预留核销接口：对另一张未用券
  const another = mineAfter.json.data.list.find((item) => item.coupon_status === 1)
  assert.ok(another, '应仍有未使用券可供独立核销')
  const redeemed = await request('/api/mp/customer/coupons/redeem', {
    method: 'POST',
    token: mpToken,
    body: { customer_coupon_id: another.customer_coupon_id, store_id: 1 },
  })
  assert.equal(redeemed.json.code, 0)
  assert.equal(redeemed.json.data.status, 'success')
  assert.equal(redeemed.json.data.customer_coupon_id, another.customer_coupon_id)

  const payToken = smokeClientToken('coupon_order_pay')
  const prepayRes = await request('/api/mp/customer/payments/prepay', {
    method: 'POST',
    token: mpToken,
    body: { order_id: Number(orderId), client_token: payToken },
  })
  assert.equal(prepayRes.json.code, 0)
  assert.equal(prepayRes.json.data.mock, true)

  const paid = await request('/api/mp/customer/payments/mock-paid', {
    method: 'POST',
    token: mpToken,
    body: { order_id: Number(orderId), client_token: payToken },
  })
  assert.equal(paid.json.code, 0)

  // 已支付不可取消
  const cancelPaid = await request(`/api/mp/customer/orders/${orderId}/cancel`, {
    method: 'POST',
    token: mpToken,
  })
  assert.notEqual(cancelPaid.json.code, 0)

  const orders = await request('/api/mp/customer/orders?page=1&page_size=20&service_mode=1', {
    token: mpToken,
  })
  assert.equal(orders.json.code, 0)
  assert.equal(orders.json.data.total, 1)
  assert.equal(orders.json.data.list[0].order_id, orderId)
  assert.equal(orders.json.data.list[0].order_status, 3)
  assert.equal(orders.json.data.list[0].paid_amount, orders.json.data.list[0].payable_amount)
  assert.ok(orders.json.data.list[0].items[0].sku_name)
  assert.ok(orders.json.data.list[0].items[0].options.length >= 1)

  // 待支付可取消：再加购下单 → cancel
  const forCancel = await request('/api/mp/customer/cart/items', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, product_id: 1, sku_id: 11, option_ids: [101], quantity: 1, service_mode: 1 },
  })
  assert.equal(forCancel.json.code, 0)
  const unpaidCreated = await request('/api/mp/customer/orders', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      client_token: smokeClientToken('unpaid'),
      service_mode: 1,
      from_cart: true,
      table_id: null,
    },
  })
  assert.equal(unpaidCreated.json.code, 0)
  assert.equal(unpaidCreated.json.data.order_status, 1)
  const unpaidId = unpaidCreated.json.data.order_id
  assert.equal(typeof unpaidId, 'string')

  const cancelled = await request(`/api/mp/customer/orders/${unpaidId}/cancel`, {
    method: 'POST',
    token: mpToken,
  })
  assert.equal(cancelled.json.code, 0)
  assert.equal(cancelled.json.data.order_id, unpaidId)
  assert.equal(cancelled.json.data.order_status, 6)

  const unpaidDetail = await request(`/api/mp/customer/orders/${unpaidId}`, { token: mpToken })
  assert.equal(unpaidDetail.json.code, 0)
  assert.equal(unpaidDetail.json.data.order_status, 6)

  // 自提 service_mode=2（烟雾直写下发，不经前端 pack→1）
  const pickupCart = await request('/api/mp/customer/cart/items', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      product_id: 1,
      sku_id: 11,
      option_ids: [101],
      quantity: 1,
      service_mode: 2,
    },
  })
  assert.equal(pickupCart.json.code, 0)
  const pickupCreated = await request('/api/mp/customer/orders', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      client_token: smokeClientToken('pickup'),
      service_mode: 2,
      from_cart: true,
    },
  })
  assert.equal(pickupCreated.json.code, 0)
  assert.equal(pickupCreated.json.data.service_mode, 2)
  assert.equal(pickupCreated.json.data.order_status, 1)
  assertOrderAmounts(pickupCreated.json.data)
  const pickupId = pickupCreated.json.data.order_id

  const pickupDetail = await request(`/api/mp/customer/orders/${pickupId}`, { token: mpToken })
  assert.equal(pickupDetail.json.code, 0)
  assert.equal(pickupDetail.json.data.service_mode, 2)
  assertOrderAmounts(pickupDetail.json.data)

  const pickupList = await request('/api/mp/customer/orders?page=1&page_size=20&service_mode=2', {
    token: mpToken,
  })
  assert.equal(pickupList.json.code, 0)
  assert.ok(pickupList.json.data.list.some((row) => row.order_id === pickupId))
  assert.ok(pickupList.json.data.list.every((row) => row.service_mode === 2))

  const pickupCancel = await request(`/api/mp/customer/orders/${pickupId}/cancel`, {
    method: 'POST',
    token: mpToken,
  })
  assert.equal(pickupCancel.json.code, 0)
  assert.equal(pickupCancel.json.data.order_status, 6)

  // 购物袋写操作：再加购 → DELETE 单项 → 再加购 → clear
  const reAdded = await request('/api/mp/customer/cart/items', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, product_id: 1, sku_id: 11, option_ids: [101], quantity: 1, service_mode: 1 },
  })
  assert.equal(reAdded.json.code, 0)
  const reItemId = reAdded.json.data.items[0].item_id
  assert.equal(reAdded.json.data.item_count, 1)

  const deleted = await request(`/api/mp/customer/cart/items/${reItemId}`, {
    method: 'DELETE',
    token: mpToken,
  })
  assert.equal(deleted.json.code, 0)
  assert.equal(deleted.json.data.item_count, 0)

  const forClear = await request('/api/mp/customer/cart/items', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, product_id: 1, sku_id: 11, quantity: 2, service_mode: 1 },
  })
  assert.equal(forClear.json.code, 0)
  assert.ok(forClear.json.data.item_count >= 2)

  const cleared = await request('/api/mp/customer/cart/clear', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, service_mode: 1 },
  })
  assert.equal(cleared.json.code, 0)
  assert.equal(cleared.json.data, null)

  const cartCleared = await request('/api/mp/customer/cart?store_id=1&service_mode=1', { token: mpToken })
  assert.equal(cartCleared.json.data.item_count, 0)

  const mallCatalog = await request('/api/mp/customer/mall?store_id=1')
  assert.equal(mallCatalog.status, 200)
  assert.equal(mallCatalog.json.code, 0)
  assert.equal(typeof mallCatalog.json.data.store_id, 'string')
  assert.ok(Array.isArray(mallCatalog.json.data.categories))
  assert.ok(mallCatalog.json.data.categories.length >= 1)
  const mallFirst = mallCatalog.json.data.categories[0].products?.[0]
  assert.ok(mallFirst?.product_id)
  assert.equal(typeof mallFirst.base_price, 'string')

  const mallDetail = await request(`/api/mp/customer/mall/products/${mallFirst.product_id}?store_id=1`)
  assert.equal(mallDetail.json.code, 0)
  assert.equal(mallDetail.json.data.product_id, mallFirst.product_id)
  assert.ok(mallDetail.json.data.description || mallDetail.json.data.short_description)

  const tableResolved = await request('/api/mp/customer/tables/resolve?qr_token=table-a1')
  assert.equal(tableResolved.json.code, 0)
  assert.equal(tableResolved.json.data.table_code, 'A1')
  assert.equal(tableResolved.json.data.table_status, 1)
  const resolvedTableId = tableResolved.json.data.table_id

  const tableOccupied = await request(`/api/mp/customer/tables/${resolvedTableId}/occupy`, {
    method: 'POST',
    token: mpToken,
  })
  assert.equal(tableOccupied.json.code, 0)
  assert.equal(tableOccupied.json.data.occupied, true)
  assert.equal(tableOccupied.json.data.table_status, 2)

  const tableResolvedAfter = await request('/api/mp/customer/tables/resolve?qr_token=table-a1')
  // resolve 会把已占用桌恢复为空闲，便于反复联调同一桌码
  assert.equal(tableResolvedAfter.json.data.table_status, 1)

  const channels = await request('/api/mp/customer/delivery/channels', { token: mpToken })
  assert.equal(channels.json.code, 0)
  assert.ok(channels.json.data.list.some((row) => row.enabled && row.ready))

  const deliveryAddr = await request('/api/mp/customer/addresses', {
    method: 'POST',
    token: mpToken,
    body: {
      contact_name: '配送测试',
      mobile: '13700137000',
      province: '上海市',
      city: '上海市',
      district: '徐汇区',
      address: '天钥桥路1号',
      tag: '家',
      is_default: 1,
    },
  })
  assert.equal(deliveryAddr.json.code, 0)
  const deliveryAddressId = deliveryAddr.json.data.address_id

  const quoteOk = await request('/api/mp/customer/delivery/quote', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      address_id: Number(deliveryAddressId),
      product_amount: 36,
    },
  })
  assert.equal(quoteOk.json.code, 0)
  assert.equal(quoteOk.json.data.in_range, true)
  assert.equal(quoteOk.json.data.meet_min_order, true)
  assert.ok(quoteOk.json.data.delivery_fee)

  const quoteFar = await request('/api/mp/customer/delivery/quote', {
    method: 'POST',
    token: mpToken,
    body: { store_id: 1, address_id: 999, product_amount: 36 },
  })
  assert.equal(quoteFar.json.code, 0)
  assert.equal(quoteFar.json.data.in_range, false)

  const deliveryCart = await request('/api/mp/customer/cart/items', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      product_id: 1,
      sku_id: 11,
      option_ids: [101],
      quantity: 2,
      service_mode: 3,
    },
  })
  assert.equal(deliveryCart.json.code, 0)

  const deliveryOrder = await request('/api/mp/customer/orders', {
    method: 'POST',
    token: mpToken,
    body: {
      store_id: 1,
      client_token: smokeClientToken('delivery'),
      service_mode: 3,
      from_cart: true,
      address_id: Number(deliveryAddressId),
    },
  })
  assert.equal(deliveryOrder.json.code, 0)
  assert.equal(deliveryOrder.json.data.service_mode, 3)
  const deliveryOrderId = deliveryOrder.json.data.order_id
  assert.ok(Number(deliveryOrder.json.data.delivery_fee) > 0 || Number(deliveryOrder.json.data.packing_fee) > 0)
  const deliveryPayable = Number(deliveryOrder.json.data.payable_amount)
  const deliveryGoods =
    Number(deliveryOrder.json.data.product_amount) + Number(deliveryOrder.json.data.option_amount)
  // payable 已扣会员折/券，需加回再和商品+运费+包装比
  const deliveryOff =
    Number(deliveryOrder.json.data.member_discount_amount || 0) +
    Number(deliveryOrder.json.data.discount_amount || 0)
  assert.ok(
    deliveryPayable + deliveryOff >=
      deliveryGoods +
        Number(deliveryOrder.json.data.delivery_fee) +
        Number(deliveryOrder.json.data.packing_fee) -
        0.01,
  )

  const dispatch = await request(`/api/mp/customer/delivery/orders/${deliveryOrderId}`, {
    token: mpToken,
  })
  assert.equal(dispatch.json.code, 0)
  assert.equal(dispatch.json.data.order_id, String(deliveryOrderId))
  assert.ok(Array.isArray(dispatch.json.data.traces))
  assert.ok(dispatch.json.data.traces.length >= 1)

  console.log('[smoke] 鉴权链路通过：health → 未登录 401 → wx-login → profile → logout → 失效 401')
  console.log(
    '[smoke] 已接入路径通过：mp/stores → menu → mp-login → me → profile/bind-phone → cart(+service_mode/PUT/DELETE/clear) → addresses CRUD → available/claim → mine detail → createOrder(核销) → redeem → order detail/cancel → pickup(2)/member(5) → prepay → mock-paid → orders → mall catalog/detail → tables resolve/occupy → delivery channels/quote/progress',
  )
  console.log(`[smoke] mock 默认端口 ${config.port}，本次探测端口 ${port}`)
} finally {
  server.close()
}
