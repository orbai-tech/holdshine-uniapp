import { findProduct, findStore, money } from './fixtures.mjs'
import { applyCouponDiscount, redeemCoupon } from './coupons.mjs'
import { quoteDelivery, rememberTakeawayDispatch } from './delivery.mjs'

const carts = new Map()
const ordersByOpenid = new Map()
/** 幂等：openid + client_token → 已创建订单 */
const idempotentOrders = new Map()
let nextItemId = 1
let nextOrderId = 1000

/** 由 member.mjs 注册，避免与 createMemberCardOrder 循环依赖 */
let memberSummaryProvider = null

export function registerMemberSummaryProvider(fn) {
  memberSummaryProvider = typeof fn === 'function' ? fn : null
}

/** 与前端 pricing.parseMemberRate / applyMemberDiscount 对齐 */
function parseMemberRate(rate) {
  if (rate == null || rate === '') return 1
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return 1
  if (n <= 1) return n
  if (n <= 100) return n / 100
  return 1
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function roundCoffeeMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10
}

function applyMemberDiscount(amount, rate, kind) {
  const base = Math.max(0, Number(amount) || 0)
  if (base <= 0) return 0
  const mult = parseMemberRate(rate)
  if (mult >= 1) return roundMoney(base)
  const discounted = base * mult
  return kind === 'coffee' ? roundCoffeeMoney(discounted) : roundMoney(discounted)
}

/** 1堂食 2自提 3外卖 4礼品 5会员月卡 */
const VALID_SERVICE_MODES = new Set([1, 2, 3, 4, 5])

function normalizeServiceMode(value, fallback = 1) {
  if (value == null || value === '') return fallback
  const mode = Number(value)
  if (!VALID_SERVICE_MODES.has(mode)) {
    throw Object.assign(new Error('service_mode 无效'), { code: 40000 })
  }
  return mode
}

function cartKey(openid, storeId, serviceMode = 1) {
  return `${openid}:${storeId}:${serviceMode}`
}

function emptyCart(storeId, serviceMode = 1) {
  const store = findStore(storeId)
  return {
    cart_id: Number(storeId) || 1,
    store_id: Number(storeId),
    store_name: store?.store_name || '',
    table_id: null,
    table_status: null,
    can_append: true,
    service_mode: serviceMode,
    item_count: 0,
    product_amount: money(0),
    option_amount: money(0),
    payable_amount: money(0),
    items: [],
  }
}

function optionLookup(product) {
  const map = new Map()
  for (const group of product.option_groups ?? []) {
    for (const value of group.values ?? []) {
      map.set(value.option_id, {
        ...value,
        group_name: group.group_name || '',
      })
    }
  }
  return map
}

function summarize(storeId, items, serviceMode = 1, tableId = null) {
  const store = findStore(storeId)
  let productAmount = 0
  let optionAmount = 0
  for (const item of items) {
    const unit = Number(item.unit_price)
    const option = Number(item.option_amount)
    productAmount += unit * item.quantity
    optionAmount += option * item.quantity
  }
  return {
    cart_id: Number(storeId) || 1,
    store_id: Number(storeId),
    store_name: store?.store_name || '',
    table_id: tableId,
    table_status: null,
    can_append: true,
    service_mode: serviceMode,
    item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    product_amount: money(productAmount),
    option_amount: money(optionAmount),
    payable_amount: money(productAmount + optionAmount),
    items,
  }
}

function userOrders(openid) {
  if (!ordersByOpenid.has(openid)) ordersByOpenid.set(openid, [])
  return ordersByOpenid.get(openid)
}

function findUserOrder(openid, orderId) {
  const id = Number(orderId)
  return userOrders(openid).find((order) => Number(order.order_id) === id)
}

export function getCart(openid, storeId, serviceMode = 1) {
  const mode = normalizeServiceMode(serviceMode, 1)
  return carts.get(cartKey(openid, storeId, mode)) || emptyCart(storeId, mode)
}

