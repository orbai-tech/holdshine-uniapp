import { findProduct, findStore, money } from './fixtures.mjs'
import { applyCouponDiscount } from './coupons.mjs'

const carts = new Map()
const ordersByOpenid = new Map()
let nextItemId = 1
let nextOrderId = 1000

function cartKey(openid, storeId) {
  return `${openid}:${storeId}`
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
      map.set(value.option_id, value)
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
  return userOrders(openid).find((order) => order.order_id === Number(orderId))
}

export function getCart(openid, storeId) {
  return carts.get(cartKey(openid, storeId)) || emptyCart(storeId)
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
    options.push({ option_id: option.option_id, option_name: option.option_name })
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
  const key = cartKey(openid, storeId)
  const current = carts.get(key) || emptyCart(storeId)
  const serviceMode =
    body.service_mode != null && body.service_mode !== ''
      ? Number(body.service_mode)
      : current.service_mode
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

export function createOrderFromCart(openid, body) {
  const storeId = Number(body.store_id)
  const serviceMode = Number(body.service_mode)
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw Object.assign(new Error('缺少 store_id'), { code: 40000 })
  }
  if (![1, 2, 3].includes(serviceMode)) {
    throw Object.assign(new Error('service_mode 无效'), { code: 40000 })
  }
  if (body.from_cart !== true) {
    throw Object.assign(new Error('仅支持 from_cart 下单'), { code: 40000 })
  }
  if (!findStore(storeId)) {
    throw Object.assign(new Error('门店不存在'), { code: 40000 })
  }
  const key = cartKey(openid, storeId)
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
  const orderId = nextOrderId++
  const orderItems = cart.items.map((item) => ({
    item_id: item.item_id,
    product_id: item.product_id,
    sku_id: item.sku_id,
    product_name: item.product_name,
    sku_name: item.sku_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    option_amount: item.option_amount,
    paid_amount: money(0),
    options: item.options ?? [],
  }))
  const subtotal = Number(cart.product_amount) + Number(cart.option_amount)
  const { discount, coupon_id: appliedCouponId } = applyCouponDiscount(subtotal, body.coupon_id)
  const payable = Math.max(0, subtotal - discount)
  const order = {
    order_id: orderId,
    order_no: `SR${String(orderId).padStart(8, '0')}`,
    store_id: storeId,
    store_name: cart.store_name,
    table_id: tableId,
    table_name: tableId == null ? null : `桌${tableId}`,
    service_mode: serviceMode,
    order_status: 0,
    product_amount: cart.product_amount,
    option_amount: cart.option_amount,
    packing_fee: money(0),
    delivery_fee: money(0),
    discount_amount: money(discount),
    coupon_id: appliedCouponId,
    payable_amount: money(payable),
    paid_amount: money(0),
    pickup_code: null,
    customer_remark: body.customer_remark == null ? null : String(body.customer_remark),
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    appended: false,
    items: orderItems,
  }
  userOrders(openid).unshift(order)
  carts.set(key, emptyCart(storeId, serviceMode))
  return order
}

export function listOrders(openid, page, pageSize) {
  const all = userOrders(openid)
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

export function prepay(openid, orderId) {
  const order = findUserOrder(openid, orderId)
  if (!order) {
    throw Object.assign(new Error('订单不存在'), { code: 40000 })
  }
  if (order.order_status !== 0) {
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
  if (order.order_status !== 0) {
    throw Object.assign(new Error('订单已支付或不可支付'), { code: 40000 })
  }
  order.order_status = 1
  order.paid_amount = order.payable_amount
  order.pickup_code = String(1000 + (order.order_id % 9000))
  for (const item of order.items ?? []) {
    item.paid_amount = money(
      (Number(item.unit_price) + Number(item.option_amount)) * item.quantity,
    )
  }
  return null
}
