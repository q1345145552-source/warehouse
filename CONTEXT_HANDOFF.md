# CONTEXT HANDOFF

更新时间：2026-04-13

## 1) 当前开发进度（已完成）

### 1.1 基础架构与工程状态
- Monorepo 结构稳定：`frontend` + `backend` + `database` + `docs`。
- 后端核心模块持续可用：`auth`、`admin`、`dashboard`、`finance`、`inventory`、`kpi`、`products`、`demands`、`warehouses`。
- 当前构建与回归基线通过：
  - `npm --prefix backend run prisma:dbpush`
  - `npm --prefix backend run prisma:generate`
  - `npm --prefix backend run build`
  - `npm --prefix backend run test:e2e`
  - `npm --prefix frontend run build`

### 1.2 鉴权与安全
- 双角色模型稳定：`warehouse`、`admin`。
- 全局鉴权与角色守卫生效：`JwtAuthGuard + RolesGuard`。
- 账号安全能力保持可用：
  - `UserAccount` + `RefreshToken` 持久化
  - 密码哈希（bcrypt）
  - 登录失败锁定
  - refresh token 轮换与失效

### 1.3 商品销售与库存处理（近阶段新增）
- 商品销售首版可用：仓库端可查看商品并提交采购意向到需求池。
- 库存处理首版可用：三类库存页面 + 管理员库存审核页。
- 库存审核链路已包含审核人追踪：
  - `InventoryItem.reviewedByUserId`
  - 列表接口可回传 `reviewedBy` 基本信息
- 后端 e2e 已补库存权限与状态流转关键契约（mock/契约风格）。

### 1.4 仓库财务端框架重构（本阶段重点）
- 财务模块已重构为横向子菜单框架，入口统一在 `/finance`。
- 已拆分 8 个子模块页面：
  - `/finance/data-input`（财务数据输入）
  - `/finance/balance-sheet`（资产负债表）
  - `/finance/profit-statement`（利润表）
  - `/finance/operation-monitor`（经营监控表）
  - `/finance/fixed-assets`（固定资产表）
  - `/finance/business-income`（业务类别收入表）
  - `/finance/consumables`（耗材清单）
  - `/finance/topup-details`（充值明细）
- 左侧导航已收敛为“财务管理”入口，二级导航在财务页内部横向展示。

### 1.5 财务“输入->模块传输”链路（本阶段重点）
- `FinanceRecord` 已新增 `targetModule` 字段并持久化。
- 输入页已要求先选择“目标模块”后提交，提交 payload 带 `targetModule`。
- 7 个财务模块页已按 `targetModule` 过滤显示；历史数据无该字段时走兜底规则。
- 已接入前端同步信号机制：
  - 输入成功后触发统一刷新事件
  - 各模块页监听后自动刷新
  - 保留手动刷新与最近刷新时间展示

### 1.6 数据模型与前端层新增
- 后端模型新增：`FinanceRecord.targetModule`。
- 前端新增财务模块抽象层：
  - `frontend/src/lib/finance/types.ts`
  - `frontend/src/lib/finance/finance-api.ts`
  - `frontend/src/lib/finance/module-routing.ts`
  - `frontend/src/lib/finance/sync.ts`
- 财务模块路由与横向菜单配置：
  - `frontend/src/app/finance/finance-tabs.ts`
  - `frontend/src/app/finance/layout.tsx`

### 1.7 当前可用登录方式
- 登录页：`http://localhost:3000/login`
- 演示账号：
  - 仓库端 A：`warehouse_demo / 123456`
  - 仓库端 B：`warehouse_demo_b / 123456`
  - 管理员：`admin_demo / 123456`

---

## 2) 未解决问题与已知缺口

### 2.1 财务模块“字段粒度”仍是统一录入
- 当前已支持按模块路由（`targetModule`），但输入字段仍以统一表单为主。
- 用户已明确提出“每个模块要填写的数据不一样”，尚未实现模块差异化字段结构。

### 2.2 双术语版本未落地
- “专业版/简洁版（仅名词映射不同）”需求已确认，但尚未在代码中实现。
- 需要统一术语字典、切换状态持久化、8页文案接入。

### 2.3 报表口径仍有简化
- 资产负债表、利润表、经营监控表目前以输入数据聚合为主，仍偏简版展示。
- 未完成完整会计科目层级、折旧摊销、科目映射配置化等深化能力。

### 2.4 测试覆盖与上线保障仍待加强
- `test:e2e` 仍以契约回归为主，真实链路默认跳过。
- 监控告警、日志聚合、traceId、慢查询治理未接入。
- 安全合规项（密码复杂度、IP 限流、审计留存策略）待补齐。

---

## 3) 下一步计划（建议顺序）

### 阶段 A：财务输入模型深化（优先）
1. 设计“模块差异化字段”方案（建议先主表 + JSON 扩展字段，后续再拆子表）。
2. 在输入页按目标模块动态渲染字段模板（模块不同，字段不同）。
3. 后端新增字段校验与存储规则，确保录入可追溯、可审计。

### 阶段 B：财务双版本术语
1. 建立财务术语字典（professional/simple）。
2. 在财务 layout 增加版本切换并持久化到 localStorage。
3. 8 个财务子页面统一接入术语映射，保证“仅名词不同，逻辑一致”。

### 阶段 C：报表能力增强
1. 将资产负债表/利润表从简版聚合升级为可配置口径（科目映射、期间筛选、导出）。
2. 补充“未归类数据”治理能力（提示、纠偏入口、批量修正）。
3. 完善输入到报表的时序一致性提示（刷新状态、失败重试、同步日志）。

### 阶段 D：稳定性与上线保障
1. 把真实链路 smoke 纳入 CI（数据库容器化）。
2. 增加财务模块关键前端交互回归（输入->传输->报表）。
3. 接入监控告警、审计策略和回滚演练。

---

## 4) 交接建议
- 当前版本已具备“财务输入先选模块 -> 数据定向传输到对应功能框”的主流程演示能力。
- 下一阶段优先做“模块差异化字段”，这是当前业务诉求的核心缺口。
- 建议保持“路由框架与数据口径先稳定，再深化报表与术语体验”的迭代顺序，降低返工成本。

