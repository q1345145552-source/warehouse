'use client';

import { useEffect, useState } from 'react';
import {
  fetchFundSummary,
  fetchProfitLoss,
  fetchARAPSummary,
  fetchReconciliation,
} from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';
import Link from 'next/link';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function FinanceDashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [fund, setFund] = useState<any>(null);
  const [pl, setPl] = useState<any>(null);
  const [arap, setArap] = useState<any>(null);
  const [rec, setRec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const wid = getWarehouseId() ?? '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [fundRes, plRes, arapRes, recRes] = await Promise.all([
        fetchFundSummary(wid, month),
        fetchProfitLoss(wid, month),
        fetchARAPSummary(wid),
        fetchReconciliation(wid, month).catch(() => null),
      ]);
      setFund(fundRes.data);
      setPl(plRes.data);
      setArap(arapRes.data);
      if (recRes) setRec(recRes.data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const formatNum = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 月份选择 */}
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>财务仪表盘</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={load}>刷新</button>
        </div>
      </div>

      {/* 总览卡片 */}
      <div className="cards">
        <div className="card">
          <h3>资金余额</h3>
          <p className="big-num">฿{formatNum(fund?.totalBalance)}</p>
          <small>银行账户汇总</small>
        </div>
        <div className="card">
          <h3>客户预存余额</h3>
          <p className="big-num">฿{formatNum(arap?.totalAR)}</p>
          <small>{arap?.receivables?.length ?? 0} 个活跃客户</small>
        </div>
        <div className="card">
          <h3>{month} 收入</h3>
          <p className="big-num">฿{formatNum(pl?.totalRevenue)}</p>
          <small>主营业务收入</small>
        </div>
        <div className="card" style={{ borderLeft: (pl?.netProfit ?? 0) >= 0 ? '4px solid green' : '4px solid red' }}>
          <h3>{month} 净利润</h3>
          <p className="big-num" style={{ color: (pl?.netProfit ?? 0) >= 0 ? 'green' : 'red' }}>
            ฿{formatNum(pl?.netProfit)}
          </p>
          <small>营业利润</small>
        </div>
      </div>

      {/* 勾稽状态 */}
      {rec && (
        <div className="section">
          <h3>勾稽检查 {rec.allPassed ? '✅ 全部通过' : '⚠️ 存在差异'}</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {rec.checks.map((c: any, i: number) => (
              <div key={i} style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: 8, flex: '1 1 250px', background: c.isPassed ? '#f0fff0' : '#fff0f0' }}>
                <strong>{c.checkName}</strong>
                <p style={{ fontSize: '0.85rem', margin: '4px 0', color: c.isPassed ? 'green' : 'red' }}>
                  {c.isPassed ? '✓ 通过' : `✗ 差异 ฿${formatNum(c.difference)}`}
                </p>
                <small>{c.details}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快速入口 */}
      <div className="section">
        <h3>快速入口</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/finance/balance-sheet" className="card" style={{ flex: '1 1 150px', textAlign: 'center', padding: '1rem' }}>资产负债表</Link>
          <Link href="/finance/profit-statement" className="card" style={{ flex: '1 1 150px', textAlign: 'center', padding: '1rem' }}>利润表</Link>
          <Link href="/finance/bank-ledger" className="card" style={{ flex: '1 1 150px', textAlign: 'center', padding: '1rem' }}>银行日记账</Link>
          <Link href="/finance/recharge" className="card" style={{ flex: '1 1 150px', textAlign: 'center', padding: '1rem' }}>客户充值</Link>
          <Link href="/finance/service-revenue" className="card" style={{ flex: '1 1 150px', textAlign: 'center', padding: '1rem' }}>服务收入</Link>
        </div>
      </div>
    </div>
  );
}
