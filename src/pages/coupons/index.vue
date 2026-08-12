<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'

type PerkId = 'tea' | 'instant'

type Perk = {
  id: PerkId
  name: string
  amount: string
  rule: string
  note: string
  dot: 'brass' | 'moss'
}

const PERKS: Perk[] = [
  {
    id: 'tea',
    name: '品茗礼',
    amount: '减 ¥3',
    rule: '满 ¥10 可享 · 门店饮品',
    note: '适合一次轻饮，或与友人分席',
    dot: 'brass',
  },
  {
    id: 'instant',
    name: '即席礼',
    amount: '减 ¥4',
    rule: '无门槛 · 单笔可用一次',
    note: '今日想少想一点时，直接入席',
    dot: 'moss',
  },
]

const session = useSessionStore()
const statusBarPx = uni.getSystemInfoSync().statusBarHeight || 0

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
})

onHide(() => {
  session.setSuppressTabBar(false)
})

onUnload(() => {
  // suppressTabBar 需在离开子页时复位，避免回 Tab 后永久隐藏
  session.setSuppressTabBar(false)
})

function onBack() {
  uni.navigateBack()
}

async function onEnjoy() {
  if (!session.loggedIn) {
    try {
      await session.login()
      uni.showToast({ title: '登录成功', icon: 'none' })
    } catch (error) {
      console.error('[元气善筑] 登录失败', error)
      const message = toErrorMessage(error, '登录失败')
      if (message !== 'UNAUTHORIZED') {
        uni.showToast({ title: message.slice(0, 40), icon: 'none' })
      }
    }
    return
  }
  session.goTab('/pages/menu/index')
}
</script>

<template>
  <!-- hide-nav：本页自绘返回条，不依赖内置 Nav 是否挂载成功 -->
  <SoorakChrome title="礼遇匣" hide-nav>
    <view class="coupons-nav" :style="{ paddingTop: `${statusBarPx}px` }">
      <view class="coupons-nav__inner">
        <view class="coupons-nav__back" @click="onBack">‹</view>
        <text class="coupons-nav__title">礼遇匣</text>
        <view class="coupons-nav__side" />
      </view>
    </view>

    <view class="page-coupons page-pad">
      <view class="coupons-head">
        <text class="t-section">待享用的礼遇</text>
        <text class="t-caption">款待，而非催促</text>
      </view>

      <view class="perk-list">
        <view v-for="perk in PERKS" :key="perk.id" class="perk-card">
          <view class="perk-card__label">
            <view class="perk-card__dot" :class="`perk-card__dot--${perk.dot}`" />
            <text class="t-label">{{ perk.name }}</text>
          </view>
          <text class="perk-card__amount">{{ perk.amount }}</text>
          <view class="perk-card__rule">
            <text class="t-caption">{{ perk.rule }}</text>
            <text class="t-caption">{{ perk.note }}</text>
          </view>
          <view class="perk-cta" hover-class="perk-cta--active" @click="onEnjoy">去点单享用</view>
        </view>
      </view>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.coupons-nav {
  background: rgba(247, 244, 238, 0.94);
  border-bottom: 1rpx solid $mp-border;
}

.coupons-nav__inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.coupons-nav__back,
.coupons-nav__side {
  width: 144rpx;
}

.coupons-nav__back {
  font-size: 56rpx;
  line-height: 1;
  color: $mp-text;
}

.coupons-nav__title {
  flex: 1;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
}

.coupons-head {
  margin-bottom: 32rpx;
}

.coupons-head .t-caption {
  display: block;
  margin-top: 8rpx;
}

.perk-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.perk-card {
  padding: 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
}

.perk-card__label {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.perk-card__dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.perk-card__dot--brass {
  background: $mp-brass;
}

.perk-card__dot--moss {
  background: $mp-moss;
}

.perk-card__amount {
  display: block;
  margin: 16rpx 0;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 48rpx;
  font-weight: 500;
  color: $mp-text;
}

.perk-card__rule {
  margin-bottom: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $mp-border;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.perk-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  border-radius: 8rpx;
  background: $mp-moss;
  color: $mp-paper;
  font-size: 26rpx;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.perk-cta--active {
  opacity: 0.92;
  transform: scale(0.98);
  background: $mp-moss-deep;
}

</style>
