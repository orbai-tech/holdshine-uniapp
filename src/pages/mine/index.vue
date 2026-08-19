<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import { bindPhone, updateProfile, uploadAvatar, toAuthUser } from '@/common/apis/authApi'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import { formatMemberNo } from '@/utils/memberLabel'
import { resolveMediaUrl } from '@/utils/mediaUrl'
import MemberSection from './components/member-section.vue'
import { useMemberPack } from './useMemberPack'

const session = useSessionStore()
const member = useMemberPack()
const {
  summary,
  displayPoints,
  remainingDaysText,
  offerLevels,
  benefitsDescription,
  subscriptions,
  subscribeBusy,
  subsSheetOpen,
} = member
const loading = ref(false)
const errorText = ref('')
const nickSheetOpen = ref(false)
const phoneSheetOpen = ref(false)
const nickDraft = ref('')
const phoneDraft = ref('')
const profileBusy = ref(false)

const displayName = computed(() => session.user?.nickname || '元气善筑会员')

const memberNoText = computed(() => {
  const fromSession = session.user?.memberNo
  if (fromSession) return formatMemberNo(fromSession)
  return formatMemberNo(summary.value?.member_no)
})

const avatarUrl = computed(() => {
  const path = session.user?.avatarPath
  return path ? resolveMediaUrl(path) : ''
})

const avatarInitial = computed(
  () => session.user?.avatarInitial || displayName.value.slice(0, 1) || '?',
)

const mobileMasked = computed(() => {
  const mobile = session.user?.mobile || ''
  if (!/^1\d{10}$/.test(mobile)) return ''
  return `${mobile.slice(0, 3)}****${mobile.slice(7)}`
})

const anySheetOpen = computed(
  () => subsSheetOpen.value || nickSheetOpen.value || phoneSheetOpen.value,
)

async function load() {
  if (!session.loggedIn) {
    member.clearMemberState()
    errorText.value = ''
    loading.value = false
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    await member.loadMember()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onShow(() => {
  session.hideNativeTabBar()
  void load()
})

watch(anySheetOpen, (open) => {
  session.setSuppressTabBar(open)
})

async function onLogin() {
  const ok = await session.requestLogin()
  if (!ok) return
  await load()
}

async function onReconsent() {
  const ok = await session.requestReconsent()
  if (!ok) return
  await load()
}

async function onLogout() {
  await session.logout()
  member.clearMemberState()
  uni.showToast({ title: '已退出登录', icon: 'none' })
}

function onOpenCoupons() {
  uni.navigateTo({ url: '/pages/coupons/index' })
}

function onOpenPoints() {
  uni.navigateTo({ url: '/pages/points/index' })
}

function openNickSheet() {
  nickDraft.value = session.user?.nickname || ''
  nickSheetOpen.value = true
}

async function saveNickname() {
  if (profileBusy.value) return
  const nickname = nickDraft.value.trim()
  if (!nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  profileBusy.value = true
  try {
    const user = await updateProfile({ nickname })
    session.applyUser(user)
    nickSheetOpen.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
    await load()
  } catch (error) {
    const message = toErrorMessage(error, '保存失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    profileBusy.value = false
  }
}

async function onPickAvatar() {
  if (profileBusy.value || !session.loggedIn) return
  try {
    const picked = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject,
      })
    })
    const filePath = picked.tempFilePaths?.[0]
    if (!filePath) return
    profileBusy.value = true
    const data = await uploadAvatar(filePath)
    session.applyUser(toAuthUser(data.userinfo))
    uni.showToast({ title: '头像已更新', icon: 'none' })
    await load()
  } catch (error) {
    const message = toErrorMessage(error, '上传失败')
    if (message.includes('cancel') || message.includes('取消')) return
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    profileBusy.value = false
  }
}

function openPhoneSheet() {
  phoneDraft.value = session.user?.mobile || ''
  phoneSheetOpen.value = true
}

