import { http } from '@/plugins/request'
import { toStoreId } from '@/utils/storeId'
import type {
  CouponClaimReq,
  CouponTemplateBriefRes,
  CouponTemplateListRes,
  ListUsableCouponsQuery,
  MyCouponDetailRes,
  MyCouponListRes,
  MyCouponListResult,
  MyCouponRes,
  UsableCouponListRes,
  UsableCouponRes,
} from '@/common/types/coupon'

/** 校验 store_id 返回字符串。18 位大整数禁止走 Number()。 */
const assertStoreIdOrThrow = toStoreId

function normalizeCoupon(raw: MyCouponRes): MyCouponRes {
  const id = String(raw.customer_coupon_id ?? (raw as { coupon_id?: string }).coupon_id ?? '')
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
    reduce_amount: raw.reduce_amount ?? template.discount_amount ?? '',
    template: {
      ...template,
      coupon_name: template.coupon_name ?? raw.title,
      threshold_amount: template.threshold_amount ?? raw.threshold_amount,
      discount_amount: template.discount_amount ?? raw.reduce_amount ?? raw.discount_amount,
    },
  }
}

/** 18 位雪花大整数禁止 Number()；只做非空/非零校验后 string 透传。 */
function toCustomerCouponId(raw: string | number): string {
  const id = String(raw)
  if (!id || id === '0') {
    throw new Error('优惠券编号无效')
  }
  return id
}

function normalizeDetail(raw: MyCouponDetailRes): MyCouponDetailRes {
  const template = raw.template
  return {
    ...raw,
    customer_coupon_id: String(raw.customer_coupon_id),
    coupon_no: raw.coupon_no || '',
    coupon_status_label: raw.coupon_status_label || '',
    valid_start_at: raw.valid_start_at || '',
    valid_end_at: raw.valid_end_at || '',
    template: {
      coupon_template_id: String(template?.coupon_template_id ?? ''),
      coupon_code: template?.coupon_code || '',
      coupon_name: template?.coupon_name || raw.coupon_no || '礼遇',
      coupon_type: Number(template?.coupon_type || 1),
      discount_amount: template?.discount_amount,
      discount_rate: template?.discount_rate,
      threshold_amount: template?.threshold_amount,
      valid_type: Number(template?.valid_type || 1),
      valid_start_at: template?.valid_start_at,
      valid_end_at: template?.valid_end_at,
      valid_days: template?.valid_days,
      description: template?.description,
      claimed_count: template?.claimed_count,
      can_claim: template?.can_claim,
    },
  }
}

function normalizeMineResponse(data: MyCouponListRes | MyCouponRes[] | null | undefined): MyCouponListResult {
  const list = Array.isArray(data) ? data : (data?.list ?? [])
  const counts = Array.isArray(data) ? undefined : data?.counts
  return {
    list: list.map(normalizeCoupon),
    counts,
  }
}

/**
 * 我的优惠券。真契约：`{ list, counts? }`；旧 mock 可能直接返回数组。
 */
export async function listMyCoupons(couponStatus?: number) {
  const query: Record<string, number> = {}
  if (couponStatus != null) {
    if (!Number.isInteger(couponStatus) || couponStatus <= 0) {
      throw new Error('优惠券状态无效')
    }
    query.coupon_status = couponStatus
  }
  const data = await http.get<MyCouponListRes | MyCouponRes[]>(
    '/api/mp/customer/coupons/mine',
    Object.keys(query).length ? query : undefined,
    { showError: false },
  )
  return normalizeMineResponse(data)
}

/**
 * 可领优惠券模板。Query `store_id` 可选（真契约 string；后端是 18 位大整数）；
 * 不传则不按门店过滤。
 */
export async function listAvailableCoupons(storeId?: string | number) {
  const query: Record<string, string> = {}
  if (storeId != null) {
    const id = assertStoreIdOrThrow(storeId)
    query.store_id = id
  }
  const data = await http.get<CouponTemplateListRes | CouponTemplateBriefRes[]>(
    '/api/mp/customer/coupons/available',
    Object.keys(query).length ? query : undefined,
    { showError: false },
  )
  return Array.isArray(data) ? data : (data?.list ?? [])
}

/**
 * 领取优惠券。`coupon_template_id` 真契约 string（18 位雪花大整数，禁止 Number()）；
 * `store_id` 是 string 真契约。
 */
export async function claimCoupon(payload: {
  coupon_template_id: string | number
  store_id?: string | number | null
}) {
  const coupon_template_id = String(payload.coupon_template_id)
  if (!coupon_template_id || coupon_template_id === '0') {
    throw new Error('优惠券模板编号无效')
  }
  const body: CouponClaimReq = { coupon_template_id }
  if (payload.store_id != null) {
    body.store_id = assertStoreIdOrThrow(payload.store_id)
  }
  const raw = await http.post<MyCouponRes>('/api/mp/customer/coupons/claim', body)
  return normalizeCoupon(raw)
}

/** GET /api/mp/customer/coupons/mine/{customer_coupon_id} */
export async function getMyCoupon(customerCouponId: string | number) {
  const id = toCustomerCouponId(customerCouponId)
  const raw = await http.get<MyCouponDetailRes>(`/api/mp/customer/coupons/mine/${id}`, undefined, {
    showError: false,
  })
  return normalizeDetail(raw)
}

/**
 * 结算可用优惠券。`store_id` 真契约 string（真后端 18 位大整数，禁止走 Number()）；
 * `goods_amount` 为商品+加料原价（不含配送/打包）。仅用于可用性判定；展示折扣由前端本地试算。
 */
export async function listUsableCoupons(query: ListUsableCouponsQuery) {
  const storeId = assertStoreIdOrThrow(query.store_id)
  const goodsAmount = Number(query.goods_amount)
  if (!Number.isFinite(goodsAmount) || goodsAmount < 0) {
    throw new Error('商品金额无效')
  }
  const params: Record<string, number | string> = {
    store_id: storeId,
    goods_amount: goodsAmount.toFixed(2),
  }
  if (query.service_mode != null) params.service_mode = query.service_mode
  const data = await http.get<UsableCouponListRes | UsableCouponRes[]>(
    '/api/mp/customer/coupons/usable',
    params,
    { showError: false },
  )
  const list = Array.isArray(data) ? data : (data?.list ?? [])
  return list.map((row) =>
    normalizeCoupon({
      ...row,
      usable: row.usable !== false,
      unusable_reason: row.unusable_reason ?? null,
    }),
  )
}