/** 有商品的购物车总览：堂食 / 外卖 / 商城，各自按门店一条。 */
export function getCartOverview(openid) {
  const dine_in = []
  const takeaway = []
  const mall = []
  const prefix = `${openid}:`
  for (const [key, cart] of carts.entries()) {
    if (!key.startsWith(prefix)) continue
    if (!cart || !cart.item_count) continue
    const mode = Number(cart.service_mode)
    if (mode === 1) dine_in.push(cart)
    else if (mode === 3) takeaway.push(cart)
    else if (mode === 4) mall.push(cart)
  }
  return { dine_in, takeaway, mall }
}

/** 规格询价：与加购同价规则，不写入购物车 */
export function quoteLine(body) {
  const storeId = Number(body.store_id)
  const productId = Number(body.product_id)
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw Object.assign(new Error('缺少 store_id'), { code: 40000 })
  }
  if (!findStore(storeId)) {
    throw Object.assign(new Error('门店不存在'), { code: 40000 })
  }
  if (!Number.isInteger(productId) || productId <= 0) {
    throw Object.assign(new Error('缺少 product_id'), { code: 40000 })
  }
  const product = findProduct(productId)
  if (!product) {
    throw Object.assign(new Error('商品不存在'), { code: 40000 })
  }
  if (!product.skus?.length) {
    throw Object.assign(new Error('商品无规格'), { code: 40000 })
  }
  const skuId = body.sku_id == null || body.sku_id === '' ? product.skus[0].sku_id : Number(body.sku_id)
  const sku = product.skus.find((item) => item.sku_id === skuId)
  if (!sku) {
    throw Object.assign(new Error('规格不存在'), { code: 40000 })
  }
  const quantity = Number(body.quantity ?? 1)
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw Object.assign(new Error('数量无效'), { code: 40000 })
  }
  const optionIds = Array.isArray(body.option_ids) ? body.option_ids.map(Number) : []
  const optionsMap = optionLookup(product)
  const options = []
  let optionEach = 0
  for (const optionId of optionIds) {
    const option = optionsMap.get(optionId)
    if (!option) {
      throw Object.assign(new Error('加料不存在'), { code: 40000 })
    }
    options.push({
      option_id: option.option_id,
      group_name: option.group_name || '',
      option_name: option.option_name,
      price_delta: money(option.price_delta),
    })
    optionEach += Number(option.price_delta)
  }
  const unit = Number(sku.sale_price)
  return {
    product_id: productId,
    sku_id: skuId,
    sku_name: sku.sku_name,
    quantity,
    unit_price: money(unit),
    option_amount: money(optionEach),
    line_amount: money((unit + optionEach) * quantity),
    options,
  }
}

export function addCartItem(openid, body) {
  const quoted = quoteLine(body)
  const storeId = Number(body.store_id)
  const productId = quoted.product_id
  const skuId = quoted.sku_id
  const quantity = quoted.quantity
  const options = quoted.options
  const optionEach = Number(quoted.option_amount)
  const unit = Number(quoted.unit_price)
  const product = findProduct(productId)
  const serviceMode = normalizeServiceMode(body.service_mode, 1)
  const key = cartKey(openid, storeId, serviceMode)
  const current = carts.get(key) || emptyCart(storeId, serviceMode)
  const tableId = body.table_id == null || body.table_id === '' ? current.table_id : Number(body.table_id)
  const items = [...current.items]
  const same = items.find(
    (item) =>
      item.product_id === productId &&
      item.sku_id === skuId &&
      JSON.stringify(item.options ?? []) === JSON.stringify(options),
  )
  if (same) {
    same.quantity += quantity
    same.line_amount = money((Number(same.unit_price) + Number(same.option_amount)) * same.quantity)
  } else {
    items.push({
      item_id: nextItemId++,
      product_id: productId,
      sku_id: skuId,
      product_name: product.product_name,
      sku_name: quoted.sku_name,
      quantity,
      unit_price: money(unit),
      option_amount: money(optionEach),
      line_amount: money((unit + optionEach) * quantity),
      options,
    })
  }
  const next = summarize(storeId, items, serviceMode, tableId)
  carts.set(key, next)
  return next
}

