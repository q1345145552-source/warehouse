import type { FinanceTargetModule } from './types';

export type FinanceModuleField = {
  key: string;
  type: 'text' | 'number' | 'date';
  required?: boolean;
  /** 提示语（专业口径示例，不随术语版本切换） */
  placeholder?: string;
};

export const FINANCE_MODULE_FIELD_TEMPLATES: Record<FinanceTargetModule, FinanceModuleField[]> = {
  balance_sheet: [
    { key: 'assetCategory', type: 'text', required: true, placeholder: '如：现金、存货' },
    { key: 'liabilityCategory', type: 'text', required: true, placeholder: '如：应付账款' },
    { key: 'ownerEquityType', type: 'text', placeholder: '如：实收资本' },
  ],
  profit_statement: [
    { key: 'incomeItem', type: 'text', required: true, placeholder: '如：仓储服务收入' },
    { key: 'expenseItem', type: 'text', required: true, placeholder: '如：运输费用' },
    { key: 'accountingPeriod', type: 'date' },
  ],
  operation_monitor: [
    { key: 'orderCount', type: 'number', required: true, placeholder: '填写本次对应订单量' },
    { key: 'fulfillmentRate', type: 'number', placeholder: '例如：98.5' },
    { key: 'refundRate', type: 'number', placeholder: '例如：1.2' },
  ],
  fixed_assets: [
    { key: 'assetName', type: 'text', required: true, placeholder: '如：分拣机设备' },
    { key: 'depreciationYears', type: 'number', required: true, placeholder: '例如：5' },
    { key: 'purchaseDate', type: 'date' },
  ],
  business_income: [
    { key: 'businessLine', type: 'text', required: true, placeholder: '如：B2B仓配' },
    { key: 'channel', type: 'text', placeholder: '如：平台渠道/直营网点' },
    { key: 'settlementCycle', type: 'text', placeholder: '如：T+7' },
  ],
  consumables: [
    { key: 'consumableName', type: 'text', required: true, placeholder: '如：打包胶带' },
    { key: 'usageDepartment', type: 'text', placeholder: '如：出库组' },
    { key: 'quantity', type: 'number', required: true, placeholder: '例如：120' },
  ],
  topup_details: [
    { key: 'topupChannel', type: 'text', required: true, placeholder: '如：银行转账' },
    { key: 'accountId', type: 'text', required: true, placeholder: '填写账户编号/账号后四位' },
    { key: 'topupReference', type: 'text', placeholder: '选填：支付流水号' },
  ],
};
