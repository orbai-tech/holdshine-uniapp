/**
 * 内存地址簿：对齐 AddressUpsertReq / AddressRes。
 * address_id 出参为 string；path 仍用 integer。
 */

let nextId = 1
/** openid → AddressRes[] */
const books = new Map()

function clone(row) {
  return { ...row }
}

function requireText(value, label) {
  const text = value == null ? '' : String(value).trim()
  if (!text) {
    throw Object.assign(new Error(`缺少 ${label}`), { code: 40000 })
  }
  return text
}

function normalizeCoord(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return String(n)
}

function toRes(row) {
  return clone(row)
}

function bookOf(openid) {
  if (!books.has(openid)) books.set(openid, [])
  return books.get(openid)
}

function findIndex(openid, addressId) {
  const id = String(addressId)
  return bookOf(openid).findIndex((row) => row.address_id === id)
}

function clearDefault(list, exceptId = null) {
  for (const row of list) {
    if (exceptId != null && row.address_id === String(exceptId)) continue
    row.is_default = 0
  }
}

function applyUpsert(existing, body) {
  const contact_name = requireText(body.contact_name, 'contact_name')
  const mobile = requireText(body.mobile, 'mobile')
  const province = requireText(body.province, 'province')
  const city = requireText(body.city, 'city')
  const district = requireText(body.district, 'district')
  const address = requireText(body.address, 'address')
  const is_default = body.is_default === 1 || body.is_default === true ? 1 : 0
  return {
    ...(existing || {}),
    contact_name,
    mobile,
    province,
    city,
    district,
    address,
    longitude: normalizeCoord(body.longitude),
    latitude: normalizeCoord(body.latitude),
    tag: body.tag == null || body.tag === '' ? null : String(body.tag),
    is_default,
  }
}

export function listAddresses(openid) {
  return { list: bookOf(openid).map(toRes) }
}

export function createAddress(openid, body) {
  const list = bookOf(openid)
  const draft = applyUpsert(null, body)
  if (draft.is_default === 1 || list.length === 0) {
    clearDefault(list)
    draft.is_default = 1
  }
  const row = {
    ...draft,
    address_id: String(nextId++),
  }
  list.push(row)
  return toRes(row)
}

export function getAddress(openid, addressId) {
  const idx = findIndex(openid, addressId)
  if (idx < 0) {
    throw Object.assign(new Error('地址不存在'), { code: 40000 })
  }
  return toRes(bookOf(openid)[idx])
}

export function updateAddress(openid, addressId, body) {
  const list = bookOf(openid)
  const idx = findIndex(openid, addressId)
  if (idx < 0) {
    throw Object.assign(new Error('地址不存在'), { code: 40000 })
  }
  const next = applyUpsert(list[idx], body)
  next.address_id = String(addressId)
  if (next.is_default === 1) clearDefault(list, next.address_id)
  list[idx] = next
  return toRes(next)
}

export function deleteAddress(openid, addressId) {
  const list = bookOf(openid)
  const idx = findIndex(openid, addressId)
  if (idx < 0) {
    throw Object.assign(new Error('地址不存在'), { code: 40000 })
  }
  const removed = list.splice(idx, 1)[0]
  if (removed.is_default === 1 && list.length > 0) {
    list[0].is_default = 1
  }
  return null
}
