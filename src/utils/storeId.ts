/** MpStoreRes.store_id 是 string，菜单/购物车要 integer。失败抛错，不当 0。 */
export function toStoreId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('门店编号无效')
  }
  return id
}
