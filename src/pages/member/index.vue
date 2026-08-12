<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { getMemberBundle } from '@/common/apis/memberApi'
import { useSessionStore } from '@/stores/session'
import type { MemberPayload } from '@/common/types/member'

const session = useSessionStore()
const loading = ref(false)
const errorText = ref('')
const bundle = ref<MemberPayload | null>(null)

const progress = computed(() => {
  if (!bundle.value) return 0
  return Math.min(100, (bundle.value.profile.growth / 5000) * 100)
})

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    if (!session.loggedIn) {
      throw new Error('登录后查看会员资料')
    }
    bundle.value = await getMemberBundle()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onShow(() => {
  void load()
})
</script>

<template>
  <SoorakChrome title="会员">
    <view v-if="loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="errorText" class="mp-empty">
      <text class="t-caption">{{ errorText }}</text>
      <SoorakButton @click="load">重试</SoorakButton>
    </view>
    <view v-else-if="bundle" class="page-member page-pad">
      <view class="member-hero">
        <text class="t-label member-hero__label">SOORAK Club</text>
        <text class="member-hero__name">{{ bundle.profile.name }}</text>
        <text class="member-hero__tier">{{ bundle.profile.tier }}</text>
        <text class="member-no">No. {{ bundle.profile.memberNo }}</text>
        <view class="member-bar">
          <view class="member-bar__fill" :style="{ width: `${progress}%` }" />
        </view>
        <text class="t-caption member-hero__cap">距 {{ bundle.profile.nextTier }} 还需 {{ bundle.profile.nextNeed }} 成长值</text>
        <view class="member-stats">
          <view>
            <text class="member-stats__k">余额</text>
            <text class="member-stats__v">¥{{ bundle.profile.balance }}</text>
          </view>
          <view>
            <text class="member-stats__k">积分</text>
            <text class="member-stats__v">{{ bundle.profile.points }}</text>
          </view>
          <view>
            <text class="member-stats__k">成长值</text>
            <text class="member-stats__v">{{ bundle.profile.growth }}</text>
          </view>
        </view>
      </view>

      <view class="member-actions">
        <SoorakButton block @click="session.goTab('/pages/menu/index')">会员价去点单</SoorakButton>
      </view>

      <text class="t-section block-title">等级权益</text>
      <view class="tier-list">
        <view v-for="tier in bundle.tiers" :key="tier.id" class="tier-card">
          <text class="tier-card__name">{{ tier.name }}</text>
          <text class="t-caption">{{ tier.threshold === 0 ? '注册即享' : `成长值 ${tier.threshold}` }}</text>
          <view class="tier-card__perks">
            <view v-for="perk in tier.perks" :key="perk" class="tier-card__perk">
              <view class="tier-card__dot" />
              <text>{{ perk }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.member-hero {
  background: $mp-ink;
  color: $mp-paper;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
}

.member-hero__label {
  color: rgba(247, 244, 238, 0.45);
}

.member-hero__name {
  display: block;
  margin: 16rpx 0 8rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 56rpx;
  font-weight: 500;
}

.member-hero__tier {
  color: $mp-brass-soft;
  font-size: 26rpx;
}

.member-no {
  display: block;
  margin-top: 20rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.member-bar {
  margin-top: 32rpx;
  height: 4rpx;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999rpx;
  overflow: hidden;
}

.member-bar__fill {
  height: 100%;
  background: $mp-brass;
}

.member-hero__cap {
  display: block;
  margin-top: 16rpx;
  color: rgba(247, 244, 238, 0.5);
}

.member-stats {
  margin-top: 32rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.12);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
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

.member-actions {
  margin: 32rpx 0 16rpx;
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

.tier-card__name {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 500;
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
</style>
