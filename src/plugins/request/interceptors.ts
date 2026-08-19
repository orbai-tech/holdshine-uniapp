import type { ApiResponse } from '@/common/types/api'
import { TOKEN_KEY, notifyUnauthorized } from '@/utils/authStorage'
import { toErrorMessage } from '@/utils/errorMessage'

/** 请求拦截器：在统一位置补充认证信息等公共请求头。 */
export function requestInterceptor(options: UniApp.RequestOptions): UniApp.RequestOptions {
  const token = uni.getStorageSync(TOKEN_KEY) as string | undefined
  return {
    ...options,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.header,
    },
  }
}

/** 响应拦截器：统一校验 HTTP 状态和业务响应结构，并返回业务数据。 */
export function responseInterceptor<T>(response: UniApp.RequestSuccessCallbackResult, showError = true): T {
  if (response.statusCode === 401) {
    notifyUnauthorized()
    if (showError) uni.showToast({ title: '登录已失效，请重新登录', icon: 'none' })
    throw new Error('UNAUTHORIZED')
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    if (showError) uni.showToast({ title: '网络请求失败', icon: 'none' })
    throw new Error(`HTTP ${response.statusCode}`)
  }

  const body = response.data as ApiResponse<T>
  const code = Number(body.code)
  if (code === 40100 || code === 40101 || code === 40102 || code === 40103) {
    notifyUnauthorized()
    if (showError) uni.showToast({ title: '登录已失效，请重新登录', icon: 'none' })
    throw new Error('UNAUTHORIZED')
  }
  if (code !== 0) {
    const error = new Error(body.message || '接口返回异常')
    if (showError) uni.showToast({ title: error.message, icon: 'none' })
    throw error
  }
  return body.data
}

/** 请求失败拦截器：统一展示跨端网络错误，并转成 Error 方便页面读取 errMsg。 */
export function responseErrorInterceptor(error: UniApp.GeneralCallbackResult, showError = true) {
  const message = toErrorMessage(error, '网络连接失败')
  if (showError) uni.showToast({ title: '网络连接失败', icon: 'none' })
  return new Error(message)
}
