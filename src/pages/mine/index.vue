<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import { getMemberBundle } from '@/common/apis/memberApi'
import { useSessionStore } from '@/stores/session'
import type { MemberPayload, MemberTier } from '@/common/types/member'
import { toErrorMessage } from '@/utils/errorMessage'

const session = useSessionStore()
const loading = ref(false)
const errorText = ref('')
const bundle = ref<MemberPayload | null>(null)
const tiersSheetOpen = ref(false)

const progress = computed(() => {
  if (!bundle.value) return 0
  return Math.min(100, (bundle.value.profile.growth / 5000) * 100)
})

const currentTier = computed<MemberTier | null>(() => {
  if (!bundle.value?.tiers.length) return null
  const byName = bundle.value.tiers.find((tier) => bundle.value!.profile.tier.includes(tier.name))
  if (byName) return byName
  let matched = bundle.value.tiers[0]
  for (const tier of bundle.value.tiers) {
    if (bundle.value.profile.growth >= tier.threshold) matched = tier
  }
  return matched
})

async function load() {
  if (!session.loggedIn) {
    bundle.value = null
    errorText.value = ''
    loading.value = false
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    bundle.value = await getMemberBundle()
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

watch(tiersSheetOpen, (open) => {
  session.setSuppressTabBar(open)
})

async function onLogin() {
  try {
    await session.login()
    uni.showToast({ title: '登录成功', icon: 'none' })
    await load()
  } catch (error) {
    console.error('[元气善筑] 登录失败', error)
    const message = toErrorMessage(error, '登录失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  }
}

async function onLogout() {
  await session.logout()
  bundle.value = null
  uni.showToast({ title: '已退出登录', icon: 'none' })
}

function openTiersSheet() {
  tiersSheetOpen.value = true
}

function onOpenCoupons() {
  uni.navigateTo({ url: '/pages/coupons/index' })
}

function tierThresholdText(tier: MemberTier) {
  return tier.threshold === 0 ? '注册即享' : `成长值 ${tier.threshold}`
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
      <view class="member-hero">
        <text class="t-label member-hero__label">元气善筑</text>
        <template v-if="session.loggedIn && bundle">
          <text class="member-hero__name">{{ bundle.profile.name }}</text>
          <text class="member-hero__tier">{{ bundle.profile.tier }}</text>
          <text class="member-no">No. {{ bundle.profile.memberNo }}</text>
          <view class="member-bar">
            <view class="member-bar__fill" :style="{ width: `${progress}%` }" />
          </view>
          <text class="t-caption member-hero__cap">
            距 {{ bundle.profile.nextTier }} 还需 {{ bundle.profile.nextNeed }} 成长值
          </text>
          <view class="member-stats">
            <view>
              <text class="member-stats__k">余额</text>
              <text class="member-stats__v">¥{{ bundle.profile.balance }}</text>
            </view>
            <view>
              <text class="member-stats__k">积分</text>
              <text class="member-stats__v">{{ bundle.profile.points }}</text>
            </view>
            <view>
              <text class="member-stats__k">成长值</text>
              <text class="member-stats__v">{{ bundle.profile.growth }}</text>
            </view>
          </view>
        </template>
        <template v-else>
          <text class="member-hero__name">欢迎贵宾光临元气善筑</text>
          <text class="t-caption member-hero__cap">同步订单、礼遇与成长值</text>
          <view class="member-hero__login">
            <SoorakButton block @click="onLogin">
              {{ session.authBusy ? '登录中…' : '微信一键登录' }}
            </SoorakButton>
          </view>
        </template>
      </view>

      <view class="member-actions">
        <SoorakButton block @click="session.goTab('/pages/menu/index')">会员礼遇 · 去点单</SoorakButton>
      </view>

      <template v-if="session.loggedIn && bundle && currentTier">
        <text class="t-section block-title">等级礼遇</text>
        <view class="tier-list">
          <view v-for="tier in bundle.tiers" :key="tier.id">
            <view v-if="tier.id === currentTier.id" class="tier-card">
              <text class="tier-card__name">{{ tier.name }}</text>
              <text class="t-caption">{{ tierThresholdText(tier) }}</text>
              <view class="tier-card__perks">
                <view v-for="perk in tier.perks" :key="perk" class="tier-card__perk">
                  <view class="tier-card__dot" />
                  <text>{{ perk }}</text>
                </view>
              </view>
            </view>
            <view v-else class="tier-row" @click="openTiersSheet">
              <text class="tier-row__name">{{ tier.name }}</text>
              <text class="t-caption">{{ tierThresholdText(tier) }} · 礼遇</text>
            </view>
          </view>
        </view>
      </template>

      <view class="mine-cells">
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

    <SoorakSheet :open="tiersSheetOpen" title="全部礼遇" @close="tiersSheetOpen = false">
      <view v-if="bundle" class="tier-sheet">
        <view v-for="tier in bundle.tiers" :key="tier.id" class="tier-card">
          <text class="tier-card__name">{{ tier.name }}</text>
          <text class="t-caption">{{ tierThresholdText(tier) }}</text>
          <view class="tier-card__perks">
            <view v-for="perk in tier.perks" :key="perk" class="tier-card__perk">
              <view class="tier-card__dot" />
              <text>{{ perk }}</text>
            </view>
          </view>
        </view>
      </view>
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

.member-hero__label {
  color: rgba(247, 244, 238, 0.45);
}

.member-hero__name {
  display: block;
  margin: 16rpx 0 8rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 56rpx;
  font-weight: 500;
}

.member-hero__tier {
  color: $mp-brass-soft;
  font-size: 26rpx;
}

.member-no {
  display: block;
  margin-top: 20rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.member-bar {
  margin-top: 32rpx;
  height: 4rpx;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999rpx;
  overflow: hidden;
}

.member-bar__fill {
  height: 100%;
  background: $mp-brass;
}

.member-hero__cap {
  display: block;
  margin-top: 16rpx;
  color: rgba(247, 244, 238, 0.5);
}

.member-hero__login {
  margin-top: 32rpx;
}

.member-stats {
  margin-top: 32rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.12);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.member-stats__k {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.1em;
  color: rgba(247, 244, 238, 0.45);
  margin-bottom: 8rpx;
}

.member-stats__v {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 36rpx;
  font-weight: 500;
}

.member-actions {
  margin: 32rpx 0 16rpx;
}

.block-title {
  display: block;
  margin: 40rpx 0 24rpx;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.tier-card {
  padding: 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
}

.tier-card__name {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.tier-card__perks {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.tier-card__perk {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  font-size: 24rpx;
  color: $mp-text-2;
}

.tier-card__dot {
  width: 8rpx;
  height: 8rpx;
  margin-top: 14rpx;
  border-radius: 50%;
  background: $mp-brass;
  flex-shrink: 0;
}

.tier-row {
  padding: 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.tier-row__name {
  font-size: 28rpx;
  font-weight: 500;
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
}

.mine-cell--btn {
  border-radius: 0;
  background: transparent;
  text-align: left;
  line-height: inherit;
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

.tier-sheet {
  padding: 24rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
</style>
