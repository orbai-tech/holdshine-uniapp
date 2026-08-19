<script setup lang="ts">
import { computed, ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import {
  addressResToDelivery,
  formatAddressLine,
  listAddresses,
  removeAddress,
  toAddressId,
} from '@/common/apis/addressApi'
import type { AddressRes } from '@/common/types/address'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'

const session = useSessionStore()

const list = ref<AddressRes[]>([])
const loading = ref(false)
const removingId = ref<string | null>(null)

const selectedId = computed(() => session.deliveryAddress?.address_id ?? null)

function formatLine(row: AddressRes): string {
  return formatAddressLine(row)
}

function formatMeta(row: AddressRes): string {
  return `${row.contact_name} ${row.mobile}`
}

async function loadList(retried = false) {
  if (loading.value) return
  loading.value = true
  try {
    const data = await listAddresses()
    list.value = data?.list ?? []
  } catch (error) {
    console.error('[元气善筑] 地址列表加载失败', error)
    const message = toErrorMessage(error, '加载失败')
    if (message === 'UNAUTHORIZED' && !retried) {
      loading.value = false
      const ok = await session.ensureLogin()
      if (!ok) return
      await loadList(true)
      return
    }
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

function onSelect(row: AddressRes) {
  if (!row) return
  const gender = session.deliveryAddress?.gender ?? '先生'
  session.saveDeliveryAddress(addressResToDelivery(row, gender))
  session.setFulfillmentMode('delivery')

  const pages = getCurrentPages()
  const prev = pages[pages.length - 2] as { route?: string } | undefined
  const route = prev?.route ?? ''
  // 点单/结算/选店改地址：回到上一页继续
  if (
    route === 'pages/menu/index' ||
    route === 'pages/checkout/index' ||
    route === 'pages/stores/index'
  ) {
    uni.navigateBack({ fail() {} })
    return
  }

  // 首页「外卖配送」等入口：选地址后进入按收货坐标直线距离排序的配送门店列表
  uni.redirectTo({
    url: '/pages/stores/index?mode=delivery',
    fail() {
      session.openStorePicker('delivery')
    },
  })
}

function onEdit(row: AddressRes) {
  session.openAddressEditor(row.address_id)
}

function onAdd() {
  session.openAddressEditor()
}

function confirmRemove(row: AddressRes): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '删除地址',
      content: '确定删除该收货地址？',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
}

async function onRemove(row: AddressRes) {
  if (removingId.value) return
  const confirmed = await confirmRemove(row)
  if (!confirmed) return

  removingId.value = row.address_id
  try {
    await removeAddress(toAddressId(row.address_id))
    if (selectedId.value === row.address_id) {
      session.clearDeliveryAddress()
    }
    uni.showToast({ title: '已删除', icon: 'none' })
    await loadList()
  } catch (error) {
    console.error('[元气善筑] 删除地址失败', error)
    const message = toErrorMessage(error, '删除失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    removingId.value = null
  }
}

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
  void (async () => {
    const ok = await session.ensureLogin()
    if (!ok) {
      uni.navigateBack({ fail() {} })
      return
    }
    await loadList()
  })()
})

onHide(() => {
  session.setSuppressTabBar(false)
})

onUnload(() => {
  session.setSuppressTabBar(false)
})
</script>

<template>
  <SoorakChrome title="收货地址" show-back>
    <view class="page-address page-pad">
      <view class="addr-head">
        <text class="t-section">地址簿</text>
        <text class="t-caption">点选使用 · 可编辑或删除</text>
      </view>

      <view v-if="loading" class="addr-empty">
        <text class="t-caption">加载中</text>
      </view>

      <view v-else-if="!list.length" class="addr-empty">
        <text class="t-caption">暂无收货地址</text>
      </view>

      <view v-else class="addr-list">
        <view
          v-for="row in list"
          :key="row.address_id"
          class="addr-item"
          :class="{ 'is-on': selectedId === row.address_id }"
          @click="onSelect(row)"
        >
          <view class="addr-item__body">
            <view class="addr-item__top">
              <text v-if="row.tag" class="addr-item__tag">{{ row.tag }}</text>
              <text v-if="row.is_default === 1" class="addr-item__badge">默认</text>
              <text v-if="selectedId === row.address_id" class="addr-item__badge addr-item__badge--on">
                使用中
              </text>
            </view>
            <text class="addr-item__line">{{ formatLine(row) }}</text>
            <text class="addr-item__meta">{{ formatMeta(row) }}</text>
          </view>
          <view class="addr-item__actions" @click.stop>
            <text class="addr-item__action" @click="onEdit(row)">编辑</text>
            <text
              class="addr-item__action addr-item__action--danger"
              :class="{ 'is-busy': removingId === row.address_id }"
              @click="onRemove(row)"
            >
              {{ removingId === row.address_id ? '删除中…' : '删除' }}
            </text>
          </view>
        </view>
      </view>

      <view class="addr-cta">
        <SoorakButton block @click="onAdd">新增地址</SoorakButton>
      </view>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.page-address {
  padding-bottom: 48rpx;
}

.addr-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 28rpx;
}

.addr-empty {
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.addr-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.addr-item {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 28rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.addr-item.is-on {
  box-shadow: inset 0 0 0 2rpx $mp-moss;
}

.addr-item__body {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}

.addr-item__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
}

.addr-item__tag {
  min-height: 40rpx;
  padding: 0 16rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: $mp-paper;
  background: $mp-moss;
}

.addr-item__badge {
  font-size: 22rpx;
  color: $mp-text-3;
}

.addr-item__badge--on {
  color: $mp-moss;
  font-weight: 500;
}

.addr-item__line {
  font-size: 28rpx;
  font-weight: 500;
  color: $mp-text;
  line-height: 1.4;
}

.addr-item__meta {
  font-size: 24rpx;
  color: $mp-text-2;
  line-height: 1.4;
}

.addr-item__actions {
  display: flex;
  justify-content: flex-end;
  gap: 32rpx;
  padding-top: 4rpx;
  border-top: 1rpx solid $mp-border;
}

.addr-item__action {
  font-size: 26rpx;
  color: $mp-text-2;
  padding: 8rpx 0;
}

.addr-item__action--danger {
  color: $mp-text-3;
}

.addr-item__action.is-busy {
  opacity: 0.5;
}

.addr-cta {
  margin-top: 48rpx;
}
</style>
