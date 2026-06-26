// ========== 报表类型 ==========

export type ProfitLossData = {
  month: string;
  totalRevenue: number;
  revenueByType: Record<string, number>;
  totalCost: number;
  totalFixedAsset: number;
  totalExpense: number;
  expenseByCategory: Record<string, { name: string; amount: number }>;
  operatingProfit: number;
  netProfit: number;
};

export type BalanceSheetData = {
  month: string;
  assets: {
    cashAndBank: number;
    otherReceivables: number;
    inventory: number;
    currentAssets: number;
    fixedAssetsCost: number;
    accumulatedDep: number;
    fixedAssetsNet: number;
    totalAssets: number;
  };
  liabilities: { advanceReceived: number; totalLiabilities: number };
  equity: { paidInCapital: number; retainedEarnings: number; totalEquity: number };
  totalLiabAndEquity: number;
  isBalanced: boolean;
};

export type ReconciliationData = {
  month: string;
  allPassed: boolean;
  checks: Array<{
    checkType: string;
    checkName: string;
    expectedValue: number;
    actualValue: number;
    difference: number;
    isPassed: boolean;
    details: string;
  }>;
};

export type BusinessProfitAnalysisItem = {
  item: string;
  currentAmount: number;
  prevAmount: number;
  changeAmount: number;
  changeRate: string;
};

export type BusinessProfitAnalysisData = {
  currentMonth: string;
  prevMonth: string;
  analysis: BusinessProfitAnalysisItem[];
};

export type FundSummaryData = {
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balanceThb: number;
  }>;
  totalBalance: number;
};

// ========== 应收应付 ==========

export type ARAPData = {
  receivables: Array<{
    customerId: string;
    customerName: string;
    balanceThb: number;
    balanceCny: number;
    type: string;
  }>;
  payables: Array<{
    name: string;
    amountThb: number;
    amountCny: number;
    description: string;
  }>;
  totalAR: number;
  totalAP: number;
  netAR: number;
};

// ========== 银行日记账 ==========

export type BankLedgerTransaction = {
  id: string;
  transactionDate: string;
  month: string;
  description: string;
  categoryName: string;
  incomeThb: number;
  incomeCny: number;
  expenseThb: number;
  expenseCny: number;
  balanceAfterThb: number;
  balanceAfterCny: number;
  remark?: string | null;
};

export type BankLedgerData = {
  accountName: string;
  accountType: string;
  summary: {
    totalIncomeThb: number;
    totalIncomeCny: number;
    totalExpenseThb: number;
    totalExpenseCny: number;
  };
  transactions: BankLedgerTransaction[];
};

// ========== 客户 ==========

export type CustomerInfo = {
  id: string;
  customerId: string;
  customerName: string;
  customerType: string;
  currencyPreference: string;
  exchangeRate: number | null;
  contactName: string | null;
  contactPhone: string | null;
  wechatId: string | null;
  status: string;
};

// ========== 充值 ==========

export type RechargeTransaction = {
  id: string;
  customerId: string;
  transactionDate: string;
  type: 'recharge' | 'billing';
  currency: string;
  amountThb: number;
  amountCny: number;
  exchangeRate: number | null;
  balanceAfterThb: number;
  balanceAfterCny: number;
  remark: string | null;
  refInvoiceId: string | null;
  customer?: { customerId: string; customerName: string };
};

export type CustomerBalance = {
  customerId: string;
  balanceThb: number;
  balanceCny: number;
};

// ========== 服务收入 ==========

export type ServiceRevenueEntry = {
  id: string;
  customerId: string;
  serviceMonth: string;
  serviceDate: string | null;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  amountThb: number;
  remark: string | null;
  refOrderId: string | null;
  status: string;
  customer?: { customerId: string; customerName: string };
};

export type MonthlyRevenueSummary = {
  month: string;
  byType: Record<string, { name: string; amount: number }>;
  byCustomer: Record<string, { name: string; amount: number }>;
  totalRevenue: number;
};

// ========== 银行账户 ==========

export type BankAccountInfo = {
  id: string;
  accountName: string;
  accountType: string;
  description: string | null;
  status: string;
  balanceThb: number;
  balanceCny: number;
};

export type BankTransaction = {
  id: string;
  bankAccountId: string;
  transactionDate: string;
  month: string;
  description: string;
  incomeThb: number;
  incomeCny: number;
  expenseThb: number;
  expenseCny: number;
  balanceAfterThb: number;
  balanceAfterCny: number;
  categoryId: string | null;
  categoryName?: string;
  bankAccountName?: string;
};

// ========== 固定资产 ==========

export type FixedAssetEntry = {
  id: string;
  warehouseId: string;
  assetName: string;
  assetCode: string | null;
  nature: string;
  purchaseDate: string | null;
  purchaseQty: number;
  unitPrice: number;
  purchaseAmount: number;
  depreciationMethod: string;
  usefulLife: number | null;
  monthlyDepreciation: number | null;
  accumulatedDepreciation: number;
  status: string;
};

// ========== 耗材 ==========

export type ConsumableItemInfo = {
  id: string;
  warehouseId: string;
  itemCode: string | null;
  itemName: string;
  category: string;
  unit: string;
  defaultPrice: number | null;
  status: string;
  transactions?: ConsumableTransaction[];
};

export type ConsumableTransaction = {
  id: string;
  itemId: string;
  transactionDate: string;
  month: string;
  type: 'inbound' | 'outbound' | 'check';
  quantity: number;
  unitPrice: number | null;
  totalAmount: number | null;
  balanceAfter: number;
  balanceValue: number | null;
};

// ========== 科目表 ==========

export type ChartOfAccountEntry = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  category: string;
  level: number;
  isLeaf: boolean;
  isActive: boolean;
  sortOrder: number;
  children?: ChartOfAccountEntry[];
};

// ========== 自动扣费 ==========

export type BillingResult = {
  customerId: string;
  customerName: string;
  billed: number;
  success: boolean;
  message: string;
};
