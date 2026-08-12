/** 微信 / uni 失败回调经常是 { errMsg }，不是 Error 实例。 */
export function toErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  if (error && typeof error === 'object' && 'errMsg' in error) {
    const message = String((error as { errMsg?: unknown }).errMsg || '')
    if (message) return message
  }
  return fallback
}
