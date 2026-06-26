'use client';

import { useEffect, useState } from 'react';
import { fetchARAPSummary } from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';

export default function ARAPPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wid = getWarehouseId() ?? '';

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchARAPSummary(wid);
      setData(res.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>应收应付</h2>
        <button onClick={load}>刷新</button>
      </div>

      <div className="cards">
        <div className="card"><h3>应收账款 (客户预存)</h3><p className="big-num">฿{fmt(data?.totalAR ?? 0)}</p></div>
        <div className="card"><h3>应付账款</h3><p className="big-num">฿{fmt(data?.totalAP ?? 0)}</p></div>
        <div className="card"><h3>净应收</h3><p className="big-num">฿{fmt(data?.netAR ?? 0)}</p></div>
      </div>

      <div className="section">
        <h3>应收账款明细 (客户预存款)</h3>
        <table className="table">
          <thead><tr><th>客户</th><th style={{ textAlign: 'right' }}>余额 THB</th><th style={{ textAlign: 'right' }}>余额 CNY</th><th>类型</th></tr></thead>
          <tbody>
            {data?.receivables?.map((r: any) => (
              <tr key={r.customerId}>
                <td>{r.customerName}</td>
                <td style={{ textAlign: 'right' }}>{fmt(r.balanceThb)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(r.balanceCny)}</td>
                <td>{r.type === 'prepaid' ? '预付' : '后付'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
