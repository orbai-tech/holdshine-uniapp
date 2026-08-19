/**
 * 外卖配送 mock：channels / quote / takeaway progress。
 * 确认单已隐藏渠道选择；产品默认微信即时配送，当前联调询价仍返回 mock provider。
 */

function money(n) {
  return Number(n).toFixed(2)
}

const CHANNELS = [
  { code: 'mock', name: '模拟配送', enabled: true, ready: true },
  { code: 'wechat', name: '微信即时配送', enabled: true, ready: true },
  { code: 'offline', name: '线下自配', enabled: false, ready: false },
]

/** order_id → 简易进度缓存（下单后可写入） */
const dispatchByOrder = new Map()

function requireInt(value, label) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw Object.assign(new Error(`${label}无效`), { code: 40000 })
  }
  return n
}

/** GET /api/mp/customer/delivery/channels */
export function listDeliveryChannels() {
  return { list: CHANNELS.map((row) => ({ ...row })) }
}

/**
 * POST /api/mp/customer/delivery/quote
 * 规则：product_amount < 20 → 不满足起送；address_id === 999 → 超距。
 */
export function quoteDelivery(body) {
  const storeId = requireInt(body?.store_id, 'store_id')
  const addressId = requireInt(body?.address_id, 'address_id')
  const productAmount = Number(body?.product_amount ?? 0)
  const amount = Number.isFinite(productAmount) ? productAmount : 0

  if (addressId === 999) {
    return {
      provider: 'mock',
      in_range: false,
      meet_min_order: amount >= 20,
      distance_km: 12.5,
      packing_fee: money(1),
      delivery_fee: money(0),
      min_order_amount: money(20),
      free_delivery_amount: money(50),
      message: '超出配送范围',
    }
  }

  const meetMin = amount >= 20
  const free = amount >= 50
  const deliveryFee = free ? 0 : 6
  return {
    provider: 'mock',
    in_range: true,
    meet_min_order: meetMin,
    distance_km: 2.4,
    packing_fee: money(1),
    delivery_fee: money(deliveryFee),
    min_order_amount: money(20),
    free_delivery_amount: money(50),
    message: meetMin ? (free ? '已满免配' : '预计 35 分钟送达') : '未满起送 ¥20',
    store_id: storeId,
  }
}

function buildDefaultDispatch(orderId, orderNo) {
  const now = Date.now()
  const fmt = (ms) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19)
  return {
    order_id: String(orderId),
    order_no: orderNo || `SR${String(orderId).padStart(8, '0')}`,
    provider: 'mock',
    delivery_id: `DL${orderId}`,
    courier_name: '张骑手',
    waybill_id: `WB${orderId}`,
    delivery_status: 2,
    remark: '骑手正在配送',
    agent_name: null,
    agent_phone: '13800001111',
    traces: [
      {
        action_time: fmt(now - 20 * 60_000),
        action_type: 1,
        action_msg: '商家已接单',
      },
      {
        action_time: fmt(now - 10 * 60_000),
        action_type: 2,
        action_msg: '骑手已取餐',
      },
      {
        action_time: fmt(now - 2 * 60_000),
        action_type: 3,
        action_msg: '骑手配送中',
      },
    ],
  }
}

/** 下单后可选登记，便于进度查询 */
export function rememberTakeawayDispatch(order) {
  if (!order || Number(order.service_mode) !== 3) return
  const id = String(order.order_id)
  dispatchByOrder.set(id, buildDefaultDispatch(id, order.order_no))
}

/** GET /api/mp/customer/delivery/orders/{order_id} */
export function getTakeawayDispatch(orderId) {
  const id = requireInt(orderId, 'order_id')
  const key = String(id)
  if (dispatchByOrder.has(key)) {
    return { ...dispatchByOrder.get(key), traces: [...(dispatchByOrder.get(key).traces || [])] }
  }
  // 无登记也返回可读进度，便于 smoke / 详情页
  return buildDefaultDispatch(key)
}
