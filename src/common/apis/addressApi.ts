import { http } from '@/plugin/request'
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

function splitRegion(region: string): { province: string; city: string; district: string } {
  const parts = region.trim().split(/\s+/).filter(Boolean)
  return {
    province: parts[0] || '',
    city: parts[1] || parts[0] || '',
    district: parts[2] || '',
  }
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
  const region = [res.province, res.city, res.district].filter(Boolean).join(' ')
  return {
    address_id: res.address_id,
    name: res.contact_name,
    gender,
    phone: res.mobile,
    region,
    door: res.address,
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
  const { province, city, district } = splitRegion(addr.region)
  return {
    contact_name: addr.name,
    mobile: addr.phone,
    province,
    city,
    district,
    address: addr.door,
    tag: addr.tag,
    latitude: addr.latitude,
    longitude: addr.longitude,
    is_default: isDefault,
  }
}

export function listAddresses() {
  return http.get<AddressListRes>('/api/mp/addresses', undefined, { showError: false })
}

export function createAddress(payload: AddressUpsertReq) {
  return http.post<AddressRes>('/api/mp/addresses', payload)
}

export function getAddress(addressId: number) {
  return http.get<AddressRes>(`/api/mp/addresses/${addressId}`, undefined, { showError: false })
}

export function updateAddress(addressId: number, payload: AddressUpsertReq) {
  return http.put<AddressRes>(`/api/mp/addresses/${addressId}`, payload)
}

export function deleteAddress(addressId: number) {
  return http.delete<null>(`/api/mp/addresses/${addressId}`, undefined, { showError: false })
}
