'use client';

import { useEffect, useState } from 'react';
import { fetchServiceRevenues, fetchMonthlyRevenueSummary, saveServiceRevenue, fetchCustomers } from '@/lib/finance/finance-api';
import { downloadCsv } from '@/lib/finance/reporting';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const SERVICE_TYPES = ['仓租费', '入库费', '出库费', '线下发货', '线下运费', '挪仓费', '贴标', '退货', '包材费', '卸货费', '其他'];

export default function ServiceRevenuePage() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<any>(null);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [mRes, rRes, cRes] = await Promise.all([
        fetchMonthlyRevenueSummary(month),
        fetchServiceRevenues({ serviceMonth: month }),
        fetchCustomers(),
      ]);
      setSummary(mRes.data);
      setRevenues(rRes.data);
      setCustomers(cRes.data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveServiceRevenue({
        customerId: fd.get('customerId') as string,
        serviceMonth: fd.get('serviceMonth') as string,
        serviceType: fd.get('serviceType') as string,
        quantity: Number(fd.get('quantity')),
        unitPrice: Number(fd.get('unitPrice')),
        serviceDate: (fd.get('serviceDate') as string) || undefined,
        remark: (fd.get('remark') as string) || undefined,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;

  const byCustomer: Record<string, { name: string; types: Record<string, number>; total: number }> = {};
  for (const r of revenues) {
    const cid = r.customer?.customerId ?? r.customerId;
    if (!byCustomer[cid]) byCustomer[cid] = { name: r.customer?.customerName ?? cid, types: {}, total: 0 };
    byCustomer[cid].types[r.serviceType] = (byCustomer[cid].types[r.serviceType] ?? 0) + Number(r.amountThb);
    byCustomer[cid].total += Number(r.amountThb);
  }

  const exportCsv = () => {
    const rows: string[][] = [
      ['主营业务收入', '', ''], [`月份: ${month}`, '', ''],
      ['客户名称', ...SERVICE_TYPES, '合计'],
      ...Object.entries(byCustomer).map(([_, c]) => [c.name, ...SERVICE_TYPES.map(t => fmt(c.types[t] ?? 0)), fmt(c.total)]),
      ['合计', ...SERVICE_TYPES.map(t => fmt(Object.values(byCustomer).reduce((s, c) => s + (c.types[t] ?? 0), 0))), fmt(Object.values(byCustomer).reduce((s, c) => s + c.total, 0))],
    ];
    downloadCsv(`service-revenue-${month}.csv`, ['客户', ...SERVICE_TYPES, '合计'], rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>主营业务收入</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={load}>刷新</button>
          <button onClick={exportCsv}>导出 CSV</button>
          <button onClick={() => setShowForm(!showForm)}>{showForm ? '取消' : '+ 录入收入'}</button>
        </div>
      </div>

      <div className="cards">
        <div className="card"><h3>{month} 收入合计</h3><p className="big-num">฿{fmt(summary?.totalRevenue ?? 0)}</p></div>
        <div className="card"><h3>服务类型</h3><p className="big-num">{Object.keys(summary?.byType ?? {}).length}</p></div>
        <div className="card"><h3>活跃客户</h3><p className="big-num">{Object.keys(summary?.byCustomer ?? {}).length}</p></div>
      </div>

      {showForm && (
        <div className="section">
          <h3>录入服务收入</h3>
          <form onSubmit={handleSave} className="form-grid">
            <label>客户* <select name="customerId" required><option value="">选择客户</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
            </select></label>
            <label>服务月份* <input name="serviceMonth" type="month" defaultValue={month} required /></label>
            <label>服务类型* <select name="serviceType" required>
              {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select></label>
            <label>数量 <input name="quantity" type="number" step="0.01" defaultValue="1" /></label>
            <label>单价(THB) <input name="unitPrice" type="number" step="0.01" /></label>
            <label>服务日期 <input name="serviceDate" type="date" /></label>
            <label>备注 <input name="remark" /></label>
            <div><button type="submit">保存</button></div>
          </form>
        </div>
      )}

      <div className="section" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr><th>客户</th>{SERVICE_TYPES.map(t => <th key={t} style={{ textAlign: 'right' }}>{t}</th>)}<th style={{ textAlign: 'right', fontWeight: 'bold' }}>合计</th></tr>
          </thead>
          <tbody>
            {Object.entries(byCustomer).map(([cid, c]) => (
              <tr key={cid}>
                <td>{c.name}</td>
                {SERVICE_TYPES.map(t => <td key={t} style={{ textAlign: 'right' }}>{c.types[t] ? fmt(c.types[t]) : ''}</td>)}
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(c.total)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}>
              <td>合计</td>
              {SERVICE_TYPES.map(t => (
                <td key={t} style={{ textAlign: 'right' }}>
                  {fmt(Object.values(byCustomer).reduce((s, c) => s + (c.types[t] ?? 0), 0))}
                </td>
              ))}
              <td style={{ textAlign: 'right' }}>{fmt(Object.values(byCustomer).reduce((s, c) => s + c.total, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
