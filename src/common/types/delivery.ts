/** 顾客端外卖配送 DTO（channels / quote / takeaway progress）。 */

export interface DeliveryChannelRes {
  code: string
  name: string
  enabled: boolean
  ready: boolean
}

export interface DeliveryChannelListRes {
  list: DeliveryChannelRes[]
}

export interface DeliveryQuoteReq {
  /** 真契约 string；真后端是 18 位雪花大整数，禁走 Number() */
  store_id: string
  /** 真契约 string；18 位雪花大整数 */
  address_id: string
  product_amount?: number | string
}

export interface DeliveryQuoteRes {
  provider: string
  in_range: boolean
  meet_min_order: boolean
  distance_km?: number | null
  packing_fee: string
  delivery_fee: string
  min_order_amount?: string | null
  free_delivery_amount?: string | null
  message?: string | null
}

export interface TakeawayTraceRes {
  action_time: string
  action_type: number
  action_msg: string
}

export interface TakeawayDispatchRes {
  order_id: string
  order_no: string
  provider?: string | null
  delivery_id?: string | null
  courier_name?: string | null
  waybill_id?: string | null
  delivery_status?: number | null
  remark?: string | null
  agent_name?: string | null
  agent_phone?: string | null
  traces?: TakeawayTraceRes[]
}
