export type FinanceRecordType = 'income' | 'expense' | 'purchase';
export type FinanceTargetModule =
  | 'balance_sheet'
  | 'profit_statement'
  | 'operation_monitor'
  | 'fixed_assets'
  | 'business_income'
  | 'consumables'
  | 'topup_details';

export type FinanceDashboard = {
  monthlyIncome: number;
  monthlyExpense: number;
  purchaseCost: number;
  netProfit: number;
};

export type FinanceRecord = {
  id: string;
  recordDate: string;
  recordType: FinanceRecordType;
  targetModule?: FinanceTargetModule | null;
  moduleData?: Record<string, string | number> | null;
  category: string;
  amount: number;
  currencyCode?: string;
  fxRateToCny?: number | null;
  amountCny?: number | null;
  status: string;
  note?: string | null;
};

export type ProfitSnapshot = {
  id: string;
  periodStartDate: string;
  periodEndDate: string;
  netProfit: number;
  status: string;
};

export type ProjectProfit = {
  projectId: string;
  projectName: string;
  income: number;
  directExpense?: number;
  allocatedExpense?: number;
  expense: number;
  directPurchase?: number;
  allocatedPurchase?: number;
  purchase: number;
  netProfit: number;
  adjustment: number;
};

export type FinanceAnalysis = {
  id: string;
  analysisType: string;
  content: string;
  riskLevel: string;
  createdAt: string;
};

export type AllocationLine = {
  id: string;
  snapshotId: string;
  warehouseId: string;
  projectId: string | null;
  projectName: string;
  sourceType: 'expense' | 'purchase' | string;
  method: string;
  ruleDetailId?: string | null;
  ruleVersionId?: string | null;
  ruleId?: string | null;
  sourceDetailLabel?: string;
  sourceAmountCny: number;
  allocatedAmountCny: number;
  ratioApplied: number | null;
  createdAt: string;
};

export type AllocationSummary = {
  projectId: string;
  projectName: string;
  expenseAllocated: number;
  purchaseAllocated: number;
  totalAllocated: number;
};

export type AllocationResponse = {
  month: string;
  lines: AllocationLine[];
  summary: AllocationSummary[];
};

export type SaveFinanceRecordPayload = {
  recordDate: string;
  category: string;
  recordType: FinanceRecordType;
  targetModule: FinanceTargetModule;
  moduleData: Record<string, string | number>;
  amount: number;
  currencyCode: string;
  fxRateToCny?: number;
  counterparty?: string;
  costNature?: string;
  note?: string;
};
