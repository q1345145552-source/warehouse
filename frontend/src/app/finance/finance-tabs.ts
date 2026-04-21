export type FinanceTabKey =
  | 'data-input'
  | 'balance-sheet'
  | 'profit-statement'
  | 'operation-monitor'
  | 'fixed-assets'
  | 'business-income'
  | 'consumables'
  | 'topup-details';

export type FinanceTab = {
  key: FinanceTabKey;
  termKey:
    | 'finance.tab.dataInput'
    | 'finance.tab.balanceSheet'
    | 'finance.tab.profitStatement'
    | 'finance.tab.operationMonitor'
    | 'finance.tab.fixedAssets'
    | 'finance.tab.businessIncome'
    | 'finance.tab.consumables'
    | 'finance.tab.topupDetails';
  href: string;
  enabled: boolean;
};

export const FINANCE_TABS: FinanceTab[] = [
  { key: 'data-input', termKey: 'finance.tab.dataInput', href: '/finance/data-input', enabled: true },
  { key: 'balance-sheet', termKey: 'finance.tab.balanceSheet', href: '/finance/balance-sheet', enabled: true },
  { key: 'profit-statement', termKey: 'finance.tab.profitStatement', href: '/finance/profit-statement', enabled: true },
  { key: 'operation-monitor', termKey: 'finance.tab.operationMonitor', href: '/finance/operation-monitor', enabled: true },
  { key: 'fixed-assets', termKey: 'finance.tab.fixedAssets', href: '/finance/fixed-assets', enabled: true },
  { key: 'business-income', termKey: 'finance.tab.businessIncome', href: '/finance/business-income', enabled: true },
  { key: 'consumables', termKey: 'finance.tab.consumables', href: '/finance/consumables', enabled: true },
  { key: 'topup-details', termKey: 'finance.tab.topupDetails', href: '/finance/topup-details', enabled: true },
];
