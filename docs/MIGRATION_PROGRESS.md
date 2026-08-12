# 迁移进度

会话内连续推进 Slice 0–7，未在中途征求确认。

## Slice 0 Bootstrap

- 改动：四份契约文档；`uni.scss` / `global.scss` 落地品牌 tokens；`pages.json` 五 Tab；去掉 Orb 示例页。
- 验证：见文末命令（与后续切片合并执行）。
- 偏差：DEV-003、DEV-007。
- CODECRAFT：多余改动无。
- 下一片：基础设施。

## Slice 1 基础设施

- 改动：`common/types/*`、`common/mock/catalog.ts`、`catalogApi`/`memberApi`、`stores/session|cart|catalog`；请求层沿用 `plugin/request`；`.env.example` 标题改为元气善筑。
- 验证：Mock 开关 `VITE_ENABLE_MOCK`；页面不直读 mock。
- 偏差：DEV-008。
- CODECRAFT：多余改动无。
- 下一片：首页。

## Slice 2 首页

- 改动：`pages/home/index.vue` + `soorak-chrome` 导航。
- 验收：hero 文案、去点单、门店条/切换、此刻需要、招牌精选、微信三按钮。
- 偏差：DEV-002（色块图）、DEV-005。
- CODECRAFT：多余改动无。
- 下一片：点单/规格/购物车。

## Slice 3 点单 + 规格 + 购物袋

- 改动：`pages/menu`、`product-card`、`soorak-product-sheet`、`soorak-cart-sheet`、`soorak-sheet`、`soorak-button`。
- 验收：仪式 chips、列表选规格、计价（大杯+3 / 加料每项+3）、零售无规格、加购不合并并打开购物袋、确认下单进订单。
- 偏差：DEV-001、DEV-004。
- CODECRAFT：多余改动无。
- 下一片：订单。

## Slice 4 订单

- 改动：`pages/orders/index.vue`。
- 验收：空态文案；下单后 mode/单号/制作中/明细/合计/出杯提示。
- 偏差：无新增。
- CODECRAFT：多余改动无。
- 下一片：会员/我的。

## Slice 5 会员 + 我的

- 改动：`pages/member/index.vue`、`pages/mine/index.vue`。
- 验收：成长值进度 `growth/5000`、三档权益文案、演示登录/退出、六单元格。
- 偏差：DEV-005、DEV-006。
- CODECRAFT：多余改动无。
- 下一片：鉴权占位。

## Slice 6 鉴权与平台

- 改动：我的页演示开关保留；mp-weixin「联系客服」`open-type="contact"` 占位；无 AppID，不接 `wx.login`/支付。
- 偏差：DEV-005、DEV-006（待定，占位继续）。
- CODECRAFT：多余改动无。
- 下一片：遗漏审计。

## Slice 7 遗漏审计

旧仓页面/关键组件/数据均已入 `MIGRATION_MAP`。非业务遗留（`soorak-mp` 的 `counter.ts`、`style.css`、Vite SVG）不迁移。

静态资源：`src/static/images/products/*.jpg` 真实菜品图（DEV-002 已闭环）。Tab 点图标 → `src/static/tab/dot-*.png`。

未闭环偏差：DEV-001、DEV-003～DEV-008，均为占位继续。

### 验证命令与结果

```
npm run type-check      # 通过（exit 0）
npm run build:h5        # 通过 DONE Build complete
npm run build:mp-weixin # 通过 DONE Build complete
```

手测路径（H5 / 微信开发者工具导入 `dist/build/mp-weixin`）：

1. 五 Tab 文案与选中色
2. 首页「去点单 / 此刻需要 / 招牌精选」跳转与开规格
3. 点单 chips 筛选 → 选规格 → 加入购物袋 → 确认下单 → 订单列表
4. 会员文案与「会员价去点单」
5. 我的登录演示与订单/会员/购物袋入口

CODECRAFT 自检：改动对应映射验收；无未复用即新建的大型依赖；无多余抽象（chrome 为五 Tab 真实复用）。

下一切片起点：无（全量 DoD 已达文档+主路径实现）。若产品批准偏差，优先 AppID 后的登录/客服（DEV-005/006）。
