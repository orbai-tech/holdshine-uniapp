# 跨端构建与发布

## H5

```bash
cp .env.example .env.production
# 编辑 .env.production，关闭 Mock 并填写生产接口地址
npm run build:h5
```

输出目录通常为 `dist/build/h5`。部署服务器应配置前端路由、HTTPS、API 代理和静态资源缓存。

## 微信小程序

```bash
npm run build:mp-weixin
```

输出目录通常为 `dist/build/mp-weixin`。发布前：

1. 在 `src/manifest.json` 填写自己的 AppID。
2. 在微信公众平台配置 request 合法域名。
3. 使用微信开发者工具导入构建目录。
4. 检查基础库版本、隐私接口、权限和分包体积。
5. 在真机验证网络、授权、分享、返回和安全区。

## 添加其他平台

安装与当前 UniApp 编译器版本完全一致的平台包，例如支付宝平台需要 `@dcloudio/uni-mp-alipay`，再增加对应脚本：

```json
{ "dev:mp-alipay": "uni -p mp-alipay", "build:mp-alipay": "uni build -p mp-alipay" }
```

不要混用不同 build 编号的 `@dcloudio/*` 包，否则可能出现编译器与运行时不匹配。

## 发布检查

- 类型检查、H5 构建和目标小程序构建通过。
- 生产环境关闭 Mock，接口域名为 HTTPS。
- AppID、应用名称、版本号和权限声明属于当前项目。
- 没有测试账号、真实 Token、旧品牌素材或调试地址。
- TabBar 页面使用 `uni.switchTab`，普通页面使用 `uni.navigateTo`。
- 已验证刘海屏、底部安全区、弱网、空数据和请求失败状态。
