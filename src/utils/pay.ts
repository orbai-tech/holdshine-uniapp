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

/** H5/devtools：mock-paid；mp-weixin：真参走 requestPayment，缺参或 mock 标记走 mock-paid。 */
export async function settlePayment(orderId: number, prepay: PrepayRes): Promise<void> {
  // #ifndef MP-WEIXIN
  await mockPaid(orderId)
  return
  // #endif

  // #ifdef MP-WEIXIN
  if (prepay.mock || !hasPayParams(prepay)) {
    await mockPaid(orderId)
    return
  }
  try {
    await requestWxPayment(prepay)
  } catch (error) {
    if (import.meta.env.PROD) throw error
    await mockPaid(orderId)
  }
  // #endif
}
