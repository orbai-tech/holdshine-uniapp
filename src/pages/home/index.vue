<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import SoorakStoreDetailSheet from '@/components/soorak-store-detail-sheet/soorak-store-detail-sheet.vue'
import { occupyTable, resolveTable } from '@/common/apis/tableApi'
import { storeStatusLabel } from '@/common/apis/storeApi'
import type { RitualId } from '@/common/types/catalog'
import { TABLE_STATUS } from '@/common/types/table'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'

const DEFAULT_TABLE_TOKEN = 'table-a1'

const covers: Record<RitualId, string> = {
  morning: '/static/images/products/americano.jpg',
  afternoon: '/static/images/products/latte.jpg',
  nourish: '/static/images/products/longan.jpg',
  gift: '/static/images/products/giftbox.jpg',
}

const catalog = useCatalogStore()
const session = useSessionStore()

const scanBusy = ref(false)
const scanSheetOpen = ref(false)
const scanTokenDraft = ref(DEFAULT_TABLE_TOKEN)
const storeDetailOpen = ref(false)

const featured = computed(() => {
  const tagged = catalog.products.filter((item) => item.recommended || item.tag)
  return (tagged.length ? tagged : catalog.products).slice(0, 4)
})

/** 当前门店是否可下单（休息/暂停接单时首页点单入口禁用） */
const canOrder = computed(() => catalog.canOrder)

/** 休息中提示（点击禁用入口时反馈） */
function toastResting() {
  uni.showToast({ title: '门店休息中，暂不可点单', icon: 'none' })
}

onShow(() => {
  session.hideNativeTabBar()
  void catalog.ensureLoaded()
})

function openStoreDetail() {
  if (catalog.currentStoreId == null) {
    uni.showToast({ title: '请先选择门店', icon: 'none' })
    return
  }
  storeDetailOpen.value = true
}

/** 到店堂食：未登录先弹协议登录层，成功后再选店。 */
async function onStartDineIn() {
  const ok = await session.ensureLogin()
  if (!ok) return
  await session.startDineIn()
}

function closeStoreDetail() {
  storeDetailOpen.value = false
}

