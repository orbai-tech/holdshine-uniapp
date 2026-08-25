/** 顾客会员月卡 mock：summary / levels / benefits / subscribe / subscriptions */

import { createMemberCardOrder, registerMemberSummaryProvider } from './commerce.mjs'
import { getPointsAccount } from './points.mjs'

const LEVELS = [
  {
    member_level_id: '2',
    level_code: 'gold',
    level_name: '金卡',
    level_rank: 2,
    coffee_discount_rate: '0.90',
    mall_discount_rate: '0.95',
    monthly_price: '49.00',
    duration_days: 30,
    benefits_description: '全场饮品 9 折；商城 95 折；生日燕窝饮兑换；双倍积分日',
    points_bonus_rate: 110,
  },
]

const BENEFITS_DESCRIPTION =
  '会员月卡为金卡档，享受饮品与商城折扣；续费叠加天数。权益以开通时档位为准，到期后恢复基础会员。'

const stateByOpenid = new Map()

function goldLevel() {
  return LEVELS.find((lv) => lv.level_code === 'gold') || LEVELS[0]
}

function coerceStateToGold(state) {
  const gold = goldLevel()
  if (!gold) return
  const current = findLevel(state.currentLevelId)
  if (current?.level_code !== 'gold') {
    state.currentLevelId = gold.member_level_id
  }
  if (!Array.isArray(state.subscriptions)) return
  for (const row of state.subscriptions) {
    const name = String(row.target_level_name || '')
    const codeOrId = String(row.target_level_id || '')
    if (name !== '铂金' && codeOrId !== '3') continue
    row.target_level_name = gold.level_name
    row.target_level_id = gold.member_level_id
  }
}

function ensureState(openid) {
  const key = String(openid || '')
  if (!stateByOpenid.has(key)) {
    const gold = goldLevel()
    const expires = new Date()
    expires.setDate(expires.getDate() + 18)
    stateByOpenid.set(key, {
      currentLevelId: gold.member_level_id,
      expiresAt: expires.toISOString(),
      remainingDays: 18,
      isActive: true,
      subscriptions: [
        {
          subscription_id: '9001',
          target_level_id: gold.member_level_id,
          target_level_name: gold.level_name,
          action_type: 1,
          pay_amount: gold.monthly_price,
          pay_status: 2,
          order_id: '8801',
          paid_at: '2026-07-30T12:00:00+08:00',
          period_start: '2026-07-30',
          period_end: expires.toISOString().slice(0, 10),
          created_at: '2026-07-30T12:00:00+08:00',
        },
      ],
      nextSubId: 9002,
      subscribeByToken: new Map(),
    })
  }
  const state = stateByOpenid.get(key)
  coerceStateToGold(state)
  return state
}

function normalizeClientToken(raw) {
  const token = String(raw || '').trim()
  if (token.length < 8 || token.length > 64) {
    throw Object.assign(new Error('缺少 client_token'), { code: 40000 })
  }
  return token
}

function findLevel(levelId) {
  const id = String(levelId)
  return LEVELS.find((lv) => lv.member_level_id === id) || null
}

function remainingDaysOf(state) {
  if (!state.isActive || !state.expiresAt) return 0
  const end = new Date(state.expiresAt).getTime()
  if (!Number.isFinite(end)) return state.remainingDays || 0
  const days = Math.ceil((end - Date.now()) / (24 * 3600 * 1000))
  return Math.max(0, days)
}

function buildSummary(openid, state) {
  const level = findLevel(state.currentLevelId) || LEVELS[0]
  const points = getPointsAccount(openid)
  const remaining = remainingDaysOf(state)
  return {
    member_no: '88001266',
    member_level_id: level.member_level_id,
    level_code: level.level_code,
    level_name: level.level_name,
    level_rank: level.level_rank,
    coffee_discount_rate: level.coffee_discount_rate,
    mall_discount_rate: level.mall_discount_rate,
    expires_at: state.isActive ? state.expiresAt : null,
    remaining_days: remaining,
    is_active: Boolean(state.isActive && remaining > 0),
    benefits_description: level.benefits_description,
    available_points: points.available_points ?? 0,
    points_bonus_rate: level.points_bonus_rate ?? null,
  }
}

function buildOffers(state) {
  const current = findLevel(state.currentLevelId)
  const currentRank = current?.level_rank ?? 0
  const remaining = remainingDaysOf(state)

  return LEVELS.map((level) => {
    const base = {
      ...level,
      purchasable: true,
      remaining_days: remaining,
      low_residual_amount: null,
    }

    if (!state.isActive || remaining <= 0) {
      return {
        ...base,
        action_type: 1,
        pay_amount: level.monthly_price,
      }
    }

    if (level.level_rank === currentRank) {
      return {
        ...base,
        action_type: 2,
        pay_amount: level.monthly_price,
      }
    }

    if (level.level_rank > currentRank) {
      const high = Number(level.monthly_price)
      const low = Number(current.monthly_price)
      const residual = Math.max(0, (remaining / 30) * low)
      const pay = Math.max(0, high - residual).toFixed(2)
      return {
        ...base,
        action_type: 3,
        pay_amount: pay,
        low_residual_amount: residual.toFixed(2),
      }
    }

    return {
      ...base,
      purchasable: false,
      action_type: null,
      pay_amount: null,
    }
  })
}

