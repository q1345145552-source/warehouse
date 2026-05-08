# CONTEXT HANDOFF

更新时间：2026-05-08

## 1) 当前开发进度（本阶段已完成）

### 1.1 架构与工程基线
- Monorepo 结构稳定：`frontend` + `backend` + `database` + `docs`。
- 后端核心业务模块持续可用：`auth`、`admin`、`dashboard`、`finance`、`inventory`、`kpi`、`products`、`demands`、`warehouses`。
- 构建与回归基线可通过：
  - `npm --prefix backend run prisma:dbpush`
  - `npm --prefix backend run prisma:generate`
  - `npm --prefix backend run build`
  - `npm --prefix backend run test:e2e`
  - `npm --prefix frontend run build`

### 1.2 鉴权与账号安全
- 双角色模型稳定：`warehouse`、`admin`。
- 全局鉴权与角色守卫生效：`JwtAuthGuard + RolesGuard`。
- 账号安全能力可用：
  - `UserAccount` + `RefreshToken` 持久化
  - 密码哈希（bcrypt）
  - 登录失败锁定
  - refresh token 轮换与失效

### 1.3 商品销售与库存链路
- 商品销售首版可用：仓库端可浏览商品并提交采购意向到需求池。
- 库存处理首版可用：三类库存页面 + 管理员库存审核页。
- 库存审核链路包含审核人追踪：
  - `InventoryItem.reviewedByUserId`
  - 列表接口返回 `reviewedBy` 基本信息
- 后端 e2e 已覆盖库存权限与状态流转关键契约（mock/契约风格）。

### 1.4 财务模块框架重构（本阶段核心成果）
- 财务模块已重构为统一入口 `/finance` + 页面内横向子菜单框架。
- 已拆分 8 个财务子页面：
  - `/finance/data-input`（财务数据输入）
  - `/finance/balance-sheet`（资产负债表）
  - `/finance/profit-statement`（利润表）
  - `/finance/operation-monitor`（经营监控表）
  - `/finance/fixed-assets`（固定资产表）
  - `/finance/business-income`（业务类别收入表）
  - `/finance/consumables`（耗材清单）
  - `/finance/topup-details`（充值明细）
- 左侧导航已收敛为“财务管理”单入口，二级导航在财务页内部统一展示。

### 1.5 财务“输入 -> 模块传输”主流程
- `FinanceRecord` 已新增并持久化 `targetModule` 字段。
- 输入页已要求先选“目标模块”再提交，payload 带 `targetModule`。
- 7 个目标财务模块页已按 `targetModule` 定向过滤；历史无字段数据走兜底展示规则。
- 已接入前端同步机制：
  - 输入成功后触发统一刷新事件
  - 各模块页监听事件后自动刷新
  - 保留手动刷新与最近刷新时间展示

### 1.6 相关代码层能力沉淀
- 后端模型新增：`FinanceRecord.targetModule`。
- 前端新增财务抽象层：
  - `frontend/src/lib/finance/types.ts`
  - `frontend/src/lib/finance/finance-api.ts`
  - `frontend/src/lib/finance/module-routing.ts`
  - `frontend/src/lib/finance/sync.ts`
- 财务路由与横向菜单配置：
  - `frontend/src/app/finance/finance-tabs.ts`
  - `frontend/src/app/finance/layout.tsx`

---

## 2) 未解决问题与已知缺口

### 2.1 财务输入字段仍为统一结构
- 当前已支持按模块路由传输（`targetModule`），但录入表单仍以统一字段为主。
- 业务已明确要求“模块间字段差异化”，该能力尚未落地。

### 2.2 双术语版本未实现
- “专业版 / 简洁版（仅名词映射不同）”需求已确认，但尚未接入代码。
- 仍需建设术语字典、版本切换持久化、8 页文案统一映射。

### 2.3 报表能力仍偏简化
- 资产负债表、利润表、经营监控表当前以输入数据聚合展示为主，口径较轻量。
- 完整科目层级、折旧摊销、科目映射配置化等能力尚未完成。

### 2.4 测试与上线保障有待加强
- `test:e2e` 目前仍以契约回归为主，真实链路默认未全量纳入。
- 监控告警、日志聚合、traceId、慢查询治理未完成接入。
- 安全合规项（密码复杂度、IP 限流、审计留存策略）待补齐。

---

## 3) 下一步计划（建议顺序）

### 阶段 A：财务输入模型深化（最高优先级）
1. 设计“模块差异化字段”数据方案（建议先“主表 + JSON 扩展字段”，后续再拆子表）。
2. 输入页按 `targetModule` 动态渲染字段模板，实现“不同模块填写不同数据”。
3. 后端补字段级校验、存储规则与审计信息，确保可追溯与可治理。

### 阶段 B：财务双版本术语
1. 建立财务术语字典（`professional` / `simple`）。
2. 在财务 `layout` 增加版本切换并持久化到 `localStorage`。
3. 8 个财务子页面统一接入术语映射，保证“逻辑一致，仅文案不同”。

### 阶段 C：报表能力增强
1. 将资产负债表、利润表升级为可配置口径（科目映射、期间筛选、导出）。
2. 增加“未归类数据”治理能力（提示、纠偏入口、批量修正）。
3. 完善输入到报表时序一致性提示（刷新状态、失败重试、同步日志）。

### 阶段 D：稳定性与上线保障
1. 将真实链路 smoke 纳入 CI（数据库容器化）。
2. 增加财务关键交互回归（输入 -> 传输 -> 报表）。
3. 接入监控告警、审计策略与回滚演练流程。

