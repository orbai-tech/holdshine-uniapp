import { http } from '@/plugin/request'
import type { PageResult } from '@/common/types/api'
import type { MpStoreListQuery, StoreRes } from '@/common/types/store'
import { distanceKm, parseCoord, type GeoPoint } from '@/utils/geo'
import { toStoreId } from '@/utils/storeId'

/** 顾客端门店列表：GET /api/mp/stores（DEV-012 平替原 admin 列表）。 */
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
  return http.get<PageResult<StoreRes>>('/api/mp/stores', data)
}

/**
 * 按收货坐标推荐门店。
 * 走 GET /api/mp/stores?latitude&longitude（后端按直线距离排序）；仍过滤营业中。
 */
export async function listStoresByAddress(point: GeoPoint): Promise<StoreRes[]> {
  const page = await listMpStores({
    page: 1,
    page_size: 100,
    latitude: point.latitude,
    longitude: point.longitude,
  })
  return (page.list ?? []).filter((item) => item.status === 1)
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

export function storeIdOf(store: StoreRes): number {
  return toStoreId(store.store_id)
}
