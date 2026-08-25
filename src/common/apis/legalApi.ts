import { http } from '@/plugins/request'
import {
  LEGAL_DOC_PATH,
  LEGAL_DOC_TYPE,
  type LegalDocType,
  type LegalDocVersions,
  type MpLegalDocumentListRes,
  type MpLegalDocumentRes,
  type SuperAdminLegalDocumentListRes,
  type SuperAdminLegalDocumentRes,
} from '@/common/types/legal'

/** GET /api/mp/customer/legal/documents（公开）——给协议详情页使用。 */
export async function listLegalDocuments(): Promise<MpLegalDocumentRes[]> {
  const data = await http.get<MpLegalDocumentListRes>(
    '/api/mp/customer/legal/documents',
    undefined,
    { showError: false },
  )
  return Array.isArray(data?.list) ? data.list : []
}

/**
 * GET /api/web/super-admin/legal/documents——登录前拿当前生效版版本号。
 * 注意：接口返回的是**全部历史版本**，必须再过 is_current 过滤，
 * 否则会把旧版本号当成最新版本号往 wx-login 传，仍会触发 41000。
 */
export async function listAllLegalDocuments(): Promise<SuperAdminLegalDocumentRes[]> {
  const data = await http.get<SuperAdminLegalDocumentListRes>(
    '/api/web/super-admin/legal/documents',
    undefined,
    { showError: false },
  )
  return Array.isArray(data?.list) ? data.list : []
}

/** GET /api/mp/customer/legal/documents/{doc_type}（公开）——path 为契约字符串 user/privacy */
export function getLegalDocument(docType: LegalDocType) {
  const path = LEGAL_DOC_PATH[docType] ?? String(docType)
  return http.get<MpLegalDocumentRes>(
    `/api/mp/customer/legal/documents/${path}`,
    undefined,
    { showError: false },
  )
}

/**
 * 同 doc_type 多条记录（历史版本）时取"最新一条"：
 * 优先比 published_at 降序，其次比 version 字符串降序（版本号通常同为定长 yyyy.MM.dd.xxxx）。
 * mp 清单若混入历史版本，取第一条会提交旧版本号，登录被 41000 拦截。
 */
function latestOf<
  T extends { doc_type: number | string; version?: string | null; published_at?: string | null },
>(list: T[] | undefined, docType: LegalDocType): T | null {
  if (!Array.isArray(list)) return null
  const rows = list.filter((item) => Number(item.doc_type) === docType)
  if (rows.length === 0) return null
  rows.sort((a, b) => {
    const pa = String(a.published_at || '')
    const pb = String(b.published_at || '')
    if (pa !== pb) return pb.localeCompare(pa)
    const va = String(a.version || '')
    const vb = String(b.version || '')
    return vb.localeCompare(va)
  })
  return rows[0] ?? null
}

/** 并发拉取两份当前生效协议（mp 顾客端接口返回的即当前版），用于登录/重签前取版本号。 */
export async function fetchMpCurrentVersions(): Promise<LegalDocVersions | null> {
  const [privacy, handbook] = await Promise.all([
    getLegalDocument(LEGAL_DOC_TYPE.PRIVACY),
    getLegalDocument(LEGAL_DOC_TYPE.USER),
  ])
  const privacyVer = privacy?.version?.trim() || ''
  const handbookVer = handbook?.version?.trim() || ''
  if (!privacyVer || !handbookVer) return null
  return {
    privacyPolicyVersion: privacyVer,
    userHandbookVersion: handbookVer,
    privacyTitle: privacy?.title || '隐私政策',
    handbookTitle: handbook?.title || '用户须知',
  }
}

/**
 * mp 公开清单用：若列表混有历史版本，取 published_at/version 最新的一条。
 * 任一份协议缺失 → 返回 null（调用方应阻断登录）。
 */
export function pickLegalVersions(
  list?: MpLegalDocumentRes[] | SuperAdminLegalDocumentRes[],
): LegalDocVersions | null {
  const safeList = (Array.isArray(list) ? list : []) as MpLegalDocumentRes[]
  const privacy = latestOf(safeList as MpLegalDocumentRes[], LEGAL_DOC_TYPE.PRIVACY)
  const handbook = latestOf(safeList as MpLegalDocumentRes[], LEGAL_DOC_TYPE.USER)
  const privacyVer = privacy?.version?.trim() || ''
  const handbookVer = handbook?.version?.trim() || ''
  if (!privacyVer || !handbookVer) return null
  return {
    privacyPolicyVersion: privacyVer,
    userHandbookVersion: handbookVer,
    privacyTitle: privacy?.title || '隐私政策',
    handbookTitle: handbook?.title || '用户须知',
  }
}

/**
 * 登录前专用：只挑 `is_current === true` 的隐私/手册。
 * 用于过滤超管侧清单（包含历史版本）；
 * 若传入的是 mp 公开清单（无 is_current 字段），视为全部生效，行为退化为 `pickLegalVersions`。
 */
export function pickLegalCurrentVersions(
  list?: SuperAdminLegalDocumentRes[] | MpLegalDocumentRes[],
): LegalDocVersions | null {
  if (!Array.isArray(list) || list.length === 0) return null

  const isCurrentFlag = (item: SuperAdminLegalDocumentRes | MpLegalDocumentRes): boolean => {
    // mp 清单没有 is_current：把它视作当前生效
    const flag = (item as SuperAdminLegalDocumentRes).is_current
    return flag === undefined ? true : Boolean(flag)
  }

  const privacy = list.find(
    (item) => Number(item.doc_type) === LEGAL_DOC_TYPE.PRIVACY && isCurrentFlag(item),
  )
  const handbook = list.find(
    (item) => Number(item.doc_type) === LEGAL_DOC_TYPE.USER && isCurrentFlag(item),
  )

  const privacyVer = privacy?.version?.trim() || ''
  const handbookVer = handbook?.version?.trim() || ''
  if (!privacyVer || !handbookVer) return null
  return {
    privacyPolicyVersion: privacyVer,
    userHandbookVersion: handbookVer,
    privacyTitle: privacy?.title || '隐私政策',
    handbookTitle: handbook?.title || '用户须知',
  }
}
