<script setup lang="ts">
import { computed, ref } from 'vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import type {
  MemberLevelOfferRes,
  MemberSummaryRes,
  MyMemberSubscriptionRes,
} from '@/common/types/member'
import {
  discountRateLabel,
  formatMemberDate,
  formatMemberPrice,
  memberActionLabel,
  memberPayStatusLabel,
  splitBenefitsDescription,
} from '@/utils/memberLabel'
import { canResumeSubscription } from '../useMemberPack'

const props = defineProps<{
  area: 'stats' | 'main'
  summary: MemberSummaryRes | null
  displayPoints: number
  remainingDaysText: string
  offerLevels: MemberLevelOfferRes[]
  benefitsDescription: string
  subscriptions: MyMemberSubscriptionRes[]
  subscribeBusy: boolean
  subsSheetOpen: boolean
}>()

const emit = defineEmits<{
  openPoints: []
  subscribe: [level: MemberLevelOfferRes]
  resumePay: [row: MyMemberSubscriptionRes]
  'update:subsSheetOpen': [open: boolean]
}>()

const expandedLevelIds = ref<Record<string, boolean>>({})

const summaryPerks = computed(() => {
  const current = props.summary
  if (!current) return []
  const fromDesc = splitBenefitsDescription(current.benefits_description)
  if (fromDesc.length) return fromDesc
  const coffee = discountRateLabel(current.coffee_discount_rate, '饮品 ')
  const mall = discountRateLabel(current.mall_discount_rate, '商城 ')
  return [coffee, mall].filter(Boolean)
})

const summaryMeta = computed(() => {
  const current = props.summary
  if (!current) return ''
  if (!current.is_active) return '月卡未开通或已到期'
  const expires = formatMemberDate(current.expires_at)
  if (expires) return `有效期至 ${expires}`
  return '会员权益生效中'
})

function isLevelExpanded(levelId: string) {
  return Boolean(expandedLevelIds.value[levelId])
}

function toggleLevelExpand(levelId: string) {
  if (!levelId) return
  expandedLevelIds.value = {
    ...expandedLevelIds.value,
    [levelId]: !expandedLevelIds.value[levelId],
  }
}

function levelOfferMeta(level: MemberLevelOfferRes) {
  const action = memberActionLabel(level.action_type)
  const price = formatMemberPrice(level.pay_amount || level.monthly_price)
  return `${action} ${price} · ${level.duration_days} 天`
}

function levelOfferPerks(level: MemberLevelOfferRes) {
  const fromDesc = splitBenefitsDescription(level.benefits_description)
  if (fromDesc.length) return fromDesc
  const coffee = discountRateLabel(level.coffee_discount_rate, '饮品 ')
  const mall = discountRateLabel(level.mall_discount_rate, '商城 ')
  return [coffee, mall].filter(Boolean)
}

function subscriptionTitle(row: MyMemberSubscriptionRes) {
  const name = row.target_level_name || '会员月卡'
  return `${memberActionLabel(row.action_type)} · ${name}`
}

function subscriptionMeta(row: MyMemberSubscriptionRes) {
  const status = memberPayStatusLabel(row.pay_status)
  const amount = formatMemberPrice(row.pay_amount)
  const paid = formatMemberDate(row.paid_at || row.created_at)
  if (canResumeSubscription(row)) {
    const base = paid ? `${status} · ${amount} · ${paid}` : `${status} · ${amount}`
    return `${base} · 点按继续支付`
  }
  if (paid) return `${status} · ${amount} · ${paid}`
  return `${status} · ${amount}`
}

function onSubscribe(level: MemberLevelOfferRes) {
  emit('subscribe', level)
}

function onResume(row: MyMemberSubscriptionRes) {
  if (!canResumeSubscription(row)) return
  emit('resumePay', row)
}

function closeSubsSheet() {
  emit('update:subsSheetOpen', false)
}
</script>

