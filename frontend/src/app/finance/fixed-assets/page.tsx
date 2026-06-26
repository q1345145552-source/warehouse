'use client';

import { useEffect, useState } from 'react';
import { fetchFixedAssets, fetchFixedAssetMonthlyExpense, saveFixedAsset } from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function FixedAssetsPage() {
  const [month] = useState(currentMonth());
  const [assets, setAssets] = useState<any[]>([]);
  const [monthlyExp, setMonthlyExp] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const wid = getWarehouseId() ?? '';

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [aRes, eRes] = await Promise.all([
        fetchFixedAssets(),
        fetchFixedAssetMonthlyExpense(month),
      ]);
      setAssets(aRes.data);
      setMonthlyExp(eRes.data?.totalExpense ?? 0);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveFixedAsset({
        warehouseId: wid,
        assetName: fd.get('assetName') as string,
        nature: (fd.get('nature') as string) || '采购',
        purchaseDate: fd.get('purchaseDate') as string,
        purchaseQty: Number(fd.get('purchaseQty') || 1),
        unitPrice: Number(fd.get('unitPrice') || 0),
        depreciationMethod: fd.get('depreciationMethod') as string || 'immediate',
        usefulLife: Number(fd.get('usefulLife') || 0) || undefined,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;

  const total = assets.reduce((s, a) => s + Number(a.purchaseAmount ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>固定资产</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={load}>刷新</button>
          <button onClick={() => setShowForm(!showForm)}>{showForm ? '取消' : '+ 新增资产'}</button>
        </div>
      </div>

      <div className="cards">
        <div className="card"><h3>资产总数</h3><p className="big-num">{assets.length}</p></div>
        <div className="card"><h3>采购总额</h3><p className="big-num">฿{fmt(total)}</p></div>
        <div className="card"><h3>{month} 折旧费用</h3><p className="big-num">฿{fmt(monthlyExp)}</p><small>一次性摊销即全额计入采购月</small></div>
      </div>

      {showForm && (
        <div className="section">
          <h3>新增固定资产</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>资产名称* <input name="assetName" required /></label>
            <label>购入日期* <input name="purchaseDate" type="date" required /></label>
            <label>数量 <input name="purchaseQty" type="number" defaultValue="1" /></label>
            <label>单价(THB) <input name="unitPrice" type="number" step="0.01" /></label>
            <label>折旧方式 <select name="depreciationMethod" defaultValue="immediate">
              <option value="immediate">一次性摊销</option>
              <option value="monthly">按月折旧</option>
            </select></label>
            <label>使用年限(月) <input name="usefulLife" type="number" /></label>
            <label>性质 <input name="nature" defaultValue="采购" /></label>
            <div><button type="submit">保存</button></div>
          </form>
        </div>
      )}

      <div className="section">
        <table className="table">
          <thead><tr><th>名称</th><th>购入日期</th><th>数量</th><th>单价</th><th>总价</th><th>折旧方式</th><th>累计折旧</th><th>状态</th></tr></thead>
          <tbody>
            {assets.map((a: any) => (
              <tr key={a.id}>
                <td>{a.assetName}</td>
                <td>{a.purchaseDate?.slice(0, 10) ?? '-'}</td>
                <td>{a.purchaseQty}</td>
                <td style={{ textAlign: 'right' }}>{fmt(a.unitPrice)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(a.purchaseAmount)}</td>
                <td>{a.depreciationMethod === 'immediate' ? '一次性摊销' : '按月折旧'}</td>
                <td style={{ textAlign: 'right' }}>{fmt(a.accumulatedDepreciation)}</td>
                <td>{a.status === 'active' ? '在用' : a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
