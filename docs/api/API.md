# 咖啡点单系统 API（本地副本）

> 自 `http://192.168.10.186:8001/docs` 拉取的机器可读契约与路径索引。

## 元信息

| 项 | 值 |
| --- | --- |
| 文档标题 | 咖啡点单系统 API |
| 版本号 | `1.0.0` |
| OpenAPI | `3.1.0` |
| 来源 URL | http://192.168.10.186:8001/docs |
| 机器可读 | http://192.168.10.186:8001/openapi.json |
| 本地文件 | `docs/api/openapi.json` |
| SHA-256（格式化后） | `8a02dc16cca1bad744ef7b70cbb5b242014a724c934ad94f1ada458ffcd8eddc` |
| Content-Length | 653766 |
| 拉取时间 | 2026-08-13 10:53:57 +0800 |
| 路径数 | 166 |

## 文档自述

已实现接口已从后端 FastAPI 同步（路径、入参、出参以后端代码为准，摘要带【已实现】）。
未标注的路径来自历史规划，可能尚未落地，不要按规划字段对接已实现接口。

依据《项目需求总结.txt》与《功能需求细化.md》。

- 管理后台：`/api/admin/*`（超管 / 店长）
- 小程序：`/api/mp/*`（顾客 / 店员，按角色鉴权）
- HTTP 恒为 200；业务成败只看 body 的 `code` / `is_success`
- 业务码与 HTTP 分离（禁止把 200/400/401/403/429 等当业务码）：
  - 成功 `20000`
  - 系统错误 `40000`；未登录 `40100`；Token过期 `40101`；Token无效 `40102`；登录环境变化 `40103`
  - 无权限 `40300`；用户禁用 `40301`；参数错误 `41000`；验证码错误 `41001`；登录过于频繁 `42900`
- 完整枚举见 components.schemas.BusinessCode
- P0=堂食闭环，P1=商城/卡券，P2=外卖预留

## Servers

- `http://127.0.0.1:8000` 本机业务后端
- `http://192.168.10.186:8000` 局域网业务后端

## 接口索引（按 Tag）

### admin-auth — P0 管理端登录鉴权

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `POST` | `/api/admin/auth/login` | 管理端登录 | `login_api_admin_auth_login_post` |
| `POST` | `/api/admin/auth/logout` | 退出登录 | `logout_api_admin_auth_logout_post` |
| `GET` | `/api/admin/auth/me` | 当前管理员信息 | `me_api_admin_auth_me_get` |
| `PUT` | `/api/admin/auth/password` | 修改当前登录管理员密码 | `change_password_api_admin_auth_password_put` |

### admin-stores — P0 门店管理（超管）

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/stores` | 门店列表 | `list_stores_api_admin_stores_get` |
| `POST` | `/api/admin/stores` | 新建门店 | `create_store_api_admin_stores_post` |
| `GET` | `/api/admin/stores/{store_id}` | 门店详情 | `get_store_api_admin_stores__store_id__get` |
| `PUT` | `/api/admin/stores/{store_id}` | 编辑门店 | `update_store_api_admin_stores__store_id__put` |
| `DELETE` | `/api/admin/stores/{store_id}` | 停用门店 | `delete_store_api_admin_stores__store_id__delete` |
| `POST` | `/api/admin/stores/{store_id}/accepting` | 暂停或恢复接单 | `set_accepting_api_admin_stores__store_id__accepting_post` |
| `PUT` | `/api/admin/stores/{store_id}/business-hours` | 覆盖写入营业时间 | `` |
| `PUT` | `/api/admin/stores/{store_id}/service-modes` | 覆盖写入服务方式 | `` |
| `GET` | `/api/admin/stores/{store_id}/staff` | 门店员工列表 | `list_store_staff_api_admin_stores__store_id__staff_get` |

### admin-admins — P0 店长账号（超管）

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/admins` | 管理员列表（仅超管） | `` |
| `POST` | `/api/admin/admins` | 创建店长并分配门店（仅超管） | `` |
| `PUT` | `/api/admin/admins/{admin_id}` | 更新管理员（角色/门店/启用状态） | `` |
| `POST` | `/api/admin/admins/{admin_id}/reset-password` | 重置管理员密码（仅超管） | `` |

