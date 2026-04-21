export type FinanceTargetModule =
  | 'balance_sheet'
  | 'profit_statement'
  | 'operation_monitor'
  | 'fixed_assets'
  | 'business_income'
  | 'consumables'
  | 'topup_details';

type ModuleFieldType = 'text' | 'number' | 'date';

type ModuleFieldConfig = {
  key: string;
  required: boolean;
  type: ModuleFieldType;
};

export const FINANCE_MODULE_FIELD_CONFIG: Record<FinanceTargetModule, ModuleFieldConfig[]> = {
  balance_sheet: [
    { key: 'assetCategory', required: true, type: 'text' },
    { key: 'liabilityCategory', required: true, type: 'text' },
    { key: 'ownerEquityType', required: false, type: 'text' },
  ],
  profit_statement: [
    { key: 'incomeItem', required: true, type: 'text' },
    { key: 'expenseItem', required: true, type: 'text' },
    { key: 'accountingPeriod', required: false, type: 'date' },
  ],
  operation_monitor: [
    { key: 'orderCount', required: true, type: 'number' },
    { key: 'fulfillmentRate', required: false, type: 'number' },
    { key: 'refundRate', required: false, type: 'number' },
  ],
  fixed_assets: [
    { key: 'assetName', required: true, type: 'text' },
    { key: 'depreciationYears', required: true, type: 'number' },
    { key: 'purchaseDate', required: false, type: 'date' },
  ],
  business_income: [
    { key: 'businessLine', required: true, type: 'text' },
    { key: 'channel', required: false, type: 'text' },
    { key: 'settlementCycle', required: false, type: 'text' },
  ],
  consumables: [
    { key: 'consumableName', required: true, type: 'text' },
    { key: 'usageDepartment', required: false, type: 'text' },
    { key: 'quantity', required: true, type: 'number' },
  ],
  topup_details: [
    { key: 'topupChannel', required: true, type: 'text' },
    { key: 'accountId', required: true, type: 'text' },
    { key: 'topupReference', required: false, type: 'text' },
  ],
};
