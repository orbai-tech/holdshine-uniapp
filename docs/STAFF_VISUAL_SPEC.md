# 元气善筑 · 店员端小程序视觉设计规范（对齐顾客端）

> **用途**：供 Codex / 设计实现代理读取后，设计并实现「店员端」微信小程序 UI，使其与现有「顾客端」品牌视觉一致。  
> **品牌**：元气善筑（Soorak）  
> **顾客端技术栈参考**：UniApp Vue 3 + SCSS + `rpx`（750 设计稿，`1px ≈ 2rpx`）  
> **权威 token 源**：顾客端 `reference/uni.scss`（注释：元气善筑 tokens，来源旧仓 `tokens.css`）

---

## 0. Codex 执行指令（必读）

1. **先复用 token，再画页面**：颜色、字体、圆角、间距、阴影必须与下文 token 一致；禁止另起一套「运营后台蓝 / 紫色渐变 / 高饱和橙红」。
2. **气质优先于功能密度**：店员端可以更「工具化、列表更密」，但**仍须像同一家咖啡馆的工作台**，不是通用 SaaS 后台。
3. **禁止事项**（与顾客端反模式一致）：
  - 紫色 / 靛蓝渐变主题
  - 霓虹 glow、多层厚重阴影
  - 大量 `rounded-full` 药丸堆叠（芯片除外）
  - Inter / Roboto / 系统默认无衬线作为**展示字体**
  - 卡片套卡片、仪表盘式首屏 stat 墙
4. **允许差异**：店员端可弱化「仪式感营销 Hero」，强化「待处理订单 / 出杯队列 / 门店状态」；但配色、字体层级、组件形态必须同源。
5. **实现时优先**：复制顾客端 `uni.scss` + `global.scss` 的 token 与排印 class；组件命名可沿用 `soorak-`* 或 `mp-*` 前缀，保持同一视觉语言。

---



## 1. 品牌气质一句话

**暖纸底 + 苔绿主色 + 黄铜点缀 + 宋体标题**，安静、克制、茶咖气质；触控反馈轻（opacity / 轻微 scale），边框多用 **inset 1rpx hairline**，阴影极轻。

情绪关键词：`calm` · `craft` · `warm paper` · `moss & brass` · `serif moments`  
反关键词：`tech neon` · `dashboard chrome` · `playful candy`

---



## 2. 设计 Token（必须原样采用）



### 2.1 色彩


| Token            | Hex / Value           | 语义           | 用法                               |
| ---------------- | --------------------- | ------------ | -------------------------------- |
| `$mp-ink`        | `#14110f`             | 墨色 / 最深底     | 深色 Hero 块、选中 Chip、主文字            |
| `$mp-moss`       | `#33473d`             | **品牌主色（苔绿）** | 主按钮、选中态、成功/进行中状态、Tab 选中          |
| `$mp-moss-deep`  | `#2a3a32`             | 苔绿按下态        | primary 按钮 active                |
| `$mp-brass`      | `#9a7b4f`             | 黄铜强调         | 次要链接、Badge、进度条、价格外强调             |
| `$mp-brass-soft` | `#b8966a`             | 浅黄铜          | 深色底上的副文案、氛围字                     |
| `$mp-paper`      | `#f7f4ee`             | **页面纸色底**    | `page` 背景、Sheet 面板、Nav 半透明底      |
| `$mp-cloud`      | `#faf8f4`             | 云色卡片面        | 列表卡、单元格组、浅表单卡                    |
| `$mp-stone`      | `#e8e2d8`             | 石色占位         | 图片占位、缩略图底                        |
| `$mp-text`       | `#14110f`             | 主文字          | 标题、正文                            |
| `$mp-text-2`     | `#6b635a`             | 次文字          | 说明、meta                          |
| `$mp-text-3`     | `#948c82`             | 三级 / 占位      | Label、未选 Tab、chevron、placeholder |
| `$mp-border`     | `rgba(20,17,15,0.1)`  | 发丝边          | 分割线、inset 描边                     |
| `$mp-danger`     | `#8f4a3c`             | 危险 / 错误      | 拒单、异常、删除确认（少用）                   |
| `$mp-tab-bg`     | `#ffffff`             | Tab 底        | 底栏纯白                             |
| `$mp-mask`       | `rgba(20,17,15,0.45)` | 遮罩           | Sheet / 弹层                       |


