# API 缺口盘点（顾客端）

> 契约源已换：离线 Swagger SHA `439cd7d8…`（2026-08-14 对照 `holdshine-api-swagger-offline`）。  
> 上一版 SHA `93859b11…`（2026-08-11）**作废**。  
> **对接标记（2026-08-14 维护）：**  
>
> - `✅` = 已前后端对接且有真实调用点（相对真契约路径）  
> - `✅mock` = **仅 mock 跑通**，且前端类型/入出参与**真契约 DTO 对齐**（仓库 `mock/` + smoke/前端联调可通；**不是**真后端验收）。**DTO 未齐或契约已删 → 禁止打勾**，一律 `❓`  
> - `❓` = 已有请求/调用点，但仍有问题（含：mock 请求能通但 **DTO 未对齐**、path 已从契约删除、枚举对照错误等；原因写在同行）  
> - 无标记 / `—` = 未接 / 本轮不做 / 排除  
> DEV-010 / FIELD-GAP-015：**前端/mock 用券预留已半闭环**；真 CreateOrder 用券字段仍待补。FIELD-GAP-007 枚举仍冲突。DEV-013 选店页 **已闭环**。FE-NEED-004/005 已改为本地试算。  
> **Base URL 切换：** 只改 `.env.development` 的 `VITE_API_BASE_URL` 后重启 dev；mock=`http://127.0.0.1:3780`（H5 可用 `/api`+代理），真后端=`http://192.168.10.49:8000`。`VITE_ENABLE_MOCK` 不参与路由（DEV-008）。

## 契约源（页头）


| 项       | 值                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文档标题    | 咖啡点单系统 API（离线 Swagger UI：`offline-swagger/index.html`）                                                                                                                                            |
| 版本号     | `1.0.0`（`info.version`；相对上一版**未升号**，以哈希为准）                                                                                                                                                        |
| OpenAPI | `3.1.0`（上一版盘点为 `3.0.3`）                                                                                                                                                                           |
| 文档 URL  | 本机离线：`file:///F:/Project/holdshine-api-swagger-offline/offline-swagger/index.html`；Try it out 仍指向业务后端 `http://192.168.10.49:8000`                                                                 |
| 机器可读    | `F:/Project/holdshine-api-swagger-offline/offline-swagger/openapi.json`（同目录另有 `openapi.yaml` / `openapi.bundle.js`）                                                                               |
| 文件标识    | SHA-256 `439cd7d8204392947d948b568c43b43c74104c4d99507391d15ae05dceee7ded`；`Content-Length: 740170`                                                                                               |
| 上一版标识   | SHA-256 `93859b1198dcf86119ac47c828e77b9262ccbf59d44f80f533288935aea3e2fc`（184807 字节）**已作废**；仓库内 `docs/api/openapi.json`（`8a02dc16…` / 653766）亦**落后于本离线包**                                        |
| 拉取时间    | 2026-08-14（对照离线包；非在线二次拉取）                                                                                                                                                                         |
| 文档自述    | **已实现接口已从后端 FastAPI 同步，摘要带【已实现】；未标注路径为历史规划，不要按规划字段对接已实现接口。** 管理后台 `/api/admin/`*；小程序 `/api/mp/`*（顾客/店员按角色）；HTTP 恒 200；业务成败看 `code`/`is_success`；P0=堂食闭环，P1=商城/卡券，P2=外卖预留。状态枚举见文档站 `/plans/enums`。 |


**不是契约：** `docs/API.md`、现有 `src/common/apis/`* 旧路径、`src/common/mock/`*、仓库 `mock/`、已删除的调试 path（见下「相对上一版」）。

### 两套信封（接入时只改 `types/api.ts` + `interceptors.ts`）


| 标记                                      | 信封                                                                           | 成功判定                                               |
| --------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| summary/description 带 **【已实现·以后端代码为准】** | `{ code: integer, message, data }`（`BaseResponse`，zero means success，默认 `0`） | `code === 0`                                       |
| **未标注**（历史规划）                           | `{ code: "20000"                                                             | …, is_success, message, data }`（`ApiResponseBase`） |


已实现接口另有可选 Header `authorization`（文档标 `required=False`）。Token 仍只由拦截器注入，业务函数不手写 Header。

**传输层：** 已实现购物车仍为 `PUT /api/mp/cart/items/{item_id}`（改数量）。**本版契约已删除** `POST /api/mp/cart/quote`、`POST /api/mp/checkout/preview`；前端主路径已改为菜单/券本地试算（FE-NEED-004/005），mock 仅保留旧 handler。

### 相对上一版的关键变化（重盘摘要）

- OpenAPI `3.0.3` → `3.1.0`；paths **172**；顾客端相关约 **66** 条 + files **2**；店员侧膨胀至 **56**；admin **87**。
- **删除（前端主路径已停用）：** `POST /api/mp/cart/quote`、`POST /api/mp/checkout/preview` → 规格/用券改为本地试算；支付时后端权威重算。
- **新增已实现：** `GET /api/mp/cart/overview`；`GET /api/mp/location/config`；`GET /api/mp/mall`；卡券 `available`/`claim`/`mine`/`mine/{id}`（含 DELETE）；订单物流/确认收货；`/api/mp/returns`*；配送进度 `GET /api/mp/delivery/orders/{order_id}`；微信消息推送 `/api/mp/wechat/message`。
- **卡券：** `GET /api/mp/coupons/mine` 由「mock 调试」升为 **【已实现】**；DTO 主键为 `customer_coupon_id`（非旧 mock `coupon_id`）。前端/mock 已对齐；预留 mock `POST /api/mp/coupons/redeem`。
- **下单：** 真 `CreateOrderReq` 尚无券字段；前端/mock **预留** `customer_coupon_id` + `client_payable_amount`，mock 下单内自动核销。
- **购物车：** `GET /api/mp/cart` 增加可选 Query `service_mode`；清空入参可带 `service_mode`。
- **枚举：** `OrderRes.order_status` / `service_mode` 的 schema description 已写整数含义（FIELD-GAP-007 可收口对照，但前端 mock 仍冲突）。
- **登录：** `MpWxLoginReq` 增 `wx_phone_code` / `mobile` / `nickname`；`MpLoginRes` 增店员双身份字段（顾客端忽略）。
- 选店列表仍走 `GET /api/mp/stores`（DEV-012/013 已闭环）。