async function seatAtTable(qrToken: string) {
  if (scanBusy.value) return
  const token = qrToken.trim()
  if (!token) {
    uni.showToast({ title: '缺少桌码', icon: 'none' })
    return
  }

  scanBusy.value = true
  try {
    const okLogin = await session.ensureLogin()
    if (!okLogin) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const resolved = await resolveTable(token)
    // mock 联调：允许对「已占用」桌重复入座，避免上次 occupy 后只能落到下一张空闲桌
    if (
      resolved.table_status !== TABLE_STATUS.IDLE &&
      resolved.table_status !== TABLE_STATUS.DINING
    ) {
      uni.showToast({ title: '该桌暂不可用', icon: 'none' })
      return
    }

    await session.applyResolvedTable(resolved)
    // 显式标注 string：session.tableId 已升级为 string|null（真后端 18 位雪花大整数）。
    const tid: string | null = session.tableId
    if (tid == null) {
      uni.showToast({ title: '入座失败', icon: 'none' })
      return
    }

    await occupyTable(tid)
    scanSheetOpen.value = false
    uni.showToast({ title: `已入座 · ${resolved.table_name}`, icon: 'none' })
    session.goMenu()
  } catch (error) {
    const message = toErrorMessage(error, '扫码失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    scanBusy.value = false
  }
}

/**
 * 手输桌码（不用 showModal editable：content 不是输入初值，开发者工具里确认值常不可靠）。
 * mock 联调用 token 如 table-a1。
 */
function startScanTable() {
  if (scanBusy.value) return
  scanTokenDraft.value = DEFAULT_TABLE_TOKEN
  scanSheetOpen.value = true
}

function confirmScanToken() {
  const token = scanTokenDraft.value.trim()
  if (!token) {
    uni.showToast({ title: '请输入桌码', icon: 'none' })
    return
  }
  void seatAtTable(token)
}

function onScanDraftInput(event: { detail?: { value?: string } }) {
  scanTokenDraft.value = String(event.detail?.value ?? '')
}
</script>

<template>
  <SoorakChrome title="元气善筑">
    <view v-if="catalog.loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="catalog.errorText" class="mp-empty">
      <text class="t-caption">{{ catalog.errorText }}</text>
      <SoorakButton @click="catalog.ensureLoaded()">重试</SoorakButton>
    </view>
    <view v-else-if="catalog.brand" class="page-home">
      <view class="home-hero">
        <image src="/static/images/products/pourover.jpg" class="home-hero__bg" mode="aspectFill" />
        <view class="home-hero__veil" />
        <view class="home-hero__content">
          <text class="t-label home-hero__label">{{ catalog.brand.tagline }}</text>
          <view class="t-hero">
            <text>{{ catalog.brand.name }}</text>
          </view>
          <text class="home-hero__belief">{{ catalog.brand.belief }}</text>
          <view class="home-hero__actions">
            <SoorakButton :disabled="!canOrder" @click="session.startDineIn()">到店堂食</SoorakButton>
            <view
              class="home-scan-btn"
              :class="{ 'home-scan-btn--off': !canOrder }"
              :hover-class="canOrder ? 'home-scan-btn--on' : ''"
              @tap="canOrder ? startScanTable() : toastResting()"
            >
              <text>扫桌码</text>
            </view>
            <SoorakButton variant="secondary" :disabled="!canOrder" @click="session.startDelivery()">
              外卖配送
            </SoorakButton>
          </view>
        </view>
      </view>

      <view class="home-store">
        <view class="home-store__main" @click="openStoreDetail">
          <text class="home-store__name">{{ catalog.brand.store }}</text>
          <text class="home-store__meta">
            {{ catalog.brand.hours }} · {{ catalog.brand.distance }} ·
            {{ storeStatusLabel(catalog.currentStore) }}
          </text>
        </view>
        <view class="home-store__switch" @click="session.openStorePicker()">切换</view>
      </view>

      <view class="home-block">
        <view class="home-block__head">
          <view>
            <text class="t-section">此刻需要</text>
            <text class="t-caption">按状态进入，减少决策</text>
          </view>
        </view>
        <view class="ritual-grid">
          <view
            v-for="ritual in catalog.rituals"
            :key="ritual.id"
            class="ritual-card"
            :class="{ 'ritual-card--off': !canOrder }"
            @click="canOrder ? session.goMenuWithRitual(ritual.id) : toastResting()"
          >
            <image :src="covers[ritual.id]" class="ritual-card__img" mode="aspectFill" />
            <text class="ritual-card__title">{{ ritual.title }}</text>
            <text class="ritual-card__mood">{{ ritual.mood }}</text>
          </view>
        </view>
      </view>

      <view class="home-block">
        <view class="home-block__head">
          <text class="t-section">招牌精选</text>
          <view class="link" @click="canOrder ? session.goMenu() : toastResting()">全部</view>
        </view>
        <scroll-view scroll-x class="mp-product-rail" :show-scrollbar="false">
          <view
            v-for="item in featured"
            :key="item.id"
            class="mp-product-rail__item"
            :class="{ 'mp-product-rail__item--off': !canOrder }"
            @click="canOrder ? session.openProduct(item.id) : toastResting()"
          >
            <image :src="item.img" mode="aspectFill" class="mp-product-rail__img" />
            <text class="mp-product-rail__name">{{ item.name }}</text>
            <text class="mp-product-rail__scene">{{ item.scene }}</text>
            <text class="mp-product-rail__price">¥{{ item.price }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="home-block home-wx">
        <text class="t-label">WeChat</text>
        <text class="t-section home-wx__title">微信能力</text>
        <view class="wx-row">
          <view class="wx-row__btn">分享给好友</view>
          <view class="wx-row__btn">联系客服</view>
          <view class="wx-row__btn">订阅出杯提醒</view>
        </view>
      </view>
    </view>

    <SoorakStoreDetailSheet
      :open="storeDetailOpen"
      :store-id="catalog.currentStoreId"
      @close="closeStoreDetail"
    />

    <SoorakSheet :open="scanSheetOpen" title="输入桌码" @close="scanSheetOpen = false">
      <view class="scan-sheet">
        <text class="t-caption scan-sheet__hint">mock 联调可用 table-a1 / table-a2</text>
        <input
          class="scan-sheet__input"
          type="text"
          :value="scanTokenDraft"
          placeholder="如 table-a1"
          placeholder-class="scan-sheet__ph"
          confirm-type="done"
          @input="onScanDraftInput"
          @confirm="confirmScanToken"
        />
        <SoorakButton block :disabled="scanBusy" @click="confirmScanToken">
          {{ scanBusy ? '入座中…' : '入座' }}
        </SoorakButton>
      </view>
    </SoorakSheet>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.page-home {
  padding-bottom: 16rpx;
}

.home-hero {
  position: relative;
  height: 46vh;
  min-height: 560rpx;
  color: $mp-paper;
  overflow: hidden;
}

.home-hero__bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.home-hero__veil {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(20, 17, 15, 0.25) 0%, rgba(20, 17, 15, 0.72) 100%);
}

.home-hero__content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 40rpx 32rpx 48rpx;
}

