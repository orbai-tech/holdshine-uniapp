import type { WxLoginCodePayload, WxLoginPlatform } from '@/common/types/auth'
import { toErrorMessage } from '@/utils/errorMessage'

function currentPlatform(): WxLoginPlatform {
  let platform: WxLoginPlatform = 'devtools'
  // #ifdef MP-WEIXIN
  platform = 'mp-weixin'
  // #endif
  // #ifdef H5
  platform = 'h5'
  // #endif
  return platform
}

function requestWxCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      success(result) {
        if (!result.code) {
          reject(new Error('未拿到微信登录 code'))
          return
        }
        resolve(result.code)
      },
      fail(error) {
        reject(new Error(toErrorMessage(error, '微信登录失败')))
      },
    })
  })
}

/**
 * 微信小程序走 uni.login 换临时 code；H5 使用开发码。
 * 不调用已废弃的 getSystemInfoSync，避免新基础库直接抛错导致无请求。
 */
export async function getWxLoginCode(): Promise<WxLoginCodePayload> {
  const platform = currentPlatform()
  if (platform !== 'mp-weixin') {
    return {
      code: `h5-dev-${Date.now()}`,
      platform,
    }
  }

  try {
    const code = await requestWxCode()
    return { code, platform }
  } catch (error) {
    console.warn('[元气善筑] uni.login 失败，回落开发 code（真实后端会拒绝，仅供联调排查）', error)
    return {
      code: `dev-wx-fallback-${Date.now()}`,
      platform,
    }
  }
}
