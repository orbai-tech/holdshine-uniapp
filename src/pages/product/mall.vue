<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakImage from '@/components/soorak-image/soorak-image.vue'
import { getMallProduct } from '@/common/apis/mallApi'
import type { MallProductDetailRes } from '@/common/types/mall'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import { parseAmount } from '@/utils/money'
import { resolveMediaUrl } from '@/utils/mediaUrl'
import { applyMemberDiscount, formatMemberGoodsMoney } from '@/utils/pricing'

const catalog = useCatalogStore()
const session = useSessionStore()

/** 礼品 id：18 位雪花大整数（string），query 透传 */
const localProductId = ref<string | null>(null)
const notFound = ref(false)
const loading = ref(false)
const detail = ref<MallProductDetailRes | null>(null)

const detailMemberPriceText = computed(() => {
  if (!detail.value) return ''
  const after = applyMemberDiscount(
    parseAmount(detail.value.base_price),
    session.mallDiscountRate,
    'mall',
  )
  const prefix = detail.value.price_from ? '起 ' : ''
  return `${prefix}¥${formatMemberGoodsMoney(after, 'mall')}`
})

function skuMemberPrice(salePrice: string | number | null | undefined) {
  const after = applyMemberDiscount(parseAmount(salePrice), session.mallDiscountRate, 'mall')
  return formatMemberGoodsMoney(after, 'mall')
}

const detailImages = computed(() => {
  if (!detail.value) return []
  const paths = detail.value.image_paths?.length
    ? detail.value.image_paths
    : detail.value.cover_image_path
      ? [detail.value.cover_image_path]
      : []
  return paths.map((path) => resolveMediaUrl(path))
})

const detailHeroSrc = computed(() => detailImages.value[0] ?? '')

/** 发货/运费提示：商城级默认字段在独立页不加载，仅展示详情级信息 */
const shipHint = computed(() => {
  if (!detail.value) return ''
  const parts: string[] = []
  if (detail.value.ship_within_hours != null) {
    parts.push(`${detail.value.ship_within_hours} 小时内发货`)
  }
  if (detail.value.free_shipping === 1) parts.push('包邮')
  return parts.join(' · ')
})

const stockHint = computed(() => {
  if (!detail.value) return ''
  if (detail.value.show_low_stock && detail.value.available_qty != null) {
    return `库存紧张，仅剩 ${detail.value.available_qty}`
  }
  if (detail.value.available_qty === 0) return '暂时售罄'
  return ''
})

function onAddToBag() {
  if (!detail.value) return
  if (detail.value.available_qty === 0) {
    uni.showToast({ title: '暂时售罄', icon: 'none' })
    return
  }
  uni.showToast({ title: '礼品加购即将开放', icon: 'none' })
}

function onBuyNow() {
  if (!detail.value) return
  if (detail.value.available_qty === 0) {
    uni.showToast({ title: '暂时售罄', icon: 'none' })
    return
  }
  uni.showToast({ title: '礼品购买即将开放', icon: 'none' })
}

