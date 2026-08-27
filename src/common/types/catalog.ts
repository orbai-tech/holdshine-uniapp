import type { MpMenuOptionGroupRes, MpMenuSkuRes } from './menu'

export type ProductCategory = 'coffee' | 'tonic' | 'retail'
export type RitualId = 'morning' | 'afternoon' | 'nourish' | 'gift'

export interface MenuCategory {
  /** 真契约 string；18 位雪花大整数 */
  id: string
  name: string
}

export interface Product {
  id: string
  /** 真契约 string；18 位雪花大整数 */
  productId?: string
  name: string
  en: string
  desc: string
  story: string
  price: number
  /** 商品基础价格（后台 base_price），用于计算杯型等规格的加价展示 */
  basePrice: number
  img: string
  cat: ProductCategory
  ritual: RitualId
  tag?: string
  scene: string
  recommended?: boolean
  /** 真契约 string；18 位雪花大整数。商品所属的"主"分类（首次关联），兼容旧调用。 */
  categoryId?: string
  /** 真契约 string[]；商品绑定的全部分类 id。一个商品被绑定到多个分类时聚合，避免"全部"下重复卡片。 */
  categoryIds?: string[]
  skus?: MpMenuSkuRes[]
  optionGroups?: MpMenuOptionGroupRes[]
}

export interface Ritual {
  id: RitualId
  title: string
  subtitle: string
  description: string
  mood: string
}

export interface BrandInfo {
  name: string
  nameEn: string
  tagline: string
  belief: string
  store: string
  hours: string
  distance: string
}

export interface CatalogPayload {
  brand: BrandInfo
  rituals: Ritual[]
  products: Product[]
}
