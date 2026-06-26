'use client';

import { useEffect, useState } from 'react';
import { fetchBalanceSheet } from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';
import { downloadCsv } from '@/lib/finance/reporting';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function BalanceSheetPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const wid = getWarehouseId() ?? '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchBalanceSheet(wid, month);
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

  const { assets, liabilities, equity, totalLiabAndEquity, isBalanced } = data;

  const exportCsv = () => {
    const rows = [
      ['资产负债表', '', ''], ['月份: ' + month, '', ''],
      ['资产', '金额(THB)', ''],
      ['货币资金', fmt(assets.cashAndBank), ''],
      ['其他应收款', fmt(assets.otherReceivables), ''],
      ['存货', fmt(assets.inventory), ''],
      ['流动资产合计', fmt(assets.currentAssets), ''],
      ['固定资产原价', fmt(assets.fixedAssetsCost), ''],
      ['减：累计折旧', fmt(assets.accumulatedDep), ''],
      ['固定资产净值', fmt(assets.fixedAssetsNet), ''],
      ['资产总计', fmt(assets.totalAssets), ''],
      ['', '', ''],
      ['负债', '金额(THB)', ''],
      ['预收账款', fmt(liabilities.advanceReceived), ''],
      ['负债合计', fmt(liabilities.totalLiabilities), ''],
      ['', '', ''],
      ['所有者权益', '金额(THB)', ''],
      ['实收资本', fmt(equity.paidInCapital), ''],
      ['未分配利润', fmt(equity.retainedEarnings), ''],
      ['权益合计', fmt(equity.totalEquity), ''],
      ['负债和权益总计', fmt(totalLiabAndEquity), ''],
      ['平衡检查', isBalanced ? '平衡 ✓' : '不平衡 ✗', ''],
    ];
    downloadCsv(`balance-sheet-${month}.csv`, ['科目', '金额', '备注'], rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>资产负债表</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={load}>刷新</button>
          <button onClick={exportCsv}>导出 CSV</button>
        </div>
      </div>

      <div className="section" style={{ borderLeft: isBalanced ? '4px solid green' : '4px solid red' }}>
        <h3>{isBalanced ? '✅ 资产负债表平衡' : `❌ 资产负债表不平衡  差异: ฿${fmt(Math.abs((assets?.totalAssets ?? 0) - totalLiabAndEquity))}`}</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="section">
          <h3>资产</h3>
          <table className="table">
            <thead><tr><th>项目</th><th style={{ textAlign: 'right' }}>金额 (THB)</th></tr></thead>
            <tbody>
              <tr><td>货币资金</td><td style={{ textAlign: 'right' }}>{fmt(assets.cashAndBank)}</td></tr>
              <tr><td>其他应收款</td><td style={{ textAlign: 'right' }}>{fmt(assets.otherReceivables)}</td></tr>
              <tr><td>存货</td><td style={{ textAlign: 'right' }}>{fmt(assets.inventory)}</td></tr>
              <tr style={{ fontWeight: 'bold' }}><td>流动资产合计</td><td style={{ textAlign: 'right' }}>{fmt(assets.currentAssets)}</td></tr>
              <tr><td>固定资产原价</td><td style={{ textAlign: 'right' }}>{fmt(assets.fixedAssetsCost)}</td></tr>
              <tr><td>减：累计折旧</td><td style={{ textAlign: 'right' }}>{fmt(assets.accumulatedDep)}</td></tr>
              <tr><td>固定资产净值</td><td style={{ textAlign: 'right' }}>{fmt(assets.fixedAssetsNet)}</td></tr>
              <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}><td>资产总计</td><td style={{ textAlign: 'right' }}>{fmt(assets.totalAssets)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="section">
          <h3>负债和所有者权益</h3>
          <table className="table">
            <thead><tr><th>项目</th><th style={{ textAlign: 'right' }}>金额 (THB)</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 'bold' }}>负债</td><td style={{ textAlign: 'right' }}></td></tr>
              <tr><td>预收账款</td><td style={{ textAlign: 'right' }}>{fmt(liabilities.advanceReceived)}</td></tr>
              <tr style={{ fontWeight: 'bold' }}><td>负债合计</td><td style={{ textAlign: 'right' }}>{fmt(liabilities.totalLiabilities)}</td></tr>
              <tr><td colSpan={2}>&nbsp;</td></tr>
              <tr><td style={{ fontWeight: 'bold' }}>所有者权益</td><td style={{ textAlign: 'right' }}></td></tr>
              <tr><td>实收资本</td><td style={{ textAlign: 'right' }}>{fmt(equity.paidInCapital)}</td></tr>
              <tr><td>未分配利润</td><td style={{ textAlign: 'right' }}>{fmt(equity.retainedEarnings)}</td></tr>
              <tr style={{ fontWeight: 'bold' }}><td>权益合计</td><td style={{ textAlign: 'right' }}>{fmt(equity.totalEquity)}</td></tr>
              <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}><td>负债和权益总计</td><td style={{ textAlign: 'right' }}>{fmt(totalLiabAndEquity)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
