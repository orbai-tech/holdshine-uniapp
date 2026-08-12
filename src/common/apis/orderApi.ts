import { http } from '@/plugin/request'
import type { PageResult } from '@/common/types/api'
import type { OrderRes } from '@/common/types/order'

export function listMyOrders(page = 1, pageSize = 20) {
  return http.get<PageResult<OrderRes>>('/api/mp/orders', {
    page,
    page_size: pageSize,
  })
}
