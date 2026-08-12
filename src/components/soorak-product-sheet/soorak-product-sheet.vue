<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { useCartStore } from '@/stores/cart'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import type { CupSize, DrinkTemp } from '@/common/types/commerce'
import { parseAmount } from '@/utils/money'

const SIZES: CupSize[] = ['中杯', '大杯']
const TEMPS: DrinkTemp[] = ['热', '正常冰', '少冰']
const EXTRAS = ['加燕窝 15g', '加浓缩 1 份', '换燕麦奶', '加核桃碎']

const session = useSessionStore()
const catalog = useCatalogStore()
const cart = useCartStore()

const product = computed(() => {
  if (!session.productId) return null
  return catalog.findProduct(session.productId)
})

const hasApiOptions = computed(() => Boolean(product.value?.skus?.length || product.value?.optionGroups?.length))

const skuId = ref<number | null>(null)
const optionIds = ref<number[]>([])
const size = ref<CupSize>('中杯')
const temp = ref<DrinkTemp>('热')
const extras = ref<string[]>([])
const qty = ref(1)
const storyOpen = ref(false)

watch(
  () => product.value?.id,
  () => {
    const current = product.value
    const firstSku = current?.skus?.[0]
    skuId.value = firstSku?.sku_id ?? null
    optionIds.value = (current?.optionGroups ?? []).flatMap((group) =>
      group.values.filter((item) => item.is_default === 1).map((item) => item.option_id),
    )
    size.value = '中杯'
    temp.value = '热'
    extras.value = []
    qty.value = 1
    storyOpen.value = false
  },
)

const selectedSku = computed(() => product.value?.skus?.find((item) => item.sku_id === skuId.value) ?? null)

const unit = computed(() => {
  if (!product.value) return 0
  if (hasApiOptions.value) {
    const base = selectedSku.value ? parseAmount(selectedSku.value.sale_price) : product.value.price
    const extrasSum = (product.value.optionGroups ?? []).flatMap((group) => group.values)
      .filter((item) => optionIds.value.includes(item.option_id))
      .reduce((sum, item) => sum + parseAmount(item.price_delta), 0)
    return base + extrasSum
  }
  return product.value.price + (size.value === '大杯' ? 3 : 0) + extras.value.length * 3
})

function toggleOption(id: number) {
  optionIds.value = optionIds.value.includes(id)
    ? optionIds.value.filter((item) => item !== id)
    : [...optionIds.value, id]
}

function toggleExtra(name: string) {
  extras.value = extras.value.includes(name)
    ? extras.value.filter((item) => item !== name)
    : [...extras.value, name]
}

async function add() {
  if (!product.value || cart.writeBusy) return
  const storeId = catalog.currentStoreId
  const productId = product.value.productId
  if (storeId == null || productId == null) return
  await cart.addToCart(
    {
      product: product.value,
      qty: qty.value,
      size: size.value,
      temp: temp.value,
      extras: extras.value,
    },
    {
      store_id: storeId,
      product_id: productId,
      sku_id: skuId.value,
      option_ids: optionIds.value,
      quantity: qty.value,
    },
  )
}
</script>

