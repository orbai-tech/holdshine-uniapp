import { http } from '@/plugin/request'
import type { PageResult } from '@/common/types/api'
import type { CreateOrderReq, OrderRes } from '@/common/types/order'

export function listMyOrders(page = 1, pageSize = 20) {
  return http.get<PageResult<OrderRes>>('/api/mp/orders', {
    page,
    page_size: pageSize,
  })
}

export function createOrder(payload: CreateOrderReq) {
  return http.post<OrderRes>('/api/mp/orders', payload)
}
