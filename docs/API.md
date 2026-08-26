# 接口

## 环境配置

```dotenv
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=10000
```

所有 `VITE_` 变量都会进入前端产物，不得存放服务端秘密。小程序请求生产接口时还需要在平台后台配置合法域名。

仓库只提交 `.env.example`。本地开发前复制为 `.env.development`，生产构建前复制为 `.env.production`，再填写对应环境配置。复制出的实际环境文件已被 Git 忽略，不应提交。

## 新增领域接口

```ts
import { http } from '@/plugin/request'
import type { PageResult } from '@/common/types/api'

interface UserItem { id: number; name: string }

export function getUserList(page: number) {
  return http.get<PageResult<UserItem>>('/users', { page })
}

export function createUser(data: { name: string }) {
  return http.post<UserItem>('/users', data)
}
```

页面只调用领域函数，不直接调用 `uni.request`。统一封装负责基础地址、超时、Token、响应解包和通用错误提示。

模板约定业务请求只使用 GET 和 POST：查询使用 `http.get`，提交、新增或其他写操作统一使用 `http.post`。`http` 不提供 PUT 和 DELETE。

## 请求与响应拦截器

请求和响应处理位于 `src/plugin/request/interceptors.ts`，负责 Token 注入、HTTP 状态判断、业务响应解包和错误提示。`src/plugin/request/index.ts` 负责集成这些拦截器，并暴露与 Web 模板一致的 `http.get/http.post`。

## 响应约定

模板默认使用：

```json
{ "code": 0, "message": "success", "data": {} }
```

如果真实接口不同，只调整 `src/common/types/api.ts` 与 `src/plugin/request/interceptors.ts`。

## 鉴权

登录链路：

1. 前端 `getWxLoginCode()`：小程序调用 `uni.login` 拿临时 `code`；H5 使用 `h5-dev-*` 开发码。
2. `POST /auth/wx-login` 把 `code` 交给后端（AppSecret 只存在服务端）。
3. 后端返回 `{ token, expiresIn, user }`；前端写入 `access_token`，请求拦截器自动带 `Authorization: Bearer`。
4. 启动时 `restoreSession()` 用 `GET /auth/profile` 校验本地会话；401 会清本地登录态。

## 联调说明

- 本地假后端（`mock/`）已删除，所有环境直连真实后端。
- H5 开发由 Vite 代理 `/api` 到 `vite.config.ts` 配置的 `server.proxy['/api'].target`（默认 `http://127.0.0.1:8000`）。
- 微信开发者工具联调时，将 `VITE_API_BASE_URL` 设为后端完整地址（如 `http://127.0.0.1:8000`），并勾选「不校验合法域名」。
- 开发态支付兜底接口 `POST /api/mp/customer/payments/mock-paid` 由真实后端提供（见 DEV-011）。
