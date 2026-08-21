/**
 * 后端 store_id 为 18 位雪花大整数（如 "345411630210015232"），超过 JS Number.MAX_SAFE_INTEGER (2^53-1)，
 * 一旦走 Number() 即损失精度（"345411630210015232" → 345411630210015200）。
 * 因此前端全程按 string 透传 store_id，本工具仅做非空校验。
 */
export function toStoreId(raw: string | number | null | undefined): string {
  if (raw == null) throw new Error('门店编号缺失')
  const s = String(raw).trim()
  if (!/^\d+$/.test(s)) throw new Error('门店编号格式错误')
  return s
}

/** 校验并返回原值（同 toStoreId 的别名，便于阅读）。 */
export const assertStoreId = toStoreId

/**
 * 解析门店列表项中的 store_id，强制按字符串返回。
 * 后端 MpStoreRes.store_id 为 string（真契约），mock fixtures 也是 string。
 */
export function storeIdOf(store: { store_id: string | number }): string {
  return toStoreId(store.store_id)
}