async function loadDetail() {
  if (!localProductId.value) return
  loading.value = true
  detail.value = null
  try {
    const storeId = catalog.currentStoreId
    detail.value = await getMallProduct(localProductId.value, storeId)
  } catch (error) {
    const message = toErrorMessage(error, '加载详情失败')
    uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    notFound.value = true
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack({ fail() {} })
}

onLoad((query) => {
  const id = query?.id
  if (typeof id !== 'string' || !id) {
    notFound.value = true
    return
  }
  localProductId.value = id
  void loadDetail()
})
</script>

<template>
  <SoorakChrome title="礼品详情" show-back hide-tab-bar>
    <view v-if="loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="notFound" class="mp-empty">
      <text class="t-caption">礼品不存在或已下架</text>
      <SoorakButton @click="goBack">返回</SoorakButton>
    </view>
    <view v-else-if="detail" class="mall-detail">
      <scroll-view v-if="detailImages.length" scroll-x class="mall-detail__gallery" :show-scrollbar="false">
        <SoorakImage
          v-for="(src, index) in detailImages"
          :key="`${src}-${index}`"
          :src="src"
          mode="aspectFill"
          class="mall-detail__img"
        />
      </scroll-view>

      <view class="mall-detail__head">
        <text v-if="detail.subtitle" class="t-label">{{ detail.subtitle }}</text>
        <text class="t-product">{{ detail.product_name }}</text>
        <view class="mall-detail__price-row">
          <text class="mall-detail__price">
            {{ detailMemberPriceText }}
          </text>
          <text v-if="detail.market_price" class="mall-detail__market">
            ¥{{ detail.market_price }}
          </text>
          <text v-if="detail.unit_name" class="t-caption">/ {{ detail.unit_name }}</text>
        </view>
        <text v-if="detail.badge_text" class="mall-detail__badge">{{ detail.badge_text }}</text>
      </view>

      <text v-if="shipHint" class="mall-detail__ship t-caption">{{ shipHint }}</text>
      <text v-if="stockHint" class="mall-detail__stock">{{ stockHint }}</text>

      <view class="mall-detail__block">
        <text class="t-label">简介</text>
        <text class="mall-detail__body">
          {{ detail.description || detail.short_description || '暂无更多介绍' }}
        </text>
      </view>

      <view v-if="detail.skus?.length" class="mall-detail__block">
        <text class="t-label">规格</text>
        <view v-for="sku in detail.skus" :key="sku.sku_id" class="mall-detail__sku">
          <text>{{ sku.sku_name }}</text>
          <text class="mall-detail__sku-price">¥{{ skuMemberPrice(sku.sale_price) }}</text>
        </view>
      </view>

      <view v-if="detailHeroSrc" class="mall-detail__block">
        <text class="t-label">商品详情</text>
        <SoorakImage
          :src="detailHeroSrc"
          mode="aspectFill"
          class="mall-detail__hero"
        />
      </view>
    </view>

    <template #footer>
      <view v-if="detail" class="mall-detail__cta">
        <view class="mall-detail__cta-btn">
          <SoorakButton variant="secondary" block @click="onAddToBag">加入购物袋</SoorakButton>
        </view>
        <view class="mall-detail__cta-btn">
          <SoorakButton variant="primary" block @click="onBuyNow">立刻购买</SoorakButton>
        </view>
      </view>
    </template>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.mall-detail {
  padding: 8rpx 0 200rpx;
}

.mall-detail__gallery {
  white-space: nowrap;
  margin-bottom: 24rpx;
  width: 100%;
  box-sizing: border-box;
  padding: 0 32rpx;
}

.mall-detail__img {
  display: inline-block;
  width: 560rpx;
  height: 420rpx;
  margin-right: 16rpx;
  border-radius: 16rpx;
  background: $mp-stone;
  vertical-align: top;
}

.mall-detail__head {
  padding: 0 32rpx;
}

.mall-detail__head .t-product {
  display: block;
  margin: 8rpx 0 12rpx;
}

.mall-detail__price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  flex-wrap: wrap;
}

.mall-detail__price {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 44rpx;
  font-weight: 500;
}

.mall-detail__market {
  font-size: 24rpx;
  color: $mp-text-3;
  text-decoration: line-through;
}

.mall-detail__badge {
  display: inline-block;
  margin-top: 16rpx;
  padding: 4rpx 14rpx;
  font-size: 20rpx;
  letter-spacing: 0.06em;
  color: $mp-moss-deep;
  background: rgba(51, 71, 61, 0.08);
  border-radius: 8rpx;
}

.mall-detail__ship {
  display: block;
  margin-top: 20rpx;
  padding: 0 32rpx;
}

.mall-detail__stock {
  display: block;
  margin-top: 8rpx;
  padding: 0 32rpx;
  font-size: 22rpx;
  color: $mp-brass;
}

.mall-detail__block {
  margin: 28rpx 32rpx 0;
  padding-top: 24rpx;
  border-top: 1rpx solid $mp-border;
}

.mall-detail__body {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: $mp-text-2;
}

.mall-detail__sku {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 26rpx;
  color: $mp-text;
}

.mall-detail__sku-price {
  font-family: "Songti SC", "Noto Serif SC", serif;
  color: $mp-text;
}

.mall-detail__hero {
  display: block;
  width: 100%;
  height: 420rpx;
  margin-top: 16rpx;
  border-radius: 16rpx;
  background: $mp-stone;
}

.mall-detail__cta {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  gap: 16rpx;
}

.mall-detail__cta-btn {
  flex: 1;
  width: 0;
  min-width: 0;
}
</style>
