'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchFinanceRecords } from '@/lib/finance/finance-api';
import { matchRecordToTargetModule } from '@/lib/finance/module-routing';
import { subscribeFinanceDataUpdated } from '@/lib/finance/sync';
import { useFinanceTerminology } from '@/lib/finance/terminology';
import type { FinanceRecord } from '@/lib/finance/types';

export default function FixedAssetsPage() {
  const { term, moduleLabel } = useFinanceTerminology();
  const [purchases, setPurchases] = useState<FinanceRecord[]>([]);
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
      const res = await fetchFinanceRecords('purchase');
      setPurchases(res.data.filter((item) => matchRecordToTargetModule(item, 'fixed_assets')));
      setRefreshedAt(new Date().toLocaleString());
      setMessage('');
    } catch {
      setPurchases([]);
      setMessage('固定资产数据加载失败，建议检查后端服务状态。');
    }
  }

  const total = useMemo(
    () => purchases.reduce((sum, item) => sum + Number(item.amountCny ?? item.amount ?? 0), 0),
    [purchases],
  );

  return (
    <section className="section">
      <h3>{moduleLabel('fixed_assets')}</h3>
      <p>数据来源：{term('finance.tab.dataInput')}（目标模块={moduleLabel('fixed_assets')}，历史数据走兜底规则）。</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => void load()}>{term('finance.common.manualRefresh')}</button>
        <span>
          {term('finance.common.lastRefreshed')}：{refreshedAt || '-'}
        </span>
      </div>
      <p>固定资产合计：¥ {total.toFixed(2)}</p>
      <table className="table">
        <thead>
          <tr>
            <th>日期</th>
            <th>资产类别</th>
            <th>入账金额（CNY）</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((item) => (
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
