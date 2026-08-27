import { http } from '@/plugins/request'
import { brand as brandCopy, products as mockProducts, rituals } from '@/common/mock/catalog'
import type { CatalogPayload, Product, ProductCategory, RitualId } from '@/common/types/catalog'
import type { MpMenuProductRes, MpMenuRes } from '@/common/types/menu'
import { parseAmount } from '@/utils/money'
import { resolveMediaUrl } from '@/utils/mediaUrl'

/** store_id 是后端大整数原值（字符串），直接透传以避免 Number() 精度丢失。 */
export function getStoreMenu(storeId: string | number) {
  const id = String(storeId)
  return http.get<MpMenuRes>(`/api/mp/customer/stores/${id}/menu`, undefined, { showError: false })
}

function catFromCategoryName(name: string): ProductCategory {
  if (name.includes('零售')) return 'retail'
  if (name.includes('滋补')) return 'tonic'
  return 'coffee'
}

function ritualFallback(cat: ProductCategory): RitualId {
  if (cat === 'tonic') return 'nourish'
  if (cat === 'retail') return 'gift'
  return 'afternoon'
}

function toProduct(item: MpMenuProductRes, categoryId: string, categoryName: string): Product {
  const skus = item.skus ?? []
  const firstSku = skus[0]
  const basePrice = parseAmount(item.base_price)
  // price 保持"默认选中规格的售价"语义（无规格时为基础价），
  // basePrice 单独保存基础价，用于杯型加价（大杯 +3）等 delta 展示。
  const price = firstSku ? parseAmount(firstSku.sale_price) : basePrice
  const mock = mockProducts.find((row) => row.name === item.product_name)
  const cat = mock?.cat ?? catFromCategoryName(categoryName)
  return {
    id: String(item.product_id),
    productId: item.product_id,
    name: item.product_name,
    en: mock?.en ?? '',
    desc: item.short_description || '',
    story: item.short_description || '',
    price,
    basePrice,
    img: resolveMediaUrl(item.cover_image_path),
    cat,
    ritual: mock?.ritual ?? ritualFallback(cat),
    tag: item.tags || (item.is_recommended ? '推荐' : undefined),
    scene: mock?.scene || item.short_description || '',
    recommended: item.is_recommended === 1,
    categoryId,
    skus,
    optionGroups: item.option_groups ?? [],
  }
}

/** 已实现菜单 → 页面目录。仪式/品牌文案仍用本地占位（FIELD-GAP-003）。 */
export function menuToCatalog(menu: MpMenuRes, storeName: string, hours: string, distance: string): CatalogPayload {
  // 一个商品可能被绑定到多个分类（product_category_rel 多次命中），后端在每个分类下都返回它。
  // 同一商品在前端只保留一份，categoryIds 聚合所有绑定的分类 id，避免"全部"下重复卡片。
  const seen = new Map<string, Product>()
  for (const group of menu.categories ?? []) {
    const groupCategoryId = group.category_id
    for (const item of group.products ?? []) {
      const product = toProduct(item, groupCategoryId, group.category_name)
      const existing = seen.get(product.id)
      if (existing) {
        const set = new Set(existing.categoryIds ?? existing.categoryId ?? [])
        set.add(groupCategoryId)
        existing.categoryIds = Array.from(set)
        continue
      }
      product.categoryIds = [groupCategoryId]
      seen.set(product.id, product)
    }
  }
  return {
    brand: {
      ...brandCopy,
      store: storeName || menu.store_name,
      hours,
      distance,
    },
    rituals,
    products: Array.from(seen.values()),
  }
}

