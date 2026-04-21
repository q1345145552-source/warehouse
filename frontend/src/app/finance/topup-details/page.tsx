'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchFinanceRecords } from '@/lib/finance/finance-api';
import { matchRecordToTargetModule } from '@/lib/finance/module-routing';
import { subscribeFinanceDataUpdated } from '@/lib/finance/sync';
import { useFinanceTerminology } from '@/lib/finance/terminology';
import type { FinanceRecord } from '@/lib/finance/types';

export default function TopupDetailsPage() {
  const { term, moduleLabel } = useFinanceTerminology();
  const [incomeRecords, setIncomeRecords] = useState<FinanceRecord[]>([]);
  const [refreshedAt, setRefreshedAt] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void load();
    const unsubscribe = subscribeFinanceDataUpdated(() => {
      void load();
    });
    return unsubscribe;
  }, []);

  async function load() {
    try {
      const res = await fetchFinanceRecords('income');
      setIncomeRecords(res.data.filter((item) => matchRecordToTargetModule(item, 'topup_details')));
      setRefreshedAt(new Date().toLocaleString());
      setMessage('');
    } catch {
      setIncomeRecords([]);
      setMessage('充值明细加载失败，请稍后重试。');
    }
  }

  const topupRows = useMemo(() => incomeRecords, [incomeRecords]);

  const total = useMemo(
    () => topupRows.reduce((sum, item) => sum + Number(item.amountCny ?? item.amount ?? 0), 0),
    [topupRows],
  );

  return (
    <section className="section">
      <h3>{moduleLabel('topup_details')}</h3>
      <p>数据来源：{term('finance.tab.dataInput')}（目标模块={moduleLabel('topup_details')}，历史数据走兜底规则）。</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => void load()}>{term('finance.common.manualRefresh')}</button>
        <span>
          {term('finance.common.lastRefreshed')}：{refreshedAt || '-'}
        </span>
      </div>
      <p>充值合计：¥ {total.toFixed(2)}</p>
      <table className="table">
        <thead>
          <tr>
            <th>日期</th>
            <th>业务类型</th>
            <th>原币金额</th>
            <th>CNY金额</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {topupRows.map((row) => (
            <tr key={row.id}>
              <td>{row.recordDate.slice(0, 10)}</td>
              <td>{row.category}</td>
              <td>
                {row.currencyCode ?? 'CNY'} {row.amount}
              </td>
              <td>¥ {Number(row.amountCny ?? row.amount).toFixed(2)}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