**语义色映射（Uni 变量已对齐）**

- Primary / Success → moss `#33473d`
- Warning → brass `#9a7b4f`
- Error → danger `#8f4a3c`
- Inverse text → paper `#f7f4ee`

**店员端状态色建议（在 token 内演绎，勿新增高饱和色）**


| 业务状态              | 颜色                                                    |
| ----------------- | ----------------------------------------------------- |
| 待接单 / 进行中 / 营业中   | `$mp-moss`                                            |
| 待出杯 / 提醒 / 次要 CTA | `$mp-brass`                                           |
| 已完成 / 休息 / 禁用文案   | `$mp-text-3`                                          |
| 拒单 / 超时 / 库存告警    | `$mp-danger`                                          |
| 选中容器描边            | `inset 0 0 0 2rpx $mp-moss`，可选底 `rgba(51,71,61,0.06)` |




### 2.2 字体

**正文（默认）**  
`"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif`  
默认字号 `28rpx`，行高 `1.6`，字重常规 / 中等（500）。

**展示 / 品牌 / 价格（宋体）**  
`"Songti SC", "Noto Serif SC", serif`  
用于：品牌名、大标题、金额、Tab 文案、会员名、空状态标题。

### 2.3 排印层级（全局 class，店员端应复用或等价实现）


| Class        | 规格                                                    | 用途           |
| ------------ | ----------------------------------------------------- | ------------ |
| `.t-label`   | 20rpx / 500 / `letter-spacing: 0.14em` / `$mp-text-3` | 英文眉题、区块小标签   |
| `.t-hero`    | 宋体 60rpx / 500 / lh 1.15 / tracking 0.04em            | 仅营销大标题；店员端少用 |
| `.t-title`   | 宋体 44rpx / 500 / lh 1.3                               | 页级大标题、空状态    |
| `.t-section` | 宋体 36rpx / 500 / lh 1.35                              | 区块标题         |
| `.t-product` | 无衬线 32rpx / 500 / lh 1.35                             | 商品/订单主名      |
| `.t-caption` | 24rpx / `$mp-text-2` / lh 1.5                         | 辅助说明         |


**字距习惯**（店员端沿用）

- 品牌短词 / Nav brand：`0.22em`
- Tab 文案：`0.16em`
- 按钮 / 链接：`0.06em`～`0.1em`
- Label：`0.14em`

**价格数字**  
一律宋体，常见档位：`28 / 32 / 36 / 40 / 44rpx`，字重 500。

### 2.4 圆角


| Token  | 值        | 用途                   |
| ------ | -------- | -------------------- |
| sm     | `8rpx`   | 按钮、数量器、小缩略图、分段控件     |
| base   | `16rpx`  | 卡片、图片、列表组            |
| lg     | `24rpx`  | Sheet 顶角、深色会员/身份卡    |
| pill   | `999rpx` | **仅**横向 Chip / 进度条轨道 |
| circle | `50%`    | 小圆点                  |




### 2.5 间距


| 档位   | 值       |
| ---- | ------- |
| sm   | `12rpx` |
| base | `24rpx` |
| lg   | `32rpx` |


页面水平边距惯例：`32rpx`（`.page-pad`：`24rpx 32rpx 16rpx`）。  
区块上下：标题下 `24rpx`，大块之间约 `40rpx`。  
卡片内边距常见：`28rpx`。

### 2.6 阴影与描边（核心风格）

优先顺序：

