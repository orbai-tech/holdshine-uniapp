import { computed, nextTick, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchAuthProfile, loginByWxCode, logoutRemote } from '@/common/apis/authApi'
import type { RitualId } from '@/common/types/catalog'
import type { AuthUser } from '@/common/types/auth'
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
import { getWxLoginCode } from '@/utils/wxLogin'

const TAB_URLS = [
  '/pages/home/index',
  '/pages/menu/index',
  '/pages/orders/index',
  '/pages/select/index',
  '/pages/mine/index',
] as const

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
  const categoryId = ref<number | null>(null)
  const productId = ref<string | null>(null)
  const cartOpen = ref(false)
  const suppressTabBar = ref(false)
  const token = ref('')
  const user = ref<AuthUser | null>(null)
  const authBusy = ref(false)
  const lastLoginMock = ref(false)

  const fulfillmentMode = ref<FulfillmentMode | null>(null)
  const pickupSubMode = ref<PickupSubMode>('dine_in')
  const tableCode = ref<TableCode | null>(null)
  const deliveryAddress = ref<DeliveryAddress | null>(readStoredAddress())

  const productOpen = computed(() => Boolean(productId.value))
  const loggedIn = computed(() => Boolean(token.value && user.value))
  /** 原生 tabBar 始终隐藏，页面内纯文字导航由 chrome 渲染 */
  const tabBarVisible = computed(
    () => !productOpen.value && !cartOpen.value && !suppressTabBar.value,
  )

  let profileChecked = false

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

  function goTab(url: TabUrl) {
    productId.value = null
    cartOpen.value = false
    suppressTabBar.value = false
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

  function clearSession() {
    token.value = ''
    user.value = null
    lastLoginMock.value = false
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
  }

  async function verifySession() {
    if (profileChecked) return
    profileChecked = true
    if (!token.value || !user.value) return
    try {
      const profile = await fetchAuthProfile()
      applySession(token.value, profile)
    } catch {
      clearSession()
    }
  }

  async function login() {
    if (authBusy.value) return
    authBusy.value = true
    try {
      const payload = await getWxLoginCode()
      console.info('[元气善筑] 准备换票', payload.platform, payload.code.slice(0, 8))
      const result = await loginByWxCode(payload)
      lastLoginMock.value = false
      applySession(result.token, result.user)
    } finally {
      authBusy.value = false
    }
  }

  /** 购物车/下单等写操作入口：已登录直接过；否则静默换票。 */
  async function ensureLogin(): Promise<boolean> {
    if (loggedIn.value) return true
    if (authBusy.value) {
      await new Promise<void>((resolve) => {
        const stop = watch(authBusy, (busy) => {
          if (!busy) {
            stop()
            resolve()
          }
        })
      })
      return loggedIn.value
    }
    try {
      await login()
      return loggedIn.value
    } catch (error) {
      console.warn('[元气善筑] ensureLogin 失败', error)
      return false
    }
  }

  async function logout() {
    if (authBusy.value) return
    authBusy.value = true
    try {
      if (token.value) {
        try {
          await logoutRemote()
        } catch {
          /* 本地仍清会话 */
        }
      }
      clearSession()
    } finally {
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

  function setCategoryId(id: number | null) {
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

  function goMenuWithRitual(id: RitualId | null) {
    ritualFilter.value = id
    categoryId.value = null
    goTab('/pages/menu/index')
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

  function openAddressEditor() {
    productId.value = null
    cartOpen.value = false
    uni.navigateTo({
      url: '/pages/address/edit',
      fail() {},
    })
  }

  function startDineIn() {
    fulfillmentMode.value = 'dine_in'
    pickupSubMode.value = 'dine_in'
    openStorePicker('dine_in')
  }

  function startDelivery() {
    fulfillmentMode.value = 'delivery'
    tableCode.value = null
    openAddressEditor()
  }

  function setFulfillmentMode(mode: FulfillmentMode) {
    if (mode === fulfillmentMode.value) return
    fulfillmentMode.value = mode
    if (mode === 'delivery') {
      tableCode.value = null
      pickupSubMode.value = 'dine_in'
    }
  }

  function setPickupSubMode(mode: PickupSubMode) {
    pickupSubMode.value = mode
    if (mode === 'pack') tableCode.value = null
  }

  function setTableCode(code: TableCode | null) {
    tableCode.value = code
    pickupSubMode.value = 'dine_in'
  }

  function saveDeliveryAddress(next: DeliveryAddress) {
    deliveryAddress.value = next
    uni.setStorageSync(ADDRESS_KEY, next)
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
    suppressTabBar,
    token,
    user,
    authBusy,
    lastLoginMock,
    loggedIn,
    productOpen,
    tabBarVisible,
    fulfillmentMode,
    pickupSubMode,
    tableCode,
    deliveryAddress,
    restoreSession,
    verifySession,
    login,
    ensureLogin,
    logout,
    handleUnauthorized,
    setRitualFilter,
    setCategoryId,
    openStorePicker,
    openAddressEditor,
    startDineIn,
    startDelivery,
    setFulfillmentMode,
    setPickupSubMode,
    setTableCode,
    saveDeliveryAddress,
    orderModeLabel,
    openProduct,
    closeProduct,
    setCartOpen,
    setSuppressTabBar,
    goMenuWithRitual,
    goTab,
    hideNativeTabBar,
  }
})
