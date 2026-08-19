/**
 * 顾客端礼品商城 DTO（GET /api/mp/customer/mall、GET /api/mp/customer/mall/products/{id}）。
 * 金额字段按契约为 decimal string。
 */

export interface MallSkuRes {
  sku_id: string
  sku_name: string
  sale_price: string
  member_price?: string | null
  available_qty?: number | null
}

export interface MallProductCardRes {
  product_id: string
  product_name: string
  subtitle?: string | null
  short_description?: string | null
  badge_text?: string | null
  cover_image_path?: string | null
  base_price: string
  market_price?: string | null
  member_price?: string | null
  member_discount_rate?: string | null
  member_discount_label?: string | null
  unit_name?: string | null
  sold_count?: number
  available_qty?: number | null
  low_stock_qty?: number | null
  show_low_stock?: boolean
  price_from?: boolean
  skus?: MallSkuRes[]
}

export interface MallProductDetailRes extends MallProductCardRes {
  description?: string | null
  image_paths?: string[]
  need_shipping?: number
  ship_within_hours?: number | null
  free_shipping?: number
  limit_per_order?: number | null
}

export interface MallCategoryRes {
  category_id: string
  category_name: string
  products?: MallProductCardRes[]
}

export interface MallCatalogRes {
  store_id: string
  store_name: string
  slogan?: string
  mall_free_shipping_amount?: string | null
  mall_default_freight?: string
  mall_ship_within_hours?: number | null
  mall_courier?: string | null
  mall_support_pickup?: number
  categories?: MallCategoryRes[]
}
