# 开发指南

## 环境准备

使用 Node.js 24 LTS。项目提供 `.nvmrc`，执行 `nvm install && nvm use` 即可切换。安装依赖后通过以下命令开发：

```bash
npm run dev:h5
npm run dev:mp-weixin
```

H5 适合快速调试布局和大部分交互，但登录、授权、支付、订阅消息等平台 API 必须在真实小程序环境中验证。

## 新增页面包

以“通知”页面为例：

1. 创建 `src/pages/notification/index.vue`。
2. 页面专属组件放入 `src/pages/notification/components/`。
3. 在 `src/pages.json` 的 `pages` 中注册 `pages/notification/index`。
4. 需要进入 TabBar 时添加到 `tabBar.list`，否则使用 `uni.navigateTo` 跳转。
5. 在 `src/common/apis/notificationApi.ts` 编写领域接口函数。
6. 只有跨页面共享的状态才进入 `src/stores/notification.ts`。
7. 覆盖加载、失败、空数据和正常数据四种状态。
8. 执行 H5 与目标小程序构建。

## 页面生命周期

- `onLoad`：获取路由参数，适合首次加载。
- `onShow`：每次页面出现时触发，适合刷新可能变化的数据。
- `onPullDownRefresh`：页面启用下拉刷新后处理刷新，并始终调用 `uni.stopPullDownRefresh()`。
- `onUnload`：释放定时器、监听器等资源。

Vue 的 `onMounted` 适合组件生命周期，页面级导航生命周期优先使用 `@dcloudio/uni-app` 提供的 API。

## 编码规范

- 使用 `<script setup lang="ts">` 和 Composition API。
- Props、Emits、接口响应和页面参数必须声明类型。
- 页面入口统一为 `pages/<package>/index.vue`，package 使用小写 kebab-case。
- 页面负责流程编排，通用组件负责展示与交互。
- 使用 `uni.*` 跨端 API，不直接使用 `window`、`document` 或浏览器 `localStorage`。
- 页面布局使用 `rpx`，状态栏和底部区域考虑安全区。
- 平台差异较小时使用条件编译，差异较大时拆分平台组件。

## 条件编译示例

```ts
// #ifdef MP-WEIXIN
console.info('仅微信小程序编译')
// #endif

// #ifdef H5
console.info('仅 H5 编译')
// #endif
```

不要让大量条件编译散落在页面中；复杂的平台能力应封装到 `utils` 或组合式函数中。

## 完成定义

代码应通过类型检查和目标平台构建；页面覆盖加载、错误与空状态；不包含真实密钥和调试域名；在 H5 和真机/模拟器上检查安全区、滚动、键盘遮挡及返回行为；新增公共能力已补充中文注释或文档。
