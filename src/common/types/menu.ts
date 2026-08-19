/** 文档 DTO：GET /api/mp/customer/stores/{store_id}/menu */

export interface MpMenuSkuRes {
  sku_id: number
  sku_name: string
  cup_size: string | null
  sale_price: string
}

export interface MpMenuOptionRes {
  option_id: number
  option_name: string
  price_delta: string
  is_default: number
}

export interface MpMenuOptionGroupRes {
  group_id: number
  group_code: string
  group_name: string
  select_type: number
  is_required: number
  values: MpMenuOptionRes[]
}

export interface MpMenuProductRes {
  product_id: number
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
  category_id: number
  category_name: string
  products?: MpMenuProductRes[]
}

export interface MpMenuRes {
  store_id: number
  store_name: string
  categories?: MpMenuCategoryRes[]
}