### admin-staff — P0 店员账号（店长/超管）

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/staff` | 店员列表（按门店隔离） | `` |
| `POST` | `/api/admin/staff` | 新增店员 | `` |
| `PUT` | `/api/admin/staff/{staff_id}` | 编辑店员 | `` |
| `DELETE` | `/api/admin/staff/{staff_id}` | 删除/禁用店员 | `` |

### admin-menu — P0 点单分类/商品/规格/加料

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/categories` | 分类列表 | `` |
| `POST` | `/api/admin/categories` | 新增分类 | `` |
| `PUT` | `/api/admin/categories/{category_id}` | 编辑分类 | `` |
| `DELETE` | `/api/admin/categories/{category_id}` | 删除分类 | `` |
| `GET` | `/api/admin/products` | 点单商品列表（product_type=MENU） | `` |
| `POST` | `/api/admin/products` | 新增点单商品（含规格/加料） | `` |
| `GET` | `/api/admin/products/{product_id}` | 商品详情 | `` |
| `PUT` | `/api/admin/products/{product_id}` | 编辑点单商品 | `` |
| `DELETE` | `/api/admin/products/{product_id}` | 删除/下架点单商品 | `` |

### admin-tables — P0 桌码桌牌

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/tables` | 桌码列表 | `list_tables_api_admin_tables_get` |
| `POST` | `/api/admin/tables` | 新增桌台 | `create_table_api_admin_tables_post` |
| `POST` | `/api/admin/tables/qrcode/batch` | 批量生成桌码 | `batch_generate_api_admin_tables_qrcode_batch_post` |
| `DELETE` | `/api/admin/tables/{table_id}` | 删除/解绑桌码 | `` |
| `POST` | `/api/admin/tables/{table_id}/qrcode` | 生成微信桌码 | `generate_qrcode_api_admin_tables__table_id__qrcode_post` |

### admin-orders — P0 管理端订单

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/orders` | 管理端订单列表 | `list_orders_api_admin_orders_get` |
| `GET` | `/api/admin/orders/{order_id}` | 管理端订单详情 | `get_order_api_admin_orders__order_id__get` |
| `POST` | `/api/admin/orders/{order_id}/restock` | 商城订单加回库存 | `restock_order_api_admin_orders__order_id__restock_post` |
| `POST` | `/api/admin/orders/{order_id}/status` | 管理端强制变更订单状态（如关闭异常订单） | `` |

