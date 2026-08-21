/** 文档 DTO：已实现 OrderRes / OrderItemRes / OrderOptionRes（OpenAPI）。 */

export interface CreateOrderReq {
  /** 真契约 string；前端禁止 Number()，避免 18 位大整数精度丢失 */
  store_id: string
  /** 幂等键，防连点双单；8–64 字符 */
  client_token: string
  /** 1堂食、2自提、3外卖、4礼品快递 */
  service_mode: number
  from_cart: true
  /** 真契约 string；未选桌台不传，避免本地假 id 触发"桌台不存在" */
  table_id?: string | null
  /** 外卖必填；真契约 string，18 位雪花大整数 */
  address_id?: string | null
  customer_remark?: string | null
  /** 真契约 string；18 位雪花大整数，下单时后端重算并核销 */
  customer_coupon_id?: string | null
}

/** 真契约 OrderOptionRes */
export interface OrderOptionRes {
  group_name: string
  option_name: string
  price_delta: string
}

export interface OrderItemRes {
  item_id: string
  product_id: string
  sku_id: string | null
  product_name: string
  sku_name: string | null
  quantity: number
  unit_price: string
  option_amount: string
  paid_amount: string
  options?: OrderOptionRes[]
}

/** 真契约 OrderDeliveryRes（本轮 UI 不展示） */
export interface OrderDeliveryRes {
  contact_name: string
  contact_mobile: string
  full_address: string
  delivery_status: number
  delivery_provider: string
  distance_km?: string | null
  delivery_fee: string
  remark?: string | null
  courier_name?: string | null
  tracking_no?: string | null
  shipped_at?: string | null
  received_at?: string | null
}

export interface OrderRes {
  /** 响应为 string；path 参数为 integer，见 toOrderId */
  order_id: string
  order_no: string
  store_id: string
  store_name: string
  table_id: string | null
  table_name: string | null
  service_mode: number
  order_status: number
  product_amount: string
  option_amount: string
  packing_fee?: string
  delivery_fee?: string
  /** 真契约：券抵扣金额 */
  coupon_amount?: string
  /** 真契约：会员折扣金额 */
  member_discount_amount?: string
  discount_amount?: string
  /** mock 回传；真 OrderRes 未必带 */
  customer_coupon_id?: string | null
  payable_amount: string
  paid_amount: string
  /** 契约 schema 未列；mock 支付后可能回传 */
  pickup_code?: string | null
  customer_remark: string | null
  created_at: string | null
  appended?: boolean
  delivery?: OrderDeliveryRes | null
  items?: OrderItemRes[]
  can_restock?: boolean
  stock_restored?: boolean
}