---



## 端别切分


| 归入     | 依据                                                                                                                                                                                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 本轮要接   | `mp-auth` / `mp-stores` / `mp-menu` / `mp-cart` / `mp-tables` / `mp-orders` / `mp-payments` / `mp-refunds` / `mp-returns` / `mp-mall` / `mp-coupons` / `mp-addresses` / `mp-delivery` / `mp-location` / `mp-takeaway`；`GET /api/files/{file_key}`、`POST /api/mp/files/upload` |
| 产品破例纳入 | ~~原仅~~ `GET /api/admin/stores` → **已撤销破例**，改 `GET /api/mp/stores`（DEV-012）。其余 `admin-`* 仍排除                                                                                                                                                                                   |
| 多端共用   | `POST /api/mp/auth/wx-login`（`login_role` 默认 `customer`）、`GET /me`、`POST /logout`、`GET /api/files/{file_key}`。顾客端 DTO **不收录** `staff_no` / `real_name` / `manager_id`；**不接** `POST /api/mp/auth/wx-login/staff-kind`                                                          |
| 本轮排除   | 见下                                                                                                                                                                                                                                                                            |




### 本轮排除


| 分组                                                                                   | 条数      | 不展开                                                                                            |
| ------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------- |
| 管理员端 / 后台（`/api/admin/*`）                                                            | **87**  | 全部不读字段、不建类型、不写函数、不记 FE-NEED                                                                    |
| 本轮排除：店员端（`/api/mp/staff/*`、`/api/mp/mall-staff/*`、`mp-staff*`、`wx-login/staff-kind`） | **56+** | 堂食店员 + 商城店员目录/库存/订单/退款/退货；`POST .../delivery/.../dispatch` 虽挂 `mp-delivery` 但是**店员手动呼叫**，顾客端不调 |
| 系统探针 / 微信服务器回调                                                                       | **若干**  | `GET /api/health`、`GET /api/version`；支付/退款 notify；`/api/mp/wechat/message`                     |


---



## 表 1 文档清单（本轮范围内）

鉴权列：已实现接口多为 `inherit` + 可选 `authorization` Header；规划接口多为显式 `bearer`。下表「已实现」以文档 description/summary 为准。

### 产品破例（管理端 1 条）— 已撤销


| 路径                  | 方法  | 已实现 | 对接  | 关键请求 / 响应                            | 端别 / 问题说明 |
| ------------------- | --- | --- | --- | ------------------------------------ | --------- |
| `/api/admin/stores` | GET | 是   | —   | 原破例；顾客端已改走 `/api/mp/stores`（DEV-012） | **不再对接**  |




### 顾客端 / 多端共用


