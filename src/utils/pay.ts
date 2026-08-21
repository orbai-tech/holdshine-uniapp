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

/** mock / 开发态：可「暂不支付」留下待支付单，便于取消验收 */
function confirmMockPay(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '模拟支付',
      content: '确认支付？点「暂不支付」可留下待支付订单（可取消）。',
      confirmText: '支付',
      cancelText: '暂不支付',
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false),
    })
  })
}

export class PayCancelledError extends Error {
  constructor() {
    super('PAY_CANCELLED')
    this.name = 'PayCancelledError'
  }
}

/** H5/devtools：mock-paid；mp-weixin：真参走 requestPayment，缺参或 mock 标记走 mock-paid。 */
export async function settlePayment(
  orderId: number | string,
  prepay: PrepayRes,
  clientToken?: string,
): Promise<void> {
  // #ifndef MP-WEIXIN
  if (!(await confirmMockPay())) throw new PayCancelledError()
  await mockPaid(orderId, clientToken)
  return
  // #endif

  // #ifdef MP-WEIXIN
  if (prepay.mock || !hasPayParams(prepay)) {
    if (!(await confirmMockPay())) throw new PayCancelledError()
    await mockPaid(orderId, clientToken)
    return
  }
  try {
    await requestWxPayment(prepay)
  } catch (error) {
    if (import.meta.env.PROD) throw error
    // 开发态真参失败：仍给机会 mock 付或留下待支付
    if (!(await confirmMockPay())) throw new PayCancelledError()
    await mockPaid(orderId, clientToken)
  }
  // #endif
}
