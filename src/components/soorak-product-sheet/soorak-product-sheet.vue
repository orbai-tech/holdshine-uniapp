<script lang="ts">
export default {
  options: {
    virtualHost: true,
    styleIsolation: 'shared',
  },
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import { storeCanAcceptOrders } from '@/common/apis/storeApi'
import { useCartStore } from '@/stores/cart'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import type { CupSize, DrinkTemp } from '@/common/types/commerce'
import type { MpMenuOptionRes, MpMenuSkuRes } from '@/common/types/menu'
import { SERVICE_MODE, toServiceMode, toTableId } from '@/common/types/orderEnums'
import { parseAmount } from '@/utils/money'
import {
  calcLineUnit,
  calcLocalFallbackUnit,
  applyMemberDiscount,
  formatMemberGoodsMoney,
  formatDelta,
  FALLBACK_SIZE_UP,
  FALLBACK_EXTRA_EACH,
} from '@/utils/pricing'

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

const isRetail = computed(() => product.value?.cat === 'retail')

const hasApiOptions = computed(() => Boolean(product.value?.skus?.length || product.value?.optionGroups?.length))

/** sku_id/option_id 是 18 位雪花大整数（string），全程 string 透传 */
const skuId = ref<string | null>(null)
const optionIds = ref<string[]>([])
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
    optionIds.value = (current?.optionGroups ?? []).flatMap((group) => {
      const defaults = group.values.filter((item) => item.is_default === 1)
      if (group.select_type === 1) {
        const pick = defaults[0] ?? (group.is_required === 1 ? group.values[0] : null)
        return pick ? [pick.option_id] : []
      }
      return defaults.map((item) => item.option_id)
    })
    size.value = '中杯'
    temp.value = '热'
    extras.value = []
    qty.value = 1
    storyOpen.value = false
  },
)

/**
 * FIELD-GAP-006：菜单刷新后同商品的 skus 可能变化（旧 sku 被停用/删除），
 * 此时 product.id 不变，上面的 watch 不会触发，skuId 仍指向已失效的 sku_id，
 * 加购会把无效 sku_id 传给后端导致「规格不存在」。
 * 这里监听 sku 列表：当前选中的 sku 若已不在新列表，则自动重置为第一个有效 sku。
 */
watch(
  () => (product.value?.skus ?? []).map((s) => s.sku_id).join(','),
  () => {
    const current = product.value
    if (!current) return
    if (skuId.value != null && current.skus?.some((s) => s.sku_id === skuId.value)) return
    skuId.value = current.skus?.[0]?.sku_id ?? null
  },
)

/** FIELD-GAP-005：无 skus/option_groups 时本地兜底 */
const localFallbackUnit = computed(() => {
  if (!product.value) return 0
  return calcLocalFallbackUnit(product.value.price, size.value, extras.value.length)
})

/** 有菜单规格：SKU sale_price + 已选 option price_delta，零请求即时试算 */
const apiUnit = computed(() => {
  if (!product.value || !hasApiOptions.value) return 0
  const sku =
    product.value.skus?.find((item) => item.sku_id === skuId.value) ?? product.value.skus?.[0]
  const selected = new Set(optionIds.value)
  const options = (product.value.optionGroups ?? []).flatMap((group) =>
    group.values.filter((item) => selected.has(item.option_id)),
  )
  return calcLineUnit(sku?.sale_price ?? product.value.price, options)
})

const unit = computed(() => {
  if (!product.value) return 0
  if (hasApiOptions.value) return apiUnit.value
  return localFallbackUnit.value
})

/** 零售走商城折扣；饮品走咖啡折扣并保留两位小数 */
const memberUnit = computed(() => {
  if (!product.value) return 0
  const kind = product.value.cat === 'retail' ? 'mall' : 'coffee'
  const rate =
    kind === 'mall' ? session.mallDiscountRate : session.coffeeDiscountRate
  return applyMemberDiscount(unit.value, rate, kind)
})

const displayUnitText = computed(() => {
  if (!product.value) return '0'
  const kind = product.value.cat === 'retail' ? 'mall' : 'coffee'
  return formatMemberGoodsMoney(memberUnit.value, kind)
})

