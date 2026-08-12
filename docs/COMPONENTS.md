# 组件开发与调用

## SoorakChrome

各 Tab 页的导航栏 + 规格/购物袋浮层。打开方为当前 Tab；规格数据来自 `catalog` store；购物袋来自 `cart` store。关闭规格会重置杯型/温度/加料/数量。

## SoorakButton

`variant`: `primary` | `secondary` | `ghost`；`block` 通栏。主色为苔绿 `#33473d`。

## SoorakSheet

遮罩点击与「关闭」触发 `close`。`footer` 插槽可选。

## UniApp 基础组件

触控目标建议不小于 72rpx。避免依赖浏览器 DOM。页面专属组件放在对应页面包内。
