import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getStoreMenu, menuToCatalog } from '@/common/apis/catalogApi'
import { listAdminStores, pickNearestStore, storeDistanceLabel, storeIdOf } from '@/common/apis/storeApi'
import type { BrandInfo, MenuCategory, Product, Ritual } from '@/common/types/catalog'
import type { StoreRes } from '@/common/types/store'
import { getUserLocation } from '@/utils/geo'

export const useCatalogStore = defineStore('catalog', () => {
  const brand = ref<BrandInfo | null>(null)
  const rituals = ref<Ritual[]>([])
  const products = ref<Product[]>([])
  const categories = ref<MenuCategory[]>([])
  const currentStore = ref<StoreRes | null>(null)
  const currentStoreId = ref<number | null>(null)
  const loading = ref(false)
  const errorText = ref('')
  let loadedStoreId: number | null = null

  async function ensureStore() {
    if (currentStoreId.value && currentStore.value) return
    const page = await listAdminStores({ page: 1, page_size: 100 })
    const stores = page.list ?? []
    const here = await getUserLocation()
    const picked = pickNearestStore(stores, here)
    currentStore.value = picked
    currentStoreId.value = storeIdOf(picked)
    if (brand.value) {
      brand.value = {
        ...brand.value,
        store: picked.store_name,
        hours: picked.business_hours || '',
        distance: storeDistanceLabel(picked, here),
      }
    }
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
    findProduct,
  }
})
