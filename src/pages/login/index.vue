<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import {
  fetchMpCurrentVersions,
  listAllLegalDocuments,
  listLegalDocuments,
  pickLegalCurrentVersions,
  pickLegalVersions,
} from '@/common/apis/legalApi'
import type { LegalDocVersions } from '@/common/types/legal'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'

const session = useSessionStore()
const { authBusy } = storeToRefs(session)
const agreed = ref(false)
const versions = ref<LegalDocVersions | null>(null)
const versionsBusy = ref(false)

const canSubmit = computed(() => agreed.value && Boolean(versions.value) && !authBusy.value)
/** 仅勾选协议后才挂 getPhoneNumber，否则点按钮只提示勾选 */
const canRequestPhone = computed(() => canSubmit.value)

const actionLabel = computed(() => (authBusy.value ? '登录中…' : '一键登录'))

const laterLabel = '暂不登录'

onLoad(() => {
  void loadVersions()
})

onShow(() => {
  session.hideNativeTabBar()
})

onUnload(() => {
  if (!session.hasPendingLoginRequest()) return
  session.resolveLoginRequest(false)
})

/**
 * 登录前主动拉协议版本号：
 * 1. 先打超管侧 `/api/web/super-admin/legal/documents` 拿当前生效版。
 *    该接口返回的是**全部历史版本**，必须再用 is_current=true 过滤，
 *    否则传旧版本号会被后端 41000 「隐私协议已更新」拦截。
 * 2. 超管侧失败（401/403/网络等）或数据异常时，优先用 mp 单文档接口
 *    `getLegalDocument(doc_type)` 并发拉两份——顾客端拿到的必然是当前生效版，
 *    不会混入历史版本。
 * 3. 单文档接口也失败时，最后退回 mp 公开清单 `listLegalDocuments` 取最新一条。
 */
