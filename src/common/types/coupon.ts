/** 优惠券 / 结账预览 DTO。mock 调试契约；真接口替换见 couponApi.ts */

export interface MyCouponRes {
  coupon_id: number
  title: string
  rule_type: string
  threshold_amount: string
  reduce_amount: string
  status: string
  usable?: boolean
  unusable_reason?: string | null
  discount_amount?: string
}

export interface CheckoutPreviewReq {
  store_id: number
  /** 不传或 null = 不使用优惠券 */
  coupon_id?: number | null
}

export interface CheckoutPreviewRes {
  store_id: number
  item_count: number
  product_amount: string
  option_amount: string
  discount_amount: string
  payable_amount: string
  coupon_id: number | null
  coupons?: MyCouponRes[]
}
