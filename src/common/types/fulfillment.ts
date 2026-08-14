/** 履约：到店堂食 / 外卖配送 */

export type FulfillmentMode = 'dine_in' | 'delivery'

/** 堂食确认单内：店内就餐（可选桌码）/ 打包外带 */
export type PickupSubMode = 'dine_in' | 'pack'

/** 预留桌码；`null` 表示「无」 */
export type TableCode = 'A1' | 'A2' | 'A3'

export const TABLE_CODE_OPTIONS: Array<TableCode | null> = ['A1', 'A2', 'A3', null]

export type AddressGender = '先生' | '女士'
export type AddressTag = '家' | '公司' | '学校' | '其他'

export interface DeliveryAddress {
  /** 后端 AddressRes.address_id（string）；本地缓存用 */
  address_id?: string
  name: string
  /** UI-only；不在 AddressUpsertReq / AddressRes */
  gender: AddressGender
  phone: string
  /** 地图选点/行政区划展示文案 */
  region: string
  door: string
  tag: AddressTag
  latitude: number | null
  longitude: number | null
}
