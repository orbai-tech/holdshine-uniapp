import { http } from '@/plugins/request'
import {
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

/** GET /api/mp/customer/legal/documents/{doc_type}（公开） */
export function getLegalDocument(docType: LegalDocType) {
  return http.get<MpLegalDocumentRes>(
    `/api/mp/customer/legal/documents/${docType}`,
    undefined,
    { showError: false },
  )
}

function findDoc<T extends { doc_type: number | string; version?: string | null }>(
  list: T[] | undefined,
  docType: LegalDocType,
): T | null {
  if (!Array.isArray(list)) return null
  return list.find((item) => Number(item.doc_type) === docType) ?? null
}

/**
 * mp 公开清单用：列表一般只有当前版，原样挑出版本号即可。
 * 任一份协议缺失 → 返回 null（调用方应阻断登录）。
 */
export function pickLegalVersions(
  list?: MpLegalDocumentRes[] | SuperAdminLegalDocumentRes[],
): LegalDocVersions | null {
  const safeList = (Array.isArray(list) ? list : []) as MpLegalDocumentRes[]
  const privacy = findDoc(safeList as MpLegalDocumentRes[], LEGAL_DOC_TYPE.PRIVACY)
  const handbook = findDoc(safeList as MpLegalDocumentRes[], LEGAL_DOC_TYPE.HANDBOOK)
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
    (item) => Number(item.doc_type) === LEGAL_DOC_TYPE.HANDBOOK && isCurrentFlag(item),
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
