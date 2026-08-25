import { money } from './fixtures.mjs'
import { memberGoodsSubtotal } from './pricing.mjs'

/**
 * 样例券对齐真契约主键 `customer_coupon_id` + template。
 * 内存态：核销后 status 变为 USED，避免重复用券。
 */
const SAMPLE_COUPONS = [
  {
    customer_coupon_id: '9001',
    coupon_no: 'CN9001',
    coupon_status: 1,
    coupon_status_label: '未使用',
    kind: 'full_reduction',
    display_label: '满减券',
    valid_start_at: null,
    valid_end_at: null,
    used_at: null,
    template: {
      coupon_template_id: '1',
      coupon_name: '满30减5',
      coupon_type: 1,
      discount_amount: '5.00',
      discount_rate: null,
      threshold_amount: '30.00',
    },
  },
  {
    customer_coupon_id: '9002',
    coupon_no: 'CN9002',
    coupon_status: 1,
    coupon_status_label: '未使用',
    kind: 'full_reduction',
    display_label: '满减券',
    valid_start_at: null,
    valid_end_at: null,
    used_at: null,
    template: {
      coupon_template_id: '2',
      coupon_name: '满60减12',
      coupon_type: 1,
      discount_amount: '12.00',
      discount_rate: null,
      threshold_amount: '60.00',
    },
  },
  {
    customer_coupon_id: '9003',
    coupon_no: 'CN9003',
    coupon_status: 1,
    coupon_status_label: '未使用',
    kind: 'full_reduction',
    display_label: '满减券',
    valid_start_at: null,
    valid_end_at: null,
    used_at: null,
    template: {
      coupon_template_id: '3',
      coupon_name: '满100减25',
      coupon_type: 1,
      discount_amount: '25.00',
      discount_rate: null,
      threshold_amount: '100.00',
    },
  },
]

/** 可领模板（对齐 CouponTemplateBriefRes）；与 SAMPLE template id 对齐 */
const CLAIMABLE_TEMPLATES = [
  {
    coupon_template_id: '1',
    coupon_code: 'FULL30OFF5',
    coupon_name: '满30减5',
    coupon_type: 1,
    discount_amount: '5.00',
    discount_rate: null,
    threshold_amount: '30.00',
    valid_type: 2,
    valid_start_at: null,
    valid_end_at: null,
    valid_days: 30,
    description: '门店饮品满减',
    claimed_count: 0,
  },
  {
    coupon_template_id: '2',
    coupon_code: 'FULL60OFF12',
    coupon_name: '满60减12',
    coupon_type: 1,
    discount_amount: '12.00',
    discount_rate: null,
    threshold_amount: '60.00',
    valid_type: 2,
    valid_start_at: null,
    valid_end_at: null,
    valid_days: 30,
    description: '适合一次轻饮或分席',
    claimed_count: 0,
  },
  {
    coupon_template_id: '4',
    coupon_code: 'WELCOME3',
    coupon_name: '品茗礼',
    coupon_type: 1,
    discount_amount: '3.00',
    discount_rate: null,
    threshold_amount: '10.00',
    valid_type: 2,
    valid_start_at: null,
    valid_end_at: null,
    valid_days: 14,
    description: '适合一次轻饮，或与友人分席',
    claimed_count: 0,
  },
]

let nextCustomerCouponId = 9100

/** 对齐契约：1未使用、2锁定、3已使用、4已过期、5已作废 */
const COUPON_STATUS_UNUSED = 1
const COUPON_STATUS_USED = 3
const COUPON_STATUS_EXPIRED = 4
const COUPON_STATUS_VOIDED = 5

/** 契约角标：all 全部 / claimable 待领取 / usable 待使用 / expired 已过期（已作废与已使用不计入角标） */
function computeCouponCounts(coupons) {
  let all = 0
  let claimable = 0
  let usable = 0
  let expired = 0
  for (const item of coupons) {
    if (item.coupon_status === COUPON_STATUS_VOIDED) continue
    all += 1
    if (item.coupon_status === COUPON_STATUS_UNUSED) usable += 1
    else if (item.coupon_status === COUPON_STATUS_EXPIRED) expired += 1
  }
  return {
    all,
    claimable,
    usable,
    expired,
  }
}

