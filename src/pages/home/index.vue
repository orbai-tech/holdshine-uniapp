<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import type { RitualId } from '@/common/types/catalog'

const covers: Record<RitualId, string> = {
  morning: '/static/images/products/americano.jpg',
  afternoon: '/static/images/products/latte.jpg',
  nourish: '/static/images/products/longan.jpg',
  gift: '/static/images/products/giftbox.jpg',
}

const catalog = useCatalogStore()
const session = useSessionStore()

const featured = computed(() => {
  const tagged = catalog.products.filter((item) => item.recommended || item.tag)
  return (tagged.length ? tagged : catalog.products).slice(0, 4)
})

onShow(() => {
  session.hideNativeTabBar()
  void catalog.ensureLoaded()
})
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
          <SoorakButton @click="session.goTab('/pages/menu/index')">去点单</SoorakButton>
        </view>
      </view>

      <view class="home-store">
        <view>
          <text class="home-store__name">{{ catalog.brand.store }}</text>
          <text class="home-store__meta">{{ catalog.brand.hours }} · {{ catalog.brand.distance }} · 营业中</text>
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
            @click="session.goMenuWithRitual(ritual.id)"
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
          <view class="link" @click="session.goTab('/pages/menu/index')">全部</view>
        </view>
        <scroll-view scroll-x class="mp-product-rail" :show-scrollbar="false">
          <view
            v-for="item in featured"
            :key="item.id"
            class="mp-product-rail__item"
            @click="session.openProduct(item.id)"
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
</style>