async function savePhoneManual() {
  if (profileBusy.value) return
  const mobile = phoneDraft.value.trim()
  if (!/^1\d{10}$/.test(mobile)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  profileBusy.value = true
  try {
    const user = await bindPhone({ mobile })
    session.applyUser(user)
    phoneSheetOpen.value = false
    uni.showToast({ title: '已绑定', icon: 'none' })
    await load()
  } catch (error) {
    const message = toErrorMessage(error, '绑定失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    profileBusy.value = false
  }
}

async function onGetPhoneNumber(event: {
  detail?: { code?: string; errMsg?: string; phoneNumber?: string }
}) {
  if (profileBusy.value) return
  if (mobileMasked.value) return
  const detail = event.detail || {}
  if (!detail.code) {
    if (detail.errMsg && !detail.errMsg.includes('deny') && !detail.errMsg.includes('cancel')) {
      uni.showToast({ title: '未获取到手机号', icon: 'none' })
    }
    return
  }
  profileBusy.value = true
  try {
    const user = await bindPhone({
      mobile: detail.phoneNumber || '',
      wx_phone_code: detail.code,
    })
    session.applyUser(user)
    uni.showToast({ title: '已绑定', icon: 'none' })
    await load()
  } catch (error) {
    const message = toErrorMessage(error, '绑定失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    profileBusy.value = false
  }
}
</script>

<template>
  <SoorakChrome title="我的">
    <view v-if="loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="errorText" class="mp-empty">
      <text class="t-caption">{{ errorText }}</text>
      <SoorakButton @click="load">重试</SoorakButton>
    </view>
    <view v-else class="page-mine page-pad">
      <view
        v-if="session.needReconsent"
        class="reconsent-bar"
        @click="onReconsent"
      >
        <text class="reconsent-bar__text">协议已更新，请重新阅读并同意</text>
        <text class="reconsent-bar__go">去处理 ›</text>
      </view>
      <view class="member-hero">
        <view class="member-hero__label-row">
          <text class="t-label member-hero__label">元气善筑</text>
          <text
            v-if="session.loggedIn"
            class="member-hero__edit"
            @click="member.openSubsSheet()"
          >
            月卡购买记录
          </text>
        </view>
        <template v-if="session.loggedIn">
          <view class="member-hero__top">
            <view class="member-avatar" @click="onPickAvatar">
              <image v-if="avatarUrl" :src="avatarUrl" mode="aspectFill" class="member-avatar__img" />
              <text v-else class="member-avatar__initial">{{ avatarInitial }}</text>
            </view>
            <view class="member-hero__id">
              <view class="member-hero__name-row" @click="openNickSheet">
                <text class="member-hero__name">{{ displayName }}</text>
                <text class="member-hero__edit">编辑</text>
              </view>
              <text v-if="summary" class="member-hero__tier">{{ summary.level_name }}</text>
              <text v-if="summary || session.user?.memberNo" class="member-no">
                No. {{ memberNoText }}
              </text>
              <text v-else class="t-caption member-hero__cap">会员资料加载中或暂不可用</text>
            </view>
          </view>
          <MemberSection
            v-if="summary"
            area="stats"
            :summary="summary"
            :display-points="displayPoints"
            :remaining-days-text="remainingDaysText"
            :offer-levels="offerLevels"
            :benefits-description="benefitsDescription"
            :subscriptions="subscriptions"
            :subscribe-busy="subscribeBusy"
            :subs-sheet-open="subsSheetOpen"
            @open-points="onOpenPoints"
          />
        </template>
        <template v-else>
          <text class="member-hero__name">欢迎贵宾光临元气善筑</text>
          <text class="t-caption member-hero__cap">同步订单、礼遇与会员月卡</text>
          <view class="member-hero__login">
            <SoorakButton block @click="onLogin">
              {{ session.authBusy ? '登录中…' : '微信一键登录' }}
            </SoorakButton>
          </view>
        </template>
      </view>

      <view class="member-actions">
        <SoorakButton block @click="session.goMenu()">会员礼遇 · 去点单</SoorakButton>
      </view>

      <MemberSection
        v-if="session.loggedIn && summary"
        area="main"
        :summary="summary"
        :display-points="displayPoints"
        :remaining-days-text="remainingDaysText"
        :offer-levels="offerLevels"
        :benefits-description="benefitsDescription"
        :subscriptions="subscriptions"
        :subscribe-busy="subscribeBusy"
        :subs-sheet-open="subsSheetOpen"
        @subscribe="member.subscribeAndPay"
        @resume-pay="member.resumeSubscriptionPay"
        @update:subs-sheet-open="subsSheetOpen = $event"
      />

      <view class="mine-cells">
        <template v-if="session.loggedIn">
          <!-- #ifdef MP-WEIXIN -->
          <view v-if="mobileMasked" class="mine-cell">
            <text>手机号</text>
            <text class="mine-cell__em">{{ mobileMasked }}</text>
          </view>
          <button
            v-else
            class="mine-cell mine-cell--btn"
            open-type="getPhoneNumber"
            :disabled="profileBusy"
            @getphonenumber="onGetPhoneNumber"
          >
            <text>手机号</text>
            <text class="mine-cell__em">去绑定 ›</text>
          </button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <view class="mine-cell" @click="openPhoneSheet">
            <text>手机号</text>
            <text class="mine-cell__em">{{ mobileMasked || '去绑定 ›' }}</text>
          </view>
          <!-- #endif -->
        </template>
        <view class="mine-cell" @click="session.goTab('/pages/orders/index')">
          <text>我的订单</text>
          <text class="mine-cell__em">›</text>
        </view>
        <view class="mine-cell" @click="session.goTab('/pages/select/index')">
          <text>选物</text>
          <text class="mine-cell__em">›</text>
        </view>
        <view class="mine-cell" @click="session.setCartOpen(true)">
          <text>购物袋</text>
          <text class="mine-cell__em">›</text>
        </view>
        <view class="mine-cell" @click="onOpenCoupons">
          <text>礼遇匣</text>
          <text class="mine-cell__em">›</text>
        </view>
        <view v-if="session.loggedIn" class="mine-cell" @click="onOpenPoints">
          <text>积分明细</text>
          <text class="mine-cell__em">›</text>
        </view>
        <view class="mine-cell" @click="session.openAddressBook()">
          <text>收货地址</text>
          <text class="mine-cell__em">›</text>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <button class="mine-cell mine-cell--btn" open-type="contact">
          <text>联系客服</text>
          <text class="mine-cell__em">微信 ›</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="mine-cell">
          <text>联系客服</text>
          <text class="mine-cell__em">微信 ›</text>
        </view>
        <!-- #endif -->
        <view class="mine-cell">
          <text>关于元气善筑</text>
          <text class="mine-cell__em">V1.0 ›</text>
        </view>
      </view>

      <view v-if="session.loggedIn" class="mine-logout">
        <SoorakButton variant="secondary" block @click="onLogout">
          {{ session.authBusy ? '退出中…' : '退出登录' }}
        </SoorakButton>
      </view>
    </view>

    <SoorakSheet :open="nickSheetOpen" title="编辑昵称" @close="nickSheetOpen = false">
      <view class="profile-sheet">
        <input
          v-model="nickDraft"
          class="profile-sheet__input"
          maxlength="20"
          placeholder="请输入昵称"
          placeholder-class="profile-sheet__ph"
        />
      </view>
      <template #footer>
        <SoorakButton block :disabled="profileBusy" @click="saveNickname">
          {{ profileBusy ? '保存中…' : '保存' }}
        </SoorakButton>
      </template>
    </SoorakSheet>

    <SoorakSheet :open="phoneSheetOpen" title="绑定手机号" @close="phoneSheetOpen = false">
      <view class="profile-sheet">
        <input
          v-model="phoneDraft"
          class="profile-sheet__input"
          type="number"
          maxlength="11"
          placeholder="请输入手机号"
          placeholder-class="profile-sheet__ph"
        />
        <text class="t-caption profile-sheet__hint">仅用于联调；小程序请用微信授权手机号</text>
      </view>
      <template #footer>
        <SoorakButton block :disabled="profileBusy" @click="savePhoneManual">
          {{ profileBusy ? '绑定中…' : '确认绑定' }}
        </SoorakButton>
      </template>
    </SoorakSheet>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.member-hero {
  background: $mp-ink;
  color: $mp-paper;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
}

.reconsent-bar {
  margin-bottom: 20rpx;
  padding: 24rpx 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.reconsent-bar__text {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  line-height: 1.5;
  color: $mp-ink;
}

.reconsent-bar__go {
  flex-shrink: 0;
  font-size: 24rpx;
  color: $mp-brass;
  letter-spacing: 0.04em;
}

.member-hero__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.member-hero__label {
  color: rgba(247, 244, 238, 0.45);
}

.member-hero__top {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.member-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(247, 244, 238, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 2rpx rgba(196, 164, 108, 0.45);
}

.member-avatar__img {
  width: 100%;
  height: 100%;
}

.member-avatar__initial {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 44rpx;
  color: $mp-brass-soft;
}

.member-hero__id {
  min-width: 0;
  flex: 1;
}

.member-hero__name-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.member-hero__name {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 48rpx;
  font-weight: 500;
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-hero__edit {
  font-size: 22rpx;
  letter-spacing: 0.08em;
  color: $mp-brass-soft;
  flex-shrink: 0;
}

.member-hero__tier {
  display: block;
  margin-top: 8rpx;
  color: $mp-brass-soft;
  font-size: 26rpx;
}

.member-no {
  display: block;
  margin-top: 12rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.member-hero__cap {
  display: block;
  margin-top: 16rpx;
  color: rgba(247, 244, 238, 0.5);
}

.member-hero__login {
  margin-top: 32rpx;
}

.member-actions {
  margin: 32rpx 0 16rpx;
}

.mine-cells {
  margin-top: 40rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
  overflow: hidden;
}

.mine-cell {
  width: 100%;
  min-height: 96rpx;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid $mp-border;
  font-size: 28rpx;
  box-sizing: border-box;
}

.mine-cell--btn {
  border-radius: 0;
  background: transparent;
  text-align: left;
  line-height: inherit;
  border-left: none;
  border-right: none;
  border-top: none;
  color: inherit;
}

.mine-cell--btn::after {
  border: none;
}

.mine-cell:last-child {
  border-bottom: none;
}

.mine-cell__em {
  color: $mp-text-3;
  font-size: 24rpx;
}

.mine-logout {
  margin-top: 32rpx;
}

.profile-sheet {
  padding: 24rpx 32rpx 16rpx;
}

.profile-sheet__input {
  width: 100%;
  min-height: 88rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: $mp-cloud;
  border-radius: 12rpx;
  font-size: 30rpx;
  color: $mp-text;
}

.profile-sheet__ph {
  color: $mp-text-3;
}

.profile-sheet__hint {
  display: block;
  margin-top: 16rpx;
}
</style>
