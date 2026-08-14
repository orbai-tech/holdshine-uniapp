import { http } from '@/plugin/request'
import type {
  CheckoutPreviewReq,
  CheckoutPreviewRes,
  CouponClaimReq,
  CouponRedeemReq,
  CouponRedeemRes,
  CouponTemplateBriefRes,
  CouponTemplateListRes,
  MyCouponListRes,
  MyCouponRes,
} from '@/common/types/coupon'

function normalizeCoupon(raw: MyCouponRes): MyCouponRes {
  const id = String(raw.customer_coupon_id ?? (raw as { coupon_id?: number }).coupon_id ?? '')
  const template = raw.template ?? {
    coupon_name: raw.title,
    threshold_amount: raw.threshold_amount,
    discount_amount: raw.reduce_amount ?? raw.discount_amount,
  }
  return {
    ...raw,
    customer_coupon_id: id,
    title: raw.title ?? template.coupon_name,
    threshold_amount: raw.threshold_amount ?? template.threshold_amount,
    reduce_amount: raw.reduce_amount ?? template.discount_amount,
    template: {
      ...template,
      coupon_name: template.coupon_name ?? raw.title,
      threshold_amount: template.threshold_amount ?? raw.threshold_amount,
      discount_amount: template.discount_amount ?? raw.reduce_amount ?? raw.discount_amount,
    },
  }
}

/**
 * 我的优惠券。真契约：`{ list: MyCouponRes[] }`；旧 mock 可能直接返回数组。
 */
export async function listMyCoupons() {
  const data = await http.get<MyCouponListRes | MyCouponRes[]>(
    '/api/mp/coupons/mine',
    undefined,
    { showError: false },
  )
  const list = Array.isArray(data) ? data : (data?.list ?? [])
  return list.map(normalizeCoupon)
}

/**
 * 可领优惠券模板。Query `store_id` 为 integer。
 */
export async function listAvailableCoupons(storeId: number) {
  const data = await http.get<CouponTemplateListRes | CouponTemplateBriefRes[]>(
    '/api/mp/coupons/available',
    { store_id: storeId },
    { showError: false },
  )
  return Array.isArray(data) ? data : (data?.list ?? [])
}

/**
 * 领取优惠券。`coupon_template_id` 契约为 integer（Brief 出参为 string）。
 */
export async function claimCoupon(payload: {
  coupon_template_id: number | string
  store_id?: number | null
}) {
  const coupon_template_id = Number(payload.coupon_template_id)
  if (!Number.isInteger(coupon_template_id) || coupon_template_id <= 0) {
    throw new Error('优惠券模板编号无效')
  }
  const body: CouponClaimReq = {
    coupon_template_id,
    store_id: payload.store_id ?? null,
  }
  const raw = await http.post<MyCouponRes>('/api/mp/coupons/claim', body)
  return normalizeCoupon(raw)
}

/**
 * @deprecated 契约已删；前端结账改为本地试算，勿再调用。
 */
export function previewCheckout(payload: CheckoutPreviewReq) {
  return http.post<CheckoutPreviewRes>('/api/mp/checkout/preview', payload, { showError: false })
}

/**
 * 预留核销接口（文档暂无顾客端 path）。正式下单走「下单自动核销」，不必前端先调。
 * mock：`POST /api/mp/coupons/redeem`
 */
export function redeemCoupon(payload: CouponRedeemReq) {
  return http.post<CouponRedeemRes>('/api/mp/coupons/redeem', payload, { showError: false })
}
