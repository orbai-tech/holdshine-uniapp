import { http } from '@/plugins/request'
import { toOrderId } from '@/common/apis/orderApi'
import type {
  DeliveryChannelListRes,
  DeliveryQuoteReq,
  DeliveryQuoteRes,
  TakeawayDispatchRes,
} from '@/common/types/delivery'

/** GET /api/mp/customer/delivery/channels */
export function listDeliveryChannels() {
  return http.get<DeliveryChannelListRes>('/api/mp/customer/delivery/channels', undefined, {
    showError: false,
  })
}

/** POST /api/mp/customer/delivery/quote */
export function quoteDelivery(body: DeliveryQuoteReq) {
  if (!Number.isInteger(body.store_id) || body.store_id <= 0) {
    return Promise.reject(new Error('门店无效'))
  }
  if (!Number.isInteger(body.address_id) || body.address_id <= 0) {
    return Promise.reject(new Error('地址无效'))
  }
  return http.post<DeliveryQuoteRes>('/api/mp/customer/delivery/quote', body, { showError: false })
}

/** GET /api/mp/customer/delivery/orders/{order_id} — path 为 integer */
export function getTakeawayDispatch(orderId: string | number) {
  const id = toOrderId(orderId)
  if (!Number.isInteger(id) || id <= 0) {
    return Promise.reject(new Error('订单编号无效'))
  }
  return http.get<TakeawayDispatchRes>(`/api/mp/customer/delivery/orders/${id}`, undefined, {
    showError: false,
  })
}
