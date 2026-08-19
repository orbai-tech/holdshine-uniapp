# API 缺口盘点（顾客端）

> 契约源已换：离线 Swagger SHA `439cd7d8…`（2026-08-14 对照 `holdshine-api-swagger-offline`）。  
> 上一版 SHA `93859b11…`（2026-08-11）**作废**。  
> **对接标记（2026-08-15 维护，对照当前** `src/`**）：**  
>
> - `✅` = 已前后端对接且有真实调用点（相对真契约路径）  
> - `✅mock` = **仅 mock 跑通**，且前端类型/入出参与**真契约 DTO 对齐**（仓库 `mock/` + smoke/前端联调可通；**不是**真后端验收）。**DTO 未齐或契约已删 → 禁止打勾**，一律 `❓`  
> - `❓` = 已有请求/调用点，但仍有问题（含：mock 请求能通但 **DTO 未对齐**、path 已从契约删除、枚举对照错误等；原因写在同行）  
> - 无标记 / `—` = 未接 / 本轮不做 / 产品排除（**不是遗漏**；见下「产品排除」与 BE-UNUSED）  
> DEV-010 / **FIELD-GAP-015 已关闭（✅mock + 前端 DTO）：**`coupons/usable` 选券 + `CreateOrderReq` 传 `customer_coupon_id` + `client_token`；展示价前端本地试算；无 `checkout/preview` / 无 `client_payable_amount`。FIELD-GAP-007 枚举 **已对齐**（读侧 1–5；写路径 UI 自取→堂食 1，见 DEV-010）。DEV-013 选店页 **已闭环**。FE-NEED-004/005 已改为本地试算。  
> **产品排除（2026-08-15 确认，C 端本期不做 UI / 不封装）：** 整段售后退款（`…/refund`*、`GET /refunds`*）；确认收货；礼品物流；退货（`/returns*`）；商城加购/下单/支付/履约；卡券 DELETE 作废；`wx-precheck`（勿为接它加预检步骤）。堂食主路径与选物**仅浏览**不受影响。  
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
| 文档自述    | **已实现接口已从后端 FastAPI 同步，摘要带【已实现】；未标注路径为历史规划，不要按规划字段对接已实现接口。** 管理后台 `/api/admin/`*；小程序* `/api/mp/`（顾客/店员按角色）；HTTP 恒 200；业务成败看 `code`/`is_success`；P0=堂食闭环，P1=商城/卡券，P2=外卖预留。状态枚举见文档站 `/plans/enums`。 |


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
- **下单：** `CreateOrderReq` 含 `customer_coupon_id?` + 必填 `client_token`；前端/mock 已对齐；mock 下单内自动核销（前端不调 redeem）。
- **购物车：** `GET /api/mp/cart` 增加可选 Query `service_mode`；清空入参可带 `service_mode`。
- **枚举：** `OrderRes.order_status` / `service_mode` 的 schema description 已写整数含义；前端 `orderEnums` **已对齐**（FIELD-GAP-007）；读侧含 `2` 自提、`5` 月卡；写路径 UI 自取仍映射堂食 `1`（DEV-010）。
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


| 分组                                                                                   | 条数      | 不展开                                                                                                |
| ------------------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------- |
| 管理员端 / 后台（`/api/admin/*`）                                                            | **87**  | 全部不读字段、不建类型、不写函数、不记 FE-NEED                                                                        |
| 本轮排除：店员端（`/api/mp/staff/*`、`/api/mp/mall-staff/*`、`mp-staff*`、`wx-login/staff-kind`） | **56+** | 堂食店员 + 商城店员目录/库存/订单/退款/退货；`POST .../delivery/.../dispatch` 虽挂 `mp-delivery` 但是**店员手动呼叫**，顾客端不调     |
| 系统探针 / 微信服务器回调                                                                       | **若干**  | `GET /api/system/health`、`GET /api/system/version`；支付 notify；`/api/system/wechat/message`；定位 config 顾客端不接 |
| **产品排除（顾客端已实现 path，本期无 UI）**（2026-08-15）                                             | **13+** | 售后退款 013；确认收货 026；物流 027；退货 028；券 DELETE 017；`wx-precheck` 021；商城加购/支付/履约 016；详见编码进度「后端已实现·前端无 UI」 |


---



## 表 1 文档清单（本轮范围内）

鉴权列：已实现接口多为 `inherit` + 可选 `authorization` Header；规划接口多为显式 `bearer`。下表「已实现」以文档 description/summary 为准。

### 产品破例（管理端 1 条）— 已撤销


| 路径                  | 方法  | 已实现 | 对接  | 关键请求 / 响应                            | 端别 / 问题说明 |
| ------------------- | --- | --- | --- | ------------------------------------ | --------- |
| `/api/admin/stores` | GET | 是   | —   | 原破例；顾客端已改走 `/api/mp/customer/stores`（DEV-012） | **不再对接**  |




### 顾客端 / 多端共用