<template>
  <view v-if="area === 'stats' && summary" class="member-stats">
    <view class="member-stats__tap" @click="emit('openPoints')">
      <text class="member-stats__k">积分</text>
      <text class="member-stats__v">{{ displayPoints }}</text>
    </view>
    <view>
      <text class="member-stats__k">剩余天数</text>
      <text class="member-stats__v">{{ remainingDaysText }}</text>
    </view>
  </view>

  <template v-else-if="area === 'main' && summary">
    <text class="t-section block-title">会员摘要</text>
    <view class="tier-list">
      <view class="tier-card">
        <text class="tier-card__name">{{ summary.level_name }}</text>
        <text class="t-caption">{{ summaryMeta }}</text>
        <view v-if="summaryPerks.length" class="tier-card__perks">
          <view v-for="perk in summaryPerks" :key="perk" class="tier-card__perk">
            <view class="tier-card__dot" />
            <text>{{ perk }}</text>
          </view>
        </view>
      </view>
    </view>

    <text class="t-section block-title">可购会员档位</text>
    <view class="tier-list">
      <view
        v-for="level in offerLevels"
        :key="level.member_level_id"
        class="tier-card"
        @click="toggleLevelExpand(level.member_level_id)"
      >
        <view class="tier-card__head">
          <view class="tier-card__head-text">
            <text class="tier-card__name">{{ level.level_name }}</text>
            <text class="t-caption">{{ levelOfferMeta(level) }}</text>
            <text v-if="!isLevelExpanded(level.member_level_id)" class="t-caption tier-card__hint">
              点击查看权益
            </text>
          </view>
          <view
            v-if="level.purchasable"
            class="tier-card__action"
            :class="{ 'tier-card__action--busy': subscribeBusy }"
            @click.stop="onSubscribe(level)"
          >
            <text>{{ memberActionLabel(level.action_type) }}</text>
          </view>
          <text v-else class="t-caption tier-card__muted">暂不可购</text>
        </view>
        <view
          v-if="isLevelExpanded(level.member_level_id) && levelOfferPerks(level).length"
          class="tier-card__perks"
        >
          <view
            v-for="perk in levelOfferPerks(level)"
            :key="`${level.member_level_id}-${perk}`"
            class="tier-card__perk"
          >
            <view class="tier-card__dot" />
            <text>{{ perk }}</text>
          </view>
        </view>
      </view>
      <view v-if="!offerLevels.length" class="tier-row">
        <text class="tier-row__name">暂无档位</text>
        <text class="t-caption">稍后再试</text>
      </view>
    </view>

    <text v-if="benefitsDescription" class="t-section block-title">权益说明</text>
    <view v-if="benefitsDescription" class="tier-card benefits-copy">
      <text class="benefits-copy__text">{{ benefitsDescription }}</text>
    </view>

    <SoorakSheet :open="subsSheetOpen" title="月卡购买记录" @close="closeSubsSheet">
      <view class="tier-sheet">
        <view
          v-for="row in subscriptions"
          :key="row.subscription_id"
          class="tier-row tier-row--stack"
          :class="{ 'tier-row--pay': canResumeSubscription(row) }"
          @click="onResume(row)"
        >
          <text class="tier-row__name">{{ subscriptionTitle(row) }}</text>
          <text class="t-caption">{{ subscriptionMeta(row) }}</text>
        </view>
        <view v-if="!subscriptions.length" class="tier-row tier-row--stack">
          <text class="tier-row__name">暂无购买记录</text>
          <text class="t-caption">开通月卡后将显示于此</text>
        </view>
      </view>
    </SoorakSheet>
  </template>
</template>

<style lang="scss" scoped>
.member-stats {
  margin-top: 32rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.12);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.member-stats__tap {
  min-width: 0;
}

.member-stats__k {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.1em;
  color: rgba(247, 244, 238, 0.45);
  margin-bottom: 8rpx;
}

.member-stats__v {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 36rpx;
  font-weight: 500;
}

.block-title {
  display: block;
  margin: 40rpx 0 24rpx;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.tier-card {
  padding: 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
}

.tier-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.tier-card__head-text {
  min-width: 0;
  flex: 1;
}

.tier-card__name {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.tier-card__muted {
  flex-shrink: 0;
  color: $mp-text-3;
}

.tier-card__hint {
  display: block;
  margin-top: 8rpx;
  color: $mp-text-3;
}

.tier-card__action {
  flex-shrink: 0;
  min-height: 56rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $mp-moss;
  color: $mp-paper;
  border-radius: 8rpx;
  font-size: 22rpx;
  letter-spacing: 0.06em;
}

.tier-card__action--busy {
  opacity: 0.55;
  pointer-events: none;
}

.tier-card__perks {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.tier-card__perk {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  font-size: 24rpx;
  color: $mp-text-2;
}

.tier-card__dot {
  width: 8rpx;
  height: 8rpx;
  margin-top: 14rpx;
  border-radius: 50%;
  background: $mp-brass;
  flex-shrink: 0;
}

.benefits-copy__text {
  font-size: 24rpx;
  line-height: 1.7;
  color: $mp-text-2;
}

.tier-row {
  padding: 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.tier-row--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;
}

.tier-row--pay {
  box-shadow: inset 0 0 0 1rpx rgba(51, 71, 61, 0.18);
}

.tier-row__name {
  font-size: 28rpx;
  font-weight: 500;
}

.tier-sheet {
  padding: 24rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
</style>
