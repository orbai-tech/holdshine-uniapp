/** 文档 DTO：购物车已实现接口 */

export interface CartAddReq {
  /** 真契约 string；后端 18 位雪花大整数，禁止前端走 Number() */
  store_id: string
  /** 真契约 string；18 位雪花大整数 */
  product_id: string
  /** 真契约 string；18 位雪花大整数 */
  sku_id?: string | null
  option_ids?: string[]
  quantity?: number
  /** 真契约 string；未选桌台传 null，避免把本地假 id 发到真后端 */
  table_id?: string | null
  service_mode?: number
}

export interface CartQuoteReq {
  /** 真契约 string；前端禁止 Number()，避免大整数精度丢失 */
  store_id: string
  /** 真契约 string；18 位雪花大整数 */
  product_id: string
  /** 真契约 string；18 位雪花大整数 */
  sku_id?: string | null
  option_ids?: string[]
  quantity?: number
}

export interface CartOptionRes {
  /** 真契约 string；18 位雪花大整数 */
  option_id?: string
  option_name?: string
}

export interface CartQuoteRes {
  /** 真契约 string；18 位雪花大整数 */
  product_id: string
  /** 真契约 string；18 位雪花大整数 */
  sku_id: string
  sku_name: string | null
  quantity: number
  unit_price: string
  option_amount: string
  line_amount: string
  options?: CartOptionRes[]
}

export interface CartUpdateQtyReq {
  quantity: number
}

export interface CartClearReq {
  /** 真契约 string；前端禁止 Number()，避免大整数精度丢失 */
  store_id: string
  service_mode?: number
}

export interface CartItemRes {
  /** 真契约 string；18 位雪花大整数 */
  item_id: string
  /** 真契约 string；18 位雪花大整数 */
  product_id: string
  /** 真契约 string；18 位雪花大整数 */
  sku_id: string | null
  product_name: string
  sku_name: string | null
  quantity: number
  unit_price: string
  option_amount: string
  line_amount: string
  options?: CartOptionRes[]
}

export interface CartRes {
  /** 真契约 string；18 位雪花大整数 */
  cart_id: string
  /** 真契约 string；真后端返回 18 位雪花大整数 */
  store_id: string
  store_name: string
  /** 真契约 string；18 位雪花桌台 id（string 透传） */
  table_id: string | null
  table_status: number | null
  can_append?: boolean
  service_mode: number
  item_count: number
  product_amount: string
  option_amount: string
  payable_amount: string
  items?: CartItemRes[]
}

/**
 * 文档 DTO：GET /api/mp/customer/cart/overview
 * 真实后端返回有商品的购物车总览：堂食 / 外卖 / 商城，各自按门店一条。
 */
export interface CartOverviewRes {
  /** 堂食购物车（按门店一条） */
  dine_in: CartRes[]
  /** 外卖购物车（按门店一条） */
  takeaway: CartRes[]
  /** 礼品商城购物车（按门店一条） */
  mall: CartRes[]
}