export function updateCartItem(openid, itemId, body) {
  const id = Number(itemId)
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error('缺少 item_id'), { code: 40000 })
  }
  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw Object.assign(new Error('数量无效'), { code: 40000 })
  }
  for (const [key, cart] of carts.entries()) {
    if (!key.startsWith(`${openid}:`)) continue
    const index = cart.items.findIndex((item) => item.item_id === id)
    if (index < 0) continue
    const items = [...cart.items]
    const current = { ...items[index], quantity }
    current.line_amount = money((Number(current.unit_price) + Number(current.option_amount)) * quantity)
    items[index] = current
    const next = summarize(cart.store_id, items, cart.service_mode, cart.table_id)
    carts.set(key, next)
    return next
  }
  throw Object.assign(new Error('购物车商品不存在'), { code: 40000 })
}

export function removeCartItem(openid, itemId) {
  const id = Number(itemId)
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error('缺少 item_id'), { code: 40000 })
  }
  for (const [key, cart] of carts.entries()) {
    if (!key.startsWith(`${openid}:`)) continue
    const index = cart.items.findIndex((item) => item.item_id === id)
    if (index < 0) continue
    const items = cart.items.filter((item) => item.item_id !== id)
    const next = summarize(cart.store_id, items, cart.service_mode, cart.table_id)
    carts.set(key, next)
    return next
  }
  throw Object.assign(new Error('购物车商品不存在'), { code: 40000 })
}

export function clearCart(openid, body) {
  const storeId = Number(body.store_id)
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw Object.assign(new Error('缺少 store_id'), { code: 40000 })
  }
  const serviceMode = normalizeServiceMode(body.service_mode, 1)
  const key = cartKey(openid, storeId, serviceMode)
  carts.set(key, emptyCart(storeId, serviceMode))
  return null
}

