---
name: timing-measurement-retest
overview: 重测阶段 A（防抖合并）与阶段 C（超时幂等），并附带无需插桩的定位 4 秒缓存精细分步测量；全程临时改动、测完还原，按钮名严格采用项目真实文案。
todos:
  - id: stage-a-instrument
    content: 阶段A插桩：server.mjs 加 access log、checkout 防抖改 1500，输出含真实按钮名的分步与指标，等用户测完
    status: completed
  - id: stage-a-revert-stage-c-instrument
    content: 还原 A（防抖回 300），timeout 改 2000、mock 慢 5s+orders、路由入口打印 client_token，提示重启并输出阶段 C 分步
    status: completed
    dependencies:
      - stage-a-instrument
  - id: location-cache-walkthrough
    content: 输出定位 4 秒缓存的纯黑盒分步说明（真实按钮名），无需插桩，等用户操作反馈
    status: completed
    dependencies:
      - stage-a-revert-stage-c-instrument
  - id: final-restore-verify
    content: 全部还原：删 server.mjs 仪器与 mock/.env 两行、timeout 回 10000、确认防抖 300，核对 git diff 并跑 smoke-test
    status: completed
    dependencies:
      - stage-a-revert-stage-c-instrument
      - location-cache-walkthrough
---

## User Requirements

用户要求重新生成一份测试计划，覆盖三件事：

1. 阶段 A 重测：确认订单页配送询价（`POST /api/mp/customer/delivery/quote`）的 trailing 防抖合并。
2. 阶段 C 重测：客户端超时后重试的 `client_token` 幂等复用（订单创建）。
3. 定位 4 秒缓存测量：必须给出**细致的分步说明**，每一步明确指出需要点击的**具体按钮名称**，按钮名必须使用项目界面真实存在的文案，不得编造或近似；不确定的标注「待确认」。

执行节奏沿用用户门控：每个阶段先说明改哪些文件哪些地方 → 用户实测看指标 → 用户说「结束」后立即还原该阶段改动 → 切到下一阶段，直到全部测完、环境还原干净。

## Product Overview

在 uniapp_coffee（uni-app 小程序 + 本地 mock 后端）上，通过临时仪器化 mock 与一个前端常量，分轮验证防抖与超时幂等；定位缓存为无需插桩的黑盒观测。全程临时改动，最终工作区恢复原样，不提交 commit。

## Core Features

- 阶段 A：mock 加 access log + `CHECKOUT_DEBOUNCE_MS` 临时 300→1500，用「外卖配送」↔ 堂食卡（店内就餐/打包外带）来回切，验证 `delivery/quote` 请求被防抖合并
- 阶段 C：`VITE_API_TIMEOUT` 10000→2000 + mock 订单接口慢 5s + 路由入口立即打印 `client_token`，验证约 2s 超时 toast、同指纹两次提交 `client_token` 相同、改指纹后出现新 token
- 定位缓存（不插桩）：用真实按钮分步操作，明确「⌖ 重新定位」走 force 绕过缓存（对照组）、门店卡片选择走 4 秒缓存（实验组），观测第二次是否命中缓存
- 每阶段结束立即还原；全部结束后核对 git diff 与 gitignore 的 env 文件，并跑 `node mock/smoke-test.mjs` 验证环境干净

## Tech Stack Selection

沿用现有技术栈，不引入任何新依赖：

- mock 侧：Node.js 原生 http（`mock/server.mjs`）+ `mock/config.mjs` 内置 dotenv 加载（`loadDotEnv(path.join(root,'.env'))`，且仅在 key 不存在时写入 process.env）
- 前端侧：uni-app + Vue3 + Vite 环境变量（`.env.development` 的 `VITE_API_TIMEOUT`，由 `src/plugins/request/index.ts` 第 18 行只读消费）

## Implementation Approach

策略：**最小侵入的临时仪器化**。观测能力全部加在 mock 服务端与一个前端常量上；被测实现（`timing.ts` 防抖、`cart.ts` busy/幂等、`geo.ts` 定位缓存、`request/index.ts`）一律不动，保证测的是线上真实行为。定位缓存走纯黑盒，不改 `geo.ts`。

关键决策（行号均已核实）：

