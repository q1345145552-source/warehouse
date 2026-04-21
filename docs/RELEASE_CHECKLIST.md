# 发布检查清单

更新时间：2026-04-06

## 1. 发布前准备

- 确认目标分支 CI 全绿（build/test/e2e）。
- 确认 `DATABASE_URL` 指向目标环境数据库。
- 确认 `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET` 已替换为高强度随机值。
- 确认 `NEXT_PUBLIC_API_BASE_URL` 指向目标后端地址。
- 确认数据备份策略已执行（快照或备份点）。

## 2. 一次性部署步骤（建议顺序）

1. 安装依赖：`npm install`
2. 生成 Prisma Client：`npm --prefix backend run prisma:generate`
3. 执行数据库迁移：`npm --prefix backend run prisma:migrate`
4. 需要时写入种子：`npm --prefix backend run prisma:seed`
5. 构建后端：`npm --prefix backend run build`
6. 构建前端：`npm --prefix frontend run build`
7. 启动后端：`npm --prefix backend run start:prod`
8. 启动前端：`npm --prefix frontend run start`

## 3. 发布后冒烟验证

- 访问 `/login`，使用管理员账号登录。
- 管理端验证：
  - 日志列表可查、详情可看、CSV 可导出。
  - 审计汇总可查询、汇总 CSV 可导出。
  - 财务规则可创建、保存草稿、发布、回滚。
- 鉴权验证：
  - `POST /api/auth/login` 正常返回。
  - `POST /api/auth/refresh` 正常续期。
- 财务验证：
  - `POST /api/admin/finance/profit-snapshots/recalculate` 可执行。

## 4. 回滚方案

### 4.1 应用回滚

- 回滚后端到上一稳定构建（镜像或提交）。
- 回滚前端到上一稳定构建（镜像或提交）。

### 4.2 数据回滚

- 如果迁移已执行且需要回退，按数据库备份策略恢复。
- 对于不可逆迁移，优先采用“新迁移修复”而非强行回退历史。

### 4.3 配置回滚

- 恢复上一版环境变量与密钥。
- 重新部署并进行第 3 节冒烟验证。

## 5. 发布门禁（建议）

- 后端单测：`npm --prefix backend run test`
- 后端 E2E：`npm --prefix backend run test:e2e`
- 后端构建：`npm --prefix backend run build`
- 前端构建：`npm --prefix frontend run build`

