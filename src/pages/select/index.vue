<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import SoorakImage from '@/components/soorak-image/soorak-image.vue'
import MallProductCard from '@/pages/select/components/mall-product-card.vue'
import { getMallCatalog, getMallProduct } from '@/common/apis/mallApi'
import type {
  MallCatalogRes,
  MallProductCardRes,
  MallProductDetailRes,
} from '@/common/types/mall'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import { parseAmount } from '@/utils/money'
import { resolveMediaUrl } from '@/utils/mediaUrl'
import { applyMemberDiscount, formatMemberGoodsMoney } from '@/utils/pricing'

const catalog = useCatalogStore()
const session = useSessionStore()

const loading = ref(false)
const errorText = ref('')
const mall = ref<MallCatalogRes | null>(null)
const chip = ref<string>('all')

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<MallProductDetailRes | null>(null)

const categories = computed(() => mall.value?.categories ?? [])

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

const list = computed<MallProductCardRes[]>(() => {
  const cats = categories.value
  if (!cats.length) return []
  if (chip.value === 'all') {
    return cats.flatMap((cat) => cat.products ?? [])
  }
  const matched = cats.find((cat) => cat.category_id === chip.value)
  return matched?.products ?? []
})

const slogan = computed(
  () => mall.value?.slogan?.trim() || '把门店的仪式，带回家',
)

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

const shipHint = computed(() => {
  if (!detail.value) return ''
  const parts: string[] = []
  const hours = detail.value.ship_within_hours ?? mall.value?.mall_ship_within_hours
  if (hours != null) parts.push(`${hours} 小时内发货`)
  if (detail.value.free_shipping === 1) {
    parts.push('包邮')
  } else if (mall.value?.mall_default_freight) {
    parts.push(`运费约 ¥${mall.value.mall_default_freight}`)
  }
  if (mall.value?.mall_courier) parts.push(mall.value.mall_courier)
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

watch(detailOpen, (open) => {
  session.setSuppressTabBar(open)
})

async function loadCatalog() {
  loading.value = true
  errorText.value = ''
  try {
    await catalog.ensureLoaded()
    const storeId = catalog.currentStoreId
    if (storeId == null) {
      mall.value = null
      errorText.value = '请先选择门店'
      return
    }
    mall.value = await getMallCatalog(storeId)
    if (
      chip.value !== 'all' &&
      !(mall.value.categories ?? []).some((cat) => cat.category_id === chip.value)
    ) {
      chip.value = 'all'
    }
  } catch (error) {
    mall.value = null
    errorText.value = toErrorMessage(error, '加载失败')
  } finally {
    loading.value = false
  }
}

function setChip(next: string) {
  chip.value = next
}

async function openDetail(productId: string) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const storeId = catalog.currentStoreId
    detail.value = await getMallProduct(productId, storeId)
  } catch (error) {
    const message = toErrorMessage(error, '加载详情失败')
    uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
}

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

onShow(() => {
  session.hideNativeTabBar()
  void session.refreshMemberRates()
  void loadCatalog()
})
</script>

<template>
  <SoorakChrome title="选物">
    <view v-if="loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="errorText" class="mp-empty">
      <text class="t-caption">{{ errorText }}</text>
      <SoorakButton @click="loadCatalog">重试</SoorakButton>
    </view>
    <view v-else class="page-select page-pad">
      <view class="select-head">
        <text class="t-section">节礼与风物</text>
        <text class="t-caption">{{ slogan }}</text>
      </view>

      <scroll-view scroll-x class="menu-chips" :show-scrollbar="false">
        <view class="menu-chip" :class="{ 'is-on': chip === 'all' }" @click="setChip('all')">
          全部
        </view>
        <view
          v-for="cat in categories"
          :key="cat.category_id"
          class="menu-chip"
          :class="{ 'is-on': chip === cat.category_id }"
          @click="setChip(cat.category_id)"
        >
          {{ cat.category_name }}
        </view>
      </scroll-view>

      <view v-if="!list.length" class="mp-empty">
        <text class="t-caption">今日风物暂未上架，明日再遇。</text>
      </view>
      <view v-else class="select-list">
        <MallProductCard
          v-for="item in list"
          :key="item.product_id"
          :product="item"
          @open="openDetail"
        />
      </view>
    </view>

    <SoorakSheet :open="detailOpen" title="礼品详情" @close="closeDetail">
      <view v-if="detailLoading" class="mp-empty">
        <text class="t-caption">加载中</text>
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
    </SoorakSheet>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.select-head {
  margin-bottom: 8rpx;
}

.select-head .t-caption {
  display: block;
  margin-top: 8rpx;
}

.menu-chips {
  white-space: nowrap;
  padding: 16rpx 0 8rpx;
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

.select-list {
  padding-bottom: 16rpx;
}

.mall-detail {
  padding: 8rpx 32rpx 32rpx;
}

.mall-detail__gallery {
  white-space: nowrap;
  margin: 0 -32rpx 24rpx;
  padding: 0 32rpx;
  width: calc(100% + 64rpx);
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
}

.mall-detail__stock {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $mp-brass;
}

.mall-detail__block {
  margin-top: 28rpx;
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
