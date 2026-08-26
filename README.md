# 元气善筑 · UniApp

将旧仓 React SPA 按行为等价迁移到 UniApp Vue 3 + TypeScript + Pinia 的跨端咖啡/饮品点单应用，可同时构建 H5 与微信小程序。

## 功能特性

- **首页**：品牌 hero、门店条与门店切换、「此刻需要」四宫格、招牌精选横滑、微信三按钮
- **点单**：仪式 chips 筛选、规格选择（杯型 +¥3、加料每项 +¥3）、零售无规格、加购不合并
- **购物袋**：底部浮层查看规格明细、确认下单后清空并进入订单
- **订单**：空态引导、下单后展示 mode/单号/制作中状态/明细/合计
- **会员**：成长值进度条、三档权益文案、会员价去点单
- **我的**：登录态展示、演示登录/退出、优惠券/积分/门店/地址等入口
- **其他**：优惠券、积分、门店列表、地址管理、结算、法律条款（服务协议/隐私政策）
- **鉴权链路**：微信 `uni.login` 拿 code → 后端换 token → 请求自动带 Bearer；H5 走开发会话

## 技术栈

- UniApp Vue 3（`@dcloudio/*` 3.0.0-4080420251103001）
- TypeScript 严格模式
- Vite 5 / Pinia 2
- `uni.request` 跨端请求封装（含 Token 注入、响应解包、错误提示拦截器）
- SCSS 与 `rpx`，品牌 tokens 落在 `uni.scss`（苔绿 `#33473d` / 纸色 `#f7f4ee`）

## 环境要求

最低要求 Node.js `>= 24.18.0`。

## 快速开始

```bash
npm install
cp .env.example .env.development
npm run dev:h5
```

微信小程序：

```bash
npm run dev:mp-weixin
```

用微信开发者工具导入 `dist/dev/mp-weixin`。`src/manifest.json` 已填写小程序 AppID。

### 后端联调

- **H5 开发**：默认即可。`.env.development` 中 `VITE_API_BASE_URL=/api`，由 Vite 代理到 `vite.config.ts` 中配置的真实后端（`http://127.0.0.1:8000`），无跨域问题。
- **微信小程序**：`wx.request` 只接受完整地址，需把 `.env.development` 的 `VITE_API_BASE_URL` 临时改为 `http://127.0.0.1:8000`，并在开发者工具勾选「不校验合法域名」；真机联调请改用电脑局域网 IP。

> 后端地址变更时如何调整，见下方「切换后端地址」一节。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev:h5` | 启动 H5 开发服务 |
| `npm run dev:mp-weixin` | 微信小程序开发构建（产物在 `dist/dev/mp-weixin`） |
| `npm run build:h5` | 生产构建 H5（产物在 `dist/build/h5`） |
| `npm run preview:h5` | 本地预览 H5 生产产物 |
| `npm run build:mp-weixin` | 生产构建微信小程序（产物在 `dist/build/mp-weixin`） |
| `npm run type-check` | 类型检查（vue-tsc） |

## 项目结构

```text
├── docs/                     # 中文开发文档
├── scripts/                  # 辅助脚本
└── src/
    ├── common/
    │   ├── apis/             # 按领域拆分接口（auth/catalog/cart/order/...）
    │   ├── types/            # 跨模块类型定义
    │   ├── mock/             # 前端内置静态文案/占位数据（catalog 内容映射等）
    │   └── legal/            # 法律条款数据
    ├── components/           # 跨页面通用组件（soorak-*）
    ├── pages/                # 页面包（home/menu/orders/mine/coupons/...）
    ├── plugin/               # pinia 实例、uni.request 封装
    ├── stores/               # Pinia 状态（session/cart/catalog）
    ├── styles/               # 全局样式
    ├── utils/                # 跨端工具（登录/计价/金额/地理/...）
    ├── static/               # 静态资源（产品图、Tab 图标）
    ├── App.vue / main.ts     # 应用入口
    ├── manifest.json         # 平台与发行配置
    ├── pages.json            # 页面、导航栏与 TabBar
    └── uni.scss              # 品牌设计变量
```

依赖方向：`pages → components/stores/common → plugin/request`，API 层不引用页面，公共组件不引用具体页面。

## 环境变量

复制 `.env.example` 为 `.env.development`（开发）或 `.env.production`（生产）后按需修改。所有 `VITE_` 变量都会进入前端产物，严禁存放服务端秘密。

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_APP_TITLE` | 应用展示名称 | `元气善筑` |
| `VITE_API_BASE_URL` | 后端接口基础地址。接口路径本身已带 `/api` 前缀，这里不要再拼 `/api`（H5 开发可走 `/api` 代理） | `/api` |
| `VITE_API_TIMEOUT` | 请求超时（毫秒） | `10000` |

### 切换后端地址

后端换 IP / 端口 / 域名时，按平台修改两处：

1. **H5（走代理）**：改 `vite.config.ts` 中 `server.proxy['/api'].target` 为新的后端地址，例如 `http://192.168.1.10:8000`。`.env.development` 保持 `VITE_API_BASE_URL=/api` 即可。
2. **微信小程序（直连）**：改 `.env.development` 的 `VITE_API_BASE_URL` 为新地址，例如 `http://192.168.1.10:8000`（勿带 `/api` 后缀），并同步把 `src/plugins/request/index.ts` 与 `src/common/apis/authApi.ts` 中小程序端兜底地址改为新地址。

改完环境文件后需重启 `npm run dev:h5` / `npm run dev:mp-weixin` 才会生效。生产环境 H5 建议由 Nginx 反代 `/api`，`.env.production` 保持相对路径。

## 文档

- [开发指南](docs/DEVELOPMENT.md)
- [目录与架构](docs/ARCHITECTURE.md)
- [组件](docs/COMPONENTS.md)
- [接口](docs/API.md)
- [跨端构建](docs/PLATFORM_BUILD.md)
- [迁移范围](docs/MIGRATION_SCOPE.md)
- [映射表](docs/MIGRATION_MAP.md)
- [偏差](docs/DEVIATION_LOG.md)
- [进度](docs/MIGRATION_PROGRESS.md)
