import { computed, nextTick, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchAuthProfile, loginByWxCode, logoutRemote, toAuthUser } from '@/common/apis/authApi'
import { addressResToDelivery, listAddresses } from '@/common/apis/addressApi'
import { getMemberSummary } from '@/common/apis/memberApi'
import { listMpStores, storeIdOf } from '@/common/apis/storeApi'
import type { AuthUser, LoginOptions, MpUserInfoRes } from '@/common/types/auth'
import type { RitualId } from '@/common/types/catalog'
import type {
  DeliveryAddress,
  FulfillmentMode,
  PickupSubMode,
  TableCode,
} from '@/common/types/fulfillment'
import {
  clearSessionStorage,
  isSessionExpired,
  persistSession,
  readStoredToken,
  readStoredUser,
  subscribeUnauthorized,
} from '@/utils/authStorage'
import { toStoreId } from '@/utils/storeId'
import { toGoldMemberSummary } from '@/utils/memberLabel'
import { getWxLoginCode } from '@/utils/wxLogin'
import { useCatalogStore } from './catalog'

const TAB_URLS = [
  '/pages/home/index',
  '/pages/orders/index',
  '/pages/select/index',
  '/pages/mine/index',
] as const

const MENU_URL = '/pages/menu/index'
const LOGIN_URL = '/pages/login/index'

const ADDRESS_KEY = 'soorak_delivery_address'

export type TabUrl = (typeof TAB_URLS)[number]

function readStoredAddress(): DeliveryAddress | null {
  try {
    const raw = uni.getStorageSync(ADDRESS_KEY)
    if (!raw || typeof raw !== 'object') return null
    const row = raw as DeliveryAddress
    if (typeof row.name !== 'string' || typeof row.phone !== 'string') return null
    return row
  } catch {
    return null
  }
}

