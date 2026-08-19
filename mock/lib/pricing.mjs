/** 与前端 src/utils/pricing.ts 及 commerce.mjs 会员折对齐 */

export function parseMemberRate(rate) {
  if (rate == null || rate === '') return 1
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return 1
  if (n <= 1) return n
  if (n <= 100) return n / 100
  return 1
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function roundCoffeeMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10
}

export function applyMemberDiscount(amount, rate, kind) {
  const base = Math.max(0, Number(amount) || 0)
  if (base <= 0) return 0
  const mult = parseMemberRate(rate)
  if (mult >= 1) return roundMoney(base)
  const discounted = base * mult
  return kind === 'coffee' ? roundCoffeeMoney(discounted) : roundMoney(discounted)
}

/**
 * 券门槛判定小计：原价 → 会员折（饮品一位小数）。
 * @param {object|null} summary getMemberSummary 结果
 */
export function memberGoodsSubtotal(goodsAmount, serviceMode, summary) {
  const amount = Number(goodsAmount)
  if (!Number.isFinite(amount) || amount < 0) return 0
  const mode = Number(serviceMode || 1)
  if (!summary?.is_active) return amount
  const kind = mode === 4 ? 'mall' : 'coffee'
  const rate =
    kind === 'mall' ? summary.mall_discount_rate : summary.coffee_discount_rate
  return applyMemberDiscount(amount, rate, kind)
}
