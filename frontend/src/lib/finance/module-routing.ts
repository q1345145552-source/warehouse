import type { FinanceRecord, FinanceTargetModule } from './types';

export const FINANCE_TARGET_MODULE_OPTIONS: Array<{ value: FinanceTargetModule; label: string }> = [
  { value: 'balance_sheet', label: '资产负债表' },
  { value: 'profit_statement', label: '利润表' },
  { value: 'operation_monitor', label: '经营监控表' },
  { value: 'fixed_assets', label: '固定资产表' },
  { value: 'business_income', label: '业务类别收入表' },
  { value: 'consumables', label: '耗材清单' },
  { value: 'topup_details', label: '充值明细' },
];

const FALLBACK_KEYWORDS: Record<FinanceTargetModule, string[]> = {
  balance_sheet: [],
  profit_statement: [],
  operation_monitor: [],
  fixed_assets: ['固定资产', '设备', '资产'],
  business_income: [],
  consumables: ['耗材', '物料', '包材'],
  topup_details: ['充值', '预存', '余额'],
};

function includesKeywords(record: FinanceRecord, keywords: string[]) {
  if (keywords.length === 0) return false;
  const haystack = `${record.category ?? ''} ${record.note ?? ''}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function fallbackMatch(record: FinanceRecord, module: FinanceTargetModule) {
  if (module === 'balance_sheet') return true;
  if (module === 'profit_statement') return true;
  if (module === 'operation_monitor') return true;
  if (module === 'fixed_assets') return record.recordType === 'purchase' && includesKeywords(record, FALLBACK_KEYWORDS.fixed_assets);
  if (module === 'business_income') return record.recordType === 'income';
  if (module === 'consumables') return record.recordType === 'expense' && includesKeywords(record, FALLBACK_KEYWORDS.consumables);
  return record.recordType === 'income' && includesKeywords(record, FALLBACK_KEYWORDS.topup_details);
}

export function matchRecordToTargetModule(record: FinanceRecord, module: FinanceTargetModule) {
  if (record.targetModule) return record.targetModule === module;
  return fallbackMatch(record, module);
}
