'use client';

import { useEffect, useState } from 'react';
import { fetchAccountTree } from '@/lib/finance/finance-api';

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAccountTree();
      setAccounts(res.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="section"><p>加载中...</p></div>;
  if (error) return <div className="section"><p style={{ color: 'red' }}>{error}</p></div>;

  const renderAccount = (acc: any, depth = 0) => (
    <div key={acc.id} style={{ marginLeft: depth * 20, padding: '4px 0' }}>
      <strong>{acc.code}</strong> {acc.name}
      <small style={{ marginLeft: 8, color: '#888' }}>{acc.category}</small>
      {acc.children?.map((child: any) => renderAccount(child, depth + 1))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>科目分录（Chart of Accounts）</h2>
        <button onClick={load}>刷新</button>
      </div>
      <div className="section">
        {accounts.map((a: any) => renderAccount(a))}
      </div>
    </div>
  );
}
