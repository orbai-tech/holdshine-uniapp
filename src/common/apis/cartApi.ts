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

/**
 * 查询当前店购物袋。store_id 是后端 18 位大整数原值（字符串），内部统一 String()
 * 透传，禁止 Number() 以免精度丢失。
 */
export function getCart(storeId: string | number, serviceMode?: number | null) {
  const query: Record<string, string | number> = { store_id: String(storeId) }
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

/** item_id 是 18 位雪花大整数原值（字符串），直接透传禁止 Number() */
export function updateCartItem(itemId: string, payload: CartUpdateQtyReq) {
  return http.put<CartRes>(`/api/mp/customer/cart/items/${itemId}`, payload)
}

/** item_id 是 18 位雪花大整数原值（字符串），直接透传禁止 Number() */
export function removeCartItem(itemId: string) {
  return http.del<CartRes>(`/api/mp/customer/cart/items/${itemId}`)
}

/** 清空当前店指定履约模式购物袋；成功 data 为 null */
export function clearCart(payload: CartClearReq) {
  return http.post<null>('/api/mp/customer/cart/clear', payload)
}
