import { money } from './fixtures.mjs'

/** 调试用样例券；真接口就绪后由后端发放，本文件可删或收窄为适配层 */
const SAMPLE_COUPONS = [
  {
    coupon_id: 9001,
    title: '满30减5',
    rule_type: 'threshold_reduce',
    threshold_amount: '30.00',
    reduce_amount: '5.00',
    status: 'UNUSED',
  },
  {
    coupon_id: 9002,
    title: '满60减12',
    rule_type: 'threshold_reduce',
    threshold_amount: '60.00',
    reduce_amount: '12.00',
    status: 'UNUSED',
  },
  {
    coupon_id: 9003,
    title: '满100减25',
    rule_type: 'threshold_reduce',
    threshold_amount: '100.00',
    reduce_amount: '25.00',
    status: 'UNUSED',
  },
]

function cartSubtotal(cart) {
  return Number(cart.product_amount || 0) + Number(cart.option_amount || 0)
}

function evaluateCoupon(coupon, subtotal) {
  const threshold = Number(coupon.threshold_amount)
  const reduce = Number(coupon.reduce_amount)
  if (subtotal + 1e-9 < threshold) {
    return {
      ...coupon,
      usable: false,
      unusable_reason: `差 ¥${money(threshold - subtotal)} 可用`,
      discount_amount: money(0),
    }
  }
  const discount = Math.min(reduce, subtotal)
  return {
    ...coupon,
    usable: true,
    unusable_reason: null,
    discount_amount: money(discount),
  }
}

export function listMyCoupons() {
  return SAMPLE_COUPONS.map((item) => ({ ...item }))
}

/** @param cart CartRes-like from getCart */
export function previewCheckout(cart, body) {
  const storeId = Number(body.store_id)
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw Object.assign(new Error('缺少 store_id'), { code: 40000 })
  }
  const subtotal = cartSubtotal(cart)
  const coupons = SAMPLE_COUPONS.map((coupon) => evaluateCoupon(coupon, subtotal))
  let couponId =
    body.coupon_id == null || body.coupon_id === '' ? null : Number(body.coupon_id)
  let discount = 0
  if (couponId != null) {
    const selected = coupons.find((item) => item.coupon_id === couponId)
    if (!selected) {
      throw Object.assign(new Error('优惠券不存在'), { code: 40000 })
    }
    if (!selected.usable) {
      throw Object.assign(new Error(selected.unusable_reason || '优惠券不可用'), { code: 40000 })
    }
    discount = Number(selected.discount_amount)
  } else {
    couponId = null
  }
  const payable = Math.max(0, subtotal - discount)
  return {
    store_id: storeId,
    item_count: cart.item_count,
    product_amount: money(Number(cart.product_amount || 0)),
    option_amount: money(Number(cart.option_amount || 0)),
    discount_amount: money(discount),
    payable_amount: money(payable),
    coupon_id: couponId,
    coupons,
  }
}

export function applyCouponDiscount(subtotal, couponId) {
  if (couponId == null || couponId === '') {
    return { discount: 0, coupon_id: null }
  }
  const id = Number(couponId)
  const coupon = SAMPLE_COUPONS.find((item) => item.coupon_id === id)
  if (!coupon) {
    throw Object.assign(new Error('优惠券不存在'), { code: 40000 })
  }
  const evaluated = evaluateCoupon(coupon, subtotal)
  if (!evaluated.usable) {
    throw Object.assign(new Error(evaluated.unusable_reason || '优惠券不可用'), { code: 40000 })
  }
  return { discount: Number(evaluated.discount_amount), coupon_id: id }
}
