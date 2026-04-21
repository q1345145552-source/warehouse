'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';

type WarehouseDashboard = {
  finance: { monthlyIncome: number; monthlyExpense: number; purchaseCost: number; netProfit: number };
  kpi: { score: number; grade: string };
  demands: { pending: number; processing: number };
  alerts: string[];
};

const emptyData: WarehouseDashboard = {
  finance: { monthlyIncome: 0, monthlyExpense: 0, purchaseCost: 0, netProfit: 0 },
  kpi: { score: 0, grade: '待评估' },
  demands: { pending: 0, processing: 0 },
  alerts: [],
};

export default function HomePage() {
  const [data, setData] = useState<WarehouseDashboard>(emptyData);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const res = await apiGet<WarehouseDashboard>('/dashboard/warehouse');
      setData(res.data);
    } catch {
      setMessage('请先登录仓库端账号后查看工作台数据。');
    }
  }

  const cards = [
    { title: '本月收入', value: `¥ ${data.finance.monthlyIncome}` },
    { title: '本月支出', value: `¥ ${data.finance.monthlyExpense}` },
    { title: '净利润', value: `¥ ${data.finance.netProfit}` },
    { title: 'KPI 等级', value: data.kpi.grade },
  ];

  return (
    <AppShell title="仓库端工作台" subtitle="聚焦财务管理、KPI 考核与需求处理的最小可用闭环。">
      <section className="cards">
        {cards.map((card) => (
          <div key={card.title} className="card">
            <h3>{card.title}</h3>
            <strong>{card.value}</strong>
          </div>
        ))}
      </section>

      <section className="section">
        <h3>AI 提醒</h3>
        <p>{data.alerts[0] ?? '暂无提醒。'}</p>
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