const displayLineText = computed(() => {
  if (!product.value) return '0'
  const kind = product.value.cat === 'retail' ? 'mall' : 'coffee'
  const line = applyMemberDiscount(unit.value * qty.value, kind === 'mall' ? session.mallDiscountRate : session.coffeeDiscountRate, kind)
  // 行金额：先折单价再×数量会与「整行折」略差；按整行折更贴合小计口径
  return formatMemberGoodsMoney(line, kind)
})

const sheetOpen = computed(() => product.value != null)
const sheetTitle = computed(() => (isRetail.value ? '商品详情' : '选规格'))
/** 是否可加购：休息/暂停接单（status!=1）时禁用，避免绕过入口直接加购 */
const canAddToBag = computed(() => storeCanAcceptOrders(catalog.currentStore))
/**
 * 饮品必须依赖后端下发的 skus/option_groups 才能生成 sku_id/option_ids；
 * 本地兜底选择的杯型/温度/加料无法透传给购物车，会导致订单详情丢失规格信息。
 */
const canAddDrink = computed(() => canAddToBag.value && (isRetail.value || hasApiOptions.value))
const addDrinkDisabledReason = computed(() => {
  if (!canAddToBag.value) return '门店休息中，暂无法加购'
  if (!isRetail.value && !hasApiOptions.value) return '商品规格未配置，所选规格无法保存到订单'
  return ''
})

const showRitual = computed(() => Boolean(product.value?.desc || product.value?.tag))

function toggleOption(group: { select_type: number; is_required: number; values: { option_id: string }[] }, id: string) {
  const groupIds = new Set(group.values.map((item) => item.option_id))
  const isSingle = group.select_type === 1
  if (isSingle) {
    // 单选：同组互斥；必选组不允许点掉当前项
    if (optionIds.value.includes(id) && group.is_required === 1) return
    optionIds.value = [
      ...optionIds.value.filter((item) => !groupIds.has(item)),
      ...(optionIds.value.includes(id) ? [] : [id]),
    ]
    return
  }
  optionIds.value = optionIds.value.includes(id)
    ? optionIds.value.filter((item) => item !== id)
    : [...optionIds.value, id]
}

function toggleExtra(name: string) {
  extras.value = extras.value.includes(name)
    ? extras.value.filter((item) => item !== name)
    : [...extras.value, name]
}

/** 杯型 chip 文案：如「大杯 +3」；加价为 0 时不显示后缀 */
function skuDeltaText(item: MpMenuSkuRes): string {
  if (!product.value) return ''
  return formatDelta(parseAmount(item.sale_price) - product.value.basePrice)
}

/** 选项 chip 文案：如「加椰果 +5」；price_delta 为 0 时不显示后缀 */
function optionDeltaText(item: MpMenuOptionRes): string {
  return formatDelta(parseAmount(item.price_delta))
}

async function add(openCart = true): Promise<boolean> {
  if (!product.value || cart.writeBusy) return false
  if (!canAddToBag.value) return false
  const storeId = catalog.currentStoreId
  const productId = product.value.productId
  if (storeId == null || productId == null) return false
  const serviceMode = toServiceMode(session)
  const tableId =
    serviceMode === SERVICE_MODE.DINE_IN ? toTableId(session) : null
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
      // 显式拷贝，确保加料 id 随加购写入订单
      option_ids: [...optionIds.value],
      quantity: qty.value,
      ...(serviceMode != null ? { service_mode: serviceMode } : {}),
      ...(tableId != null ? { table_id: tableId } : {}),
    },
    openCart,
  )
  return true
}

async function addRetailToBag() {
  const ok = await add(false)
  if (ok) uni.showToast({ title: '已加入今日茶单', icon: 'none' })
}

async function buyNow() {
  await add(true)
}
</script>

