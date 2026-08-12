import { http } from '@/plugin/request'
import { brand as brandCopy, rituals } from '@/common/mock/catalog'
import type { CatalogPayload, Product } from '@/common/types/catalog'
import type { MpMenuProductRes, MpMenuRes } from '@/common/types/menu'
import { parseAmount } from '@/utils/money'
import { resolveMediaUrl } from '@/utils/mediaUrl'

export function getStoreMenu(storeId: number) {
  return http.get<MpMenuRes>(`/api/mp/stores/${storeId}/menu`)
}

function toProduct(item: MpMenuProductRes, categoryId: number): Product {
  const skus = item.skus ?? []
  const firstSku = skus[0]
  const price = firstSku ? parseAmount(firstSku.sale_price) : parseAmount(item.base_price)
  return {
    id: String(item.product_id),
    productId: item.product_id,
    name: item.product_name,
    en: '',
    desc: item.short_description || '',
    story: item.short_description || '',
    price,
    img: resolveMediaUrl(item.cover_image_path),
    cat: 'coffee',
    ritual: 'afternoon',
    tag: item.tags || (item.is_recommended ? '推荐' : undefined),
    scene: item.short_description || '',
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
      products.push(toProduct(item, group.category_id))
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

