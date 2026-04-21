import { apiGet, apiPost } from '@/lib/api';
import type {
  AllocationResponse,
  FinanceAnalysis,
  FinanceDashboard,
  FinanceRecord,
  FinanceRecordType,
  ProfitSnapshot,
  ProjectProfit,
  SaveFinanceRecordPayload,
} from './types';

export async function fetchFinanceDashboard() {
  return apiGet<FinanceDashboard>('/finance/dashboard');
}

export async function fetchFinanceRecords(recordType: FinanceRecordType) {
  if (recordType === 'income') return apiGet<FinanceRecord[]>('/finance/incomes');
  if (recordType === 'expense') return apiGet<FinanceRecord[]>('/finance/expenses');
  return apiGet<FinanceRecord[]>('/finance/purchases');
}

export async function fetchAllFinanceInputRecords() {
  const [incomesRes, expensesRes, purchasesRes] = await Promise.all([
    fetchFinanceRecords('income'),
    fetchFinanceRecords('expense'),
    fetchFinanceRecords('purchase'),
  ]);
  return [...incomesRes.data, ...expensesRes.data, ...purchasesRes.data].sort((a, b) => b.recordDate.localeCompare(a.recordDate));
}

export async function createFinanceRecord(recordType: FinanceRecordType, payload: SaveFinanceRecordPayload) {
  if (recordType === 'income') return apiPost<{ id: string }, SaveFinanceRecordPayload>('/finance/incomes', payload);
  if (recordType === 'expense') return apiPost<{ id: string }, SaveFinanceRecordPayload>('/finance/expenses', payload);
  return apiPost<{ id: string }, SaveFinanceRecordPayload>('/finance/purchases', payload);
}

export async function submitFinanceRecord(recordType: FinanceRecordType, id: string) {
  if (recordType === 'income') return apiPost(`/finance/incomes/${id}/submit`);
  if (recordType === 'expense') return apiPost(`/finance/expenses/${id}/submit`);
  return apiPost(`/finance/purchases/${id}/submit`);
}

export async function fetchProjectProfit() {
  return apiGet<ProjectProfit[]>('/finance/project-profit');
}

export async function fetchProfitSnapshots() {
  return apiGet<ProfitSnapshot[]>('/finance/profit-snapshots');
}

export async function fetchFinanceAnalysis() {
  return apiGet<FinanceAnalysis[]>('/finance/analysis');
}

export async function fetchAllocationLines(month: string) {
  return apiGet<AllocationResponse>(`/finance/allocation-lines?month=${encodeURIComponent(month)}`);
}
