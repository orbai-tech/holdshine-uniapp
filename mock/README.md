# 元气善筑 Mock 后端

本地假后端，用来打通「前端 `uni.login` → 换 token → 带 Bearer 访问」这条鉴权链路。

微信 `AppSecret` 只放在本目录的 `.env`，不会进入小程序 / H5 产物。

## 启动

```bash
# 在仓库根目录
npm run mock
```

默认监听 `http://127.0.0.1:3780`。

若报 `EADDRINUSE`（端口已被占用），在 PowerShell 中结束占用进程后再启动：

```powershell
netstat -ano | findstr :3780
taskkill /PID <上面 LISTENING 对应的 PID> /F
```

或一条命令直接结束：

```powershell
Get-NetTCPConnection -LocalPort 3780 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

首次使用请复制环境文件：

```bash
cp mock/.env.example mock/.env
```

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 探活 |
| POST | `/auth/wx-login` | body: `{ code, platform }`，返回 token + user |
| GET | `/auth/profile` | Header: `Authorization: Bearer <token>` |
| POST | `/auth/logout` | 使当前 token 失效 |

响应形状与前端约定一致：`{ code: 0, message, data }`。

## 行为

- 以 `h5-dev-` / `dev-` / `mock-` 开头的 code 一律走模拟 openid。
- 其它 code 在配置了 `WX_APPID` + `WX_SECRET` 且 `WX_LIVE_LOGIN=true` 时，会调用微信 `jscode2session`；失败则回落模拟会话，保证 H5 也能测通。

## 联调注意

- 微信开发者工具请勾选「不校验合法域名、web-view、TLS 版本以及 HTTPS 证书」。
- 真机无法访问电脑的 `127.0.0.1`，需改成电脑局域网 IP，并同步修改 `.env.development` 里的 `VITE_API_BASE_URL`。
