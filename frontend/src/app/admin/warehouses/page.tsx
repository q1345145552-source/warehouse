'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPut } from '@/lib/api';

type WarehouseFeature = {
  id: string;
  featureKey: string;
  enabled: boolean;
};

type WarehouseUser = {
  id: string;
  account: string;
  role: string;
  status: string;
  lastLoginAt?: string | null;
  lockedUntil?: string | null;
};

type WarehouseRecord = {
  id: string;
  recordType: string;
  amount: string | number;
  status: string;
  recordDate: string;
};

type WarehouseProject = {
  id: string;
  projectName: string;
  status: string;
  createdAt: string;
};

type WarehouseListItem = {
  id: string;
  code: string;
  name: string;
  countryCode?: string | null;
  cityName?: string | null;
  areaSize?: string | number | null;
  status: 'enabled' | 'disabled';
  features: WarehouseFeature[];
  users?: WarehouseUser[];
};

type WarehouseDetail = WarehouseListItem & {
  users: WarehouseUser[];
  records: WarehouseRecord[];
  projects: WarehouseProject[];
};

const featureCatalog = ['finance', 'kpi', 'demands'];

export default function AdminWarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<WarehouseDetail | null>(null);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ keyword: '', status: '', featureKey: '' });
  const [batchFeatures, setBatchFeatures] = useState<Record<string, boolean>>({
    finance: true,
    kpi: true,
    demands: true,
  });

  useEffect(() => {
    void loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWarehouses(nextFilters = filters) {
    const params = new URLSearchParams();
    if (nextFilters.keyword) params.set('keyword', nextFilters.keyword);
    if (nextFilters.status) params.set('status', nextFilters.status);
    if (nextFilters.featureKey) params.set('featureKey', nextFilters.featureKey);
    const query = params.toString();

    try {
      const res = await apiGet<WarehouseListItem[]>(`/admin/warehouses${query ? `?${query}` : ''}`);
      setWarehouses(res.data);
      setSelectedIds((prev) => prev.filter((id) => res.data.some((item) => item.id === id)));
    } catch {
      setMessage('仓库列表加载失败，请确认管理员权限。');
      setWarehouses([]);
    }
  }

  async function openDetail(warehouseId: string) {
    const res = await apiGet<WarehouseDetail>(`/admin/warehouses/${warehouseId}`);
    setSelectedDetail(res.data);
  }

  async function updateWarehouseStatus(warehouseId: string, status: 'enabled' | 'disabled') {
    await apiPut(`/admin/warehouses/${warehouseId}/status`, { status });
    setMessage('仓库状态已更新。');
    await loadWarehouses();
    if (selectedDetail?.id === warehouseId) {
      await openDetail(warehouseId);
    }
  }

  async function updateWarehouseFeatures(warehouseId: string, features: Record<string, boolean>) {
    await apiPut(`/admin/warehouses/${warehouseId}/features`, {
      items: Object.entries(features).map(([key, enabled]) => ({ key, enabled })),
    });
    setMessage('仓库功能策略已更新。');
    await loadWarehouses();
    if (selectedDetail?.id === warehouseId) {
      await openDetail(warehouseId);
    }
  }

  async function batchUpdateStatus(status: 'enabled' | 'disabled') {
    if (selectedIds.length === 0) {
      setMessage('请先勾选仓库。');
      return;
    }
    await apiPut('/admin/warehouses/batch/status', {
      warehouseIds: selectedIds,
      status,
    });
    setMessage(`已批量${status === 'enabled' ? '启用' : '停用'}仓库。`);
    await loadWarehouses();
  }

  async function batchUpdateFeatures() {
    if (selectedIds.length === 0) {
      setMessage('请先勾选仓库。');
      return;
    }
    await apiPut('/admin/warehouses/batch/features', {
      warehouseIds: selectedIds,
      items: Object.entries(batchFeatures).map(([key, enabled]) => ({ key, enabled })),
    });
    setMessage('已批量更新策略开关。');
    await loadWarehouses();
  }

  const selectedAll = useMemo(
    () => warehouses.length > 0 && warehouses.every((item) => selectedIds.includes(item.id)),
    [warehouses, selectedIds],
  );

  return (
    <AppShell title="仓库管理中心" subtitle="支持仓库列表筛选、详情查看、批量启停与策略开关。">
      <section className="section">
        <h3>快捷入口</h3>
        <Link href="/admin">返回管理员总览</Link>
      </section>

      <section className="section">
        <h3>筛选与批量操作</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            placeholder="关键词（编码/名称/城市/国家）"
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
          />
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
            <option value="">全部状态</option>
            <option value="enabled">enabled</option>
            <option value="disabled">disabled</option>
          </select>
          <select value={filters.featureKey} onChange={(event) => setFilters((prev) => ({ ...prev, featureKey: event.target.value }))}>
            <option value="">全部策略</option>
            {featureCatalog.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <button onClick={() => void loadWarehouses(filters)}>筛选</button>
          <button
            onClick={() => {
              const next = { keyword: '', status: '', featureKey: '' };
              setFilters(next);
              void loadWarehouses(next);
            }}
          >
            清空
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span>已选 {selectedIds.length} 个仓库</span>
          <button onClick={() => void batchUpdateStatus('enabled')}>批量启用</button>
          <button onClick={() => void batchUpdateStatus('disabled')}>批量停用</button>
          {featureCatalog.map((key) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                checked={batchFeatures[key] ?? false}
                onChange={(event) =>
                  setBatchFeatures((prev) => ({
                    ...prev,
                    [key]: event.target.checked,
                  }))
                }
              />
              {key}
            </label>
          ))}
          <button onClick={() => void batchUpdateFeatures()}>批量更新策略</button>
        </div>
      </section>

      <section className="section">
        <h3>仓库列表</h3>
        <table className="table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedAll}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedIds(warehouses.map((item) => item.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <th>编码</th>
              <th>名称</th>
              <th>城市/国家</th>
              <th>状态</th>
              <th>策略开关</th>
              <th>账号数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((item) => {
              const featureMap = Object.fromEntries(item.features.map((f) => [f.featureKey, f.enabled]));
              return (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(event) => {
                        setSelectedIds((prev) =>
                          event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                        );
                      }}
                    />
                  </td>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>
                    {item.cityName ?? '-'} / {item.countryCode ?? '-'}
                  </td>
                  <td>{item.status}</td>
                  <td>
                    {featureCatalog
                      .map((key) => `${key}:${featureMap[key] ? 'on' : 'off'}`)
                      .join(' / ')}
                  </td>
                  <td>{item.users?.length ?? 0}</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => void openDetail(item.id)}>详情</button>
                    <button onClick={() => void updateWarehouseStatus(item.id, item.status === 'enabled' ? 'disabled' : 'enabled')}>
                      {item.status === 'enabled' ? '停用' : '启用'}
                    </button>
                    <button
                      onClick={() =>
                        void updateWarehouseFeatures(
                          item.id,
                          Object.fromEntries(featureCatalog.map((key) => [key, !featureMap[key]])),
                        )
                      }
                    >
                      反转策略
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {selectedDetail ? (
        <section className="section">
          <h3>仓库详情：{selectedDetail.name}</h3>
          <p>
            编码：{selectedDetail.code}，状态：{selectedDetail.status}，面积：{selectedDetail.areaSize ?? '-'}
          </p>
          <h4>最近账号</h4>
          <table className="table">
            <thead>
              <tr>
                <th>账号</th>
                <th>角色</th>
                <th>状态</th>
                <th>最后登录</th>
                <th>锁定至</th>
              </tr>
            </thead>
            <tbody>
              {selectedDetail.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.account}</td>
                  <td>{u.role}</td>
                  <td>{u.status}</td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</td>
                  <td>{u.lockedUntil ? new Date(u.lockedUntil).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>最近项目</h4>
          <table className="table">
            <thead>
              <tr>
                <th>项目名</th>
                <th>状态</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {selectedDetail.projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.projectName}</td>
                  <td>{p.status}</td>
                  <td>{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>最近财务记录</h4>
          <table className="table">
            <thead>
              <tr>
                <th>类型</th>
                <th>金额</th>
                <th>状态</th>
                <th>日期</th>
              </tr>
            </thead>
            <tbody>
              {selectedDetail.records.map((r) => (
                <tr key={r.id}>
                  <td>{r.recordType}</td>
                  <td>{Number(r.amount)}</td>
                  <td>{r.status}</td>
                  <td>{new Date(r.recordDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {message ? <p>{message}</p> : null}
    </AppShell>
  );
}