1. **Inset hairline**：`box-shadow: inset 0 0 0 1rpx $mp-border;`（表单卡、次按钮、未选模式）
2. **极轻外阴影**：`0 2rpx 4rpx rgba(20,17,15,0.04)`（信息卡、门店卡）
3. **选中**：`inset 0 0 0 2rpx $mp-moss`（可叠加轻外阴影）
4. **禁止**：大模糊阴影、彩色投影、双层立体卡



### 2.7 透明度与反馈

- Disabled / 弱化：`opacity: 0.45`
- 按压：`opacity: 0.92` + 可选 `transform: scale(0.98)`
- Primary active 背景切到 `$mp-moss-deep`
- 半透明纸色叠层（Nav / Sticky / 底栏）：`rgba(247,244,238,0.94)` 或 `0.96`

---



## 3. 布局与页面骨架



### 3.1 页面壳

- 全页最小高度 `100vh`，背景 `$mp-paper`。
- 顾客端用 `SoorakChrome`：`NavBar` + `body` + 条件 `TabBar` + Sheet。
- 店员端建议同样：**自定义 Nav + 自定义 Tab**，隐藏原生 TabBar；结构可复用 chrome 思路。



### 3.2 导航栏

- 固定顶栏，高度内容区 `88rpx` + 状态栏。
- 背景：`rgba(247,244,238,0.94)` + 底部分割 `1rpx $mp-border`。
- 左：品牌「元气善筑」（宋体 24rpx、tracking 0.22em、`$mp-text-2`）或返回 `‹`（56rpx）。
- 中：标题 30rpx / 500，居中。
- 右：操作文字（顾客端是「袋」）；店员端可改为「刷新 / 筛选 / 更多」，字号约 26rpx，tracking 0.1em。
- Badge：黄铜底、白字、小圆 pill（参考顾客端购物角标）。



### 3.3 底部 Tab

- 背景 `#ffffff`，顶部分割 `$mp-border`。
- **纯文字 Tab，无图标**（顾客端既成事实；店员端保持一致更易品牌统一）。
- 文案：宋体 28rpx / 500 / tracking `0.16em`。
- 未选：`#948c82`；选中：`#33473d`。
- 项高约 `96rpx` + safe-area。
- 店员端 Tab 文案建议示例：`队列` · `订单` · `门店` · `我的`（可改，但样式不变）。



### 3.4 底部操作条（Checkout 式）

- Fixed 底栏，纸色半透明 + 顶部分割。
- 左：汇总文案（caption）+ 宋体大金额。
- 右：苔绿主按钮 `min-height 88rpx`、`border-radius 8rpx`、字距略开。
- 店员端「接单 / 叫号 / 完成」主 CTA 用同一形态。



### 3.5 空状态

- `.mp-empty`：大留白（约 `96rpx 48rpx`），居中，纵向 gap `16rpx`。
- 标题用宋体 44rpx；说明用 `.t-caption`；可跟一个 primary 按钮。

---



## 4. 核心组件形态（店员端必须对齐）



### 4.1 Button（`SoorakButton`）


| Variant     | 样式                                                  |
| ----------- | --------------------------------------------------- |
| `primary`   | 底 `$mp-moss`，字 `$mp-paper`；active → `$mp-moss-deep` |
| `secondary` | 透明 + inset 边框；字 `$mp-text`                          |
| `ghost`     | 无底无边；字 `$mp-brass`；tracking 更大                      |


规格：`min-height 88rpx`，水平 padding `36rpx`，圆角 `8rpx`，字号 `26rpx`，字重 500，tracking `0.06em`。  
`block`：通栏 flex。  
深色 Hero 上的 secondary：字改 paper，边框改 `rgba(247,244,238,0.45)`。

### 4.2 Sheet / 半屏面板

