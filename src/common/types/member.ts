export interface MemberTier {
  id: string
  name: string
  threshold: number
  perks: string[]
}

export interface MemberProfile {
  name: string
  tier: string
  memberNo: string
  points: number
  growth: number
  nextTier: string
  nextNeed: number
  balance: number
}

export interface MemberPayload {
  profile: MemberProfile
  tiers: MemberTier[]
}
