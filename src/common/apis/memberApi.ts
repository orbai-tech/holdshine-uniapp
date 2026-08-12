import { memberTiers } from '@/common/mock/catalog'
import { fetchAuthProfile } from '@/common/apis/authApi'
import type { MemberPayload, MemberProfile } from '@/common/types/member'

function placeholderProfile(name: string, memberNo: string): MemberProfile {
  return {
    name: name || '素乐会员',
    tier: '—',
    memberNo: memberNo || '—',
    // TODO(FE-NEED-003)
    points: 0,
    growth: 0,
    nextTier: '—',
    nextNeed: 0,
    balance: 0,
  }
}

export async function getMemberBundle(): Promise<MemberPayload> {
  const user = await fetchAuthProfile()
  return {
    profile: placeholderProfile(user.nickname, user.memberNo),
    // TODO(FE-NEED-002)
    tiers: memberTiers,
  }
}

export async function getMemberProfile(): Promise<MemberProfile> {
  const user = await fetchAuthProfile()
  return placeholderProfile(user.nickname, user.memberNo)
}
