import { http } from '@/plugins/request'
import {
  LEGAL_DOC_TYPE,
  type LegalDocType,
  type LegalDocVersions,
  type MpLegalDocumentListRes,
  type MpLegalDocumentRes,
} from '@/common/types/legal'

/** GET /api/mp/customer/legal/documents（公开） */
export async function listLegalDocuments(): Promise<MpLegalDocumentRes[]> {
  const data = await http.get<MpLegalDocumentListRes>(
    '/api/mp/customer/legal/documents',
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

function findDoc(list: MpLegalDocumentRes[], docType: LegalDocType) {
  return list.find((item) => Number(item.doc_type) === docType) ?? null
}

/** 从列表取出两份当前版本；缺任一则返回 null（调用方应阻断登录）。 */
export function pickLegalVersions(list: MpLegalDocumentRes[]): LegalDocVersions | null {
  const privacy = findDoc(list, LEGAL_DOC_TYPE.PRIVACY)
  const handbook = findDoc(list, LEGAL_DOC_TYPE.HANDBOOK)
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
