/** 文档 DTO：GET /api/mp/customer/member/summary → MemberSummaryRes */
export interface MemberSummaryRes {
  member_no?: string | null
  member_level_id: string
  level_code: string
  level_name: string
  level_rank: number
  coffee_discount_rate: string
  mall_discount_rate: string
  expires_at?: string | null
  remaining_days?: number
  is_active?: boolean
  benefits_description?: string | null
  available_points?: number
}

/** 文档 DTO：可购档位单条 */
export interface MemberLevelOfferRes {
  member_level_id: string
  level_code: string
  level_name: string
  level_rank: number
  coffee_discount_rate: string
  mall_discount_rate: string
  monthly_price: string
  duration_days: number
  benefits_description?: string | null
  purchasable?: boolean
  /** 1开通 2续费 3升档 */
  action_type?: number | null
  pay_amount?: string | null
  remaining_days?: number | null
  low_residual_amount?: string | null
}

export interface MemberLevelOfferListRes {
  list?: MemberLevelOfferRes[]
}

/** 文档 DTO：GET /api/mp/customer/member/benefits → MemberBenefitsRes */
export interface MemberBenefitsRes {
  current: MemberSummaryRes
  levels: MemberLevelOfferListRes
  description: string
}

/** 订阅 pay_status（契约未给枚举，常见 1 待支付 / 2 已支付 / 3 已关闭） */
export const MEMBER_PAY_STATUS = {
  UNPAID: 1,
  PAID: 2,
  CLOSED: 3,
} as const

/** 文档 DTO：POST /api/mp/customer/member/subscribe */
export interface MemberSubscribeReq {
  target_level_id: number
  client_token: string
}

export interface MemberSubscribeRes {
  subscription_id: string
  order_id: string
  payment_no: string
  action_type: number
  pay_amount: string
  list_price: string
  remaining_days?: number
  low_residual_amount?: string | null
  expires_at_after?: string | null
  target_level_id: string
  target_level_name: string
}

/** 文档 DTO：GET /api/mp/customer/member/subscriptions */
export interface MyMemberSubscriptionRes {
  subscription_id: string
  target_level_id: string
  target_level_name?: string | null
  action_type: number
  pay_amount: string
  pay_status: number
  order_id?: string | null
  paid_at?: string | null
  period_start?: string | null
  period_end?: string | null
  created_at?: string | null
}

export interface MyMemberSubscriptionListRes {
  list?: MyMemberSubscriptionRes[]
}
