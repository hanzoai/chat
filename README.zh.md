<p align="center"><img src=".github/hero.svg" alt="Hanzo Chat" width="880"></p>

# Hanzo Chat

Hanzo AI 云的对话入口：多模型对话，内置智能体、工具与检索增强，全部运行在 Hanzo 的后端之上。已上线：[hanzo.chat](https://hanzo.chat)。

Hanzo Chat 与 [hanzo.app](https://hanzo.app)（应用构建器）和 Hanzo 控制台（管理端）互为姊妹产品。所有推理、代码执行与网页搜索都经由统一的 Hanzo API（`api.hanzo.ai/v1`）完成，登录则联合到 Hanzo IAM（[hanzo.id](https://hanzo.id)）。

## 功能

- **多模型对话** — Zen 系列模型及其他前沿模型，通过 `api.hanzo.ai` 提供服务。
- **智能体** — 在对话中直接构建智能体，或用 `/agent` 命令或 `@提及` 运行你的 Hanzo Cloud 智能体（`/v1/agents`）。
- **MCP 工具** — 接入 Model Context Protocol（模型上下文协议）服务器以调用工具。
- **检索增强（RAG）** — 基于你自己的文件和文档进行对话。
- **网页搜索** — 通过 Hanzo 网页搜索获得有据可循的回答。
- **代码解释器** — 在沙箱运行时中执行代码。
- **图像生成** — 在对话中直接生成图像。
- **访客对话** — 无需注册即可试用免费的 Zen 模型（可选，默认关闭）。

## 环境要求

- Node.js 24（见 `.nvmrc`）
- pnpm 10
- Hanzo API 密钥 — 在 [hanzo.ai/dashboard](https://hanzo.ai/dashboard) 获取

## 快速开始（Docker）

```bash
git clone https://github.com/hanzoai/chat.git
cd chat
cp .env.example .env        # 填入 HANZO_API_KEY
make up
```

打开 http://localhost:3080。`make up` 会从 `compose.yml` 启动完整技术栈（应用、MongoDB、Meilisearch）；`make down` 停止。

## 开发

```bash
pnpm install               # 安装工作区依赖
pnpm build:packages        # 构建共享的工作区包
pnpm backend:dev           # API 服务，端口 :3080（nodemon）
pnpm frontend:dev          # Vite 客户端开发服务器（另开一个终端）
```

测试与检查：

```bash
pnpm test:all              # 全部工作区测试
pnpm e2e                   # Playwright 端到端测试
pnpm lint                  # ESLint
pnpm format                # Prettier
```

## 配置

密钥存放在 `.env` 中；模型目录与端点配置位于 `chat.yaml`（复制 `chat.example.yaml`）。主要变量：

```env
HANZO_API_KEY=             # Hanzo API 密钥 — 推理、工具、搜索
MONGO_URI=                 # MongoDB 连接 — 对话历史、用户
JWT_SECRET=                # 会话令牌签名
CREDS_KEY=                 # 凭据加密
CREDS_IV=
```

登录通过 OpenID Connect 联合到 Hanzo IAM（`OPENID_ISSUER=https://hanzo.id`，客户端 `hanzo-chat`）。

## 工作区结构

```
api/           Express 后端（:3080）— 路由、控制器、Mongoose 模型
client/        React 前端（Vite）
packages/      data-provider · data-schemas · api · client · agents · mcp
```

## 文档

- 文档：https://hanzo.ai/docs/chat
- 部署、IAM 与平台说明：[`docs/`](./docs)
- 问题反馈：https://github.com/hanzoai/chat/issues

## 许可证

MIT 许可证。基于 LibreChat（MIT）分支开发。见 [LICENSE](./LICENSE)。
