import { mockPaid } from '@/common/apis/paymentApi'
import type { PrepayRes } from '@/common/types/payment'

function hasPayParams(prepay: PrepayRes): boolean {
  return Boolean(prepay.timeStamp && prepay.nonceStr && prepay.package && prepay.paySign)
}

function requestWxPayment(prepay: PrepayRes): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: prepay.timeStamp,
      nonceStr: prepay.nonceStr,
      package: prepay.package,
      signType: prepay.signType || 'RSA',
      paySign: prepay.paySign,
      success() {
        resolve()
      },
      fail(error) {
        reject(error)
      },
    })
  })
}

/** 占位保留：下单弹窗已让用户明确「支付/暂缓」，支付流程不再抛出取消信号 */
export class PayCancelledError extends Error {
  constructor() {
    super('PAY_CANCELLED')
    this.name = 'PayCancelledError'
  }
}

/**
 * H5/devtools：走真实后端 mock-paid；
 * mp-weixin：真参走 requestPayment，缺参或带 mock 标记（后端已开 mock）
 * 直接走 mock-paid 一步完成支付，不再二次确认。
 */
export async function settlePayment(
  orderId: number | string,
  prepay: PrepayRes,
  clientToken?: string,
): Promise<void> {
  // #ifndef MP-WEIXIN
  await mockPaid(orderId, clientToken)
  return
  // #endif

  // #ifdef MP-WEIXIN
  if (prepay.mock || !hasPayParams(prepay)) {
    await mockPaid(orderId, clientToken)
    return
  }
  try {
    await requestWxPayment(prepay)
  } catch (error) {
    if (import.meta.env.PROD) throw error
    // 开发态真参失败：回退 mock 支付
    await mockPaid(orderId, clientToken)
  }
  // #endif
}
