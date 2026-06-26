'use client';

import { useEffect, useState } from 'react';
import { fetchConsumableItems, fetchConsumableMonthlyCost } from '@/lib/finance/finance-api';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ConsumablesPage() {
  const [month] = useState(currentMonth());
  const [items, setItems] = useState<any[]>([]);
  const [monthlyCost, setMonthlyCost] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [iRes, cRes] = await Promise.all([
        fetchConsumableItems(),
        fetchConsumableMonthlyCost(month),
      ]);
      setItems(iRes.data);
      setMonthlyCost(cRes.data?.totalCost ?? 0);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>耗材清单</h2>
        <button onClick={load}>刷新</button>
      </div>

      <div className="cards">
        <div className="card"><h3>品项数</h3><p className="big-num">{items.length}</p></div>
        <div className="card"><h3>{month} 耗材成本</h3><p className="big-num">฿{fmt(monthlyCost)}</p></div>
      </div>

      <div className="section">
        <table className="table">
          <thead><tr><th>名称</th><th>规格</th><th>单位</th><th>默认单价</th><th>状态</th></tr></thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id}>
                <td>{item.itemName}</td>
                <td>{item.itemCode ?? '-'}</td>
                <td>{item.unit}</td>
                <td style={{ textAlign: 'right' }}>{fmt(item.defaultPrice ?? 0)}</td>
                <td>{item.status === 'active' ? '在用' : item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
