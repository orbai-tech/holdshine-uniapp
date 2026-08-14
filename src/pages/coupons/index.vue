<script setup lang="ts">
import { ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import { claimCoupon, listAvailableCoupons } from '@/common/apis/couponApi'
import type { CouponTemplateBriefRes } from '@/common/types/coupon'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'

const session = useSessionStore()
const catalog = useCatalogStore()
const statusBarPx = uni.getSystemInfoSync().statusBarHeight || 0

const perks = ref<CouponTemplateBriefRes[]>([])
const loading = ref(false)
const claimingId = ref<string | null>(null)

function formatAmount(perk: CouponTemplateBriefRes): string {
  const discount = perk.discount_amount
  if (discount != null && discount !== '' && Number(discount) > 0) {
    return `减 ¥${Number(discount)}`
  }
  if (perk.discount_rate != null && perk.discount_rate !== '') {
    return `${Number(perk.discount_rate) * 10} 折`
  }
  return perk.coupon_name
}

function formatRule(perk: CouponTemplateBriefRes): string {
  const threshold = Number(perk.threshold_amount || 0)
  if (threshold > 0) return `满 ¥${threshold} 可享 · 门店饮品`
  return '无门槛 · 单笔可用一次'
}

function formatNote(perk: CouponTemplateBriefRes): string {
  return perk.description?.trim() || '领取后可在确认单选用'
}

function dotClass(index: number): 'brass' | 'moss' {
  return index % 2 === 0 ? 'brass' : 'moss'
}

async function loadPerks(retried = false) {
  if (loading.value) return
  loading.value = true
  try {
    await catalog.ensureLoaded()
    const storeId = catalog.currentStoreId
    if (storeId == null) {
      perks.value = []
      return
    }
    perks.value = await listAvailableCoupons(storeId)
  } catch (error) {
    console.error('[元气善筑] 可领券加载失败', error)
    const message = toErrorMessage(error, '加载失败')
    // mock 重启等导致票失效：换票后重试一次
    if (message === 'UNAUTHORIZED' && !retried) {
      loading.value = false
      const ok = await session.ensureLogin()
      if (ok) {
        await loadPerks(true)
        return
      }
    }
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
  void (async () => {
    const ok = await session.ensureLogin()
    if (!ok) return
    await loadPerks()
  })()
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

async function onClaim(perk: CouponTemplateBriefRes) {
  if (!perk.can_claim) {
    session.goTab('/pages/menu/index')
    return
  }
  if (claimingId.value) return
  if (!session.loggedIn) {
    try {
      await session.login()
    } catch (error) {
      console.error('[元气善筑] 登录失败', error)
      const message = toErrorMessage(error, '登录失败')
      if (message !== 'UNAUTHORIZED') {
        uni.showToast({ title: message.slice(0, 40), icon: 'none' })
      }
      return
    }
  }
  claimingId.value = perk.coupon_template_id
  try {
    const storeId = catalog.currentStoreId
    await claimCoupon({
      coupon_template_id: perk.coupon_template_id,
      store_id: storeId,
    })
    uni.showToast({ title: '领取成功', icon: 'none' })
    await loadPerks()
  } catch (error) {
    console.error('[元气善筑] 领券失败', error)
    const message = toErrorMessage(error, '领取失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    claimingId.value = null
  }
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

      <view v-if="!loading && !perks.length" class="coupons-empty">
        <text class="t-caption">暂无可领礼遇</text>
      </view>

      <view class="perk-list">
        <view v-for="(perk, index) in perks" :key="perk.coupon_template_id" class="perk-card">
          <view class="perk-card__label">
            <view class="perk-card__dot" :class="`perk-card__dot--${dotClass(index)}`" />
            <text class="t-label">{{ perk.coupon_name }}</text>
          </view>
          <text class="perk-card__amount">{{ formatAmount(perk) }}</text>
          <view class="perk-card__rule">
            <text class="t-caption">{{ formatRule(perk) }}</text>
            <text class="t-caption">{{ formatNote(perk) }}</text>
          </view>
          <view
            class="perk-cta"
            :class="{ 'perk-cta--disabled': !perk.can_claim && claimingId !== perk.coupon_template_id }"
            hover-class="perk-cta--active"
            @click="onClaim(perk)"
          >
            {{
              claimingId === perk.coupon_template_id
                ? '领取中…'
                : perk.can_claim
                  ? '领取'
                  : '去点单享用'
            }}
          </view>
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

.coupons-empty {
  margin-bottom: 24rpx;
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

.perk-cta--disabled {
  background: $mp-moss;
  opacity: 0.88;
}

.perk-cta--active {
  opacity: 0.92;
  transform: scale(0.98);
  background: $mp-moss-deep;
}

</style>
