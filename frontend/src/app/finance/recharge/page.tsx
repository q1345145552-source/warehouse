'use client';

import { useEffect, useState } from 'react';
import { fetchRechargeTransactions, saveRechargeTransaction, fetchCustomers } from '@/lib/finance/finance-api';

export default function RechargePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [tRes, cRes] = await Promise.all([
        fetchRechargeTransactions(),
        fetchCustomers(),
      ]);
      setTransactions(tRes.data);
      setCustomers(cRes.data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveRechargeTransaction({
        customerId: fd.get('customerId') as string,
        transactionDate: fd.get('transactionDate') as string,
        type: fd.get('type') as 'recharge' | 'billing',
        currency: fd.get('currency') as string,
        amount: Number(fd.get('amount')),
        remark: (fd.get('remark') as string) || undefined,
      });
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // 按客户分组显示余额
  const customerBalances: Record<string, { name: string; balanceThb: number; balanceCny: number }> = {};
  for (const t of transactions) {
    const cid = t.customerId;
    if (!customerBalances[cid]) customerBalances[cid] = { name: t.customer?.customerName ?? cid, balanceThb: 0, balanceCny: 0 };
    customerBalances[cid].balanceThb = Number(t.balanceAfterThb);
    customerBalances[cid].balanceCny = Number(t.balanceAfterCny);
  }

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>充值明细（客户余额）</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={load}>刷新</button>
          <button onClick={() => setShowForm(!showForm)}>{showForm ? '取消' : '+ 充值/扣费'}</button>
        </div>
      </div>

      {showForm && (
        <div className="section">
          <h3>充值 / 账单扣费</h3>
          <form onSubmit={handleSave} className="form-grid">
            <label>客户* <select name="customerId" required><option value="">选择客户</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
            </select></label>
            <label>日期* <input name="transactionDate" type="date" required /></label>
            <label>类型* <select name="type" required><option value="recharge">充值</option><option value="billing">账单扣费</option></select></label>
            <label>币种* <select name="currency" required><option value="THB">THB</option><option value="CNY">CNY</option></select></label>
            <label>金额* <input name="amount" type="number" step="0.01" required /></label>
            <label>备注 <input name="remark" /></label>
            <div><button type="submit">保存</button></div>
          </form>
        </div>
      )}

      {/* 客户余额 */}
      <div className="section">
        <h3>客户余额一览</h3>
        <table className="table">
          <thead><tr><th>客户</th><th style={{ textAlign: 'right' }}>余额 (THB)</th><th style={{ textAlign: 'right' }}>余额 (CNY)</th></tr></thead>
          <tbody>
            {Object.entries(customerBalances).map(([cid, c]) => (
              <tr key={cid}>
                <td>{c.name}</td>
                <td style={{ textAlign: 'right' }}>{fmt(c.balanceThb)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(c.balanceCny)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 最近交易 */}
      <div className="section">
        <h3>最近交易 (最近50笔)</h3>
        <table className="table">
          <thead><tr><th>日期</th><th>客户</th><th>类型</th><th>币种</th><th style={{ textAlign: 'right' }}>金额 THB</th><th style={{ textAlign: 'right' }}>金额 CNY</th><th style={{ textAlign: 'right' }}>余额 THB</th><th>备注</th></tr></thead>
          <tbody>
            {transactions.slice(0, 50).map((t: any) => (
              <tr key={t.id}>
                <td>{t.transactionDate?.slice(0, 10) ?? '-'}</td>
                <td>{t.customer?.customerName ?? t.customerId}</td>
                <td style={{ color: t.type === 'recharge' ? 'green' : 'red' }}>{t.type === 'recharge' ? '充值' : '扣费'}</td>
                <td>{t.currency}</td>
                <td style={{ textAlign: 'right' }}>{fmt(t.amountThb)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(t.amountCny)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(t.balanceAfterThb)}</td>
                <td>{t.remark ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
