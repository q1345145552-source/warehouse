# 一期数据模型与业务口径

## 财务核心模型

- `Warehouse`：仓库主体
- `FinanceProject`：项目/订单维度
- `FinanceRecord`：统一财务流水（`income`/`expense`/`purchase`）
- `ProfitSnapshot`：利润快照（仓库月度）
- `Partner`：合伙人
- `PartnerProfitResult`：合伙人分账结果
- `FinanceAnalysis`：财务分析结果

## KPI 核心模型

- `KpiRule`：规则主表（按仓库）
- `KpiRuleVersion`：规则版本（支持发布/生效）
- `KpiEntry`：原始填报数据
- `KpiResult`：评分结果
- `KpiMetricScore`：维度得分明细
- `KpiAnalysis`：KPI 分析结果

## 需求中心与审计模型

- `Demand`：需求单
- `DemandProgressLog`：处理进度留痕
- `WarehouseFeature`：模块开通能力
- `OperationLog`：关键动作审计日志

## 财务口径（一期）

- 月利润 = `收入 - 支出 - 采购`
- 支出区分 `direct/shared`（直接成本、公共成本）
- 利润结果快照化，避免前台实时重算导致口径漂移
- 合伙人分账 = `净利润 * ratio + adjustment`

## 审核状态流转（一期）

- 财务：`draft -> submitted -> approved/rejected`
- KPI：`draft -> submitted -> approved/rejected`
- 需求：`submitted -> processing -> completed/closed/rejected/waiting_material`

## 数据隔离策略

- 仓库端接口默认按 `user.warehouseId` 自动过滤
- 管理员可跨仓库查询与审核
- 仓库端传入 `warehouseId` 不作为最终可信来源