export function createOrderFromCart(openid, body) {
  const clientToken = body?.client_token
  if (
    clientToken == null ||
    typeof clientToken !== 'string' ||
    clientToken.length < 8 ||
    clientToken.length > 64
  ) {
    throw Object.assign(new Error('client_token 无效'), { code: 40000 })
  }
  const idemKey = `${openid}:${clientToken}`
  const existing = idempotentOrders.get(idemKey)
  if (existing) return existing

  const storeId = Number(body.store_id)
  const serviceMode = normalizeServiceMode(body.service_mode)
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw Object.assign(new Error('缺少 store_id'), { code: 40000 })
  }
  if (body.from_cart !== true) {
    throw Object.assign(new Error('仅支持 from_cart 下单'), { code: 40000 })
  }
  if (!findStore(storeId)) {
    throw Object.assign(new Error('门店不存在'), { code: 40000 })
  }
  const key = cartKey(openid, storeId, serviceMode)
  const cart = carts.get(key)
  if (!cart || !cart.items?.length) {
    throw Object.assign(new Error('购物车为空'), { code: 40000 })
  }
  const tableId =
    body.table_id == null || body.table_id === ''
      ? null
      : Number(body.table_id)
  if (tableId != null && !Number.isInteger(tableId)) {
    throw Object.assign(new Error('table_id 无效'), { code: 40000 })
  }
  let addressId = null
  if (serviceMode === 3) {
    if (body.address_id == null || body.address_id === '') {
      throw Object.assign(new Error('外卖须传 address_id'), { code: 40000 })
    }
    addressId = Number(body.address_id)
    if (!Number.isInteger(addressId) || addressId <= 0) {
      throw Object.assign(new Error('address_id 无效'), { code: 40000 })
    }
  }
  const orderId = nextOrderId++
  const orderItems = cart.items.map((item) => ({
    item_id: String(item.item_id),
    product_id: String(item.product_id),
    sku_id: item.sku_id == null ? null : String(item.sku_id),
    product_name: item.product_name,
    sku_name: item.sku_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    option_amount: item.option_amount,
    paid_amount: money(0),
    options: (item.options ?? []).map((opt) => ({
      group_name: opt.group_name || '',
      option_name: opt.option_name || '',
      price_delta: opt.price_delta != null ? money(opt.price_delta) : money(0),
    })),
  }))
  const subtotal = Number(cart.product_amount) + Number(cart.option_amount)
  // 原价 → 会员折 → 券 → +包装/配送；包装与运费不折
  let memberGoods = subtotal
  let memberDiscountAmount = 0
  try {
    const summary = memberSummaryProvider ? memberSummaryProvider(openid) : null
    if (summary?.is_active) {
      const kind = serviceMode === 4 ? 'mall' : 'coffee'
      const rate =
        kind === 'mall' ? summary.mall_discount_rate : summary.coffee_discount_rate
      memberGoods = applyMemberDiscount(subtotal, rate, kind)
      memberDiscountAmount = roundMoney(Math.max(0, subtotal - memberGoods))
    }
  } catch {
    memberGoods = subtotal
    memberDiscountAmount = 0
  }

  const couponKey =
    body.customer_coupon_id == null || body.customer_coupon_id === ''
      ? body.coupon_id == null || body.coupon_id === ''
        ? null
        : String(body.coupon_id)
      : String(body.customer_coupon_id)
  const { discount, customer_coupon_id: appliedCouponId } = applyCouponDiscount(
    memberGoods,
    couponKey,
  )
  if (appliedCouponId != null) {
    redeemCoupon(
      { customer_coupon_id: appliedCouponId, store_id: storeId, order_id: orderId },
      { subtotal: memberGoods, orderId },
    )
  }

  let packingFee = 0
  let deliveryFee = 0
  let deliveryQuote = null
  if (serviceMode === 3) {
    deliveryQuote = quoteDelivery({
      store_id: storeId,
      address_id: addressId,
      product_amount: memberGoods,
    })
    if (!deliveryQuote.in_range || !deliveryQuote.meet_min_order) {
      throw Object.assign(new Error(deliveryQuote.message || '暂不可配送'), { code: 40000 })
    }
    packingFee = Number(deliveryQuote.packing_fee) || 0
    deliveryFee = Number(deliveryQuote.delivery_fee) || 0
  }

  const payable = Math.max(0, memberGoods - discount + packingFee + deliveryFee)
  const order = {
    order_id: String(orderId),
    order_no: `SR${String(orderId).padStart(8, '0')}`,
    store_id: String(storeId),
    store_name: cart.store_name,
    table_id: tableId == null ? null : String(tableId),
    table_name: tableId == null ? null : `桌${tableId}`,
    service_mode: serviceMode,
    order_status: 1,
    product_amount: cart.product_amount,
    option_amount: cart.option_amount,
    packing_fee: money(packingFee),
    delivery_fee: money(deliveryFee),
    discount_amount: money(discount),
    coupon_amount: money(discount),
    member_discount_amount: money(memberDiscountAmount),
    customer_coupon_id: appliedCouponId,
    coupon_id: appliedCouponId == null ? null : Number(appliedCouponId),
    payable_amount: money(payable),
    paid_amount: money(0),
    pickup_code: null,
    customer_remark: body.customer_remark == null ? null : String(body.customer_remark),
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    appended: false,
    delivery:
      serviceMode === 3
        ? {
            contact_name: '收货人',
            contact_mobile: '13800000000',
            full_address: `地址#${addressId}`,
            delivery_status: 1,
            delivery_provider: deliveryQuote?.provider || 'mock',
            distance_km:
              deliveryQuote?.distance_km == null ? null : money(deliveryQuote.distance_km),
            delivery_fee: money(deliveryFee),
            remark: deliveryQuote?.message || null,
            courier_name: null,
            tracking_no: null,
            shipped_at: null,
            received_at: null,
          }
        : null,
    can_restock: false,
    stock_restored: false,
    items: orderItems,
  }
  userOrders(openid).unshift(order)
  rememberTakeawayDispatch(order)
  carts.set(key, emptyCart(storeId, serviceMode))
  idempotentOrders.set(idemKey, order)
  return order
}

