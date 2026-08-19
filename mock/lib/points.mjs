/** 顾客积分账户与流水（mock）。按 openid 分桶。 */

const accounts = new Map()
const ledgers = new Map()

function ensureBucket(openid) {
  const key = String(openid || '')
  if (!accounts.has(key)) {
    accounts.set(key, {
      customer_id: key || '0',
      balance: '0',
      available_points: 1280,
      frozen_points: 0,
      total_earned_points: 1560,
      total_used_points: 280,
    })
    ledgers.set(key, [
      {
        ledger_id: '1003',
        ledger_no: 'PL20260815003',
        change_type: 1,
        biz_code: 'earn_pay',
        change_points: 36,
        balance_after: 1280,
        related_type: 'order',
        related_id: '9001',
        remark: '支付赠分',
        created_at: '2026-08-15T10:20:00+08:00',
      },
      {
        ledger_id: '1002',
        ledger_no: 'PL20260814002',
        change_type: 2,
        biz_code: 'mall_pay',
        change_points: -200,
        balance_after: 1244,
        related_type: 'order',
        related_id: '8802',
        remark: '商城积分抵扣',
        created_at: '2026-08-14T16:05:00+08:00',
      },
      {
        ledger_id: '1001',
        ledger_no: 'PL20260810001',
        change_type: 1,
        biz_code: 'earn_pay',
        change_points: 48,
        balance_after: 1444,
        related_type: 'order',
        related_id: '8701',
        remark: '支付赠分',
        created_at: '2026-08-10T11:30:00+08:00',
      },
      {
        ledger_id: '1000',
        ledger_no: 'PL20260801000',
        change_type: 1,
        biz_code: 'adjust',
        change_points: 200,
        balance_after: 1396,
        related_type: null,
        related_id: null,
        remark: '开业礼遇',
        created_at: '2026-08-01T09:00:00+08:00',
      },
    ])
  }
  return key
}

/** GET /api/mp/customer/points/account → MpPointAccountRes */
export function getPointsAccount(openid) {
  const key = ensureBucket(openid)
  return { ...accounts.get(key) }
}

/**
 * GET /api/mp/customer/points/ledger → PageResult[MpPointLedgerRes]
 */
export function listPointsLedger(openid, { page = 1, page_size = 20 } = {}) {
  const key = ensureBucket(openid)
  const all = ledgers.get(key) || []
  const p = Math.max(1, Number(page) || 1)
  const size = Math.min(100, Math.max(1, Number(page_size) || 20))
  const start = (p - 1) * size
  return {
    list: all.slice(start, start + size),
    total: all.length,
    page: p,
    page_size: size,
  }
}
