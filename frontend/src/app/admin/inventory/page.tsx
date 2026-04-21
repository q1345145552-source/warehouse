'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';

type InventoryItem = {
  id: string;
  warehouseId: string;
  inventoryType: 'product' | 'equipment' | 'other';
  title: string;
  description: string;
  quantity: number;
  unit: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejectionReason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  };
  reviewedBy?: {
    id: string;
    account: string;
    role: 'warehouse' | 'admin';
  } | null;
};

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filters, setFilters] = useState<{ inventoryType: '' | 'product' | 'equipment' | 'other'; status: '' | 'draft' | 'submitted' | 'approved' | 'rejected' }>({
    inventoryType: '',
    status: 'submitted',
  });
  const [rejectReasonMap, setRejectReasonMap] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadItems(nextFilters = filters) {
    try {
      const params = new URLSearchParams();
      if (nextFilters.inventoryType) params.set('inventoryType', nextFilters.inventoryType);
      if (nextFilters.status) params.set('status', nextFilters.status);
      const query = params.toString();
      const res = await apiGet<InventoryItem[]>(`/admin/inventory/items${query ? `?${query}` : ''}`);
      setItems(res.data);
    } catch {
      setItems([]);
      setMessage('库存审核列表加载失败。');
    }
  }

  async function approve(itemId: string) {
    try {
      await apiPost(`/admin/inventory/items/${itemId}/approve`);
      setMessage('库存条目已审核通过。');
      await loadItems();
    } catch {
      setMessage('审核通过失败，请稍后重试。');
    }
  }

  async function reject(itemId: string) {
    const reason = (rejectReasonMap[itemId] || '').trim();
    if (!reason) {
      setMessage('请先填写驳回原因。');
      return;
    }
    try {
      await apiPost(`/admin/inventory/items/${itemId}/reject`, { rejectionReason: reason });
      setMessage('库存条目已驳回。');
      await loadItems();
    } catch {
      setMessage('驳回失败，请稍后重试。');
    }
  }

  return (
    <AppShell title="库存审核" subtitle="审核仓库提交的库存条目并决定是否共享展示。">
      <section className="section">
        <h3>快捷入口</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/admin">返回管理员总览</Link>
        </div>
      </section>

      <section className="section">
        <h3>筛选</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={filters.inventoryType}
            onChange={(event) => setFilters((prev) => ({ ...prev, inventoryType: event.target.value as '' | 'product' | 'equipment' | 'other' }))}
          >
            <option value="">全部类型</option>
            <option value="product">产品库存</option>
            <option value="equipment">设备库存</option>
            <option value="other">其他库存</option>
          </select>
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as '' | 'draft' | 'submitted' | 'approved' | 'rejected' }))}
          >
            <option value="">全部状态</option>
            <option value="draft">draft</option>
            <option value="submitted">submitted</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
          <button onClick={() => void loadItems(filters)}>查询</button>
        </div>
      </section>

      <section className="section">
        <h3>审核列表</h3>
        <table className="table">
          <thead>
            <tr>
              <th>仓库</th>
              <th>类型</th>
              <th>标题</th>
              <th>说明</th>
              <th>数量</th>
              <th>状态</th>
              <th>审核人</th>
              <th>审核时间</th>
              <th>驳回原因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const canReview = item.status === 'submitted';
              return (
                <tr key={item.id}>
                  <td>{item.warehouse?.name ?? item.warehouseId}</td>
                  <td>{item.inventoryType}</td>
                  <td>{item.title}</td>
                  <td>{item.description}</td>
                  <td>
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ''}
                  </td>
                  <td>{item.status}</td>
                  <td>{item.reviewedBy?.account ?? (item.reviewedByUserId ?? '-')}</td>
                  <td>{item.reviewedAt ? item.reviewedAt.slice(0, 19).replace('T', ' ') : '-'}</td>
                  <td>{item.rejectionReason ?? '-'}</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      placeholder="驳回原因"
                      value={rejectReasonMap[item.id] ?? ''}
                      onChange={(event) => setRejectReasonMap((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      disabled={!canReview}
                    />
                    <button onClick={() => void approve(item.id)} disabled={!canReview}>
                      通过
                    </button>
                    <button onClick={() => void reject(item.id)} disabled={!canReview}>
                      驳回
                    </button>
                  </td>
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