export function listOrders(openid, page, pageSize, filters = {}) {
  let all = userOrders(openid)
  const status = filters.status == null || filters.status === '' ? null : Number(filters.status)
  if (Number.isInteger(status)) {
    all = all.filter((order) => order.order_status === status)
  }
  const mode =
    filters.service_mode == null || filters.service_mode === ''
      ? null
      : Number(filters.service_mode)
  if (Number.isInteger(mode)) {
    all = all.filter((order) => order.service_mode === mode)
  }
  const start = (page - 1) * pageSize
  return {
    list: all.slice(start, start + pageSize),
    total: all.length,
    page,
    page_size: pageSize,
  }
}

export function getOrder(openid, orderId) {
  const order = findUserOrder(openid, orderId)
  if (!order) {
    throw Object.assign(new Error('订单不存在'), { code: 40000 })
  }
  return order
}

/** 仅待支付（order_status=1）可取消；成功后 status=6 */
export function cancelOrder(openid, orderId) {
  const order = findUserOrder(openid, orderId)
  if (!order) {
    throw Object.assign(new Error('订单不存在'), { code: 40000 })
  }
  if (order.order_status !== 1) {
    throw Object.assign(new Error('当前状态不可取消'), { code: 40000 })
  }
  order.order_status = 6
  return order
}

/** 会员月卡：创建待支付单，供 subscribe → prepay → mock-paid */
export function createMemberCardOrder(openid, { payable_amount, title } = {}) {
  const amount = money(payable_amount == null ? 0 : payable_amount)
  const orderId = nextOrderId++
  const name = title ? String(title) : '会员月卡'
  const order = {
    order_id: String(orderId),
    order_no: `SR${String(orderId).padStart(8, '0')}`,
    store_id: '1',
    store_name: '会员中心',
    table_id: null,
    table_name: null,
    service_mode: 5,
    order_status: 1,
    product_amount: amount,
    option_amount: money(0),
    packing_fee: money(0),
    delivery_fee: money(0),
    discount_amount: money(0),
    coupon_amount: money(0),
    member_discount_amount: money(0),
    customer_coupon_id: null,
    coupon_id: null,
    payable_amount: amount,
    paid_amount: money(0),
    pickup_code: null,
    customer_remark: null,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    appended: false,
    delivery: null,
    can_restock: false,
    stock_restored: false,
    items: [
      {
        item_id: String(nextItemId++),
        product_id: '0',
        sku_id: null,
        product_name: name,
        sku_name: null,
        quantity: 1,
        unit_price: amount,
        option_amount: money(0),
        paid_amount: money(0),
        options: [],
      },
    ],
  }
  userOrders(openid).unshift(order)
  return order
}

export function prepay(openid, orderId) {
  const order = findUserOrder(openid, orderId)
  if (!order) {
    throw Object.assign(new Error('订单不存在'), { code: 40000 })
  }
  if (order.order_status !== 1) {
    throw Object.assign(new Error('订单状态不可支付'), { code: 40000 })
  }
  return {
    mock: true,
    timeStamp: String(Math.floor(Date.now() / 1000)),
    nonceStr: `mock_${order.order_id}`,
    package: `prepay_id=mock_${order.order_id}`,
    signType: 'RSA',
    paySign: 'MOCK_SIGN',
  }
}

export function mockPaid(openid, orderId) {
  const order = findUserOrder(openid, orderId)
  if (!order) {
    throw Object.assign(new Error('订单不存在'), { code: 40000 })
  }
  if (order.order_status !== 1) {
    throw Object.assign(new Error('订单已支付或不可支付'), { code: 40000 })
  }
  order.order_status = 3
  order.paid_amount = order.payable_amount
  order.pickup_code = String(1000 + (Number(order.order_id) % 9000))
  for (const item of order.items ?? []) {
    item.paid_amount = money(
      (Number(item.unit_price) + Number(item.option_amount)) * item.quantity,
    )
  }
  return null
}
