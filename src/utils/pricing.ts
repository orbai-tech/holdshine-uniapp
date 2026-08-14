import type { CupSize } from '@/common/types/commerce'
import type { CartItem } from '@/common/types/commerce'
import type { MyCouponRes } from '@/common/types/coupon'
import { parseAmount } from '@/utils/money'

/** 无 API 规格时的本地兜底加价（FIELD-GAP-005） */
export const FALLBACK_SIZE_UP = 3
export const FALLBACK_EXTRA_EACH = 3

/** 金额分位对齐，避免浮点抖动 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calcLineUnit(
  skuSalePrice: string | number | null | undefined,
  options: Array<{ price_delta?: string | number | null }>,
): number {
  const unit = parseAmount(skuSalePrice)
  const optionSum = options.reduce((sum, item) => sum + parseAmount(item.price_delta), 0)
  return roundMoney(unit + optionSum)
}

export function calcLineAmount(unit: number, qty: number): number {
  return roundMoney(unit * Math.max(0, qty))
}

/** 无 skus/option_groups 时：大杯 +3、每项加料 +3 */
export function calcLocalFallbackUnit(
  basePrice: number,
  size: CupSize,
  extrasCount: number,
): number {
  const sizeUp = size === '大杯' ? FALLBACK_SIZE_UP : 0
  return roundMoney(basePrice + sizeUp + extrasCount * FALLBACK_EXTRA_EACH)
}

export function calcLocalCartLineAmount(item: CartItem): number {
  const unit = calcLocalFallbackUnit(item.product.price, item.size, item.extras.length)
  return calcLineAmount(unit, item.qty)
}

export interface CouponDiscountResult {
  usable: boolean
  unusable_reason: string | null
  discount: number
}

/** 满减试算；折扣率字段预留，暂按 threshold + discount_amount */
export function calcCouponDiscount(subtotal: number, coupon: MyCouponRes): CouponDiscountResult {
  const threshold = parseAmount(coupon.template?.threshold_amount ?? coupon.threshold_amount)
  const reduce = parseAmount(
    coupon.template?.discount_amount ?? coupon.reduce_amount ?? coupon.discount_amount,
  )
  if (subtotal + 1e-9 < threshold) {
    const gap = roundMoney(threshold - subtotal)
    return {
      usable: false,
      unusable_reason: `差 ¥${gap.toFixed(2)} 可用`,
      discount: 0,
    }
  }
  return {
    usable: true,
    unusable_reason: null,
    discount: roundMoney(Math.min(reduce, Math.max(0, subtotal))),
  }
}

export function evaluateCouponForSubtotal(coupon: MyCouponRes, subtotal: number): MyCouponRes {
  const result = calcCouponDiscount(subtotal, coupon)
  return {
    ...coupon,
    usable: result.usable,
    unusable_reason: result.unusable_reason,
    discount_amount: result.discount.toFixed(2),
  }
}

export function evaluateCouponsForSubtotal(coupons: MyCouponRes[], subtotal: number): MyCouponRes[] {
  return coupons.map((coupon) => evaluateCouponForSubtotal(coupon, subtotal))
}

export function calcPayable(subtotal: number, discount: number): number {
  return roundMoney(Math.max(0, subtotal - discount))
}

/** 前后端应付差额是否超过 1 分 */
export function amountsDiffer(a: number, b: number): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) > 0.009
}
