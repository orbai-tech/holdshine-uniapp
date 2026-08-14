import { http } from '@/plugin/request'
import type { CartAddReq, CartQuoteReq, CartQuoteRes, CartRes, CartUpdateQtyReq } from '@/common/types/cart'

export function getCart(storeId: number) {
  return http.get<CartRes>('/api/mp/cart', { store_id: storeId }, { showError: false })
}

/** 规格询价：不改购物车；真后端对齐同 path 即可 */
export function quoteCartItem(payload: CartQuoteReq) {
  return http.post<CartQuoteRes>('/api/mp/cart/quote', payload, { showError: false })
}

export function addCartItem(payload: CartAddReq) {
  return http.post<CartRes>('/api/mp/cart/items', payload)
}

export function updateCartItem(itemId: number, payload: CartUpdateQtyReq) {
  return http.put<CartRes>(`/api/mp/cart/items/${itemId}`, payload)
}

export function removeCartItem(itemId: number) {
  return http.delete<CartRes>(`/api/mp/cart/items/${itemId}`)
}