### admin-mall — P1 商城商品管理

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/mall/categories` | 礼品分类列表（公司级，仅超管） | `list_categories_api_admin_mall_categories_get` |
| `POST` | `/api/admin/mall/categories` | 新建礼品分类 | `create_category_api_admin_mall_categories_post` |
| `PUT` | `/api/admin/mall/categories/{category_id}` | 编辑礼品分类 | `update_category_api_admin_mall_categories__category_id__put` |
| `DELETE` | `/api/admin/mall/categories/{category_id}` | 删除礼品分类 | `delete_category_api_admin_mall_categories__category_id__delete` |
| `GET` | `/api/admin/mall/products` | 礼品列表 | `list_products_api_admin_mall_products_get` |
| `POST` | `/api/admin/mall/products` | 新建礼品 | `create_product_api_admin_mall_products_post` |
| `GET` | `/api/admin/mall/products/{product_id}` | 礼品详情 | `get_product_api_admin_mall_products__product_id__get` |
| `PUT` | `/api/admin/mall/products/{product_id}` | 编辑礼品 | `update_product_api_admin_mall_products__product_id__put` |
| `DELETE` | `/api/admin/mall/products/{product_id}` | 删除礼品 | `delete_product_api_admin_mall_products__product_id__delete` |
| `POST` | `/api/admin/mall/products/{product_id}/image` | 上传礼品轮播图（追加，最多9张） | `upload_product_image_api_admin_mall_products__product_id__image_post` |
| `DELETE` | `/api/admin/mall/products/{product_id}/images/{image_id}` | 删除礼品轮播图 | `delete_product_image_api_admin_mall_products__product_id__images__image_id__delete` |
| `GET` | `/api/admin/mall/staff` | 商城人员列表 | `list_mall_staff_api_admin_mall_staff_get` |
| `POST` | `/api/admin/mall/staff` | 新增商城人员 | `create_mall_staff_api_admin_mall_staff_post` |
| `PUT` | `/api/admin/mall/staff/{staff_id}` | 更新商城人员 | `update_mall_staff_api_admin_mall_staff__staff_id__put` |

### admin-coupons — P1 优惠券管理

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/coupons` | 优惠券模板列表（固定规则：满减/折扣） | `` |
| `POST` | `/api/admin/coupons` | 创建优惠券模板 | `` |
| `PUT` | `/api/admin/coupons/{coupon_id}` | 编辑优惠券模板 | `` |
| `DELETE` | `/api/admin/coupons/{coupon_id}` | 停用/删除优惠券模板 | `` |

### admin-dashboard — P0 数据概览

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/admin/dashboard/summary` | 数据概览（今日订单/金额等，按门店权限） | `` |

### common-files — P0 本地图片上传/读取

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `POST` | `/api/admin/files/upload` | 上传图片（本地存储） | `` |
| `GET` | `/api/files/{file_key}` | 查看/读取图片（文件流，前端自行渲染） | `` |
| `POST` | `/api/mp/files/upload` | 小程序端上传图片（头像等） | `` |

### mp-auth — P0 小程序登录与会员

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `POST` | `/api/mp/auth/avatar` | 上传头像 | `upload_avatar_api_mp_auth_avatar_post` |
| `POST` | `/api/mp/auth/bind-phone` | 绑定手机号 | `bind_phone_api_mp_auth_bind_phone_post` |
| `POST` | `/api/mp/auth/logout` | 退出登录 | `logout_api_mp_auth_logout_post` |
| `GET` | `/api/mp/auth/me` | 当前小程序用户信息 | `me_api_mp_auth_me_get` |
| `PUT` | `/api/mp/auth/profile` | 更新小程序资料 | `update_profile_api_mp_auth_profile_put` |
| `POST` | `/api/mp/auth/wx-login` | 微信登录 | `wx_login_api_mp_auth_wx_login_post` |
| `POST` | `/api/mp/auth/wx-login/staff-kind` | 店员双身份选择后完成登录 | `wx_login_staff_kind_api_mp_auth_wx_login_staff_kind_post` |
| `POST` | `/api/mp/auth/wx-precheck` | 登录前查询是否已有头像昵称 | `wx_precheck_api_mp_auth_wx_precheck_post` |
| `GET` | `/api/mp/member/addresses` | 我的收货地址列表（商城/外卖预留） | `` |
| `POST` | `/api/mp/member/addresses` | 新增收货地址 | `` |
| `PUT` | `/api/mp/member/addresses/{address_id}` | 编辑收货地址 | `` |
| `DELETE` | `/api/mp/member/addresses/{address_id}` | 删除收货地址 | `` |
| `GET` | `/api/mp/member/profile` | 会员基础资料 | `` |
| `PUT` | `/api/mp/member/profile` | 更新会员基础资料（不做储值） | `` |

### mp-menu — P0 客户端菜单

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/mp/menu` | 点单菜单（分类+上架商品+规格+加料） | `` |

