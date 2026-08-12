import { http } from '@/plugin/request'
import type { PageResult } from '@/common/types/api'
import type { AdminStoreListQuery, StoreRes } from '@/common/types/store'
import { distanceKm, parseCoord, type GeoPoint } from '@/utils/geo'
import { toStoreId } from '@/utils/storeId'

/** 产品点名：顾客端「切换」走超管门店列表。Query 用文档 snake_case。 */
export function listAdminStores(query: AdminStoreListQuery = {}) {
  const data: { page: number; page_size: number; keyword?: string; status?: number } = {
    page: query.page ?? 1,
    page_size: query.page_size ?? 100,
  }
  if (query.keyword) data.keyword = query.keyword
  if (query.status != null) data.status = query.status
  return http.get<PageResult<StoreRes>>('/api/admin/stores', data)
}

export function pickNearestStore(stores: StoreRes[], point: GeoPoint | null): StoreRes {
  if (!stores.length) {
    throw new Error('暂无门店')
  }
  if (!point) return stores[0]
  let best = stores[0]
  let bestKm = Number.POSITIVE_INFINITY
  for (const store of stores) {
    const latitude = parseCoord(store.latitude)
    const longitude = parseCoord(store.longitude)
    if (latitude == null || longitude == null) continue
    const km = distanceKm(point, { latitude, longitude })
    if (km < bestKm) {
      best = store
      bestKm = km
    }
  }
  return best
}

export function storeDistanceLabel(store: StoreRes, point: GeoPoint | null): string {
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