| 路径                                             | 方法     | 已实现         | 对接    | 关键请求 / 响应                                                                                                      | 说明                                                                                                                                                          |
| ---------------------------------------------- | ------ | ----------- | ----- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/mp/auth/wx-precheck`                     | POST   | 是           | —     | 入：`code*` `login_role`                                                                                         | **产品排除。** BE-UNUSED-021；登录已一键，**勿为接它加预检 UI**                                                                                                                |
| `/api/mp/auth/wx-login`                        | POST   | 是           | ✅mock | 入：`code*`；须 `agree_privacy_policy`/`privacy_policy_version` + `agree_user_handbook`/`user_handbook_version`。出：`token` + `userinfo`（含 `need_reconsent`） | **mock 跑通。** 路径现为 `POST /api/mp/customer/auth/wx-login`；登录弹层拉 legal 版本后提交；**不接** `wx-precheck` |
| `/api/mp/auth/me`                              | GET    | 是           | ✅mock | 出：MpUserInfoRes（含 `need_reconsent`）                                                                          | **mock 跑通。** `App.vue` 回前台 `verifySession`；升版后弹重签，**不清 token**                                                                                  |
| `/api/mp/auth/profile`                         | PUT    | 是           | ✅mock | 入：`nickname` `avatar_path`                                                                                     | **mock 跑通。** 我的 · 编辑昵称 → `updateProfile`（BE-UNUSED-002）                                                                                                     |
| `/api/mp/auth/avatar`                          | POST   | 是           | ✅mock | multipart `file*`                                                                                              | **mock 跑通。** 我的 · 点头像 → `uploadAvatar`（BE-UNUSED-019）                                                                                                       |
| `/api/mp/auth/bind-phone`                      | POST   | 是           | ✅mock | 入：`mobile*`；可选 `wx_phone_code`                                                                                 | **mock 跑通。** 我的 · 手机号行：MP `getPhoneNumber` / H5 手输 → `bindPhone`（BE-UNUSED-001）                                                                             |
| `/api/mp/auth/logout`                          | POST   | 是           | ✅mock | `data` 可空                                                                                                      | **mock 跑通。** 我的 · 退出 → `session.logout`                                                                                                                     |
| `/api/mp/customer/legal/documents`             | GET    | 是           | ✅mock | 出：`list[]` 含 `doc_type` 2/3、`title`、`version`、`content_html`                                                | **mock 跑通。** 登录弹层打开时拉当前版本；勾选后写入 wx-login                                                                                                           |
| `/api/mp/customer/legal/documents/{doc_type}`  | GET    | 是           | ✅mock | 出：`title` `version` `content_html`；`pdf_url` 可选                                                              | **mock 跑通。** `pages/legal/privacy`（2）/ `terms`（3）页内 rich-text；失败回落本地静态文案                                                                              |
| `/api/mp/member/profile`                       | GET    | 否（规划）       | —     | 规划字段                                                                                                           | **禁止对接。** 会员摘要走已实现 `GET /api/mp/customer/member/summary`                                                                                                     |
| `/api/mp/member/profile`                       | PUT    | 否（规划）       | —     | —                                                                                                              | 未接                                                                                                                                                          |
| `/api/mp/member/addresses` 四条                  | *      | 否（规划）       | —     | —                                                                                                              | **禁止对接**；已实现地址见 `/api/mp/customer/addresses`                                                                                                                |
| `/api/mp/customer/member/summary`              | GET    | 是           | ✅mock | 出：`level_name` `expires_at` `remaining_days` `available_points` `coffee_discount_rate`                           | **mock 跑通。** 我的英雄卡 + `session.refreshMemberRates` 结账折扣；**不造**成长值/储值余额字段                                                                              |
| `/api/mp/customer/member/levels`               | GET    | 是           | ✅mock | 出：`list[]` 含 `monthly_price` `action_type` `purchasable` `pay_amount`                                         | **mock 跑通。** 我的可购档位；benefits 无 list 时回落本接口                                                                                                           |
| `/api/mp/customer/member/benefits`             | GET    | 是           | ✅mock | 出：`current` + `levels` + `description`                                                                        | **mock 跑通。** 我的页一整包主请求（摘要/档位/权益文案）                                                                                                              |
| `/api/mp/customer/member/subscribe`            | POST   | 是           | ✅mock | 入：`target_level_id*` `client_token*`；出含 `order_id` `action_type`                                              | **mock 跑通。** 开通/续费/升档 → `prepay` + `settlePayment`；待支付记录可续付                                                                                         |
| `/api/mp/customer/member/subscriptions`        | GET    | 是           | ✅mock | 出：`list[]` 含 `pay_status` `pay_amount`                                                                       | **mock 跑通。** 我的 · 月卡购买记录 Sheet                                                                                                                          |
| `/api/mp/customer/points/account`              | GET    | 是           | ✅mock | 出：`available_points`                                                                                          | **mock 跑通。** 我的英雄卡积分优先本接口，缺省回落 summary.available_points                                                                                             |
| `/api/mp/customer/points/ledger`               | GET    | 是           | ✅mock | Query：`page` `page_size`；出流水 `change_points` `remark`                                                        | **mock 跑通。** `pages/points` 积分明细                                                                                                                           |
| `/api/mp/customer/stores`                      | GET    | 是           | ✅mock | Query：`page` `page_size` `keyword` `latitude` `longitude`；出含 `distance_km`；`store_id` 为 **string**             | **mock 跑通。** 现行 `GET /api/mp/customer/stores`；`ensureStore` / 选店页 / 外卖荐店 → `listMpStores`（DEV-012）；`store_id` 类型见 FIELD-GAP-011                              |
| `/api/mp/customer/stores/{store_id}`           | GET    | 是           | ✅mock | MpStoreDetailRes                                                                                               | **mock 跑通。** 现行 `GET /api/mp/customer/stores/{store_id}`；首页门店条 / 选店「详情」→ `getStoreDetail` → 门店详情 Sheet                                                     |
| `/api/mp/customer/stores/{store_id}/menu`      | GET    | 是           | ✅mock | MpMenuRes：分类+商品+skus+option_groups                                                                             | **mock 跑通。** 现行 `GET /api/mp/customer/stores/{store_id}/menu`。首页/点单 `catalog.ensureLoaded`。**仍有问题：**① 品牌信念/仪式仍本地占位（FIELD-GAP-003）；② 英文名/故事/场景缺字段占位（FIELD-GAP-005）；③ 封面靠 `resolveMediaUrl` 拼主机（FIELD-GAP-010） |
| `/api/mp/menu`                                 | GET    | 否（规划）       | —     | 旧 specs/addons                                                                                                 | **禁止对接**；用已实现门店菜单                                                                                                                                           |
| `/api/mp/customer/tables/resolve`              | GET    | 是           | ✅mock | Query：`qr_token*`                                                                                              | **mock 跑通。** 现行 `GET /api/mp/customer/tables/resolve`；首页 · 扫桌码 → `resolveTable`（BE-UNUSED-004）；非空闲 toast 不进点单                                            |
| `/api/mp/customer/tables/{table_id}/occupy`    | POST   | 是           | ✅mock | 占桌                                                                                                             | **mock 跑通。** 现行 `POST /api/mp/customer/tables/{table_id}/occupy`；resolve 成功后立刻 `occupyTable`（BE-UNUSED-022）；session 写 `tableId`/`tableCode`/`tableName`     |
| `/api/mp/customer/stores/{store_id}/tables/available` | GET | 是        | ✅mock | 堂食可选桌                                                                                                          | **mock 跑通。** 现行 `GET /api/mp/customer/stores/{store_id}/tables/available`；确认单堂食选桌已接，**不做新 UI**                                                               |
| `/api/mp/customer/cart`                        | GET    | 是           | ✅mock | Query：`store_id*` `service_mode?`。出：CartRes                                                                    | **mock 跑通。** 现行 `GET /api/mp/customer/cart`；打开购物袋 → `cart.refreshCart`（传当前履约 `service_mode`，FIELD-GAP-016）                                                |
| `/api/mp/customer/cart/overview`               | GET    | 是           | ✅mock | 出：`dine_in`/`takeaway`/`mall`                                                                                  | **mock 跑通。** 现行 `GET /api/mp/customer/cart/overview`；购物袋 Sheet 堂食/外卖分段角标 → `getCartOverview`（BE-UNUSED-025；`mall` 桶不展示）                                |
| `/api/mp/customer/cart/quote`                  | —      | **文档已删除**   | —     | 前端主路径已停用；mock 仍保留 handler 供旧脚本                                                                                 | **前端本地试算：**规格 Sheet 用菜单 `sale_price`+`price_delta`（FE-NEED-004 / FIELD-GAP-014）；**不接回主路径**                                                                  |
| `/api/mp/customer/cart/items`                  | POST   | 是           | ✅mock | 入：`store_id*` `product_id*` `sku_id` `option_ids` `quantity` `table_id?` `service_mode?`                       | **mock 跑通。** 现行 `POST /api/mp/customer/cart/items`。规格 Sheet「加入购物袋」。**仍有问题：**无文档规格时仍回落本地杯型/温度/加料 +¥3（FIELD-GAP-005）                                              |
| `/api/mp/customer/cart/items/{item_id}`        | PUT    | 是           | ✅mock | 入：`quantity*`                                                                                                  | **mock 跑通。** 现行 `PUT /api/mp/customer/cart/items/{item_id}`；购物袋步进 → `cart.changeRemoteQty` → PUT（BE-UNUSED-006 关闭）                                          |
| `/api/mp/customer/cart/items/{item_id}`        | DELETE | 是           | ✅mock | —                                                                                                              | **mock 跑通。** 现行 `DELETE /api/mp/customer/cart/items/{item_id}`；qty→0 → `removeCartItem`；cart-sheet 减至 0（BE-UNUSED-007 关闭）                                     |
| `/api/mp/customer/cart/clear`                  | POST   | 是           | ✅mock | 入：`store_id*` `service_mode?`                                                                                  | **mock 跑通。** 现行 `POST /api/mp/customer/cart/clear`；cart-sheet「清空」→ `clearRemoteCart`（BE-UNUSED-008 关闭）                                                          |
| `/api/mp/orders`                               | POST   | 是           | ✅mock | 入：`client_token*` `customer_coupon_id?`；购物车下单；mock 幂等 + 下单内原子核销                                       | **mock 跑通且 DTO 对齐（FIELD-GAP-015 已关闭）。** 展示价前端本地试算；正式核销「下单自动」                                                                                       |
| `/api/mp/orders`                               | GET    | 是           | ✅mock | Query：`page` `page_size` `status` `service_mode`                                                               | **mock 跑通且枚举对齐。** `listMyOrders` 可选 status/service_mode；读侧 1–5；金额含 `member_discount_amount`/`coupon_amount` |
| `/api/mp/orders/{order_id}`                    | GET    | 是           | ✅mock | OrderRes                                                                                                       | **mock 跑通。** `pages/orders` 点卡 → Sheet → `getOrder`（BE-UNUSED-009）                                                                                          |
| `/api/mp/orders/{order_id}/cancel`             | POST   | 是           | ✅mock | 出 OrderRes；无 body                                                                                              | **mock 跑通。** 待支付卡/详情取消 → `cancelOrder`；仅 `order_status=1`（BE-UNUSED-010）                                                                                    |
| `/api/mp/orders/{order_id}/receive`            | POST   | 是           | —     | 顾客确认收货                                                                                                         | **产品排除（本期不做）。** BE-UNUSED-026；无确认收货 UI                                                                                                                      |
| `/api/mp/orders/{order_id}/logistics`          | GET    | 是           | —     | 礼品物流轨迹                                                                                                         | **产品排除（本期不做）。** BE-UNUSED-027；无物流 UI                                                                                                                        |
| `/api/mp/orders/{order_id}/logistics/refresh`  | POST   | 是           | —     | 主动拉微信轨迹                                                                                                        | **产品排除（本期不做）。** BE-UNUSED-027                                                                                                                               |
| `/api/mp/orders/{order_id}/refund`             | POST   | 是           | —     | 入：`reason`                                                                                                     | **产品排除（整段售后退款不做）。** BE-UNUSED-013；前端不封装、不调                                                                                                                  |
| `/api/mp/orders/{order_id}/refund/cancel`      | POST   | 是           | —     | —                                                                                                              | **产品排除。** BE-UNUSED-013                                                                                                                                     |
| `/api/mp/customer/payments/prepay`             | POST   | 是           | ✅mock | 入：`order_id*`                                                                                                  | **mock 跑通。** 现行 `POST /api/mp/customer/payments/prepay`；确认单提交支付 → `paymentApi.prepay`；返回带 `mock: true`                                                      |
| `/api/mp/customer/payments/mock-paid`          | POST   | 是           | ✅mock | 仅 mock                                                                                                         | **mock 跑通（本 path 即模拟支付）。** 现行 `POST /api/mp/customer/payments/mock-paid`；H5/devtools / mp mock 标记走 `settlePayment`                                          |
| `/api/system/payments/wechat/notify`           | POST   | 是           | —     | 微信服务器                                                                                                          | 非顾客端调用；现行 `POST /api/system/payments/wechat/notify`                                                                                                           |
| `/api/system/payments/wechat/refund-notify`    | POST   | 是           | —     | 微信服务器                                                                                                          | 非顾客端调用；现行 `POST /api/system/payments/wechat/refund-notify`                                                                                                    |
| `/api/mp/refunds`                              | GET    | 是           | —     | RefundRes[]；Query `order_id?`                                                                                  | **产品排除。** BE-UNUSED-013                                                                                                                                     |
| `/api/mp/refunds/{refund_id}`                  | GET    | 是           | —     | RefundRes                                                                                                      | **产品排除。** BE-UNUSED-013                                                                                                                                     |
| `/api/mp/refunds/wechat/notify`                | POST   | 否（规划）       | —     | —                                                                                                              | 非顾客端                                                                                                                                                        |
| `/api/mp/returns`                              | GET    | 是           | —     | 我的退货单                                                                                                          | **产品排除（本期不做）。** BE-UNUSED-028；无退货 UI                                                                                                                        |
| `/api/mp/returns/{return_id}/ship-back`        | POST   | 是           | —     | 回程运单                                                                                                           | **产品排除。** BE-UNUSED-028                                                                                                                                     |
| `/api/mp/returns/{return_id}/reship-prepay`    | POST   | 是           | —     | 寄回运费预下单                                                                                                        | **产品排除。** BE-UNUSED-028                                                                                                                                     |
| `/api/mp/returns/{return_id}/reship-mock-paid` | POST   | 是           | —     | 模拟支付寄回运费                                                                                                       | **产品排除。** BE-UNUSED-028                                                                                                                                     |
| `/api/mp/customer/mall`                        | GET    | 是           | ✅mock | 礼品商城目录；Query `store_id?`                                                                                       | **mock 跑通（仅浏览）。** 现行 `GET /api/mp/customer/mall`；选物 Tab → `getMallCatalog`；**加购/下单/履约产品排除**（BE-UNUSED-016）                                              |
| `/api/mp/customer/mall/products`               | GET    | 否（规划）       | —     | —                                                                                                              | 仍规划；目录用 `GET /api/mp/customer/mall`                                                                                                                           |
| `/api/mp/customer/mall/products/{product_id}`  | GET    | 是           | ✅mock | 礼品详情；Query `store_id?`                                                                                         | **mock 跑通（仅浏览）。** 现行 `GET /api/mp/customer/mall/products/{product_id}`；选物 Sheet → `getMallProduct`；**加购/支付/履约产品排除**（BE-UNUSED-016）                        |
| `/api/mp/coupons/mine`                         | GET    | 是           | ✅mock | Query：`coupon_status?`；出 `MyCouponListRes`（`list` + `counts` + `customer_coupon_id` + `template`）               | **mock 跑通且 DTO 对齐。** 礼遇匣状态筛选 + 角标；确认单 `listUsableCoupons` + 本地试算（BE-UNUSED-017）                                                                     |
| `/api/mp/coupons/usable`                       | GET    | 是           | ✅mock | Query：`store_id*` `goods_amount*`（原价）`service_mode?`；出可用性 + `unusable_reason`                                  | **mock 跑通。** 确认单选券 Sheet；折扣展示仍走 `pricing.ts` 本地试算（FIELD-GAP-015）                                                                                    |
| `/api/mp/coupons/available`                    | GET    | 是           | ✅mock | Query：`store_id?`（integer，可选）；出 `CouponTemplateListRes.list: CouponTemplateBriefRes[]`                         | **mock 跑通。** 无门店仍可拉可领模板；`pages/coupons` → `listAvailableCoupons`（BE-UNUSED-017）                                                                          |
| `/api/mp/coupons/claim`                        | POST   | 是           | ✅mock | 入：`coupon_template_id*`（int）`store_id?`；出 `MyCouponRes`                                                        | **mock 跑通。** `pages/coupons` → `claimCoupon`（BE-UNUSED-017）                                                                                                 |
| `/api/mp/coupons/mine/{customer_coupon_id}`    | GET    | 是           | ✅mock | 详情                                                                                                             | **mock 跑通。** 礼遇匣已领 → Sheet → `getMyCoupon`（BE-UNUSED-017）                                                                                                   |
| `/api/mp/coupons/mine/{customer_coupon_id}`    | DELETE | 是           | —     | 作废未使用券                                                                                                         | **产品排除。** C 端不开放作废 UI；前端不封装、不调（BE-UNUSED-017）                                                                                                               |
| `/api/mp/coupons/redeem`                       | POST   | **预留/mock** | ✅mock | 入：`customer_coupon_id`* `store_id?` `order_id?`；出：`status` `discount_amount`                                   | **文档暂无顾客端核销。** mock 预留；正式链路由 `createOrder` 内「下单自动核销」，前端主路径不强制先调                                                                                             |
| `/api/mp/checkout/preview`                     | —      | **文档已删除**   | —     | 前端主路径已停用；mock 仍保留 handler                                                                                      | **结账本地试算：**`mine` + `pricing.ts` 满减（FE-NEED-005 / FIELD-GAP-015）                                                                                            |
| `/api/mp/takeaway/quote`                       | POST   | 否（规划）       | —     | —                                                                                                              | BE-UNUSED-018                                                                                                                                               |
| `/api/mp/customer/addresses` 五条                | *      | 是           | ✅mock | AddressUpsertReq / AddressRes（`address_id` 出参 string，path int）                                                 | **mock 跑通。** 现行 `/api/mp/customer/addresses`（GET 列表 / POST 新增 / GET·PUT·DELETE `{id}`）；`pages/address/index` 列表选址/删除 + `edit` 按 id；session hydrate（BE-UNUSED-003） |
| `/api/mp/customer/delivery/channels`           | GET    | 是           | ✅mock | —                                                                                                              | **mock 跑通。** 现行 `GET /api/mp/customer/delivery/channels`；确认单外卖 → `listDeliveryChannels`（BE-UNUSED-023）                                                    |
| `/api/mp/customer/delivery/quote`              | POST   | 是           | ✅mock | 入：`store_id*` `address_id*` `product_amount?`                                                                  | **mock 跑通。** 现行 `POST /api/mp/customer/delivery/quote`；确认单询价计入运费/包装费；超距/未起送禁提交（BE-UNUSED-023）                                                          |
| `/api/mp/customer/delivery/orders/{order_id}`  | GET    | 是           | ✅mock | 即时配送进度                                                                                                         | **mock 跑通。** 现行 `GET /api/mp/customer/delivery/orders/{order_id}`；订单详情 Sheet 外卖进度 + 刷新（BE-UNUSED-023）                                                       |
| `/api/system/location/config`                  | GET    | 是           | —     | `prefer`/`enabled`                                                                                             | **顾客端不接。** 无 mp/customer 定位配置接口；`geo.getUserLocation` 用微信 `getLocation`（gcj02），距离走 `GET /api/mp/customer/stores?latitude&longitude`（BE-UNUSED-029） |
| `/api/mp/files/upload`                         | POST   | 否（规划）       | —     | multipart                                                                                                      | BE-UNUSED-019                                                                                                                                               |
| `/api/files/{file_key}`                        | GET    | 否（规划）       | —     | 图片流                                                                                                            | 未直接请求；封面靠拼 URL（FIELD-GAP-010）                                                                                                                               |




**OrderRes 文档枚举（schema description，2026-08-14）：**

- `order_status`：`1`待支付、`2`待接单、`3`制作中、`4`待取餐、`5`已完成、`6`已取消、`7`退款中、`8`已退款、`9`已拒单、`10`待发货、`11`已发货、`12`已签收  
- `service_mode`：`1`堂食、`2`自提、`3`外卖、`4`礼品快递、`5`会员月卡。**写路径** UI 自取经 `toServiceMode` 仍映射堂食 `1`（DEV-010）；列表/详情按返回值展示 `2`/`5`。

规划订单字符串枚举 schema（`OrderStatus` 等）仍在 components，**已实现接口以 integer + 上表为准**。

---



## 表 2 前端调用点

只记现有五 Tab、已有 Sheet、已有生命周期与已落地子页。对接列：`✅` / `✅mock` / `❓` / `—`（未接或无需接口）。


| 界面 / 符号                          | 用户动作或生命周期         | 对接    | 本版应对 / 问题原因                                                                                                                            |
| -------------------------------- | ----------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `App.vue` `onLaunch`             | 启动                | —     | `restoreSession()` 本地读 token，不发请求                                                                                                      |
| `App.vue` `onShow`               | 回前台               | ✅mock | **mock 跑通。** `verifySession` → `GET /api/mp/auth/me`                                                                                   |
| `pages/home/index` `onShow`      | 首页首屏              | ✅mock | **mock 跑通。** `ensureLoaded`：mp 选店 + 门店菜单。**仍有问题：**仪式/品牌文案仍本地占位（FIELD-GAP-003）；无定位时距离可能为「—」（FIELD-GAP-006）                              |
| `pages/home/index` **切换**        | 点击                | ✅mock | **mock 跑通。** 选店页 `pages/stores`（DEV-013）；数据源 `GET /api/mp/customer/stores`                                                            |
| `pages/home/index` 门店条左侧         | 点击                | ✅mock | **mock 跑通。** 门店详情 Sheet → `GET /api/mp/customer/stores/{id}`                                                                          |
| `pages/home/index` 去点单 / 全部      | 点击                | —     | 切 Tab，不拉店                                                                                                                              |
| `pages/home/index` 仪式卡片          | 点击                | ❓     | 仍用本地 ritual。**问题：**菜单分类是 `category_name`，无 ritual（FIELD-GAP-003/004）                                                                   |
| `pages/home/index` 招牌精选          | 点击                | ✅mock | **mock 跑通。** 商品来自门店菜单；`openProduct`                                                                                                    |
| `pages/home/index` 微信三按钮         | 无点击               | —     | DEV-005                                                                                                                                |
| `pages/menu/index` `onShow`      | 点单首屏              | ✅mock | **mock 跑通。** 同首页菜单。**仍有问题：**同 FIELD-GAP-003/005/010                                                                                    |
| `pages/menu/index` 分类 chip       | 点击                | ✅mock | **mock 跑通。** 用文档 `categories[].category_name` 本地筛                                                                                      |
| `product-card`                   | 点击                | ✅mock | **mock 跑通。** `openProduct`，不另打详情                                                                                                       |
| `pages/orders/index`             | 订单 Tab            | ✅mock | **mock 跑通。** `listMyOrders` + 点卡 Sheet `getOrder` + 待支付 `cancelOrder`（BE-UNUSED-009/010）；`orderEnums` 读侧 1–5（含自提/月卡）；写路径自取 UI→堂食见 DEV-010 |
| `pages/mine/index` `onShow`      | 我的                | ✅mock | **mock 跑通。** `getMemberBenefits` + `listMemberSubscriptions` + `getPointsAccount`；档位信 `purchasable`；subscribe 带 `client_token` → prepay/mock-paid |
| `pages/mine/index` 微信一键登录        | 点击                | ✅mock | **mock 跑通。** `POST /api/mp/customer/auth/wx-login`（consent 四字段）；协议页 `GET .../legal/documents/{2\|3}` |
| `pages/mine/index` 头像 / 昵称 / 手机号 | 点击                | ✅mock | **mock 跑通。** avatar / profile / bind-phone（BE-UNUSED-001/002/019）                                                                      |
| `pages/mine/index` 退出            | 点击                | ✅mock | **mock 跑通。** `POST /api/mp/auth/logout`                                                                                                |
| `pages/mine/index` 购物袋           | 点击                | ✅mock | **mock 跑通。** 打开 Sheet → `GET /api/mp/customer/cart`                                                                                    |
| `pages/mine/index` 礼遇匣           | 点击                | ✅mock | 进 `pages/coupons` → available/claim                                                                                                    |
| `pages/mine/index` 积分 / 积分明细     | 点击                | ✅mock | 英雄卡积分 + 列表「积分明细」→ `pages/points`；`GET .../points/account` + `ledger`（FE-NEED-003）                                              |
| `pages/points/index`               | 积分明细              | ✅mock | **mock 跑通。** 头部可用积分 + 流水分页；正负分着色                                                                                                |
| `pages/coupons/index`            | 礼遇匣               | ✅mock | **mock 跑通。** 可领 available/claim；已领 `listMyCoupons` + 详情 GET；**DELETE 作废产品排除**                                                          |
| `pages/select/index`             | 选物 Tab            | ✅mock | **mock 跑通（仅浏览）。** `getMallCatalog` + 分类 chip + 只读 Sheet `getMallProduct`；**加购/支付/履约产品排除**（BE-UNUSED-016）                               |
| `pages/address/index`            | 地址簿列表             | ✅mock | **mock 跑通。** `listAddresses` + 点选写入 session；编辑进 `edit?id=`；删除 → `removeAddress`（BE-UNUSED-003）                                         |
| `pages/address/edit`             | 新增/编辑地址           | ✅mock | **mock 跑通。** 无 id 空白新增；有 id → `getAddress`；create/update → `saveDeliveryAddress` + `navigateBack`                                      |
| `pages/mine/index` 收货地址          | 点击                | ✅mock | 进 `pages/address/index`                                                                                                                |
| `soorak-nav-bar` 购物袋             | 点击                | ✅mock | **mock 跑通。** 打开 Sheet → `GET /api/mp/customer/cart`                                                                                    |
| `soorak-product-sheet` 规格        | 选规格               | ✅     | **本地实时价：**`sale_price`+`price_delta`（`utils/pricing.ts`）；不再打已删 quote（FE-NEED-004）。无规格时本地 +¥3（FIELD-GAP-005）                            |
| `soorak-product-sheet` 加入购物袋     | 点击                | ✅mock | **mock 跑通且加购 DTO 对齐。** `POST /api/mp/customer/cart/items`（有履约态时带 `service_mode`）。**仍有问题：**无规格时本地回落 FIELD-GAP-005（非入参 DTO）              |
| `soorak-cart-sheet` 确认下单         | 点击                | ✅     | 仅导航 `/pages/checkout/index`；行规格 `formatItemSpec`（无 API）                                                                                |
| `soorak-cart-sheet` 履约分段         | 打开 / 切换           | ✅mock | **mock 跑通。** `GET /api/mp/customer/cart/overview` 角标 + 切 `fulfillmentMode` → `refreshCart`（BE-UNUSED-025；无商城 Tab）                     |
| `soorak-cart-sheet` 步进 / 清空      | 点击                | ✅mock | **mock 跑通。** ± → PUT；qty→0 → DELETE；「清空」→ `POST /api/mp/customer/cart/clear`（可带 `service_mode`）                                       |
| `pages/stores/index` 详情          | 点击                | ✅mock | **mock 跑通。** 门店卡「详情」→ `GET /api/mp/customer/stores/{id}` Sheet                                                                        |
| `utils/geo.ts` `getUserLocation` | 定位                | ✅     | 微信 `getLocation`（gcj02）；失败返回 null 用列表第一家。**不调** `GET /api/system/location/config`（BE-UNUSED-029）                                |
| `pages/checkout` 堂食选桌            | 点击                | ✅mock | **mock 跑通。** `GET /api/mp/customer/stores/{id}/tables/available`（确认单已接，**不做新 UI**）                                                    |
| `pages/checkout` 优惠券/合计          | 进入/选券             | ✅mock | **`GET /coupons/usable`**（原价 `goods_amount`）+ **`pricing.ts` 本地试算**展示应付；无 preview（FE-NEED-005 / FIELD-GAP-015）                              |
| `pages/checkout` 提交支付            | 点击                | ✅mock | `submitCheckout` 传 `customer_coupon_id` + `client_token`；mock 下单重算并核销；后续 prepay/mock-paid                                     |
| `stores/session.ts`              | 登录/退出/校验          | ✅mock | **mock 跑通。** 已实现 auth 路径；登录/`verifySession` 后轻量 `hydrateDeliveryAddressFromApi`（失败不挡）                                                  |
| `stores/catalog.ts`              | `ensureLoaded`    | ✅mock | **mock 跑通。** mp 列表 + 门店菜单；见上字段缺口                                                                                                       |
| `stores/cart.ts`                 | 加购 / 读车 / 改量 / 清空 | ✅mock | **mock 跑通且 cart DTO 对齐。** `addCartItem` / `getCart(service_mode?)` / PUT / DELETE / `clearCart`（FIELD-GAP-016）                         |
| `stores/cart.ts`                 | 下单/支付             | ✅mock | `createOrder` 传 `client_token` + `customer_coupon_id?`；FIELD-GAP-015 **已关闭**                                                                 |




---



## 表 3 缺口清单

上一版行号作废。本表为对本版离线文档的全量重盘。

### A. FE-NEED


| ID          | 能力                  | 触发界面                 | 建议路径（提案，禁止调用）                                                         | 级别  | 临时方案                                      | 状态               |
| ----------- | ------------------- | -------------------- | --------------------------------------------------------------------- | --- | ----------------------------------------- | ---------------- |
| FE-NEED-001 | 顾客如何得到 `store_id`   | 首页门店条 / 菜单 / 加购 / 下单 | `GET /api/mp/stores`                                                  | 关闭  | DEV-009 / DEV-012                         | ✅ 关闭（顾客端列表）      |
| FE-NEED-002 | 会员等级列表与权益           | 我的 · 摘要/可购档位         | `GET /api/mp/customer/member/benefits`（levels 回落独立 GET）                 | 关闭  | 已接档位 + 权益说明 + subscribe 支付           | ✅mock（并入我的页）   |
| FE-NEED-003 | 积分 / 剩余天数             | 我的英雄卡 / `pages/points` | `GET /api/mp/customer/points/account` + `ledger`；summary.available_points 回落 | 关闭  | 英雄卡积分+剩余天数；契约无成长值/储值余额独立字段，不造假     | ✅mock            |
| FE-NEED-004 | 规格改选实时单价（原 quote）   | 规格 Sheet             | **前端本地算**菜单 `sale_price`+`price_delta`；支付时后端按购物车权威重算                  | P0  | 已落地 `utils/pricing.ts`；停用 quote 主路径       | ✅ 前端本地试算         |
| FE-NEED-005 | 结账预览 / 用券           | 确认单                  | **前端本地满减试算** + 下单带 `customer_coupon_id`；mock 内核销；真后端需补 CreateOrder 用券 | P0  | 已落地 mine + 本地试算；预留 `POST /coupons/redeem` | ✅mock（预留字段）      |


登录 / 下单 / 支付 / 订单列表：文档**都有已实现接口**，不因缺接口记 P0。本轮 P0 新增的是**已删调试 path 与真契约错位**。

### B. BE-UNUSED


| ID            | 签名                                                                     | 为何没有调用点                                                                        | 建议                   | 相对上一版                                |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------- | ------------------------------------ |
| BE-UNUSED-001 | `POST /api/mp/auth/bind-phone`                                         | **已接** 我的 · 手机号（MP 授权 / H5 手输，✅mock）                                           | 关闭（✅mock）            | 入参增 `wx_phone_code`                  |
| BE-UNUSED-002 | `PUT /api/mp/auth/profile`、规划 `PUT /member/profile`                    | **已接** 我的 · 编辑昵称（✅mock）；规划 member/profile 仍禁止                                  | 关闭（✅mock）；规划延后       | 本轮接已实现 profile                       |
| BE-UNUSED-003 | `/api/mp/addresses` 五条 + 规划 member/addresses                           | **已接已实现五条（✅mock）**：列表选址/删除 + edit 按 id；session hydrate；规划 member/addresses 仍禁止 | 关闭（✅mock）；规划延后       | 列表/DELETE UI 已闭环                     |
| BE-UNUSED-004 | `GET /api/mp/tables/resolve`                                           | **已接** 首页 · 扫桌码（MP `scanCode` / H5 手输，✅mock）                                   | 关闭（✅mock）            | 本轮闭环                                 |
| BE-UNUSED-005 | `PUT /api/mp/cart`                                                     | **契约无整车覆盖**                                                                    | 从缺口删除，勿再封装           | **路径仍不存在**                           |
| BE-UNUSED-006 | `PUT /api/mp/cart/items/{id}`                                          | **已接** cart-sheet 步进（✅mock）                                                    | 关闭（✅mock）            | qty→0 走 DELETE                       |
| BE-UNUSED-007 | `DELETE /api/mp/cart/items/{id}`                                       | **已接** qty→0 / 删行（✅mock）                                                       | 关闭（✅mock）            | 本轮闭环                                 |
| BE-UNUSED-008 | `POST /api/mp/cart/clear`                                              | **已接** cart-sheet「清空」（✅mock）；入参可带 `service_mode`                               | 关闭（✅mock）            | 本轮闭环                                 |
| BE-UNUSED-009 | `GET /api/mp/orders/{id}`                                              | **已接** 订单卡 → Sheet 详情（✅mock）                                                   | 关闭（✅mock）            | 本轮闭环                                 |
| BE-UNUSED-010 | `POST .../cancel`                                                      | **已接** 待支付卡/详情取消（✅mock）；仅 status=1                                             | 关闭（✅mock）            | 已付售后见 BE-UNUSED-013（产品排除）            |
| BE-UNUSED-011 | `POST /api/mp/payments/prepay`                                         | 已并入确认单提交支付（✅mock）                                                              | 关闭（✅mock）            | DEV-011                              |
| BE-UNUSED-012 | 微信支付/退款 notify + `/api/mp/wechat/message`                              | 微信服务器                                                                          | C 端禁止调               | 增 wechat message                     |
| BE-UNUSED-013 | `POST .../refund`、`.../refund/cancel`、`GET /refunds*`                  | **产品排除**：整段售后退款不做；无退款入口、不封装                                                    | **产品排除·关闭**          | 2026-08-15 确认                        |
| BE-UNUSED-016 | `GET /api/mp/mall`、`GET .../mall/products/{id}`（规划 list 除外）            | **浏览已接（✅mock）**；加购/支付/履约 **产品排除**                                              | 浏览关闭；购买 **产品排除**     | 目录/详情已实现；list 仍规划                    |
| BE-UNUSED-017 | 已实现卡券 `available`/`claim`/`mine`/`mine/{id}` + DELETE                  | **available/claim/mine 列表/详情已接（✅mock）**；**DELETE 作废产品排除**；确认单已接 `mine` 本地试算    | 详情关闭；DELETE **产品排除** | 替换点 `couponApi.ts` + `pages/coupons` |
| BE-UNUSED-018 | 规划 `takeaway/quote`                                                    | 本期不实现（规划未落地）                                                                   | 延后                   | 本轮未变                                 |
| BE-UNUSED-019 | `POST /api/mp/files/upload`、`POST /api/mp/auth/avatar`                 | **avatar 已接** 我的 · 点头像（✅mock）；规划 files/upload 仍未接                              | avatar 关闭；files 延后   | 本轮接 auth/avatar                      |
| BE-UNUSED-020 | `GET /api/mp/stores`                                                   | ~~曾因走 admin 未用~~ → 已接选店/荐店（✅mock）                                              | 关闭                   | DEV-012                              |
| BE-UNUSED-021 | `POST /api/mp/auth/wx-precheck`                                        | 登录是一键，无预检 UI                                                                   | **产品排除**；勿为接它加步骤     | 2026-08-15 确认                        |
| BE-UNUSED-022 | `POST /api/mp/tables/{id}/occupy`                                      | **已接** 扫码入座后立刻占桌（✅mock）                                                        | 关闭（✅mock）            | 本轮闭环                                 |
| BE-UNUSED-023 | `GET /api/mp/delivery/channels`、`POST .../quote`、`GET .../orders/{id}` | **已接** 确认单询价 + 订单 Sheet 进度（✅mock）                                              | 关闭（✅mock）            | 本轮闭环；店员 dispatch 不接                  |
| BE-UNUSED-024 | `POST /api/mp/payments/mock-paid`                                      | 已并入 `settlePayment`（✅mock，无独立 UI）                                              | 关闭（✅mock）            | DEV-011                              |
| BE-UNUSED-025 | `GET /api/mp/cart/overview`                                            | **已接** 购物袋 Sheet 堂食/外卖分段角标（✅mock）；mall 桶 **故意不展示**（购买排除）                       | 关闭（✅mock）            | **本轮闭环**                             |
| BE-UNUSED-026 | `POST /api/mp/orders/{id}/receive`                                     | **产品排除**：无确认收货按钮                                                               | **产品排除·关闭**          | 2026-08-15 确认                        |
| BE-UNUSED-027 | `.../logistics`、`.../logistics/refresh`                                | **产品排除**：无物流 UI                                                                | **产品排除·关闭**          | 2026-08-15 确认                        |
| BE-UNUSED-028 | `/api/mp/returns*`                                                     | **产品排除**：无退货 UI                                                                | **产品排除·关闭**          | 2026-08-15 确认                        |
| BE-UNUSED-029 | `GET /api/system/location/config`                                      | **顾客端不接。** 定位用微信 `getLocation` + `GET /api/mp/customer/stores?latitude&longitude` | **产品排除·关闭**          | 无 mp/customer 定位配置接口                   |




### C. FIELD-GAP


| ID            | 界面            | 对接    | 文档有                                                                                                           | UI 要             | 处理 / 问题原因                                                                                                  |
| ------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| FIELD-GAP-001 | 登录            | ✅mock | `token`+`userinfo`；consent 四字段；`need_reconsent`                                                             | 旧 LoginResult    | **mock 跑通**已对齐；登录须带协议版本；升版后重签；`platform` 不发送                                                                 |
| FIELD-GAP-002 | 会员 / 我的       | ✅mock | `member/summary` 等级/有效期/积分；`levels`/`benefits` 档位权益；`points/account` 可用积分 | 英雄卡 + 等级列表       | **已闭环 ✅mock。** 无成长值/储值余额契约字段，英雄卡展示积分 + 剩余天数；subscribe 必带 `client_token` |
| FIELD-GAP-003 | 首页品牌 / 仪式     | ❓     | 店名/营业时间来自 StoreRes                                                                                            | 元气善筑品牌区 + 四仪式    | **原因：**文档无 tagline/belief/Ritual，仍用本地文案                                                                    |
| FIELD-GAP-004 | 点单筛选          | ✅mock | `category_name`                                                                                               | 分类 chip          | **mock 跑通**已改用文档分类                                                                                         |
| FIELD-GAP-005 | 规格 Sheet      | ❓     | `skus` + `option_groups`；**quote path 已删**                                                                    | 杯型/温度/加料 + 实时价   | **有规格：**前端本地 `sale_price`+`price_delta`（FE-NEED-004 ✅）。**无规格：**本地 +¥3；英文/故事占位                              |
| FIELD-GAP-006 | 首页距离          | ❓     | MpStoreRes 有 `distance_km`（传 lat/lng 时）                                                                       | `brand.distance` | **原因：**有坐标走后端 `distance_km`；无坐标则「—」或前端回落自算                                                                 |
| FIELD-GAP-007 | 订单状态 / 模式     | ✅mock | OrderRes description 已给 integer 含义                                                                            | 制作中/待取餐/已完成等     | **已对齐** `orderEnums`（状态 1–12；模式读侧 1–5）。写路径 UI 自取仍映射堂食 `1`（DEV-010），列表/详情识别 `2`/`5`                                  |
| FIELD-GAP-008 | 信封            | ✅mock | 已实现 `code===0`                                                                                                | 拦截器              | **mock 跑通且对齐**；业务 401xx 清会话                                                                                |
| FIELD-GAP-009 | 购物袋计价         | ✅mock | CartRes 服务端金额                                                                                                 | 合计               | **mock 跑通且对齐**；有 remote 时用 `payable_amount`                                                                |
| FIELD-GAP-010 | 图片            | ❓     | `cover_image_path` / files 流                                                                                  | 商品图              | **原因：**前端拼 `VITE_API_BASE_URL + path`，未验证是否等于 `GET /api/files/{file_key}`                                  |
| FIELD-GAP-011 | `store_id` 类型 | ✅mock | mp 列表 `store_id` string；菜单/购物车要 integer；**OrderRes** `order_id`/`store_id`/`table_id` 为 string，path 为 integer | 同一当前店            | **mock 跑通**；`toStoreId` / `toOrderId` 已按契约做 string↔int。真后端联调仍需确认 string 形如纯数字                              |
| FIELD-GAP-012 | 「切换」列表容器      | ✅mock | 分页列表                                                                                                          | 二字按钮             | **mock 跑通已闭环：**DEV-013 选店页；数据源 `GET /api/mp/stores`                                                        |
| FIELD-GAP-013 | admin 列表鉴权    | ✅     | —                                                                                                             | —                | **关闭：**顾客端已不再调 `/api/admin/stores`（DEV-012）                                                                |
| FIELD-GAP-014 | 规格询价          | ✅     | **无** `POST /api/mp/cart/quote`（约定前端本地算）                                                                      | 改规格实时价           | **已关闭主路径询价**；菜单字段本地试算 → FE-NEED-004                                                                        |
| FIELD-GAP-015 | 结账用券          | ✅mock | `coupons/usable` + `CreateOrderReq`（`customer_coupon_id` + `client_token`）；**无** preview / `client_payable_amount` | 选券实时应付           | **已关闭：**展示价前端本地试算；mock 下单内核销；`client_token` 幂等                                                                 |
| FIELD-GAP-016 | 读购物车          | ✅mock | Query 可选 `service_mode`                                                                                       | 按履约模式分车          | **mock 跑通。** `refreshCart` 已传 `toServiceMode`；mock 按 mode 分车；`GET /cart/overview` 已接购物袋分段角标（BE-UNUSED-025） |


---



## 编码进度（2026-08-18 按离线契约 + 当前 `src/` · mock 打勾）

依据：仓库 `mock/server.mjs` + `mock/smoke-test.mjs` 及前端调用点；**产品排除**见页头（2026-08-15）。  
**打勾前提：** mock 可通 **且** 前端入出参与真契约 DTO 对齐。契约已删 / DTO 未齐 → 只记 `❓`，即使 mock 请求 200。

### ✅mock 已对接（mock 跑通 + DTO 对齐）

1. 信封 `code === 0` + `http` PUT/DELETE（对 mock）
2. `POST /api/mp/customer/auth/wx-login`（consent 四字段）、`GET /api/mp/customer/auth/me`（`need_reconsent`）、`POST /logout`；`PUT /profile`、`POST /bind-phone`、`POST /avatar`；`GET /api/mp/customer/legal/documents` 与 `GET .../documents/{doc_type}`（登录勾选 + 协议页；**不接** `wx-precheck`）
3. `GET /api/mp/stores`、选店页、外卖荐店（DEV-012/013/014）
4. `GET /api/mp/stores/{id}/menu`、点单分类 chip、招牌精选打开规格
5. `GET /api/mp/cart`（可选 `service_mode`）、`POST /api/mp/cart/items`、`PUT/DELETE .../items/{id}`、`POST /api/mp/cart/clear`
6. `POST /api/mp/payments/prepay`、`POST /api/mp/payments/mock-paid`
7. `GET /api/mp/coupons/mine`（`list` + `counts` + `customer_coupon_id`）；`GET /api/mp/coupons/usable`；确认单本地满减试算
8. `POST /api/mp/orders`（`client_token` + `customer_coupon_id?`；mock 幂等 + 下单内核销）；`GET /api/mp/orders`（`orderEnums` 已对齐 OrderRes）；`GET /api/mp/orders/{id}`、`POST .../cancel`（订单 Sheet / 待支付取消，BE-UNUSED-009/010）
9. 预留 `POST /api/mp/coupons/redeem`（mock；正式建议下单自动核销）
10. 规格实时价：菜单 `sale_price`+`price_delta` 本地算（不再依赖已删 quote）
11. `/api/mp/addresses` 五条：`pages/address/index` 列表选址/删除 + `edit` 按 id；session hydrate（BE-UNUSED-003）
12. `GET /api/mp/coupons/available`、`POST /api/mp/coupons/claim`、`GET /api/mp/coupons/mine/{id}`：`pages/coupons` 可领/已领/详情（BE-UNUSED-017；DELETE 作废 **产品排除**）
13. 订单枚举 FIELD-GAP-007 / 购物袋写操作 BE-UNUSED-006/007/008 / FIELD-GAP-016 / 订单详情与取消 BE-UNUSED-009/010
14. `GET /api/mp/mall`、`GET /api/mp/mall/products/{id}`：选物 Tab 浏览 + 只读详情（BE-UNUSED-016 浏览闭环；**购买/履约产品排除**）
15. `GET /api/mp/tables/resolve`、`POST /api/mp/tables/{id}/occupy`：首页扫桌码入座（BE-UNUSED-004/022；加购带 `table_id`）
16. `GET /api/mp/delivery/channels`、`POST .../quote`、`GET .../orders/{id}`：确认单外卖询价 + 订单配送进度（BE-UNUSED-023；下单传 `address_id`）
17. `GET /api/mp/cart/overview`：购物袋堂食/外卖分段角标（BE-UNUSED-025；mall 桶故意不展示）
18. 定位：微信 `getLocation` + `GET /api/mp/customer/stores?latitude&longitude`（**不接** `GET /api/system/location/config`，BE-UNUSED-029）
19. `GET /api/mp/stores/{id}`：首页门店条 / 选店「详情」Sheet
20. `GET /api/mp/customer/member/summary|levels|benefits`、`POST .../subscribe`（`client_token`）、`GET .../subscriptions`：我的页会员一整包 + 续费/升档支付（FE-NEED-002 ✅mock）
21. `GET /api/mp/customer/points/account`、`GET .../points/ledger`：英雄卡积分 + `pages/points` 明细（FE-NEED-003 ✅mock）


### ❓ mock 请求能通，但 DTO/契约未齐（不打勾）


| 接口 / 能力                                        | 对接    | 原因                                                                      |
| ---------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| `POST /api/mp/cart/quote`                      | —     | **契约已删**；前端主路径已停用（FIELD-GAP-014 / FE-NEED-004 ✅）                        |
| `POST /api/mp/checkout/preview`                | —     | **契约已删**；前端主路径已停用（FIELD-GAP-015 / FE-NEED-005 ✅mock）                    |
| `GET /api/mp/stores/{id}/menu`                 | ✅mock | 菜单 DTO 对齐已拉；品牌仪式/英文故事为 UI 占位，非入出参 DTO（FIELD-GAP-003/005/010）            |
| `POST /api/mp/cart/items` / `GET /api/mp/cart` | ✅mock | 加购/读车 DTO 对齐；无规格本地 +¥3（FIELD-GAP-005）为行为缺口；可选 `service_mode` 已传         |




### — 后端已实现 · 前端无 UI（产品排除，非遗漏）

对照表 1：`已实现=是` 且对接=`—`、且属顾客可调接口。**本期不做 UI / 不封装。**


| 分组     | 接口                                                                                             | BE-UNUSED   |
| ------ | ---------------------------------------------------------------------------------------------- | ----------- |
| 登录预检   | `POST /api/mp/auth/wx-precheck`                                                                | 021（勿加预检步骤） |
| 整段售后退款 | `POST .../orders/{id}/refund`、`.../refund/cancel`；`GET /api/mp/refunds`、`GET .../refunds/{id}` | 013         |
| 确认收货   | `POST .../orders/{id}/receive`                                                                 | 026         |
| 礼品物流   | `GET/POST .../orders/{id}/logistics(+refresh)`                                                 | 027         |
| 退货     | `GET /api/mp/returns`；`POST .../ship-back`、`.../reship-prepay`、`.../reship-mock-paid`          | 028         |
| 卡券作废   | `DELETE .../coupons/mine/{customer_coupon_id}`                                                 | 017         |
| 商城购买侧  | （无独立下单 path 待接；浏览已 ✅mock）加购/支付/履约 UI                                                           | 016         |


**非顾客 UI（服务器回调，保持 —）：** `POST /api/mp/payments/wechat/notify`、`.../refund-notify`；`/api/mp/wechat/message`。

### — 其它悬置（非「已实现无 UI」）

1. 真微信商户支付（仍用 mock-paid）
2. 真后端验收（上表 `✅mock` 均未升格为真契约 `✅`）
3. 规划未实现：`member/profile`、`GET /api/mp/menu`、`GET /mall/products` 列表、`files/upload`、`takeaway/quote` 等（禁止当已实现对接）

选店 / 卡券领取与已领详情 / 地址簿 / 订单详情与取消 / 选物**浏览** / 我的账号资料 / **会员月卡（summary/levels/benefits/subscribe/subscriptions）** / **积分账户与流水** / 扫码占桌 / 外卖询价与配送进度 / 购物袋 overview / 定位 config / 门店详情 — **均已 ✅mock**。

禁止对接规划 `GET /api/mp/menu` 的 `specs/addons` 去替代已实现菜单。  
已删 `cart/quote`、`checkout/preview`：前端主路径已改为本地试算，勿再作为主流程依赖。

---



## P0 与主流程

**主流程：登录/选店/菜单/购物车/确认单本地计价为** `✅mock`**；下单带券 + `client_token` 为** `✅mock`**（FIELD-GAP-015 已关闭）；支付为** `✅mock`**（prepay + mock-paid）。**


| ID                     | 说明                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| ~~P0 / FE-NEED-001~~   | **本轮关闭**：列表接口已有；产品指定走 mp 列表                                                                   |
| P0 / DEV-010           | **半闭环：**枚举已齐（FIELD-GAP-007 ✅mock）；用券 FIELD-GAP-015 **已关闭**；UI 自取→堂食见偏差 |
| P0 / DEV-011           | **✅mock 半闭环。** `prepay` + `mock-paid`；真商户支付未接                                                 |
| ~~P0 / DEV-013~~       | **已闭环**（选店页 + `GET /api/mp/stores`，✅mock）                                                     |
| ~~P0 / FIELD-GAP-007~~ | **已闭环 ✅mock：**`orderEnums` 读侧 1–5（含自提/月卡）；写路径自取映射见 DEV-010                                          |
| ~~P0 / FIELD-GAP-014~~ | **已关闭主路径：**规格本地试算（FE-NEED-004）                                                                |
| ~~P0 / FIELD-GAP-015~~ | **已关闭 ✅mock：**`usable` + CreateOrder `customer_coupon_id`/`client_token`；展示价本地试算 |


登录 / 读车 / 加购 / 改量删除清空 / 确认单选券试算 / mock 下单核销 / 订单列表枚举 **可以** `✅mock`（FIELD-GAP-015 已关闭）。  
售后/退款/物流/确认收货/退货/商城购买/删券/`wx-precheck`：**产品排除**，不记为待接 P0。

---



## 待裁定（`docs/DEVIATION_LOG.md`）


| ID      | 状态                                                   |
| ------- | ---------------------------------------------------- |
| DEV-009 | **已闭环（✅mock）**：切换/选店走 `GET /api/mp/stores`           |
| DEV-010 | **半闭环·有隐患（✅mock）**：读侧枚举 1–5 已齐；写路径 UI 自取→堂食；列表/详情可展示 2/5 |
| DEV-011 | **半闭环·有隐患（✅mock）**：prepay + mock-paid；真商户支付未接        |
| DEV-012 | **已闭环（✅mock）**：平替为 `GET /api/mp/stores`，不再调 admin    |
| DEV-013 | **已闭环（✅mock）**：选店页已实现                                |


未写入业务分支或注释。