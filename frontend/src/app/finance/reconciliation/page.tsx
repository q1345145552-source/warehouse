'use client';

import { useEffect, useState } from 'react';
import { fetchReconciliation } from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReconciliationPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wid = getWarehouseId() ?? '';

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchReconciliation(wid, month);
      setData(res.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month]);

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>勾稽审查</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={load}>重新检查</button>
        </div>
      </div>

      <div className="section" style={{ borderLeft: data?.allPassed ? '4px solid green' : '4px solid red' }}>
        <h3>{data?.allPassed ? '✅ 所有勾稽检查通过' : '❌ 存在未通过的检查'}</h3>
      </div>

      <div className="section">
        <table className="table">
          <thead><tr><th>检查项目</th><th style={{ textAlign: 'right' }}>期望值</th><th style={{ textAlign: 'right' }}>实际值</th><th style={{ textAlign: 'right' }}>差异</th><th>状态</th><th>说明</th></tr></thead>
          <tbody>
            {data?.checks?.map((c: any, i: number) => (
              <tr key={i} style={{ background: c.isPassed ? '#f0fff0' : '#fff0f0' }}>
                <td>{c.checkName}</td>
                <td style={{ textAlign: 'right' }}>{fmt(c.expectedValue)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(c.actualValue)}</td>
                <td style={{ textAlign: 'right', color: c.isPassed ? 'green' : 'red' }}>{fmt(c.difference)}</td>
                <td>{c.isPassed ? '✅ 通过' : '❌ 未通过'}</td>
                <td style={{ fontSize: '0.85rem' }}>{c.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
