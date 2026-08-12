/** 文档 DTO：GET /api/admin/stores → StoreRes。store_id 为 string。 */
export interface StoreRes {
  store_id: string
  store_code: string
  store_name: string
  store_type: number
  status: number
  contact_name: string | null
  mobile: string | null
  logo_path: string | null
  cover_path: string | null
  province: string | null
  city: string | null
  district: string | null
  address: string | null
  longitude: string | null
  latitude: string | null
  business_hours: string | null
  enable_dine_in: number
  enable_takeaway: number
  enable_mall: number
  enable_points: number
  min_order_amount: string | null
  packing_fee: string
  delivery_fee: string
  free_delivery_amount: string | null
  delivery_radius_km: string | null
  dine_prep_minutes: number | null
  takeaway_prep_minutes: number | null
}

export interface AdminStoreListQuery {
  page?: number
  page_size?: number
  keyword?: string | null
  status?: number | null
}
