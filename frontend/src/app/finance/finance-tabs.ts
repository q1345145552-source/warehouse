export type FinanceTabKey =
  | 'dashboard'
  | 'balance-sheet'
  | 'profit-statement'
  | 'analysis'
  | 'fund-summary'
  | 'bank-ledger'
  | 'service-revenue'
  | 'recharge'
  | 'fixed-assets'
  | 'consumables'
  | 'chart-of-accounts'
  | 'ar-ap'
  | 'reconciliation';

export type FinanceTab = {
  key: FinanceTabKey;
  termKey: string;
  href: string;
  enabled: boolean;
};

export const FINANCE_TABS: FinanceTab[] = [
  { key: 'dashboard', termKey: 'finance.tab.dashboard', href: '/finance/dashboard', enabled: true },
  { key: 'balance-sheet', termKey: 'finance.tab.balanceSheet', href: '/finance/balance-sheet', enabled: true },
  { key: 'profit-statement', termKey: 'finance.tab.profitStatement', href: '/finance/profit-statement', enabled: true },
  { key: 'analysis', termKey: 'finance.tab.analysis', href: '/finance/analysis', enabled: true },
  { key: 'fund-summary', termKey: 'finance.tab.fundSummary', href: '/finance/fund-summary', enabled: true },
  { key: 'bank-ledger', termKey: 'finance.tab.bankLedger', href: '/finance/bank-ledger', enabled: true },
  { key: 'service-revenue', termKey: 'finance.tab.serviceRevenue', href: '/finance/service-revenue', enabled: true },
  { key: 'recharge', termKey: 'finance.tab.recharge', href: '/finance/recharge', enabled: true },
  { key: 'fixed-assets', termKey: 'finance.tab.fixedAssets', href: '/finance/fixed-assets', enabled: true },
  { key: 'consumables', termKey: 'finance.tab.consumables', href: '/finance/consumables', enabled: true },
  { key: 'chart-of-accounts', termKey: 'finance.tab.chartOfAccounts', href: '/finance/chart-of-accounts', enabled: true },
  { key: 'ar-ap', termKey: 'finance.tab.arAp', href: '/finance/ar-ap', enabled: true },
  { key: 'reconciliation', termKey: 'finance.tab.reconciliation', href: '/finance/reconciliation', enabled: true },
];
