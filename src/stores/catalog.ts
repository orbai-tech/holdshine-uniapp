import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getStoreMenu, menuToCatalog } from '@/common/apis/catalogApi'
import {
  listMpStores,
  pickNearestStore,
  storeCanAcceptOrders,
  storeDistanceLabel,
  storeIdOf,
  storeIsVisible,
} from '@/common/apis/storeApi'
import type { BrandInfo, MenuCategory, Product, Ritual } from '@/common/types/catalog'
import type { StoreRes } from '@/common/types/store'
import { getUserLocation } from '@/utils/geo'

export const useCatalogStore = defineStore('catalog', () => {
  const brand = ref<BrandInfo | null>(null)
  const rituals = ref<Ritual[]>([])
  const products = ref<Product[]>([])
  const categories = ref<MenuCategory[]>([])
  const currentStore = ref<StoreRes | null>(null)
  const currentStoreId = ref<string | null>(null)
  const loading = ref(false)
  const errorText = ref('')
  let loadedStoreId: string | null = null
  let loadedAt = 0

  /** 菜单缓存有效期（毫秒）：窗口内回到菜单页直接复用，避免每次 onShow 都请求。 */
  const CACHE_TTL_MS = 5 * 60 * 1000

  function applyBrandStore(store: StoreRes, distance: string) {
    if (!brand.value) return
    brand.value = {
      ...brand.value,
      store: store.store_name,
      hours: store.business_hours || '',
      distance,
    }
  }

  /** 每次先拉取门店列表，确保 store_id 来自后端列表；当前门店仍在列表中则保留用户选择。 */
  async function ensureStore() {
    const here = await getUserLocation()
    const page = await listMpStores({
      page: 1,
      page_size: 100,
      latitude: here?.latitude,
      longitude: here?.longitude,
    })
    // 可见门店（排除已停用）；休息/暂停接单的门店保留在列表并可切换
    const stores = (page.list ?? []).filter((item) => storeIsVisible(item))
    if (!stores.length) {
      throw new Error('暂无门店')
    }
    const currentId = currentStoreId.value
    const kept = currentId != null ? stores.find((item) => storeIdOf(item) === currentId) : undefined
    if (kept) {
      currentStore.value = kept
      applyBrandStore(kept, storeDistanceLabel(kept, here))
      return
    }
    // 自动选店时优先选择「营业中」的最近门店；若无营业中门店则退回最近可见门店
    const orderable = stores.filter((item) => storeCanAcceptOrders(item))
    const candidates = orderable.length ? orderable : stores
    const picked = pickNearestStore(candidates, here)
    currentStore.value = picked
    currentStoreId.value = storeIdOf(picked)
    applyBrandStore(picked, storeDistanceLabel(picked, here))
  }

  async function ensureLoaded(force = false) {
    const stale = Date.now() - loadedAt > CACHE_TTL_MS
    if (!force && !stale && loadedStoreId && loadedStoreId === currentStoreId.value && products.value.length) {
      return
    }
    loading.value = true
    errorText.value = ''
    try {
      await ensureStore()
      const storeId = currentStoreId.value
      const store = currentStore.value
      if (storeId == null || !store) {
        throw new Error('未选择门店')
      }
      const here = await getUserLocation()
      const menu = await getStoreMenu(storeId)
      const payload = menuToCatalog(
        menu,
        store.store_name,
        store.business_hours || '',
        storeDistanceLabel(store, here),
      )
      brand.value = payload.brand
      rituals.value = payload.rituals
      products.value = payload.products
      categories.value = (menu.categories ?? []).map((item) => ({
        id: item.category_id,
        name: item.category_name,
      }))
      loadedStoreId = storeId
      loadedAt = Date.now()
    } catch (error) {
      errorText.value = error instanceof Error ? error.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  /** 用户在选店页确认后切换当前门店，并强制重拉菜单。 */
  async function selectStore(store: StoreRes) {
    const nextId = storeIdOf(store)
    const here = await getUserLocation()
    const distance = storeDistanceLabel(store, here)
    currentStore.value = store
    currentStoreId.value = nextId
    applyBrandStore(store, distance)
    if (loadedStoreId === nextId && products.value.length) return
    loadedStoreId = null
    await ensureLoaded()
  }

  function findProduct(id: string) {
    return products.value.find((item) => item.id === id) ?? null
  }

  /** 当前门店是否可下单（休息/暂停接单时为 false，用于各下单入口置灰禁用） */
  const canOrder = computed(() => storeCanAcceptOrders(currentStore.value))

  return {
    brand,
    rituals,
    products,
    categories,
    currentStore,
    currentStoreId,
    loading,
    errorText,
    canOrder,
    ensureStore,
    ensureLoaded,
    selectStore,
    findProduct,
  }
})
