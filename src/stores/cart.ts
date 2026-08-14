import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addCartItem, getCart, updateCartItem } from '@/common/apis/cartApi'
import { createOrder } from '@/common/apis/orderApi'
import { prepay } from '@/common/apis/paymentApi'
import type { CartAddReq, CartItemRes, CartRes } from '@/common/types/cart'
import type { CartItem } from '@/common/types/commerce'
import { SERVICE_MODE, toServiceMode, toTableId } from '@/common/types/orderEnums'
import { parseAmount } from '@/utils/money'
import { settlePayment } from '@/utils/pay'
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
    const session = useSessionStore()
    if (!session.loggedIn) {
      remote.value = null
      return
    }
    try {
      applyCart(await getCart(storeId))
    } catch {
      /* 未登录/会话失效：拦截器已清会话，不阻断开袋 */
    }
  }

  async function addToCart(item: CartItem, payload: CartAddReq, openCart = true) {
    if (writeBusy.value) return
    const session = useSessionStore()
    if (!(await session.ensureLogin())) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    writeBusy.value = true
    try {
      applyCart(await addCartItem(payload))
      items.value = [...items.value, item]
      session.closeProduct()
      // 加入购物袋不强制开袋，故 openCart=false 时跳过
      if (openCart) session.setCartOpen(true)
    } finally {
      writeBusy.value = false
    }
  }

  function itemLineAmount(row: CartItemRes): number {
    return parseAmount(row.line_amount)
  }

  async function changeRemoteQty(itemId: number, delta: number) {
    if (writeBusy.value || !remote.value) return
    const current = remote.value.items?.find((item) => item.item_id === itemId)
    if (!current) return
    const nextQty = current.quantity + delta
    if (nextQty < 1) return
    writeBusy.value = true
    try {
      applyCart(await updateCartItem(itemId, { quantity: nextQty }))
    } finally {
      writeBusy.value = false
    }
  }

  function changeLocalQty(index: number, delta: number) {
    const current = items.value[index]
    if (!current) return
    const nextQty = current.qty + delta
    if (nextQty < 1) return
    const next = [...items.value]
    next[index] = { ...current, qty: nextQty }
    items.value = next
  }

  /** createOrder → prepay → settlePayment → 刷新购物车 → 订单 Tab */
  async function submitCheckout(opts: { remark?: string; coupon_id?: number | null } = {}) {
    if (writeBusy.value) return
    const session = useSessionStore()
    if (!(await session.ensureLogin())) throw new Error('请先登录')
    const catalog = useCatalogStore()
    const storeId = catalog.currentStoreId
    if (storeId == null) throw new Error('请先选择门店')
    const serviceMode = toServiceMode(session)
    if (serviceMode == null) throw new Error('请选择取餐方式')
    const sourceCount = remote.value ? remote.value.item_count : items.value.length
    if (!sourceCount) throw new Error('购物袋是空的')

    writeBusy.value = true
    try {
      const order = await createOrder({
        store_id: storeId,
        service_mode: serviceMode,
        from_cart: true,
        table_id: serviceMode === SERVICE_MODE.DINE_IN ? toTableId(session.tableCode) : null,
        customer_remark: opts.remark?.trim() ? opts.remark.trim() : null,
        coupon_id: opts.coupon_id ?? null,
      })
      const payParams = await prepay(order.order_id)
      await settlePayment(order.order_id, payParams)
      items.value = []
      await refreshCart()
      session.setCartOpen(false)
      session.goTab('/pages/orders/index')
    } finally {
      writeBusy.value = false
    }
  }

  return {
    items,
    remoteItems,
    remote,
    writeBusy,
    cartCount,
    cartTotal,
    addToCart,
    refreshCart,
    itemLineAmount,
    changeRemoteQty,
    changeLocalQty,
    submitCheckout,
  }
})
