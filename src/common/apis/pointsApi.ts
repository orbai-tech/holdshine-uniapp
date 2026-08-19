import { http } from '@/plugins/request'
import type { PageResult } from '@/common/types/api'
import type {
  ListPointsLedgerQuery,
  MpPointAccountRes,
  MpPointLedgerRes,
} from '@/common/types/points'

/** GET /api/mp/customer/points/account */
export function getPointsAccount() {
  return http.get<MpPointAccountRes>('/api/mp/customer/points/account', undefined, {
    showError: false,
  })
}

/** GET /api/mp/customer/points/ledger */
export function listPointsLedger(query: ListPointsLedgerQuery = {}) {
  const page = query.page ?? 1
  const pageSize = query.page_size ?? 20
  if (!Number.isInteger(page) || page < 1) {
    return Promise.reject(new Error('页码无效'))
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return Promise.reject(new Error('每页条数无效'))
  }
  return http.get<PageResult<MpPointLedgerRes>>(
    '/api/mp/customer/points/ledger',
    { page, page_size: pageSize },
    { showError: false },
  )
}
