<script setup lang="ts">
import { ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import { getPointsAccount, listPointsLedger } from '@/common/apis/pointsApi'
import type { MpPointAccountRes, MpPointLedgerRes } from '@/common/types/points'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import {
  formatLedgerPoints,
  formatLedgerTime,
  formatLedgerTitle,
} from '@/utils/pointsLabel'

const PAGE_SIZE = 20

const session = useSessionStore()
const statusBarPx = uni.getSystemInfoSync().statusBarHeight || 0

const account = ref<MpPointAccountRes | null>(null)
const list = ref<MpPointLedgerRes[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')

const hasMore = () => list.value.length < total.value

function onBack() {
  uni.navigateBack({ fail: () => session.goTab('/pages/mine/index') })
}

async function loadAccount() {
  account.value = await getPointsAccount()
}

async function loadLedger(reset: boolean) {
  if (!session.loggedIn) {
    account.value = null
    list.value = []
    total.value = 0
    errorText.value = ''
    return
  }
  if (reset) {
    if (loading.value) return
    loading.value = true
    page.value = 1
    errorText.value = ''
  } else {
    if (loadingMore.value || loading.value || !hasMore()) return
    loadingMore.value = true
  }
  try {
    if (reset) await loadAccount()
    const nextPage = reset ? 1 : page.value + 1
    const data = await listPointsLedger({ page: nextPage, page_size: PAGE_SIZE })
    const rows = data.list ?? []
    total.value = data.total ?? rows.length
    page.value = data.page ?? nextPage
    list.value = reset ? rows : list.value.concat(rows)
  } catch (error) {
    errorText.value = toErrorMessage(error, '加载失败')
    if (reset) {
      list.value = []
      account.value = null
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

onShow(() => {
  if (!session.loggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => onBack(), 400)
    return
  }
  void loadLedger(true)
})

onReachBottom(() => {
  void loadLedger(false)
})
</script>

<template>
  <SoorakChrome title="积分明细" hide-nav>
    <view class="points-nav" :style="{ paddingTop: `${statusBarPx}px` }">
      <view class="points-nav__inner">
        <view class="points-nav__back" @click="onBack">‹</view>
        <text class="points-nav__title">积分明细</text>
        <view class="points-nav__side" />
      </view>
    </view>

    <view class="page-points page-pad">
      <view class="points-head">
        <text class="t-section">我的积分</text>
        <text class="t-caption">支付赠分 · 明细可查</text>
      </view>

      <view v-if="account" class="points-summary">
        <view class="points-summary__main">
          <text class="points-summary__k">可用积分</text>
          <text class="points-summary__v">{{ account.available_points ?? 0 }}</text>
        </view>
        <view class="points-summary__row">
          <text class="t-caption">累计获得 {{ account.total_earned_points ?? 0 }}</text>
          <text class="t-caption">累计使用 {{ account.total_used_points ?? 0 }}</text>
        </view>
      </view>

      <view v-if="loading" class="mp-empty">
        <text class="t-caption">加载中</text>
      </view>
      <view v-else-if="errorText" class="mp-empty">
        <text class="t-caption">{{ errorText }}</text>
      </view>
      <view v-else-if="!list.length" class="mp-empty">
        <text class="t-caption">暂无积分明细</text>
      </view>
      <view v-else class="ledger-list">
        <view v-for="row in list" :key="row.ledger_id" class="ledger-card">
          <view class="ledger-card__top">
            <text class="ledger-card__title">{{ formatLedgerTitle(row) }}</text>
            <text
              class="ledger-card__pts"
              :class="{ 'is-plus': row.change_points > 0, 'is-minus': row.change_points < 0 }"
            >
              {{ formatLedgerPoints(row.change_points) }}
            </text>
          </view>
          <view class="ledger-card__meta">
            <text class="t-caption">{{ formatLedgerTime(row.created_at) }}</text>
            <text class="t-caption">余额 {{ row.balance_after }}</text>
          </view>
        </view>
        <view v-if="loadingMore" class="ledger-foot">
          <text class="t-caption">加载更多…</text>
        </view>
        <view v-else-if="!hasMore()" class="ledger-foot">
          <text class="t-caption">没有更多了</text>
        </view>
      </view>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.points-nav {
  background: $mp-paper;
}

.points-nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}

.points-nav__back,
.points-nav__side {
  width: 64rpx;
  font-size: 44rpx;
  line-height: 1;
  color: $mp-ink;
}

.points-nav__title {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 32rpx;
  color: $mp-ink;
}

.page-points {
  padding-bottom: 64rpx;
}

.points-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 28rpx;
}

.points-summary {
  margin-bottom: 36rpx;
  padding: 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
}

.points-summary__main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.points-summary__k {
  font-size: 22rpx;
  letter-spacing: 0.08em;
  color: $mp-text-3;
}

.points-summary__v {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 56rpx;
  font-weight: 500;
  color: $mp-ink;
}

.points-summary__row {
  display: flex;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid $mp-border;
}

.ledger-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.ledger-card {
  padding: 24rpx 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
}

.ledger-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.ledger-card__title {
  flex: 1;
  font-size: 28rpx;
  color: $mp-ink;
}

.ledger-card__pts {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 32rpx;
  font-weight: 500;
  color: $mp-text-2;
}

.ledger-card__pts.is-plus {
  color: $mp-moss;
}

.ledger-card__pts.is-minus {
  color: $mp-brass;
}

.ledger-card__meta {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
}

.ledger-foot {
  padding: 16rpx 0 8rpx;
  text-align: center;
}
</style>
