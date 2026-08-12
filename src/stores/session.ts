import { computed, nextTick, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { fetchAuthProfile, loginByWxCode, logoutRemote } from '@/common/apis/authApi'
import type { RitualId } from '@/common/types/catalog'
import type { AuthUser } from '@/common/types/auth'
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

export type TabUrl = (typeof TAB_URLS)[number]

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

  /** TODO(DEV-013) 选店列表界面未做，点击不得误跳点单 Tab。 */
  function openStorePicker() {}

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
    restoreSession,
    verifySession,
    login,
    logout,
    handleUnauthorized,
    setRitualFilter,
    setCategoryId,
    openStorePicker,
    openProduct,
    closeProduct,
    setCartOpen,
    setSuppressTabBar,
    goMenuWithRitual,
    goTab,
    hideNativeTabBar,
  }
})
