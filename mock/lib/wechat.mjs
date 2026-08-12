import { config } from '../config.mjs'
import { mockOpenidFromCode, upsertUser } from './store.mjs'

function isDevCode(code) {
  return /^(h5-dev-|dev-|mock-)/i.test(code)
}

async function code2Session(code) {
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', config.wxAppId)
  url.searchParams.set('secret', config.wxSecret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`微信接口 HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * 优先用 AppID + AppSecret 调微信 code2Session。
 * 开发 code、缺凭证或微信返回错误时，回落为稳定的模拟 openid，保证本地联调能走通。
 */
export async function exchangeCode(code, platform = 'devtools') {
  if (!code) {
    throw Object.assign(new Error('缺少 code'), { status: 400 })
  }

  if (!isDevCode(code) && config.wxLiveLogin && config.wxAppId && config.wxSecret) {
    try {
      const wx = await code2Session(code)
      if (wx.openid) {
        const user = upsertUser({
          openid: wx.openid,
          nickname: platform === 'mp-weixin' ? '微信用户' : '陈先生',
        })
        return { user, mock: false, sessionKey: wx.session_key || '', unionid: wx.unionid || '' }
      }
      console.warn('[mock] code2Session 未返回 openid，回落模拟会话', wx)
    } catch (error) {
      console.warn('[mock] code2Session 调用失败，回落模拟会话', error)
    }
  }

  const user = upsertUser({
    openid: mockOpenidFromCode(code),
    nickname: '陈先生',
  })
  return { user, mock: true, sessionKey: '', unionid: '' }
}
