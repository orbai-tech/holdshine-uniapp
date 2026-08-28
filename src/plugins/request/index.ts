import { requestInterceptor, responseErrorInterceptor, responseInterceptor } from './interceptors'
import { ensureApiHost } from '@/config/apiHost'

interface RequestOptions<TData extends UniApp.RequestOptions['data'] = UniApp.RequestOptions['data']> {
  url: string
  method?: UniApp.RequestOptions['method']
  data?: TData
  header?: Record<string, string>
  showError?: boolean
}

const timeout = Number(import.meta.env.VITE_API_TIMEOUT) || 10_000

/**
 * 跨端请求封装：使用 uni.request，避免浏览器专用 Axios 适配问题。
 * 页面只调用 common/apis 中的领域函数，不直接拼接接口地址。
 * 微信小程序端会先经 apiHost 健康探测确定当前后端主机，后端换地址无需改码。
 */
async function execute<TResponse, TData extends UniApp.RequestOptions['data'] = UniApp.RequestOptions['data']>(options: RequestOptions<TData>): Promise<TResponse> {
  const baseURL = await ensureApiHost()
  return new Promise((resolve, reject) => {
    const requestOptions: UniApp.RequestOptions = {
      url: options.url.startsWith('http') ? options.url : `${baseURL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      timeout,
      header: options.header,
      success(response: UniApp.RequestSuccessCallbackResult) {
        try {
          resolve(responseInterceptor<TResponse>(response, options.showError !== false))
        } catch (error) {
          reject(error)
        }
      },
      fail(error: UniApp.GeneralCallbackResult) {
        reject(responseErrorInterceptor(error, options.showError !== false))
      },
    }

    uni.request(requestInterceptor(requestOptions))
  })
}

type RequestData = UniApp.RequestOptions['data']
type HttpOptions = Pick<RequestOptions, 'header' | 'showError'>

/**
 * 与 Web 模板保持一致的 HTTP 调用风格。
 * 底层仍使用跨端的 uni.request，业务模块只调用 http.get/post/put/del。
 * DELETE 用 `del` 而非 `delete`：微信小程序运行时对跨模块的 `delete` 属性访问不稳定。
 */
export const http = {
  get<T>(url: string, data?: RequestData, options: HttpOptions = {}) {
    return execute<T>({ ...options, url, data, method: 'GET' })
  },

  post<T>(url: string, data?: RequestData, options: HttpOptions = {}) {
    return execute<T>({ ...options, url, data, method: 'POST' })
  },

  put<T>(url: string, data?: RequestData, options: HttpOptions = {}) {
    return execute<T>({ ...options, url, data, method: 'PUT' })
  },

  del<T>(url: string, data?: RequestData, options: HttpOptions = {}) {
    return execute<T>({ ...options, url, data, method: 'DELETE' })
  },
}

export default http
