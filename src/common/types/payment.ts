/** 预留微信支付参数形状；mock 通路带 mock: true。 */

export interface PrepayReq {
  /** path/body 契约为 integer；可从 OrderRes.order_id(string) 经 toOrderId 转换 */
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