- Mask：`$mp-mask`。
- 面板：`$mp-paper`，顶圆角 `24rpx`，最大高度约 `88%`。
- 顶栏：左右标题/「关闭」，padding `28rpx 32rpx`，字 24rpx、tracking `0.12em`，底部分割。
- Footer：纸色半透明 + 顶部分割，照顾 safe-area。
- 店员端：拒单原因、改状态、桌台选择等一律用此 Sheet，不要用系统粗陋弹窗作为主交互。



### 4.3 卡片

两种合法卡片：

**A. 信息卡（轻阴影）**  
`background: $mp-cloud; border-radius: 16rpx; box-shadow: 0 2rpx 4rpx rgba(20,17,15,0.04); padding: 28rpx;`  
用于：订单摘要、门店信息。

**B. 表单/选项卡（inset 边）**  
`background: $mp-cloud; border-radius: 16rpx; box-shadow: inset 0 0 0 1rpx $mp-border; padding: 28rpx;`  
用于：设置项、备注、模式选择。

选中卡：moss inset 2rpx；可选右下角小三角 mark（门店卡已有范式）。

### 4.4 列表单元格组

- 外包一层 cloud + `16rpx` 圆角。
- 行高约 `96rpx`，左右 `28rpx`，行间 `$mp-border`。
- 右侧 chevron / 附属文案用 `$mp-text-3`。



### 4.5 Chip / 分段

- **营销/分类 Chip**：pill `999rpx`；未选 inset 边；选中 **ink 实底 + paper 字**（菜单分类）。
- **履约分段（堂食/外卖）**：圆角 `8rpx`（非 pill）；选中 **moss 实底 + paper 字**。

店员端筛选项：队列状态用「分段 8rpx」；标签过滤可用 pill chip。

### 4.6 数量步进器

- 边框 `$mp-border`，圆角 `8rpx`。
- 数字宋体；加减按钮约 `48rpx`，字色 `$mp-text-2`。



### 4.7 图片

- 圆角：大图 `16rpx`，小缩略图 `8rpx`。
- 占位底 `$mp-stone`。
- 角标：半透明墨底 `rgba(20,17,15,0.72)` + paper 字，小字距。
- 图上文案区可用墨色竖向渐变 veil（Hero 专用）。



### 4.8 深色身份/摘要块（可选）

顾客端「我的」会员卡：`$mp-ink` 底、`24rpx` 圆角、paper 字、brass 进度。  
店员端可用于：**当前值班门店 / 今日摘要**，但不要做成数据仪表盘；最多 3 个指标，宋体数字。

---



## 5. 文案与内容语气

- 中文为主；英文仅作 `.t-label` 眉题（如 `WeChat`、商品英文名）。
- 用词克制、服务感：少用「立即暴击式」运营黑话。
- 店员端可更短促：「接单」「制作中」「请取餐」「拒单」，但仍避免粗暴红色满屏。
- 链接/次操作常用黄铜字，而不是下划线蓝链。

---



## 6. 店员端页面构图指引（在统一视觉下的信息架构）

> 顾客端首屏是「品牌 Hero + 仪式入口」；店员端首屏应是「工作队列」，但材料与节奏同源。



### 6.1 队列首页（建议主 Tab）

- **不要**全屏营销 Hero。
- 顶部：当前门店一行（名称 + 「切换」黄铜字）+ 简短营业状态（moss/灰）。
- 中部：分段筛选（待接单 / 制作中 / 待取餐）——用 `8rpx` moss 分段，不是彩色 Tab。
- 列表：订单卡（cloud + 轻阴影）。
  - 顶行：取餐号/桌号（字重 500）+ 状态（moss）
  - 中：商品行（`$mp-text-2`）
  - 底：时间 caption + 右侧主操作（小 primary 或 brass ghost）
- 一单一主操作，避免卡上堆多个实心按钮。



### 6.2 订单详情

- 纸色底 + cloud 信息卡分层。
- 金额宋体放大。
- 底栏：次要 `secondary` + 主操作 `primary`。
- 危险操作（拒单）用 `ghost`/`secondary` 文案色 `$mp-danger`，确认放 Sheet。



