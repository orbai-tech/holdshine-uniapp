import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '../config.mjs'

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function sign(input) {
  return createHmac('sha256', config.tokenSecret).update(input).digest('base64url')
}

export function issueToken(payload, expiresIn = config.tokenExpiresIn) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  }
  const encoded = toBase64Url(JSON.stringify(body))
  const unsigned = `${header}.${encoded}`
  return {
    token: `${unsigned}.${sign(unsigned)}`,
    expiresIn,
  }
}

export function verifyToken(token) {
  if (!token || token.split('.').length !== 3) {
    throw new Error('INVALID_TOKEN')
  }
  const [header, encoded, signature] = token.split('.')
  const unsigned = `${header}.${encoded}`
  const expected = sign(unsigned)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error('INVALID_TOKEN')
  }
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new Error('TOKEN_EXPIRED')
  }
  return payload
}
