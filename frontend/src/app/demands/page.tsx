'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost } from '@/lib/api';

type Demand = {
  id: string;
  demandType: string;
  title: string;
  description: string;
  urgency: string;
  contactName?: string | null;
  wechatId?: string | null;
  intendedQuantity?: number | null;
  status: string;
  createdAt: string;
};

type DemandTypeConfig = {
  id: string;
  typeKey: string;
  typeName: string;
  description?: string | null;
  sortOrder: number;
  isEnabled: boolean;
};

const legacyDemandTypeLabelMap: Record<string, string> = {
  finance: '仓库需求',
  purchase_optimization: '拼团需求',
  certificate: '证件办理',
  second_hand: '仓库需求',
  other: '仓库需求',
};

const legacyDemandTypeMap: Record<string, string> = {
  finance: 'warehouse_request',
  purchase_optimization: 'group_purchase',
  certificate: 'certificate_processing',
  second_hand: 'warehouse_request',
  other: 'warehouse_request',
};

function isProductIntent(demand: Demand) {
  return demand.title.startsWith('商品采购意向-');
}

function extractDetailValue(description: string, label: string) {
  const line = description
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${label}:`));
  if (!line) return '';
  return line.slice(label.length + 1).trim();
}

function getWechatText(demand: Demand) {
  if (demand.wechatId && demand.wechatId.trim()) return demand.wechatId;
  return extractDetailValue(demand.description, '微信号') || '-';
}

function getIntendedQuantityText(demand: Demand) {
  if (demand.intendedQuantity !== null && demand.intendedQuantity !== undefined) {
    return String(demand.intendedQuantity);
  }
  return extractDetailValue(demand.description, '意向数量') || '-';
}

export default function DemandsPage() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [demandTypes, setDemandTypes] = useState<DemandTypeConfig[]>([]);
  const [selectedDemandType, setSelectedDemandType] = useState('');
  const [detail, setDetail] = useState<{ id: string; description: string; status: string; progressLogs: { id: string; status: string; note: string; createdAt: string }[] } | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (demandTypes.length === 0) return;
    if (typeof window === 'undefined') return;
    const requestedTypeRaw = (new URLSearchParams(window.location.search).get('type') || '').trim();
    if (!requestedTypeRaw) return;
    const requestedType = legacyDemandTypeMap[requestedTypeRaw] ?? requestedTypeRaw;
    const exists = demandTypes.some((item) => item.typeKey === requestedType);
    if (exists) {
      setSelectedDemandType(requestedType);
    }
  }, [demandTypes]);

  async function loadInitialData() {
    try {
      const [demandsRes, typesRes] = await Promise.all([apiGet<Demand[]>('/demands'), apiGet<DemandTypeConfig[]>('/demands/types')]);
      setDemands(demandsRes.data);
      setDemandTypes(typesRes.data);
      setSelectedDemandType((prev) => prev || typesRes.data[0]?.typeKey || '');
    } catch {
      setDemands([]);
      setDemandTypes([]);
      setSelectedDemandType('');
      setMessage('暂时无法连接后端，当前显示空数据。');
    }
  }

  async function loadDemands() {
    try {
      const response = await apiGet<Demand[]>('/demands');
      setDemands(response.data);
    } catch {
      setDemands([]);
      setMessage('暂时无法连接后端，当前显示空数据。');
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    if (!selectedDemandType) {
      setMessage('请先选择需求类型。');
      setLoading(false);
      return;
    }

    const payload = {
      demandType: selectedDemandType,
      title: String(form.get('title')),
      description: String(form.get('description')),
      urgency: String(form.get('urgency')),
      contactName: String(form.get('contactName')),
    };

    try {
      await apiPost('/demands', payload);
      setMessage('需求已提交。');
      event.currentTarget.reset();
      await loadDemands();
    } catch {
      setMessage('提交失败，请检查后端服务。');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    try {
      const res = await apiGet<{ id: string; description: string; status: string; progressLogs: { id: string; status: string; note: string; createdAt: string }[] }>(`/demands/${id}`);
      setDetail(res.data);
    } catch {
      setDetail(null);
    }
  }

  async function confirmFinish(id: string) {
    try {
      await apiPost(`/demands/${id}/confirm-finish`);
      setMessage('已确认需求完成。');
      await Promise.all([loadDemands(), loadDetail(id)]);
    } catch {
      setMessage('确认失败，请稍后重试。');
    }
  }

  function getDemandTypeLabel(typeKey: string) {
    const fromConfig = demandTypes.find((item) => item.typeKey === typeKey)?.typeName;
    if (fromConfig) return fromConfig;
    return legacyDemandTypeLabelMap[typeKey] ?? typeKey;
  }

  return (
    <AppShell title="需求中心" subtitle="面向管理员发起协作需求并跟踪进度。">
      <section className="section">
        <h3>需求类型入口</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {demandTypes.map((item) => {
            const active = selectedDemandType === item.typeKey;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedDemandType(item.typeKey)}
                style={{
                  textAlign: 'left',
                  borderRadius: 12,
                  border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  padding: '14px 12px',
                  background: active ? 'rgba(37,99,235,0.08)' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <p style={{ margin: 0, fontWeight: 700 }}>{item.typeName}</p>
                <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>{item.description || '点击后快速发起该类型需求'}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h3>新建需求</h3>
        <p style={{ marginTop: 0 }}>
          当前类型：<strong>{selectedDemandType ? getDemandTypeLabel(selectedDemandType) : '未选择'}</strong>
        </p>
        <form className="form-grid" onSubmit={onSubmit}>
          <select name="urgency" defaultValue="medium">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
          <input name="title" placeholder="需求标题" required />
          <input name="description" placeholder="需求描述" required />
          <input name="contactName" placeholder="联系人" />
          <button type="submit" disabled={loading}>{loading ? '提交中...' : '提交需求'}</button>
        </form>
        {message ? <p>{message}</p> : null}
      </section>

      <section className="section">
        <h3>需求列表</h3>
        <table className="table">
          <thead>
            <tr>
              <th>类型</th>
              <th>标题</th>
              <th>联系人</th>
              <th>微信号</th>
              <th>意向数量</th>
              <th>状态</th>
              <th>紧急程度</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {demands.map((row) => (
              <tr key={row.id}>
                <td>{getDemandTypeLabel(row.demandType)}</td>
                <td>{row.title}</td>
                <td>{row.contactName || '-'}</td>
                <td>{isProductIntent(row) ? getWechatText(row) : '-'}</td>
                <td>{isProductIntent(row) ? getIntendedQuantityText(row) : '-'}</td>
                <td>{row.status}</td>
                <td>{row.urgency}</td>
                <td>{row.createdAt?.slice(0, 10) ?? '-'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => void loadDetail(row.id)}>详情</button>
                  <button onClick={() => void confirmFinish(row.id)} disabled={row.status !== 'completed'}>
                    确认完成
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {detail ? (
        <section className="section">
          <h3>需求详情</h3>
          <p><strong>状态：</strong>{detail.status}</p>
          <p><strong>描述：</strong>{detail.description}</p>
          <table className="table">
            <thead>
              <tr><th>时间</th><th>状态</th><th>备注</th></tr>
            </thead>
            <tbody>
              {detail.progressLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.createdAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{log.status}</td>
                  <td>{log.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </AppShell>
  );
}
