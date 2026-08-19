import type { CupSize } from '@/common/types/commerce'
import type { CartItem } from '@/common/types/commerce'
import type { MyCouponRes } from '@/common/types/coupon'
import { parseAmount } from '@/utils/money'

/** 无 API 规格时的本地兜底加价（FIELD-GAP-005） */
export const FALLBACK_SIZE_UP = 3
export const FALLBACK_EXTRA_EACH = 3

/** 饮品 / 商城礼品：对应 summary 的 coffee_discount_rate / mall_discount_rate */
export type MemberGoodsKind = 'coffee' | 'mall'

/** 金额分位对齐，避免浮点抖动 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** 奶茶会员折后：四舍五入保留两位小数 */
export function roundCoffeeMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * 解析会员折扣率 → 实付倍率。
 * 支持 `0.90`（付 90%）与 `90`（九折）两种写法；无效则视为不打折。
 */
export function parseMemberRate(rate: string | number | null | undefined): number {
  if (rate == null || rate === '') return 1
  const n = typeof rate === 'number' ? rate : Number(rate)
  if (!Number.isFinite(n) || n <= 0) return 1
  if (n <= 1) return n
  if (n <= 100) return n / 100
  return 1
}

/** 商品原价 → 会员折（包装/运费不走此函数） */
export function applyMemberDiscount(
  amount: number,
  rate: string | number | null | undefined,
  kind: MemberGoodsKind,
): number {
  const base = Math.max(0, amount)
  if (base <= 0) return 0
  const mult = parseMemberRate(rate)
  if (mult >= 1) return roundMoney(base)
  const discounted = base * mult
  if (kind === 'coffee') return roundCoffeeMoney(discounted)
  return roundMoney(discounted)
}

export function memberSaveAmount(original: number, afterMember: number): number {
  return roundMoney(Math.max(0, original - afterMember))
}

export function formatMemberGoodsMoney(value: number, kind: MemberGoodsKind): string {
  if (kind === 'coffee') return roundCoffeeMoney(value).toFixed(2)
  return roundMoney(value).toFixed(2)
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

/** 满减试算（基于会员折后商品小计）；折扣率字段预留 */
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

/** usable 接口的可用性标记覆盖本地试算结果，折扣仍由本地计算。 */
export function mergeCouponUsableFlags(
  localEvaluated: MyCouponRes[],
  apiCoupons: MyCouponRes[],
): MyCouponRes[] {
  if (!apiCoupons.length) return localEvaluated
  const apiById = new Map(apiCoupons.map((item) => [item.customer_coupon_id, item]))
  return localEvaluated.map((item) => {
    const api = apiById.get(item.customer_coupon_id)
    if (!api) return item
    return {
      ...item,
      usable: api.usable,
      unusable_reason: api.unusable_reason ?? item.unusable_reason,
    }
  })
}

export function calcPayable(subtotal: number, discount: number): number {
  return roundMoney(Math.max(0, subtotal - discount))
}

/** 前后端应付差额是否超过 1 分 */
export function amountsDiffer(a: number, b: number): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) > 0.009
}
