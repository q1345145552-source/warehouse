import { apiGet, apiPost, apiPut } from '@/lib/api';
import { getWarehouseId } from '@/lib/auth';
import type {
  ARAPData,
  BalanceSheetData,
  BankAccountInfo,
  BankLedgerData,
  BankTransaction,
  BillingResult,
  BusinessProfitAnalysisData,
  ChartOfAccountEntry,
  ConsumableItemInfo,
  ConsumableTransaction,
  CustomerBalance,
  CustomerInfo,
  FixedAssetEntry,
  FundSummaryData,
  MonthlyRevenueSummary,
  ProfitLossData,
  RechargeTransaction,
  ReconciliationData,
  ServiceRevenueEntry,
} from './types';

function wid(): string {
  return getWarehouseId() ?? '';
}

// ========== 报表 ==========

export async function fetchProfitLoss(warehouseId?: string, month?: string) {
  const w = warehouseId ?? wid();
  const m = month ?? currentMonth();
  return apiGet<ProfitLossData>(`/reports/profit-loss/${w}/${m}`);
}

export async function fetchBalanceSheet(warehouseId?: string, month?: string) {
  const w = warehouseId ?? wid();
  const m = month ?? currentMonth();
  return apiGet<BalanceSheetData>(`/reports/balance-sheet/${w}/${m}`);
}

export async function fetchReconciliation(warehouseId?: string, month?: string) {
  const w = warehouseId ?? wid();
  const m = month ?? currentMonth();
  return apiGet<ReconciliationData>(`/reports/reconciliation/${w}/${m}`);
}

export async function fetchFundSummary(warehouseId?: string, month?: string) {
  const w = warehouseId ?? wid();
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiGet<FundSummaryData>(`/reports/fund-summary/${w}${qs}`);
}

export async function fetchBusinessProfitAnalysis(warehouseId?: string, month?: string) {
  const w = warehouseId ?? wid();
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiGet<BusinessProfitAnalysisData>(`/reports/business-profit-analysis/${w}${qs}`);
}

export async function fetchARAPSummary(warehouseId?: string) {
  const w = warehouseId ?? wid();
  return apiGet<ARAPData>(`/reports/ar-ap/${w}`);
}

export async function fetchBankLedger(accountId: string, warehouseId?: string, month?: string) {
  const w = warehouseId ?? wid();
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiGet<BankLedgerData>(`/reports/bank-ledger/${w}/${accountId}${qs}`);
}

export async function triggerAutoBilling(warehouseId?: string, month?: string) {
  const w = warehouseId ?? wid();
  const m = month ?? currentMonth();
  return apiPost<{ month: string; results: BillingResult[] }>(`/reports/billing/${w}/${m}`);
}

// ========== 客户 ==========

export async function fetchCustomers(query?: { keyword?: string; status?: string }) {
  const params = new URLSearchParams();
  if (query?.keyword) params.set('keyword', query.keyword);
  if (query?.status) params.set('status', query.status);
  const qs = params.toString() ? `?${params}` : '';
  return apiGet<CustomerInfo[]>(`/customers${qs}`);
}

export async function fetchCustomerDetail(id: string) {
  return apiGet<CustomerInfo & { balance: CustomerBalance; revenues: ServiceRevenueEntry[]; recharges: RechargeTransaction[] }>(`/customers/${id}`);
}

export async function saveCustomer(data: Partial<CustomerInfo> & { customerId: string; customerName: string }) {
  return apiPost<CustomerInfo>('/customers', data);
}

// ========== 充值 ==========