### 6.3 门店/设置

- 单元格组 + 少量卡片。
- 开关类选中态用 moss inset，与 checkout 模式卡一致。



### 6.4 我的（店员）

- 可用缩小版深色卡展示「店员名 / 门店 / 角色」。
- 列表入口同顾客端 mine-cells。
- 退出用 `secondary` block。

---



## 7. 动效与交互

- 克制：按压缩放约 `0.98`、透明度变化即可。
- 不要弹跳、闪烁、强震动动效作为默认。
- Sheet：自底部托出；mask 可点关闭。
- 触控热区建议 ≥ `72rpx`（项目组件文档约定）。

---



## 8. 实现检查清单（Codex 交付前自检）

- [ ] `page` 背景是 `#f7f4ee`，不是纯白或冷灰
- [ ] 主按钮是苔绿 `#33473d`，不是蓝/绿霓虹
- [ ] 强调链接/次要 CTA 是黄铜 `#9a7b4f`
- [ ] 标题/价格/Tab 使用宋体栈
- [ ] 卡片只用 cloud + 轻阴影或 inset hairline
- [ ] 圆角只有 8 / 16 / 24 / pill(chip) 体系
- [ ] Tab 为文字型，选中 moss、未选 text-3
- [ ] 无紫色渐变、无厚阴影、无仪表盘首屏
- [ ] 危险色仅用于真正危险路径
- [ ] rpx 基准按 750 稿；间距以 12/24/32 节奏

---



## 9. 可直接粘贴的 SCSS Token 块

```scss
/* 元气善筑 tokens — 店员端必须与顾客端一致 */
$mp-ink: #14110f;
$mp-moss: #33473d;
$mp-moss-deep: #2a3a32;
$mp-brass: #9a7b4f;
$mp-brass-soft: #b8966a;
$mp-paper: #f7f4ee;
$mp-cloud: #faf8f4;
$mp-stone: #e8e2d8;
$mp-text: #14110f;
$mp-text-2: #6b635a;
$mp-text-3: #948c82;
$mp-border: rgba(20, 17, 15, 0.1);
$mp-danger: #8f4a3c;
$mp-tab-bg: #ffffff;
$mp-mask: rgba(20, 17, 15, 0.45);

$uni-border-radius-sm: 8rpx;
$uni-border-radius-base: 16rpx;
$uni-border-radius-lg: 24rpx;
$uni-spacing-row-sm: 12rpx;
$uni-spacing-row-base: 24rpx;
$uni-spacing-row-lg: 32rpx;
```

---



## 10. 最短摘要（给实现代理）

**用暖纸底** `#f7f4ee`**、苔绿主色** `#33473d`**、黄铜点缀** `#9a7b4f`**、墨色文字** `#14110f`**；正文苹方系、标题/价格/Tab 用宋体；卡片云色轻阴影或 inset 发丝边；圆角 8/16/24；按钮方润 8rpx 苔绿；Tab 纯文字。店员端把 Hero 换成队列工具布局，但材料与顾客端必须是同一套 Soorak 视觉语言。**

---



## 11. 给 AI 的代码对照清单（必读）

设计店员端时：**先读本规范，再打开下列顾客端源码**。规范定义「该长什么样」，下列文件是「已经长成什么样」的活样本；冲突时以 `reference/uni.scss` + 组件实现为准。

### 11.1 第一优先级（必读，建立品牌骨架）


