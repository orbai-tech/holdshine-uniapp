# 偏差日志

> **核对日：2026-08-13**（对照 `src/` 实现，非仅文档声称）。  
> **闭环取值：** `已闭环` / `半闭环·有隐患` / `占位继续` / `悬置` / `破例接受·有隐患`。

| ID | 场景 | 旧行为 | 新行为（当前代码） | 原因 | 产品批准 | 闭环 |
| --- | --- | --- | --- | --- | --- | --- |
| DEV-001 | 规格/购物袋浮层与 Tab | 规格栈隐藏自定义 Tab；购物袋叠在 Tab 之上 | `pages.json` 仍声明原生 tabBar（供 `switchTab`）；运行时**始终** `hideTabBar`，页内 `SoorakTabBar`；开规格/购物袋/`suppressTabBar` 时隐藏自定义 Tab | 原生 tabBar 层级高于页内节点 | 待定 | **半闭环·有隐患**：竞态依赖 `nextTick`+`fail` 吞错；从不 `showTabBar`；双轨 Tab（原生配置 + 自定义 UI）易漂移 |
| DEV-002 | 产品摄影 | `/images/products/*.jpg`（旧仓文件曾缺失） | `/static/images/products/*.jpg` 共 12 张，路径对齐 | 已补齐资源 | 是 | **已闭环** |
| DEV-003 | 展示字体 | Google Fonts：Cormorant + Noto Sans SC | 系统栈 `Songti SC` / `PingFang SC` 等 | 小程序不能依赖外链字体 | 待定 | **占位继续**（平台约束，可长期接受） |
| DEV-004 | Sheet Escape | `window` 监听 Escape 关闭 | 无键盘关闭；仅遮罩/返回手势 | 禁用浏览器 API | 待定 | **占位继续**（H5 体验差，非阻塞主路径） |
| DEV-005 | 微信能力按钮 | 首页三按钮无点击；我的卡券/客服/关于无跳转 | 首页「分享/客服/订阅」仍无逻辑；我的「礼遇匣」→`/pages/coupons`；客服 mp-weixin `open-type="contact"`；关于仍无页 | 旧版预留；客服/分享需微信后台配置 | 待定 | **占位继续**（礼遇匣已通；首页三按钮与关于未闭环） |
| DEV-006 | 鉴权 | `loggedIn` 默认 true 演示切换 | `uni.login` → `POST /api/mp/customer/auth/wx-login`；H5 用开发 code；失败时回落假 code | 已有 AppID；Secret 不进前端 | 是 | **半闭环·有隐患**：失败回落假 code 会掩盖真登录故障；依赖后端是否认开发码 |
| DEV-007 | 桌面手机壳 | H5 居中 390×844 圆角设备框 | 全屏纸色 + 自定义 Tab（原生始终隐藏） | 新栈不再演假 Shell | 待定 | **占位继续**（设计取舍，非缺陷） |
| DEV-008 | 关闭 Mock | `VITE_ENABLE_MOCK=false` 时打旧 `/catalog/*` 等会失败 | 环境变量仍在 `.env.example`，**代码未读取**；请求一律走 `VITE_API_BASE_URL`；品牌/仪式等仍用 `common/mock/catalog` 补缺字段 | 主路径已接真实 `/api/mp/customer/*` | 待定 | **半闭环·有隐患**：死配置易误导；关 mock「开关」无效；缺字段仍靠本地 mock 拼装 |
| DEV-009 | 顾客端 store_id | 店名来自本地 brand；「切换」误跳点单 | 启动 `ensureStore`→`GET /api/mp/customer/stores` 选最近店并拉菜单；「切换」→选店页（见 DEV-013） | 顾客端列表契约 | 是 | **已闭环**（`store_id` string→int 见 FIELD-GAP-011） |
| DEV-010 | 确认下单类型 | 本地 `placeOrder` 写 `mode: '外带'`；曾用 mock `2=自取` | `orderEnums`：读侧 `service_mode` 1堂食/2自提/3外卖/4礼品/5月卡；`order_status` 1–12。UI「到店自取」(pack) **仍映射堂食 1**（避免购物袋 1/2 分桶空车）；列表/详情按返回值展示 2/5；`table_id` 仍由桌码映射 | 契约已有自提=2、月卡=5；提交仍不映射 2 | 是（自取→堂食偏差） | **半闭环·有隐患**：枚举/列表/用券 ✅mock；写路径 UI 自取与契约自提语义仍有偏差 |
| DEV-011 | 确认下单与支付 | 购物袋仅「确认下单」 | 确认单「提交支付」→ `createOrder` → `prepay` → `settlePayment`（H5/devtools `mock-paid`；mp mock 标记同）；付后状态→制作中 | 同手势连调支付（行业标准） | 是（mock 通路） | **半闭环·有隐患**：无真微信商户支付；非生产 mp 失败可回落 mock-paid |
| DEV-012 | C 端调超管门店列表 | 受众过滤禁止 `/api/admin/*`；曾破例 `GET /api/admin/stores` | **已平替** `GET /api/mp/customer/stores`（选店/自动选店/外卖荐店均复用；可传 lat/lng 取 `distance_km`） | 顾客端不应打超管 | 是 | **已闭环** |
| DEV-013 | 切换后如何选店 | 「切换」无列表；曾误跳点单 | **`pages/stores/index` 已实现**（搜索/城市/常用/距离排序）；`openStorePicker` → `navigateTo` 选店页；确认后 `catalog.selectStore` | 原「先不造列表页」决策已过时 | 待定 | **已闭环**（数据源为 mp/stores；`mock/stores.ts` 已成死代码，未再引用） |
| DEV-014 | 外卖按地址荐店 | 无 | `listStoresByAddress` → `GET /api/mp/customer/stores?latitude&longitude`（后端按距离排序）；无坐标则回落定位或未排序全量 | 现网无独立荐店契约 | 待定 | **半闭环·有隐患**：非配送圈/运力契约；与 DEV-012 同源已收敛到 mp |
| DEV-015 | 堂食桌码 | 无 | 首页扫桌码 → `resolve`+`occupy` 写真实 `tableId`；确认单扫码桌只读；无扫码仍可弹 A1–A3 回落（`toTableId`） | 用户预留；占桌后置 | 是（回落桌码） | **半闭环**：resolve/occupy ✅mock；未扫码路径仍映射 A1–A3 |
| DEV-016 | 确认单提交支付 | 购物袋直接本地造单 | 购物袋仅导航确认单；「提交支付」走 `cart.submitCheckout`（API 通路）；已删本地 `placeOrder` 成功路径 | 确认单为唯一下单入口 | 是（mock 通路） | **半闭环·有隐患**：与 DEV-010/011 同捆；真后端未就绪时依赖 mock |

## 汇总（2026-08-13）

| 状态 | ID |
| --- | --- |
| 已闭环 | DEV-002、DEV-009、DEV-012、DEV-013 |
| 半闭环·有隐患 | DEV-001、DEV-006、DEV-008、DEV-010、DEV-011、DEV-014、DEV-015、DEV-016 |
| 占位继续 | DEV-003、DEV-004、DEV-005、DEV-007 |

**优先处理建议：** 换真实 prepay → DEV-006 去假码 → DEV-014 配送圈契约 → DEV-001 双轨 Tab 收敛 → DEV-008 删死开关或真正接线。
