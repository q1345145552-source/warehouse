'use client';

import { useEffect, useState } from 'react';
import { fetchFundSummary } from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';
import Link from 'next/link';

export default function FundSummaryPage() {
  const [month, setMonth] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wid = getWarehouseId() ?? '';

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchFundSummary(wid, month || undefined);
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
        <h2>资金账户汇总</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={load}>查询</button>
        </div>
      </div>

      <div className="cards">
        <div className="card"><h3>账户数</h3><p className="big-num">{data?.accounts?.length ?? 0}</p></div>
        <div className="card"><h3>总余额</h3><p className="big-num">฿{fmt(data?.totalBalance ?? 0)}</p></div>
      </div>

      <div className="section">
        <table className="table">
          <thead><tr><th>账户名称</th><th>类型</th><th style={{ textAlign: 'right' }}>余额 (THB)</th><th>操作</th></tr></thead>
          <tbody>
            {data?.accounts?.map((a: any) => (
              <tr key={a.id}>
                <td>{a.name}</td><td>{a.type}</td>
                <td style={{ textAlign: 'right' }}>{fmt(a.balanceThb)}</td>
                <td><Link href={`/finance/bank-ledger`}>查看日记账 →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
