import { memberTiers } from '@/common/mock/catalog'
import { fetchAuthProfile } from '@/common/apis/authApi'
import type { MemberPayload, MemberProfile } from '@/common/types/member'

function placeholderProfile(name: string, memberNo: string): MemberProfile {
  return {
    name: name || '元气善筑会员',
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

export function getMemberProfile(): Promise<MemberProfile> {
  return fetchAuthProfile().then((user) => placeholderProfile(user.nickname, user.memberNo))
}

export function getMemberBundle(): Promise<MemberPayload> {
  return getMemberProfile().then((profile) => ({
    profile,
    // TODO(FE-NEED-002)
    tiers: memberTiers,
  }))
}
