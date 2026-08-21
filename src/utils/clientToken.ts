/** 幂等键：8–64 字符。CreateOrder / member subscribe 同一次提交内复用。 */
export function createClientToken(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 12)
  const token = `ck_${ts}_${rand}`
  if (token.length >= 8) return token.slice(0, 64)
  return token.padEnd(8, '0').slice(0, 64)
}

const INTENT_TTL_MS = 5 * 60 * 1000

export type WriteIntent = {
  acquire: (fingerprint: string) => string
  clear: () => void
  peek: () => { token: string; fingerprint: string } | null
}

/** 同意图：同指纹未过期则复用 client_token，供超时后再点命中服务端幂等。 */
export function createWriteIntent(_scope: string): WriteIntent {
  let active: { token: string; fingerprint: string; at: number } | null = null

  function expired() {
    if (!active) return true
    return Date.now() - active.at >= INTENT_TTL_MS
  }

  function acquire(fingerprint: string) {
    const fp = String(fingerprint || '')
    if (active && !expired() && active.fingerprint === fp) {
      return active.token
    }
    const token = createClientToken()
    active = { token, fingerprint: fp, at: Date.now() }
    return token
  }

  function clear() {
    active = null
  }

  function peek() {
    if (!active || expired()) return null
    return { token: active.token, fingerprint: active.fingerprint }
  }

  return { acquire, clear, peek }
}

/** 超时 / 连接失败：保留意图；业务错与成功：清空。 */
export function isRetriableNetworkError(error: unknown): boolean {
  if (!error) return false
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String((error as { errMsg?: string }).errMsg || '')
  return /网络|timeout|超时|fail|连接|TIMED_OUT|request:fail/i.test(raw)
}

export const orderCheckoutIntent = createWriteIntent('order_checkout')
export const memberSubscribeIntent = createWriteIntent('member_subscribe')
/** 支付意图：同一次支付提交（同订单 5 分钟内）复用同一 client_token，防连点重复提交 */
export const paymentIntent = createWriteIntent('payment')
