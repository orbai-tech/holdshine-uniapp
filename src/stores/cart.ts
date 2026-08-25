import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  addCartItem,
  clearCart,
  getCart,
  getCartOverview,
  removeCartItem,
  updateCartItem,
} from '@/common/apis/cartApi'
import { createOrder } from '@/common/apis/orderApi'
import { prepay } from '@/common/apis/paymentApi'
import type { CartAddReq, CartItemRes, CartOverviewRes, CartRes } from '@/common/types/cart'
import type { CartItem } from '@/common/types/commerce'
import { SERVICE_MODE, toServiceMode, toTableId } from '@/common/types/orderEnums'
import {
  isRetriableNetworkError,
  orderCheckoutIntent,
} from '@/utils/clientToken'
import { parseAddressId } from '@/utils/deliveryCheckout'
import { parseAmount } from '@/utils/money'
import { amountsDiffer, calcLocalCartLineAmount } from '@/utils/pricing'
import { settlePayment } from '@/utils/pay'
import { useCatalogStore } from './catalog'
import { useSessionStore } from './session'

export function lineAmount(item: CartItem): number {
  return calcLocalCartLineAmount(item)
}

export const useCartStore = defineStore('cart', () => {
  const remote = ref<CartRes | null>(null)
  const overview = ref<CartOverviewRes | null>(null)
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
  // 真实后端 overview 为分组数组（堂食/外卖/商城，各自按门店一条，CartRes.item_count）。
  // 咖啡角标取「当前门店 + 对应服务模式」的 item_count；商城角标取全部门店之和。
  const catalogStore = useCatalogStore()
  const currentStoreId = computed(() => catalogStore.currentStoreId)

  function groupItemCount(group: CartRes[]): number {
    const storeId = currentStoreId.value
    if (storeId == null) return 0
    const cart = group.find((row) => row.store_id === storeId)
    return cart?.item_count ?? 0
  }

  const coffeeCount = computed(
    () => groupItemCount(overview.value?.dine_in ?? []) + groupItemCount(overview.value?.takeaway ?? []),
  )
  const dineInCount = computed(() => groupItemCount(overview.value?.dine_in ?? []))
  const takeawayCount = computed(() => groupItemCount(overview.value?.takeaway ?? []))
  const mallCount = computed(() =>
    (overview.value?.mall ?? []).reduce((sum, row) => sum + row.item_count, 0),
  )

  function applyCart(next: CartRes) {
    remote.value = next
  }

  async function refreshOverview() {
    const session = useSessionStore()
    if (!session.loggedIn) {
      overview.value = null
      return
    }
    try {
      overview.value = await getCartOverview()
    } catch {
      overview.value = null
    }
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
      const serviceMode = toServiceMode(session)
      applyCart(await getCart(storeId, serviceMode ?? undefined))
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
      void refreshOverview()
      session.closeProduct()
      // 加入购物袋不强制开袋，故 openCart=false 时跳过
      if (openCart) session.setCartOpen(true)
    } finally {
      writeBusy.value = false
      void drainPendingQty()
    }
  }

  function itemLineAmount(row: CartItemRes): number {
    return parseAmount(row.line_amount)
  }

  /** item_id 是 18 位雪花大整数（string），Map key 保持 string 与后端一致 */
  const pendingQtyDelta = new Map<string, number>()
  let qtyDrainRunning = false

  function enqueueQtyDelta(itemId: string, delta: number) {
    if (!Number.isFinite(delta) || delta === 0) return
    const prev = pendingQtyDelta.get(itemId) ?? 0
    pendingQtyDelta.set(itemId, prev + delta)
  }

  async function flushPendingQty(itemId: string) {
    if (writeBusy.value || !remote.value) return
    const delta = pendingQtyDelta.get(itemId)
    if (delta == null || delta === 0) {
      pendingQtyDelta.delete(itemId)
      return
    }
    const current = remote.value.items?.find((item) => item.item_id === itemId)
    if (!current) {
      pendingQtyDelta.delete(itemId)
      return
    }
    pendingQtyDelta.delete(itemId)
    const nextQty = current.quantity + delta
    writeBusy.value = true
    try {
      if (nextQty < 1) {
        applyCart(await removeCartItem(itemId))
      } else {
        applyCart(await updateCartItem(itemId, { quantity: nextQty }))
      }
      void refreshOverview()
    } finally {
      writeBusy.value = false
    }
  }

  async function drainPendingQty() {
    if (qtyDrainRunning) return
    qtyDrainRunning = true
    try {
      while (!writeBusy.value && remote.value) {
        const nextId = pendingQtyDelta.keys().next().value
        if (nextId == null) break
        await flushPendingQty(nextId)
      }
    } finally {
      qtyDrainRunning = false
    }
  }

  async function changeRemoteQty(itemId: string, delta: number) {
    if (!remote.value) return
    enqueueQtyDelta(itemId, delta)
    await drainPendingQty()
  }

  function changeLocalQty(index: number, delta: number) {
    const current = items.value[index]
    if (!current) return
    const nextQty = current.qty + delta
    if (nextQty < 1) {
      items.value = items.value.filter((_, i) => i !== index)
      return
    }
    const next = [...items.value]
    next[index] = { ...current, qty: nextQty }
    items.value = next
  }

  async function clearRemoteCart() {
    if (writeBusy.value || !remote.value) return
    const storeId = useCatalogStore().currentStoreId
    if (storeId == null) return
    const session = useSessionStore()
    const serviceMode = toServiceMode(session)
    writeBusy.value = true
    try {
      await clearCart({
        store_id: storeId,
        ...(serviceMode != null ? { service_mode: serviceMode } : {}),
      })
      remote.value = null
      items.value = []
      await Promise.all([refreshCart(), refreshOverview()])
    } finally {
      writeBusy.value = false
      void drainPendingQty()
    }
  }

  /** createOrder → prepay → settlePayment；支付取消则保留待支付单并进订单 Tab */
  async function submitCheckout(
    opts: {
      remark?: string
      customer_coupon_id?: string | null
      /** 前端展示应付，仅用于与响应 payable_amount 比对 toast */
      expected_payable?: number | null
    } = {},
  ) {
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

    let addressId: string | null = null
    if (serviceMode === SERVICE_MODE.DELIVERY) {
      addressId = parseAddressId(session.deliveryAddress?.address_id)
      if (addressId == null) throw new Error('请先保存收货地址')
    }

    writeBusy.value = true
    try {
      const expectedPayable =
        opts.expected_payable == null ? null : Number(opts.expected_payable)
      const couponRaw = opts.customer_coupon_id
      // 优惠券 ID 是 18 位雪花大整数（string），只做非空校验，禁止 Number()
      const couponId = couponRaw == null || couponRaw === '' ? null : couponRaw
      if (couponId != null && !/^\d+$/.test(couponId)) {
        throw new Error('优惠券编号无效')
      }
      const tableId = serviceMode === SERVICE_MODE.DINE_IN ? toTableId(session) : null
      const deliveryAddressId = serviceMode === SERVICE_MODE.DELIVERY ? addressId : null
      const fingerprint = [
        storeId,
        serviceMode,
        deliveryAddressId ?? '',
        couponId ?? '',
        tableId ?? '',
      ].join('|')
      const clientToken = orderCheckoutIntent.acquire(fingerprint)

      let order
      try {
        order = await createOrder({
          store_id: storeId,
          client_token: clientToken,
          service_mode: serviceMode,
          from_cart: true,
          table_id: tableId,
          address_id: deliveryAddressId,
          customer_remark: opts.remark?.trim() ? opts.remark.trim() : null,
          customer_coupon_id: couponId,
        })
      } catch (error) {
        if (!isRetriableNetworkError(error)) {
          orderCheckoutIntent.clear()
        }
        throw error
      }
      // 已拿到订单：清空意图；支付取消后续走订单列表续付
      orderCheckoutIntent.clear()

      const serverPayable = parseAmount(order.payable_amount)
      if (expectedPayable != null && amountsDiffer(expectedPayable, serverPayable)) {
        uni.showToast({ title: '价格已更新', icon: 'none' })
      }

      // 下单成功即清空本地车（服务端已清）；支付失败仍保留待支付订单
      items.value = []
      await refreshCart()
      session.setCartOpen(false)

      let paid = false
      try {
        const payParams = await prepay(order.order_id, clientToken)
        await settlePayment(order.order_id, payParams, clientToken)
        paid = true
      } catch (error) {
        const cancelled =
          error instanceof Error &&
          (error.name === 'PayCancelledError' || error.message === 'PAY_CANCELLED')
        if (!cancelled) throw error
      }

      session.goTab('/pages/orders/index')
      if (!paid) {
        uni.showToast({ title: '订单待支付', icon: 'none' })
      }
    } finally {
      writeBusy.value = false
      void drainPendingQty()
    }
  }

  /** 待支付单继续支付 */
  async function payOrder(orderId: string | number) {
    if (writeBusy.value) return
    writeBusy.value = true
    try {
      const payParams = await prepay(orderId)
      await settlePayment(orderId, payParams)
    } finally {
      writeBusy.value = false
      void drainPendingQty()
    }
  }

  return {
    items,
    remoteItems,
    remote,
    overview,
    writeBusy,
    cartCount,
    cartTotal,
    coffeeCount,
    dineInCount,
    takeawayCount,
    mallCount,
    addToCart,
    refreshCart,
    refreshOverview,
    itemLineAmount,
    changeRemoteQty,
    changeLocalQty,
    clearRemoteCart,
    submitCheckout,
    payOrder,
  }
})
