# 偏差日志


| ID      | 场景            | 旧行为                                                             | 新行为                                                     | 原因                                 | 产品批准 | 闭环   |
| ------- | ------------- | --------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------- | ---- | ---- |
| DEV-001 | 规格/购物袋浮层与 Tab | 规格栈隐藏自定义 Tab；购物袋叠在 Tab 之上（同框 z-index）                           | 打开任一浮层时 `hideTabBar`，关闭后 `showTabBar`                   | 微信原生 tabBar 层级高于页内节点，无法被 sheet 覆盖  | 待定   | 占位继续 |
| DEV-002 | 产品摄影          | `/images/products/*.jpg` 真实菜品图（旧仓仓库内文件缺失）                       | `/static/images/products/*.jpg` 真实菜品图                    | 已补齐 12 张 jpg，路径与旧仓文件名对齐        | 是    | 已闭环   |
| DEV-003 | 展示字体          | Google Fonts：Cormorant Garamond + Noto Sans SC                  | 系统宋体/黑体栈（Songti SC、PingFang SC）                         | 小程序不能依赖外链字体；字体差异不单开缺陷              | 待定   | 占位继续 |
| DEV-004 | Sheet Escape  | `window` 监听 Escape 关闭                                           | 无键盘关闭                                                   | 禁用浏览器 API                          | 待定   | 占位继续 |
| DEV-005 | 微信能力按钮        | 首页三按钮无点击逻辑；我的「卡券/客服/关于」无跳转                                      | 同样无业务跳转；客服在 mp-weixin 用 `button open-type="contact"` 占位 | 旧版即为预留；无 AppID/客服配置                | 待定   | 占位继续 |
| DEV-006 | 鉴权            | `loggedIn` 默认 true，按钮切换演示态                                      | `uni.login` + `/auth/wx-login` 换 token；H5 走开发 code；本地 `mock/` 假后端 | 已有 AppID；AppSecret 仅存 mock 服务端 | 是    | 已闭环   |
| DEV-007 | 桌面手机壳         | H5 居中 390×844 圆角设备框                                             | 全屏纸色页面 + 原生/H5 TabBar                                   | 新栈用 `pages.json` tabBar，不再演假 Shell | 待定   | 占位继续 |
| DEV-008 | 关闭 Mock       | `VITE_ENABLE_MOCK=false` 时请求 `/catalog/*` `/member/*` `/orders` | 无真实后端，请求会失败                                             | 旧仓无 API；生产需接后端                     | 待定   | 占位继续 |
| DEV-009 | 顾客端 store_id | 首页/点单店名来自本地 catalog.brand；「切换」只跳点单 Tab | 启动按定位选最近店（`GET /api/admin/stores`）；不用 `GET /api/mp/stores` | 用户 2026-08-11 点名 admin-stores 门店列表 | 是 | 自动选店已接；列表 UI 见 DEV-013 |
| DEV-010 | 确认下单类型    | 本地 `placeOrder()` 写 `mode: '外带'`；点单文案「自取」             | 已实现下单是 `CreateOrderReq.service_mode`(integer)+`table_id`+`from_cart`，不再要 `order_type` 字符串 | 现网无选桌/选类型；整数枚举文档未给对照     | 待定   | **本轮悬置** |
| DEV-011 | 确认下单与支付  | 购物袋只有「确认下单」，无「去支付」                               | 已实现 `POST /api/mp/payments/prepay` 与下单分离 | 同一手势是否连调支付未在验收文档写明         | 待定   | **本轮悬置** |
| DEV-012 | C 端调超管门店列表 | 受众过滤禁止接 `/api/admin/*` | 仅破例 `GET /api/admin/stores`；其余 admin 仍不接 | 与完成线「不做后台接口」冲突，以用户点名为准 | 是 | 仅此 1 条 |
| DEV-013 | 切换后如何选店 | 「切换」无列表/无 Sheet；曾误跳点单 Tab | 自动选最近店；点击「切换」**不打开选店页**；选店列表仅有 `src/common/mock/stores.ts` 占位 | 用户 2026-08-11：先不造列表页，用 mock 占位 | 待定 | **异常仍未处理**（列表 UI 未做） |