export const useSessionStore = defineStore('session', () => {
  const ritualFilter = ref<RitualId | null>(null)
  /** 菜单分类 id：18 位雪花大整数，string 透传 */
  const categoryId = ref<string | null>(null)
  const productId = ref<string | null>(null)
  const cartOpen = ref(false)
  const loginSheetMode = ref<'login'>('login')
  const suppressTabBar = ref(false)
  const token = ref('')
  const user = ref<AuthUser | null>(null)
  const authBusy = ref(false)

  const fulfillmentMode = ref<FulfillmentMode | null>(null)
  const pickupSubMode = ref<PickupSubMode>('dine_in')
  const tableCode = ref<string | null>(null)
  /**
   * 真后端桌台 id 为 18 位雪花大整数（与 store_id 同样的精度问题）；
   * 前端全程按 string 透传，禁止进入 Number()，避免精度丢失。
   * null 表示"未选桌台"——商品加购允许 table_id=null，下单时由确认单强制选真实桌台。
   */
  const tableId = ref<string | null>(null)
  const tableName = ref<string | null>(null)
  /** 是否由扫桌码 resolve 写入（确认单只读，不打开选桌 Sheet） */
  const tableFromScan = ref(false)
  /** 切到「打包」时暂存堂食桌台，切回店内就餐可恢复 */
  const stashedDineTable = ref<{
    tableId: string | null
    tableCode: string | null
    tableName: string | null
    tableFromScan: boolean
  } | null>(null)
  const deliveryAddress = ref<DeliveryAddress | null>(readStoredAddress())

  /** 会员月卡折扣：来自 GET /member/summary；未开通则不折 */
  const memberActive = ref(false)
  const coffeeDiscountRate = ref<string | null>(null)
  const mallDiscountRate = ref<string | null>(null)

  const productOpen = computed(() => Boolean(productId.value))
  const loggedIn = computed(() => Boolean(token.value && user.value))
  /** 原生 tabBar 始终隐藏，页面内纯文字导航由 chrome 渲染 */
  const tabBarVisible = computed(
    () => !productOpen.value && !cartOpen.value && !suppressTabBar.value,
  )

  let profileChecked = false
  let loginWaiters: Array<(ok: boolean) => void> = []
  let loginWaitPromise: Promise<boolean> | null = null

  function currentTabUrl(): string {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1]
    return page?.route ? `/${page.route}` : ''
  }

  function hideNativeTabBar() {
    // nextTick：避免与页面 onShow / switchTab 竞态导致 hideTabBar 无效
    void nextTick(() => {
      uni.hideTabBar({ animation: false, fail() {} })
    })
  }

  watch([productId, cartOpen, suppressTabBar], hideNativeTabBar)

  function pageRouteOf(page: { route?: string } | undefined): string {
    return page?.route ? `/${page.route}` : ''
  }

  function isLoginPageOnStack(): boolean {
    return getCurrentPages().some((page) => pageRouteOf(page) === LOGIN_URL)
  }

  function isLoginPageTop(): boolean {
    return currentTabUrl() === LOGIN_URL
  }

  function navigateToLoginPage() {
    uni.navigateTo({
      url: LOGIN_URL,
      fail() {
        resolveLoginRequest(false)
      },
    })
  }

  function hasPendingLoginRequest() {
    return Boolean(loginWaitPromise)
  }

  function goTab(url: TabUrl) {
    productId.value = null
    cartOpen.value = false
    suppressTabBar.value = false
    if (loginWaitPromise) {
      resolveLoginRequest(false)
    }
    if (currentTabUrl() === url) {
      hideNativeTabBar()
      return
    }
    uni.switchTab({
      url,
      // 基础库 3.x 对未处理的 switchTab fail 会打 MiniProgramError
      fail() {},
      complete() {
        hideNativeTabBar()
      },
    })
  }

  function setSuppressTabBar(hidden: boolean) {
    suppressTabBar.value = hidden
  }

  function applySession(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken
    user.value = nextUser
    persistSession(nextToken, nextUser)
  }

  /** 资料接口返回的 userinfo / AuthUser 写回会话（token 不变）。 */
  function applyUser(nextUser: AuthUser) {
    if (!token.value) return
    applySession(token.value, nextUser)
  }

  function applyUserInfo(info: MpUserInfoRes) {
    applyUser(toAuthUser(info))
  }

  async function refreshProfile() {
    if (!token.value) return null
    const profile = await fetchAuthProfile()
    applySession(token.value, profile)
    return profile
  }

  function clearMemberRates() {
    memberActive.value = false
    coffeeDiscountRate.value = null
    mallDiscountRate.value = null
  }

  /** 拉取会员摘要折扣；失败静默，计价按不打折 */
  async function refreshMemberRates() {
    if (!token.value || !user.value) {
      clearMemberRates()
      return
    }
    try {
      const summary = toGoldMemberSummary(await getMemberSummary())
      if (!summary) {
        clearMemberRates()
        return
      }
      const active = Boolean(summary.is_active)
      memberActive.value = active
      coffeeDiscountRate.value = active ? summary.coffee_discount_rate || null : null
      mallDiscountRate.value = active ? summary.mall_discount_rate || null : null
    } catch {
      clearMemberRates()
    }
  }

  function clearSession() {
    token.value = ''
    user.value = null
    clearMemberRates()
    clearSessionStorage()
  }

  function restoreSession() {
    const storedToken = readStoredToken()
    const storedUser = readStoredUser()
    if (!storedToken || !storedUser || isSessionExpired()) {
      clearSession()
      return
    }
    applySession(storedToken, storedUser)
    void refreshMemberRates()
  }

  function openLoginPage(): Promise<boolean> {
    loginSheetMode.value = 'login'
    productId.value = null
    cartOpen.value = false
    if (loginWaitPromise) {
      if (!isLoginPageOnStack()) navigateToLoginPage()
      return loginWaitPromise
    }
    loginWaitPromise = new Promise<boolean>((resolve) => {
      loginWaiters.push(resolve)
    })
    if (!isLoginPageTop()) navigateToLoginPage()
    return loginWaitPromise
  }

  async function verifySession() {
    if (profileChecked) return
    profileChecked = true
    if (!token.value || !user.value) return
    try {
      const profile = await fetchAuthProfile()
      applySession(token.value, profile)
      void hydrateDeliveryAddressFromApi()
      void refreshMemberRates()
    } catch {
      clearSession()
    }
  }

  async function login(options: LoginOptions) {
    if (authBusy.value) return
    const consent = options.consent
    if (!consent?.privacyPolicyVersion.trim() || !consent.userHandbookVersion.trim()) {
      throw new Error('协议版本加载失败，请稍后重试')
    }
    authBusy.value = true
    try {
      const payload = await getWxLoginCode()
      if (options.wxPhoneCode) payload.wxPhoneCode = options.wxPhoneCode
      console.info('[元气善筑] 准备换票', payload.platform, payload.code.slice(0, 8))
      const result = await loginByWxCode({
        ...payload,
        agreePrivacyPolicy: true,
        privacyPolicyVersion: consent.privacyPolicyVersion,
        agreeUserHandbook: true,
        userHandbookVersion: consent.userHandbookVersion,
      })
      applySession(result.token, result.user)
      void hydrateDeliveryAddressFromApi()
      void refreshMemberRates()
    } finally {
      authBusy.value = false
    }
  }

  function resolveLoginRequest(ok: boolean) {
    loginSheetMode.value = 'login'
    const waiters = loginWaiters
    loginWaiters = []
    loginWaitPromise = null
    for (const resolve of waiters) resolve(ok)
  }

  /** 未登录时打开登录页。 */
  function requestLogin(): Promise<boolean> {
    if (loggedIn.value) return Promise.resolve(true)
    return openLoginPage()
  }

  /** 购物车/下单等写操作入口：已登录先验 /me；未登录或票失效则进入登录页。 */
  async function ensureLogin(): Promise<boolean> {
    if (authBusy.value) {
      await new Promise<void>((resolve) => {
        const stop = watch(authBusy, (busy) => {
          if (!busy) {
            stop()
            resolve()
          }
        })
      })
      if (loggedIn.value) return true
    }
    if (loggedIn.value) {
      try {
        const profile = await fetchAuthProfile()
        applySession(token.value, profile)
        return true
      } catch {
        clearSession()
      }
    }
    return requestLogin()
  }

  /** 打开地址簿前先过登录门禁。 */
  async function openAddressBook() {
    productId.value = null
    cartOpen.value = false
    const ok = await ensureLogin()
    if (!ok) return
    uni.navigateTo({
      url: '/pages/address/index',
      fail() {},
    })
  }

  async function openAddressEditor(addressId?: string) {
    productId.value = null
    cartOpen.value = false
    const ok = await ensureLogin()
    if (!ok) return
    const query = addressId ? `?id=${encodeURIComponent(addressId)}` : ''
    uni.navigateTo({
      url: `/pages/address/edit${query}`,
      fail() {},
    })
  }

  async function logout() {
    // 无论 authBusy 与否都清本地会话，避免「已退出」但 token 仍在
    authBusy.value = true
    try {
      if (token.value) {
        try {
          await logoutRemote()
        } catch {
          /* 本地仍清会话 */
        }
      }
    } finally {
      clearSession()
      profileChecked = false
      if (loginWaitPromise) resolveLoginRequest(false)
      authBusy.value = false
    }
  }

  function handleUnauthorized() {
    clearSession()
  }

  subscribeUnauthorized(handleUnauthorized)

  function setRitualFilter(id: RitualId | null) {
    ritualFilter.value = id
  }

  function setCategoryId(id: string | null) {
    categoryId.value = id
  }

  function openProduct(id: string) {
    productId.value = id
  }

  function closeProduct() {
    productId.value = null
  }

  function setCartOpen(open: boolean) {
    cartOpen.value = open
  }

  function goMenu(opts?: { replace?: boolean }) {
    productId.value = null
    cartOpen.value = false
    suppressTabBar.value = false
    if (currentTabUrl() === MENU_URL) {
      hideNativeTabBar()
      return
    }
    const open = opts?.replace ? uni.redirectTo : uni.navigateTo
    open({
      url: MENU_URL,
      fail() {
        if (opts?.replace) return
        uni.redirectTo({ url: MENU_URL, fail() {} })
      },
      complete() {
        hideNativeTabBar()
      },
    })
  }

  function goMenuWithRitual(id: RitualId | null) {
    ritualFilter.value = id
    categoryId.value = null
    goMenu()
  }

  function openStorePicker(mode?: FulfillmentMode | null) {
    productId.value = null
    cartOpen.value = false
    const next = mode === undefined ? fulfillmentMode.value : mode
    const query = next ? `?mode=${next}` : ''
    uni.navigateTo({
      url: `/pages/stores/index${query}`,
      fail() {},
    })
  }

  function clearTable() {
    tableCode.value = null
    tableId.value = null
    tableName.value = null
    tableFromScan.value = false
  }

  function stashDineTableForPack() {
    if (tableId.value == null && tableCode.value == null && !tableName.value) {
      return
    }
    stashedDineTable.value = {
      tableId: tableId.value,
      tableCode: tableCode.value,
      tableName: tableName.value,
      tableFromScan: tableFromScan.value,
    }
    clearTable()
  }

  function restoreStashedDineTable() {
    const stash = stashedDineTable.value
    if (!stash) return false
    tableId.value = stash.tableId
    tableCode.value = stash.tableCode
    tableName.value = stash.tableName
    tableFromScan.value = stash.tableFromScan
    stashedDineTable.value = null
    return true
  }

  /** 到店堂食：先过登录协议门禁，再进入选店。 */
  async function startDineIn() {
    if (!loggedIn.value || !token.value) {
      const ok = await requestLogin()
      if (!ok) return
    } else {
      const ok = await ensureLogin()
      if (!ok) return
    }
    fulfillmentMode.value = 'dine_in'
    pickupSubMode.value = 'dine_in'
    openStorePicker('dine_in')
  }

  function startDelivery() {
    fulfillmentMode.value = 'delivery'
    stashedDineTable.value = null
    clearTable()
    openAddressBook()
  }

  function setFulfillmentMode(mode: FulfillmentMode) {
    if (mode === fulfillmentMode.value) return
    fulfillmentMode.value = mode
    if (mode === 'delivery') {
      stashedDineTable.value = null
      clearTable()
      pickupSubMode.value = 'dine_in'
    }
  }

  function setPickupSubMode(mode: PickupSubMode) {
    // 确认单「店内就餐/打包」与点单履约同属堂食侧；须写入 fulfillmentMode，否则 submit 仍判未选
    fulfillmentMode.value = 'dine_in'
    if (mode === 'pack') {
      stashDineTableForPack()
    } else if (mode === 'dine_in') {
      restoreStashedDineTable()
    }
    pickupSubMode.value = mode
  }

  // 真后端桌台是 18 位雪花大整数 id（与 store_id 同精度问题），全程按 string 透传。
// 删除本地假桌码 id 映射——A1/A2/A3 只是占位展示，不再写入 tableId，避免真后端报"桌台不存在"。

/**
 * 本地占位桌码（A1/A2/A3）。仅展示用，不再用于组装请求体的桌台 id。
 * 未选真实桌台时 tableId=null（加购不强制关联，下单时由确认单卡口）。
 */
function setTableCode(code: TableCode | null) {
  tableCode.value = code
  tableId.value = null
  tableName.value = code
  tableFromScan.value = false
  fulfillmentMode.value = 'dine_in'
  pickupSubMode.value = 'dine_in'
}

/** 确认单选桌：写入契约返回的真实 table_id（string 透传，避免大整数精度丢失）。 */
function applyAvailableTable(table: {
  table_id: string | number
  table_code: string
  table_name: string
} | null) {
  fulfillmentMode.value = 'dine_in'
  pickupSubMode.value = 'dine_in'
  stashedDineTable.value = null
  if (!table) {
    clearTable()
    return
  }
  const tid = String(table.table_id ?? '').trim()
  if (!/^\d+$/.test(tid)) {
    throw new Error('桌台编号无效')
  }
  tableId.value = tid
  tableCode.value = (table.table_code || null) as TableCode | null
  tableName.value = table.table_name || table.table_code || null
  tableFromScan.value = false
}

/**
 * 扫桌码 resolve 成功后：切店 + 堂食 + 真实桌台。
 * 调用方负责随后 occupy。table_id 透传 string（真后端 18 位大整数，禁走 Number()）。
 */
async function applyResolvedTable(res: {
  store_id: string
  table_id: string
  table_code: string
  table_name: string
}) {
  // 勿用 await import()：mp-weixin 会编译成 await "./catalog.js" 字符串，导致 useCatalogStore 非函数
  const catalog = useCatalogStore()
  const storeId = toStoreId(res.store_id)
  const tid = String(res.table_id ?? '').trim()
  if (!/^\d+$/.test(tid)) {
    throw new Error('桌台编号无效')
  }
  const page = await listMpStores({ page: 1, page_size: 100 })
  const store = (page.list ?? []).find((item) => storeIdOf(item) === storeId)
  if (!store) {
    throw new Error('桌码对应门店不可用')
  }
  await catalog.selectStore(store)
  fulfillmentMode.value = 'dine_in'
  pickupSubMode.value = 'dine_in'
  stashedDineTable.value = null
  tableId.value = tid
  tableCode.value = res.table_code
  tableName.value = res.table_name
  tableFromScan.value = true
}

  function saveDeliveryAddress(next: DeliveryAddress) {
    deliveryAddress.value = next
    uni.setStorageSync(ADDRESS_KEY, next)
  }

  function clearDeliveryAddress() {
    deliveryAddress.value = null
    try {
      uni.removeStorageSync(ADDRESS_KEY)
    } catch {
      /* ignore */
    }
  }

  /**
   * 从 `/api/mp/customer/addresses` 取默认或首条写入本地缓存。
   * 失败不挡登录；gender 契约无，保留本地已有或默认「先生」。
   */
  async function hydrateDeliveryAddressFromApi(): Promise<void> {
    if (!token.value) return
    try {
      const data = await listAddresses()
      const list = data?.list ?? []
      if (!list.length) {
        // 服务端无地址时去掉本地失效 id，避免编辑页误走 PUT
        const local = deliveryAddress.value
        if (local?.address_id) {
          saveDeliveryAddress({ ...local, address_id: undefined })
        }
        return
      }
      const preferred = list.find((row) => row.is_default === 1) ?? list[0]
      const prevGender = deliveryAddress.value?.gender ?? '先生'
      saveDeliveryAddress(addressResToDelivery(preferred, prevGender))
    } catch (error) {
      console.warn('[元气善筑] hydrateDeliveryAddressFromApi 失败', error)
    }
  }

  function orderModeLabel(): '堂食' | '外带' | '外卖' {
    if (fulfillmentMode.value === 'delivery') return '外卖'
    if (pickupSubMode.value === 'pack') return '外带'
    return '堂食'
  }

  return {
    ritualFilter,
    categoryId,
    productId,
    cartOpen,
    loginSheetMode,
    suppressTabBar,
    token,
    user,
    authBusy,
    loggedIn,
    productOpen,
    tabBarVisible,
    fulfillmentMode,
    pickupSubMode,
    tableCode,
    tableId,
    tableName,
    tableFromScan,
    deliveryAddress,
    memberActive,
    coffeeDiscountRate,
    mallDiscountRate,
    restoreSession,
    verifySession,
    refreshMemberRates,
    login,
    requestLogin,
    resolveLoginRequest,
    hasPendingLoginRequest,
    ensureLogin,
    logout,
    applyUser,
    applyUserInfo,
    refreshProfile,
    handleUnauthorized,
    setRitualFilter,
    setCategoryId,
    openStorePicker,
    openAddressBook,
    openAddressEditor,
    startDineIn,
    startDelivery,
    setFulfillmentMode,
    setPickupSubMode,
    setTableCode,
    applyAvailableTable,
    applyResolvedTable,
    clearTable,
    saveDeliveryAddress,
    clearDeliveryAddress,
    hydrateDeliveryAddressFromApi,
    orderModeLabel,
    openProduct,
    closeProduct,
    setCartOpen,
    setSuppressTabBar,
    goMenu,
    goMenuWithRitual,
    goTab,
    hideNativeTabBar,
  }
})
