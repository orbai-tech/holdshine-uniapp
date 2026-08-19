import type { MpPointLedgerRes } from '@/common/types/points'

const BIZ_CODE_LABELS: Record<string, string> = {
  earn_pay: '支付赠分',
  mall_pay: '积分抵扣',
  adjust: '人工调账',
  refund: '退款回退',
}

/** 流水标题：优先 remark，其次 biz_code 映射，最后原文 */
export function formatLedgerTitle(row: MpPointLedgerRes): string {
  const remark = row.remark?.trim()
  if (remark) return remark
  const code = row.biz_code?.trim()
  if (code && BIZ_CODE_LABELS[code]) return BIZ_CODE_LABELS[code]
  if (code) return code
  return '积分变动'
}

export function formatLedgerPoints(changePoints: number): string {
  if (changePoints > 0) return `+${changePoints}`
  return String(changePoints)
}

export function formatLedgerTime(createdAt?: string | null): string {
  if (!createdAt) return '—'
  const text = createdAt.replace('T', ' ').replace(/\+08:00$/, '')
  return text.slice(0, 16)
}
