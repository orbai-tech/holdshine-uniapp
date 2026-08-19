import { stores } from './fixtures.mjs'

/** 0停用、1空闲、2用餐中、3待清台 */
const TABLE_STATUS_IDLE = 1
const TABLE_STATUS_DINING = 2

const TABLES = [
  {
    qr_token: 'table-a1',
    table_id: '1',
    store_id: '1',
    table_code: 'A1',
    table_name: '窗边 A1',
    table_status: TABLE_STATUS_IDLE,
    occupied: false,
    sort_no: 1,
    capacity: 2,
    current_order_id: null,
  },
  {
    qr_token: 'table-a2',
    table_id: '2',
    store_id: '1',
    table_code: 'A2',
    table_name: '中庭 A2',
    table_status: TABLE_STATUS_IDLE,
    occupied: false,
    sort_no: 2,
    capacity: 4,
    current_order_id: null,
  },
  {
    qr_token: 'table-a3',
    table_id: '4',
    store_id: '1',
    table_code: 'A3',
    table_name: '吧台 A3',
    table_status: TABLE_STATUS_DINING,
    occupied: true,
    sort_no: 3,
    capacity: 2,
    current_order_id: '9001',
  },
  {
    qr_token: 'table-b1',
    table_id: '3',
    store_id: '2',
    table_code: 'B1',
    table_name: '卡座 B1',
    table_status: TABLE_STATUS_IDLE,
    occupied: false,
    sort_no: 1,
    capacity: 4,
    current_order_id: null,
  },
]

function findByToken(qrToken) {
  const token = String(qrToken || '').trim()
  if (!token) return null
  // 支持完整 URL 带 ?qr_token=
  let key = token
  try {
    if (token.includes('qr_token=')) {
      const u = new URL(token, 'https://local.mock')
      key = u.searchParams.get('qr_token') || token
    }
  } catch {
    /* ignore */
  }
  return TABLES.find((row) => row.qr_token === key) ?? null
}

function findById(tableId) {
  const id = String(tableId)
  return TABLES.find((row) => row.table_id === id) ?? null
}

function storeNameOf(storeId) {
  const store = stores.find((item) => String(item.store_id) === String(storeId))
  return store?.store_name || '元气善筑门店'
}

/** POST /api/mp/customer/tables/{id}/occupy */
export function occupyTable(tableId) {
  const row = findById(tableId)
  if (!row) {
    throw Object.assign(new Error('桌台不存在'), { code: 40400 })
  }
  if (row.table_status === 0) {
    throw Object.assign(new Error('桌台已停用'), { code: 40000 })
  }
  // mock：已占用也允许再次入座，方便反复联调同一桌码
  row.table_status = TABLE_STATUS_DINING
  row.occupied = true
  return {
    table_id: row.table_id,
    store_id: row.store_id,
    table_code: row.table_code,
    table_name: row.table_name,
    table_status: row.table_status,
    occupied: row.occupied,
    sort_no: row.sort_no,
    capacity: row.capacity,
    current_order_id: row.current_order_id,
  }
}

/** GET /api/mp/customer/tables/resolve */
export function resolveTable(qrToken) {
  const row = findByToken(qrToken)
  if (!row) {
    throw Object.assign(new Error('桌码无效'), { code: 40400 })
  }
  // mock：解析时把已占用桌恢复为空闲，避免上次 occupy 后前端只能选到下一张空桌
  if (row.table_status === TABLE_STATUS_DINING) {
    row.table_status = TABLE_STATUS_IDLE
    row.occupied = false
    row.current_order_id = null
  }
  return {
    store_id: row.store_id,
    store_name: storeNameOf(row.store_id),
    table_id: row.table_id,
    table_code: row.table_code,
    table_name: row.table_name,
    table_status: row.table_status,
  }
}

/** GET /api/mp/customer/stores/{store_id}/tables/available */
export function listAvailableTables(storeId) {
  const id = String(storeId)
  const store = stores.find((item) => String(item.store_id) === id)
  if (!store) {
    throw Object.assign(new Error('门店不存在'), { code: 40400 })
  }
  const list = TABLES.filter((row) => row.store_id === id).map((row) => ({
    table_id: row.table_id,
    table_code: row.table_code,
    table_name: row.table_name,
    capacity: row.capacity ?? null,
    table_status: row.table_status,
    selectable: row.table_status === TABLE_STATUS_IDLE,
  }))
  return {
    store_id: id,
    store_name: store.store_name || storeNameOf(id),
    list,
  }
}