function cloneCoupon(coupon) {
  return {
    ...coupon,
    template: { ...coupon.template },
  }
}

function cloneBrief(tpl) {
  return { ...tpl }
}

function cartSubtotal(cart) {
  return Number(cart.product_amount || 0) + Number(cart.option_amount || 0)
}

function findCoupon(customerCouponId) {
  if (customerCouponId == null || customerCouponId === '') return null
  const id = String(customerCouponId)
  return SAMPLE_COUPONS.find((item) => item.customer_coupon_id === id) ?? null
}

function findTemplate(templateId) {
  const id = String(templateId)
  return CLAIMABLE_TEMPLATES.find((item) => item.coupon_template_id === id) ?? null
}

function hasUnusedOfTemplate(templateId) {
  const id = String(templateId)
  return SAMPLE_COUPONS.some(
    (item) =>
      String(item.template.coupon_template_id) === id &&
      item.coupon_status === COUPON_STATUS_UNUSED,
  )
}

function evaluateCoupon(coupon, subtotal) {
  const threshold = Number(coupon.template.threshold_amount)
  const reduce = Number(coupon.template.discount_amount)
  const base = {
    ...cloneCoupon(coupon),
    title: coupon.template.coupon_name,
    threshold_amount: coupon.template.threshold_amount,
    reduce_amount: coupon.template.discount_amount,
  }
  if (coupon.coupon_status !== COUPON_STATUS_UNUSED) {
    return {
      ...base,
      usable: false,
      unusable_reason: '优惠券已使用',
      discount_amount: money(0),
    }
  }
  if (subtotal + 1e-9 < threshold) {
    return {
      ...base,
      usable: false,
      unusable_reason: `差 ¥${money(threshold - subtotal)} 可用`,
      discount_amount: money(0),
    }
  }
  const discount = Math.min(reduce, subtotal)
  return {
    ...base,
    usable: true,
    unusable_reason: null,
    discount_amount: money(discount),
  }
}

/**
 * 我的优惠券。分页参数 tab（契约，coupon_status 已废弃）：
 * all 全部 / claimable 待领取 / usable 待使用 / expired 已过期。
 * 返回 counts 为全量统计（不受筛选影响）。
 */
export function listMyCoupons(tab) {
  const allowed = new Set(['all', 'claimable', 'usable', 'expired'])
  const filter =
    tab == null || tab === '' || !allowed.has(tab) ? 'all' : String(tab)
  const list = []
  for (const item of SAMPLE_COUPONS) {
    if (item.coupon_status === COUPON_STATUS_VOIDED) continue
    if (filter === 'all') {
      list.push(cloneCoupon(item))
      continue
    }
    if (filter === 'usable' && item.coupon_status === COUPON_STATUS_UNUSED) {
      list.push(cloneCoupon(item))
      continue
    }
    if (filter === 'expired' && item.coupon_status === COUPON_STATUS_EXPIRED) {
      list.push(cloneCoupon(item))
      continue
    }
  }
  return {
    list,
    counts: computeCouponCounts(SAMPLE_COUPONS),
  }
}

function toDetailTemplate(coupon) {
  const tplId = coupon.template.coupon_template_id
  const brief = findTemplate(tplId)
  if (brief) {
    return {
      ...cloneBrief(brief),
      can_claim: !hasUnusedOfTemplate(tplId),
    }
  }
  return {
    coupon_template_id: String(tplId),
    coupon_code: '',
    coupon_name: coupon.template.coupon_name,
    coupon_type: coupon.template.coupon_type,
    discount_amount: coupon.template.discount_amount,
    discount_rate: coupon.template.discount_rate,
    threshold_amount: coupon.template.threshold_amount,
    valid_type: 1,
    valid_start_at: coupon.valid_start_at,
    valid_end_at: coupon.valid_end_at,
    valid_days: null,
    description: null,
    claimed_count: 0,
    can_claim: false,
  }
}

