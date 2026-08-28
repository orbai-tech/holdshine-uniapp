/**
 * 后端主机动态解析
 * ============================================================================
 * 后端 API 返回的图片等都是相对路径（uploads/...），主机地址由前端拼接。
 * 因此只要这里能正确确定「当前 API 主机」，接口与图片就都会跟随走。
 *
 * 探测策略（微信小程序端）：
 *   1. 读上次探测成功的地址（storage 缓存），快速验证一次，可达即复用；
 *   2. 按顺序探测候选列表，第一个可达的生效并写入缓存；
 *   3. 全部不可达时回退首选候选，让业务层暴露真实错误。
 *   探测完成后冷启动小程序即可重新匹配，后端地址变化无需重新编译。
 *
 * 后端换电脑 / 换 IP 的两种快速改法（任选其一）：
 *   A. 改本文件候选列表，把新地址放到最前面，保存后重启 dev 编译；
 *   B. 改 .env.development 的 VITE_API_BASE_URL（会自动成为首选候选），
 *      改完重启 npm run dev:mp-weixin。
 *
 * 上线正式域名：
 *   在 .env.production 中配置 VITE_API_BASE_URL=https://你的域名，
 *   它会自动成为首选候选；同时在微信公众平台配置
 *   request / uploadFile / downloadFile 合法域名。
 */

const envBase = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const STORAGE_KEY = 'soorak_api_host'
const PROBE_TIMEOUT = 2500
const HEALTH_PATH = '/health'

// #ifdef MP-WEIXIN
/** 候选主机（协议+主机+端口，不含路径）。顺序即优先级，首个可达即生效。 */
const candidates = buildCandidates()

function buildCandidates(): string[] {
  const list: string[] = []
  // 编译期配置的地址（正式域名或 .env.development 里的局域网地址）优先
  if (/^https?:\/\//.test(envBase)) list.push(envBase)
  // 局域网开发机候选：后端换电脑时把新地址放最前面
  list.push('http://192.168.10.62:8000')
  if (!list.includes('http://127.0.0.1:8000')) list.push('http://127.0.0.1:8000')
  return list
}

/** 已确定的主机（内存态） */
let resolvedHost = ''

/** 探测进行中的单例，避免并发重复探测 */
let probing: Promise<string> | null = null

/** 探测某主机是否可达：能拿到任意 HTTP 响应即视为可达，仅连接失败/超时视为不可达 */
function probe(base: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.request({
      url: `${base}${HEALTH_PATH}`,
      method: 'GET',
      timeout: PROBE_TIMEOUT,
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
}

async function doProbe(): Promise<string> {
  // 1. 缓存地址快速验证，避免每次都从候选列表重跑
  const cached = uni.getStorageSync(STORAGE_KEY) as string
  if (cached && candidates.includes(cached) && (await probe(cached))) {
    resolvedHost = cached
    return cached
  }
  // 2. 按序探测候选，自动匹配当前可达的后端
  for (const base of candidates) {
    const reachable = await probe(base)
    console.info(`[apiHost] 探测 ${base} → ${reachable ? '可达' : '不可达'}`)
    if (reachable) {
      resolvedHost = base
      uni.setStorageSync(STORAGE_KEY, base)
      console.info(`[apiHost] 当前主机: ${base}`)
      return base
    }
  }
  // 3. 全部不可达：回退首选，让业务层展示真实错误
  const fallback = candidates[0] || envBase
  resolvedHost = fallback
  return fallback
}
// #endif

/**
 * 异步解析当前 API 主机（微信小程序端做健康探测；H5 直接用 env 配置，走 Vite 代理）。
 * 所有接口请求发出前都应先 await 本函数，保证首次请求即使用探测结果。
 */
export function ensureApiHost(): Promise<string> {
  // #ifdef MP-WEIXIN
  if (resolvedHost) return Promise.resolve(resolvedHost)
  if (!probing) {
    probing = doProbe()
    void probing.then(
      () => {
        probing = null
      },
      () => {
        probing = null
      },
    )
  }
  return probing
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve(envBase || '/api')
  // #endif
}

/**
 * 同步读取当前已知主机，供图片等非阻塞场景使用。
 * 页面通常在接口数据返回后才计算图片地址，此时探测多半已完成，取值即正确。
 * 探测未完成时回退到缓存或首选候选，不影响渲染。
 */
export function getApiHostSync(): string {
  // #ifdef MP-WEIXIN
  if (resolvedHost) return resolvedHost
  const cached = uni.getStorageSync(STORAGE_KEY) as string
  if (cached) return cached
  return candidates[0] || envBase
  // #endif
  // #ifndef MP-WEIXIN
  return envBase || '/api'
  // #endif
}
