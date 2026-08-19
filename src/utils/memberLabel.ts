import { MEMBER_PAY_STATUS } from '@/common/types/member'
import { parseAmount } from '@/utils/money'

/** 折扣率 →「饮品 95 折」；支持 0.95 或 95 两种写法 */
export function discountRateLabel(rate: string | null | undefined, prefix: string): string {
  if (rate == null || rate === '') return ''
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return ''
  const percent = n <= 1 ? Math.round(n * 100) : Math.round(n)
  if (percent >= 100) return `${prefix}原价`
  if (percent % 10 === 0) return `${prefix}${percent / 10} 折`
  return `${prefix}${percent} 折`
}

/** 1开通 2续费 3升档 */
export function memberActionLabel(actionType: number | null | undefined): string {
  if (actionType === 1) return '开通'
  if (actionType === 2) return '续费'
  if (actionType === 3) return '升档'
  return '开通'
}

/** 订阅 pay_status 可读文案（契约未给枚举，常见 1 待支付 / 2 已支付） */
export function memberPayStatusLabel(payStatus: number | null | undefined): string {
  if (payStatus === MEMBER_PAY_STATUS.UNPAID) return '待支付'
  if (payStatus === MEMBER_PAY_STATUS.PAID) return '已支付'
  if (payStatus === MEMBER_PAY_STATUS.CLOSED) return '已关闭'
  if (payStatus == null) return '未知'
  return '未知'
}

/** benefits_description → perk 列表 */
export function splitBenefitsDescription(raw: string | null | undefined): string[] {
  if (!raw) return []
  const parts = raw
    .split(/[\n；;、|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length) return parts
  const trimmed = raw.trim()
  return trimmed ? [trimmed] : []
}

export function formatMemberPrice(amount: string | null | undefined): string {
  if (amount == null || amount === '') return '—'
  const n = parseAmount(amount)
  if (!Number.isFinite(n)) return '—'
  return `¥${n.toFixed(2).replace(/\.00$/, '')}`
}

/** ISO / 日期时间 → 展示用短日期 */
export function formatMemberDate(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = String(raw).trim()
  if (!trimmed) return ''
  const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  return trimmed.slice(0, 16)
}

/** 本期只提供金卡，不提供铂金档。 */
export function isOfferedMemberLevel(level: {
  level_code?: string | null
  level_name?: string | null
}): boolean {
  const code = String(level.level_code || '').trim().toLowerCase()
  if (code === 'platinum') return false
  const name = String(level.level_name || '').trim()
  if (name === '铂金') return false
  return true
}

const GOLD_SUMMARY_FALLBACK = {
  member_level_id: '2',
  level_code: 'gold',
  level_name: '金卡',
  coffee_discount_rate: '0.90',
  mall_discount_rate: '0.95',
  benefits_description: '全场饮品 9 折；商城 95 折；生日燕窝饮兑换；双倍积分日',
} as const

/** 历史铂金摘要映射为金卡展示与权益。 */
export function toGoldMemberSummary<T extends {
  level_code?: string | null
  level_name?: string | null
  member_level_id?: string
  coffee_discount_rate?: string
  mall_discount_rate?: string
  benefits_description?: string | null
}>(summary: T | null, goldOffer?: {
  member_level_id?: string
  level_code?: string | null
  level_name?: string | null
  coffee_discount_rate?: string
  mall_discount_rate?: string
  benefits_description?: string | null
} | null): T | null {
  if (!summary) return null
  if (isOfferedMemberLevel(summary)) return summary
  return {
    ...summary,
    member_level_id: goldOffer?.member_level_id || GOLD_SUMMARY_FALLBACK.member_level_id,
    level_code: goldOffer?.level_code || GOLD_SUMMARY_FALLBACK.level_code,
    level_name: goldOffer?.level_name || GOLD_SUMMARY_FALLBACK.level_name,
    coffee_discount_rate:
      goldOffer?.coffee_discount_rate || GOLD_SUMMARY_FALLBACK.coffee_discount_rate,
    mall_discount_rate: goldOffer?.mall_discount_rate || GOLD_SUMMARY_FALLBACK.mall_discount_rate,
    benefits_description:
      goldOffer?.benefits_description || GOLD_SUMMARY_FALLBACK.benefits_description,
  }
}

export function formatMemberNo(memberNo: string | null | undefined): string {
  if (!memberNo) return '—'
  const digits = String(memberNo).replace(/\s+/g, '')
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`
  }
  return digits
}
