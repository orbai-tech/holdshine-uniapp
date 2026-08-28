<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/common/types/catalog'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import SoorakImage from '@/components/soorak-image/soorak-image.vue'

const props = defineProps<{
  product: Product
}>()

const session = useSessionStore()
const catalog = useCatalogStore()

/** 当前门店是否可下单；休息/暂停接单时点击商品不打开加购层 */
const canOrder = computed(() => catalog.canOrder)

function onTap() {
  if (!canOrder.value) {
    uni.showToast({ title: '门店休息中，暂不可点单', icon: 'none' })
    return
  }
  session.openProductPage(props.product.id)
}
</script>

<template>
  <view class="mp-product-card" :class="{ 'mp-product-card--off': !canOrder }" @click="onTap">
    <view class="mp-product-card__media">
      <SoorakImage :src="product.img" mode="aspectFill" class="mp-product-card__img" />
      <text v-if="product.tag" class="mp-product-card__tag">{{ product.tag }}</text>
    </view>
    <view class="mp-product-card__body">
      <text class="t-label">{{ product.en }}</text>
      <text class="t-product">{{ product.name }}</text>
      <text class="mp-product-card__scene">{{ product.scene }}</text>
      <view class="mp-product-card__meta">
        <text class="mp-product-card__price">¥{{ product.price }}</text>
        <text class="mp-product-card__spec">{{ canOrder ? '选规格' : '休息中' }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mp-product-card {
  display: flex;
  gap: 24rpx;
  width: 100%;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $mp-border;
}

.mp-product-card--off {
  opacity: 0.55;
}

.mp-product-card__media {
  position: relative;
  width: 192rpx;
  height: 192rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: $mp-stone;
  flex-shrink: 0;
}

.mp-product-card__img {
  width: 100%;
  height: 100%;
}

.mp-product-card__tag {
  position: absolute;
  left: 12rpx;
  bottom: 12rpx;
  padding: 4rpx 12rpx;
  background: rgba(20, 17, 15, 0.72);
  color: $mp-paper;
  font-size: 18rpx;
  letter-spacing: 0.06em;
}

.mp-product-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.mp-product-card__body .t-product {
  margin: 4rpx 0 8rpx;
}

.mp-product-card__scene {
  font-size: 24rpx;
  color: $mp-text-2;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-product-card__meta {
  margin-top: auto;
  padding-top: 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.mp-product-card__price {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 36rpx;
  font-weight: 500;
}

.mp-product-card__spec {
  font-size: 22rpx;
  letter-spacing: 0.08em;
  color: $mp-brass;
}

.mp-product-card--off .mp-product-card__spec {
  color: $mp-text-3;
}
</style>
