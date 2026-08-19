import { http } from '@/plugins/request'
import type {
  CartAddReq,
  CartClearReq,
  CartOverviewRes,
  CartQuoteReq,
  CartQuoteRes,
  CartRes,
  CartUpdateQtyReq,
} from '@/common/types/cart'

export function getCart(storeId: number, serviceMode?: number | null) {
  const query: Record<string, number> = { store_id: storeId }
  if (serviceMode != null) query.service_mode = serviceMode
  return http.get<CartRes>('/api/mp/customer/cart', query, { showError: false })
}

/** 有商品的购物车总览（堂食 / 外卖 / 商城） */
export function getCartOverview() {
  return http.get<CartOverviewRes>('/api/mp/customer/cart/overview', undefined, { showError: false })
}

/**
 * @deprecated 契约已删；规格单价改为菜单 sale_price + price_delta 本地试算。
 * mock 仍保留 handler，勿在主路径调用。
 */
export function quoteCartItem(payload: CartQuoteReq) {
  return http.post<CartQuoteRes>('/api/mp/customer/cart/quote', payload, { showError: false })
}

export function addCartItem(payload: CartAddReq) {
  return http.post<CartRes>('/api/mp/customer/cart/items', payload)
}

export function updateCartItem(itemId: number, payload: CartUpdateQtyReq) {
  return http.put<CartRes>(`/api/mp/customer/cart/items/${itemId}`, payload)
}

export function removeCartItem(itemId: number) {
  return http.del<CartRes>(`/api/mp/customer/cart/items/${itemId}`)
}

/** 清空当前店指定履约模式购物袋；成功 data 为 null */
export function clearCart(payload: CartClearReq) {
  return http.post<null>('/api/mp/customer/cart/clear', payload)
}
