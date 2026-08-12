import { findProduct, findStore, money } from './fixtures.mjs'

const carts = new Map()
let nextItemId = 1

function cartKey(openid, storeId) {
  return `${openid}:${storeId}`
}

function emptyCart(storeId) {
  const store = findStore(storeId)
  return {
    cart_id: Number(storeId) || 1,
    store_id: Number(storeId),
    store_name: store?.store_name || '',
    table_id: null,
    table_status: null,
    can_append: true,
    service_mode: 1,
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

function summarize(storeId, items) {
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
    table_id: null,
    table_status: null,
    can_append: true,
    service_mode: 1,
    item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    product_amount: money(productAmount),
    option_amount: money(optionAmount),
    payable_amount: money(productAmount + optionAmount),
    items,
  }
}

export function getCart(openid, storeId) {
  return carts.get(cartKey(openid, storeId)) || emptyCart(storeId)
}

export function addCartItem(openid, body) {
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
  const key = cartKey(openid, storeId)
  const current = carts.get(key) || emptyCart(storeId)
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
    const unit = Number(sku.sale_price)
    items.push({
      item_id: nextItemId++,
      product_id: productId,
      sku_id: skuId,
      product_name: product.product_name,
      sku_name: sku.sku_name,
      quantity,
      unit_price: money(unit),
      option_amount: money(optionEach),
      line_amount: money((unit + optionEach) * quantity),
      options,
    })
  }
  const next = summarize(storeId, items)
  carts.set(key, next)
  return next
}

export function listOrders(_openid, page, pageSize) {
  return { list: [], total: 0, page, page_size: pageSize }
}
