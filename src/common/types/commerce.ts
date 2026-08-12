import type { Product } from './catalog'

export type CupSize = '中杯' | '大杯'
export type DrinkTemp = '热' | '正常冰' | '少冰'
export type OrderStatus = '制作中' | '待取餐' | '已完成'
export type OrderMode = '堂食' | '外带'

export interface CartItem {
  product: Product
  qty: number
  size: CupSize
  temp: DrinkTemp
  extras: string[]
}

export interface OrderItem {
  id: string
  items: CartItem[]
  total: number
  status: OrderStatus
  createdAt: string
  mode: OrderMode
}
