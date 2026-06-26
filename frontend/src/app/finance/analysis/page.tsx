'use client';

import { useEffect, useState } from 'react';
import { fetchBusinessProfitAnalysis } from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';

export default function AnalysisPage() {
  const [month, setMonth] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wid = getWarehouseId() ?? '';

  const load = async (m?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchBusinessProfitAnalysis(wid, m || undefined);
      setData(res.data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;
  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>经营利润分析</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={() => load(month)}>查询</button>
        </div>
      </div>

      <div className="section">
        <p>对比月份：{data.currentMonth} vs {data.prevMonth}</p>
      </div>

      <div className="section">
        <table className="table">
          <thead>
            <tr>
              <th>科目</th>
              <th style={{ textAlign: 'right' }}>{data.prevMonth} 金额</th>
              <th style={{ textAlign: 'right' }}>{data.currentMonth} 金额</th>
              <th style={{ textAlign: 'right' }}>增长额</th>
              <th style={{ textAlign: 'right' }}>增长率</th>
            </tr>
          </thead>
          <tbody>
            {data.analysis.map((item: any, i: number) => {
              const isProfit = item.item === '营业利润' || item.item === '净利润';
              const positive = item.changeAmount > 0;
              const goodForRevenue = item.item.includes('收入') ? positive : !positive;
              return (
                <tr key={i} style={isProfit ? { fontWeight: 'bold', background: '#f0f0f0' } : {}}>
                  <td>{item.item}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.prevAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.currentAmount)}</td>
                  <td style={{ textAlign: 'right', color: goodForRevenue ? 'green' : 'red' }}>
                    {item.changeAmount > 0 ? '+' : ''}{fmt(item.changeAmount)}
                  </td>
                  <td style={{ textAlign: 'right' }}>{item.changeRate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
