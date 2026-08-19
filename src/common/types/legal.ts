/** doc_type：2 隐私协议、3 用户手册（契约 integer）。 */
export const LEGAL_DOC_TYPE = {
  PRIVACY: 2,
  HANDBOOK: 3,
} as const

export type LegalDocType = (typeof LEGAL_DOC_TYPE)[keyof typeof LEGAL_DOC_TYPE]

export interface MpLegalDocumentRes {
  doc_type: number
  version: string
  title: string
  content_html: string
  pdf_url?: string | null
  published_at?: string | null
}

export interface MpLegalDocumentListRes {
  list: MpLegalDocumentRes[]
}

/** 登录/重签提交用的双协议版本（agree 由 UI 勾选决定）。 */
export interface LegalDocVersions {
  privacyPolicyVersion: string
  userHandbookVersion: string
  privacyTitle: string
  handbookTitle: string
}
