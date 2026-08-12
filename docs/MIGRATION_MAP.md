# 迁移映射

状态：`未开始` | `进行中` | `可对照` | `完成` | `偏差`

| 旧路径 | 新路径 | 对照验收点 | 状态 |
|--------|--------|------------|------|
| `src/styles/tokens.css` | `src/uni.scss`、`src/styles/global.scss` | ink/moss/brass/paper/圆角/间距落到 SCSS；主色非 Orb 蓝 | 完成 |
| `src/styles/global.css` 字体与排版类 | `src/styles/global.scss`（`.t-*`） | t-label/t-hero/t-title/t-section/t-product/t-caption 信息层级 | 偏差 |
| `src/App.tsx` Shell + 假路由 | `src/pages.json` + 五 Tab 页 | 禁止 App.vue 假路由；五 Tab 可 switchTab | 完成 |
| `src/components/MpTabBar.tsx` | `pages.json` tabBar | 文案：首页/点单/订单/会员/我的；选中色 moss `#33473d` | 完成 |
| `src/components/MpNavBar.tsx` + `chrome.css` | `src/components/soorak-nav-bar/` | 左品牌名 / 返回；中标题；右「袋」+ 数量角标；点袋开购物车 | 完成 |
| `src/components/MpButton.tsx` + `ui.css` 按钮 | `src/components/soorak-button/` | primary/secondary/ghost、block、文案与热区 | 完成 |
| `src/components/MpSheet.tsx` + `ui.css` 浮层 | `src/components/soorak-sheet/` | 遮罩关闭、标题栏「关闭」、footer、自底向上 | 完成 |
| `src/components/ProductSheet.tsx` | `src/components/soorak-product-sheet/` | 打开方=首页精选/点单卡片；关闭重置规格；零售无杯型温度加料；计价规则 | 完成 |
| `src/components/CartSheet.tsx` | `src/components/soorak-cart-sheet/` | 空态文案+去点单；列表规格展示；确认下单→清车→订单 Tab | 完成 |
| `src/components/MpProductCard.tsx` | `src/pages/menu/components/product-card.vue` | 图+tag+英文+名+场景+价+「选规格」；点击开规格 | 完成 |
| `src/pages/HomePage.tsx` | `src/pages/home/index.vue` | hero 文案/去点单；门店条/切换；此刻需要四宫格；招牌精选横滑；微信三按钮 | 完成 |
| `src/pages/MenuPage.tsx` | `src/pages/menu/index.vue` | 门店+自取约8分钟；chips 全部+四仪式；筛选列表 | 完成 |
| `src/pages/OrdersPage.tsx` | `src/pages/orders/index.vue` | 空态；有单：mode/单号/状态/明细/时间/金额/制作中提示 | 完成 |
| `src/pages/MemberPage.tsx` | `src/pages/member/index.vue` | 资料/进度条公式/三统计/会员价去点单/三档权益文案 | 完成 |
| `src/pages/MinePage.tsx` | `src/pages/mine/index.vue` | 登录态头像文案；演示登录退出；六单元格跳转与角标文案 | 完成 |
| `src/state/MpContext.tsx` | `src/stores/session.ts`、`src/stores/cart.ts`、`src/stores/catalog.ts` | 拆分禁止超级 Context；规则等价 | 完成 |
| `src/data/content.ts` | `src/common/mock/catalog.ts` + `src/common/apis/*` | 页面不直读 mock；Mock 受 `VITE_ENABLE_MOCK` | 完成 |
| `src/components/chrome.css` / `ui.css` / `pages.css` | 各页与 chrome/sheet scoped SCSS | 间距、圆角、纸色/云色块面对齐 | 完成 |
| `public/images/products/*` | `src/static/images/products/*` | 资源映射；12 张真实 jpg 已对齐 | 完成 |
| `public/icons.svg` / `favicon.svg` | 不迁移 | 旧仓 Vite 壳资源，非业务 | 完成 |
| `index.html` 标题/主题色 | `manifest.json`、`.env.example` | 应用名「元气善筑」 | 完成 |
| 登录/支付（旧仓仅演示开关） | `src/stores/session.ts` + `authApi` + `mock/` | 微信 code 换 token；H5 可走 mock 会话 | 完成 |
