'use client';

import { useEffect, useState } from 'react';
import { fetchBankAccounts, fetchBankLedger, saveBankTransaction, fetchAccounts } from '@/lib/finance/finance-api';
import { getWarehouseId } from '@/lib/auth';

export default function BankLedgerPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [month, setMonth] = useState('');
  const [ledger, setLedger] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const wid = getWarehouseId() ?? '';

  const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00';

  const loadAccounts = async () => {
    try {
      const [aRes, cRes] = await Promise.all([
        fetchBankAccounts(),
        fetchAccounts(),
      ]);
      setAccounts(aRes.data);
      if (aRes.data.length > 0 && !selectedAccount) setSelectedAccount(aRes.data[0].id);
      setCategories(cRes.data);
    } catch (e: any) { setError(e.message); }
  };

  useEffect(() => { loadAccounts(); }, []);

  const loadLedger = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchBankLedger(selectedAccount, wid, month || undefined);
      setLedger(res.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLedger(); }, [selectedAccount, month]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveBankTransaction({
        bankAccountId: selectedAccount,
        transactionDate: fd.get('transactionDate') as string,
        categoryId: (fd.get('categoryId') as string) || undefined,
        description: fd.get('description') as string || '',
        incomeThb: Number(fd.get('incomeThb') || 0),
        incomeCny: Number(fd.get('incomeCny') || 0),
        expenseThb: Number(fd.get('expenseThb') || 0),
        expenseCny: Number(fd.get('expenseCny') || 0),
        remark: (fd.get('remark') as string) || undefined,
      });
      setShowForm(false);
      loadLedger();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>银行日记账</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.accountName} ({a.accountType})</option>)}
          </select>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="全部月份" />
          <button onClick={loadLedger}>查询</button>
          <button onClick={() => setShowForm(!showForm)}>{showForm ? '取消' : '+ 记一笔'}</button>
        </div>
      </div>

      {ledger && (
        <div className="cards">
          <div className="card"><h3>{ledger.accountName}</h3><p>{ledger.accountType}</p></div>
          <div className="card"><h3>收入 THB</h3><p className="big-num">{fmt(ledger.summary.totalIncomeThb)}</p></div>
          <div className="card"><h3>支出 THB</h3><p className="big-num">{fmt(ledger.summary.totalExpenseThb)}</p></div>
          <div className="card"><h3>期末余额</h3><p className="big-num">฿{fmt(ledger.transactions[ledger.transactions.length - 1]?.balanceAfterThb ?? 0)}</p></div>
        </div>
      )}

      {showForm && (
        <div className="section">
          <h3>记一笔流水</h3>
          <form onSubmit={handleSave} className="form-grid">
            <label>日期* <input name="transactionDate" type="date" required /></label>
            <label>科目 <select name="categoryId"><option value="">选择科目</option>
              {categories.filter((c: any) => c.isLeaf).map((c: any) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
            </select></label>
            <label>摘要* <input name="description" required /></label>
            <label>收入(THB) <input name="incomeThb" type="number" step="0.01" /></label>
            <label>收入(CNY) <input name="incomeCny" type="number" step="0.01" /></label>
            <label>支出(THB) <input name="expenseThb" type="number" step="0.01" /></label>
            <label>支出(CNY) <input name="expenseCny" type="number" step="0.01" /></label>
            <label>备注 <input name="remark" /></label>
            <div><button type="submit">保存</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="section"><p>加载中...</p></div> :
        error ? <div className="section"><p style={{ color: 'red' }}>{error}</p></div> :
        ledger && (
          <div className="section" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>日期</th><th>摘要</th><th>科目</th><th style={{ textAlign: 'right' }}>收入 THB</th><th style={{ textAlign: 'right' }}>收入 CNY</th><th style={{ textAlign: 'right' }}>支出 THB</th><th style={{ textAlign: 'right' }}>支出 CNY</th><th style={{ textAlign: 'right' }}>余额 THB</th><th style={{ textAlign: 'right' }}>余额 CNY</th></tr></thead>
              <tbody>
                {ledger.transactions.map((t: any) => (
                  <tr key={t.id}>
                    <td>{t.transactionDate?.slice(0, 10) ?? '-'}</td>
                    <td>{t.description}</td>
                    <td>{t.categoryName}</td>
                    <td style={{ textAlign: 'right', color: 'green' }}>{t.incomeThb > 0 ? fmt(t.incomeThb) : ''}</td>
                    <td style={{ textAlign: 'right', color: 'green' }}>{t.incomeCny > 0 ? fmt(t.incomeCny) : ''}</td>
                    <td style={{ textAlign: 'right', color: 'red' }}>{t.expenseThb > 0 ? fmt(t.expenseThb) : ''}</td>
                    <td style={{ textAlign: 'right', color: 'red' }}>{t.expenseCny > 0 ? fmt(t.expenseCny) : ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(t.balanceAfterThb)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(t.balanceAfterCny)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
