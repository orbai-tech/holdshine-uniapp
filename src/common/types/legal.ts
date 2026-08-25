/**
 * 列表接口 `doc_type`：数字枚举（契约 integer）。
 * 2 = 隐私协议、3 = 用户协议（旧称"用户手册"）。
 */
export const LEGAL_DOC_TYPE = {
  PRIVACY: 2,
  USER: 3,
} as const

export type LegalDocType = (typeof LEGAL_DOC_TYPE)[keyof typeof LEGAL_DOC_TYPE]

/**
 * 详情接口 path 参数：契约为数字 doc_type（`/documents/{doc_type}`）。
 * 2 = 隐私协议、3 = 用户协议。
 */
export const LEGAL_DOC_PATH: Record<LegalDocType, string> = {
  [LEGAL_DOC_TYPE.PRIVACY]: '2',
  [LEGAL_DOC_TYPE.USER]: '3',
} as const

export interface MpLegalDocumentRes {
  doc_type: number
  version: string
  title: string
  content_html: string
  /** 契约新增：PDF 页图地址列表；优先展示页图，无页图时才渲染 content_html */
  content_images?: string[] | null
  /** 顾客端接口返回的 PDF 访问地址；不同后端实现可能用 pdf_path 字段下发。 */
  pdf_url?: string | null
  /** 后端以存储路径下发 PDF 时使用（与超管侧字段保持一致）。 */
  pdf_path?: string | null
  /** 兼容其它后端实现下发的 PDF 字段名。 */
  file_url?: string | null
  /** 兼容其它后端实现下发的 PDF 字段名。 */
  content_pdf?: string | null
  published_at?: string | null
}

export interface MpLegalDocumentListRes {
  list: MpLegalDocumentRes[]
}

/**
 * 超管侧 `/api/web/super-admin/legal/documents` 返回：包含历史版本，
 * 靠 `is_current` 标记当前生效版。登录前用它挑出最新版本号再传给 wx-login。
 */
export interface SuperAdminLegalDocumentRes extends MpLegalDocumentRes {
  id: string
  is_current: boolean
  status: number
  pdf_path?: string | null
  pdf_original_name?: string | null
  pdf_size_bytes?: number | null
  updated_by_admin_id?: string | null
}

export interface SuperAdminLegalDocumentListRes {
  list: SuperAdminLegalDocumentRes[]
}

/** 登录/重签提交用的双协议版本（agree 由 UI 勾选决定）。 */
export interface LegalDocVersions {
  privacyPolicyVersion: string
  userHandbookVersion: string
  privacyTitle: string
  handbookTitle: string
}
