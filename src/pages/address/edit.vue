<script setup lang="ts">
import { ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import type { AddressGender, AddressTag, DeliveryAddress } from '@/common/types/fulfillment'
import { useSessionStore } from '@/stores/session'

const TAGS: AddressTag[] = ['家', '公司', '学校', '其他']

const session = useSessionStore()

const name = ref('')
const gender = ref<AddressGender>('先生')
const phone = ref('')
const region = ref('')
const regionValue = ref<string[]>([])
const door = ref('')
const tag = ref<AddressTag>('家')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)

function parseRegionValue(text: string): string[] {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  return parts.length >= 2 && parts.length <= 3 ? parts : []
}

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
  const existing = session.deliveryAddress
  if (!existing) return
  name.value = existing.name
  gender.value = existing.gender
  phone.value = existing.phone
  region.value = existing.region
  regionValue.value = parseRegionValue(existing.region)
  door.value = existing.door
  tag.value = existing.tag
  latitude.value = existing.latitude
  longitude.value = existing.longitude
})

onHide(() => {
  session.setSuppressTabBar(false)
})

onUnload(() => {
  session.setSuppressTabBar(false)
})

function setGender(next: AddressGender) {
  gender.value = next
}

function setTag(next: AddressTag) {
  tag.value = next
}

function onRegionChange(e: { detail: { value: string[] } }) {
  const next = e.detail.value ?? []
  regionValue.value = next
  region.value = next.filter(Boolean).join(' ')
}

function saveAndUse() {
  const nextName = name.value.trim()
  const nextPhone = phone.value.trim()
  const nextRegion = region.value.trim()
  const nextDoor = door.value.trim()
  if (!nextName) {
    uni.showToast({ title: '请填写收货人', icon: 'none' })
    return
  }
  if (!/^1\d{10}$/.test(nextPhone)) {
    uni.showToast({ title: '请填写正确手机号', icon: 'none' })
    return
  }
  if (!nextRegion) {
    uni.showToast({ title: '请选择所在地址', icon: 'none' })
    return
  }
  if (!nextDoor) {
    uni.showToast({ title: '请填写门牌号', icon: 'none' })
    return
  }
  const next: DeliveryAddress = {
    name: nextName,
    gender: gender.value,
    phone: nextPhone,
    region: nextRegion,
    door: nextDoor,
    tag: tag.value,
    latitude: latitude.value,
    longitude: longitude.value,
  }
  session.saveDeliveryAddress(next)
  session.setFulfillmentMode('delivery')
  uni.redirectTo({
    url: '/pages/stores/index?mode=delivery',
    fail() {
      uni.navigateTo({ url: '/pages/stores/index?mode=delivery', fail() {} })
    },
  })
}
</script>

<template>
  <SoorakChrome title="新增地址" show-back>
    <view class="page-address page-pad">
      <view class="addr-card">
        <view class="addr-row">
          <text class="addr-row__label">收货人</text>
          <view class="addr-row__main">
            <view class="addr-row__line">
              <input
                v-model="name"
                class="addr-input"
                type="text"
                placeholder="姓名"
                placeholder-class="addr-ph"
              />
            </view>
            <view class="addr-gender">
              <view
                class="addr-gender__item"
                :class="{ 'is-on': gender === '先生' }"
                @click="setGender('先生')"
              >
                先生
              </view>
              <view
                class="addr-gender__item"
                :class="{ 'is-on': gender === '女士' }"
                @click="setGender('女士')"
              >
                女士
              </view>
            </view>
          </view>
        </view>

        <view class="addr-row">
          <text class="addr-row__label">手机号</text>
          <input
            v-model="phone"
            class="addr-input"
            type="number"
            maxlength="11"
            placeholder="手机号码"
            placeholder-class="addr-ph"
          />
        </view>

        <view class="addr-row">
          <text class="addr-row__label">地址</text>
          <picker mode="region" class="addr-region-picker" :value="regionValue" @change="onRegionChange">
            <view class="addr-region">
              <text :class="region ? 'addr-region__text' : 'addr-region__ph'">
                {{ region || '请选择所在地址' }}
              </text>
            </view>
          </picker>
        </view>

        <view class="addr-row">
          <text class="addr-row__label">门牌号</text>
          <input
            v-model="door"
            class="addr-input"
            type="text"
            placeholder="例：5号楼203室"
            placeholder-class="addr-ph"
          />
        </view>

        <view class="addr-row addr-row--tags">
          <text class="addr-row__label">标签</text>
          <view class="addr-tags">
            <view
              v-for="item in TAGS"
              :key="item"
              class="addr-tag"
              :class="{ 'is-on': tag === item }"
              @click="setTag(item)"
            >
              {{ item }}
            </view>
          </view>
        </view>
      </view>

      <view class="addr-cta">
        <SoorakButton block @click="saveAndUse">保存并使用</SoorakButton>
      </view>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.page-address {
  padding-bottom: 48rpx;
}

.addr-card {
  background: $mp-cloud;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.addr-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 28rpx 28rpx;
  border-bottom: 1rpx solid $mp-border;
}

.addr-row:last-child {
  border-bottom: none;
}

.addr-row--tags {
  align-items: center;
}

.addr-row__label {
  width: 120rpx;
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 500;
  color: $mp-text;
  padding-top: 6rpx;
}

.addr-row__main {
  flex: 1;
  min-width: 0;
}

.addr-row__line {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.addr-input {
  flex: 1;
  min-width: 0;
  height: 48rpx;
  font-size: 28rpx;
  color: $mp-text;
}

.addr-region-picker {
  flex: 1;
  min-width: 0;
}

.addr-region {
  display: flex;
  align-items: center;
  min-height: 48rpx;
}

.addr-region__text {
  font-size: 28rpx;
  color: $mp-text;
  line-height: 1.4;
}

.addr-region__ph {
  font-size: 28rpx;
  color: $mp-text-3;
  line-height: 1.4;
}

.addr-ph {
  color: $mp-text-3;
}

.addr-gender {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.addr-gender__item {
  min-width: 120rpx;
  min-height: 56rpx;
  padding: 0 20rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: $mp-text-2;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.addr-gender__item.is-on {
  color: $mp-paper;
  background: $mp-moss;
  box-shadow: none;
}

.addr-tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.addr-tag {
  min-height: 56rpx;
  padding: 0 24rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: $mp-text-2;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.addr-tag.is-on {
  color: $mp-paper;
  background: $mp-moss;
  box-shadow: none;
}

.addr-cta {
  margin-top: 48rpx;
}
</style>