/** GET /api/mp/customer/coupons/mine/{id} → MyCouponDetailRes */
export function getMyCouponDetail(customerCouponId) {
  const coupon = findCoupon(customerCouponId)
  if (!coupon) {
    throw Object.assign(new Error('优惠券不存在'), { code: 40400 })
  }
  return {
    customer_coupon_id: coupon.customer_coupon_id,
    coupon_no: coupon.coupon_no,
    coupon_status: coupon.coupon_status,
    coupon_status_label: coupon.coupon_status_label,
    valid_start_at: coupon.valid_start_at || '',
    valid_end_at: coupon.valid_end_at || '',
    used_at: coupon.used_at ?? null,
    template: toDetailTemplate(coupon),
    locked_order_id: null,
    used_order_id: null,
    void_reason: coupon.void_reason ?? null,
  }
}

/** GET /api/mp/customer/coupons/available?store_id?（可选，不传则不按门店过滤） */
export function listAvailableCoupons(storeId) {
  if (storeId != null && storeId !== '') {
    const id = String(storeId)
    if (!/^\d+$/.test(id) || id === '0') {
      throw Object.assign(new Error('store_id 无效'), { code: 40000 })
    }
  }
  return {
    list: CLAIMABLE_TEMPLATES.map((tpl) => ({
      ...cloneBrief(tpl),
      can_claim: !hasUnusedOfTemplate(tpl.coupon_template_id),
    })),
  }
}

/**
 * GET /api/mp/customer/coupons/usable
 * Query: store_id* service_mode? goods_amount*（原价；服务端先会员折再判券）
 */
export function listUsableCoupons({
  store_id: storeId,
  goods_amount: goodsAmount,
  service_mode: serviceMode,
  member_summary: memberSummary = null,
}) {
  const id = String(storeId ?? '')
  if (!/^\d+$/.test(id) || id === '0') {
    throw Object.assign(new Error('缺少 store_id'), { code: 40000 })
  }
  const amount = Number(goodsAmount)
  if (!Number.isFinite(amount) || amount < 0) {
    throw Object.assign(new Error('缺少 goods_amount'), { code: 40000 })
  }
  const mode = serviceMode == null || serviceMode === '' ? 1 : Number(serviceMode)
  const memberSubtotal = memberGoodsSubtotal(amount, mode, memberSummary)
  const list = []
  for (const item of SAMPLE_COUPONS) {
    if (item.coupon_status === COUPON_STATUS_VOIDED) continue
    let evaluated
    if (mode === 4) {
      evaluated = {
        ...evaluateCoupon(item, memberSubtotal),
        usable: false,
        unusable_reason: '礼品订单不支持优惠券',
        discount_amount: money(0),
      }
    } else {
      evaluated = evaluateCoupon(item, memberSubtotal)
    }
    list.push({
      customer_coupon_id: item.customer_coupon_id,
      coupon_no: item.coupon_no,
      coupon_status: item.coupon_status,
      coupon_status_label: item.coupon_status_label,
      valid_start_at: item.valid_start_at || '',
      valid_end_at: item.valid_end_at || '',
      used_at: item.used_at ?? null,
      template: toDetailTemplate(item),
      estimated_discount: evaluated.discount_amount,
      usable: evaluated.usable,
      unusable_reason: evaluated.unusable_reason,
    })
  }
  return { list, goods_amount: money(amount) }
}

/** POST /api/mp/customer/coupons/claim */
export function claimCoupon(body) {
  const templateId = String(body?.coupon_template_id ?? '')
  if (!/^\d+$/.test(templateId) || templateId === '0') {
    throw Object.assign(new Error('缺少 coupon_template_id'), { code: 40000 })
  }
  const tpl = findTemplate(templateId)
  if (!tpl) {
    throw Object.assign(new Error('优惠券模板不存在'), { code: 40000 })
  }
  if (hasUnusedOfTemplate(templateId)) {
    throw Object.assign(new Error('已领取过该券'), { code: 40000 })
  }
  tpl.claimed_count = Number(tpl.claimed_count || 0) + 1
  const customer_coupon_id = String(nextCustomerCouponId++)
  const row = {
    customer_coupon_id,
    coupon_no: `CN${customer_coupon_id}`,
    coupon_status: COUPON_STATUS_UNUSED,
    coupon_status_label: '未使用',
    valid_start_at: null,
    valid_end_at: null,
    used_at: null,
    template: {
      coupon_template_id: templateId,
      coupon_name: tpl.coupon_name,
      coupon_type: tpl.coupon_type,
      discount_amount: tpl.discount_amount,
      discount_rate: tpl.discount_rate,
      threshold_amount: tpl.threshold_amount,
    },
  }
  SAMPLE_COUPONS.push(row)
  return cloneCoupon(row)
}

