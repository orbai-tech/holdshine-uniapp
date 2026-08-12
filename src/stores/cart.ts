import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addCartItem, getCart } from '@/common/apis/cartApi'
import type { CartAddReq, CartItemRes, CartRes } from '@/common/types/cart'
import type { CartItem, OrderItem } from '@/common/types/commerce'
import { parseAmount } from '@/utils/money'
import { useCatalogStore } from './catalog'
import { useSessionStore } from './session'

export function lineAmount(item: CartItem): number {
  const extra = item.extras.length * 3
  const sizeUp = item.size === '大杯' ? 3 : 0
  return (item.product.price + extra + sizeUp) * item.qty
}

export const useCartStore = defineStore('cart', () => {
  const remote = ref<CartRes | null>(null)
  const items = ref<CartItem[]>([])
  const orders = ref<OrderItem[]>([])
  const writeBusy = ref(false)

  const remoteItems = computed(() => remote.value?.items ?? [])
  const cartCount = computed(() => {
    if (remote.value) return remote.value.item_count
    return items.value.reduce((sum, item) => sum + item.qty, 0)
  })
  const cartTotal = computed(() => {
    if (remote.value) return parseAmount(remote.value.payable_amount)
    return items.value.reduce((sum, item) => sum + lineAmount(item), 0)
  })

  function applyCart(next: CartRes) {
    remote.value = next
  }

  async function refreshCart() {
    const storeId = useCatalogStore().currentStoreId
    if (storeId == null) return
    applyCart(await getCart(storeId))
  }

  async function addToCart(item: CartItem, payload: CartAddReq) {
    if (writeBusy.value) return
    writeBusy.value = true
    const session = useSessionStore()
    try {
      applyCart(await addCartItem(payload))
      items.value = [...items.value, item]
      session.closeProduct()
      session.setCartOpen(true)
    } finally {
      writeBusy.value = false
    }
  }

  function itemLineAmount(row: CartItemRes): number {
    return parseAmount(row.line_amount)
  }

  function placeOrder() {
    if (writeBusy.value) return
    const sourceCount = remote.value ? remote.value.item_count : items.value.length
    if (!sourceCount) return
    writeBusy.value = true
    try {
      // TODO(DEV-010) TODO(DEV-011) 下单/支付悬置，保留本地造单以便演示
      const session = useSessionStore()
      const order: OrderItem = {
        id: `SR${Date.now().toString().slice(-8)}`,
        items: items.value,
        total: cartTotal.value,
        status: '制作中',
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        mode: '外带',
      }
      orders.value = [order, ...orders.value]
      items.value = []
      remote.value = null
      session.goTab('/pages/orders/index')
    } finally {
      writeBusy.value = false
    }
  }

  return {
    items,
    remoteItems,
    remote,
    orders,
    writeBusy,
    cartCount,
    cartTotal,
    addToCart,
    refreshCart,
    itemLineAmount,
    placeOrder,
  }
})