| 路径                                             | 方法     | 已实现       | 对接    | 关键请求 / 响应                                                                                                      | 说明                                                                                                                                                          |
| ---------------------------------------------- | ------ | --------- | ----- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/mp/auth/wx-precheck`                     | POST   | 是         | —     | 入：`code*` `login_role`                                                                                         | BE-UNUSED-021，无预检 UI                                                                                                                                        |
| `/api/mp/auth/wx-login`                        | POST   | 是         | ✅mock | 入：`code*` `login_role=customer`；可选 `wx_phone_code`/`mobile`/`nickname`。出：`token` + `userinfo`（另有店员双身份字段，C 端忽略） | **mock 跑通。** 我的 · 微信一键登录 → `session.login` → `authApi.loginByWxCode`（DEV-006：失败可回落假 code）                                                                   |
| `/api/mp/auth/me`                              | GET    | 是         | ✅mock | 出：MpUserInfoRes                                                                                                | **mock 跑通。** `App.vue` 回前台 `verifySession`；会员/我的资料复用                                                                                                        |
| `/api/mp/auth/profile`                         | PUT    | 是         | —     | 入：`nickname` `avatar_path`                                                                                     | BE-UNUSED-002                                                                                                                                               |
| `/api/mp/auth/avatar`                          | POST   | 是         | —     | multipart `file*`                                                                                              | BE-UNUSED-019                                                                                                                                               |
| `/api/mp/auth/bind-phone`                      | POST   | 是         | —     | 入：`mobile*`；可选 `wx_phone_code`                                                                                 | BE-UNUSED-001                                                                                                                                               |
| `/api/mp/auth/logout`                          | POST   | 是         | ✅mock | `data` 可空                                                                                                      | **mock 跑通。** 我的 · 退出 → `session.logout`                                                                                                                     |
| `/api/mp/member/profile`                       | GET    | 否（规划）     | —     | 规划字段                                                                                                           | 未接；会员走 `/me` 占位                                                                                                                                             |
| `/api/mp/member/profile`                       | PUT    | 否（规划）     | —     | —                                                                                                              | 未接                                                                                                                                                          |
| `/api/mp/member/addresses` 四条                  | *      | 否（规划）     | —     | —                                                                                                              | **禁止对接**；已实现地址见 `/api/mp/addresses`                                                                                                                         |
| `/api/mp/stores`                               | GET    | 是         | ✅mock | Query：`page` `page_size` `keyword` `latitude` `longitude`；出含 `distance_km`；`store_id` 为 **string**             | **mock 跑通。** `ensureStore` / 选店页 / 外卖荐店 → `listMpStores`（DEV-012）；`store_id` 类型见 FIELD-GAP-011                                                              |
| `/api/mp/stores/{store_id}`                    | GET    | 是         | —     | MpStoreDetailRes                                                                                               | 未单独调；首页店名来自 mp 列表项                                                                                                                                          |
| `/api/mp/stores/{store_id}/menu`               | GET    | 是         | ✅mock | MpMenuRes：分类+商品+skus+option_groups                                                                             | **mock 跑通。** 首页/点单 `catalog.ensureLoaded`。**仍有问题：**① 品牌信念/仪式仍本地占位（FIELD-GAP-003）；② 英文名/故事/场景缺字段占位（FIELD-GAP-005）；③ 封面靠 `resolveMediaUrl` 拼主机（FIELD-GAP-010） |
| `/api/mp/menu`                                 | GET    | 否（规划）     | —     | 旧 specs/addons                                                                                                 | **禁止对接**；用已实现门店菜单                                                                                                                                           |
| `/api/mp/tables/resolve`                       | GET    | 是         | —     | Query：`qr_token*`                                                                                              | BE-UNUSED-004                                                                                                                                               |
| `/api/mp/tables/{table_id}/occupy`             | POST   | 是         | —     | 占桌                                                                                                             | BE-UNUSED-022                                                                                                                                               |
| `/api/mp/cart`                                 | GET    | 是         | ✅mock | Query：`store_id*` `service_mode?`。出：CartRes                                                                    | **mock 跑通。** 打开购物袋 → `cart.refreshCart`。**仍有问题：**前端未传 `service_mode` Query（FIELD-GAP-016）                                                                   |
| `/api/mp/cart/overview`                        | GET    | 是         | —     | 出：`dine_in`/`takeaway`/`mall`                                                                                  | **新增**；BE-UNUSED-025                                                                                                                                        |
| `/api/mp/cart/quote`                           | —      | **文档已删除** | —     | 前端主路径已停用；mock 仍保留 handler 供旧脚本                                                         | **前端本地试算：**规格 Sheet 用菜单 `sale_price`+`price_delta`（FE-NEED-004 / FIELD-GAP-014）                                                                   |
| `/api/mp/cart/items`                           | POST   | 是         | ✅mock | 入：`store_id*` `product_id*` `sku_id` `option_ids` `quantity` `table_id?` `service_mode?`                       | **mock 跑通。** 规格 Sheet「加入购物袋」。**仍有问题：**无文档规格时仍回落本地杯型/温度/加料 +¥3（FIELD-GAP-005）                                                                                |
| `/api/mp/cart/items/{item_id}`                 | PUT    | 是         | —     | 入：`quantity*`                                                                                                  | BE-UNUSED-006，购物袋只读                                                                                                                                         |
| `/api/mp/cart/items/{item_id}`                 | DELETE | 是         | —     | —                                                                                                              | BE-UNUSED-007                                                                                                                                               |
| `/api/mp/cart/clear`                           | POST   | 是         | —     | 入：`store_id*` `service_mode?`                                                                                  | BE-UNUSED-008                                                                                                                                               |
| `/api/mp/orders`                               | POST   | 是         | ✅mock | 购物车下单；**真契约尚无**券字段；前端/mock 预留 `customer_coupon_id` + `client_payable_amount`，下单内原子核销 | **mock 跑通（预留字段）。** 真后端需补 CreateOrder 用券契约（FIELD-GAP-015）；正式核销建议「下单自动」                                                                 |
| `/api/mp/orders`                               | GET    | 是         | ❓     | Query：`page` `page_size` `status` `service_mode`                                                               | **不打勾：**列表请求 mock 能通，但 `orderEnums` 与 OrderRes description **枚举未齐**（FIELD-GAP-007）；行展示 `sku_name` + `options`                                               |
| `/api/mp/orders/{order_id}`                    | GET    | 是         | —     | OrderRes                                                                                                       | UI 未点详情（BE-UNUSED-009）                                                                                                                                      |
| `/api/mp/orders/{order_id}/cancel`             | POST   | 是         | —     | —                                                                                                              | BE-UNUSED-010                                                                                                                                               |
| `/api/mp/orders/{order_id}/receive`            | POST   | 是         | —     | 顾客确认收货                                                                                                         | **新增**；BE-UNUSED-026                                                                                                                                        |
| `/api/mp/orders/{order_id}/logistics`          | GET    | 是         | —     | 礼品物流轨迹                                                                                                         | **新增**；BE-UNUSED-027                                                                                                                                        |
| `/api/mp/orders/{order_id}/logistics/refresh`  | POST   | 是         | —     | 主动拉微信轨迹                                                                                                        | **新增**；BE-UNUSED-027                                                                                                                                        |
| `/api/mp/orders/{order_id}/refund`             | POST   | 是         | —     | 入：`reason`                                                                                                     | BE-UNUSED-013                                                                                                                                               |
| `/api/mp/orders/{order_id}/refund/cancel`      | POST   | 是         | —     | —                                                                                                              | BE-UNUSED-013                                                                                                                                               |
| `/api/mp/payments/prepay`                      | POST   | 是         | ✅mock | 入：`order_id*`                                                                                                  | **mock 跑通。** 确认单提交支付 → `paymentApi.prepay`；返回带 `mock: true`                                                                                                 |
| `/api/mp/payments/mock-paid`                   | POST   | 是         | ✅mock | 仅 mock                                                                                                         | **mock 跑通（本 path 即模拟支付）。** H5/devtools / mp mock 标记走 `settlePayment`                                                                                        |
| `/api/mp/payments/wechat/notify`               | POST   | 是         | —     | 微信服务器                                                                                                          | 非顾客端调用                                                                                                                                                      |
| `/api/mp/payments/wechat/refund-notify`        | POST   | 是         | —     | 微信服务器                                                                                                          | 非顾客端调用                                                                                                                                                      |
| `/api/mp/refunds`                              | GET    | 是         | —     | RefundRes[]；Query `order_id?`                                                                                  | BE-UNUSED-013                                                                                                                                               |
| `/api/mp/refunds/{refund_id}`                  | GET    | 是         | —     | RefundRes                                                                                                      | BE-UNUSED-013                                                                                                                                               |
| `/api/mp/refunds/wechat/notify`                | POST   | 否（规划）     | —     | —                                                                                                              | 非顾客端                                                                                                                                                        |
| `/api/mp/returns`                              | GET    | 是         | —     | 我的退货单                                                                                                          | **新增**；BE-UNUSED-028                                                                                                                                        |
| `/api/mp/returns/{return_id}/ship-back`        | POST   | 是         | —     | 回程运单                                                                                                           | **新增**；BE-UNUSED-028                                                                                                                                        |
| `/api/mp/returns/{return_id}/reship-prepay`    | POST   | 是         | —     | 寄回运费预下单                                                                                                        | **新增**；BE-UNUSED-028                                                                                                                                        |
| `/api/mp/returns/{return_id}/reship-mock-paid` | POST   | 是         | —     | 模拟支付寄回运费                                                                                                       | **新增**；BE-UNUSED-028                                                                                                                                        |
| `/api/mp/mall`                                 | GET    | 是         | —     | 礼品商城目录；Query `store_id?`                                                                                       | **新增**；BE-UNUSED-016                                                                                                                                        |
| `/api/mp/mall/products`                        | GET    | 否（规划）     | —     | —                                                                                                              | 仍规划；目录用 `/api/mp/mall`                                                                                                                                      |
| `/api/mp/mall/products/{product_id}`           | GET    | 是         | —     | 礼品详情；Query `store_id?`                                                                                         | 升为已实现；无商城 UI（BE-UNUSED-016）                                                                                                                                 |
| `/api/mp/coupons/mine`                         | GET    | 是         | ✅mock | Query：`coupon_status?`；出 `MyCouponListRes.list`（`customer_coupon_id` + `template`）                          | **mock 跑通且 DTO 对齐。** 确认单 `listMyCoupons` 本地试算折扣；礼遇匣另接 available/claim（BE-UNUSED-017 部分）                                               |
| `/api/mp/coupons/mine/{customer_coupon_id}`    | GET    | 是         | —     | 详情                                                                                                             | **新增**；BE-UNUSED-017（本轮不接 UI）                                                                                                                                        |
| `/api/mp/coupons/mine/{customer_coupon_id}`    | DELETE | 是         | —     | 作废未使用券                                                                                                         | **新增**；BE-UNUSED-017（本轮不接 UI）                                                                                                                                        |
| `/api/mp/coupons/available`                    | GET    | 是         | ✅mock | Query：`store_id*`（integer）；出 `CouponTemplateListRes.list: CouponTemplateBriefRes[]`                              | **mock 跑通。** `pages/coupons` → `listAvailableCoupons`（BE-UNUSED-017）                                                                                                                               |
| `/api/mp/coupons/claim`                        | POST   | 是         | ✅mock | 入：`coupon_template_id*`（int）`store_id?`；出 `MyCouponRes`                                                                            | **mock 跑通。** `pages/coupons` → `claimCoupon`（BE-UNUSED-017）                                                                                                                               |
| `/api/mp/coupons/redeem`                       | POST   | **预留/mock** | ✅mock | 入：`customer_coupon_id*` `store_id?` `order_id?`；出：`status` `discount_amount`                                 | **文档暂无顾客端核销。** mock 预留；正式链路由 `createOrder` 内「下单自动核销」，前端主路径不强制先调                                                         |
| `/api/mp/checkout/preview`                     | —      | **文档已删除** | —     | 前端主路径已停用；mock 仍保留 handler                                                                                     | **结账本地试算：**`mine` + `pricing.ts` 满减（FE-NEED-005 / FIELD-GAP-015）                                                                      |
| `/api/mp/takeaway/quote`                       | POST   | 否（规划）     | —     | —                                                                                                              | BE-UNUSED-018                                                                                                                                               |
| `/api/mp/addresses` 五条                         | *      | 是         | ✅mock | AddressUpsertReq / AddressRes（`address_id` 出参 string，path int）                                                                                  | **mock 跑通。** `pages/address/edit` + `session.hydrateDeliveryAddressFromApi`（BE-UNUSED-003）；DELETE 已封装+smoke，无列表删除 UI                                                                                                                 |
| `/api/mp/delivery/channels`                    | GET    | 是         | —     | —                                                                                                              | BE-UNUSED-023                                                                                                                                               |
| `/api/mp/delivery/quote`                       | POST   | 是         | —     | 入：`store_id*` `address_id*` `product_amount?`                                                                  | BE-UNUSED-023                                                                                                                                               |
| `/api/mp/delivery/orders/{order_id}`           | GET    | 是         | —     | 即时配送进度                                                                                                         | **新增**；BE-UNUSED-023                                                                                                                                        |
| `/api/mp/location/config`                      | GET    | 是         | —     | `prefer`/`enabled`                                                                                             | **新增**；BE-UNUSED-029                                                                                                                                        |
| `/api/mp/files/upload`                         | POST   | 否（规划）     | —     | multipart                                                                                                      | BE-UNUSED-019                                                                                                                                               |
| `/api/files/{file_key}`                        | GET    | 否（规划）     | —     | 图片流                                                                                                            | 未直接请求；封面靠拼 URL（FIELD-GAP-010）                                                                                                                               |




**OrderRes 文档枚举（schema description，2026-08-14）：**

- `order_status`：`1`待支付、`2`待接单、`3`制作中、`4`待取餐、`5`已完成、`6`已取消、`7`退款中、`8`已退款、`9`已拒单、`10`待发货、`11`已发货、`12`已签收  
- `service_mode`：`1`堂食、`3`外卖、`4`礼品快递（**无** `2` **自取**；前端 mock 仍用 `2=PACK`，见 FIELD-GAP-007）

规划订单字符串枚举 schema（`OrderStatus` 等）仍在 components，**已实现接口以 integer + 上表为准**。

---



## 表 2 前端调用点

只记现有五 Tab、已有 Sheet、已有生命周期与已落地子页。对接列：`✅` / `✅mock` / `❓` / `—`（未接或无需接口）。


| 界面 / 符号                       | 用户动作或生命周期      | 对接    | 本版应对 / 问题原因                                                                                                      |
| ----------------------------- | -------------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| `App.vue` `onLaunch`          | 启动             | —     | `restoreSession()` 本地读 token，不发请求                                                                                |
| `App.vue` `onShow`            | 回前台            | ✅mock | **mock 跑通。** `verifySession` → `GET /api/mp/auth/me`                                                             |
| `pages/home/index` `onShow`   | 首页首屏           | ✅mock | **mock 跑通。** `ensureLoaded`：mp 选店 + 门店菜单。**仍有问题：**仪式/品牌文案仍本地占位（FIELD-GAP-003）；无定位时距离可能为「—」（FIELD-GAP-006）        |
| `pages/home/index` **切换**     | 点击             | ✅mock | **mock 跑通。** 选店页 `pages/stores`（DEV-013）；数据源 `GET /api/mp/stores`                                                |
| `pages/home/index` 去点单 / 全部   | 点击             | —     | 切 Tab，不拉店                                                                                                        |
| `pages/home/index` 仪式卡片       | 点击             | ❓     | 仍用本地 ritual。**问题：**菜单分类是 `category_name`，无 ritual（FIELD-GAP-003/004）                                             |
| `pages/home/index` 招牌精选       | 点击             | ✅mock | **mock 跑通。** 商品来自门店菜单；`openProduct`                                                                              |
| `pages/home/index` 微信三按钮      | 无点击            | —     | DEV-005                                                                                                          |
| `pages/menu/index` `onShow`   | 点单首屏           | ✅mock | **mock 跑通。** 同首页菜单。**仍有问题：**同 FIELD-GAP-003/005/010                                                              |
| `pages/menu/index` 分类 chip    | 点击             | ✅mock | **mock 跑通。** 用文档 `categories[].category_name` 本地筛                                                                |
| `product-card`                | 点击             | ✅mock | **mock 跑通。** `openProduct`，不另打详情                                                                                 |
| `pages/orders/index`          | 订单 Tab         | ❓     | mock 列表能通，但 `orderEnums` 与文档枚举 **DTO/语义未齐**（FIELD-GAP-007）                                                       |
| `pages/member/index` `onShow` | 会员首屏           | ❓     | 走 `/me` 昵称/卡号。**问题：**等级权益 Mock（FE-NEED-002）；积分/成长/余额占位 0（FE-NEED-003）                                            |
| `pages/mine/index` `onShow`   | 我的             | ❓     | 登录后 `getMemberProfile` → `/me`。**问题：**同会员字段缺口                                                                    |
| `pages/mine/index` 微信一键登录     | 点击             | ✅mock | **mock 跑通。** `POST /api/mp/auth/wx-login`                                                                        |
| `pages/mine/index` 退出         | 点击             | ✅mock | **mock 跑通。** `POST /api/mp/auth/logout`                                                                          |
| `pages/mine/index` 购物袋        | 点击             | ✅mock | **mock 跑通。** 打开 Sheet → `GET /api/mp/cart`                                                                       |
| `pages/mine/index` 礼遇匣        | 点击             | ✅mock | 进 `pages/coupons` → available/claim                                                                             |
| `pages/coupons/index`         | 礼遇匣            | ✅mock | **mock 跑通。** `listAvailableCoupons` + `claimCoupon`；已领看 `can_claim`；**未接** mine/{id} GET/DELETE（BE-UNUSED-017 剩余）                                                                                 |
| `pages/address/edit`          | 保存地址           | ✅mock | **mock 跑通。** create/update → `AddressRes` → `session.saveDeliveryAddress`；onShow/list 回填（BE-UNUSED-003）                                           |
| `soorak-nav-bar` 购物袋          | 点击             | ✅mock | **mock 跑通。** 打开 Sheet → `GET /api/mp/cart`                                                                       |
| `soorak-product-sheet` 规格     | 选规格            | ✅     | **本地实时价：**`sale_price`+`price_delta`（`utils/pricing.ts`）；不再打已删 quote（FE-NEED-004）。无规格时本地 +¥3（FIELD-GAP-005） |
| `soorak-product-sheet` 加入购物袋  | 点击             | ✅mock | **mock 跑通且加购 DTO 对齐。** `POST /api/mp/cart/items`（有履约态时带 `service_mode`）。**仍有问题：**无规格时本地回落 FIELD-GAP-005（非入参 DTO） |
| `soorak-cart-sheet` 确认下单      | 点击             | ✅     | 仅导航 `/pages/checkout/index`；行规格 `formatItemSpec`（无 API）                                                          |
| `pages/checkout` 优惠券/合计       | 进入/选券          | ✅mock | **本地试算。** `GET /coupons/mine` + 满减规则；不再打已删 preview（FE-NEED-005）                                                |
| `pages/checkout` 提交支付         | 点击             | ✅mock | `submitCheckout` 传 `customer_coupon_id` + `client_payable_amount`；mock 下单重算并核销；后续 prepay/mock-paid           |
| `stores/session.ts`           | 登录/退出/校验       | ✅mock | **mock 跑通。** 已实现 auth 路径；登录/`verifySession` 后轻量 `hydrateDeliveryAddressFromApi`（失败不挡）                         |
| `stores/catalog.ts`           | `ensureLoaded` | ✅mock | **mock 跑通。** mp 列表 + 门店菜单；见上字段缺口                                                                                 |
| `stores/cart.ts`              | 加购 / 读车        | ✅mock | **mock 跑通且 cart DTO 对齐。** `addCartItem` / `getCart`；读车未传可选 `service_mode`（FIELD-GAP-016，不挡打勾）                    |
| `stores/cart.ts`              | 下单/支付          | ✅mock | `customer_coupon_id` 预留字段；真契约 CreateOrder 尚无券字段 → 真后端需补（FIELD-GAP-015）                                        |


---



## 表 3 缺口清单

上一版行号作废。本表为对本版离线文档的全量重盘。

### A. FE-NEED


| ID          | 能力                  | 触发界面                 | 建议路径（提案，禁止调用）                                               | 级别  | 临时方案                                  | 状态               |
| ----------- | ------------------- | -------------------- | ----------------------------------------------------------- | --- | ------------------------------------- | ---------------- |
| FE-NEED-001 | 顾客如何得到 `store_id`   | 首页门店条 / 菜单 / 加购 / 下单 | `GET /api/mp/stores`                                        | 关闭  | DEV-009 / DEV-012                     | ✅ 关闭（顾客端列表）      |
| FE-NEED-002 | 会员等级列表与权益           | 会员 Tab「等级权益」         | 例如 `GET /api/mp/member/tiers`                               | P1  | 保留 Mock tiers                         | ❓ 仍缺接口；会员页用 Mock |
| FE-NEED-003 | 积分 / 成长值 / 余额 / 下一档 | 会员英雄卡                | 扩展资料或资产接口                                                   | P1  | 占位 0                                  | ❓ 仍缺字段；UI 占位     |
| FE-NEED-004 | 规格改选实时单价（原 quote）   | 规格 Sheet             | **前端本地算**菜单 `sale_price`+`price_delta`；支付时后端按购物车权威重算                   | P0  | 已落地 `utils/pricing.ts`；停用 quote 主路径                 | ✅ 前端本地试算  |
| FE-NEED-005 | 结账预览 / 用券           | 确认单                  | **前端本地满减试算** + 下单带 `customer_coupon_id`；mock 内核销；真后端需补 CreateOrder 用券 | P0  | 已落地 mine + 本地试算；预留 `POST /coupons/redeem` | ✅mock（预留字段） |


登录 / 下单 / 支付 / 订单列表：文档**都有已实现接口**，不因缺接口记 P0。本轮 P0 新增的是**已删调试 path 与真契约错位**。

### B. BE-UNUSED


| ID            | 签名                                                                     | 为何没有调用点                                                           | 建议             | 相对上一版                        |
| ------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- | ---------------------------- |
| BE-UNUSED-001 | `POST /api/mp/auth/bind-phone`                                         | 无绑手机按钮                                                            | 延后             | 入参增 `wx_phone_code`          |
| BE-UNUSED-002 | `PUT /api/mp/auth/profile`、规划 `PUT /member/profile`                    | 无编辑资料                                                             | 延后             | 本轮未变                         |
| BE-UNUSED-003 | `/api/mp/addresses` 五条 + 规划 member/addresses                           | **已接已实现五条（✅mock）**：edit + session hydrate；规划 member/addresses 仍禁止 | 规划侧仍延后      | DELETE 无独立 UI；规划地址勿接      |
| BE-UNUSED-004 | `GET /api/mp/tables/resolve`                                           | 无扫码入口；Query `qr_token`                                            | 延后             | 本轮未变                         |
| BE-UNUSED-005 | `PUT /api/mp/cart`                                                     | **契约无整车覆盖**                                                       | 从缺口删除，勿再封装     | **路径仍不存在**                   |
| BE-UNUSED-006 | `PUT /api/mp/cart/items/{id}`                                          | 购物袋只读无步进                                                          | 延后             | 本轮未变                         |
| BE-UNUSED-007 | `DELETE /api/mp/cart/items/{id}`                                       | 无删除                                                               | 延后             | 本轮未变                         |
| BE-UNUSED-008 | `POST /api/mp/cart/clear`                                              | 无清空                                                               | 延后             | 入参可带 `service_mode`          |
| BE-UNUSED-009 | `GET /api/mp/orders/{id}`                                              | 订单卡无点击                                                            | 延后             | 本轮未变                         |
| BE-UNUSED-010 | `POST .../cancel`                                                      | 无取消按钮                                                             | 延后             | 本轮未变                         |
| BE-UNUSED-011 | `POST /api/mp/payments/prepay`                                         | 已并入确认单提交支付（✅mock）                                                 | 关闭（✅mock）      | DEV-011                      |
| BE-UNUSED-012 | 微信支付/退款 notify + `/api/mp/wechat/message`                              | 微信服务器                                                             | C 端禁止调         | 增 wechat message             |
| BE-UNUSED-013 | `POST .../refund`、`.../refund/cancel`、`GET /refunds*`                  | 无退款入口                                                             | 延后             | 本轮未变                         |
| BE-UNUSED-016 | `GET /api/mp/mall`、`GET .../mall/products/{id}`（规划 list 除外）            | 无商城 UI                                                            | 延后             | 目录/详情已实现；list 仍规划            |
| BE-UNUSED-017 | 已实现卡券 `available`/`claim`/`mine`/`mine/{id}`                           | **available/claim 已接礼遇匣（✅mock）**；确认单已接 `mine` 本地试算；**mine/{id} GET/DELETE UI 仍延后**  | mine 详情/作废延后 | 替换点 `couponApi.ts` + `pages/coupons` |
| BE-UNUSED-018 | 规划 `takeaway/quote`                                                    | 本期不实现                                                             | 延后             | 本轮未变                         |
| BE-UNUSED-019 | `POST /api/mp/files/upload`、`POST /api/mp/auth/avatar`                 | 无上传头像                                                             | 延后             | 本轮未变                         |
| BE-UNUSED-020 | `GET /api/mp/stores`                                                   | ~~曾因走 admin 未用~~ → 已接选店/荐店（✅mock）                                 | 关闭             | DEV-012                      |
| BE-UNUSED-021 | `POST /api/mp/auth/wx-precheck`                                        | 登录是一键，无预检 UI                                                      | 延后；不要为用上它加步骤   | 本轮未变                         |
| BE-UNUSED-022 | `POST /api/mp/tables/{id}/occupy`                                      | 无占桌入口                                                             | 延后             | 本轮未变                         |
| BE-UNUSED-023 | `GET /api/mp/delivery/channels`、`POST .../quote`、`GET .../orders/{id}` | 无外卖询价/配送进度 UI                                                     | 延后             | 增配送进度查询                      |
| BE-UNUSED-024 | `POST /api/mp/payments/mock-paid`                                      | 已并入 `settlePayment`（✅mock，无独立 UI）                                 | 关闭（✅mock）      | DEV-011                      |
| BE-UNUSED-025 | `GET /api/mp/cart/overview`                                            | 无总览 UI                                                            | 延后             | **新增**                       |
| BE-UNUSED-026 | `POST /api/mp/orders/{id}/receive`                                     | 无确认收货按钮                                                           | 延后             | **新增**                       |
| BE-UNUSED-027 | `.../logistics`、`.../logistics/refresh`                                | 无物流 UI                                                            | 延后             | **新增**                       |
| BE-UNUSED-028 | `/api/mp/returns*`                                                     | 无退货 UI                                                            | 延后             | **新增**                       |
| BE-UNUSED-029 | `GET /api/mp/location/config`                                          | 定位未读后端配置                                                          | 延后             | **新增**                       |




### C. FIELD-GAP


| ID            | 界面            | 对接    | 文档有                                                               | UI 要             | 处理 / 问题原因                                                                              |
| ------------- | ------------- | ----- | ----------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| FIELD-GAP-001 | 登录            | ✅mock | `token`+`userinfo`；无 `expiresIn`/`mock`                           | 旧 LoginResult    | **mock 跑通**已对齐；`platform` 不发送；店员双身份字段忽略                                                |
| FIELD-GAP-002 | 会员 / 我的       | ❓     | `/me` 有昵称/卡号/等级 id                                                | 英雄卡 + 等级列表       | **原因：**规划 Member 无积分余额；等级权益无接口（FE-NEED-002/003），UI 占位                                  |
| FIELD-GAP-003 | 首页品牌 / 仪式     | ❓     | 店名/营业时间来自 StoreRes                                                | 元气善筑品牌区 + 四仪式    | **原因：**文档无 tagline/belief/Ritual，仍用本地文案                                                |
| FIELD-GAP-004 | 点单筛选          | ✅mock | `category_name`                                                   | 分类 chip          | **mock 跑通**已改用文档分类                                                                     |
| FIELD-GAP-005 | 规格 Sheet      | ❓     | `skus` + `option_groups`；**quote path 已删**                        | 杯型/温度/加料 + 实时价   | **有规格：**前端本地 `sale_price`+`price_delta`（FE-NEED-004 ✅）。**无规格：**本地 +¥3；英文/故事占位                             |
| FIELD-GAP-006 | 首页距离          | ❓     | MpStoreRes 有 `distance_km`（传 lat/lng 时）                           | `brand.distance` | **原因：**有坐标走后端 `distance_km`；无坐标则「—」或前端回落自算                                             |
| FIELD-GAP-007 | 订单状态 / 模式     | ❓     | OrderRes description 已给 integer 含义                                | 制作中/待取餐/已完成等     | **不打勾：**前端 `orderEnums` 与文档枚举 **未齐**（`0`待支付/`1`制作中… 且 `2=PACK`；文档 `1`待支付…`3`制作中，无自取=2） |
| FIELD-GAP-008 | 信封            | ✅mock | 已实现 `code===0`                                                    | 拦截器              | **mock 跑通且对齐**；业务 401xx 清会话                                                            |
| FIELD-GAP-009 | 购物袋计价         | ✅mock | CartRes 服务端金额                                                     | 合计               | **mock 跑通且对齐**；有 remote 时用 `payable_amount`                                            |
| FIELD-GAP-010 | 图片            | ❓     | `cover_image_path` / files 流                                      | 商品图              | **原因：**前端拼 `VITE_API_BASE_URL + path`，未验证是否等于 `GET /api/files/{file_key}`              |
| FIELD-GAP-011 | `store_id` 类型 | ✅mock | mp 列表 `store_id` string；菜单/购物车要 integer                           | 同一当前店            | **mock 跑通**；`toStoreId` 已按契约做 string→int。真后端联调仍需确认 string 形如纯数字                        |
| FIELD-GAP-012 | 「切换」列表容器      | ✅mock | 分页列表                                                              | 二字按钮             | **mock 跑通已闭环：**DEV-013 选店页；数据源 `GET /api/mp/stores`                                    |
| FIELD-GAP-013 | admin 列表鉴权    | ✅     | —                                                                 | —                | **关闭：**顾客端已不再调 `/api/admin/stores`（DEV-012）                                            |
| FIELD-GAP-014 | 规格询价          | ✅     | **无** `POST /api/mp/cart/quote`（约定前端本地算）                        | 改规格实时价           | **已关闭主路径询价**；菜单字段本地试算 → FE-NEED-004                                              |
| FIELD-GAP-015 | 结账用券          | ✅mock | 真 `coupons/mine` 已实现；**无** `checkout/preview`；下单**真契约尚无**券字段 | 选券实时应付           | **前端本地试算 + mock 预留 `customer_coupon_id`/核销**；真 CreateOrder 用券仍待后端补                    |
| FIELD-GAP-016 | 读购物车          | ✅mock | Query 可选 `service_mode`                                           | 按履约模式分车          | **mock 跑通且 CartRes 对齐**；未传可选 `service_mode`（能力缺口，不挡 DTO 打勾）；`GET /cart/overview` 未接    |


---



## 编码进度（2026-08-14 按离线契约重盘 · mock 打勾）

依据：仓库 `mock/server.mjs` + `mock/smoke-test.mjs` 及前端调用点。  
**打勾前提：** mock 可通 **且** 前端入出参与真契约 DTO 对齐。契约已删 / DTO 未齐 → 只记 `❓`，即使 mock 请求 200。

### ✅mock 已对接（mock 跑通 + DTO 对齐）

1. 信封 `code === 0` + `http` PUT/DELETE（对 mock）
2. `POST /api/mp/auth/wx-login`、`GET /api/mp/auth/me`、`POST /api/mp/auth/logout`
3. `GET /api/mp/stores`、选店页、外卖荐店（DEV-012/013/014）
4. `GET /api/mp/stores/{id}/menu`、点单分类 chip、招牌精选打开规格
5. `GET /api/mp/cart`、`POST /api/mp/cart/items`
6. `POST /api/mp/payments/prepay`、`POST /api/mp/payments/mock-paid`
7. `GET /api/mp/coupons/mine`（`list` + `customer_coupon_id`）；确认单本地满减试算
8. `POST /api/mp/orders`（预留 `customer_coupon_id` / `client_payable_amount`；mock 下单内核销）
9. 预留 `POST /api/mp/coupons/redeem`（mock；正式建议下单自动核销）
10. 规格实时价：菜单 `sale_price`+`price_delta` 本地算（不再依赖已删 quote）
11. `/api/mp/addresses` 五条：`pages/address/edit` + `session.hydrateDeliveryAddressFromApi`（BE-UNUSED-003）
12. `GET /api/mp/coupons/available`、`POST /api/mp/coupons/claim`：`pages/coupons`（BE-UNUSED-017 部分；mine/{id} 仍未接）



### ❓ mock 请求能通，但 DTO/契约未齐（不打勾）


| 接口 / 能力                                        | 对接    | 原因                                                                      |
| ---------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| `POST /api/mp/cart/quote`                      | —     | **契约已删**；前端主路径已停用（FIELD-GAP-014 / FE-NEED-004 ✅）                        |
| `POST /api/mp/checkout/preview`                | —     | **契约已删**；前端主路径已停用（FIELD-GAP-015 / FE-NEED-005 ✅mock）                    |
| `POST /api/mp/orders` 真契约用券字段                  | ❓     | mock 已预留 `customer_coupon_id`；**真 CreateOrderReq 仍无券字段**（FIELD-GAP-015） |
| `GET /api/mp/orders`                           | ❓     | `orderEnums` 与 OrderRes description 枚举未齐（FIELD-GAP-007）                 |
| `GET /api/mp/stores/{id}/menu`                 | ✅mock | 菜单 DTO 对齐已拉；品牌仪式/英文故事为 UI 占位，非入出参 DTO（FIELD-GAP-003/005/010）            |
| `POST /api/mp/cart/items` / `GET /api/mp/cart` | ✅mock | 加购/读车 DTO 对齐；无规格本地 +¥3、未传可选 `service_mode` 为行为缺口                        |
| 会员 / 我的资料                                      | ❓     | 仅 `/me` 昵称卡号；积分等级 Mock/占位（FE-NEED-002/003）                              |




### — 本轮未接 / 悬置

1. 真微信商户支付（仍用 mock-paid）
2. 真后端验收（上表 `✅mock` 均未升格为真契约 `✅`）

选店列表页 — DEV-013 已闭环（✅mock）  
卡券领取 UI（available/claim）/ 地址 API — **本轮已接 ✅mock**；`mine/{id}` GET/DELETE、商城 / 退货退款 / 物流 / cart overview / location config — 均未接  

禁止对接规划 `GET /api/mp/menu` 的 `specs/addons` 去替代已实现菜单。  
已删 `cart/quote`、`checkout/preview`：前端主路径已改为本地试算，勿再作为主流程依赖。

---



## P0 与主流程

**主流程：登录/选店/菜单/购物车/确认单本地计价为** `✅mock`**；下单带预留用券字段为** `✅mock`**（真契约用券字段仍待补）；支付为** `✅mock`**（prepay + mock-paid）。**


| ID                   | 说明                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------- |
| ~~P0 / FE-NEED-001~~ | **本轮关闭**：列表接口已有；产品指定走 mp 列表                                                        |
| P0 / DEV-010         | **半闭环：**用券 mock 预留已通；真 CreateOrder 用券 + `orderEnums` 仍待齐（FIELD-GAP-007/015） |
| P0 / DEV-011         | **✅mock 半闭环。** `prepay` + `mock-paid`；真商户支付未接                                      |
| ~~P0 / DEV-013~~     | **已闭环**（选店页 + `GET /api/mp/stores`，✅mock）                                          |
| P0 / FIELD-GAP-007   | 文档已给整数含义；前端 mock 对照未改 → **不打勾**                                                    |
| ~~P0 / FIELD-GAP-014~~ | **已关闭主路径：**规格本地试算（FE-NEED-004）                                               |
| P0 / FIELD-GAP-015   | 前端/mock 已本地试算 + 预留核销；**真 CreateOrder 用券字段仍待后端**                                     |


登录 / 读车 / 加购 / 确认单选券试算 / mock 下单核销 **可以** `✅mock`；真后端用券字段与订单状态映射 **仍待齐**。

---



## 待裁定（`docs/DEVIATION_LOG.md`）


| ID      | 状态                                                    |
| ------- | ----------------------------------------------------- |
| DEV-009 | **已闭环（✅mock）**：切换/选店走 `GET /api/mp/stores`            |
| DEV-010 | **半闭环·有隐患（❓）**：下单 mock 能通，但枚举/`coupon_id` 与真契约 DTO 未齐 |
| DEV-011 | **半闭环·有隐患（✅mock）**：prepay + mock-paid；真商户支付未接         |
| DEV-012 | **已闭环（✅mock）**：平替为 `GET /api/mp/stores`，不再调 admin     |
| DEV-013 | **已闭环（✅mock）**：选店页已实现                                 |


未写入业务分支或注释。