/** @deprecated 契约已删；保留供旧脚本，入参支持 customer_coupon_id */
export function previewCheckout(cart, body) {
  const storeId = String(body.store_id ?? '')
  if (!/^\d+$/.test(storeId) || storeId === '0') {
    throw Object.assign(new Error('缺少 store_id'), { code: 40000 })
  }
  const subtotal = cartSubtotal(cart)
  const coupons = SAMPLE_COUPONS.map((coupon) => evaluateCoupon(coupon, subtotal))
  let customerCouponId =
    body.customer_coupon_id == null || body.customer_coupon_id === ''
      ? body.coupon_id == null || body.coupon_id === ''
        ? null
        : String(body.coupon_id)
      : String(body.customer_coupon_id)
  let discount = 0
  if (customerCouponId != null) {
    const selected = coupons.find((item) => item.customer_coupon_id === customerCouponId)
    if (!selected) {
      throw Object.assign(new Error('优惠券不存在'), { code: 40000 })
    }
    if (!selected.usable) {
      throw Object.assign(new Error(selected.unusable_reason || '优惠券不可用'), { code: 40000 })
    }
    discount = Number(selected.discount_amount)
  } else {
    customerCouponId = null
  }
  const payable = Math.max(0, subtotal - discount)
  return {
    store_id: storeId,
    item_count: cart.item_count,
    product_amount: money(Number(cart.product_amount || 0)),
    option_amount: money(Number(cart.option_amount || 0)),
    discount_amount: money(discount),
    payable_amount: money(payable),
    customer_coupon_id: customerCouponId,
    coupon_id: customerCouponId == null ? null : String(customerCouponId),
    coupons,
  }
}

/**
 * 预留核销：校验门槛并标记 USED。
 * createOrder 内也会调用，模拟「下单自动核销」。
 */
export function redeemCoupon(body, { subtotal = null, orderId = null } = {}) {
  const customerCouponId = body?.customer_coupon_id
  if (customerCouponId == null || customerCouponId === '') {
    throw Object.assign(new Error('缺少 customer_coupon_id'), { code: 40000 })
  }
  const coupon = findCoupon(customerCouponId)
  if (!coupon) {
    throw Object.assign(new Error('优惠券不存在'), { code: 40000 })
  }
  if (coupon.coupon_status !== COUPON_STATUS_UNUSED) {
    throw Object.assign(new Error('优惠券已使用'), { code: 40000 })
  }
  const amount = subtotal == null ? Number.POSITIVE_INFINITY : Number(subtotal)
  const evaluated = evaluateCoupon(coupon, amount)
  if (!evaluated.usable && subtotal != null) {
    throw Object.assign(new Error(evaluated.unusable_reason || '优惠券不可用'), { code: 40000 })
  }
  const discount =
    subtotal == null
      ? Number(coupon.template.discount_amount)
      : Number(evaluated.discount_amount)
  coupon.coupon_status = COUPON_STATUS_USED
  coupon.coupon_status_label = '已使用'
  coupon.used_at = new Date().toISOString().replace('T', ' ').slice(0, 19)
  return {
    status: 'success',
    customer_coupon_id: coupon.customer_coupon_id,
    discount_amount: money(discount),
    order_id: orderId,
    message: '核销成功',
  }
}

/** 下单用：按小计试算折扣；不立刻核销（由 redeem 标记） */
export function applyCouponDiscount(subtotal, customerCouponId) {
  if (customerCouponId == null || customerCouponId === '') {
    return { discount: 0, customer_coupon_id: null }
  }
  const coupon = findCoupon(customerCouponId)
  if (!coupon) {
    throw Object.assign(new Error('优惠券不存在'), { code: 40000 })
  }
  const evaluated = evaluateCoupon(coupon, subtotal)
  if (!evaluated.usable) {
    throw Object.assign(new Error(evaluated.unusable_reason || '优惠券不可用'), { code: 40000 })
  }
  return {
    discount: Number(evaluated.discount_amount),
    customer_coupon_id: coupon.customer_coupon_id,
  }
}
