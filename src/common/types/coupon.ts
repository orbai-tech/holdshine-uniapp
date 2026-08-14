/**
 * 优惠券 DTO。
 * 对齐真契约主键 `customer_coupon_id` + `template`；结账折扣由前端本地试算。
 * mock / 真后端映射见 couponApi.ts。
 */

/** 可领模板 Brief（`GET /coupons/available`） */
export interface CouponTemplateBriefRes {
  coupon_template_id: string
  coupon_code: string
  coupon_name: string
  /** 1满减、2折扣、3兑换、4指定商品 */
  coupon_type: number
  discount_amount?: string | null
  discount_rate?: string | null
  threshold_amount?: string
  /** 1固定日期、2领取后N天 */
  valid_type: number
  valid_start_at?: string | null
  valid_end_at?: string | null
  valid_days?: number | null
  description?: string | null
  claimed_count?: number
  can_claim?: boolean
}

export interface CouponTemplateListRes {
  list: CouponTemplateBriefRes[]
}

export interface CouponClaimReq {
  coupon_template_id: number
  store_id?: number | null
}

/** 嵌套在 MyCouponRes.template；字段子集，兼容 Brief */
export interface CouponTemplateRes {
  coupon_template_id?: number | string
  coupon_name?: string
  coupon_type?: number | string
  /** 满减金额 */
  discount_amount?: string | null
  /** 折扣率（预留） */
  discount_rate?: string | null
  threshold_amount?: string
}

export interface MyCouponRes {
  customer_coupon_id: string
  coupon_no?: string
  coupon_status?: number
  coupon_status_label?: string
  valid_start_at?: string | null
  valid_end_at?: string | null
  used_at?: string | null
  template?: CouponTemplateRes
  /** 兼容旧 mock 扁平字段 */
  title?: string
  rule_type?: string
  threshold_amount?: string
  reduce_amount?: string
  status?: string
  /** 前端按当前小计试算后的可用性 */
  usable?: boolean
  unusable_reason?: string | null
  /** 前端试算可减免金额 */
  discount_amount?: string
}

export interface MyCouponListRes {
  list: MyCouponRes[]
}

/** @deprecated 契约已删；保留类型以免旧脚本报错 */
export interface CheckoutPreviewReq {
  store_id: number
  customer_coupon_id?: string | null
  /** @deprecated 使用 customer_coupon_id */
  coupon_id?: number | null
}

/** @deprecated 契约已删 */
export interface CheckoutPreviewRes {
  store_id: number
  item_count: number
  product_amount: string
  option_amount: string
  discount_amount: string
  payable_amount: string
  customer_coupon_id?: string | null
  coupon_id?: number | null
  coupons?: MyCouponRes[]
}

/** 预留：顾客端核销（正式链路由下单自动核销；mock 可单独调） */
export interface CouponRedeemReq {
  customer_coupon_id: string
  store_id?: number
  order_id?: number | null
}

export interface CouponRedeemRes {
  status: 'success' | 'failed'
  customer_coupon_id: string
  discount_amount: string
  message?: string
}
