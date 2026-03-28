# MeetFlow — 会议管理系统

## 项目背景

MeetFlow 是一个面向团队的会议预约与管理系统，核心场景包括：

- **会议预约**：选择会议室、设定时间、邀请参与者
- **冲突检测**：自动检测同一会议室的时间重叠，防止重复预订
- **周期会议**：支持每日/每周/每月重复会议
- **角色权限**：管理员（全权）、主持人（管理自己的会议）、参与者（查看+确认参会）
- **通知提醒**：会议变更、取消、会前提醒（规划中）
- **多端访问**：Web 前端（PWA）+ CLI 命令行工具

---

## 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────┐
│                   pnpm monorepo                  │
├──────────┬──────────┬──────────┬────────────────┤
│  shared  │  server  │   web    │      cli       │
│ 类型/校验 │  后端API  │  Web前端  │   命令行工具    │
│  工具函数  │  数据库   │   PWA    │               │
└──────────┴──────────┴──────────┴────────────────┘
      ▲         ▲          ▲           ▲
      │         │          │           │
      └─────────┴──────────┴───────────┘
           所有包依赖 @meetflow/shared
```

### 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| **语言** | TypeScript 5.7 (strict) | 全栈统一类型系统 |
| **前端框架** | React 19 | Vite 6 构建 |
| **UI 组件** | shadcn/ui + Radix UI | 可定制、无锁定的组件库 |
| **样式** | Tailwind CSS 3.4 | CSS 变量主题系统（亮/暗色） |
| **路由** | React Router 7 | 声明式路由 + 守卫 |
| **数据请求** | TanStack React Query 5 | 缓存、自动重试、乐观更新 |
| **PWA** | vite-plugin-pwa | 离线支持、NetworkFirst API 缓存 |
| **后端框架** | Hono 4 | 轻量、TypeScript 原生 HTTP 框架 |
| **数据库** | SQLite (better-sqlite3) | 零配置、可迁移至 Turso |
| **ORM** | Drizzle ORM 0.38 | 类型安全的 SQL 查询构建 |
| **认证** | jose (JWT) | HS256 签名、无状态鉴权 |
| **校验** | Zod | 运行时类型校验 + TypeScript 推导 |
| **CLI** | Commander.js | Node.js 命令行框架 |
| **测试** | Vitest 3 | 全栈统一测试框架 |
| **包管理** | pnpm 9.15 + workspace | monorepo 依赖管理 |

### 数据库设计

6 张表，SQLite 文件存储：

```
┌─────────┐     ┌──────────┐     ┌───────────────────────┐
│  users  │     │  rooms   │     │       meetings        │
│─────────│     │──────────│     │───────────────────────│
│ id (PK) │◄──┐ │ id (PK)  │◄──┐ │ id (PK)               │
│ name    │   │ │ name     │   │ │ title                  │
│ email   │   │ │ location │   │ │ description            │
│ pwdHash │   │ │ capacity │   │ │ agenda                 │
│ role    │   │ │ equipment│   │ │ start_time / end_time  │
│createdAt│   │ │createdAt │   │ │ room_id (FK→rooms)     │
└─────────┘   │ └──────────┘   │ │ host_id (FK→users)    │
              │                │ │ recurrence             │
              │                │ │ status                 │
              │                │ │ createdAt / updatedAt  │
              │                │ └───────────────────────┘
              │                            │
              │    ┌────────────────────────┤
              │    │                        │
              │    ▼                        ▼
              │  ┌──────────────────┐  ┌──────────────┐
              │  │meeting_participants│ │notifications │
              │  │──────────────────│  │──────────────│
              └──│ meeting_id (FK)  │  │ id (PK)      │
                 │ user_id (FK)     │  │ user_id (FK) │
                 │ status           │  │ meeting_id   │
                 └──────────────────┘  │ type / msg   │
                                       │ read         │
                                       └──────────────┘
                                                       
              ┌──────────────┐                        
              │ attachments  │                        
              │──────────────│                        
              │ id (PK)      │                        
              │ meeting_id   │                        
              │ fileName     │                        
              │ fileSize/url │                        
              └──────────────┘                        
