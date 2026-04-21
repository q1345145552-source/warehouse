'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchFinanceRecords } from '@/lib/finance/finance-api';
import { matchRecordToTargetModule } from '@/lib/finance/module-routing';
import { subscribeFinanceDataUpdated } from '@/lib/finance/sync';
import { useFinanceTerminology } from '@/lib/finance/terminology';
import type { FinanceRecord } from '@/lib/finance/types';

export default function ConsumablesPage() {
  const { term, moduleLabel } = useFinanceTerminology();
  const [expenses, setExpenses] = useState<FinanceRecord[]>([]);
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
      const res = await fetchFinanceRecords('expense');
      setExpenses(res.data.filter((item) => matchRecordToTargetModule(item, 'consumables')));
      setRefreshedAt(new Date().toLocaleString());
      setMessage('');
    } catch {
      setExpenses([]);
      setMessage('耗材清单加载失败，请稍后重试。');
    }
  }

  const consumables = useMemo(() => expenses, [expenses]);
  const total = useMemo(
    () => consumables.reduce((sum, item) => sum + Number(item.amountCny ?? item.amount ?? 0), 0),
    [consumables],
  );

  return (
    <section className="section">
      <h3>{moduleLabel('consumables')}</h3>
      <p>数据来源：{term('finance.tab.dataInput')}（目标模块={moduleLabel('consumables')}，历史数据走兜底规则）。</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => void load()}>{term('finance.common.manualRefresh')}</button>
        <span>
          {term('finance.common.lastRefreshed')}：{refreshedAt || '-'}
        </span>
      </div>
      <p>耗材支出总计：¥ {total.toFixed(2)}</p>
      <table className="table">
        <thead>
          <tr>
            <th>日期</th>
            <th>类别</th>
            <th>金额（CNY）</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {consumables.map((item) => (
            <tr key={item.id}>
              <td>{item.recordDate.slice(0, 10)}</td>
              <td>{item.category}</td>
              <td>¥ {Number(item.amountCny ?? item.amount).toFixed(2)}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
