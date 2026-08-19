import { http } from '@/plugins/request'
import type { MallCatalogRes, MallProductDetailRes } from '@/common/types/mall'

/** 礼品商城目录。Query `store_id` 可选 integer。 */
export function getMallCatalog(storeId?: number | null) {
  const query: { store_id?: number } = {}
  if (storeId != null) query.store_id = storeId
  return http.get<MallCatalogRes>('/api/mp/customer/mall', query, { showError: false })
}

/** 礼品详情。Path `product_id` 为 integer；Query `store_id` 可选。 */
export function getMallProduct(productId: string | number, storeId?: number | null) {
  const id = Number(productId)
  if (!Number.isInteger(id) || id <= 0) {
    return Promise.reject(new Error('商品编号无效'))
  }
  const query: { store_id?: number } = {}
  if (storeId != null) query.store_id = storeId
  return http.get<MallProductDetailRes>(`/api/mp/customer/mall/products/${id}`, query, {
    showError: false,
  })
}
