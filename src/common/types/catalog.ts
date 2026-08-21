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
  img: string
  cat: ProductCategory
  ritual: RitualId
  tag?: string
  scene: string
  recommended?: boolean
  /** 真契约 string；18 位雪花大整数 */
  categoryId?: string
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
