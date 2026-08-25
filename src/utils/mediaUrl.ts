/** 兜底图，用于图片加载失败或无地址时显示 */
export const FALLBACK_IMAGE = '/static/images/products/latte.jpg'

/** 相对路径封面拼到当前 API 主机；无地址时用本地占位图。 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return FALLBACK_IMAGE
  if (/^https?:\/\//.test(path)) return path
  // 小程序包内 static，不能拼 API 主机
  if (path.startsWith('/static/')) return path
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (/^https?:\/\//.test(base)) return `${base}${suffix}`
  return suffix
}
