import type { DeliveryChannelRes, DeliveryQuoteRes } from '@/common/types/delivery'
import { parseAmount } from '@/utils/money'

/**
 * 产品默认配送通道为微信即时配送（wechat）。
 * 本地 mock 后端已删除，联调走真实后端的微信即时配送通道。
 */
export const PREFERRED_DELIVERY_PROVIDER = 'wechat' as const
export const ACTIVE_DELIVERY_PROVIDER: 'mock' | 'wechat' = 'wechat'

/** 可选可用渠道：enabled 且 ready */
export function pickReadyChannels(list: DeliveryChannelRes[] | null | undefined): DeliveryChannelRes[] {
  if (!list?.length) return []
  return list.filter((item) => item.enabled && item.ready)
}

/** 默认渠道：优先微信即时配送，否则列表首个可用 */
export function defaultChannelCode(list: DeliveryChannelRes[] | null | undefined): string | null {
  const ready = pickReadyChannels(list)
  const preferred = ready.find((item) => item.code === PREFERRED_DELIVERY_PROVIDER)
  if (preferred) return preferred.code
  const active = ready.find((item) => item.code === ACTIVE_DELIVERY_PROVIDER)
  return active?.code ?? ready[0]?.code ?? null
}

/** 地址 id 是否可作 quote / 下单 path 透传；18 位雪花大整数禁止 Number() */
export function parseAddressId(raw: string | number | null | undefined): string | null {
  if (raw == null || raw === '') return null
  const id = String(raw).trim()
  if (!/^\d+$/.test(id) || id === '0') return null
  return id
}

/** quote 是否允许提交外卖单 */
export function canSubmitDeliveryQuote(quote: DeliveryQuoteRes | null | undefined): boolean {
  if (!quote) return false
  return quote.in_range === true && quote.meet_min_order === true
}

/** 商品应付（已扣券）+ 运费 + 包装费 */
export function calcDeliveryPayable(
  goodsPayable: number,
  quote: DeliveryQuoteRes | null | undefined,
): number {
  const delivery = quote ? parseAmount(quote.delivery_fee) : 0
  const packing = quote ? parseAmount(quote.packing_fee) : 0
  const total = Math.max(0, goodsPayable) + delivery + packing
  return Math.round(total * 100) / 100
}
