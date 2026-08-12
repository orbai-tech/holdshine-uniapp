<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { getMemberProfile } from '@/common/apis/memberApi'
import { useSessionStore } from '@/stores/session'
import type { MemberProfile } from '@/common/types/member'
import { toErrorMessage } from '@/utils/errorMessage'

const session = useSessionStore()
const profile = ref<MemberProfile | null>(null)

const displayName = computed(() => session.user?.nickname || profile.value?.name || '素乐会员')
const avatarText = computed(() => session.user?.avatarInitial || displayName.value.slice(0, 1))
const caption = computed(() => {
  if (!session.loggedIn) return '登录后同步订单与卡券'
  if (session.lastLoginMock || session.user?.openid.startsWith('oSOORAK_mock_')) return '本地 mock 会话 · 开发联调'
  return '微信登录已同步'
})

onShow(() => {
  if (!session.loggedIn) {
    profile.value = null
    return
  }
  void getMemberProfile().then((data) => {
    profile.value = data
  })
})

async function onLogin() {
  try {
    await session.login()
    uni.showToast({ title: '登录成功', icon: 'none' })
  } catch (error) {
    console.error('[SOORAK] 登录失败', error)
    const message = toErrorMessage(error, '登录失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  }
}

async function onLogout() {
  await session.logout()
  uni.showToast({ title: '已退出登录', icon: 'none' })
}
</script>

<template>
  <SoorakChrome title="我的">
    <view class="page-mine page-pad">
      <view class="mine-head">
        <view class="mine-avatar">{{ session.loggedIn ? avatarText : '?' }}</view>
        <view>
          <template v-if="session.loggedIn">
            <text class="mine-name">{{ displayName }}</text>
            <text class="t-caption">{{ caption }}</text>
          </template>
          <template v-else>
            <text class="mine-name">未登录</text>
            <text class="t-caption">{{ caption }}</text>
          </template>
        </view>
      </view>

      <SoorakButton v-if="!session.loggedIn" block @click="onLogin">
        {{ session.authBusy ? '登录中…' : '微信一键登录' }}
      </SoorakButton>
      <SoorakButton v-else variant="secondary" block @click="onLogout">
        {{ session.authBusy ? '退出中…' : '退出登录' }}
      </SoorakButton>

      <view class="mine-cells">
        <view class="mine-cell" @click="session.goTab('/pages/orders/index')">
          <text>我的订单</text>
          <text class="mine-cell__em">›</text>
        </view>
        <view class="mine-cell" @click="session.goTab('/pages/member/index')">
          <text>会员中心</text>
          <text class="mine-cell__em">›</text>
        </view>
        <view class="mine-cell" @click="session.setCartOpen(true)">
          <text>购物袋</text>
          <text class="mine-cell__em">›</text>
        </view>
        <view class="mine-cell">
          <text>卡券中心</text>
          <text class="mine-cell__em">演示 ›</text>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <button class="mine-cell mine-cell--btn" open-type="contact">
          <text>联系客服</text>
          <text class="mine-cell__em">微信 ›</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="mine-cell">
          <text>联系客服</text>
          <text class="mine-cell__em">微信 ›</text>
        </view>
        <!-- #endif -->
        <view class="mine-cell">
          <text>关于素乐</text>
          <text class="mine-cell__em">V1.0 ›</text>
        </view>
      </view>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.mine-head {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-bottom: 32rpx;
}

.mine-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: $mp-ink;
  color: $mp-paper;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 44rpx;
  flex-shrink: 0;
}

.mine-name {
  display: block;
  margin-bottom: 8rpx;
  font-size: 36rpx;
  font-weight: 500;
}

.mine-cells {
  margin-top: 40rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
  overflow: hidden;
}

.mine-cell {
  width: 100%;
  min-height: 96rpx;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid $mp-border;
  font-size: 28rpx;
}

.mine-cell--btn {
  border-radius: 0;
  background: transparent;
  text-align: left;
  line-height: inherit;
}

.mine-cell:last-child {
  border-bottom: none;
}

.mine-cell__em {
  color: $mp-text-3;
  font-size: 24rpx;
}
</style>
