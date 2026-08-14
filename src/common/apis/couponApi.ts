import { http } from '@/plugin/request'
import type { CheckoutPreviewReq, CheckoutPreviewRes, MyCouponRes } from '@/common/types/coupon'

/**
 * 优惠券 API 预留层。
 * 当前对接 mock：`GET /api/mp/coupons/mine`、`POST /api/mp/checkout/preview`。
 * 真后端就绪时只改本文件的 path / DTO 映射即可。
 */
export function listMyCoupons() {
  return http.get<MyCouponRes[]>('/api/mp/coupons/mine', undefined, { showError: false })
}

export function previewCheckout(payload: CheckoutPreviewReq) {
  return http.post<CheckoutPreviewRes>('/api/mp/checkout/preview', payload, { showError: false })
}
