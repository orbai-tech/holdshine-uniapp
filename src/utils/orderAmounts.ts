import type { OrderItemRes, OrderRes } from '@/common/types/order'
import { SERVICE_MODE } from '@/common/types/orderEnums'
import { parseAmount } from '@/utils/money'

export interface OrderAmountRow {
  key: string
  label: string
  amount: string
  negative?: boolean
  total?: boolean
}

function feeRow(
  key: string,
  label: string,
  raw: string | undefined,
  negative = false,
): OrderAmountRow | null {
  if (parseAmount(raw) <= 0) return null
  return { key, label, amount: String(raw), negative }
}

/** 待支付 paid_amount 常为 "0.00"（字符串仍为真），行价回落到 unit_price。 */
export function itemLineAmount(item: OrderItemRes): string {
  if (parseAmount(item.paid_amount) > 0) return item.paid_amount
  return item.unit_price
}

/** 详情金额明细：月卡不展示商品/加料；有值才出包装/配送/会员折/券。 */
export function orderAmountRows(order: OrderRes): OrderAmountRow[] {
  const rows: OrderAmountRow[] = []
  if (order.service_mode !== SERVICE_MODE.MEMBER_CARD) {
    rows.push(
      { key: 'product', label: '商品', amount: order.product_amount },
      { key: 'option', label: '加料', amount: order.option_amount },
    )
  }

  const packing = feeRow('packing', '包装费', order.packing_fee)
  if (packing) rows.push(packing)
  const delivery = feeRow('delivery', '配送费', order.delivery_fee)
  if (delivery) rows.push(delivery)
  const member = feeRow('member', '会员折扣', order.member_discount_amount, true)
  if (member) rows.push(member)

  const coupon = parseAmount(order.coupon_amount)
  const discount = parseAmount(order.discount_amount)
  if (coupon > 0) {
    rows.push({ key: 'coupon', label: '优惠券', amount: String(order.coupon_amount), negative: true })
  } else if (discount > 0) {
    rows.push({ key: 'discount', label: '优惠', amount: String(order.discount_amount), negative: true })
  }

  rows.push({
    key: 'payable',
    label: '应付',
    amount: order.payable_amount,
    total: true,
  })
  return rows
}
