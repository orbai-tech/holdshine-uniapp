import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index <= 0) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadDotEnv(path.join(root, '.env'))

export const config = {
  root,
  port: Number(process.env.PORT) || 3780,
  tokenSecret: process.env.TOKEN_SECRET || 'soorak-mock-dev-token-secret',
  tokenExpiresIn: Number(process.env.TOKEN_EXPIRES_IN) || 7200,
  wxAppId: process.env.WX_APPID || '',
  wxSecret: process.env.WX_SECRET || '',
  wxLiveLogin: String(process.env.WX_LIVE_LOGIN || 'true') === 'true',
}
