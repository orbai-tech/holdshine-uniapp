import { http } from '@/plugins/request'
import type { PageResult } from '@/common/types/api'
import type { MpStoreDetailRes, MpStoreListQuery, StoreRes } from '@/common/types/store'
import { distanceKm, parseCoord, type GeoPoint } from '@/utils/geo'
import { toStoreId } from '@/utils/storeId'

/** 顾客端门店列表：GET /api/mp/customer/stores（DEV-012 平替原 admin 列表）。 */
export function listMpStores(query: MpStoreListQuery = {}) {
  const data: {
    page: number
    page_size: number
    keyword?: string
    latitude?: number
    longitude?: number
  } = {
    page: query.page ?? 1,
    page_size: query.page_size ?? 100,
  }

  if (query.keyword) data.keyword = query.keyword
  if (query.latitude != null) data.latitude = query.latitude
  if (query.longitude != null) data.longitude = query.longitude
  return http.get<PageResult<StoreRes>>('/api/mp/customer/stores', data)
}

/** 门店详情：GET /api/mp/customer/stores/{store_id}。store_id 透传字符串，避免大整数精度丢失。 */
export function getStoreDetail(storeId: string | number) {
  const id = String(storeId)
  return http.get<MpStoreDetailRes>(`/api/mp/customer/stores/${id}`, undefined, { showError: false })
}

/**
 * 按收货坐标推荐门店。
 * 走 GET /api/mp/customer/stores?latitude&longitude；客户端再按直线距离升序，保证列表排序稳定。
 */
export async function listStoresByAddress(point: GeoPoint): Promise<StoreRes[]> {
  const page = await listMpStores({
    page: 1,
    page_size: 100,
    latitude: point.latitude,
    longitude: point.longitude,
  })
  const list = (page.list ?? []).filter((item) => item.status === 1)
  return [...list].sort((a, b) => storeDistanceKm(a, point) - storeDistanceKm(b, point))
}

function storeDistanceKm(store: StoreRes, point: GeoPoint): number {
  if (store.distance_km != null && Number.isFinite(store.distance_km)) {
    return store.distance_km
  }
  const latitude = parseCoord(store.latitude)
  const longitude = parseCoord(store.longitude)
  if (latitude == null || longitude == null) return Number.POSITIVE_INFINITY
  return distanceKm(point, { latitude, longitude })
}

export function pickNearestStore(stores: StoreRes[], point: GeoPoint | null): StoreRes {
  if (!stores.length) {
    throw new Error('暂无门店')
  }
  if (!point) return stores[0]
  let best = stores[0]
  let bestKm = Number.POSITIVE_INFINITY
  for (const store of stores) {
    const km = storeDistanceKm(store, point)
    if (km < bestKm) {
      best = store
      bestKm = km
    }
  }
  return best
}

export function storeDistanceLabel(store: StoreRes, point: GeoPoint | null): string {
  if (store.distance_km != null && Number.isFinite(store.distance_km)) {
    const km = store.distance_km
    if (km < 1) return `${Math.round(km * 1000)}m`
    return `${km.toFixed(1)}km`
  }
  if (!point) return '—'
  const latitude = parseCoord(store.latitude)
  const longitude = parseCoord(store.longitude)
  if (latitude == null || longitude == null) return '—'
  const km = distanceKm(point, { latitude, longitude })
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

/** 提取门店 store_id。真契约 MpStoreRes.store_id 是 string，真后端 18 位雪花大整数超过 JS 安全整数，统一按 string 透传。 */
export function storeIdOf(store: StoreRes): string {
  return toStoreId(store.store_id)
}

type StoreOpenFields = {
  coffee_open_now?: boolean
  status_label?: string
}

/** 当前是否在营业时段；缺省按 true（契约 default）。 */
export function storeIsOpenNow(store: StoreOpenFields | null | undefined): boolean {
  if (!store) return false
  return store.coffee_open_now !== false
}

/** 营业态展示文案；优先后端 status_label。 */
export function storeStatusLabel(store: StoreOpenFields | null | undefined): string {
  if (!store) return '休息中'
  const label = store.status_label?.trim()
  if (label) return label
  return storeIsOpenNow(store) ? '营业中' : '休息中'
}
