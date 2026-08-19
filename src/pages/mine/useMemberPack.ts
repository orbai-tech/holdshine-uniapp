import { computed, ref } from 'vue'
import {
  getMemberBenefits,
  getMemberLevels,
  listMemberSubscriptions,
  subscribeMember,
} from '@/common/apis/memberApi'
import { prepay } from '@/common/apis/paymentApi'
import { getPointsAccount } from '@/common/apis/pointsApi'
import type {
  MemberBenefitsRes,
  MemberLevelOfferRes,
  MemberSummaryRes,
  MyMemberSubscriptionRes,
} from '@/common/types/member'
import { MEMBER_PAY_STATUS } from '@/common/types/member'
import { useSessionStore } from '@/stores/session'
import {
  isRetriableNetworkError,
  memberSubscribeIntent,
} from '@/utils/clientToken'
import { toErrorMessage } from '@/utils/errorMessage'
import { memberActionLabel, isOfferedMemberLevel, toGoldMemberSummary } from '@/utils/memberLabel'
import { PayCancelledError, settlePayment } from '@/utils/pay'

export function canResumeSubscription(row: MyMemberSubscriptionRes) {
  if (row.pay_status !== MEMBER_PAY_STATUS.UNPAID) return false
  return Boolean(row.order_id)
}

export function useMemberPack() {
  const session = useSessionStore()
  const benefits = ref<MemberBenefitsRes | null>(null)
  const subscriptions = ref<MyMemberSubscriptionRes[]>([])
  const availablePoints = ref<number | null>(null)
  const subscribeBusy = ref(false)
  const subsSheetOpen = ref(false)

  const offerLevels = computed<MemberLevelOfferRes[]>(() => {
    const list = benefits.value?.levels?.list
    if (!Array.isArray(list)) return []
    return list.filter((level) => isOfferedMemberLevel(level))
  })

  const summary = computed<MemberSummaryRes | null>(() => {
    const current = benefits.value?.current ?? null
    const gold = offerLevels.value.find((level) => level.level_code === 'gold') ?? null
    return toGoldMemberSummary(current, gold)
  })

  const displayPoints = computed(() => {
    if (availablePoints.value != null) return availablePoints.value
    return summary.value?.available_points ?? 0
  })

  const remainingDaysText = computed(() => {
    if (!summary.value) return '—'
    if (!summary.value.is_active) return '未开通'
    const days = summary.value.remaining_days ?? 0
    return `${days} 天`
  })

  const benefitsDescription = computed(() => {
    const raw = benefits.value?.description || ''
    if (!raw) return ''
    return raw.replace(/铂金/g, '金卡')
  })

  function clearMemberState() {
    benefits.value = null
    subscriptions.value = []
    availablePoints.value = null
  }

  async function resolveBenefits(): Promise<MemberBenefitsRes> {
    const packed = await getMemberBenefits()
    const list = packed?.levels?.list
    if (Array.isArray(list) && list.length) return packed
    const fallback = await getMemberLevels().catch(() => null)
    return {
      ...packed,
      levels: { list: fallback?.list ?? [] },
    }
  }

  async function loadMember() {
    if (!session.loggedIn) {
      clearMemberState()
      return
    }
    const [memberBenefits, memberSubs, points] = await Promise.all([
      resolveBenefits(),
      listMemberSubscriptions().catch(() => null),
      getPointsAccount().catch(() => null),
    ])
    if (!memberBenefits?.current) {
      throw new Error('会员摘要不可用')
    }
    benefits.value = memberBenefits
    subscriptions.value = Array.isArray(memberSubs?.list) ? memberSubs.list : []
    availablePoints.value =
      points && typeof points.available_points === 'number' ? points.available_points : null
  }

  async function settleMemberOrder(orderId: string | number, actionLabel: string) {
    try {
      const payParams = await prepay(orderId)
      await settlePayment(orderId, payParams)
    } catch (error) {
      if (error instanceof PayCancelledError) {
        uni.showToast({ title: '订单待支付', icon: 'none' })
        await loadMember()
        return
      }
      throw error
    }
    uni.showToast({ title: `${actionLabel}成功`, icon: 'none' })
    await loadMember()
    await session.refreshMemberRates()
  }

  async function subscribeAndPay(level: MemberLevelOfferRes) {
    if (subscribeBusy.value) return
    if (!session.loggedIn) return
    if (!level.purchasable) {
      uni.showToast({ title: '该档位暂不可购', icon: 'none' })
      return
    }
    if (!isOfferedMemberLevel(level)) {
      uni.showToast({ title: '该档位暂不提供', icon: 'none' })
      return
    }
    const targetLevelId = Number(level.member_level_id)
    if (!Number.isInteger(targetLevelId) || targetLevelId <= 0) {
      uni.showToast({ title: '档位无效', icon: 'none' })
      return
    }

    const clientToken = memberSubscribeIntent.acquire(String(targetLevelId))
    subscribeBusy.value = true
    try {
      let result
      try {
        result = await subscribeMember({
          target_level_id: targetLevelId,
          client_token: clientToken,
        })
      } catch (error) {
        if (!isRetriableNetworkError(error)) {
          memberSubscribeIntent.clear()
        }
        throw error
      }
      // 已造待支付单：清空意图；取消支付后走 resumeSubscriptionPay
      memberSubscribeIntent.clear()
      await settleMemberOrder(result.order_id, memberActionLabel(result.action_type))
    } catch (error) {
      const message = toErrorMessage(error, '开通失败')
      if (message !== 'UNAUTHORIZED') {
        uni.showToast({ title: message.slice(0, 40), icon: 'none' })
      }
    } finally {
      subscribeBusy.value = false
    }
  }

  async function resumeSubscriptionPay(row: MyMemberSubscriptionRes) {
    if (subscribeBusy.value) return
    if (!canResumeSubscription(row) || !row.order_id) return
    subscribeBusy.value = true
    try {
      await settleMemberOrder(row.order_id, memberActionLabel(row.action_type))
    } catch (error) {
      const message = toErrorMessage(error, '支付失败')
      if (message !== 'UNAUTHORIZED') {
        uni.showToast({ title: message.slice(0, 40), icon: 'none' })
      }
    } finally {
      subscribeBusy.value = false
    }
  }

  function openSubsSheet() {
    subsSheetOpen.value = true
  }

  return {
    benefits,
    subscriptions,
    subscribeBusy,
    subsSheetOpen,
    summary,
    offerLevels,
    displayPoints,
    remainingDaysText,
    benefitsDescription,
    clearMemberState,
    loadMember,
    subscribeAndPay,
    resumeSubscriptionPay,
    openSubsSheet,
  }
}
