<script setup lang="ts">
import { computed, ref } from 'vue'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakStoreCard from '@/components/soorak-store-card/soorak-store-card.vue'
import SoorakStoreDetailSheet from '@/components/soorak-store-detail-sheet/soorak-store-detail-sheet.vue'
import {
  listMpStores,
  listStoresByAddress,
  storeDistanceLabel,
  storeIdOf,
} from '@/common/apis/storeApi'
import type { FulfillmentMode } from '@/common/types/fulfillment'
import type { StoreRes } from '@/common/types/store'
import { useCartStore } from '@/stores/cart'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { ensureLocationPermission, getUserLocation, type GeoPoint } from '@/utils/geo'
import { toErrorMessage } from '@/utils/errorMessage'

type ListTab = 'all' | 'recent'

const RECENT_KEY = 'soorak_recent_store_ids'
const ALL_CITY = '全部城市'

const session = useSessionStore()
const catalog = useCatalogStore()
const cart = useCartStore()

const pickerMode = ref<FulfillmentMode | null>(null)
const tab = ref<ListTab>('all')
const loading = ref(false)
const selecting = ref(false)
const errorText = ref('')
const keyword = ref('')
const searchOpen = ref(false)
const city = ref(ALL_CITY)
const here = ref<GeoPoint | null>(null)
const stores = ref<StoreRes[]>([])
const recentIds = ref<string[]>(readRecentIds())
const detailOpen = ref(false)
const detailStoreId = ref<number | null>(null)

const cities = computed(() => {
  const set = new Set<string>()
  for (const store of stores.value) {
    if (store.city) set.add(store.city)
  }
  return [ALL_CITY, ...Array.from(set)]
})

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  let list = stores.value
  if (city.value !== ALL_CITY) {
    list = list.filter((item) => item.city === city.value)
  }
  if (q) {
    list = list.filter((item) => {
      const hay = [item.store_name, item.address, item.district, item.city]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }
  if (tab.value === 'recent') {
    const order = new Map(recentIds.value.map((id, index) => [id, index]))
    return list
      .filter((item) => order.has(item.store_id))
      .sort((a, b) => (order.get(a.store_id) ?? 0) - (order.get(b.store_id) ?? 0))
  }
  return [...list].sort((a, b) => distanceSortKey(a) - distanceSortKey(b))
})

const currentId = computed(() => catalog.currentStore?.store_id ?? '')
const pageTitle = computed(() =>
  pickerMode.value === 'delivery' ? '选择配送门店' : '选择门店',
)

function readRecentIds(): string[] {
  try {
    const raw = uni.getStorageSync(RECENT_KEY)
    if (Array.isArray(raw)) return raw.filter((id): id is string => typeof id === 'string')
  } catch {
    /* ignore */
  }
  return []
}

function persistRecent(storeId: string) {
  const next = [storeId, ...recentIds.value.filter((id) => id !== storeId)].slice(0, 20)
  recentIds.value = next
  uni.setStorageSync(RECENT_KEY, next)
}

function distanceOf(store: StoreRes) {
  return storeDistanceLabel(store, here.value)
}

function distanceSortKey(store: StoreRes) {
  const label = distanceOf(store)
  if (label === '—') return Number.POSITIVE_INFINITY
  if (label.endsWith('m')) return Number(label.replace('m', '')) / 1000
  if (label.endsWith('km')) return Number(label.replace('km', ''))
  return Number.POSITIVE_INFINITY
}

function parseMode(raw: unknown): FulfillmentMode | null {
  if (raw === 'dine_in' || raw === 'delivery') return raw
  return null
}

onLoad((query) => {
  pickerMode.value = parseMode(query?.mode) ?? session.fulfillmentMode
  if (pickerMode.value) session.setFulfillmentMode(pickerMode.value)
})

async function loadStores() {
  loading.value = true
  errorText.value = ''
  try {
    if (pickerMode.value === 'delivery') {
      const addr = session.deliveryAddress
      if (!addr) {
        errorText.value = '请先填写收货地址'
        stores.value = []
        return
      }
      if (addr.latitude != null && addr.longitude != null) {
        here.value = { latitude: addr.latitude, longitude: addr.longitude }
        stores.value = await listStoresByAddress(here.value)
      } else {
        here.value = await getUserLocation()
        if (here.value) {
          stores.value = await listStoresByAddress(here.value)
        } else {
          const page = await listMpStores({ page: 1, page_size: 100 })
          stores.value = (page.list ?? []).filter((item) => item.status === 1)
        }
      }
    } else {
      here.value = await getUserLocation()
      if (!here.value) {
        uni.showToast({ title: '未开启定位，按默认排序', icon: 'none' })
      }
      const page = await listMpStores({
        page: 1,
        page_size: 100,
        latitude: here.value?.latitude,
        longitude: here.value?.longitude,
      })
      stores.value = (page.list ?? []).filter((item) => item.status === 1)
    }
    if (!stores.value.length && !errorText.value) {
      errorText.value = '暂无营业门店'
    }
  } catch (error) {
    errorText.value = toErrorMessage(error, '门店列表加载失败')
  } finally {
    loading.value = false
  }
}

function setTab(next: ListTab) {
  tab.value = next
}

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) keyword.value = ''
}

function onPickCity() {
  const options = cities.value
  uni.showActionSheet({
    itemList: options,
    success(res) {
      const next = options[res.tapIndex]
      if (next) city.value = next
    },
  })
}

