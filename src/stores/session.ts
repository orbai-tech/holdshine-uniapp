import { computed, ref, watch } from 'vue'
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

export const useSessionStore = defineStore('session', () => {
  const ritualFilter = ref<RitualId | null>(null)
  const categoryId = ref<number | null>(null)
  const productId = ref<string | null>(null)
  const cartOpen = ref(false)
  const token = ref('')
  const user = ref<AuthUser | null>(null)
  const authBusy = ref(false)
  const lastLoginMock = ref(false)

  const productOpen = computed(() => Boolean(productId.value))
  const loggedIn = computed(() => Boolean(token.value && user.value))

  let tabBarLocked = false
  let profileChecked = false

  type TabUrl =
    | '/pages/home/index'
    | '/pages/menu/index'
    | '/pages/orders/index'
    | '/pages/member/index'
    | '/pages/mine/index'

  function currentTabUrl(): string {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1]
    return page?.route ? `/${page.route}` : ''
  }

  function syncTabBar() {
    if (tabBarLocked) return
    if (productId.value || cartOpen.value) {
      uni.hideTabBar({ animation: false })
      return
    }
    uni.showTabBar({ animation: false })
  }

  watch([productId, cartOpen], syncTabBar)

  function goTab(url: TabUrl) {
    tabBarLocked = true
    productId.value = null
    cartOpen.value = false
    if (currentTabUrl() === url) {
      tabBarLocked = false
      syncTabBar()
      return
    }
    uni.switchTab({
      url,
      // 基础库 3.x 对未处理的 switchTab fail 会打 MiniProgramError
      fail() {},
      complete() {
        tabBarLocked = false
        syncTabBar()
      },
    })
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
      console.info('[SOORAK] 准备换票', payload.platform, payload.code.slice(0, 8))
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
      await logoutRemote().catch(() => undefined)
    } finally {
      clearSession()
      authBusy.value = false
    }
  }

  subscribeUnauthorized(() => {
    token.value = ''
    user.value = null
    lastLoginMock.value = false
  })

  function handleUnauthorized() {
    clearSession()
  }

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
    token,
    user,
    authBusy,
    lastLoginMock,
    loggedIn,
    productOpen,
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
    goMenuWithRitual,
    goTab,
  }
})
