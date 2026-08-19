import { http } from '@/plugins/request'
import type { AddressListRes, AddressRes, AddressUpsertReq } from '@/common/types/address'
import type { AddressGender, AddressTag, DeliveryAddress } from '@/common/types/fulfillment'

/** AddressRes.address_id 是 string，path 要 integer。失败抛错，不当 0。 */
export function toAddressId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('地址编号无效')
  }
  return id
}

/** 从地图选点或省市区文案解析行政区（忽略前置 POI 名）。 */
export function parseAddressRegion(region: string): {
  province: string
  city: string
  district: string
} {
  const text = region.trim()
  if (!text) return { province: '', city: '', district: '' }

  const parts = text.split(/\s+/).filter(Boolean)
  const isAdminPart = (part: string) =>
    /(?:省|市|区|县|旗|州|盟)$/.test(part) || /(?:自治区|特别行政区)$/.test(part)
  // 旧版 region picker：空格分隔「省 市 区」
  if (parts.length >= 2 && parts.length <= 3 && parts.every(isAdminPart)) {
    return {
      province: parts[0] || '',
      city: parts[1] || parts[0] || '',
      district: parts[2] || '',
    }
  }

  // chooseLocation：可能是「POI名 + 空格 + 省市区街道」或纯连续地址
  const start = text.search(
    /(?:[\u4e00-\u9fa5]{2,12}(?:省|自治区|特别行政区)|(?:北京|天津|上海|重庆)市)/,
  )
  const slice = start >= 0 ? text.slice(start) : text

  const direct = slice.match(/^(北京|天津|上海|重庆)市([\u4e00-\u9fa5]+?(?:区|县|市))?/)
  if (direct) {
    const city = `${direct[1]}市`
    return { province: city, city, district: direct[2] || '' }
  }

  const matched = slice.match(
    /^([\u4e00-\u9fa5]{2,12}(?:省|自治区|特别行政区))\s*([\u4e00-\u9fa5]{1,12}市)?\s*([\u4e00-\u9fa5]{1,12}(?:区|县|市|旗|自治县))?/,
  )
  if (matched?.[1]) {
    return {
      province: matched[1],
      city: matched[2] || matched[1],
      district: matched[3] || '',
    }
  }

  return { province: '', city: '', district: '' }
}

/** 后端只有 address 一栏：用分隔符同时存具体地点与门牌，兼容旧数据（无分隔符=整段当门牌）。 */
const ADDRESS_DETAIL_SEP = '｜'

export function joinAddressDetail(location: string, door: string): string {
  const loc = location.trim()
  const d = door.trim()
  if (loc && d) return `${loc}${ADDRESS_DETAIL_SEP}${d}`
  return loc || d
}

export function splitAddressDetail(raw: string | null | undefined): {
  location: string
  door: string
} {
  const text = raw == null ? '' : String(raw).trim()
  if (!text) return { location: '', door: '' }
  const idx = text.indexOf(ADDRESS_DETAIL_SEP)
  if (idx >= 0) {
    return {
      location: text.slice(0, idx).trim(),
      door: text.slice(idx + ADDRESS_DETAIL_SEP.length).trim(),
    }
  }
  return { location: '', door: text }
}

function adminText(parts: { province: string; city: string; district: string }): string {
  return [parts.province, parts.city, parts.district].filter(Boolean).join(' ')
}

/** 从「省市区 + POI」或历史「POI + 省市区」文案中抽出具体地点。 */
export function extractPlaceName(
  text: string,
  admin: { province: string; city: string; district: string },
): string {
  let next = text.trim()
  if (!next) return ''

  const spaced = adminText(admin)
  const compact = [admin.province, admin.city, admin.district].filter(Boolean).join('')
  if (spaced) next = next.split(spaced).join(' ')
  if (compact) next = next.split(compact).join(' ')
  for (const part of [admin.province, admin.city, admin.district]) {
    if (part) next = next.split(part).join(' ')
  }
  return next.replace(/\s+/g, ' ').trim()
}

/** 展示顺序：省市区 → 具体地点 → 门牌 */
export function formatRegionLabel(
  admin: { province: string; city: string; district: string },
  place: string,
): string {
  return [adminText(admin), place.trim()].filter(Boolean).join(' ')
}

/** 列表/摘要：省市区 → 具体地点 → 门牌 */
export function formatAddressLine(row: Pick<AddressRes, 'province' | 'city' | 'district' | 'address'>): string {
  const admin = {
    province: row.province,
    city: row.city,
    district: row.district,
  }
  const { location, door } = splitAddressDetail(row.address)
  const place = extractPlaceName(location, admin) || location
  return [adminText(admin), place, door].filter(Boolean).join(' ')
}

function parseCoord(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function asTag(raw: string | null | undefined): AddressTag {
  if (raw === '家' || raw === '公司' || raw === '学校' || raw === '其他') return raw
  return '其他'
}

/** AddressRes → session DeliveryAddress；gender 契约无，默认「先生」 */
export function addressResToDelivery(
  res: AddressRes,
  gender: AddressGender = '先生',
): DeliveryAddress {
  const admin = {
    province: res.province,
    city: res.city,
    district: res.district,
  }
  const { location, door } = splitAddressDetail(res.address)
  const place = extractPlaceName(location, admin) || location
  return {
    address_id: res.address_id,
    name: res.contact_name,
    gender,
    phone: res.mobile,
    region: formatRegionLabel(admin, place),
    door,
    tag: asTag(res.tag),
    latitude: parseCoord(res.latitude),
    longitude: parseCoord(res.longitude),
  }
}

/** UI DeliveryAddress → AddressUpsertReq；不传 gender */
export function deliveryToUpsert(
  addr: Omit<DeliveryAddress, 'address_id' | 'gender'> & {
    name: string
    phone: string
    region: string
    door: string
    tag: AddressTag
    latitude: number | null
    longitude: number | null
  },
  isDefault = 1,
): AddressUpsertReq {
  const admin = parseAddressRegion(addr.region)
  const place = extractPlaceName(addr.region, admin)
  return {
    contact_name: addr.name,
    mobile: addr.phone,
    province: admin.province,
    city: admin.city,
    district: admin.district,
    // 只存具体地点 + 门牌，省市区走独立字段
    address: joinAddressDetail(place, addr.door),
    tag: addr.tag,
    latitude: addr.latitude,
    longitude: addr.longitude,
    is_default: isDefault,
  }
}

export function listAddresses() {
  return http.get<AddressListRes>('/api/mp/customer/addresses', undefined, { showError: false })
}

export function createAddress(payload: AddressUpsertReq) {
  return http.post<AddressRes>('/api/mp/customer/addresses', payload)
}

export function getAddress(addressId: number) {
  return http.get<AddressRes>(`/api/mp/customer/addresses/${addressId}`, undefined, { showError: false })
}

export function updateAddress(addressId: number, payload: AddressUpsertReq) {
  return http.put<AddressRes>(`/api/mp/customer/addresses/${addressId}`, payload)
}

export function removeAddress(addressId: number) {
  return http.del<null>(`/api/mp/customer/addresses/${addressId}`, undefined, { showError: false })
}
