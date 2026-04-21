import type { FinanceTargetModule } from './types';

export type FinanceTerminologyMode = 'professional' | 'simple';

export type FinanceTermKey =
  | 'finance.title'
  | 'finance.subtitle'
  | 'finance.mode.professional'
  | 'finance.mode.simple'
  | 'finance.switchLabel'
  | 'finance.tab.dataInput'
  | 'finance.tab.balanceSheet'
  | 'finance.tab.profitStatement'
  | 'finance.tab.operationMonitor'
  | 'finance.tab.fixedAssets'
  | 'finance.tab.businessIncome'
  | 'finance.tab.consumables'
  | 'finance.tab.topupDetails'
  | 'finance.common.manualRefresh'
  | 'finance.common.lastRefreshed'
  | 'finance.module.balance_sheet'
  | 'finance.module.profit_statement'
  | 'finance.module.operation_monitor'
  | 'finance.module.fixed_assets'
  | 'finance.module.business_income'
  | 'finance.module.consumables'
  | 'finance.module.topup_details'
  | 'finance.dataInput.dashboard.monthlyIncome'
  | 'finance.dataInput.dashboard.monthlyExpense'
  | 'finance.dataInput.dashboard.purchaseCost'
  | 'finance.dataInput.dashboard.netProfit'
  | 'finance.recordType.income'
  | 'finance.recordType.expense'
  | 'finance.recordType.purchase'
  | 'finance.form.routeToPrefix'
  | 'finance.form.category'
  | 'finance.form.amount'
  | 'finance.form.fxRate'
  | 'finance.form.counterparty'
  | 'finance.form.costNature'
  | 'finance.form.note'
  | 'finance.form.submit'
  | 'finance.form.submitting'
  | 'finance.dataInput.msg.loadError'
  | 'finance.dataInput.msg.saveSuccess'
  | 'finance.dataInput.msg.saveError'
  | 'finance.dataInput.recentTitle'
  | 'finance.dataInput.col.date'
  | 'finance.dataInput.col.type'
  | 'finance.dataInput.col.category'
  | 'finance.dataInput.col.targetModule'
  | 'finance.dataInput.col.amountOriginal'
  | 'finance.dataInput.col.amountCny'
  | 'finance.dataInput.col.moduleFields'
  | 'finance.dataInput.col.status'
  | 'finance.dataInput.targetUnset';

const FINANCE_TERMS: Record<FinanceTermKey, Record<FinanceTerminologyMode, string>> = {
  'finance.title': {
    professional: '财务管理',
    simple: '资金管理',
  },
  'finance.subtitle': {
    professional: '通过横向子菜单管理财务录入、报表与经营监控。',
    simple: '通过顶部菜单管理记账、看表和运营数据。',
  },
  'finance.mode.professional': {
    professional: '专业版术语',
    simple: '专业版术语',
  },
  'finance.mode.simple': {
    professional: '简洁版术语',
    simple: '简洁版术语',
  },
  'finance.switchLabel': {
    professional: '术语版本',
    simple: '术语显示',
  },
  'finance.tab.dataInput': {
    professional: '财务数据输入',
    simple: '记账录入',
  },
  'finance.tab.balanceSheet': {
    professional: '资产负债表',
    simple: '资金总览',
  },
  'finance.tab.profitStatement': {
    professional: '利润表',
    simple: '收支利润',
  },
  'finance.tab.operationMonitor': {
    professional: '经营监控表',
    simple: '运营看板',
  },
  'finance.tab.fixedAssets': {
    professional: '固定资产表',
    simple: '资产设备',
  },
  'finance.tab.businessIncome': {
    professional: '业务类别收入表',
    simple: '收入分类',
  },
  'finance.tab.consumables': {
    professional: '耗材清单',
    simple: '日常耗材',
  },
  'finance.tab.topupDetails': {
    professional: '充值明细',
    simple: '充值流水',
  },
  'finance.common.manualRefresh': {
    professional: '手动刷新',
    simple: '立即更新',
  },
  'finance.common.lastRefreshed': {
    professional: '最近刷新',
    simple: '更新时间',
  },
  'finance.module.balance_sheet': {
    professional: '资产负债表',
    simple: '资金总览',
  },
  'finance.module.profit_statement': {
    professional: '利润表',
    simple: '收支利润',
  },
  'finance.module.operation_monitor': {
    professional: '经营监控表',
    simple: '运营看板',
  },
  'finance.module.fixed_assets': {
    professional: '固定资产表',
    simple: '资产设备',
  },
  'finance.module.business_income': {
    professional: '业务类别收入表',
    simple: '收入分类',
  },
  'finance.module.consumables': {
    professional: '耗材清单',
    simple: '日常耗材',
  },
  'finance.module.topup_details': {
    professional: '充值明细',
    simple: '充值流水',
  },
  'finance.dataInput.dashboard.monthlyIncome': {
    professional: '月度收入',
    simple: '本月进账',
  },
  'finance.dataInput.dashboard.monthlyExpense': {
    professional: '月度支出',
    simple: '本月开销',
  },
  'finance.dataInput.dashboard.purchaseCost': {
    professional: '采购成本',
    simple: '进货成本',
  },
  'finance.dataInput.dashboard.netProfit': {
    professional: '净利润',
    simple: '净赚',
  },
  'finance.recordType.income': {
    professional: '收入',
    simple: '进账',
  },
  'finance.recordType.expense': {
    professional: '支出',
    simple: '开销',
  },
  'finance.recordType.purchase': {
    professional: '采购',
    simple: '进货',
  },
  'finance.form.routeToPrefix': {
    professional: '传输到：',
    simple: '记到：',
  },
  'finance.form.category': {
    professional: '业务分类',
    simple: '事项分类',
  },
  'finance.form.amount': {
    professional: '金额',
    simple: '数额',
  },
  'finance.form.fxRate': {
    professional: '汇率（选填）',
    simple: '换算汇率（可不填）',
  },
  'finance.form.counterparty': {
    professional: '交易对手',
    simple: '对方名称',
  },
  'finance.form.costNature': {
    professional: '成本性质（选填）',
    simple: '费用类型（可不填）',
  },
  'finance.form.note': {
    professional: '备注（选填）',
    simple: '说明（可不填）',
  },
  'finance.form.submit': {
    professional: '保存并提交',
    simple: '保存提交',
  },
  'finance.form.submitting': {
    professional: '提交中...',
    simple: '正在提交...',
  },
  'finance.dataInput.msg.loadError': {
    professional: '财务数据加载失败，请稍后重试。',
    simple: '数据加载失败，请稍后再试。',
  },
  'finance.dataInput.msg.saveSuccess': {
    professional: '财务记录已保存并提交审核，已传输到对应模块。',
    simple: '已保存并提交，数据已记到对应模块。',
  },
  'finance.dataInput.msg.saveError': {
    professional: '提交失败，请检查输入后重试。',
    simple: '提交失败，请检查填写内容。',
  },
  'finance.dataInput.recentTitle': {
    professional: '最近财务记录',
    simple: '最近记账',
  },
  'finance.dataInput.col.date': {
    professional: '日期',
    simple: '日期',
  },
  'finance.dataInput.col.type': {
    professional: '类型',
    simple: '类型',
  },
  'finance.dataInput.col.category': {
    professional: '分类',
    simple: '分类',
  },
  'finance.dataInput.col.targetModule': {
    professional: '目标模块',
    simple: '记到哪',
  },
  'finance.dataInput.col.amountOriginal': {
    professional: '原币金额',
    simple: '原币种金额',
  },
  'finance.dataInput.col.amountCny': {
    professional: 'CNY金额',
    simple: '人民币金额',
  },
  'finance.dataInput.col.moduleFields': {
    professional: '模块字段',
    simple: '明细字段',
  },
  'finance.dataInput.col.status': {
    professional: '状态',
    simple: '状态',
  },
  'finance.dataInput.targetUnset': {
    professional: '未配置（历史数据）',
    simple: '未指定（旧数据）',
  },
};

