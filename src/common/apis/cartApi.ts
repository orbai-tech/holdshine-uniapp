import { http } from '@/plugin/request'
import type { CartAddReq, CartRes } from '@/common/types/cart'

export function getCart(storeId: number) {
  return http.get<CartRes>('/api/mp/cart', { store_id: storeId })
}

export function addCartItem(payload: CartAddReq) {
  return http.post<CartRes>('/api/mp/cart/items', payload)
}
