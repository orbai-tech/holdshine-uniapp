<script setup lang="ts">
import { computed } from 'vue'
import type { MallProductCardRes } from '@/common/types/mall'
import { useSessionStore } from '@/stores/session'
import { parseAmount } from '@/utils/money'
import { applyMemberDiscount, formatMemberGoodsMoney } from '@/utils/pricing'
import { resolveMediaUrl } from '@/utils/mediaUrl'
import SoorakImage from '@/components/soorak-image/soorak-image.vue'

const props = defineProps<{
  product: MallProductCardRes
}>()

const emit = defineEmits<{
  open: [productId: string]
}>()

const session = useSessionStore()

function coverOf(product: MallProductCardRes) {
  return resolveMediaUrl(product.cover_image_path)
}

const priceText = computed(() => {
  const product = props.product
  const after = applyMemberDiscount(
    parseAmount(product.base_price),
    session.mallDiscountRate,
    'mall',
  )
  const prefix = product.price_from ? '起 ' : ''
  return `${prefix}¥${formatMemberGoodsMoney(after, 'mall')}`
})
</script>

<template>
  <view class="mp-product-card" @click="emit('open', props.product.product_id)">
    <view class="mp-product-card__media">
      <SoorakImage :src="coverOf(product)" mode="aspectFill" class="mp-product-card__img" />
      <text v-if="product.badge_text" class="mp-product-card__tag">{{ product.badge_text }}</text>
    </view>
    <view class="mp-product-card__body">
      <text v-if="product.subtitle" class="t-label">{{ product.subtitle }}</text>
      <text class="t-product">{{ product.product_name }}</text>
      <text class="mp-product-card__scene">
        {{ product.short_description || '把门店的仪式，带回家' }}
      </text>
      <view class="mp-product-card__meta">
        <text class="mp-product-card__price">{{ priceText }}</text>
        <text class="mp-product-card__spec">查看</text>
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
  border-bottom: 1rpx solid rgba(20, 17, 15, 0.1);
}

.mp-product-card__media {
  position: relative;
  width: 192rpx;
  height: 192rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: $mp-paper-soft;
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
</style>
