const INITIAL_VERSION = '2026.08.17.0000'

const documents = new Map()

function seed() {
  documents.set(2, {
    doc_type: 2,
    version: INITIAL_VERSION,
    title: '隐私政策',
    content_html:
      '<p>更新日期：2026年8月17日｜生效日期：2026年8月17日</p>' +
      '<p>「元气善筑」重视您的个人信息与隐私保护。本政策说明我们如何收集、使用、存储、共享与保护您的信息，以及您享有的权利。请在使用本服务前仔细阅读。</p>' +
      '<p>一、我们收集的信息包括微信授权凭证、账号资料、交易与履约信息、位置信息、设备与日志信息。我们仅在实现服务所必需的范围内使用上述信息。</p>' +
      '<p>如对本政策有疑问，请通过小程序「联系客服」与我们联系。</p>',
    pdf_url: null,
    published_at: '2026-08-17 00:00:00',
  })
  documents.set(3, {
    doc_type: 3,
    version: INITIAL_VERSION,
    title: '用户须知',
    content_html:
      '<p>更新日期：2026年8月17日｜生效日期：2026年8月17日</p>' +
      '<p>欢迎使用「元气善筑」微信小程序。在登录或使用本服务前，请仔细阅读并充分理解本须知。勾选同意并登录，即视为您已阅读并同意全部内容。</p>' +
      '<p>本服务提供门店点单、外卖配送、选物购买、会员积分与优惠券等功能。具体商品、价格、库存与营业时间以页面实时展示为准。</p>' +
      '<p>如对本须知有疑问，请通过小程序内「联系客服」与我们联系。</p>',
    pdf_url: null,
    published_at: '2026-08-17 00:00:00',
  })
}

seed()

function cloneDoc(doc) {
  return { ...doc }
}

export function listLegalDocuments() {
  return [cloneDoc(documents.get(2)), cloneDoc(documents.get(3))]
}

export function getLegalDocument(docType) {
  const key = Number(docType)
  const doc = documents.get(key)
  return doc ? cloneDoc(doc) : null
}

export function currentLegalVersions() {
  return {
    privacy: documents.get(2)?.version || INITIAL_VERSION,
    handbook: documents.get(3)?.version || INITIAL_VERSION,
  }
}

/** 升版当前文档，便于验收 need_reconsent。 */
let bumpCount = 0
export function bumpLegalVersion(docType) {
  const key = Number(docType)
  const doc = documents.get(key)
  if (!doc) return null
  bumpCount += 1
  const next = {
    ...doc,
    version: `2026.08.18.${String(bumpCount).padStart(4, '0')}`,
    published_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  }
  documents.set(key, next)
  return cloneDoc(next)
}

export function userNeedsReconsent(user) {
  if (!user) return false
  const current = currentLegalVersions()
  const privacy = String(user.privacy_policy_version || '')
  const handbook = String(user.user_handbook_version || '')
  return privacy !== current.privacy || handbook !== current.handbook
}