### mp-cart — P0 购物车

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/mp/cart` | 查询购物车 | `get_cart_api_mp_cart_get` |
| `POST` | `/api/mp/cart/clear` | 清空购物车 | `clear_cart_api_mp_cart_clear_post` |
| `POST` | `/api/mp/cart/items` | 加入购物车 | `add_cart_item_api_mp_cart_items_post` |
| `PUT` | `/api/mp/cart/items/{item_id}` | 修改购物车数量 | `patch_cart_item_api_mp_cart_items__item_id__put` |
| `DELETE` | `/api/mp/cart/items/{item_id}` | 删除购物车项 | `delete_cart_item_api_mp_cart_items__item_id__delete` |
| `GET` | `/api/mp/cart/overview` | 购物车总览（按堂食/外卖/商城） | `get_cart_overview_api_mp_cart_overview_get` |

### mp-orders — P0 客户端订单

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `POST` | `/api/mp/orders` | 购物车下单 | `create_order_api_mp_orders_post` |
| `GET` | `/api/mp/orders` | 我的订单 | `list_orders_api_mp_orders_get` |
| `GET` | `/api/mp/orders/{order_id}` | 订单详情 | `get_order_api_mp_orders__order_id__get` |
| `POST` | `/api/mp/orders/{order_id}/cancel` | 取消订单 | `cancel_order_api_mp_orders__order_id__cancel_post` |
| `GET` | `/api/mp/orders/{order_id}/logistics` | 查询礼品订单物流轨迹 | `get_order_logistics_api_mp_orders__order_id__logistics_get` |
| `POST` | `/api/mp/orders/{order_id}/logistics/refresh` | 主动拉取微信物流轨迹 | `refresh_order_logistics_api_mp_orders__order_id__logistics_refresh_post` |
| `POST` | `/api/mp/orders/{order_id}/receive` | 顾客确认收货 | `receive_order_api_mp_orders__order_id__receive_post` |

### mp-payment — P0 支付与退款

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `POST` | `/api/mp/refunds/wechat/notify` | 微信退款回调（微信服务器调用） | `` |

### mp-staff — P0 店员端履约

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/mp/staff/dashboard` | 店员经营摘要 | `staff_dashboard_api_mp_staff_dashboard_get` |
| `GET` | `/api/mp/staff/orders/{order_id}` | 店员端订单详情（客户点了哪些产品、取餐号） | `` |
| `POST` | `/api/mp/staff/orders/{order_id}/call` | 叫号通知（通知顾客取餐） | `` |
| `POST` | `/api/mp/staff/orders/{order_id}/verify` | 核销订单（到店自提/堂食完成） | `` |
| `POST` | `/api/mp/staff/store/location` | 设置本店地图位置（微信 chooseLocation） | `update_store_location_api_mp_staff_store_location_post` |
| `GET` | `/api/mp/staff/tables` | 店员桌台列表 | `list_staff_tables_api_mp_staff_tables_get` |
| `POST` | `/api/mp/staff/tables/{table_id}/clear` | 待清台清台为空闲 | `clear_table_api_mp_staff_tables__table_id__clear_post` |
| `POST` | `/api/mp/staff/tables/{table_id}/need-clear` | 用餐中结账，改为待清台 | `mark_need_clear_api_mp_staff_tables__table_id__need_clear_post` |

### mp-mall — P1 商城购买

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/mp/mall` | 礼品商城目录 | `get_catalog_api_mp_mall_get` |
| `GET` | `/api/mp/mall/products` | 商城商品浏览 | `` |
| `GET` | `/api/mp/mall/products/{product_id}` | 礼品详情 | `get_product_api_mp_mall_products__product_id__get` |

### mp-coupons — P1 用户优惠券

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `GET` | `/api/mp/coupons/available` | 可领/可用优惠券 | `` |
| `POST` | `/api/mp/coupons/claim` | 领取优惠券 | `` |
| `GET` | `/api/mp/coupons/mine` | 我的优惠券 | `` |

### mp-takeaway — P2 外卖预留（本期不实现）

| Method | Path | Summary | operationId |
| --- | --- | --- | --- |
| `POST` | `/api/mp/takeaway/quote` | 【预留】配送费询价 | `` |

