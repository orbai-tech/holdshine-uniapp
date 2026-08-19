/** 顾客端桌台 DTO（resolve / occupy）。 */

/** 0停用、1空闲、2用餐中、3待清台 */
export const TABLE_STATUS = {
  DISABLED: 0,
  IDLE: 1,
  DINING: 2,
  DIRTY: 3,
} as const

export type TableStatusCode = (typeof TABLE_STATUS)[keyof typeof TABLE_STATUS]

export interface MpTableResolveRes {
  store_id: string
  store_name: string
  table_id: string
  table_code: string
  table_name: string
  table_status: number
}

export interface MpTableRes {
  table_id: string
  store_id: string
  table_code: string
  table_name: string
  table_status: number
  occupied: boolean
  sort_no: number
  capacity?: number | null
  current_order_id?: string | null
}

/** GET /api/mp/customer/stores/{store_id}/tables/available */
export interface MpAvailableTableRes {
  table_id: string
  table_code: string
  table_name: string
  capacity?: number | null
  /** 0停用、1空闲、2用餐中、3待清台 */
  table_status: number
  /** 是否可选（仅空闲） */
  selectable: boolean
}

export interface MpAvailableTableListRes {
  store_id: string
  store_name: string
  list: MpAvailableTableRes[]
}
