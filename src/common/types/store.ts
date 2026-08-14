/** 文档 DTO：GET /api/mp/stores → MpStoreRes。store_id 为 string。 */
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
  enable_dine_in: number
  enable_takeaway: number
  enable_mall?: number
  enable_points: number
  latitude: string | null
  longitude: string | null
  /** 传入顾客坐标时由后端计算；未传则为 null */
  distance_km: number | null
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
