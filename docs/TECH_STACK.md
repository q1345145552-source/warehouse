# 一期技术栈与部署说明

## 技术栈确认

- 前端：`Next.js 15 + React 19 + TypeScript`
- 后端：`NestJS 11 + TypeScript`
- 数据库：`PostgreSQL + Prisma ORM`
- 认证：`JWT Access Token + Refresh Token`
- 定时任务：`@nestjs/schedule`
- 鉴权模型：`JwtAuthGuard + RolesGuard`（角色：`warehouse`、`admin`）

## 目录约定

- `frontend/`：仓库端与管理端前端
- `backend/`：API 与业务逻辑
- `backend/prisma/`：数据库模型与种子数据
- `database/`：数据库说明
- `docs/`：实施文档

## 本地部署步骤

1. 安装依赖：`npm install`
2. 配置环境变量：复制 `.env.example` 为 `.env`
3. 生成 Prisma Client：`npm --prefix backend run prisma:generate`
4. 执行迁移：`npm --prefix backend run prisma:migrate`
5. 写入种子：`npm --prefix backend run prisma:seed`
6. 启动后端：`npm --prefix backend run start:dev`
7. 启动前端：`npm --prefix frontend run dev`

## 生产部署建议（一期）

- 后端：`npm --prefix backend run build && npm --prefix backend run start:prod`
- 前端：`npm --prefix frontend run build && npm --prefix frontend run start`
- 数据库：独立 PostgreSQL 实例，按环境隔离连接串
- 必需环境变量：
  - `DATABASE_URL`
  - `NEXT_PUBLIC_API_BASE_URL`
  - `PORT`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
