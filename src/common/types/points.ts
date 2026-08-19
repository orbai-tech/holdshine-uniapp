/** 文档 DTO：GET /api/mp/customer/points/account → MpPointAccountRes */
export interface MpPointAccountRes {
  customer_id: string
  /** 储值余额（预留），字符串小数 */
  balance?: string
  available_points?: number
  frozen_points?: number
  total_earned_points?: number
  total_used_points?: number
}

/** 文档 DTO：GET /api/mp/customer/points/ledger → MpPointLedgerRes */
export interface MpPointLedgerRes {
  ledger_id: string
  ledger_no: string
  /** 变动方向等，契约未给完整枚举 */
  change_type: number
  biz_code: string
  change_points: number
  balance_after: number
  related_type?: string | null
  related_id?: string | null
  remark?: string | null
  created_at?: string | null
}

export interface ListPointsLedgerQuery {
  page?: number
  page_size?: number
}
