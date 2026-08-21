/** 文档 DTO：GET /api/mp/customer/stores/{store_id}/menu */

export interface MpMenuSkuRes {
  /** 真契约 string；18 位雪花大整数，禁止前端走 Number() */
  sku_id: string
  sku_name: string
  cup_size: string | null
  sale_price: string
}

export interface MpMenuOptionRes {
  /** 真契约 string；18 位雪花大整数 */
  option_id: string
  option_name: string
  price_delta: string
  is_default: number
}

export interface MpMenuOptionGroupRes {
  /** 真契约 string；18 位雪花大整数 */
  group_id: string
  group_code: string
  group_name: string
  select_type: number
  is_required: number
  values: MpMenuOptionRes[]
}

export interface MpMenuProductRes {
  /** 真契约 string；18 位雪花大整数 */
  product_id: string
  product_name: string
  short_description: string | null
  cover_image_path: string | null
  base_price: string
  drink_kind: number | null
  caffeine_level: number | null
  tags: string | null
  is_recommended: number
  skus?: MpMenuSkuRes[]
  option_groups?: MpMenuOptionGroupRes[]
}

export interface MpMenuCategoryRes {
  /** 真契约 string；18 位雪花大整数 */
  category_id: string
  category_name: string
  products?: MpMenuProductRes[]
}

export interface MpMenuRes {
  /** 真契约 string；真后端 18 位雪花大整数，禁走 Number() */
  store_id: string
  store_name: string
  categories?: MpMenuCategoryRes[]
}
