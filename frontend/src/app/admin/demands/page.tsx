'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';

type AdminDemand = {
  id: string;
  warehouseId: string;
  demandType: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  createdAt: string;
};

type DemandViewMode = 'all' | 'product_intent' | 'others';

function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join('；');
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
  } catch {
    // ignore parse errors
  }
  return error.message || fallback;
}

function isProductIntent(demand: AdminDemand) {
  return demand.title.startsWith('商品采购意向-');
}

export default function AdminDemandsPage() {
  const [demands, setDemands] = useState<AdminDemand[]>([]);
  const [viewMode, setViewMode] = useState<DemandViewMode>('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadDemands() {
    setLoading(true);
    try {
      const res = await apiGet<AdminDemand[]>('/admin/demands');
      setDemands(res.data);
    } catch (error) {
      setDemands([]);
      setMessage(getErrorMessage(error, '需求池加载失败，请稍后重试。'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDemands();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadDemands();
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredDemands = useMemo(() => {
    if (viewMode === 'product_intent') return demands.filter(isProductIntent);
    if (viewMode === 'others') return demands.filter((item) => !isProductIntent(item));
    return demands;
  }, [demands, viewMode]);

  const counts = useMemo(
    () => ({
      all: demands.length,
      productIntent: demands.filter(isProductIntent).length,
      others: demands.filter((item) => !isProductIntent(item)).length,
    }),
    [demands],
  );

  async function approveDemand(id: string) {
    try {
      await apiPost(`/admin/demands/${id}/approve`);
      setMessage('需求已标记为处理中。');
      await loadDemands();
    } catch (error) {
      setMessage(getErrorMessage(error, '操作失败，请稍后重试。'));
    }
  }

  async function closeDemand(id: string) {
    try {
      await apiPost(`/admin/demands/${id}/close`);
      setMessage('需求已关闭。');
      await loadDemands();
    } catch (error) {
      setMessage(getErrorMessage(error, '操作失败，请稍后重试。'));
    }
  }

  return (
    <AppShell title="管理员需求池" subtitle="统一处理仓库提交需求，并支持快速筛选商品采购意向。">
      <section className="section">
        <h3>快捷入口</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/admin">返回管理员总览</Link>
          <Link href="/admin/products">查看商品管理</Link>
        </div>
      </section>

      <section className="section">
        <h3>快捷筛选</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setViewMode('all')} disabled={viewMode === 'all'}>
            全部需求（{counts.all}）
          </button>
          <button type="button" onClick={() => setViewMode('product_intent')} disabled={viewMode === 'product_intent'}>
            商品采购意向（{counts.productIntent}）
          </button>
          <button type="button" onClick={() => setViewMode('others')} disabled={viewMode === 'others'}>
            其他需求（{counts.others}）
          </button>
          <button type="button" onClick={() => void loadDemands()} disabled={loading}>
            {loading ? '刷新中...' : '手动刷新'}
          </button>
        </div>
      </section>

      <section className="section">
        <h3>需求列表</h3>
        {loading ? <p>加载中...</p> : null}
        <table className="table">
          <thead>
            <tr>
              <th>类型</th>
              <th>标题</th>
              <th>仓库ID</th>
              <th>状态</th>
              <th>紧急程度</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredDemands.map((demand) => (
              <tr key={demand.id}>
                <td>{isProductIntent(demand) ? '商品采购意向' : demand.demandType}</td>
                <td>{demand.title}</td>
                <td>{demand.warehouseId}</td>
                <td>{demand.status}</td>
                <td>{demand.urgency}</td>
                <td>{demand.createdAt.slice(0, 16).replace('T', ' ')}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => void approveDemand(demand.id)} disabled={demand.status !== 'submitted'}>
                    标记处理中
                  </button>
                  <button onClick={() => void closeDemand(demand.id)} disabled={demand.status === 'closed'}>
                    关闭
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
