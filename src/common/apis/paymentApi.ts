import { http } from '@/plugins/request'
import type { PrepayRes } from '@/common/types/payment'
import { toOrderId } from '@/common/apis/orderApi'

export function prepay(orderId: number | string) {
  return http.post<PrepayRes>('/api/mp/customer/payments/prepay', { order_id: toOrderId(orderId) })
}

export function mockPaid(orderId: number | string) {
  return http.post<null>('/api/mp/customer/payments/mock-paid', { order_id: toOrderId(orderId) })
}
