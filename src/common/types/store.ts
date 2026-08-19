/** 文档 DTO：GET /api/mp/customer/stores → MpStoreRes。store_id 为 string。 */
export interface MpStoreRes {
  store_id: string
  store_code: string
  store_name: string
  status: number
  mobile: string | null
  cover_path: string | null
  logo_path: string | null
  city: string | null
  district: string | null
  address: string | null
  business_hours: string | null
  /** 当前是否在营业时段；文档 default true */
  coffee_open_now?: boolean
  /** 营业态展示文案；文档 default「营业中」 */
  status_label?: string
  enable_dine_in: number
  enable_takeaway: number
  enable_mall?: number
  enable_points: number
  latitude: string | null
  longitude: string | null
  /** 传入顾客坐标时由后端计算；未传则为 null */
  distance_km: number | null
}

/** 文档 DTO：GET /api/mp/customer/stores/{store_id} */
export interface MpStoreDetailRes {
  store_id: string
  store_code: string
  store_name: string
  status: number
  mobile: string | null
  cover_path: string | null
  logo_path: string | null
  city: string | null
  district: string | null
  address: string | null
  business_hours: string | null
  coffee_open_now?: boolean
  status_label?: string
  enable_dine_in: number
  enable_takeaway: number
  enable_mall?: number
  enable_points: number
  latitude: string | null
  longitude: string | null
  distance_km: number | null
  contact_name?: string | null
  province?: string | null
  packing_fee: string
  delivery_fee: string
  min_order_amount?: string | null
  free_delivery_amount?: string | null
  delivery_radius_km?: string | null
  mall_free_shipping_amount?: string | null
  mall_default_freight?: string
  mall_ship_within_hours?: number | null
  mall_courier?: string | null
  mall_support_pickup?: number
}

/** 页面/store 内统一用此别名，避免散落 MpStoreRes / StoreRes 双名。 */
export type StoreRes = MpStoreRes

export interface MpStoreListQuery {
  page?: number
  page_size?: number
  keyword?: string | null
  latitude?: number | null
  longitude?: number | null
}