/** GET /api/mp/customer/member/summary */
export function getMemberSummary(openid) {
  const state = ensureState(openid)
  return buildSummary(openid, state)
}

/** GET /api/mp/customer/member/levels */
export function getMemberLevels(openid) {
  const state = ensureState(openid)
  return { list: buildOffers(state) }
}

/** GET /api/mp/customer/member/benefits */
export function getMemberBenefits(openid) {
  const state = ensureState(openid)
  return {
    current: buildSummary(openid, state),
    levels: { list: buildOffers(state) },
    description: BENEFITS_DESCRIPTION,
  }
}

/** GET /api/mp/customer/member/subscriptions */
export function listMemberSubscriptions(openid) {
  const state = ensureState(openid)
  return { list: [...state.subscriptions] }
}

/**
 * POST /api/mp/customer/member/subscribe
 * 创建待支付月卡订单；支付成功后由 applyMemberPaid 生效（或前端 mock-paid 后再次拉摘要仍可手动刷新）。
 * 本 mock：subscribe 时先落待支付记录，mock-paid 后调用 applyMemberPaid 更新档位。
 */
export function subscribeMember(openid, body) {
  const state = ensureState(openid)
  const clientToken = normalizeClientToken(body?.client_token)
  state.subscribeByToken = state.subscribeByToken || new Map()
  const cached = state.subscribeByToken.get(clientToken)
  if (cached) return { ...cached }

  // 契约字段名 level_id（旧版 target_level_id 已废弃，兼容读取）
  const targetId = String(body?.level_id ?? body?.target_level_id ?? '')
  if (!/^\d+$/.test(targetId) || targetId === '0') {
    throw Object.assign(new Error('缺少 level_id'), { code: 40000 })
  }
  const offers = buildOffers(state)
  const offer = offers.find((item) => String(item.member_level_id) === targetId)
  if (!offer || !offer.purchasable) {
    throw Object.assign(new Error('该档位不可购买'), { code: 40000 })
  }
  if (offer.level_code === 'platinum' || offer.level_name === '铂金') {
    throw Object.assign(new Error('该档位暂不提供'), { code: 40000 })
  }

  const payAmount = offer.pay_amount || offer.monthly_price
  const order = createMemberCardOrder(openid, {
    payable_amount: payAmount,
    title: `会员月卡·${offer.level_name}`,
  })

  const subId = String(state.nextSubId++)
  const pending = {
    subscription_id: subId,
    target_level_id: offer.member_level_id,
    target_level_name: offer.level_name,
    action_type: offer.action_type || 1,
    pay_amount: String(payAmount),
    pay_status: 1,
    order_id: order.order_id,
    paid_at: null,
    period_start: null,
    period_end: null,
    created_at: new Date().toISOString(),
  }
  state.subscriptions.unshift(pending)
  state.pendingByOrderId = state.pendingByOrderId || new Map()
  state.pendingByOrderId.set(String(order.order_id), {
    subscription_id: subId,
    target_level_id: offer.member_level_id,
    action_type: offer.action_type || 1,
    duration_days: offer.duration_days,
  })

  const result = {
    subscription_id: subId,
    order_id: order.order_id,
    payment_no: `MP${order.order_id}`,
    action_type: offer.action_type || 1,
    pay_amount: String(payAmount),
    list_price: offer.monthly_price,
    remaining_days: remainingDaysOf(state),
    low_residual_amount: offer.low_residual_amount,
    expires_at_after: null,
    target_level_id: offer.member_level_id,
    target_level_name: offer.level_name,
  }
  state.subscribeByToken.set(clientToken, result)
  return { ...result }
}

/** mock-paid 后由 server 调用：把待支付订阅标记已付并延长/升档 */
export function applyMemberPaid(openid, orderId) {
  const state = ensureState(openid)
  if (!state.pendingByOrderId) return
  const pending = state.pendingByOrderId.get(String(orderId))
  if (!pending) return

  const level = findLevel(pending.target_level_id)
  if (!level) return

  const now = new Date()
  let start = now
  const remaining = remainingDaysOf(state)
  if (state.isActive && remaining > 0 && state.expiresAt) {
    if (pending.action_type === 2) {
      start = new Date(state.expiresAt)
    } else if (pending.action_type === 3) {
      start = now
    }
  }

  const end = new Date(start)
  end.setDate(end.getDate() + (pending.duration_days || 30))
  if (pending.action_type === 2 && state.isActive && remaining > 0) {
    // 续费：在现有到期日上叠加
    const base = new Date(state.expiresAt)
    base.setDate(base.getDate() + (pending.duration_days || 30))
    state.expiresAt = base.toISOString()
  } else {
    state.expiresAt = end.toISOString()
  }
  state.currentLevelId = level.member_level_id
  state.isActive = true
  state.remainingDays = remainingDaysOf(state)

  const row = state.subscriptions.find((s) => s.subscription_id === pending.subscription_id)
  if (row) {
    row.pay_status = 2
    row.paid_at = now.toISOString()
    row.period_start = now.toISOString().slice(0, 10)
    row.period_end = new Date(state.expiresAt).toISOString().slice(0, 10)
  }
  state.pendingByOrderId.delete(String(orderId))
}

registerMemberSummaryProvider(getMemberSummary)