.home-hero__label {
  color: rgba(247, 244, 238, 0.6);
  margin-bottom: 16rpx;
}

.home-hero .t-hero {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.home-hero__belief {
  margin: 24rpx 0 32rpx;
  font-size: 26rpx;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(247, 244, 238, 0.82);
}

.home-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.home-scan-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  padding: 0 36rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: $mp-paper;
  box-shadow: inset 0 0 0 1rpx rgba(247, 244, 238, 0.45);
}

.home-scan-btn--on {
  opacity: 0.92;
  transform: scale(0.98);
}

.home-scan-btn--off {
  opacity: 0.45;
}

.home-hero__actions :deep(.mp-btn--secondary) {
  color: $mp-paper;
  box-shadow: inset 0 0 0 1rpx rgba(247, 244, 238, 0.45);
}

.home-store {
  margin: 24rpx 32rpx 0;
  padding: 24rpx 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(20, 17, 15, 0.04);
}

.home-store__main {
  flex: 1;
  min-width: 0;
}

.home-store__name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
}

.home-store__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $mp-text-2;
}

.home-store__switch {
  font-size: 24rpx;
  letter-spacing: 0.08em;
  color: $mp-brass;
  flex-shrink: 0;
}

.home-block {
  padding: 40rpx 32rpx 8rpx;
}

.home-block__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.home-block__head .t-caption {
  display: block;
  margin-top: 8rpx;
}

.link {
  font-size: 24rpx;
  letter-spacing: 0.08em;
  color: $mp-brass;
}

.ritual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.ritual-card {
  position: relative;
  overflow: hidden;
  border-radius: 16rpx;
  min-height: 192rpx;
  color: $mp-paper;
}

.ritual-card--off {
  opacity: 0.55;
}

.ritual-card__img {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0.55;
}

.ritual-card__title,
.ritual-card__mood {
  position: relative;
  z-index: 1;
  display: block;
  padding: 0 24rpx;
}

.ritual-card__title {
  margin-top: 84rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.ritual-card__mood {
  margin-top: 8rpx;
  margin-bottom: 24rpx;
  font-size: 20rpx;
  letter-spacing: 0.08em;
  color: $mp-brass-soft;
}

.home-wx {
  padding-bottom: 40rpx;
}

.home-wx__title {
  display: block;
  margin: 12rpx 0 24rpx;
}

.wx-row {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.wx-row__btn {
  min-height: 88rpx;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
  background: $mp-cloud;
  border-radius: 16rpx;
  font-size: 26rpx;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.mp-product-rail {
  white-space: nowrap;
  width: 100%;
}

.mp-product-rail__item {
  display: inline-block;
  width: 296rpx;
  margin-right: 24rpx;
  vertical-align: top;
  white-space: normal;
}

.mp-product-rail__item--off {
  opacity: 0.55;
}

.mp-product-rail__img {
  width: 100%;
  height: 370rpx;
  border-radius: 16rpx;
  background: $mp-stone;
}

.mp-product-rail__name {
  display: block;
  margin: 16rpx 0 4rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.mp-product-rail__scene {
  display: block;
  font-size: 22rpx;
  color: $mp-text-2;
}

.mp-product-rail__price {
  display: block;
  margin-top: 12rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 32rpx;
  font-weight: 500;
}

.scan-sheet {
  padding: 8rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.scan-sheet__hint {
  color: $mp-text-3;
}

.scan-sheet__input {
  min-height: 88rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  background: $mp-cloud;
  box-shadow: inset 0 0 0 1rpx $mp-border;
  font-size: 28rpx;
  color: $mp-ink;
}

.scan-sheet__ph {
  color: $mp-text-3;
}
</style>
