'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAllFinanceInputRecords } from '@/lib/finance/finance-api';
import { matchRecordToTargetModule } from '@/lib/finance/module-routing';
import { currentMonthValue, downloadCsv, filterRecordsByMonth } from '@/lib/finance/reporting';
import { subscribeFinanceDataUpdated } from '@/lib/finance/sync';
import { useFinanceTerminology } from '@/lib/finance/terminology';
import type { FinanceRecord } from '@/lib/finance/types';

export default function ProfitStatementPage() {
  const { term, moduleLabel } = useFinanceTerminology();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [month, setMonth] = useState(currentMonthValue());
  const [refreshedAt, setRefreshedAt] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadData();
    const unsubscribe = subscribeFinanceDataUpdated(() => {
      void loadData();
    });
    return unsubscribe;
  }, []);

  async function loadData() {
    try {
      const all = await fetchAllFinanceInputRecords();
      setRecords(all.filter((item) => matchRecordToTargetModule(item, 'profit_statement')));
      setRefreshedAt(new Date().toLocaleString());
      setMessage('');
    } catch {
      setRecords([]);
      setMessage('利润表数据加载失败，请稍后重试。');
    }
  }

  const recordsByMonth = useMemo(() => filterRecordsByMonth(records, month), [records, month]);
  const income = recordsByMonth
    .filter((item) => item.recordType === 'income')
    .reduce((sum, item) => sum + Number(item.amountCny ?? item.amount), 0);
  const expense = recordsByMonth
    .filter((item) => item.recordType === 'expense')
    .reduce((sum, item) => sum + Number(item.amountCny ?? item.amount), 0);
  const purchase = recordsByMonth
    .filter((item) => item.recordType === 'purchase')
    .reduce((sum, item) => sum + Number(item.amountCny ?? item.amount), 0);
  const netProfit = income - expense - purchase;
  const historicalUnclassifiedCount = useMemo(() => recordsByMonth.filter((item) => !item.targetModule).length, [recordsByMonth]);

  function exportCsv() {
    const rows = recordsByMonth.map((item) => [
      item.recordDate.slice(0, 10),
      item.recordType,
      item.category,
      String(Number(item.amountCny ?? item.amount).toFixed(2)),
      item.targetModule ?? 'history_fallback',
      item.status,
      item.note ?? '',
    ]);
    downloadCsv(`profit-statement-${month || 'all'}.csv`, ['日期', '类型', '分类', '金额(CNY)', '目标模块', '状态', '备注'], rows);
  }

  return (
    <section className="section">
      <h3>{moduleLabel('profit_statement')}</h3>
      <p>数据来源：{term('finance.tab.dataInput')}（目标模块={moduleLabel('profit_statement')}，历史数据走兜底规则）。</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <button onClick={() => void loadData()}>{term('finance.common.manualRefresh')}</button>
        <button onClick={exportCsv}>导出 CSV</button>
        <span>
          {term('finance.common.lastRefreshed')}：{refreshedAt || '-'}
        </span>
      </div>
      <p>当前期间：{month || '全部期间'}，记录数：{recordsByMonth.length}</p>
      {historicalUnclassifiedCount > 0 ? <p>提示：当前期间包含 {historicalUnclassifiedCount} 条历史未配置目标模块数据（兜底归类）。</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>指标</th>
            <th>金额（CNY）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>收入合计</td>
            <td>¥ {income.toFixed(2)}</td>
          </tr>
          <tr>
            <td>支出合计</td>
            <td>¥ {expense.toFixed(2)}</td>
          </tr>
          <tr>
            <td>采购合计</td>
            <td>¥ {purchase.toFixed(2)}</td>
          </tr>
          <tr>
            <td>净利润</td>
            <td>¥ {netProfit.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
