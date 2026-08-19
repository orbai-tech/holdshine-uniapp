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
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { getStoreDetail, storeIsOpenNow, storeStatusLabel } from '@/common/apis/storeApi'
import type { MpStoreDetailRes } from '@/common/types/store'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import { parseAmount } from '@/utils/money'

const props = defineProps<{
  open: boolean
  storeId: number | null
}>()

const emit = defineEmits<{
  close: []
}>()

const session = useSessionStore()
const detail = ref<MpStoreDetailRes | null>(null)
const loading = ref(false)
const errorText = ref('')

const addressLine = computed(() => {
  if (!detail.value) return ''
  return [detail.value.province, detail.value.city, detail.value.district, detail.value.address]
    .filter(Boolean)
    .join(' ')
})

const openLabel = computed(() => storeStatusLabel(detail.value))
const openNow = computed(() => storeIsOpenNow(detail.value))

const capabilityText = computed(() => {
  if (!detail.value) return ''
  const parts: string[] = []
  if (detail.value.enable_dine_in) parts.push('堂食')
  if (detail.value.enable_takeaway) parts.push('外卖')
  return parts.join(' · ') || '—'
})

watch(
  () => [props.open, props.storeId] as const,
  ([open, storeId]) => {
    if (!open || storeId == null) return
    void loadDetail(storeId)
  },
)

async function loadDetail(storeId: number) {
  loading.value = true
  errorText.value = ''
  detail.value = null
  try {
    detail.value = await getStoreDetail(storeId)
    if (!detail.value) errorText.value = '门店不存在'
  } catch (error) {
    errorText.value = toErrorMessage(error, '门店详情加载失败')
  } finally {
    loading.value = false
  }
}

function onClose() {
  emit('close')
}

function onCall() {
  const mobile = detail.value?.mobile?.trim()
  if (!mobile) return
  uni.makePhoneCall({
    phoneNumber: mobile,
    fail() {},
  })
}

function onGoMenu() {
  onClose()
  session.goMenu()
}

function feeText(value: string | null | undefined, suffix = '元') {
  if (value == null || value === '') return ''
  const amount = parseAmount(value)
  if (!(amount > 0)) return ''
  return `${amount}${suffix}`
}
</script>

<template>
  <SoorakSheet :open="open" title="门店详情" @close="onClose">
    <view v-if="loading" class="mp-empty">
      <text class="t-caption">加载中…</text>
    </view>
    <view v-else-if="errorText" class="mp-empty">
      <text class="t-caption">{{ errorText }}</text>
    </view>
    <view v-else-if="detail" class="store-detail">
      <view class="store-detail__head">
        <text class="store-detail__name">{{ detail.store_name }}</text>
        <text class="store-detail__status" :class="{ 'is-on': openNow }">
          {{ openLabel }}
        </text>
      </view>
      <text class="store-detail__line t-caption">{{ addressLine || '地址待完善' }}</text>
      <text class="store-detail__line">
        {{ detail.business_hours || '营业时间待定' }} · {{ capabilityText }}
      </text>

      <view v-if="detail.mobile" class="store-detail__row" @click="onCall">
        <text class="store-detail__label">电话</text>
        <text class="store-detail__value store-detail__value--link">{{ detail.mobile }}</text>
      </view>

      <view class="store-detail__section">
        <view v-if="feeText(detail.min_order_amount)" class="store-detail__row">
          <text class="store-detail__label">起送</text>
          <text class="store-detail__value">¥{{ feeText(detail.min_order_amount, '') }}</text>
        </view>
        <view v-if="feeText(detail.packing_fee)" class="store-detail__row">
          <text class="store-detail__label">包装费</text>
          <text class="store-detail__value">¥{{ feeText(detail.packing_fee, '') }}</text>
        </view>
        <view v-if="feeText(detail.delivery_fee)" class="store-detail__row">
          <text class="store-detail__label">配送费</text>
          <text class="store-detail__value">¥{{ feeText(detail.delivery_fee, '') }}</text>
        </view>
        <view v-if="feeText(detail.delivery_radius_km, 'km')" class="store-detail__row">
          <text class="store-detail__label">配送半径</text>
          <text class="store-detail__value">{{ feeText(detail.delivery_radius_km, 'km') }}</text>
        </view>
        <view v-if="feeText(detail.free_delivery_amount)" class="store-detail__row">
          <text class="store-detail__label">满免配送</text>
          <text class="store-detail__value">¥{{ feeText(detail.free_delivery_amount, '') }}</text>
        </view>
      </view>
    </view>

    <template v-if="detail && !loading && !errorText" #footer>
      <SoorakButton @click="onGoMenu">去点单</SoorakButton>
    </template>
  </SoorakSheet>
</template>

<style lang="scss" scoped>
.store-detail {
  padding: 8rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.store-detail__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.store-detail__name {
  flex: 1;
  font-size: 34rpx;
  font-weight: 500;
}

.store-detail__status {
  font-size: 22rpx;
  color: $mp-text-3;
}

.store-detail__status.is-on {
  color: $mp-moss;
}

.store-detail__line {
  display: block;
  font-size: 24rpx;
  color: $mp-text-2;
  line-height: 1.5;
}

.store-detail__section {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $mp-border;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.store-detail__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24rpx;
  min-height: 48rpx;
}

.store-detail__label {
  font-size: 24rpx;
  color: $mp-text-3;
}

.store-detail__value {
  font-size: 26rpx;
  color: $mp-text;
}

.store-detail__value--link {
  color: $mp-brass;
}
</style>
