import type { StoreRes } from '@/common/types/store'

/** TODO(DEV-013) 选店列表未接 UI，仅占位，禁止当成已签约列表。 */
export const mockStores: StoreRes[] = [
  {
    store_id: '1',
    store_code: 'SH-JA',
    store_name: '上海静安嘉里中心店',
    store_type: 1,
    status: 1,
    contact_name: null,
    mobile: null,
    logo_path: null,
    cover_path: null,
    province: '上海',
    city: '上海',
    district: '静安区',
    address: '南京西路 1515 号',
    longitude: null,
    latitude: null,
    business_hours: '08:30 – 21:30',
    enable_dine_in: 1,
    enable_takeaway: 1,
    enable_mall: 0,
    enable_points: 1,
    min_order_amount: null,
    packing_fee: '0',
    delivery_fee: '0',
    free_delivery_amount: null,
    delivery_radius_km: null,
    dine_prep_minutes: 8,
    takeaway_prep_minutes: 8,
  },
]
