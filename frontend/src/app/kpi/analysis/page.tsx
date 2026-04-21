'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';

type KpiResult = {
  id: string;
  cycleType: string;
  totalScore: number;
  grade: string;
  startDate: string;
  endDate: string;
};

type KpiMetric = {
  id: string;
  metricCode: string;
  scoreCeiling: number;
  actualScore: number;
};

export default function KpiAnalysisPage() {
  const [results, setResults] = useState<KpiResult[]>([]);
  const [metrics, setMetrics] = useState<KpiMetric[]>([]);
  const [selectedResultId, setSelectedResultId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadResults() {
    try {
      const res = await apiGet<KpiResult[]>('/kpi/results');
      setResults(res.data);
      if (res.data[0]) {
        setSelectedResultId(res.data[0].id);
        await loadMetrics(res.data[0].id);
      }
    } catch {
      setMessage('暂无 KPI 结果，请先完成 KPI 审核。');
      setResults([]);
      setMetrics([]);
    }
  }

  async function loadMetrics(resultId: string) {
    try {
      const res = await apiGet<KpiMetric[]>(`/kpi/results/${resultId}/metrics`);
      setMetrics(res.data);
    } catch {
      setMetrics([]);
    }
  }

  return (
    <AppShell title="KPI 分析看板" subtitle="按结果下钻指标得分与等级分布。">
      <section className="section">
        <h3>结果选择</h3>
        <div className="form-grid">
          <select
            value={selectedResultId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedResultId(id);
              void loadMetrics(id);
            }}
          >
            {results.map((row) => (
              <option key={row.id} value={row.id}>
                {row.cycleType} / {row.grade} / {row.startDate.slice(0, 10)} - {row.endDate.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="section">
        <h3>KPI 指标得分明细</h3>
        <table className="table">
          <thead>
            <tr><th>指标</th><th>满分</th><th>实得分</th><th>完成率</th></tr>
          </thead>
          <tbody>
            {metrics.map((row) => {
              const ratio = row.scoreCeiling > 0 ? (row.actualScore / row.scoreCeiling) * 100 : 0;
              return (
                <tr key={row.id}>
                  <td>{row.metricCode}</td>
                  <td>{row.scoreCeiling}</td>
                  <td>{row.actualScore}</td>
                  <td>{ratio.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