```

### API 路由

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 无 |
| POST | `/api/auth/login` | 用户登录，返回 JWT | 无 |
| GET | `/api/meetings` | 会议列表（分页、状态筛选） | 无 |
| GET | `/api/meetings/:id` | 会议详情（含参与者） | 无 |
| POST | `/api/meetings` | 创建会议（含冲突检测） | host/admin |
| PUT | `/api/meetings/:id` | 更新会议 | host/admin |
| DELETE | `/api/meetings/:id` | 取消会议（软删除） | host/admin |
| POST | `/api/meetings/:id/confirm` | 确认参会 | participant |
| GET | `/api/rooms` | 会议室列表（分页） | 无 |
| GET | `/api/rooms/:id` | 会议室详情 | 无 |
| POST | `/api/rooms` | 创建会议室 | 需登录 |
| GET | `/api/rooms/:id/availability` | 查询可用时段 | 无 |
| GET | `/api/users` | 用户列表 | admin |
| GET | `/api/users/:id` | 用户详情 | 自己/admin |
| PATCH | `/api/users/:id` | 更新用户信息 | 自己/admin |

### 前端路由

| 路径 | 页面 | 鉴权 |
|------|------|------|
| `/login` | 登录页 | 公开 |
| `/register` | 注册页 | 公开 |
| `/` | 会议列表（首页） | 需登录 |
| `/meetings/new` | 创建会议 | 需登录 |
| `/meetings/:id` | 会议详情 | 需登录 |
| `/rooms` | 会议室列表 | 需登录 |

---

## 子包职责

### `packages/shared` — 共享类型与工具

**职责**：所有包共享的数据模型、校验规则和纯工具函数。

| 文件 | 说明 |
|------|------|
| `schemas/meeting.schema.ts` | Meeting / CreateMeetingInput Zod schema |
| `schemas/room.schema.ts` | Room Zod schema |
| `schemas/user.schema.ts` | User Zod schema |
| `types/index.ts` | MeetingParticipant / Notification / Attachment 接口 |
| `utils/time-conflict.ts` | `hasTimeConflict()` 时间冲突检测 |

**测试**：4 个测试文件，78 个测试用例，核心函数 100% 覆盖。

### `packages/server` — 后端 API 服务

**职责**：RESTful API 服务器，处理业务逻辑、数据持久化、鉴权。

| 文件 | 说明 |
|------|------|
| `index.ts` | Hono app 定义、路由挂载 |
| `serve.ts` | HTTP 服务启动入口 |
| `seed.ts` | 测试账号数据填充 |
| `db/schema.ts` | Drizzle ORM 数据库表定义（6 张表） |
| `db/index.ts` | 数据库连接、测试用内存数据库 |
| `middleware/auth.ts` | JWT 鉴权中间件 |
| `routes/auth.routes.ts` | 注册 / 登录 |
| `routes/meeting.routes.ts` | 会议 CRUD + 冲突检测 + 确认参会 |
| `routes/room.routes.ts` | 会议室 CRUD + 可用时段查询 |
| `routes/user.routes.ts` | 用户查询 / 更新（角色权限控制） |

**测试**：4 个测试文件，68 个测试用例，路由覆盖率 93%+。

**关键设计**：
- 所有路由使用工厂函数模式 `createXxxRoutes(db)` 支持依赖注入
- 测试使用内存 SQLite 数据库，无副作用
- 密码使用 SHA-256 哈希（生产环境应升级为 bcrypt）
- 会议取消为软删除（status → cancelled）

### `packages/web` — Web 前端

**职责**：用户界面，SPA + PWA 应用。

| 文件 | 说明 |
|------|------|
| `App.tsx` | 根组件（QueryClient + AuthProvider + Router） |
| `services/api.ts` | 全部 API 端点的 fetch 封装 |
| `hooks/use-auth.tsx` | 认证上下文（用户状态、登录/登出） |
| `routes/index.tsx` | 路由定义 + ProtectedRoute 守卫 |
| `components/layout.tsx` | 应用壳（导航栏 + 内容区） |
| `components/ui/*` | shadcn/ui 基础组件（Button/Input/Card/Badge） |
| `pages/login.tsx` | 登录页 |
| `pages/register.tsx` | 注册页 |
| `pages/meeting-list.tsx` | 会议列表（状态筛选） |
| `pages/meeting-detail.tsx` | 会议详情（参与者、操作按钮） |
| `pages/create-meeting.tsx` | 创建会议表单 |
| `pages/room-list.tsx` | 会议室列表 |

**测试**：9 个测试文件，58 个测试用例，覆盖 API 服务、认证上下文、路由守卫和全部页面。

### `packages/cli` — 命令行工具

**职责**：终端界面，直接调用远程 API，支持在 OpenClaw 等环境中通过命令行管理会议。

| 文件 | 说明 |
|------|------|
| `index.ts` | CLI 入口，注册所有命令 |
| `services/api.ts` | ApiClient 类，封装全部后端 API 调用 |
| `services/config.ts` | 配置管理（`~/.meetflowrc`） |
| `formatters.ts` | 终端表格/详情格式化输出（picocolors 彩色） |
| `commands/auth.ts` | `auth login` / `auth register` |
| `commands/meeting.ts` | 会议 CRUD + 确认参会 |
| `commands/room.ts` | 会议室列表/详情/创建 |
| `commands/user.ts` | 用户列表/详情 |
| `commands/notification.ts` | 通知列表/标记已读 |
| `commands/config.ts` | CLI 配置（server URL / token） |

**测试**：7 个测试文件，64 个测试用例，覆盖 API 客户端、格式化输出和全部命令 action 函数。

---

## 当前实现进度

### 已完成

| 模块 | 功能 | 测试 | 状态 |
|------|------|------|------|
| **shared** | Zod schema（Meeting/Room/User） | 36 测试 | ✅ 完成 |
| **shared** | TypeScript 类型（Participant/Notification/Attachment） | — | ✅ 完成 |
| **shared** | `hasTimeConflict()` 时间冲突检测 | 11 测试 | ✅ 完成 |
| **shared** | Schema 校验测试（有效/无效输入） | 31 测试 | ✅ 完成 |
| **server** | 数据库 schema（6 张表） | — | ✅ 完成 |
| **server** | 用户注册（Zod 校验 + 去重 + JWT） | 6 测试 | ✅ 完成 |
| **server** | 用户登录（密码验证 + JWT） | 5 测试 | ✅ 完成 |
| **server** | JWT 鉴权中间件 | 3 测试 | ✅ 完成 |
| **server** | 会议室 CRUD + 可用时段查询 | 15 测试 | ✅ 完成 |
| **server** | 会议 CRUD + 时间冲突检测 | 23 测试 | ✅ 完成 |
| **server** | 会议取消（软删除） | ✅ | ✅ 完成 |
| **server** | 确认参会 | ✅ | ✅ 完成 |
| **server** | 用户管理（角色权限控制） | 16 测试 | ✅ 完成 |
| **web** | API 服务层（全部端点封装） | 19 测试 | ✅ 完成 |
| **web** | 认证上下文（AuthProvider + useAuth） | 6 测试 | ✅ 完成 |
| **web** | shadcn/ui 基础组件（Button/Input/Card/Badge） | — | ✅ 完成 |
| **web** | 路由系统 + ProtectedRoute 守卫 | 10 测试 | ✅ 完成 |
| **web** | 应用布局（导航栏 + 内容区） | — | ✅ 完成 |
| **web** | 登录页 / 注册页 | 9 测试 | ✅ 完成 |
| **web** | 会议列表页（状态筛选） | 4 测试 | ✅ 完成 |
| **web** | 会议详情页（参与者 + 操作按钮） | 4 测试 | ✅ 完成 |
| **web** | 创建会议表单 | 3 测试 | ✅ 完成 |
| **web** | 会议室列表页 | 3 测试 | ✅ 完成 |
| **web** | Tailwind + shadcn/ui 主题配置 | — | ✅ 完成 |
| **web** | PWA 配置（离线缓存 + API NetworkFirst） | — | ✅ 完成 |
| **cli** | API 客户端（ApiClient 类，22 个方法） | 22 测试 | ✅ 完成 |
| **cli** | 终端格式化输出（6 个格式化函数） | 11 测试 | ✅ 完成 |
| **cli** | auth 命令（login / register） | 4 测试 | ✅ 完成 |
| **cli** | meeting 命令（list/show/create/update/cancel/confirm） | 13 测试 | ✅ 完成 |
| **cli** | room 命令（list/show/create） | 6 测试 | ✅ 完成 |
| **cli** | user 命令（list/show） | 3 测试 | ✅ 完成 |
| **cli** | notification 命令（list/read） | 5 测试 | ✅ 完成 |
| **infra** | pnpm monorepo + workspace | — | ✅ 完成 |
| **infra** | concurrently 一键启动（pnpm dev） | — | ✅ 完成 |
| **infra** | .env 环境变量配置 | — | ✅ 完成 |
| **infra** | seed 脚本（测试账号） | — | ✅ 完成 |

### 未完成 / 待开发

| 模块 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| **server** | 数据库迁移（drizzle-kit） | 高 | 当前直接建表，需迁移脚本 |
| **server** | 周期会议自动生成实例 | 中 | recurrence 字段已定义，逻辑未实现 |
| **server** | 通知系统（提醒/变更/取消） | 中 | 表已建，推送逻辑未实现 |
| **server** | 附件上传/下载 | 低 | 表已建，文件处理逻辑未实现 |
| **server** | 密码哈希升级为 bcrypt | 中 | 当前 SHA-256，生产前需升级 |
| **web** | 会议编辑页面 | 高 | 有更新 API，缺前端表单 |
| **web** | 会议室创建页面 | 中 | 有 API，缺前端表单（仅管理员） |
| **web** | 会议室可用时段展示 | 中 | API 已有，前端未对接 |
| **web** | 用户资料编辑页面 | 低 | API 已有，前端未实现 |
| **web** | 深色模式切换 | 低 | CSS 变量已配置，切换逻辑未加 |
| **web** | E2E 测试（Playwright） | 中 | 配置已加，用例未编写 |
| **web** | 响应式适配（移动端） | 中 | 需要移动端布局优化 |

---

## 测试覆盖

### 总览

| 包 | 测试文件数 | 测试用例数 | 状态 |
|---|---|---|---|
| **shared** | 4 | 78 | ✅ 全部通过 |
| **server** | 8 | 81 | ✅ 全部通过 |
| **web** | 9 | 58 | ✅ 全部通过 |
| **cli** | 7 | 64 | ✅ 全部通过 |
| **总计** | **28** | **281** | **全部通过** |

### 覆盖率

| 包 | 语句覆盖 | 分支覆盖 | 函数覆盖 |
|---|---|---|---|
| shared | 88.7% | 57.1% | 40% |
| server（路由） | 93%+ | 91.6% | 81.8% |
| web | — | — | — |

> shared 的低分支/函数覆盖率是因为 barrel export 文件（index.ts）被计入但未直接测试。

---

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm 9.15+

### 安装与启动

```bash
# 安装依赖
pnpm install

# 初始化测试账号
pnpm --filter @meetflow/server seed

# 一键启动（server + web）
pnpm dev
```

### 默认测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 (admin) | admin@meetflow.com | admin123 |
| 主持人 (host) | host@meetflow.com | host123 |
| 参与者 (participant) | user@meetflow.com | user123 |

### 端口配置

在各自的 `.env` 文件中修改：

- **server**: `packages/server/.env` → `PORT=3210`
- **web**: `packages/web/.env` → `VITE_PORT=7283`

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单个包
pnpm --filter @meetflow/shared test
pnpm --filter @meetflow/server test
pnpm --filter @meetflow/web test
pnpm --filter @meetflow/cli test

# 带覆盖率报告
pnpm --filter @meetflow/server test -- --coverage
```

---

## CLI 使用指南

### 安装与配置

```bash
# 进入 CLI 目录运行
pnpm --filter @meetflow/cli dev -- <command>

# 或直接使用 tsx
npx tsx packages/cli/src/index.ts <command>
```

### 初始配置

```bash
# 设置服务器地址（默认 http://localhost:3000）
meetflow config --server http://your-server:3000

# 登录后 token 会自动保存到 ~/.meetflowrc
meetflow auth login --email admin@meetflow.com --password admin123

# 或手动设置 token
meetflow config --token <jwt-token>
```

### 认证 (auth / a)

```bash
# 登录
meetflow auth login --email admin@meetflow.com --password admin123

# 注册新账号
meetflow auth register --name "张三" --email zhangsan@example.com --password mypassword
```

### 会议管理 (meeting / m)

```bash
# 列出会议（支持筛选）
meetflow meeting list
meetflow meeting list --status scheduled --date 2024-01-15
meetflow meeting list --json

# 查看会议详情（含会议室和参与者信息）
meetflow meeting show <meeting-id>

# 创建会议
meetflow meeting create \
  --title "每日站会" \
  --start "2024-01-15T09:00:00Z" \
  --duration 30 \
  --room <room-id> \
  --participants "user-id-1,user-id-2"

# 使用 --end 代替 --duration
meetflow meeting create \
  --title "需求评审" \
  --start "2024-01-15T14:00:00Z" \
  --end "2024-01-15T15:30:00Z" \
  --room <room-id>

# 创建带描述和议程的会议
meetflow meeting create \
  --title "Sprint 回顾" \
  --start "2024-01-15T16:00:00Z" \
  --duration 60 \
  --room <room-id> \
  --description "Sprint 回顾会议" \
  --agenda "1. 回顾目标\n2. 讨论改进\n3. 行动项" \
  --recurrence weekly

# 更新会议
meetflow meeting update <meeting-id> --title "新标题"
meetflow meeting update <meeting-id> --start "2024-01-16T10:00:00Z" --duration 45
meetflow meeting update <meeting-id> --participants "u1,u2,u3"

# 取消会议
meetflow meeting cancel <meeting-id>

# 确认参会
meetflow meeting confirm <meeting-id>
```

### 会议室管理 (room / r)

```bash
# 列出所有会议室
meetflow room list

# 查看可用会议室
meetflow room list --available --date 2024-01-15

# JSON 格式输出
meetflow room list --json

# 查看会议室详情
meetflow room show <room-id>

# 创建会议室（需登录）
meetflow room create --name "大会议室" --capacity 20 --location "3楼"
```

### 用户管理 (user / u)

```bash
# 列出所有用户
meetflow user list
meetflow user list --json

# 查看用户详情
meetflow user show <user-id>
```

### 通知管理 (notification / n)

```bash
# 列出通知
meetflow notification list
meetflow notification list --unread
meetflow notification list --read
meetflow notification list --json

# 标记通知为已读
meetflow notification read <notification-id>
```

### 命令速查表

| 命令 | 别名 | 说明 |
|------|------|------|
| `auth login` | `a login` | 登录 |
| `auth register` | `a register` | 注册 |
| `meeting list` | `m list` | 会议列表 |
| `meeting show <id>` | `m show <id>` | 会议详情 |
| `meeting create` | `m create` | 创建会议 |
| `meeting update <id>` | `m update <id>` | 更新会议 |
| `meeting cancel <id>` | `m cancel <id>` | 取消会议 |
| `meeting confirm <id>` | `m confirm <id>` | 确认参会 |
| `room list` | `r list` | 会议室列表 |
| `room show <id>` | `r show <id>` | 会议室详情 |
| `room create` | `r create` | 创建会议室 |
| `user list` | `u list` | 用户列表 |
| `user show <id>` | `u show <id>` | 用户详情 |
| `notification list` | `n list` | 通知列表 |
| `notification read <id>` | `n read <id>` | 标记已读 |
| `config` | — | CLI 配置 |

### OpenClaw / AI Agent 集成

项目提供了两个 opencode skill，AI Agent（如 OpenClaw）可自动加载以获取项目上下文和 CLI 用法：

| Skill | 路径 | 说明 |
|-------|------|------|
| **meetflow** | `.agents/skills/meetflow/SKILL.md` | 项目架构、编码规范、TDD 流程、子包职责 |
| **meetflow-cli** | `.agents/skills/meetflow-cli/SKILL.md` | CLI 全部命令参考、参数说明、使用示例 |

在 OpenClaw 中加载 `meetflow-cli` skill 后，Agent 即可通过命令行完成会议创建、查询、取消等操作，无需手动查阅 API 文档。

**示例流程**：
```
用户: 帮我创建明天上午10点的站会，30分钟，在大会议室
Agent: (加载 meetflow-cli skill)
  → meetflow room list --json              # 查找大会议室 ID
  → meetflow user list --json              # 获取参会者列表
  → meetflow meeting create --title "站会" \
      --start "2026-03-29T10:00:00Z" --duration 30 \
      --room <id> --participants "u1,u2"
  → 已创建会议，ID: xxx
```

---

## 项目目录结构

```
meetflow/
├── package.json                    # monorepo 根配置
├── pnpm-workspace.yaml             # workspace 定义
├── tsconfig.base.json              # 共享 TypeScript 配置
├── skills-lock.json                # opencode skills 锁文件
│
├── .agents/skills/                 # opencode agent skills
│   ├── meetflow/                   # ← 项目架构 skill（开发规范、架构指南）
│   ├── meetflow-cli/               # ← CLI 命令参考 skill（命令用法、参数说明）
│   ├── adapt/ animate/ audit/ ...  # UI/设计相关 skills
│
├── packages/
│   ├── shared/                     # 共享类型与工具
│   │   ├── package.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schemas/            # Zod 校验 schema
│   │       ├── types/              # TypeScript 接口
│   │       └── utils/              # 纯工具函数
│
│   ├── server/                     # 后端 API
│   │   ├── .env                    # 环境变量（PORT, JWT_SECRET）
│   │   ├── package.json
│   │   ├── drizzle.config.ts       # Drizzle Kit 配置
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts            # Hono app 定义
│   │       ├── serve.ts            # HTTP 启动入口
│   │       ├── seed.ts             # 测试数据填充
│   │       ├── db/                 # 数据库（schema + 连接）
│   │       ├── middleware/         # 中间件（JWT 鉴权）
│   │       └── routes/             # API 路由
│
│   ├── web/                        # Web 前端
│   │   ├── .env                    # 环境变量（VITE_PORT）
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts          # Vite + PWA 配置
│   │   ├── tailwind.config.ts      # Tailwind + shadcn/ui 主题
│   │   ├── postcss.config.js
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── main.tsx            # 入口
│   │       ├── App.tsx             # 根组件
│   │       ├── components/         # UI 组件
│   │       │   ├── ui/             # shadcn/ui 基础组件
│   │       │   └── layout.tsx      # 应用布局
│   │       ├── pages/              # 页面组件
│   │       ├── routes/             # 路由定义
│   │       ├── hooks/              # React hooks
│   │       ├── services/           # API 客户端
│   │       ├── styles/             # 全局样式
│   │       └── lib/                # 工具函数
│
│   └── cli/                        # 命令行工具
│       ├── package.json
│       └── src/
│           ├── index.ts            # CLI 入口
│           ├── commands/           # 命令定义
│           └── services/           # API 客户端 + 配置
```