1. **access log + 延迟插桩**：`mock/server.mjs` 的 `handle()` 内、OPTIONS 分支（230–233 行）之后、各路由之前插入 `console.log('[mock]', req.method, path)`，再按 `MOCK_SLOW_MS`/`MOCK_SLOW_PATH` 匹配后 `await setTimeout` 延迟。用 `[MEASURE-TEMP-BEGIN/END]` 包裹，便于整段删除。
2. **client_token 打印时机（关键修正）**：上一轮把打印放在 `readBody` 之后，但顶部的 5s 慢延迟会让它迟迟不打印。本轮改为**在 orders 路由分支内、`await readBody(req)` 之后立即打印**——由于顶部延迟在路由前已 await，打印实际发生在请求进入路由时（约客户端发起后、mock 返回前），配合「客户端 2s 已超时但 mock 仍在跑」的形态，用户等约 5s 即可在终端看到 `client_token=`。**更稳的兜底**是直接用微信开发者工具 Network 面板对比两次提交的请求 Payload（不依赖日志时机）。
3. **防抖窗口临时拉大**：`src/pages/checkout/index.vue` 第 57 行 `CHECKOUT_DEBOUNCE_MS=300`→`1500`，方便肉眼观察合并；阶段 A 结束必须改回 300。`onShow` 立即刷新不动。
4. **超时只改环境变量**：`.env.development` 第 30 行 `VITE_API_TIMEOUT=10000`→`2000`（Vite 不热更，需用户重启 dev）；`request/index.ts` 不改。
5. **定位缓存用对照实验**：利用源码事实——「⌖」按钮 `onRelocate` 调 `getUserLocation({force:true})` 会清缓存（geo.ts 115–121 行），而门店卡片 `onSelect`→`catalog.selectStore`→`getUserLocation()`（不带 force，走缓存，catalog.ts 32/57/83 行）。通过「先 ⌖ 清缓存 → 4s 内连点两张门店卡」观测第二次是否命中缓存。

性能与可靠性：mock 延迟为 O(1) setTimeout 无副作用；延迟按 path 精确匹配避免误伤其它接口；定位黑盒观测不产生任何代码改动。

## Implementation Notes

- 防抖看请求合并数、超时才需要拖过客户端 timeout——不混用同一套延迟；定位不插桩。
- 还原清单（每处改动都有回退值）；`.env.development` 与 `mock/.env` 被 gitignore，git diff 看不到，必须人工复述确认已还原。
- 不提交任何 commit；不动支付/领券/加购逻辑；不改 `clientToken.ts`/`geo.ts`/`timing.ts`/`request/index.ts`。
- 全部结束后跑 `node mock/smoke-test.mjs`；若忘关 `MOCK_SLOW_MS`，smoke 会极慢或失败，作为最后一道校验。

## Architecture Design

在现有架构上做临时旁路插桩，不改数据流：

```mermaid
flowchart LR
  A[小程序页面] -->|uni.request| B[request/index.ts 读 VITE_API_TIMEOUT]
  B -->|HTTP| C[mock/server.mjs handle]
  C --> D[临时插桩 access log + MOCK_SLOW 延迟]
  D --> E[原有路由]
  E --> F[阶段C 路由入口立即打印 client_token]
```

被测实现位置（只读不改）：

- 防抖：`src/utils/timing.ts` createDebounced（trailing）+ `checkout/index.vue` 第 57–58 行
- 幂等：`src/utils/clientToken.ts` INTENT_TTL_MS=5min（10 行）、orderCheckoutIntent（61 行）、isRetriableNetworkError（50 行）
- 定位缓存：`src/utils/geo.ts` LOCATION_TTL_MS=4000（7 行）、locationInflight 复用进行中 Promise（122 行）

## Directory Structure Summary

全部为对现有文件的**临时修改**（执行期产生，最终全部还原），无新增文件。

```
f:/Project/uniapp_coffee/
├── mock/
│   ├── server.mjs          # [MODIFY-临时] 阶段A：handle() OPTIONS 分支后插入 access log（[MEASURE-TEMP] 包裹）；阶段C：保留该插桩并在 orders 路由(约898行) readBody 后立即打印 client_token。实现要求：延迟仅在 slowMs>0 且（未设 slowPath 或 method+path 包含 slowPath）时生效；测完整段删除。
│   └── .env                # [MODIFY-临时] 追加 MOCK_SLOW_MS / MOCK_SLOW_PATH 两行（A:0；C:5000+orders）。实现要求：config.mjs 自动加载，改后需重启 npm run mock；测完删除这两行。
├── .env.development        # [MODIFY-临时] 仅阶段 C：第 30 行 VITE_API_TIMEOUT=10000→2000，用户重启 dev；测完改回 10000 再重启。
└── src/pages/checkout/
    └── index.vue           # [MODIFY-临时] 仅阶段 A：第 57 行 CHECKOUT_DEBOUNCE_MS=300→1500；测完改回 300。onShow 立即刷新不动。
```

定位缓存测量：**不修改任何文件**，纯黑盒操作。

## Agent Extensions

本任务无需使用扩展。定位为代码已核实的临时仪器化与黑盒测量，按钮名/常量/路由行号均已通过 read_file/search_content 直接确认，无需调用 code-explorer 子代理；亦不涉及 GitHub、文档生成或浏览器自动化。为降低复杂度，不使用任何 Skill/MCP/SubAgent/Integration。