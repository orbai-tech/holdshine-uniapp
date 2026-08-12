# 目录与架构规范

```text
orbai_uniapp_template/
├── docs/                     # 中文开发文档
├── src/
│   ├── common/
│   │   ├── apis/             # 按领域拆分接口
│   │   └── types/            # 跨模块类型
│   ├── components/           # 跨页面通用组件
│   │   ├── soorak-chrome/
│   │   ├── soorak-nav-bar/
│   │   ├── soorak-sheet/
│   │   ├── soorak-button/
│   │   ├── soorak-product-sheet/
│   │   └── soorak-cart-sheet/
│   ├── pages/                # 页面包（kebab-case）
│   │   ├── home/index.vue
│   │   ├── menu/index.vue
│   │   ├── orders/index.vue
│   │   ├── member/index.vue
│   │   └── mine/index.vue
│   ├── plugin/
│   │   ├── pinia/            # Pinia 实例与注册函数
│   │   ├── request/          # uni.request 及独立请求/响应拦截器
│   │   └── index.ts          # 插件统一注册入口
│   ├── stores/               # Pinia 状态
│   ├── styles/               # 全局样式
│   ├── utils/                # 跨端工具
│   ├── App.vue               # 应用生命周期和全局样式
│   ├── main.ts               # 应用入口
│   ├── manifest.json         # 平台和发行配置
│   ├── pages.json            # 页面、导航栏和 TabBar
│   └── uni.scss              # UniApp 全局设计变量
└── vite.config.ts
```

## 依赖方向

推荐方向为 `pages → components/stores/common/apis → plugin/request/common/types/utils`。API 层不引用页面，公共组件不引用具体页面，Store 不操作视图。页面专属组件放在对应页面包内，只有稳定且跨页面复用的组件才提升到 `src/components`。

UniApp 不引入 Vue Router；页面和 TabBar 仍由 `pages.json` 注册。请求层使用适配跨端运行时的 `uni.request`，因此对应目录为 `plugin/request`，而不是照搬 Web 端 Axios。对业务仅暴露 `http.get/http.post`。

## 与 Web 模板的一致性

品牌视觉以 `soorak-mp` tokens 为准（见 `src/uni.scss`）：

- 主色（苔绿）：`#33473d`
- 纸色背景：`#f7f4ee`
- 主文字：`#14110f`
- 次要文字：`#6b635a`
- 黄铜点缀：`#9a7b4f`
- 卡片：云色 `#faf8f4`、浅边框、轻阴影
- 页面目录：使用语义化 package 与统一 `index.vue` 入口
- 分层：页面、公共组件、状态、API、类型互相解耦

UniApp 使用原生跨端组件，不引入浏览器专用组件代码。

## 状态放置原则

- 当前组件的弹窗、输入值：本地 `ref/reactive`。
- 父子组件通信：Props、Emits 或 `v-model`。
- 跨页面用户信息、偏好、全局任务：Pinia。
- 后端列表：默认由页面持有，需要跨页缓存时才放入 Store。
- 持久化：通过 `uni.setStorageSync`，敏感信息需结合实际安全方案评估。
