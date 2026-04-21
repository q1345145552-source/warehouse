# 海外仓经营管理系统 MVP

第四阶段已完成：系统已升级为“JWT鉴权 + refresh续期 + 仓库级数据隔离 + KPI规则配置化 + 利润快照自动计算 + 可追踪日志”的增强闭环。

## 技术栈

- 前端：Next.js (App Router, TypeScript)
- 后端：NestJS (TypeScript)
- 数据库：PostgreSQL + Prisma

## 目录结构

- `frontend`：仓库端与管理员端前端
- `backend`：模块化后端 API
- `backend/prisma`：Prisma Schema 与 Seed
- `database`：数据库说明
- `docs`：实施文档（技术栈、数据模型、页面清单）

## 已实现能力

### 1) 登录与角色

- 登录页：`/login`
- 角色仅两类：`warehouse`（仓库端）和 `admin`（管理员）
- 前端保存 `accessToken + refreshToken`
- 后端采用 `JwtAuthGuard + RolesGuard`
- access token 失效后前端自动调用 refresh 接口续期
- 账号已迁移为数据库用户模型，支持仓库绑定与状态控制
- 登录安全增强：密码哈希、失败次数锁定、refresh token 持久化与失效控制

### 2) 财务流程（基础闭环）

- 仓库端：创建财务记录草稿 -> 提交审核
- 管理员：审核通过 / 驳回
- 支持收入、支出、采购三类记录
- 工作台和财务页可查看聚合数据

### 3) KPI流程（基础闭环）

- 仓库端：创建 KPI 草稿 -> 提交审核
- 管理员：审核通过后自动生成 KPI 结果、指标分、AI分析建议（基础规则）
- 支持按日/周/月和仓库/个人录入基础数据

### 4) 需求流程（基础闭环）

- 仓库端：提交需求、查看详情、确认完成
- 管理员：审核通过/驳回、要求补资料、更新进度、关闭需求

### 5) 审计日志

- 关键操作写入 `operation_log`，可在管理员日志接口查看


## 第三阶段新增能力

## 第四阶段新增能力

### 1) JWT + Refresh Token

- 登录返回 `accessToken` 和 `refreshToken`
- 新增刷新接口：`POST /api/auth/refresh`
- 前端请求 401 时自动刷新并重试

### 2) 仓库级数据隔离

- 仓库端只能访问自己 `warehouseId` 的财务/KPI/需求数据
- 请求体中传入的仓库ID对仓库端无效，后端以 token 中仓库ID为准
- 管理员可跨仓库查看与审核

### 3) 鉴权基建

- 新增 `Public` 装饰器
- 新增 `CurrentUser` 装饰器与用户上下文
- 全局守卫顺序：JWT鉴权 -> 角色鉴权


### 1) 财务利润快照自动计算

- 新增管理员手动触发接口：`POST /api/admin/finance/profit-snapshots/recalculate`
- 新增定时任务：每小时自动计算本月利润快照
- 自动生成仓库月度快照与合伙人分账结果

### 2) KPI规则配置化并生效

- KPI评分参数支持仓库端配置（权重/阈值/分级）
- 支持“保存草稿 -> 发布生效”
- KPI审核通过后按当前生效规则计算评分和等级

### 3) 管理端增强

- 管理员页新增：利润快照重算按钮
- 管理员页新增：KPI提交审核通过动作
- 管理员页新增：账号权限管理（启停、解锁、角色切换、密码重置）
- 新增接口：系统日志筛选与 CSV 导出

### 4) KPI 规则深化（新增）

- 新增规则版本差异对比接口
- 新增规则版本回滚接口（回滚后自动切换 currentVersion）

### 5) 财务规则深化（新增）

- 新增财务分摊规则与版本：`FinanceAllocationRule` / `FinanceAllocationRuleVersion`
- 利润快照计算支持按生效规则执行（共享成本系数、采购成本系数）
- 新增财务规则接口：创建、保存草稿、发布、版本对比、回滚

## 后端模块

- `auth`
- `dashboard`
- `warehouses`
- `finance`
- `kpi`
- `demands`
- `admin`
- `prisma`

## 前端页面

- `/login` 登录页
- `/` 仓库端工作台
- `/finance` 财务管理（提交后自动进入审核流）
- `/finance/analysis` 财务分析看板（AI分析、分账结果）
- `/kpi` KPI考核（提交后自动进入审核流）
- `/kpi/analysis` KPI分析看板（指标下钻）
- `/demands` 需求中心
- `/admin` 管理员总览（含需求审核动作）

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并确认：

- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `PORT`

### 3. 生成 Prisma Client

```bash
npm --prefix backend run prisma:generate
```

### 4. 初始化数据库（本地 PostgreSQL 已启动后）

```bash
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed
```

### 5. 启动服务

```bash
npm --prefix backend run start:dev
npm --prefix frontend run dev
```

- 前端：`http://localhost:3000`
- 后端：`http://localhost:3001/api`

### 6. 数据迁移（新增用户与安全字段）

```bash
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed
```

## 构建验证

```bash
npm --prefix backend run build
npm --prefix frontend run build
```

## 测试命令

```bash
npm --prefix backend run test
npm --prefix backend run test:e2e
```

## Docker 与 CI

- 新增 `docker-compose.yml`（postgres + backend + frontend）
- 新增 `backend/Dockerfile`、`frontend/Dockerfile`
- 新增 GitHub Actions：`.github/workflows/ci.yml`（安装、生成 Prisma Client、前后端构建）
- 新增本地部署脚本：`scripts/deploy-local.sh`
- 一键部署命令：`npm run deploy:local`
- 发布清单文档：`docs/RELEASE_CHECKLIST.md`

## 上线检查清单（建议）

- **环境变量**：核对 `DATABASE_URL`、`JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`、`NEXT_PUBLIC_API_BASE_URL`
- **数据库迁移**：执行 `npm --prefix backend run prisma:migrate` 并确认迁移记录完整
- **基础数据**：执行 `npm --prefix backend run prisma:seed`（生产环境请替换演示账号密码）
- **质量门禁**：
  - `npm --prefix backend run test`
  - `npm --prefix backend run test:e2e`
  - `npm --prefix backend run build`
  - `npm --prefix frontend run build`
- **CI 状态**：确认 GitHub Actions `CI` 通过（含 build/test/e2e）
- **核心路径冒烟**：登录 -> refresh -> 管理端审核 -> 财务规则发布 -> 利润快照重算
- **回滚预案**：
  - 应用回滚：切回上一稳定镜像/提交
  - 数据回滚：执行相应 Prisma 回滚 SQL（或按备份策略恢复）
  - 配置回滚：恢复上一版环境变量与密钥

## 下一步建议（第五阶段）

1. 接入真实用户表与密码加密（当前为演示账号）
2. KPI规则增加版本回滚与差异对比
3. 财务快照补充项目级与多币种核算
4. 增加消息中心与审批通知
5. 补充 E2E 测试、Docker化与部署脚本
