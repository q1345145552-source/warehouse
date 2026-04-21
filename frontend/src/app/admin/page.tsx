'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';

type AdminDashboard = {
  pendingDemands: number;
  financeWarnings: number;
  kpiWarnings: number;
  warehouseCount: number;
};

type Demand = {
  id: string;
  title: string;
  status: string;
  urgency: string;
};

type KpiEntry = {
  id: string;
  status: string;
  warehouseId: string;
};

const emptyDashboard: AdminDashboard = {
  pendingDemands: 0,
  financeWarnings: 0,
  kpiWarnings: 0,
  warehouseCount: 0,
};

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard>(emptyDashboard);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [kpiEntries, setKpiEntries] = useState<KpiEntry[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const [dRes, demandRes, kpiRes] = await Promise.all([
        apiGet<AdminDashboard>('/admin/dashboard'),
        apiGet<Demand[]>('/admin/demands'),
        apiGet<KpiEntry[]>('/kpi/entries'),
      ]);
      setDashboard(dRes.data);
      setDemands(demandRes.data);
      setKpiEntries(kpiRes.data.filter((item) => item.status === 'submitted'));
    } catch {
      setMessage('请先登录管理员账号。');
      setDashboard(emptyDashboard);
      setDemands([]);
      setKpiEntries([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approveDemand(id: string) {
    await apiPost(`/admin/demands/${id}/approve`);
    await load();
  }

  async function closeDemand(id: string) {
    await apiPost(`/admin/demands/${id}/close`);
    await load();
  }

  async function approveKpi(id: string) {
    await apiPost(`/admin/kpi/entries/${id}/approve`);
    await load();
  }

  async function recalculateProfit() {
    await apiPost('/admin/finance/profit-snapshots/recalculate');
    setMessage('利润快照已触发重算。');
    await load();
  }


  const cards = [
    { title: '待审核需求', value: String(dashboard.pendingDemands) },
    { title: '财务异常', value: String(dashboard.financeWarnings) },
    { title: 'KPI 异常', value: String(dashboard.kpiWarnings) },
    { title: '活跃仓库', value: String(dashboard.warehouseCount) },
  ];

  return (
    <AppShell title="管理员总览" subtitle="管理端聚焦仓库监管、需求审核与关键异常处理。">
      <section className="cards">
        {cards.map((card) => (
          <div key={card.title} className="card">
            <h3>{card.title}</h3>
            <strong>{card.value}</strong>
          </div>
        ))}
      </section>

      <section className="section">
        <h3>财务任务</h3>
        <button onClick={() => void recalculateProfit()}>重算本月利润快照</button>
      </section>

      <section className="section">
        <h3>需求审核操作</h3>
        <div style={{ marginBottom: 12 }}>
          <Link href="/admin/demands">进入管理员需求池（含商品采购意向快捷筛选）</Link>
        </div>
        <table className="table">
          <thead>
            <tr><th>标题</th><th>状态</th><th>紧急程度</th><th>操作</th></tr>
          </thead>
          <tbody>
            {demands.map((demand) => (
              <tr key={demand.id}>
                <td>{demand.title}</td>
                <td>{demand.status}</td>
                <td>{demand.urgency}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => void approveDemand(demand.id)}>通过</button>
                  <button onClick={() => void closeDemand(demand.id)}>关闭</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h3>KPI 提交审核</h3>
        <table className="table">
          <thead>
            <tr><th>ID</th><th>仓库ID</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            {kpiEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.id}</td>
                <td>{entry.warehouseId}</td>
                <td>{entry.status}</td>
                <td><button onClick={() => void approveKpi(entry.id)}>审核通过并计算</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {message ? <p>{message}</p> : null}
      </section>

      <section className="section">
        <h3>管理模块入口</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <Link href="/admin/inventory">进入库存审核中心</Link>
          <Link href="/admin/products">进入商品管理</Link>
          <Link href="/admin/finance-rules">进入财务规则中心</Link>
          <Link href="/admin/users">进入账号权限中心</Link>
          <Link href="/admin/logs">进入日志中心</Link>
          <Link href="/admin/warehouses">进入仓库管理中心</Link>
        </div>
      </section>
    </AppShell>
  );
}
