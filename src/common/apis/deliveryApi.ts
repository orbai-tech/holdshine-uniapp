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

/** POST /api/mp/customer/delivery/quote。store_id 真契约 string，禁止 Number() 以免精度丢失。 */
export function quoteDelivery(body: DeliveryQuoteReq) {
  if (!/^\d+$/.test(String(body.store_id ?? ''))) {
    return Promise.reject(new Error('门店无效'))
  }
  // address_id 是 18 位雪花大整数（string），只校验非空/纯数字，禁止 Number()
  if (!/^\d+$/.test(String(body.address_id ?? ''))) {
    return Promise.reject(new Error('地址无效'))
  }
  // 透传字符串 store_id/address_id，避免大整数走 Number() 被截断
  const safeBody = {
    ...body,
    store_id: String(body.store_id),
    address_id: String(body.address_id),
  } as DeliveryQuoteReq
  return http.post<DeliveryQuoteRes>('/api/mp/customer/delivery/quote', safeBody, { showError: false })
}

/** GET /api/mp/customer/delivery/orders/{order_id} — path 直接透传 string */
export function getTakeawayDispatch(orderId: string | number) {
  const id = toOrderId(orderId)
  return http.get<TakeawayDispatchRes>(`/api/mp/customer/delivery/orders/${id}`, undefined, {
    showError: false,
  })
}
