# 素乐 SOORAK · UniApp

将 `soorak-mp`（React SPA）按行为等价迁移到 UniApp Vue 3 + TypeScript + Pinia。

## 技术栈

- UniApp Vue 3
- TypeScript 严格模式
- Vite / Pinia
- `uni.request` 跨端请求封装
- SCSS 与 `rpx`

## 快速开始

最低要求 Node.js `>= 24.18.0`。

```bash
npm install
cp .env.example .env.development
npm run dev:h5
```

微信小程序：

```bash
npm run dev:mp-weixin
```

导入 `dist/dev/mp-weixin`。`src/manifest.json` 已填写小程序 AppID。

本地鉴权联调需先启动假后端：

```bash
npm run mock
```

微信开发者工具勾选「不校验合法域名」，`.env.development` 中 `VITE_API_BASE_URL` 指向 `http://127.0.0.1:3780`。

## 文档

- [开发指南](docs/DEVELOPMENT.md)
- [目录与架构](docs/ARCHITECTURE.md)
- [组件](docs/COMPONENTS.md)
- [接口与 Mock](docs/API.md)
- [跨端构建](docs/PLATFORM_BUILD.md)
- [迁移范围](docs/MIGRATION_SCOPE.md)
- [映射表](docs/MIGRATION_MAP.md)
- [偏差](docs/DEVIATION_LOG.md)
- [进度](docs/MIGRATION_PROGRESS.md)
