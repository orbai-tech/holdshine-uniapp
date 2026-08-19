/**
 * OrderRes 整数枚举（OpenAPI description，FIELD-GAP-007）。
 * 所有页面从此导入，禁止在 Vue 里写魔法数字。
 *
 * 契约读侧：1堂食、2自提、3外卖、4礼品快递、5会员月卡。
 * 写路径仅 1/3（礼品 4 产品排除）；UI「到店自取」(pack) 仍映射堂食 1（DEV-010）。
 */
import type { FulfillmentMode, PickupSubMode, TableCode } from './fulfillment'

export const SERVICE_MODE = {
  DINE_IN: 1,
  /** 契约自提；写路径 UI pack 仍映射堂食 1（DEV-010） */
  PICKUP: 2,
  DELIVERY: 3,
  MALL: 4,
  MEMBER_CARD: 5,
} as const

export type ServiceMode = (typeof SERVICE_MODE)[keyof typeof SERVICE_MODE]

export const ORDER_STATUS = {
  UNPAID: 1,
  PENDING_ACCEPT: 2,
  MAKING: 3,
  READY: 4,
  DONE: 5,
  CANCELLED: 6,
  REFUNDING: 7,
  REFUNDED: 8,
  REJECTED: 9,
  PENDING_SHIP: 10,
  SHIPPED: 11,
  RECEIVED: 12,
} as const

export type OrderStatusCode = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

const TABLE_ID_BY_CODE: Record<TableCode, number> = {
  A1: 1,
  A2: 2,
  A3: 3,
}

const ORDER_STATUS_LABELS: Record<number, string> = {
  [ORDER_STATUS.UNPAID]: '待支付',
  [ORDER_STATUS.PENDING_ACCEPT]: '待接单',
  [ORDER_STATUS.MAKING]: '制作中',
  [ORDER_STATUS.READY]: '待取餐',
  [ORDER_STATUS.DONE]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REFUNDING]: '退款中',
  [ORDER_STATUS.REFUNDED]: '已退款',
  [ORDER_STATUS.REJECTED]: '已拒单',
  [ORDER_STATUS.PENDING_SHIP]: '待发货',
  [ORDER_STATUS.SHIPPED]: '已发货',
  [ORDER_STATUS.RECEIVED]: '已签收',
}

/**
 * UI 履约态 → 契约 service_mode（写路径）。
 * 自取（pack）契约为 2，但仍映射堂食 1，避免与购物袋分桶错位（DEV-010）。
 * 月卡 5 由会员 subscribe 造单，不经此函数。
 */
export function toServiceMode(session: {
  fulfillmentMode: FulfillmentMode | null
  pickupSubMode: PickupSubMode
}): ServiceMode | null {
  if (session.fulfillmentMode === 'delivery') return SERVICE_MODE.DELIVERY
  if (session.fulfillmentMode === 'dine_in') return SERVICE_MODE.DINE_IN
  return null
}

/**
 * 解析下单/加购用的 table_id。
 * 优先 session.tableId（扫码 resolve）；否则 A1–A3 本地回落（DEV-015）。
 */
export function toTableId(session: {
  tableId?: number | null
  tableCode?: string | null
}): number | null {
  const id = session.tableId
  if (id != null && Number.isInteger(id) && id > 0) return id
  const code = session.tableCode
  if (code == null || code === '') return null
  if (code === 'A1' || code === 'A2' || code === 'A3') {
    return TABLE_ID_BY_CODE[code]
  }
  return null
}

export function serviceModeLabel(mode: number): string {
  if (mode === SERVICE_MODE.DINE_IN) return '店内就餐'
  if (mode === SERVICE_MODE.PICKUP) return '到店自取'
  if (mode === SERVICE_MODE.DELIVERY) return '外卖配送'
  if (mode === SERVICE_MODE.MALL) return '礼品快递'
  if (mode === SERVICE_MODE.MEMBER_CARD) return '会员月卡'
  return '—'
}

export function orderStatusLabel(status: number): string {
  return ORDER_STATUS_LABELS[status] ?? '—'
}

/** 契约未写明可取消集合；本轮仅待支付可取消（已付走退款，本轮不做）。 */
export function canCancelOrder(status: number): boolean {
  return status === ORDER_STATUS.UNPAID
}
