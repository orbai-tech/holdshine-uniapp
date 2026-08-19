import { http } from '@/plugins/request'
import type { PageResult } from '@/common/types/api'
import type { CreateOrderReq, OrderRes } from '@/common/types/order'

/** OrderRes.order_id 是 string，path 要 integer。失败抛错，不当 0。 */
export function toOrderId(raw: string | number): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('订单编号无效')
  }
  return id
}

export function listMyOrders(
  page = 1,
  pageSize = 20,
  query?: { status?: number; service_mode?: number },
) {
  const params: Record<string, number> = {
    page,
    page_size: pageSize,
  }
  if (query?.status != null) params.status = query.status
  if (query?.service_mode != null) params.service_mode = query.service_mode
  return http.get<PageResult<OrderRes>>('/api/mp/customer/orders', params)
}

export function createOrder(payload: CreateOrderReq) {
  return http.post<OrderRes>('/api/mp/customer/orders', payload)
}

export function getOrder(orderId: number | string) {
  return http.get<OrderRes>(`/api/mp/customer/orders/${toOrderId(orderId)}`)
}

export function cancelOrder(orderId: number | string) {
  return http.post<OrderRes>(`/api/mp/customer/orders/${toOrderId(orderId)}/cancel`)
}