async function onRelocate() {
  if (pickerMode.value === 'delivery') {
    uni.showToast({ title: '外卖按收货地址推荐', icon: 'none' })
    return
  }
  const allowed = await ensureLocationPermission()
  if (!allowed) {
    uni.showToast({ title: '没有权限', icon: 'none' })
    return
  }
  uni.showLoading({ title: '定位中', mask: true })
  try {
    here.value = await getUserLocation({ force: true })
    if (!here.value) {
      uni.showToast({ title: '定位失败', icon: 'none' })
      return
    }
    uni.showToast({ title: '已更新距离', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function onSelect(store: StoreRes) {
  if (selecting.value) return
  selecting.value = true
  try {
    const same = catalog.currentStoreId === storeIdOf(store)
    await catalog.selectStore(store)
    persistRecent(store.store_id)
    try {
      await cart.refreshCart()
    } catch {
      /* 切店后购物车拉取失败不阻断返回 */
    }
    uni.showToast({ title: same ? '已是当前门店' : '已切换门店', icon: 'none' })
    setTimeout(() => {
      if (!pickerMode.value) {
        uni.navigateBack({ fail() {} })
        return
      }
      const pages = getCurrentPages()
      const prev = pages[pages.length - 2] as { route?: string } | undefined
      if (prev?.route === 'pages/menu/index') {
        uni.navigateBack({ fail() {} })
        return
      }
      session.goMenu({ replace: true })
    }, 280)
  } catch (error) {
    uni.showToast({ title: toErrorMessage(error, '切换失败').slice(0, 40), icon: 'none' })
  } finally {
    selecting.value = false
  }
}

function openStoreDetail(store: StoreRes) {
  try {
    detailStoreId.value = storeIdOf(store)
    detailOpen.value = true
  } catch {
    uni.showToast({ title: '门店编号无效', icon: 'none' })
  }
}

function closeStoreDetail() {
  detailOpen.value = false
}

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
  void loadStores()
})

onHide(() => {
  session.setSuppressTabBar(false)
})

onUnload(() => {
  session.setSuppressTabBar(false)
})
</script>

<template>
  <SoorakChrome :title="pageTitle" show-back>
    <view class="page-stores">
      <view class="stores-tabs">
        <view class="stores-tab" :class="{ 'is-on': tab === 'all' }" @click="setTab('all')">
          选择门店
        </view>
        <view class="stores-tab" :class="{ 'is-on': tab === 'recent' }" @click="setTab('recent')">
          常用/收藏
        </view>
      </view>

      <view class="stores-toolbar">
        <view class="stores-city" @click="onPickCity">
          <text class="stores-city__name">{{ city === ALL_CITY ? '全部城市' : city }}</text>
          <text class="stores-city__arrow">▾</text>
        </view>
        <view class="stores-tools">
          <view class="stores-tool" :class="{ 'is-on': searchOpen }" @click="toggleSearch">⌕</view>
          <view class="stores-tool" @click="onRelocate">⌖</view>
        </view>
      </view>

      <view v-if="searchOpen" class="stores-search">
        <input
          v-model="keyword"
          class="stores-search__input"
          type="text"
          confirm-type="search"
          placeholder="搜索门店名称或地址"
          placeholder-class="stores-search__ph"
        />
      </view>

      <view v-if="loading" class="mp-empty">
        <text class="t-caption">加载中</text>
      </view>
      <view v-else-if="errorText" class="mp-empty">
        <text class="t-caption">{{ errorText }}</text>
        <SoorakButton v-if="pickerMode === 'delivery' && !session.deliveryAddress" @click="session.openAddressBook()">
          去填写地址
        </SoorakButton>
        <SoorakButton v-else @click="loadStores">重试</SoorakButton>
      </view>
      <view v-else-if="!filtered.length" class="mp-empty">
        <text class="t-caption">
          {{ tab === 'recent' ? '还没有常用门店，先去选择一家吧' : '没有匹配的门店' }}
        </text>
      </view>
      <view v-else class="stores-list page-pad">
        <SoorakStoreCard
          v-for="item in filtered"
          :key="item.store_id"
          :info="item"
          :distance="distanceOf(item)"
          :selected="item.store_id === currentId"
          @select="onSelect(item)"
          @detail="openStoreDetail(item)"
        />
      </view>
    </view>

    <SoorakStoreDetailSheet
      :open="detailOpen"
      :store-id="detailStoreId"
      @close="closeStoreDetail"
    />
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.page-stores {
  padding-bottom: 16rpx;
}

.stores-tabs {
  display: flex;
  align-items: stretch;
  padding: 0 32rpx;
  border-bottom: 1rpx solid $mp-border;
}

.stores-tab {
  position: relative;
  flex: 1;
  text-align: center;
  padding: 24rpx 0 20rpx;
  font-size: 28rpx;
  color: $mp-text-3;
}

.stores-tab.is-on {
  color: $mp-text;
  font-weight: 500;
}

.stores-tab.is-on::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 48rpx;
  height: 4rpx;
  margin-left: -24rpx;
  border-radius: 4rpx;
  background: $mp-moss;
}

.stores-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 20rpx 32rpx 8rpx;
}

.stores-city {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
}

.stores-city__name {
  font-size: 28rpx;
  font-weight: 500;
  color: $mp-text;
}

.stores-city__arrow {
  font-size: 20rpx;
  color: $mp-text-3;
}

.stores-tools {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.stores-tool {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: $mp-text-2;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.stores-tool.is-on {
  color: $mp-paper;
  background: $mp-moss;
  box-shadow: none;
}

.stores-search {
  padding: 8rpx 32rpx 16rpx;
}

.stores-search__input {
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: $mp-cloud;
  font-size: 26rpx;
  color: $mp-text;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.stores-search__ph {
  color: $mp-text-3;
}

.stores-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-top: 16rpx;
}
</style>
