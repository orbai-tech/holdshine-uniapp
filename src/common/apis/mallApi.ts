import { http } from '@/plugins/request'
import type { MallCatalogRes, MallProductDetailRes } from '@/common/types/mall'

/**
 * 礼品商城目录。Query `store_id` 真契约 string（真后端 18 位大整数，禁止 Number()）。
 */
export function getMallCatalog(storeId?: string | number | null) {
  const query: { store_id?: string } = {}
  if (storeId != null) query.store_id = String(storeId)
  return http.get<MallCatalogRes>('/api/mp/customer/mall', query, { showError: false })
}

/** 礼品详情。Path `product_id` 真契约 string（18 位雪花大整数，禁止 Number()）；Query `store_id` 真契约 string。 */
export function getMallProduct(productId: string | number, storeId?: string | number | null) {
  const id = String(productId)
  if (!/^\d+$/.test(id)) {
    return Promise.reject(new Error('商品编号无效'))
  }
  const query: { store_id?: string } = {}
  if (storeId != null) query.store_id = String(storeId)
  return http.get<MallProductDetailRes>(`/api/mp/customer/mall/products/${id}`, query, {
    showError: false,
  })
}
