import { http } from '@/plugin/request'
import type { PrepayRes } from '@/common/types/payment'

export function prepay(orderId: number) {
  return http.post<PrepayRes>('/api/mp/payments/prepay', { order_id: orderId })
}

export function mockPaid(orderId: number) {
  return http.post<null>('/api/mp/payments/mock-paid', { order_id: orderId })
}
