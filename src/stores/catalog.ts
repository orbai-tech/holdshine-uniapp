import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getStoreMenu, menuToCatalog } from '@/common/apis/catalogApi'
import { listMpStores, pickNearestStore, storeDistanceLabel, storeIdOf } from '@/common/apis/storeApi'
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
    const stores = (page.list ?? []).filter((item) => item.status === 1)
    if (!stores.length) {
      throw new Error('暂无营业门店')
    }
    const currentId = currentStoreId.value
    const kept = currentId != null ? stores.find((item) => storeIdOf(item) === currentId) : undefined
    if (kept) {
      currentStore.value = kept
      applyBrandStore(kept, storeDistanceLabel(kept, here))
      return
    }
    const picked = pickNearestStore(stores, here)
    currentStore.value = picked
    currentStoreId.value = storeIdOf(picked)
    applyBrandStore(picked, storeDistanceLabel(picked, here))
  }

  async function ensureLoaded() {
    if (loadedStoreId && loadedStoreId === currentStoreId.value && products.value.length) return
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

  return {
    brand,
    rituals,
    products,
    categories,
    currentStore,
    currentStoreId,
    loading,
    errorText,
    ensureStore,
    ensureLoaded,
    selectStore,
    findProduct,
  }
})
