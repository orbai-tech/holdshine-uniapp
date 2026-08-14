/** 文档 DTO：GET /api/mp/orders。order_status / service_mode 为整数，对照见 FIELD-GAP-007 / orderEnums。 */

export interface CreateOrderReq {
  store_id: number
  service_mode: number
  from_cart: true
  table_id?: number | null
  customer_remark?: string | null
  /** mock / 预留：选中的优惠券 */
  coupon_id?: number | null
}

export interface OrderOptionRes {
  option_id?: number
  option_name?: string
}

export interface OrderItemRes {
  item_id: number
  product_id: number
  sku_id: number | null
  product_name: string
  sku_name: string | null
  quantity: number
  unit_price: string
  option_amount: string
  paid_amount: string
  options?: OrderOptionRes[]
}

export interface OrderRes {
  order_id: number
  order_no: string
  store_id: number
  store_name: string
  table_id: number | null
  table_name: string | null
  service_mode: number
  order_status: number
  product_amount: string
  option_amount: string
  packing_fee?: string
  delivery_fee?: string
  /** mock / 预留 */
  discount_amount?: string
  coupon_id?: number | null
  payable_amount: string
  paid_amount: string
  pickup_code: string | null
  customer_remark: string | null
  created_at: string | null
  appended?: boolean
  items?: OrderItemRes[]
}