<template>
  <SoorakSheet :open="sheetOpen" :title="sheetTitle" @close="session.closeProduct()">
    <view v-if="product" class="ps">
      <view class="ps__portrait" :class="{ 'ps__portrait--retail': isRetail }">
        <image class="ps__img" :class="{ 'ps__img--retail': isRetail }" :src="product.img" mode="aspectFill" />
        <text v-if="isRetail && product.tag" class="ps__tag">{{ product.tag }}</text>
      </view>

      <!-- retail 展柜内容 -->
      <view v-if="isRetail" class="ps__content">
        <text class="ps__price">¥{{ displayUnitText }}</text>
        <text class="t-label">{{ product.en }}</text>
        <text class="t-title ps__name">{{ product.name }}</text>
        <text v-if="product.scene" class="ps__scene">{{ product.scene }}</text>

        <view v-if="showRitual" class="ps__ritual">
          <text class="ps__ritual-title">礼遇 · 门店仪式可带回家</text>
          <text v-if="product.desc" class="ps__ritual-desc">{{ product.desc }}</text>
        </view>

        <template v-if="product.story">
          <view v-if="storyOpen" class="ps__story is-open">{{ product.story }}</view>
          <view class="ps__more" @click="storyOpen = !storyOpen">
            {{ storyOpen ? '收起故事' : '展开产品故事' }}
          </view>
        </template>

        <view class="ps__detail">
          <text class="ps__detail-title">商品详情</text>
          <view class="ps__detail-mock" />
        </view>
      </view>

      <!-- 饮品：保持改前结构 -->
      <view v-else class="ps__content">
        <text class="t-label">{{ product.en }}</text>
        <text class="t-title ps__name">{{ product.name }}</text>
        <text class="ps__scene">{{ product.scene }}</text>
        <view class="ps__story" :class="{ 'is-open': storyOpen }">{{ product.story }}</view>
        <view class="ps__more" @click="storyOpen = !storyOpen">
          {{ storyOpen ? '收起故事' : '展开产品故事' }}
        </view>

        <view v-if="!hasApiOptions" class="ps__options-warning">
          <text class="ps__options-warning-text">{{ addDrinkDisabledReason }}</text>
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
                {{ item.sku_name }}{{ skuDeltaText(item) }}
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
                @click="toggleOption(group, item.option_id)"
              >
                {{ item.option_name }}{{ optionDeltaText(item) }}
              </view>
            </view>
          </view>
        </template>
        <template v-else>
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
                {{ item }}{{ formatDelta(item === '大杯' ? FALLBACK_SIZE_UP : 0) }}
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
                {{ item }}{{ formatDelta(FALLBACK_EXTRA_EACH) }}
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
      <view
        v-if="isRetail"
        class="ps-cta ps-cta--retail"
        style="width:100%;display:flex;flex-direction:row;align-items:center;box-sizing:border-box;"
      >
        <view class="ps-bag" @click="session.setCartOpen(true)">
          <text class="ps-bag__icon">袋</text>
          <text class="ps-bag__label">购物袋</text>
        </view>
        <view
          class="ps-cta__actions"
          style="flex:1;width:0;min-width:0;display:flex;flex-direction:row;align-items:center;"
        >
          <view
            class="ps-cta__btn ps-cta__btn--secondary"
            :class="{ 'is-disabled': !canAddToBag }"
            style="flex:1;width:0;min-width:0;"
            :hover-class="canAddToBag ? 'ps-cta__btn--active' : 'none'"
            @click="addRetailToBag"
          >
            <text class="ps-cta__label">{{ cart.writeBusy ? '加入中…' : '加入购物袋' }}</text>
          </view>
          <view
            class="ps-cta__btn ps-cta__btn--primary"
            :class="{ 'is-disabled': !canAddToBag }"
            style="flex:1;width:0;min-width:0;"
            :hover-class="canAddToBag ? 'ps-cta__btn--active-primary' : 'none'"
            @click="buyNow"
          >
            <text class="ps-cta__label ps-cta__label--light">{{ cart.writeBusy ? '加入中…' : '立刻下单' }}</text>
          </view>
        </view>
      </view>
      <!-- 饮品专属全宽 CTA -->
      <view v-else class="ps-cta ps-cta--drink" style="width:100%;">
        <view
          class="ps-cta__drink-btn"
          :class="{ 'is-disabled': !canAddDrink }"
          :hover-class="canAddDrink ? 'ps-cta__drink-btn--active' : 'none'"
          @click="add()"
        >
          <text class="ps-cta__drink-label">
            ¥{{ displayLineText }} {{ cart.writeBusy ? '加入中…' : '加入购物袋' }}
          </text>
        </view>
      </view>
    </template>
  </SoorakSheet>
</template>

<style lang="scss" scoped>
.ps__portrait {
  position: relative;
}

