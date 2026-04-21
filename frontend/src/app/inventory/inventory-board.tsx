'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost, apiPut } from '@/lib/api';

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
    name: string;
    code: string;
  };
  reviewedBy?: {
    id: string;
    account: string;
    role: 'warehouse' | 'admin';
  } | null;
};

type InventoryResponse = {
  mine: InventoryItem[];
  shared: InventoryItem[];
};

type InventoryBoardProps = {
  inventoryType: 'product' | 'equipment' | 'other';
  title: string;
  subtitle: string;
};

export function InventoryBoard({ inventoryType, title, subtitle }: InventoryBoardProps) {
  const [mine, setMine] = useState<InventoryItem[]>([]);
  const [shared, setShared] = useState<InventoryItem[]>([]);
  const [editMap, setEditMap] = useState<Record<string, { title: string; description: string; quantity: string; unit: string }>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await apiGet<InventoryResponse>(`/inventory/items?inventoryType=${inventoryType}`);
      setMine(res.data.mine);
      setShared(res.data.shared);
      setEditMap((prev) => {
        const next = { ...prev };
        for (const item of res.data.mine) {
          if (!next[item.id]) {
            next[item.id] = {
              title: item.title,
              description: item.description,
              quantity: String(item.quantity),
              unit: item.unit ?? '',
            };
          }
        }
        return next;
      });
    } catch {
      setMine([]);
      setShared([]);
      setMessage('库存数据加载失败，请稍后重试。');
    }
  }, [inventoryType]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = {
      inventoryType,
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      quantity: Number(form.get('quantity') || 0),
      unit: String(form.get('unit') || '').trim() || undefined,
    };
    if (!payload.title || !payload.description || payload.quantity < 1) {
      setMessage('请正确填写标题、描述和数量（至少1）。');
      setLoading(false);
      return;
    }
    try {
      await apiPost('/inventory/items', payload);
      setMessage('库存条目已创建为草稿。');
      event.currentTarget.reset();
      await loadData();
    } catch {
      setMessage('创建失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  async function saveItem(item: InventoryItem) {
    const edit = editMap[item.id];
    if (!edit) return;
    const payload = {
      inventoryType,
      title: edit.title.trim(),
      description: edit.description.trim(),
      quantity: Number(edit.quantity || 0),
      unit: edit.unit.trim() || undefined,
    };
    if (!payload.title || !payload.description || payload.quantity < 1) {
      setMessage('请正确填写标题、描述和数量（至少1）。');
      return;
    }
    try {
      await apiPut(`/inventory/items/${item.id}`, payload);
      setMessage('库存条目已保存。');
      await loadData();
    } catch {
      setMessage('保存失败，请稍后重试。');
    }
  }

  async function submitItem(itemId: string) {
    try {
      await apiPost(`/inventory/items/${itemId}/submit`);
      setMessage('库存条目已提交管理员审核。');
      await loadData();
    } catch {
      setMessage('提交失败，请稍后重试。');
    }
  }

  return (
    <AppShell title={title} subtitle={subtitle}>
      <section className="section">
        <h3>新建库存条目</h3>
        <form className="form-grid" onSubmit={createItem}>
          <input name="title" placeholder="库存标题" required />
          <input name="description" placeholder="库存说明" required />
          <input name="quantity" type="number" min="1" placeholder="数量" required />
          <input name="unit" placeholder="单位（可选）" />
          <button type="submit" disabled={loading}>
            {loading ? '提交中...' : '创建草稿'}
          </button>
        </form>
      </section>

      <section className="section">
        <h3>我的库存</h3>
        <table className="table">
          <thead>
            <tr>
              <th>标题</th>
              <th>说明</th>
              <th>数量</th>
              <th>单位</th>
              <th>状态</th>
              <th>驳回原因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((item) => {
              const editable = item.status === 'draft' || item.status === 'rejected';
              const edit = editMap[item.id] ?? {
                title: item.title,
                description: item.description,
                quantity: String(item.quantity),
                unit: item.unit ?? '',
              };
              return (
                <tr key={item.id}>
                  <td>
                    <input
                      disabled={!editable}
                      value={edit.title}
                      onChange={(event) =>
                        setEditMap((prev) => ({ ...prev, [item.id]: { ...edit, title: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      disabled={!editable}
                      value={edit.description}
                      onChange={(event) =>
                        setEditMap((prev) => ({ ...prev, [item.id]: { ...edit, description: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      disabled={!editable}
                      type="number"
                      min="1"
                      value={edit.quantity}
                      onChange={(event) =>
                        setEditMap((prev) => ({ ...prev, [item.id]: { ...edit, quantity: event.target.value } }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      disabled={!editable}
                      value={edit.unit}
                      onChange={(event) =>
                        setEditMap((prev) => ({ ...prev, [item.id]: { ...edit, unit: event.target.value } }))
                      }
                    />
                  </td>
                  <td>{item.status}</td>
                  <td>{item.rejectionReason ?? '-'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    {editable ? (
                      <>
                        <button onClick={() => void saveItem(item)}>保存</button>
                        <button onClick={() => void submitItem(item.id)}>提交审核</button>
                      </>
                    ) : (
                      <span>已提交，待处理</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h3>共享库存（已通过）</h3>
        <table className="table">
          <thead>
            <tr>
              <th>来源仓库</th>
              <th>标题</th>
              <th>说明</th>
              <th>数量</th>
              <th>单位</th>
              <th>审核人</th>
              <th>通过时间</th>
            </tr>
          </thead>
          <tbody>
            {shared.map((item) => (
              <tr key={item.id}>
                <td>{item.warehouse?.name ?? item.warehouseId}</td>
                <td>{item.title}</td>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{item.unit ?? '-'}</td>
                <td>{item.reviewedBy?.account ?? (item.reviewedByUserId ?? '-')}</td>
                <td>{item.reviewedAt ? item.reviewedAt.slice(0, 10) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
