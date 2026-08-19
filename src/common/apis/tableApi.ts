import { http } from '@/plugins/request'
import type {
  MpAvailableTableListRes,
  MpTableRes,
  MpTableResolveRes,
} from '@/common/types/table'

/** GET /api/mp/customer/tables/resolve?qr_token* */
export function resolveTable(qrToken: string) {
  const token = qrToken.trim()
  if (!token) {
    return Promise.reject(new Error('缺少桌码'))
  }
  return http.get<MpTableResolveRes>(
    '/api/mp/customer/tables/resolve',
    { qr_token: token },
    { showError: false },
  )
}

/** POST /api/mp/customer/tables/{table_id}/occupy — path 为 integer */
export function occupyTable(tableId: number) {
  if (!Number.isInteger(tableId) || tableId <= 0) {
    return Promise.reject(new Error('桌台编号无效'))
  }
  return http.post<MpTableRes>(`/api/mp/customer/tables/${tableId}/occupy`, {}, { showError: false })
}

/** GET /api/mp/customer/stores/{store_id}/tables/available — 堂食结算桌台列表 */
export function listAvailableTables(storeId: number) {
  if (!Number.isInteger(storeId) || storeId <= 0) {
    return Promise.reject(new Error('门店编号无效'))
  }
  return http.get<MpAvailableTableListRes>(
    `/api/mp/customer/stores/${storeId}/tables/available`,
    undefined,
    { showError: false },
  )
}
