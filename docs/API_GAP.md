# API 缺口盘点（顾客端）

> 契约源仍是 SHA `93859b11…`（2026-08-11 二次拉取）。  
> 2026-08-11 按盘点继续：已改 types / apis / stores / pages。DEV-010 / DEV-011 / FIELD-GAP-007 **悬置**。DEV-013 选店列表 **仍未处理**。  
> **对接标记（2026-08-12 维护）：** `✅` = 已前后端对接且有真实调用点；`❓` = 已打通请求但仍有问题（原因写在同行）；无标记 = 未接 / 本轮不做 / 排除。

## 契约源（页头）


| 项       | 值                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 文档标题    | 咖啡点单系统 API（Swagger UI：`咖啡点单系统 API - Swagger UI`）                                                                               |
| 版本号     | `1.0.0`（`info.version`；相对上一版**未升号**，以哈希为准）                                                                                     |
| OpenAPI | `3.0.3`                                                                                                                        |
| 文档 URL  | [http://192.168.10.49:8001/docs](http://192.168.10.49:8001/docs)                                                               |
| 机器可读    | [http://192.168.10.49:8001/openapi.json](http://192.168.10.49:8001/openapi.json)                                               |
| 文件标识    | SHA-256 `93859b1198dcf86119ac47c828e77b9262ccbf59d44f80f533288935aea3e2fc`；`Content-Length: 184807`；无 `Last-Modified` / `ETag` |
| 上一版标识   | SHA-256 `8b73aa3cfaa77dcf18ba79f19fd91df1a3dafb0782891b2777689378bc6008d1`（61973 字节）**已作废**                                    |
| 拉取时间    | 2026-08-11（本机二次拉取）                                                                                                             |
| 文档自述    | **【已实现】路径以后端代码为准，不要按未标注的规划字段去对接已实现接口。** 管理后台 `/api/admin/`*；小程序 `/api/mp/*`（顾客/店员按角色）；HTTP 恒 200；P0=堂食闭环，P1=商城/卡券，P2=外卖预留      |


**不是契约：** `docs/API.md`、现有 `src/common/apis/`* 旧路径、`src/common/mock/*`、仓库 `mock/`。

### 两套信封（接入时只改 `types/api.ts` + `interceptors.ts`）


| 标记                          | 信封                                                                               | 成功判定           |
| --------------------------- | -------------------------------------------------------------------------------- | -------------- |
| summary 带 **【已实现·以后端代码为准】** | `{ code: integer, message, data }`（`BaseResponse`，描述写 zero means success，默认 `0`） | `code === 0`   |
| **未标注**（历史规划）               | `{ code: "20000"|…, is_success, message, data }`（`ApiResponseBase`）              | 禁止拿规划信封去接已实现接口 |


已实现接口另有可选 Header `authorization`（文档标 `required=False`）。Token 仍只由拦截器注入，业务函数不手写 Header。

**传输层：** 已实现购物车改为 `PUT /api/mp/cart/items/{item_id}`（改数量）。规划里的整车 `PUT /api/mp/cart`、`PATCH` **本版已实现清单里没有**。接入写接口时一次性补 `src/plugin/request` 的 PUT/PATCH/DELETE。

### 相对上一版的关键变化（重盘摘要）

- 出现顾客端 `GET /api/mp/stores`（【已实现】小程序门店列表）。
- 已实现菜单是 `GET /api/mp/stores/{store_id}/menu`（sku + option_groups）；规划 `GET /api/mp/menu` 仍在但未标已实现。
- 已实现下单是 购物车下单 `CreateOrderReq`（`store_id` + `service_mode` + `from_cart`），不再要 `items[]` / `order_type` 字符串。
- 购物车入参改为 `sku_id` / `option_ids` / `service_mode`。
- 新增：`wx-precheck`、改资料、上传头像、占桌、顾客退款/撤销、`/api/mp/addresses`、配送渠道/询价、`mock-paid`。
- 产品覆盖（本轮点名）： 首页「切换」接入管理端 `GET /api/admin/stores`，不用顾客端 `GET /api/mp/stores`。见 DEV-009 / DEV-012。

---



## 端别切分


| 归入     | 依据                                                                                                                                                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 本轮要接   | `mp-auth` / `mp-stores` / `mp-menu` / `mp-cart` / `mp-tables` / `mp-orders` / `mp-payments` / `mp-refunds` / `mp-mall` / `mp-coupons` / `mp-addresses` / `mp-delivery` / `mp-takeaway`；`GET /api/files/{file_key}`、`POST /api/mp/files/upload` |
| 产品破例纳入 | **仅** `GET /api/admin/stores`（tag `admin-stores`，超管门店列表）。用户原话：首页「切换」拉后台数据库店铺。其余 `admin-`* 仍排除                                                                                                                                                  |
| 多端共用   | `POST /api/mp/auth/wx-login`（`login_role` 默认 `customer`）、`GET /me`、`POST /logout`、`GET /api/files/{file_key}`。顾客端 DTO **不收录** `staff_no` / `real_name` / `manager_id`                                                                          |
| 本轮排除   | 见下                                                                                                                                                                                                                                             |




### 本轮排除


| 分组                                        | 条数     | 不展开                                                                  |
| ----------------------------------------- | ------ | -------------------------------------------------------------------- |
| 管理员端 / 后台（`/api/admin/*`）                 | **63** | 除产品点名的 `GET /api/admin/stores` 外，其余 **62** 不读字段、不建类型、不写函数、不记 FE-NEED |
| 本轮排除：店员端（`/api/mp/staff/*` 及 `mp-staff*`） | **14** | 订单 5 + 桌台/看板 4 + 退款审核 5                                              |
| 系统探针                                      | **2**  | `GET /api/health`、`GET /api/version`（无 C 端入口）                        |


---



## 表 1 文档清单（本轮范围内）

鉴权列：已实现接口多为 `inherit` + 可选 `authorization` Header；规划接口多为显式 `bearer`。下表「已实现」以文档 description 为准。

### 产品破例（管理端 1 条）


| 路径 | 方法 | 已实现 | 对接 | 关键请求 / 响应 | 端别 / 问题说明 |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/stores` | GET | 是 | ❓ | Query：`page` `page_size` `keyword` `status`。出：`{ list: StoreRes[], total, page, page_size }`；`store_id` 为 **string** | 产品点名。**已接：**启动 `ensureStore` → 自动选最近店并拉菜单。**问题：**①「切换」仅空函数 `openStorePicker`，选店列表 UI 未做（DEV-013）；② `store_id` string→integer 靠前端转换（FIELD-GAP-011）；③ StoreRes 无 `distance_km`，距离靠前端算/占位（FIELD-GAP-006）；④ 超管接口鉴权与顾客微信 token 是否兼容待联调（FIELD-GAP-013） |




### 顾客端 / 多端共用


| 路径 | 方法 | 已实现 | 对接 | 关键请求 / 响应 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `/api/mp/auth/wx-precheck` | POST | 是 | — | 入：`code*` `login_role` | BE-UNUSED-021，无预检 UI |
| `/api/mp/auth/wx-login` | POST | 是 | ✅ | 入：`code*` `login_role=customer`。出：`token` + `userinfo` | 我的 · 微信一键登录 → `session.login` → `authApi.loginByWxCode` |
| `/api/mp/auth/me` | GET | 是 | ✅ | 出：MpUserInfoRes | `App.vue` 回前台 `verifySession`；会员/我的资料复用 |
| `/api/mp/auth/profile` | PUT | 是 | — | 入：`nickname` `avatar_path` | BE-UNUSED-002 |
| `/api/mp/auth/avatar` | POST | 是 | — | multipart `file*` | BE-UNUSED-019 |
| `/api/mp/auth/bind-phone` | POST | 是 | — | 入：`mobile*` | BE-UNUSED-001 |
| `/api/mp/auth/logout` | POST | 是 | ✅ | `data` 可空 | 我的 · 退出 → `session.logout` |
| `/api/mp/member/profile` | GET | 否（规划） | — | 规划字段 | 未接；会员走 `/me` 占位 |
| `/api/mp/member/profile` | PUT | 否（规划） | — | — | 未接 |
| `/api/mp/member/addresses` 四条 | * | 否（规划） | — | — | 未接；已实现地址见 `/api/mp/addresses` |
| `/api/mp/stores` | GET | 是 | — | 含 `distance_km` | BE-UNUSED-020；切换不走此条 |
| `/api/mp/stores/{store_id}` | GET | 是 | — | MpStoreDetailRes | 未单独调；首页店名来自 admin 列表项 |
| `/api/mp/stores/{store_id}/menu` | GET | 是 | ❓ | MpMenuRes：分类+商品+skus+option_groups | **已接：**首页/点单 `catalog.ensureLoaded`。**问题：**① 品牌信念/仪式仍本地占位（FIELD-GAP-003）；② 英文名/故事/场景缺字段占位（FIELD-GAP-005）；③ 封面靠 `resolveMediaUrl` 拼主机，与 `GET /api/files/{file_key}` 是否一致待联调（FIELD-GAP-010） |
| `/api/mp/menu` | GET | 否（规划） | — | 旧 specs/addons | **禁止对接**；用已实现门店菜单 |
| `/api/mp/tables/resolve` | GET | 是 | — | Query：`qr_token*` | BE-UNUSED-004 |
| `/api/mp/tables/{table_id}/occupy` | POST | 是 | — | 占桌 | BE-UNUSED-022 |
| `/api/mp/cart` | GET | 是 | ✅ | Query：`store_id*`。出：CartRes | 打开购物袋 → `cart.refreshCart` |
| `/api/mp/cart/items` | POST | 是 | ❓ | 入：`store_id*` `product_id*` `sku_id` `option_ids` `quantity` | **已接：**规格 Sheet「加入购物袋」。**问题：**无文档规格时仍回落本地杯型/温度/加料 +¥3（FIELD-GAP-005）；加购未传 `service_mode`（文档可选，联调若必填会失败） |
| `/api/mp/cart/items/{item_id}` | PUT | 是 | — | 入：`quantity*` | BE-UNUSED-006，购物袋只读 |
| `/api/mp/cart/items/{item_id}` | DELETE | 是 | — | — | BE-UNUSED-007 |
| `/api/mp/cart/clear` | POST | 是 | — | 入：`store_id*` | BE-UNUSED-008 |
| `/api/mp/orders` | POST | 是 | — | 购物车下单 | **未接。** 确认下单仍本地造单（DEV-010 / DEV-011 悬置） |
| `/api/mp/orders` | GET | 是 | ❓ | Query：`page` `page_size` `status` | **已接：**订单 Tab `listMyOrders`。**问题：**`order_status` / `service_mode` 为整数无对照表，UI 显示「—」（FIELD-GAP-007 悬置） |
| `/api/mp/orders/{order_id}` | GET | 是 | — | OrderRes | BE-UNUSED-009 |
| `/api/mp/orders/{order_id}/cancel` | POST | 是 | — | — | BE-UNUSED-010 |
| `/api/mp/orders/{order_id}/refund` | POST | 是 | — | 入：`reason` | BE-UNUSED-013 |
| `/api/mp/orders/{order_id}/refund/cancel` | POST | 是 | — | — | BE-UNUSED-013 |
| `/api/mp/payments/prepay` | POST | 是 | — | 入：`order_id*` | BE-UNUSED-011 / DEV-011 悬置 |
| `/api/mp/payments/mock-paid` | POST | 是 | — | 仅 mock | BE-UNUSED-024 |
| `/api/mp/payments/wechat/notify` | POST | 是 | — | 微信服务器 | 非顾客端调用 |
| `/api/mp/payments/wechat/refund-notify` | POST | 是 | — | 微信服务器 | 非顾客端调用 |
| `/api/mp/refunds` | GET | 是 | — | RefundRes[] | BE-UNUSED-013 |
| `/api/mp/refunds/{refund_id}` | GET | 是 | — | RefundRes | BE-UNUSED-013 |
| `/api/mp/refunds/wechat/notify` | POST | 否（规划） | — | — | 非顾客端 |
| `/api/mp/mall/products` 及详情 | GET | 否（规划） | — | — | BE-UNUSED-016 |
| `/api/mp/coupons/*` 三条 | * | 否（规划） | — | — | BE-UNUSED-017 |
| `/api/mp/takeaway/quote` | POST | 否（规划） | — | — | BE-UNUSED-018 |
| `/api/mp/addresses` 四条 | * | 是 | — | — | BE-UNUSED-003 |
| `/api/mp/delivery/channels` | GET | 是 | — | — | BE-UNUSED-023 |
| `/api/mp/delivery/quote` | POST | 是 | — | — | BE-UNUSED-023 |
| `/api/mp/files/upload` | POST | — | — | multipart | BE-UNUSED-019 |
| `/api/files/{file_key}` | GET | — | — | 图片流 | 未直接请求；封面靠拼 URL（FIELD-GAP-010） |


规划订单枚举（仅规划 schema，已实现 `status` 为 **integer**）：`PENDING_PAY` / `MAKING` / `READY` / …。UI 文案仍是「制作中 / 待取餐 / 已完成」。映射放 API 层。

---



## 表 2 前端调用点

只记现有五 Tab、已有 Sheet、已有生命周期。对接列：`✅` / `❓` / `—`（未接或无需接口）。


| 界面 / 符号 | 用户动作或生命周期 | 对接 | 本版应对 / 问题原因 |
| --- | --- | --- | --- |
| `App.vue` `onLaunch` | 启动 | — | `restoreSession()` 本地读 token，不发请求 |
| `App.vue` `onShow` | 回前台 | ✅ | `verifySession` → `GET /api/mp/auth/me` |
| `pages/home/index` `onShow` | 首页首屏 | ❓ | `ensureLoaded`：admin 选店 + 门店菜单。**问题：**仪式/品牌文案仍本地占位（FIELD-GAP-003）；距离可能为「—」（FIELD-GAP-006） |
| `pages/home/index` **切换** | 点击 | ❓ | 产品点名应对 admin 列表。**问题：**`openStorePicker` 空实现，列表 UI 未做（DEV-013）；仅自动选店在启动时生效 |
| `pages/home/index` 去点单 / 全部 | 点击 | — | 切 Tab，不拉店 |
| `pages/home/index` 仪式卡片 | 点击 | ❓ | 仍用本地 ritual。**问题：**菜单分类是 `category_name`，无 ritual（FIELD-GAP-003/004） |
| `pages/home/index` 招牌精选 | 点击 | ✅ | 商品来自已实现菜单；`openProduct` |
| `pages/home/index` 微信三按钮 | 无点击 | — | DEV-005 |
| `pages/menu/index` `onShow` | 点单首屏 | ❓ | 同首页菜单对接。**问题：**同 FIELD-GAP-003/005/010 |
| `pages/menu/index` 分类 chip | 点击 | ✅ | 用文档 `categories[].category_name` 本地筛 |
| `product-card` | 点击 | ✅ | `openProduct`，不另打详情 |
| `pages/orders/index` | 订单 Tab | ❓ | `GET /api/mp/orders`。**问题：**状态/模式显示「—」（FIELD-GAP-007） |
| `pages/member/index` `onShow` | 会员首屏 | ❓ | 走 `/me` 昵称/卡号。**问题：**等级权益 Mock（FE-NEED-002）；积分/成长/余额占位 0（FE-NEED-003） |
| `pages/mine/index` `onShow` | 我的 | ❓ | 登录后 `getMemberProfile` → `/me`。**问题：**同会员字段缺口 |
| `pages/mine/index` 微信一键登录 | 点击 | ✅ | `POST /api/mp/auth/wx-login` |
| `pages/mine/index` 退出 | 点击 | ✅ | `POST /api/mp/auth/logout` |
| `pages/mine/index` 购物袋 | 点击 | ✅ | 打开 Sheet → `GET /api/mp/cart` |
| `pages/mine/index` 卡券中心 | 无点击 | — | DEV-005 |
| `soorak-nav-bar` 购物袋 | 点击 | ✅ | 打开 Sheet → `GET /api/mp/cart` |
| `soorak-product-sheet` 规格 | 选规格 | ❓ | 有 skus/option_groups 走文档。**问题：**无规格时回落本地 +¥3（FIELD-GAP-005） |
| `soorak-product-sheet` 加入购物袋 | 点击 | ❓ | `POST /api/mp/cart/items`。**问题：**见加购 `service_mode` / 规格回落 |
| `soorak-cart-sheet` 确认下单 | 点击 | — | **未对接。** 仍本地造单（DEV-010 / DEV-011 悬置） |
| `stores/session.ts` | 登录/退出/校验 | ✅ | 已实现 auth 路径 |
| `stores/catalog.ts` | `ensureLoaded` | ❓ | admin 列表 + 门店菜单；见上问题 |
| `stores/cart.ts` | 加购 | ✅ | `addCartItem` / `getCart` |
| `stores/cart.ts` | 下单 | — | `placeOrder` 本地；未调 `POST /api/mp/orders` |


---



## 表 3 缺口清单

上一版行号作废。本表为对本版文档的全量重盘。

### A. FE-NEED


| ID | 能力 | 触发界面 | 建议路径（提案，禁止调用） | 级别 | 临时方案 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| FE-NEED-001 | 顾客如何得到 `store_id` | 首页门店条 / 菜单 / 加购 / 下单 | 产品点名 `GET /api/admin/stores` | 关闭 | DEV-009 | ✅ 关闭（列表接口已有） |
| FE-NEED-002 | 会员等级列表与权益 | 会员 Tab「等级权益」 | 例如 `GET /api/mp/member/tiers` | P1 | 保留 Mock tiers | ❓ 仍缺接口；会员页用 Mock |
| FE-NEED-003 | 积分 / 成长值 / 余额 / 下一档 | 会员英雄卡 | 扩展资料或资产接口 | P1 | 占位 0 | ❓ 仍缺字段；UI 占位 |


登录 / 下单 / 支付 / 订单列表：文档**都有已实现接口**，不因缺接口记 P0。

### B. BE-UNUSED


| ID            | 签名                                                     | 为何没有调用点                           | 建议               | 相对上一版                          |
| ------------- | ------------------------------------------------------ | --------------------------------- | ---------------- | ------------------------------ |
| BE-UNUSED-001 | `POST /api/mp/auth/bind-phone`                         | 无绑手机按钮                            | 延后               | 本轮未变                           |
| BE-UNUSED-002 | `PUT /api/mp/auth/profile`、规划 `PUT /member/profile`    | 无编辑资料                             | 延后               | 拆出已实现 profile                  |
| BE-UNUSED-003 | `/api/mp/addresses` 四条 + 规划 member/addresses           | 无地址簿 UI                           | 延后               | 路径已换已实现                        |
| BE-UNUSED-004 | `GET /api/mp/tables/resolve`                           | 无扫码入口；Query 已改为 `qr_token`        | 延后               | 字段变了                           |
| BE-UNUSED-005 | `PUT /api/mp/cart`                                     | **本版已实现清单已删除整车覆盖**                | 从缺口删除，勿再封装       | **路径已不存在**                     |
| BE-UNUSED-006 | `PUT /api/mp/cart/items/{id}`                          | 购物袋只读无步进                          | 延后               | 方法由 PATCH 改为 PUT，只改数量          |
| BE-UNUSED-007 | `DELETE /api/mp/cart/items/{id}`                       | 无删除                               | 延后               | 本轮未变                           |
| BE-UNUSED-008 | `POST /api/mp/cart/clear`                              | 无清空                               | 延后               | 本轮未变                           |
| BE-UNUSED-009 | `GET /api/mp/orders/{id}`                              | 订单卡无点击                            | 延后               | 本轮未变                           |
| BE-UNUSED-010 | `POST .../cancel`                                      | 无取消按钮                             | 延后               | 本轮未变                           |
| BE-UNUSED-011 | `POST /api/mp/payments/prepay`                         | 无「去支付」；是否并入确认下单未决                 | DEV-011          | 本轮未变                           |
| BE-UNUSED-012 | 微信支付/退款 notify 两条已实现 + 一条规划                            | 微信服务器                             | C 端禁止调           | 本轮未变                           |
| BE-UNUSED-013 | `POST .../refund`、`.../refund/cancel`、`GET /refunds*`  | 无退款入口                             | 延后               | 申请路径已从 `POST /refunds` 改为挂在订单下 |
| BE-UNUSED-016 | 规划商城两条                                                 | 无商城                               | 延后               | 本轮未变                           |
| BE-UNUSED-017 | 规划卡券三条                                                 | 卡券中心无点击                           | 延后               | 本轮未变                           |
| BE-UNUSED-018 | 规划 `takeaway/quote`                                    | 本期不实现                             | 延后               | 本轮未变                           |
| BE-UNUSED-019 | `POST /api/mp/files/upload`、`POST /api/mp/auth/avatar` | 无上传头像                             | 延后               | 新增 avatar                      |
| BE-UNUSED-020 | `GET /api/mp/stores`                                   | 顾客端已实现门店列表；产品要求「切换」走 admin 列表，不双接 | 延后 / 确认废弃（对切换场景） | **新增**                         |
| BE-UNUSED-021 | `POST /api/mp/auth/wx-precheck`                        | 登录是一键，无预检 UI                      | 延后；不要为用上它加步骤     | **新增**                         |
| BE-UNUSED-022 | `POST /api/mp/tables/{id}/occupy`                      | 无占桌入口                             | 延后               | **新增**                         |
| BE-UNUSED-023 | `GET /api/mp/delivery/channels`、`POST .../quote`       | 无外卖询价 UI                          | 延后               | **新增**                         |
| BE-UNUSED-024 | `POST /api/mp/payments/mock-paid`                      | 无「模拟支付」按钮                         | 仅联调，不造 UI        | **新增**                         |




### C. FIELD-GAP


| ID | 界面 | 对接 | 文档有 | UI 要 | 处理 / 问题原因 |
| --- | --- | --- | --- | --- | --- |
| FIELD-GAP-001 | 登录 | ✅ | `token`+`userinfo`；无 `expiresIn`/`mock` | 旧 LoginResult | 已对齐；`platform` 不发送 |
| FIELD-GAP-002 | 会员 / 我的 | ❓ | `/me` 有昵称/卡号/等级 id | 英雄卡 + 等级列表 | **原因：**规划 Member 无积分余额；等级权益无接口（FE-NEED-002/003），UI 占位 |
| FIELD-GAP-003 | 首页品牌 / 仪式 | ❓ | 店名/营业时间来自 StoreRes | 素乐品牌区 + 四仪式 | **原因：**文档无 tagline/belief/Ritual，仍用本地文案 |
| FIELD-GAP-004 | 点单筛选 | ✅ | `category_name` | 分类 chip | 已改用文档分类 |
| FIELD-GAP-005 | 规格 Sheet | ❓ | `skus` + `option_groups` | 杯型/温度/加料 | **原因：**无规格数据时仍回落本地 +¥3；英文/故事占位 |
| FIELD-GAP-006 | 首页距离 | ❓ | admin StoreRes 无 distance | `brand.distance` | **原因：**走 admin 列表，前端用经纬度自算；无坐标则「—」 |
| FIELD-GAP-007 | 订单状态 / 模式 | ❓ | `order_status`/`service_mode` 为 integer | 制作中/待取餐/已完成 | **原因：**文档未给整数对照表，本轮悬置，UI 显示「—」 |
| FIELD-GAP-008 | 信封 | ✅ | 已实现 `code===0` | 拦截器 | 已按 `code === 0`；业务 401xx 清会话 |
| FIELD-GAP-009 | 购物袋计价 | ✅ | CartRes 服务端金额 | 合计 | 有 remote 时用 `payable_amount` |
| FIELD-GAP-010 | 图片 | ❓ | `cover_image_path` / files 流 | 商品图 | **原因：**前端拼 `VITE_API_BASE_URL + path`，未验证是否等于 `GET /api/files/{file_key}` |
| FIELD-GAP-011 | `store_id` 类型 | ❓ | admin string / mp integer | 同一当前店 | **原因：**`toStoreId` 转换；非法 id 抛错。联调需确认后端 string 形如纯数字 |
| FIELD-GAP-012 | 「切换」列表容器 | ❓ | 分页列表 | 二字按钮 | **原因：**DEV-013 选店页未做，仅 mock 占位 |
| FIELD-GAP-013 | admin 列表鉴权 | ❓ | authorization 可选；tag 超管 | 顾客 token | **原因：**是否 403 待联调验证，未改造成 POST |


---



## 编码进度（2026-08-11 按盘点继续 · 2026-08-12 打标）

### ✅ 已对接（请求 + 真实调用点）

1. 信封 `code === 0` + `http` PUT/DELETE  
2. `POST /api/mp/auth/wx-login`、`GET /api/mp/auth/me`、`POST /api/mp/auth/logout`  
3. `GET /api/mp/cart`、点单分类 chip、招牌精选打开规格  

### ❓ 已对接但有问题

| 接口 / 能力 | 原因 |
| --- | --- |
| `GET /api/admin/stores` | 启动自动选最近店已接；「切换」列表 UI 未做（DEV-013）；`store_id` 类型转换 / 距离 / 鉴权见 FIELD-GAP-006/011/013 |
| `GET /api/mp/stores/{id}/menu` | 菜单已拉；品牌仪式/英文故事占位；封面 URL 拼法待验（FIELD-GAP-003/005/010） |
| `POST /api/mp/cart/items` | 加购已发；无规格时本地 +¥3 回落；未传 `service_mode` |
| `GET /api/mp/orders` | 列表已拉；状态/模式整数无对照，显示「—」（FIELD-GAP-007） |
| 会员 / 我的资料 | 仅 `/me` 昵称卡号；积分等级 Mock/占位（FE-NEED-002/003） |

### — 本轮未接 / 悬置

7. `POST /api/mp/orders` / `prepay` — DEV-010 / DEV-011  
8. 选店列表页 — DEV-013（异常仍未处理）

禁止对接规划 `GET /api/mp/menu` 的 `specs/addons` 去替代已实现菜单。

---



## P0 与主流程

**主流程仍未闭环。**


| ID                   | 说明                                                                            |
| -------------------- | ----------------------------------------------------------------------------- |
| ~~P0 / FE-NEED-001~~ | **本轮关闭**：列表接口已有；产品指定 admin 列表                                                 |
| P0 / DEV-010         | **本轮悬置**。确认下单仍本地造单 |
| P0 / DEV-011         | **本轮悬置**。未调预支付 |
| P0 / DEV-013         | **异常仍未处理**：选店列表界面未做，仅 `src/common/mock/stores.ts` 占位；点击「切换」不跳转。自动选最近店已接，菜单可发 |
| P0 / FIELD-GAP-007   | **本轮悬置**。订单列表状态/模式展示为「—」 |


登录 / 下单 / 支付 / 订单列表**不是「文档没有」**。

---



## 待裁定（`docs/DEVIATION_LOG.md`）


| ID      | 状态                                    |
| ------- | ------------------------------------- |
| DEV-009 | **产品已点名**：切换走 `GET /api/admin/stores` |
| DEV-010 | **本轮悬置** |
| DEV-011 | **本轮悬置** |
| DEV-012 | 已按产品破例接入 `GET /api/admin/stores` |
| DEV-013 | **异常仍未处理**（选店列表 UI / mock 占位） |


未写入业务分支或注释。