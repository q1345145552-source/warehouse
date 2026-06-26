'use client';

import { useEffect, useState } from 'react';
import { fetchProfitLoss } from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';
import { downloadCsv } from '@/lib/finance/reporting';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ProfitStatementPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wid = getWarehouseId() ?? '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchProfitLoss(wid, month);
      setData(res.data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;
  if (!data) return null;

  const revenueTypes = Object.entries(data.revenueByType ?? {}) as [string, number][];
  const expenseCategories = Object.entries(data.expenseByCategory ?? {}) as [string, { name: string; amount: number }][];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>利润表</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={load}>刷新</button>
          <button onClick={() => {
            const rows = [
              ['利润表', ''], ['月份: ' + month, ''],
              ['序号', '科目', '金额(THB)'],
              ['1', '主营业务收入合计', fmt(data.totalRevenue)],
              ...revenueTypes.map(([k, v], i) => [`  ${i + 1}.${k}`, fmt(v)]),
              ['2', '主营业务成本-耗材成本', fmt(data.totalCost)],
              ['3', '固定资产', fmt(data.totalFixedAsset)],
              ['4', '期间费用合计', fmt(data.totalExpense)],
              ...expenseCategories.map(([k, v]) => [`  费用-${v.name}`, fmt(v.amount)]),
              ['5', '营业利润', fmt(data.operatingProfit)],
              ['6', '净利润', fmt(data.netProfit)],
            ];
            downloadCsv(`profit-statement-${month}.csv`, ['序号', '科目', '金额(THB)'], rows);
          }}>导出 CSV</button>
        </div>
      </div>

      {/* 摘要 */}
      <div className="cards">
        <div className="card"><h3>主营收入</h3><p className="big-num">฿{fmt(data.totalRevenue)}</p></div>
        <div className="card"><h3>耗材成本</h3><p className="big-num">฿{fmt(data.totalCost)}</p></div>
        <div className="card"><h3>固定资产</h3><p className="big-num">฿{fmt(data.totalFixedAsset)}</p></div>
        <div className="card"><h3>期间费用</h3><p className="big-num">฿{fmt(data.totalExpense)}</p></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* 收入明细 */}
        <div className="section">
          <h3>收入明细</h3>
          <table className="table">
            <thead><tr><th>服务类型</th><th style={{ textAlign: 'right' }}>金额 (THB)</th></tr></thead>
            <tbody>
              {revenueTypes.map(([k, v]) => (
                <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{fmt(v)}</td></tr>
              ))}
              <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}><td>收入合计</td><td style={{ textAlign: 'right' }}>{fmt(data.totalRevenue)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* 费用明细 */}
        <div className="section">
          <h3>费用明细</h3>
          <table className="table">
            <thead><tr><th>科目</th><th style={{ textAlign: 'right' }}>金额 (THB)</th></tr></thead>
            <tbody>
              <tr><td>耗材成本</td><td style={{ textAlign: 'right' }}>{fmt(data.totalCost)}</td></tr>
              <tr><td>固定资产</td><td style={{ textAlign: 'right' }}>{fmt(data.totalFixedAsset)}</td></tr>
              {expenseCategories.map(([k, v]) => (
                <tr key={k}><td>{v.name}</td><td style={{ textAlign: 'right' }}>{fmt(v.amount)}</td></tr>
              ))}
              <tr style={{ fontWeight: 'bold' }}><td>费用合计</td><td style={{ textAlign: 'right' }}>{fmt(data.totalExpense + data.totalCost + data.totalFixedAsset)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 利润结果 */}
      <div className="section" style={{ borderLeft: (data.netProfit >= 0 ? '4px solid green' : '4px solid red') }}>
        <table className="table">
          <tbody>
            <tr><td>营业利润</td><td style={{ textAlign: 'right', fontWeight: 'bold', color: data.operatingProfit >= 0 ? 'green' : 'red' }}>฿{fmt(data.operatingProfit)}</td></tr>
            <tr><td>净利润</td><td style={{ textAlign: 'right', fontWeight: 'bold', color: data.netProfit >= 0 ? 'green' : 'red' }}>฿{fmt(data.netProfit)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
