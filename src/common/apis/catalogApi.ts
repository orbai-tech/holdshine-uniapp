import { http } from '@/plugins/request'
import { brand as brandCopy, products as mockProducts, rituals } from '@/common/mock/catalog'
import type { CatalogPayload, Product, ProductCategory, RitualId } from '@/common/types/catalog'
import type { MpMenuProductRes, MpMenuRes } from '@/common/types/menu'
import { parseAmount } from '@/utils/money'
import { resolveMediaUrl } from '@/utils/mediaUrl'

export function getStoreMenu(storeId: number) {
  return http.get<MpMenuRes>(`/api/mp/customer/stores/${storeId}/menu`)
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

function toProduct(item: MpMenuProductRes, categoryId: number, categoryName: string): Product {
  const skus = item.skus ?? []
  const firstSku = skus[0]
  const price = firstSku ? parseAmount(firstSku.sale_price) : parseAmount(item.base_price)
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
  const products: Product[] = []
  for (const group of menu.categories ?? []) {
    for (const item of group.products ?? []) {
      products.push(toProduct(item, group.category_id, group.category_name))
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
    products,
  }
}

