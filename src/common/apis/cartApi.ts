import { http } from '@/plugin/request'
import type { CartAddReq, CartRes, CartUpdateQtyReq } from '@/common/types/cart'

export function getCart(storeId: number) {
  return http.get<CartRes>('/api/mp/cart', { store_id: storeId })
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
