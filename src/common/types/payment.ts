/** 预留微信支付参数形状；mock 通路带 mock: true。 */

export interface PrepayReq {
  order_id: number
}

export interface PrepayRes {
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
  mock?: boolean
}

export interface MockPaidReq {
  order_id: number
}
