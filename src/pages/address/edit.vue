<script setup lang="ts">
import { ref } from 'vue'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import {
  addressResToDelivery,
  createAddress,
  deliveryToUpsert,
  getAddress,
  parseAddressRegion,
  toAddressId,
  updateAddress,
} from '@/common/apis/addressApi'
import type { AddressGender, AddressTag, DeliveryAddress } from '@/common/types/fulfillment'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import { chooseMapLocation } from '@/utils/geo'

const TAGS: AddressTag[] = ['家', '公司', '学校', '其他']

const session = useSessionStore()

const routeId = ref<string | null>(null)
const addressId = ref<string | null>(null)
const name = ref('')
const gender = ref<AddressGender>('先生')
const phone = ref('')
const region = ref('')
const door = ref('')
const tag = ref<AddressTag>('家')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const saving = ref(false)
const loading = ref(false)
const picking = ref(false)
/** chooseLocation 返回会触发 onShow，避免把刚选的点冲掉 */
const skipShowReload = ref(false)

function resetForm() {
  addressId.value = null
  name.value = ''
  gender.value = '先生'
  phone.value = ''
  region.value = ''
  door.value = ''
  tag.value = '家'
  latitude.value = null
  longitude.value = null
}

function applyForm(existing: DeliveryAddress) {
  addressId.value = existing.address_id ?? null
  name.value = existing.name
  gender.value = existing.gender
  phone.value = existing.phone
  region.value = existing.region
  door.value = existing.door
  tag.value = existing.tag
  latitude.value = existing.latitude
  longitude.value = existing.longitude
}

async function loadById(id: string) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await getAddress(toAddressId(id))
    const prevGender =
      session.deliveryAddress?.address_id === id
        ? session.deliveryAddress.gender
        : '先生'
    applyForm(addressResToDelivery(res, prevGender))
  } catch (error) {
    console.error('[元气善筑] 地址详情加载失败', error)
    const message = toErrorMessage(error, '加载失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  const raw = typeof options?.id === 'string' ? options.id.trim() : ''
  routeId.value = raw || null
})

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
  if (skipShowReload.value) {
    skipShowReload.value = false
    return
  }
  void (async () => {
    const ok = await session.ensureLogin()
    if (!ok) {
      uni.navigateBack({ fail() {} })
      return
    }
    if (!routeId.value) {
      resetForm()
      return
    }
    await loadById(routeId.value)
  })()
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

/** getLocation → chooseLocation；编辑时优先用已有坐标作地图中心。 */
async function onPickLocation() {
  if (picking.value) return
  const loggedIn = await session.ensureLogin()
  if (!loggedIn) return

  picking.value = true
  skipShowReload.value = true
  try {
    const center =
      latitude.value != null && longitude.value != null
        ? { latitude: latitude.value, longitude: longitude.value }
        : null
    const chosen = await chooseMapLocation(center)
    if (!chosen) return
    // 展示顺序：省市区 → POI；省市区从详细地址解析
    const raw = chosen.address || chosen.name
    const parsed = parseAddressRegion(raw)
    const poi = (chosen.name || '').trim()
    region.value = [parsed.province, parsed.city, parsed.district, poi]
      .filter(Boolean)
      .join(' ') || raw
    latitude.value = chosen.latitude
    longitude.value = chosen.longitude
    if (!parsed.district) {
      uni.showToast({ title: '未能识别区县，请重选位置', icon: 'none' })
    }
  } finally {
    picking.value = false
  }
}

async function saveAndUse() {
  if (saving.value) return
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
  if (!nextRegion || latitude.value == null || longitude.value == null) {
    uni.showToast({ title: '请选择所在地址', icon: 'none' })
    return
  }
  const parsed = parseAddressRegion(nextRegion)
  if (!parsed.province || !parsed.city || !parsed.district) {
    uni.showToast({ title: '请重新选择所在地址', icon: 'none' })
    return
  }
  if (!nextDoor) {
    uni.showToast({ title: '请填写门牌号', icon: 'none' })
    return
  }

  const loggedIn = await session.ensureLogin()
  if (!loggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  const draft = {
    name: nextName,
    phone: nextPhone,
    region: nextRegion,
    door: nextDoor,
    tag: tag.value,
    latitude: latitude.value,
    longitude: longitude.value,
  }
  const payload = deliveryToUpsert(draft, 1)

  saving.value = true
  try {
    let res
    if (addressId.value) {
      try {
        res = await updateAddress(toAddressId(addressId.value), payload)
      } catch (error) {
        const message = toErrorMessage(error, '保存失败')
        if (!message.includes('地址不存在')) throw error
        addressId.value = null
        res = await createAddress(payload)
      }
    } else {
      res = await createAddress(payload)
    }
    const next = addressResToDelivery(res, gender.value)
    session.saveDeliveryAddress(next)
    session.setFulfillmentMode('delivery')

    const pages = getCurrentPages()
    const prev = pages[pages.length - 2] as { route?: string } | undefined
    const before = pages[pages.length - 3] as { route?: string } | undefined
    const route = prev?.route ?? ''
    const beforeRoute = before?.route ?? ''

    if (
      route === 'pages/menu/index' ||
      route === 'pages/checkout/index' ||
      route === 'pages/stores/index'
    ) {
      uni.navigateBack({ fail() {} })
      return
    }

    if (route === 'pages/address/index') {
      if (
        beforeRoute === 'pages/menu/index' ||
        beforeRoute === 'pages/checkout/index' ||
        beforeRoute === 'pages/stores/index'
      ) {
        uni.navigateBack({ delta: 2, fail() {} })
        return
      }
      // 外卖入口：地址簿里保存并使用 → 进入按收货坐标排序的配送门店列表
      uni.redirectTo({
        url: '/pages/stores/index?mode=delivery',
        fail() {
          session.openStorePicker('delivery')
        },
      })
      return
    }

    uni.redirectTo({
      url: '/pages/stores/index?mode=delivery',
      fail() {
        session.openStorePicker('delivery')
      },
    })
  } catch (error) {
    console.error('[元气善筑] 保存地址失败', error)
    const message = toErrorMessage(error, '保存失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SoorakChrome :title="routeId ? '编辑地址' : '新增地址'" show-back>
    <view class="page-address page-pad">
      <view v-if="loading" class="addr-loading">
        <text class="t-caption">加载中</text>
      </view>

      <template v-else>
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

          <view class="addr-row" @click="onPickLocation">
            <text class="addr-row__label">地址</text>
            <view class="addr-region">
              <text :class="region ? 'addr-region__text' : 'addr-region__ph'">
                {{ picking ? '定位中…' : region || '请选择所在地址' }}
              </text>
            </view>
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
          <SoorakButton block @click="saveAndUse">{{ saving ? '保存中…' : '保存并使用' }}</SoorakButton>
        </view>
      </template>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.page-address {
  padding-bottom: 48rpx;
}

.addr-loading {
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
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

.addr-region {
  flex: 1;
  min-width: 0;
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
