<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import {
  claimCoupon,
  getMyCoupon,
  listAvailableCoupons,
  listMyCoupons,
} from '@/common/apis/couponApi'
import type {
  CouponTemplateBriefRes,
  MyCouponCounts,
  MyCouponDetailRes,
  MyCouponRes,
} from '@/common/types/coupon'
import { COUPON_STATUS } from '@/common/types/coupon'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'

type CouponsTab = 'claim' | 'mine'
type MineStatusFilter = 'all' | 'unused' | 'used' | 'expired'

const MINE_STATUS_MAP = {
  unused: COUPON_STATUS.UNUSED,
  used: COUPON_STATUS.USED,
  expired: COUPON_STATUS.EXPIRED,
} as const

const session = useSessionStore()
const catalog = useCatalogStore()
const statusBarPx = uni.getSystemInfoSync().statusBarHeight || 0

const tab = ref<CouponsTab>('claim')
const perks = ref<CouponTemplateBriefRes[]>([])
const mineList = ref<MyCouponRes[]>([])
const mineCounts = ref<MyCouponCounts | null>(null)
const mineStatus = ref<MineStatusFilter>('all')

const displayedMineList = computed(() => {
  if (mineStatus.value === 'all') return mineList.value
  const status = MINE_STATUS_MAP[mineStatus.value]
  return mineList.value.filter((row) => Number(row.coupon_status) === status)
})
const loading = ref(false)
const claimingId = ref<string | null>(null)
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<MyCouponDetailRes | null>(null)

watch(detailOpen, (open) => {
  if (open) return
  detail.value = null
})

function formatBriefAmount(perk: CouponTemplateBriefRes): string {
  const discount = perk.discount_amount
  if (discount != null && discount !== '' && Number(discount) > 0) {
    return `减 ¥${Number(discount)}`
  }
  if (perk.discount_rate != null && perk.discount_rate !== '') {
    return `${Number(perk.discount_rate) * 10} 折`
  }
  return perk.coupon_name
}

function formatMineAmount(row: MyCouponRes): string {
  const discount = row.template?.discount_amount ?? row.reduce_amount ?? row.discount_amount
  if (discount != null && discount !== '' && Number(discount) > 0) {
    return `减 ¥${Number(discount)}`
  }
  const rate = row.template?.discount_rate
  if (rate != null && rate !== '' && Number(rate) > 0) {
    return `${Number(rate) * 10} 折`
  }
  return row.template?.coupon_name || row.title || '礼遇'
}

function formatBriefRule(perk: CouponTemplateBriefRes): string {
  const threshold = Number(perk.threshold_amount || 0)
  if (threshold > 0) return `满 ¥${threshold} 可享 · 门店饮品`
  return '无门槛 · 单笔可用一次'
}

/** 券名：契约新增 display_label 时优先采用，否则回退本地名称 */
function formatMineTitle(row: MyCouponRes): string {
  return row.display_label || row.template?.coupon_name || row.title || '礼遇'
}

function formatMineRule(row: MyCouponRes): string {
  const threshold = Number(row.template?.threshold_amount ?? row.threshold_amount ?? 0)
  if (threshold > 0) return `满 ¥${threshold} 可享 · 门店饮品`
  return '无门槛 · 单笔可用一次'
}

function formatBriefNote(perk: CouponTemplateBriefRes): string {
  return perk.description?.trim() || '领取后可在确认单选用'
}

function formatValidity(detailRow: MyCouponDetailRes): string {
  const start = detailRow.valid_start_at?.trim()
  const end = detailRow.valid_end_at?.trim()
  if (start && end) return `${start} – ${end}`
  if (end) return `有效至 ${end}`
  if (start) return `自 ${start} 起`
  return '领取后按规则生效'
}

function dotClass(index: number): 'brass' | 'moss' {
  return index % 2 === 0 ? 'brass' : 'moss'
}

async function ensureSession(): Promise<boolean> {
  if (session.loggedIn) return true
  return session.ensureLogin()
}