async function loadVersions() {
  versionsBusy.value = true
  try {
    let next: LegalDocVersions | null = null
    try {
      const adminList = await listAllLegalDocuments()
      next = pickLegalCurrentVersions(adminList)
      if (!next) {
        // 超管侧清单存在但没有 is_current=true（异常数据），兜底 mp 单文档接口
        next = await fetchMpCurrentVersions()
      }
    } catch (adminError) {
      console.warn(
        '[元-登录] 超管侧协议清单加载失败，回退 mp 当前版接口',
        toErrorMessage(adminError, ''),
      )
      next = await fetchMpCurrentVersions()
    }
    if (!next) {
      // 单文档接口失败时，最后退回 mp 公开清单取最新一条
      const mpList = await listLegalDocuments()
      next = pickLegalVersions(mpList)
    }
    versions.value = next
    if (!versions.value) {
      uni.showToast({ title: '协议版本加载失败', icon: 'none' })
    }
  } catch (error) {
    versions.value = null
    const message = toErrorMessage(error, '协议加载失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    versionsBusy.value = false
  }
}

function leaveLoginPage() {
  session.resolveLoginRequest(false)
  uni.navigateBack({ fail() {} })
}

function onToggleAgree() {
  agreed.value = !agreed.value
  if (agreed.value) requestWxPrivacyAuthorize()
}

/** 业务勾选 ≠ 微信隐私授权；未过微信侧会 toast「需同意用户协议以及隐私协议」 */
function requestWxPrivacyAuthorize() {
  // #ifdef MP-WEIXIN
  const wxApi = (globalThis as { wx?: { requirePrivacyAuthorize?: (opts?: Record<string, unknown>) => void } }).wx
  wxApi?.requirePrivacyAuthorize?.({})
  // #endif
}

function onAgreeWxPrivacy() {
  // 微信已记录隐私同意；业务勾选仍以 agreed 为准
}

function openTerms() {
  uni.navigateTo({
    url: '/pages/legal/terms',
    fail() {},
  })
}

function openPrivacy() {
  uni.navigateTo({
    url: '/pages/legal/privacy',
    fail() {},
  })
}

function guardAgreeAndVersions(): boolean {
  if (authBusy.value) return false
  if (versionsBusy.value) {
    uni.showToast({ title: '协议加载中，请稍候', icon: 'none' })
    return false
  }
  if (!agreed.value) {
    uni.showToast({ title: '请先勾选用户须知与隐私政策', icon: 'none' })
    return false
  }
  if (!versions.value) {
    uni.showToast({ title: '协议版本加载失败，请稍后重试', icon: 'none' })
    void loadVersions()
    return false
  }
  return true
}

function onTapLogin() {
  if (authBusy.value) return
  guardAgreeAndVersions()
}

async function finishLogin(wxPhoneCode?: string) {
  if (!guardAgreeAndVersions()) return
  const consent = versions.value
  if (!consent) return
  try {
    await session.login({
      consent: {
        privacyPolicyVersion: consent.privacyPolicyVersion,
        userHandbookVersion: consent.userHandbookVersion,
      },
      wxPhoneCode,
    })
    if (!session.loggedIn) {
      uni.showToast({ title: '登录失败', icon: 'none' })
      return
    }
    uni.showToast({ title: '登录成功', icon: 'none' })
    session.resolveLoginRequest(true)
    uni.navigateBack({ fail() {} })
  } catch (error) {
    console.error('[元气善筑] 登录失败', error)
    const message = toErrorMessage(error, '登录失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  }
}

/** 微信手机号授权回调：无 code 视为拒绝，不登录 */
async function onGetPhoneNumber(event: {
  detail?: { code?: string; errMsg?: string }
}) {
  if (!guardAgreeAndVersions()) return
  const phoneCode = event.detail?.code
  if (!phoneCode) {
    uni.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
    return
  }
  await finishLogin(phoneCode)
}

/** 非微信端：无 getPhoneNumber，勾选后直接换票 */
async function onConfirmLogin() {
  await finishLogin()
}
</script>

<template>
  <view class="login-page">
    <view class="login-stack">
      <view class="login-logo">
        <text class="login-logo__mark">元</text>
      </view>
      <text class="login-brand">元气善筑</text>

      <!-- #ifdef MP-WEIXIN -->
      <button
        v-if="!canRequestPhone"
        class="login-btn"
        :class="{ 'is-busy': authBusy }"
        hover-class="login-btn--active"
        :disabled="authBusy"
        @tap="onTapLogin"
      >
        <text class="login-btn__text">{{ actionLabel }}</text>
      </button>
      <button
        v-else
        class="login-btn"
        :class="{ 'is-busy': authBusy }"
        hover-class="login-btn--active"
        open-type="getPhoneNumber|agreePrivacyAuthorization"
        :disabled="authBusy"
        @getphonenumber="onGetPhoneNumber"
        @agreeprivacyauthorization="onAgreeWxPrivacy"
      >
        <text class="login-btn__text">{{ actionLabel }}</text>
      </button>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <view
        class="login-btn"
        :class="{ 'is-busy': authBusy }"
        hover-class="login-btn--active"
        @click="onConfirmLogin"
      >
        <text class="login-btn__text">{{ actionLabel }}</text>
      </view>
      <!-- #endif -->

      <text class="login-later" @tap="leaveLoginPage">{{ laterLabel }}</text>
      <view class="login-agree" @tap="onToggleAgree">
        <view class="login-agree__check" :class="{ 'is-on': agreed }" />
        <view class="login-agree__text">
          <text class="login-agree__muted">已阅读并同意</text>
          <text class="login-agree__link" @tap.stop="openTerms">《用户须知》</text>
          <text class="login-agree__link" @tap.stop="openPrivacy">《隐私政策》</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: $mp-paper;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 64rpx calc(48rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.login-stack {
  width: 100%;
  max-width: 560rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: $mp-moss;
  box-shadow: inset 0 0 0 4rpx $mp-brass;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-logo__mark {
  color: $mp-paper;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 72rpx;
  font-weight: 600;
  line-height: 1;
}

.login-brand {
  margin-top: 36rpx;
  color: $mp-ink;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 48rpx;
  font-weight: 600;
  letter-spacing: 0.18em;
}

.login-btn {
  width: 100%;
  min-height: 96rpx;
  margin-top: 64rpx;
  padding: 0;
  border: none;
  border-radius: 999rpx;
  background: $mp-moss;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  font-size: inherit;
  color: inherit;
}

.login-btn::after {
  border: none;
}

.login-btn.is-busy {
  opacity: 0.72;
}

.login-btn--active {
  opacity: 0.88;
}

.login-btn__text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.login-later {
  margin-top: 28rpx;
  font-size: 28rpx;
  color: $mp-text-2;
  letter-spacing: 0.08em;
}

.login-agree {
  margin-top: 36rpx;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  max-width: 100%;
}

.login-agree__check {
  width: 32rpx;
  height: 32rpx;
  margin-top: 4rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2rpx solid $mp-text-3;
  box-sizing: border-box;
}

.login-agree__check.is-on {
  border-color: $mp-moss;
  background: $mp-moss;
  box-shadow: inset 0 0 0 6rpx $mp-paper;
}

.login-agree__text {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  line-height: 1.5;
}

.login-agree__muted {
  font-size: 24rpx;
  color: $mp-text-3;
}

.login-agree__link {
  font-size: 24rpx;
  color: $mp-brass;
}
</style>