<template>
  <SoorakSheet :open="Boolean(product)" title="选规格" @close="session.closeProduct()">
    <view v-if="product" class="ps">
      <image class="ps__img" :src="product.img" mode="aspectFill" />
      <view class="ps__content">
        <text class="t-label">{{ product.en }}</text>
        <text class="t-title ps__name">{{ product.name }}</text>
        <text class="ps__scene">{{ product.scene }}</text>
        <view class="ps__story" :class="{ 'is-open': storyOpen }">{{ product.story }}</view>
        <view class="ps__more" @click="storyOpen = !storyOpen">
          {{ storyOpen ? '收起故事' : '展开产品故事' }}
        </view>

        <template v-if="hasApiOptions">
          <view v-if="product.skus?.length" class="ps__group">
            <text class="t-label">规格</text>
            <view class="ps-chips">
              <view
                v-for="item in product.skus"
                :key="item.sku_id"
                class="ps-chip"
                :class="{ 'is-on': skuId === item.sku_id }"
                @click="skuId = item.sku_id"
              >
                {{ item.sku_name }}
              </view>
            </view>
          </view>
          <view v-for="group in product.optionGroups" :key="group.group_id" class="ps__group">
            <text class="t-label">{{ group.group_name }}</text>
            <view class="ps-chips">
              <view
                v-for="item in group.values"
                :key="item.option_id"
                class="ps-chip"
                :class="{ 'is-on': optionIds.includes(item.option_id) }"
                @click="toggleOption(item.option_id)"
              >
                {{ item.option_name }}
              </view>
            </view>
          </view>
        </template>
        <template v-else-if="product.cat !== 'retail'">
          <view class="ps__group">
            <text class="t-label">杯型</text>
            <view class="ps-chips">
              <view
                v-for="item in SIZES"
                :key="item"
                class="ps-chip"
                :class="{ 'is-on': size === item }"
                @click="size = item"
              >
                {{ item }}{{ item === '大杯' ? ' +¥3' : '' }}
              </view>
            </view>
          </view>
          <view class="ps__group">
            <text class="t-label">温度</text>
            <view class="ps-chips">
              <view
                v-for="item in TEMPS"
                :key="item"
                class="ps-chip"
                :class="{ 'is-on': temp === item }"
                @click="temp = item"
              >
                {{ item }}
              </view>
            </view>
          </view>
          <view class="ps__group">
            <text class="t-label">加料</text>
            <view class="ps-chips">
              <view
                v-for="item in EXTRAS"
                :key="item"
                class="ps-chip"
                :class="{ 'is-on': extras.includes(item) }"
                @click="toggleExtra(item)"
              >
                {{ item }} +¥3
              </view>
            </view>
          </view>
        </template>

        <view class="ps__qty">
          <text class="t-label">数量</text>
          <view class="ps-qty">
            <view class="ps-qty__btn" @click="qty = Math.max(1, qty - 1)">−</view>
            <text class="ps-qty__num">{{ qty }}</text>
            <view class="ps-qty__btn" @click="qty += 1">+</view>
          </view>
        </view>
      </view>
    </view>

    <template #footer>
      <view class="ps-cta">
        <SoorakButton block @click="add">
          <text class="ps-cta__label">
            ¥{{ unit * qty }} {{ cart.writeBusy ? '加入中…' : '加入购物袋' }}
          </text>
        </SoorakButton>
      </view>
    </template>
  </SoorakSheet>
</template>

<style lang="scss" scoped>
.ps__img {
  width: 100%;
  height: 360rpx;
}

.ps__content {
  padding: 28rpx 32rpx 16rpx;
}

.ps__name {
  display: block;
  margin: 8rpx 0 16rpx;
}

.ps__scene {
  display: block;
  margin: 0 0 20rpx;
  font-size: 24rpx;
  color: $mp-brass;
}

.ps__story {
  display: -webkit-box;
  color: $mp-text-2;
  font-size: 26rpx;
  line-height: 1.65;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ps__story.is-open {
  display: block;
  -webkit-line-clamp: unset;
}

.ps__more {
  margin: 16rpx 0 32rpx;
  font-size: 24rpx;
  letter-spacing: 0.08em;
  color: $mp-brass;
}

.ps__group {
  margin-bottom: 28rpx;
}

.ps__group .t-label {
  display: block;
  margin-bottom: 16rpx;
}

.ps-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.ps-chip {
  min-height: 68rpx;
  padding: 0 24rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: $mp-text-2;
  display: flex;
  align-items: center;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.ps-chip.is-on {
  background: $mp-moss;
  color: $mp-paper;
  box-shadow: none;
}

.ps__qty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.ps-qty {
  display: flex;
  align-items: center;
  gap: 28rpx;
  border: 1rpx solid $mp-border;
  border-radius: 8rpx;
  padding: 8rpx 16rpx;
}

.ps-qty__btn {
  width: 56rpx;
  height: 56rpx;
  font-size: 32rpx;
  color: $mp-text-2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ps-qty__num {
  min-width: 36rpx;
  text-align: center;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 32rpx;
}

.ps-cta {
  flex: 1;
  width: 100%;
  min-width: 0;
}

.ps-cta__label {
  font-size: 30rpx;
  letter-spacing: 0.04em;
}
</style>
