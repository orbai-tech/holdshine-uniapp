import { money } from './fixtures.mjs'

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
    valid_start_at: null,
    valid_end_at: null,
    used_at: null,
    template: {
      coupon_template_id: 1,
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
    valid_start_at: null,
    valid_end_at: null,
    used_at: null,
    template: {
      coupon_template_id: 2,
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
    valid_start_at: null,
    valid_end_at: null,
    used_at: null,
    template: {
      coupon_template_id: 3,
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

const COUPON_STATUS_UNUSED = 1
const COUPON_STATUS_USED = 2

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
  const id = Number(templateId)
  return SAMPLE_COUPONS.some(
    (item) =>
      Number(item.template.coupon_template_id) === id &&
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

export function listMyCoupons() {
  return {
    list: SAMPLE_COUPONS.filter((item) => item.coupon_status === COUPON_STATUS_UNUSED).map(
      cloneCoupon,
    ),
  }
}

/** GET /api/mp/coupons/available?store_id* */
export function listAvailableCoupons(storeId) {
  const id = Number(storeId)
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error('缺少 store_id'), { code: 40000 })
  }
  return {
    list: CLAIMABLE_TEMPLATES.map((tpl) => ({
      ...cloneBrief(tpl),
      can_claim: !hasUnusedOfTemplate(tpl.coupon_template_id),
    })),
  }
}

/** POST /api/mp/coupons/claim */
export function claimCoupon(body) {
  const templateId = Number(body?.coupon_template_id)
  if (!Number.isInteger(templateId) || templateId <= 0) {
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
  const storeId = Number(body.store_id)
  if (!Number.isInteger(storeId) || storeId <= 0) {
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
    coupon_id: customerCouponId == null ? null : Number(customerCouponId),
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
