/**
 * 临时 mock 合同：整数枚举待后端确认（FIELD-GAP-007）。
 * 所有页面从此导入，禁止在 Vue 里写魔法数字。
 */
import type { FulfillmentMode, PickupSubMode, TableCode } from './fulfillment'

export const SERVICE_MODE = {
  DINE_IN: 1,
  PACK: 2,
  DELIVERY: 3,
} as const

export type ServiceMode = (typeof SERVICE_MODE)[keyof typeof SERVICE_MODE]

export const ORDER_STATUS = {
  UNPAID: 0,
  MAKING: 1,
  READY: 2,
  DONE: 3,
  CANCELLED: 4,
} as const

export type OrderStatusCode = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

const TABLE_ID_BY_CODE: Record<TableCode, number> = {
  A1: 1,
  A2: 2,
  A3: 3,
}

export function toServiceMode(session: {
  fulfillmentMode: FulfillmentMode | null
  pickupSubMode: PickupSubMode
}): ServiceMode | null {
  if (session.fulfillmentMode === 'delivery') return SERVICE_MODE.DELIVERY
  if (session.fulfillmentMode === 'dine_in') {
    return session.pickupSubMode === 'pack' ? SERVICE_MODE.PACK : SERVICE_MODE.DINE_IN
  }
  return null
}

export function toTableId(tableCode: TableCode | null | undefined): number | null {
  if (tableCode == null) return null
  return TABLE_ID_BY_CODE[tableCode] ?? null
}

export function serviceModeLabel(mode: number): string {
  if (mode === SERVICE_MODE.DINE_IN) return '店内就餐'
  if (mode === SERVICE_MODE.PACK) return '到店自取'
  if (mode === SERVICE_MODE.DELIVERY) return '外卖配送'
  return '—'
}

export function orderStatusLabel(status: number): string {
  if (status === ORDER_STATUS.UNPAID) return '待支付'
  if (status === ORDER_STATUS.MAKING) return '制作中'
  if (status === ORDER_STATUS.READY) return '待取餐'
  if (status === ORDER_STATUS.DONE) return '已完成'
  if (status === ORDER_STATUS.CANCELLED) return '已取消'
  return '—'
}