export async function fetchRechargeTransactions(query?: { customerId?: string; type?: string; startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (query?.customerId) params.set('customerId', query.customerId);
  if (query?.type) params.set('type', query.type);
  if (query?.startDate) params.set('startDate', query.startDate);
  if (query?.endDate) params.set('endDate', query.endDate);
  const qs = params.toString() ? `?${params}` : '';
  return apiGet<RechargeTransaction[]>(`/recharge/transactions${qs}`);
}

export async function fetchCustomerBalance(customerId: string) {
  return apiGet<CustomerBalance>(`/recharge/balance/${customerId}`);
}

export async function saveRechargeTransaction(data: {
  customerId: string;
  transactionDate: string;
  type: 'recharge' | 'billing';
  currency: string;
  amount: number;
  exchangeRate?: number;
  remark?: string;
  refInvoiceId?: string;
}) {
  return apiPost<RechargeTransaction>('/recharge/transactions', data);
}

// ========== 服务收入 ==========

export async function fetchServiceRevenues(query?: { customerId?: string; serviceType?: string; serviceMonth?: string }) {
  const params = new URLSearchParams();
  if (query?.customerId) params.set('customerId', query.customerId);
  if (query?.serviceType) params.set('serviceType', query.serviceType);
  if (query?.serviceMonth) params.set('serviceMonth', query.serviceMonth);
  const qs = params.toString() ? `?${params}` : '';
  return apiGet<ServiceRevenueEntry[]>(`/service-revenue${qs}`);
}

export async function fetchMonthlyRevenueSummary(month: string) {
  return apiGet<MonthlyRevenueSummary>(`/service-revenue/monthly/${month}`);
}

export async function saveServiceRevenue(data: {
  customerId: string;
  serviceMonth: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  serviceDate?: string;
  remark?: string;
  refOrderId?: string;
}) {
  return apiPost<ServiceRevenueEntry>('/service-revenue', data);
}

export async function deleteServiceRevenue(id: string) {
  return apiPost('/service-revenue', { id });
}

// ========== 银行账户 ==========

export async function fetchBankAccounts() {
  return apiGet<BankAccountInfo[]>('/bank-accounts');
}

export async function fetchBankTransactions(query?: { bankAccountId?: string; month?: string; categoryId?: string }) {
  const params = new URLSearchParams();
  if (query?.bankAccountId) params.set('bankAccountId', query.bankAccountId);
  if (query?.month) params.set('month', query.month);
  if (query?.categoryId) params.set('categoryId', query.categoryId);
  const qs = params.toString() ? `?${params}` : '';
  return apiGet<BankTransaction[]>(`/bank-accounts/transactions${qs}`);
}

export async function saveBankTransaction(data: {
  bankAccountId: string;
  transactionDate: string;
  categoryId?: string;
  description: string;
  incomeThb?: number;
  incomeCny?: number;
  expenseThb?: number;
  expenseCny?: number;
  remark?: string;
}) {
  return apiPost<BankTransaction>('/bank-accounts/transactions', data);
}

// ========== 固定资产 ==========

export async function fetchFixedAssets() {
  return apiGet<FixedAssetEntry[]>('/fixed-assets');
}

export async function fetchFixedAssetMonthlyExpense(month: string) {
  return apiGet<{ month: string; totalExpense: number }>(`/fixed-assets/monthly-expense/${month}`);
}

export async function saveFixedAsset(data: {
  warehouseId: string;
  assetName: string;
  assetCode?: string;
  nature: string;
  purchaseDate: string;
  purchaseQty: number;
  unitPrice: number;
  depreciationMethod: string;
  usefulLife?: number;
  remark?: string;
}) {
  return apiPost<FixedAssetEntry>('/fixed-assets', data);
}

// ========== 耗材 ==========

export async function fetchConsumableItems() {
  return apiGet<ConsumableItemInfo[]>('/inventory-consumables');
}

export async function fetchConsumableHistory(itemId: string) {
  return apiGet<ConsumableTransaction[]>(`/inventory-consumables/${itemId}/history`);
}

export async function fetchConsumableMonthlyCost(month: string) {
  return apiGet<{ month: string; totalCost: number }>(`/inventory-consumables/monthly-cost/${month}`);
}

export async function saveConsumableTransaction(data: {
  itemId: string;
  transactionDate: string;
  type: 'inbound' | 'outbound' | 'check';
  quantity: number;
  unitPrice?: number;
  remark?: string;
}) {
  return apiPost<ConsumableTransaction>('/inventory-consumables/transactions', data);
}

// ========== 科目表 ==========

export async function fetchAccounts(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiGet<ChartOfAccountEntry[]>(`/chart-of-accounts${qs}`);
}

export async function fetchAccountTree() {
  return apiGet<ChartOfAccountEntry[]>('/chart-of-accounts/tree');
}

export async function saveAccount(data: { code: string; name: string; category: string; parentId?: string; isLeaf?: boolean; level?: number }) {
  return apiPost<ChartOfAccountEntry>('/chart-of-accounts', data);
}

// ========== 工具 ==========

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
