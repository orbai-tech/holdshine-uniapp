/** 文档 DTO：购物车已实现接口 */

export interface CartAddReq {
  store_id: number
  product_id: number
  sku_id?: number | null
  option_ids?: number[]
  quantity?: number
  table_id?: number | null
}

export interface CartUpdateQtyReq {
  quantity: number
}

export interface CartOptionRes {
  option_id?: number
  option_name?: string
}

export interface CartItemRes {
  item_id: number
  product_id: number
  sku_id: number | null
  product_name: string
  sku_name: string | null
  quantity: number
  unit_price: string
  option_amount: string
  line_amount: string
  options?: CartOptionRes[]
}

export interface CartRes {
  cart_id: number
  store_id: number
  store_name: string
  table_id: number | null
  table_status: number | null
  can_append?: boolean
  service_mode: number
  item_count: number
  product_amount: string
  option_amount: string
  payable_amount: string
  items?: CartItemRes[]
}
