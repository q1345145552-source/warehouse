'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAllFinanceInputRecords, fetchFinanceAnalysis } from '@/lib/finance/finance-api';
import { matchRecordToTargetModule } from '@/lib/finance/module-routing';
import { subscribeFinanceDataUpdated } from '@/lib/finance/sync';
import { useFinanceTerminology } from '@/lib/finance/terminology';
import type { FinanceAnalysis, FinanceRecord } from '@/lib/finance/types';

export default function OperationMonitorPage() {
  const { term, moduleLabel } = useFinanceTerminology();
  const [analysis, setAnalysis] = useState<FinanceAnalysis[]>([]);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [keyword, setKeyword] = useState('');
  const [refreshedAt, setRefreshedAt] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadData();
    const unsubscribe = subscribeFinanceDataUpdated(() => {
      void loadData();
    });
    return unsubscribe;
  }, []);

  async function loadData() {
    try {
      const [analysisRes, allRecords] = await Promise.all([fetchFinanceAnalysis(), fetchAllFinanceInputRecords()]);
      setAnalysis(analysisRes.data.slice(0, 10));
      setRecords(allRecords.filter((item) => matchRecordToTargetModule(item, 'operation_monitor')));
      setRefreshedAt(new Date().toLocaleString());
      setMessage('');
    } catch {
      setAnalysis([]);
      setRecords([]);
      setMessage('经营监控数据加载失败，请稍后重试。');
    }
  }

  const filteredRecords = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((row) => `${row.category} ${row.note ?? ''}`.toLowerCase().includes(normalized));
  }, [records, keyword]);

  return (
    <>
      <section className="section">
        <h3>{moduleLabel('operation_monitor')}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            placeholder="分类或备注关键字筛选"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button onClick={() => void loadData()}>{term('finance.common.manualRefresh')}</button>
          <span>
            {term('finance.common.lastRefreshed')}：{refreshedAt || '-'}
          </span>
        </div>
        <p>数据来源：{term('finance.tab.dataInput')}（目标模块={moduleLabel('operation_monitor')}，历史数据走兜底规则）。</p>
        <table className="table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>分类</th>
              <th>金额(CNY)</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((item) => (
              <tr key={item.id}>
                <td>{item.recordDate.slice(0, 10)}</td>
                <td>{item.recordType}</td>
                <td>{item.category}</td>
                <td>¥ {Number(item.amountCny ?? item.amount).toFixed(2)}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h3>AI 经营提示</h3>
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>风险等级</th>
              <th>内容</th>
            </tr>
          </thead>
          <tbody>
            {analysis.map((item) => (
              <tr key={item.id}>
                <td>{item.createdAt.slice(0, 16).replace('T', ' ')}</td>
                <td>{item.analysisType}</td>
                <td>{item.riskLevel}</td>
                <td>{item.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {message ? <p>{message}</p> : null}
      </section>
    </>
  );
}