async function loadPerks(retried = false) {
  if (loading.value) return
  loading.value = true
  try {
    await catalog.ensureLoaded()
    const storeId = catalog.currentStoreId
    perks.value = await listAvailableCoupons(storeId ?? undefined)
  } catch (error) {
    console.error('[元气善筑] 可领券加载失败', error)
    const message = toErrorMessage(error, '加载失败')
    if (message === 'UNAUTHORIZED' && !retried) {
      loading.value = false
      const ok = await session.ensureLogin()
      if (!ok) return
      await loadPerks(true)
      return
    }
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

async function loadMine(retried = false) {
  if (loading.value) return
  loading.value = true
  try {
    const result = await listMyCoupons()
    mineList.value = result.list
    mineCounts.value = result.counts ?? null
  } catch (error) {
    console.error('[元气善筑] 已领券加载失败', error)
    const message = toErrorMessage(error, '加载失败')
    if (message === 'UNAUTHORIZED' && !retried) {
      loading.value = false
      const ok = await session.ensureLogin()
      if (!ok) return
      await loadMine(true)
      return
    }
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

async function loadCurrentTab() {
  if (tab.value === 'claim') {
    await loadPerks()
    return
  }
  await loadMine()
}

function setTab(next: CouponsTab) {
  if (tab.value === next) return
  tab.value = next
  void loadCurrentTab()
}

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
  void (async () => {
    const ok = await ensureSession()
    if (!ok) return
    await loadCurrentTab()
  })()
})

onHide(() => {
  session.setSuppressTabBar(false)
})

onUnload(() => {
  session.setSuppressTabBar(false)
})

function onBack() {
  uni.navigateBack()
}

function setMineStatus(next: MineStatusFilter) {
  mineStatus.value = next
}

function mineStatusLabel(filter: MineStatusFilter): string {
  const counts = mineCounts.value
  const local = (statuses: readonly number[]) =>
    mineList.value.filter((row) => statuses.includes(Number(row.coupon_status))).length
  if (filter === 'all') return `全部 ${counts?.all ?? mineList.value.length}`
  if (filter === 'unused') {
    return `未使用 ${counts?.usable ?? local([COUPON_STATUS.UNUSED, COUPON_STATUS.LOCKED])}`
  }
  if (filter === 'used') return `已使用 ${local([COUPON_STATUS.USED])}`
  return `已过期 ${counts?.expired ?? local([COUPON_STATUS.EXPIRED])}`
}

async function onClaim(perk: CouponTemplateBriefRes) {
  if (!perk.can_claim) {
    session.goMenu()
    return
  }
  if (claimingId.value) return
  if (!session.loggedIn) {
    const ok = await session.requestLogin()
    if (!ok) return
  }
  claimingId.value = perk.coupon_template_id
  try {
    const storeId = catalog.currentStoreId
    await claimCoupon({
      coupon_template_id: perk.coupon_template_id,
      ...(storeId != null ? { store_id: storeId } : {}),
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

async function openDetail(row: MyCouponRes) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getMyCoupon(row.customer_coupon_id)
  } catch (error) {
    const message = toErrorMessage(error, '加载详情失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
}
</script>

<template>
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

      <scroll-view scroll-x class="menu-chips" :show-scrollbar="false">
        <view class="menu-chip" :class="{ 'is-on': tab === 'claim' }" @click="setTab('claim')">
          可领
        </view>
        <view class="menu-chip" :class="{ 'is-on': tab === 'mine' }" @click="setTab('mine')">
          已领
        </view>
      </scroll-view>

      <view v-if="loading" class="coupons-empty">
        <text class="t-caption">加载中</text>
      </view>

      <template v-else-if="tab === 'claim'">
        <view v-if="!perks.length" class="coupons-empty">
          <text class="t-caption">暂无可领礼遇</text>
        </view>
        <view class="perk-list">
          <view v-for="(perk, index) in perks" :key="perk.coupon_template_id" class="perk-card">
            <view class="perk-card__label">
              <view class="perk-card__dot" :class="`perk-card__dot--${dotClass(index)}`" />
              <text class="t-label">{{ perk.coupon_name }}</text>
            </view>
            <text class="perk-card__amount">{{ formatBriefAmount(perk) }}</text>
            <view class="perk-card__rule">
              <text class="t-caption">{{ formatBriefRule(perk) }}</text>
              <text class="t-caption">{{ formatBriefNote(perk) }}</text>
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
      </template>

      <template v-else>
        <view class="mine-chips">
          <view
            class="menu-chip"
            :class="{ 'is-on': mineStatus === 'all' }"
            hover-class="menu-chip--pressed"
            @tap="setMineStatus('all')"
          >
            {{ mineStatusLabel('all') }}
          </view>
          <view
            class="menu-chip"
            :class="{ 'is-on': mineStatus === 'unused' }"
            hover-class="menu-chip--pressed"
            @tap="setMineStatus('unused')"
          >
            {{ mineStatusLabel('unused') }}
          </view>
          <view
            class="menu-chip"
            :class="{ 'is-on': mineStatus === 'used' }"
            hover-class="menu-chip--pressed"
            @tap="setMineStatus('used')"
          >
            {{ mineStatusLabel('used') }}
          </view>
          <view
            class="menu-chip"
            :class="{ 'is-on': mineStatus === 'expired' }"
            hover-class="menu-chip--pressed"
            @tap="setMineStatus('expired')"
          >
            {{ mineStatusLabel('expired') }}
          </view>
        </view>

        <view v-if="!displayedMineList.length" class="coupons-empty">
          <text class="t-caption">暂无已领礼遇</text>
        </view>
        <view class="perk-list">
          <view
            v-for="(row, index) in displayedMineList"
            :key="row.customer_coupon_id"
            class="perk-card"
            @click="openDetail(row)"
          >
            <view class="perk-card__label">
              <view class="perk-card__dot" :class="`perk-card__dot--${dotClass(index)}`" />
              <text class="t-label">{{ formatMineTitle(row) }}</text>
            </view>
            <text class="perk-card__amount">{{ formatMineAmount(row) }}</text>
            <view class="perk-card__rule">
              <text class="t-caption">{{ formatMineRule(row) }}</text>
              <text class="t-caption">{{ row.coupon_status_label || '—' }} · 点按查看</text>
            </view>
          </view>
        </view>
      </template>
    </view>

    <SoorakSheet :open="detailOpen" title="礼遇详情" @close="closeDetail">
      <view v-if="detailLoading" class="mp-empty">
        <text class="t-caption">加载中</text>
      </view>
      <view v-else-if="detail" class="coupon-detail">
        <text class="t-label">{{ detail.template.coupon_name }}</text>
        <text class="coupon-detail__amount">{{ formatBriefAmount(detail.template) }}</text>
        <text class="t-caption">{{ formatBriefRule(detail.template) }}</text>
        <view class="coupon-detail__meta">
          <text class="t-caption">状态 · {{ detail.coupon_status_label }}</text>
          <text class="t-caption">券号 · {{ detail.coupon_no }}</text>
          <text class="t-caption">有效期 · {{ formatValidity(detail) }}</text>
          <text v-if="detail.template.description" class="t-caption">
            {{ detail.template.description }}
          </text>
        </view>
      </view>
    </SoorakSheet>
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
  margin-bottom: 16rpx;
}

.coupons-head .t-caption {
  display: block;
  margin-top: 8rpx;
}

.menu-chips {
  white-space: nowrap;
  padding: 8rpx 0 24rpx;
  width: 100%;
}

.menu-chip {
  display: inline-flex;
  align-items: center;
  min-height: 64rpx;
  padding: 0 24rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: $mp-text-2;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.menu-chip.is-on {
  background: $mp-ink;
  color: $mp-paper;
  box-shadow: none;
}

.menu-chip--pressed {
  opacity: 0.72;
}

.mine-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 8rpx 0 24rpx;
}

.mine-chips .menu-chip {
  margin-right: 0;
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

.coupon-detail {
  padding: 24rpx 32rpx 32rpx;
}

.coupon-detail__amount {
  display: block;
  margin: 12rpx 0 16rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 48rpx;
  font-weight: 500;
}

.coupon-detail__meta {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $mp-border;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
</style>
