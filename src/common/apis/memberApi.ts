import { http } from '@/plugins/request'
import type {
  MemberBenefitsRes,
  MemberLevelOfferListRes,
  MemberSubscribeReq,
  MemberSubscribeRes,
  MemberSummaryRes,
  MyMemberSubscriptionListRes,
} from '@/common/types/member'

/** GET /api/mp/customer/member/summary */
export function getMemberSummary() {
  return http.get<MemberSummaryRes>('/api/mp/customer/member/summary', undefined, {
    showError: false,
  })
}

/** GET /api/mp/customer/member/levels */
export function getMemberLevels() {
  return http.get<MemberLevelOfferListRes>('/api/mp/customer/member/levels', undefined, {
    showError: false,
  })
}

/** GET /api/mp/customer/member/benefits */
export function getMemberBenefits() {
  return http.get<MemberBenefitsRes>('/api/mp/customer/member/benefits', undefined, {
    showError: false,
  })
}

function normalizeClientToken(raw: string | undefined) {
  const token = String(raw || '').trim()
  if (token.length < 8 || token.length > 64) {
    throw new Error('client_token 无效')
  }
  return token
}

/** POST /api/mp/customer/member/subscribe — 开通/续费/升档 */
export function subscribeMember(body: MemberSubscribeReq) {
  const targetLevelId = Number(body.target_level_id)
  if (!Number.isInteger(targetLevelId) || targetLevelId <= 0) {
    return Promise.reject(new Error('目标档位无效'))
  }
  let clientToken = ''
  try {
    clientToken = normalizeClientToken(body.client_token)
  } catch (error) {
    return Promise.reject(error)
  }
  return http.post<MemberSubscribeRes>('/api/mp/customer/member/subscribe', {
    target_level_id: targetLevelId,
    client_token: clientToken,
  })
}

/** GET /api/mp/customer/member/subscriptions */
export function listMemberSubscriptions() {
  return http.get<MyMemberSubscriptionListRes>('/api/mp/customer/member/subscriptions', undefined, {
    showError: false,
  })
}
