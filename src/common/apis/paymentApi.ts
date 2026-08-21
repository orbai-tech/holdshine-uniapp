import { http } from '@/plugins/request'
import type { PrepayRes } from '@/common/types/payment'
import { toOrderId } from '@/common/apis/orderApi'
import { paymentIntent } from '@/utils/clientToken'

/** 显式传入合法 token 则用；否则按订单复用支付意图（同一次支付 5 分钟内同一 token） */
function resolveClientToken(orderId: string | number, raw?: string): string {
  const token = String(raw || '').trim()
  if (token.length >= 8 && token.length <= 64) return token
  return paymentIntent.acquire('pay:' + toOrderId(orderId))
}

export function prepay(orderId: string | number, clientToken?: string) {
  return http.post<PrepayRes>('/api/mp/customer/payments/prepay', {
    order_id: toOrderId(orderId),
    client_token: resolveClientToken(orderId, clientToken),
  })
}

export function mockPaid(orderId: string | number, clientToken?: string) {
  return http.post<null>('/api/mp/customer/payments/mock-paid', {
    order_id: toOrderId(orderId),
    client_token: resolveClientToken(orderId, clientToken),
  })
}