| 顺序  | 路径                                                       | 看什么                                                                                                           |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `reference/uni.scss`                                     | 全部 `$mp-*` / `$uni-*` token：色、圆角、间距                                                                           |
| 2   | `reference/styles/global.scss`                           | `page` 底色与正文字体；`.t-label` / `.t-hero` / `.t-title` / `.t-section` / `.t-product` / `.t-caption` / `.mp-empty` |
| 3   | `reference/components/soorak-button/soorak-button.vue`   | primary / secondary / ghost 三态与按压反馈                                                                           |
| 4   | `reference/components/soorak-nav-bar/soorak-nav-bar.vue` | 顶栏半透明纸色、品牌字距、标题层级、角标                                                                                          |
| 5   | `reference/components/soorak-tab-bar/soorak-tab-bar.vue` | 纯文字 Tab、宋体、选中苔绿 / 未选灰棕                                                                                        |
| 6   | `reference/components/soorak-sheet/soorak-sheet.vue`     | 遮罩、顶圆角面板、关闭栏、footer 纸色条                                                                                       |
| 7   | `reference/components/soorak-chrome/soorak-chrome.vue`   | 页面壳：Nav + body 留白 + Tab + Sheet 的组装方式                                                                         |




### 11.2 第二优先级（读完再画列表 / 表单 / 底栏）


| 路径                                                             | 看什么                                           |
| -------------------------------------------------------------- | --------------------------------------------- |
| `reference/components/soorak-store-card/soorak-store-card.vue` | 信息卡：cloud 底、轻阴影、选中 moss inset、黄铜/苔绿状态字        |
| `reference/pages/orders/index.vue`                             | 订单列表卡：顶栏状态、商品行、底部分割 + 宋体金额                    |
| `reference/pages/checkout/index.vue`                           | 表单卡 inset 边、模式选择选中态、**底部操作条**（店员端主 CTA 最应抄这份） |
| `reference/pages/menu/index.vue`                               | 分段控件（8rpx moss）vs pill chip（ink 选中）的区分        |
| `reference/pages/menu/components/product-card.vue`             | 图文行、标签角标、宋体价格、黄铜次操作                           |
| `reference/components/soorak-cart-sheet/soorak-cart-sheet.vue` | Sheet 内列表 + 大号主按钮字距                           |




### 11.3 第三优先级（气质参考，结构勿照搬到店员首屏）


| 路径                               | 看什么                                          |
| -------------------------------- | -------------------------------------------- |
| `reference/pages/home/index.vue` | 品牌 Hero、veil 渐变、区块标题节奏；**店员端不要复制全屏 Hero 构图** |
| `reference/pages/mine/index.vue` | 深色墨底身份卡、brass 进度、单元格组、secondary 退出           |




### 11.4 建议给 AI 的提示词片段（可直接粘贴）

```text
请先阅读 docs/STAFF_VISUAL_SPEC.md，再对照顾客端下列文件实现店员端 UI，保持同一套 Soorak 视觉语言（暖纸底 / 苔绿主色 / 黄铜点缀 / 宋体标题）：

必读：
- reference/uni.scss
- reference/styles/global.scss
- reference/components/soorak-button/soorak-button.vue
- reference/components/soorak-nav-bar/soorak-nav-bar.vue
- reference/components/soorak-tab-bar/soorak-tab-bar.vue
- reference/components/soorak-sheet/soorak-sheet.vue
- reference/components/soorak-chrome/soorak-chrome.vue

列表与工具页对照：
- reference/pages/orders/index.vue
- reference/pages/checkout/index.vue
- reference/components/soorak-store-card/soorak-store-card.vue
- reference/pages/menu/index.vue

气质参考（勿照搬 Hero 结构）：
- reference/pages/home/index.vue
- reference/pages/mine/index.vue

约束：禁止紫色渐变、厚阴影、图标型 Tab、仪表盘首屏；主 CTA 用苔绿 8rpx 圆角按钮；队列筛选用 8rpx 分段而非彩色胶囊堆。
```



### 11.5 阅读顺序建议

1. Token + 排印（`uni.scss` → `global.scss`）
2. 原子组件（button → nav → tab → sheet → chrome）
3. 业务样本（orders / checkout / store-card / menu）
4. 最后扫一眼 home / mine 确认「茶咖气质」，再开始画店员端线框与样式

