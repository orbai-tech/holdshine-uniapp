import { getApiHostSync } from '@/config/apiHost'

/** 兜底图，用于图片加载失败或无地址时显示 */
export const FALLBACK_IMAGE = '/static/images/products/latte.jpg'

/**
 * 从完整地址提取 origin（协议 + 主机 + 端口）。
 * 不用 new URL()：部分小程序基础库/低版本 JSCore 没有全局 URL。
 */
function parseOrigin(url: string): string {
  const matched = url.match(/^https?:\/\/[^/]+/)
  return matched ? matched[0] : ''
}

/**
 * 后端图片地址可能以 127.0.0.1/localhost 存储（开发机本机地址）。
 * 模拟器跑在电脑上能访问，真机上的 127.0.0.1 却指手机自己。
 * 这里把回环主机替换为当前 API 主机（局域网 IP），修复真机裂图。
 * H5 开发时 VITE_API_BASE_URL 为 /api（无 origin），不替换，保持后端原样。
 */
function rewriteLoopback(url: string): string {
  const origin = parseOrigin(url)
  if (!origin) return url
  const hostname = origin.replace(/^https?:\/\//, '').split(':')[0].toLowerCase()
  if (hostname !== '127.0.0.1' && hostname !== 'localhost' && hostname !== '0.0.0.0') {
    return url
  }
  const apiOrigin = parseOrigin(getApiHostSync())
  if (!apiOrigin) return url
  return url.replace(origin, apiOrigin)
}

/** 相对路径封面拼到当前 API 主机；无地址时用本地占位图。 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return FALLBACK_IMAGE
  if (/^https?:\/\//.test(path)) return rewriteLoopback(path)
  // 小程序包内 static，不能拼 API 主机
  if (path.startsWith('/static/')) return path
  const base = getApiHostSync().replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (/^https?:\/\//.test(base)) return `${base}${suffix}`
  return suffix
}

/** 从完整地址猜测图片 mime（仅作响应头 Content-Type 缺失时的兜底） */
function guessImageMime(url: string): string {
  const clean = url.split('?')[0].toLowerCase()
  if (clean.endsWith('.png')) return 'image/png'
  if (clean.endsWith('.gif')) return 'image/gif'
  if (clean.endsWith('.webp')) return 'image/webp'
  if (clean.endsWith('.svg')) return 'image/svg+xml'
  return 'image/jpeg'
}

/**
 * 用 wx.request 拉取网络图片并转为 base64 dataURL（data:image/xxx;base64,...）。
 *
 * 为什么需要它：
 *   真机调试时微信对 image 组件（走 downloadFile 通道）的域名校验很严，
 *   未配置合法域名的 HTTP 局域网图会被拦截，表现为「模拟器能显示、真机裂图」；
 *   而 wx.request（request 通道）在真机调试下通常放行。因此图片加载失败时，
 *   改走本函数把图片取回来转 base64，即可绕过该限制。生产环境用 HTTPS 正式
 *   域名时图片直连成功，不会走到这条降级路径。
 */
export function fetchImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 10_000,
      success(res) {
        const data = res.data as ArrayBuffer | undefined
        if (!data || typeof data.byteLength !== 'number' || data.byteLength === 0) {
          reject(new Error('图片数据为空'))
          return
        }
        const header = (res.header || {}) as Record<string, string>
        const rawType = header['Content-Type'] || header['content-type'] || ''
        const mime = rawType.split(';')[0].trim() || guessImageMime(url)
        const base64 = uni.arrayBufferToBase64(data)
        resolve(`data:${mime};base64,${base64}`)
      },
      fail: reject,
    })
  })
}
