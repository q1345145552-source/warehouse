'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchFinanceRecords } from '@/lib/finance/finance-api';
import { matchRecordToTargetModule } from '@/lib/finance/module-routing';
import { subscribeFinanceDataUpdated } from '@/lib/finance/sync';
import { useFinanceTerminology } from '@/lib/finance/terminology';
import type { FinanceRecord } from '@/lib/finance/types';

type IncomeSummaryRow = {
  category: string;
  count: number;
  totalAmount: number;
};

export default function BusinessIncomePage() {
  const { term, moduleLabel } = useFinanceTerminology();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
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
      setRecords(res.data.filter((item) => matchRecordToTargetModule(item, 'business_income')));
      setRefreshedAt(new Date().toLocaleString());
      setMessage('');
    } catch {
      setRecords([]);
      setMessage('业务类别收入表加载失败，请稍后重试。');
    }
  }

  const summary = useMemo<IncomeSummaryRow[]>(() => {
    const map = new Map<string, IncomeSummaryRow>();
    for (const record of records) {
      const key = record.category || '未分类';
      const prev = map.get(key) ?? { category: key, count: 0, totalAmount: 0 };
      prev.count += 1;
      prev.totalAmount += Number(record.amountCny ?? record.amount ?? 0);
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [records]);

  return (
    <section className="section">
      <h3>{moduleLabel('business_income')}</h3>
      <p>数据来源：{term('finance.tab.dataInput')}（目标模块={moduleLabel('business_income')}，历史数据走兜底规则）。</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => void load()}>{term('finance.common.manualRefresh')}</button>
        <span>
          {term('finance.common.lastRefreshed')}：{refreshedAt || '-'}
        </span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>业务类别</th>
            <th>笔数</th>
            <th>收入合计（CNY）</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => (
            <tr key={row.category}>
              <td>{row.category}</td>
              <td>{row.count}</td>
              <td>¥ {row.totalAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