.ps__img {
  width: 100%;
  height: 360rpx;
  display: block;
}

.ps__img--retail {
  height: 440rpx;
}

.ps__tag {
  position: absolute;
  left: 12rpx;
  bottom: 12rpx;
  padding: 4rpx 12rpx;
  background: rgba(20, 17, 15, 0.72);
  color: $mp-paper;
  font-size: 18rpx;
  letter-spacing: 0.06em;
}

.ps__content {
  padding: 28rpx 32rpx 16rpx;
}

.ps__price {
  display: block;
  margin-bottom: 12rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 44rpx;
  font-weight: 500;
  line-height: 1.2;
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

.ps__ritual {
  margin: 0 0 24rpx;
  padding: 20rpx 24rpx;
  background: $mp-stone;
  border-radius: 8rpx;
}

.ps__ritual-title {
  display: block;
  font-size: 24rpx;
  letter-spacing: 0.08em;
  color: $mp-text;
}

.ps__ritual-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.55;
  color: $mp-text-2;
}

.ps__detail {
  margin: 8rpx 0 24rpx;
}

.ps__detail-title {
  display: block;
  margin-bottom: 16rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 28rpx;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: $mp-text;
}

.ps__detail-mock {
  width: 100%;
  height: 360rpx;
  border-radius: 8rpx;
  background: $mp-stone;
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

.ps__options-warning {
  margin-bottom: 28rpx;
  padding: 20rpx 24rpx;
  background: #fff8e6;
  border-radius: 8rpx;
}

.ps__options-warning-text {
  font-size: 24rpx;
  line-height: 1.5;
  color: #b45a1a;
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

.ps-cta--drink {
  display: block;
  width: 100%;
}

.ps-cta__drink-btn {
  width: 100%;
  box-sizing: border-box;
  min-height: 96rpx;
  padding: 0 32rpx;
  border-radius: 8rpx;
  background: $mp-moss;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ps-cta__drink-btn.is-disabled {
  background: $mp-stone;
  pointer-events: none;
}

.ps-cta__drink-btn.is-disabled .ps-cta__drink-label {
  color: $mp-text-3;
}

.ps-cta__drink-btn--active {
  opacity: 0.92;
  transform: scale(0.98);
  background: $mp-moss-deep;
}

.ps-cta__drink-label {
  max-width: 100%;
  font-size: 34rpx;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.08em;
  color: $mp-paper;
  text-align: center;
}

.ps-bag__icon {
  font-size: 28rpx;
  line-height: 1;
  letter-spacing: 0.06em;
  color: $mp-text;
}

.ps-bag__label {
  font-size: 18rpx;
  letter-spacing: 0.04em;
  color: $mp-text-2;
}

.ps-cta__label {
  font-size: 30rpx;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.08em;
  white-space: nowrap;
  color: $mp-text;
}

.ps-cta__label--light {
  color: $mp-paper;
}
</style>

<!-- 非 scoped：footer 经 root-portal 挂载后，宽度布局必须用全局选择器才能稳定撑开 -->
<style lang="scss">
.ps-cta {
  flex: 1;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.ps-cta--retail {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.ps-bag {
  flex-shrink: 0;
  width: 88rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.ps-cta__actions {
  flex: 1;
  width: 0;
  min-width: 0;
  margin-left: 16rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  box-sizing: border-box;
}

.ps-cta__btn {
  flex: 1;
  width: 0;
  min-width: 0;
  box-sizing: border-box;
  min-height: 96rpx;
  padding: 0 16rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ps-cta__btn + .ps-cta__btn {
  margin-left: 16rpx;
}

.ps-cta__btn--secondary {
  background: transparent;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.ps-cta__btn--primary {
  background: $mp-moss;
}

.ps-cta__btn.is-disabled {
  background: $mp-stone;
  box-shadow: none;
  pointer-events: none;
}

.ps-cta__btn.is-disabled .ps-cta__label,
.ps-cta__btn.is-disabled .ps-cta__label--light {
  color: $mp-text-3;
}

.ps-cta__btn--active {
  opacity: 0.92;
  transform: scale(0.98);
}

.ps-cta__btn--active-primary {
  opacity: 0.92;
  transform: scale(0.98);
  background: $mp-moss-deep;
}
</style>
