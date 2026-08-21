/** 预留微信支付参数形状；mock 通路带 mock: true。 */

export interface PrepayReq {
  /** 真契约 string；18 位雪花大整数，前端禁止 Number() */
  order_id: string
  /** 客户端幂等键：同一次支付提交复用（真契约必填） */
  client_token: string
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
  /** 真契约 string；18 位雪花大整数 */
  order_id: string
  /** 客户端幂等键：同一次支付提交复用（真契约必填） */
  client_token: string
}