/** 各目标模块专用录入字段：专业版 / 简洁版文案（仅名词不同） */
const FINANCE_MODULE_FIELD_LABELS: Record<FinanceTargetModule, Record<string, Record<FinanceTerminologyMode, string>>> = {
  balance_sheet: {
    assetCategory: { professional: '资产科目', simple: '资产类别' },
    liabilityCategory: { professional: '负债科目', simple: '负债类别' },
    ownerEquityType: { professional: '权益分类', simple: '自有资金类型' },
  },
  profit_statement: {
    incomeItem: { professional: '收入项目', simple: '收入名称' },
    expenseItem: { professional: '费用项目', simple: '费用名称' },
    accountingPeriod: { professional: '会计期间', simple: '所属期间' },
  },
  operation_monitor: {
    orderCount: { professional: '订单量', simple: '单量' },
    fulfillmentRate: { professional: '履约率(%)', simple: '完成率(%)' },
    refundRate: { professional: '退货率(%)', simple: '退回率(%)' },
  },
  fixed_assets: {
    assetName: { professional: '资产名称', simple: '设备名称' },
    depreciationYears: { professional: '折旧年限', simple: '使用年限' },
    purchaseDate: { professional: '购置日期', simple: '购买日期' },
  },
  business_income: {
    businessLine: { professional: '业务线', simple: '业务类型' },
    channel: { professional: '渠道', simple: '销售渠道' },
    settlementCycle: { professional: '结算周期', simple: '结账周期' },
  },
  consumables: {
    consumableName: { professional: '耗材名称', simple: '用品名称' },
    usageDepartment: { professional: '使用部门', simple: '使用班组' },
    quantity: { professional: '数量', simple: '数量' },
  },
  topup_details: {
    topupChannel: { professional: '充值渠道', simple: '充值方式' },
    accountId: { professional: '账户标识', simple: '账户信息' },
    topupReference: { professional: '流水号', simple: '凭证号' },
  },
};

export function getFinanceTerm(key: FinanceTermKey, mode: FinanceTerminologyMode) {
  return FINANCE_TERMS[key][mode];
}

const MODULE_TERM_KEYS: Record<FinanceTargetModule, FinanceTermKey> = {
  balance_sheet: 'finance.module.balance_sheet',
  profit_statement: 'finance.module.profit_statement',
  operation_monitor: 'finance.module.operation_monitor',
  fixed_assets: 'finance.module.fixed_assets',
  business_income: 'finance.module.business_income',
  consumables: 'finance.module.consumables',
  topup_details: 'finance.module.topup_details',
};

export function getFinanceModuleLabel(module: FinanceTargetModule, mode: FinanceTerminologyMode) {
  return getFinanceTerm(MODULE_TERM_KEYS[module], mode);
}

export function getFinanceModuleFieldLabel(module: FinanceTargetModule, fieldKey: string, mode: FinanceTerminologyMode) {
  const row = FINANCE_MODULE_FIELD_LABELS[module]?.[fieldKey];
  if (!row) return fieldKey;
  return row[mode];
}
