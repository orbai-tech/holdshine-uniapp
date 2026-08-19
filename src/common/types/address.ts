/**
 * 顾客端地址簿 DTO（已实现 `/api/mp/customer/addresses`）。
 * 对齐 AddressUpsertReq / AddressRes；禁止混入规划 member/addresses 字段。
 */

export interface AddressUpsertReq {
  contact_name: string
  mobile: string
  province: string
  city: string
  district: string
  address: string
  longitude?: number | string | null
  latitude?: number | string | null
  tag?: string | null
  /** 0 | 1 */
  is_default?: number
}

export interface AddressRes {
  address_id: string
  contact_name: string
  mobile: string
  province: string
  city: string
  district: string
  address: string
  longitude?: string | null
  latitude?: string | null
  tag?: string | null
  is_default?: number
}

export interface AddressListRes {
  list: AddressRes[]
}
