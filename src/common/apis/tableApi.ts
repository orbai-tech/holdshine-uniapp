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

/**
 * POST /api/mp/customer/tables/{table_id}/occupy — path 为 integer，
 * 但真后端是 18 位雪花大整数；前端按 string 透传，禁止 Number() 精度丢失。
 */
export function occupyTable(tableId: string | number) {
  const id = String(tableId ?? '').trim()
  if (!/^\d+$/.test(id)) {
    return Promise.reject(new Error('桌台编号无效'))
  }
  return http.post<MpTableRes>(`/api/mp/customer/tables/${id}/occupy`, {}, { showError: false })
}

/**
 * GET /api/mp/customer/stores/{store_id}/tables/available — 堂食结算桌台列表。
 * store_id 真契约 string（真后端 18 位大整数，禁止 Number()）。
 */
export function listAvailableTables(storeId: string | number) {
  if (!/^\d+$/.test(String(storeId ?? ''))) {
    return Promise.reject(new Error('门店编号无效'))
  }
  const id = String(storeId)
  return http.get<MpAvailableTableListRes>(
    `/api/mp/customer/stores/${id}/tables/available`,
    undefined,
    { showError: false },
  )
}
