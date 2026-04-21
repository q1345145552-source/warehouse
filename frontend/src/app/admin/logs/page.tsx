'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';

type OperationLog = {
  id: string;
  module: string;
  action: string;
  operator: string;
  payload: string | null;
  createdAt: string;
};

type LogsMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

type LogsFilters = {
  module: string;
  action: string;
  operator: string;
  keyword: string;
  warehouseId: string;
  userId: string;
  startAt: string;
  endAt: string;
};

type LogOptions = {
  modules: string[];
  actions: string[];
};

type LogsSummary = {
  total: number;
  modules: Array<{ module: string; count: number }>;
  actions: Array<{ module: string; action: string; count: number }>;
};

const emptyLogsMeta: LogsMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  pageCount: 0,
};

const emptyLogsFilters: LogsFilters = {
  module: '',
  action: '',
  operator: '',
  keyword: '',
  warehouseId: '',
  userId: '',
  startAt: '',
  endAt: '',
};

const logsPageSize = 20;
const logsFiltersStorageKey = 'wm_admin_logs_filters';
const emptyLogsSummary: LogsSummary = {
  total: 0,
  modules: [],
  actions: [],
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [logsMeta, setLogsMeta] = useState<LogsMeta>(emptyLogsMeta);
  const [logsFilters, setLogsFilters] = useState<LogsFilters>(emptyLogsFilters);
  const [logOptions, setLogOptions] = useState<LogOptions>({ modules: [], actions: [] });
  const [logsSummary, setLogsSummary] = useState<LogsSummary>(emptyLogsSummary);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);
  const [message, setMessage] = useState('');

  function buildLogsQuery(page: number, filters: LogsFilters) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(logsPageSize));
    if (filters.module) params.set('module', filters.module);
    if (filters.action) params.set('action', filters.action);
    if (filters.operator) params.set('operator', filters.operator);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.warehouseId) params.set('warehouseId', filters.warehouseId);
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.startAt) params.set('startAt', new Date(filters.startAt).toISOString());
    if (filters.endAt) params.set('endAt', new Date(filters.endAt).toISOString());
    return params.toString();
  }

  const loadLogs = useCallback(async (page: number, filters: LogsFilters) => {
    try {
      const query = buildLogsQuery(page, filters);
      const res = await apiGet<OperationLog[], LogsMeta>(`/admin/logs?${query}`);
      setLogs(res.data);
      setLogsMeta(res.meta ?? emptyLogsMeta);
    } catch {
      setLogs([]);
      setLogsMeta(emptyLogsMeta);
      setMessage('日志加载失败，请确认管理员权限或后端服务状态。');
    }
  }, []);

  const loadLogOptions = useCallback(async (module?: string) => {
    try {
      const query = module ? `?module=${encodeURIComponent(module)}` : '';
      const res = await apiGet<LogOptions>(`/admin/logs/options${query}`);
      setLogOptions(res.data);
    } catch {
      setLogOptions({ modules: [], actions: [] });
    }
  }, []);

  const loadLogsSummary = useCallback(async (filters: LogsFilters) => {
    try {
      const query = buildLogsQuery(1, filters);
      const res = await apiGet<LogsSummary>(`/admin/logs/summary?${query}`);
      setLogsSummary(res.data);
    } catch {
      setLogsSummary(emptyLogsSummary);
    }
  }, []);

  useEffect(() => {
    const savedFilters = (() => {
      if (typeof window === 'undefined') return emptyLogsFilters;
      const raw = localStorage.getItem(logsFiltersStorageKey);
      if (!raw) return emptyLogsFilters;
      try {
        return { ...emptyLogsFilters, ...(JSON.parse(raw) as Partial<LogsFilters>) };
      } catch {
        return emptyLogsFilters;
      }
    })();
    setLogsFilters(savedFilters);
    void loadLogs(1, savedFilters);
    void loadLogsSummary(savedFilters);
    void loadLogOptions(savedFilters.module || undefined);
  }, [loadLogs, loadLogsSummary, loadLogOptions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(logsFiltersStorageKey, JSON.stringify(logsFilters));
  }, [logsFilters]);

  async function exportLogsCsv() {
    const params = new URLSearchParams();
    if (logsFilters.module) params.set('module', logsFilters.module);
    if (logsFilters.action) params.set('action', logsFilters.action);
    if (logsFilters.operator) params.set('operator', logsFilters.operator);
    if (logsFilters.keyword) params.set('keyword', logsFilters.keyword);
    if (logsFilters.warehouseId) params.set('warehouseId', logsFilters.warehouseId);
    if (logsFilters.userId) params.set('userId', logsFilters.userId);
    if (logsFilters.startAt) params.set('startAt', new Date(logsFilters.startAt).toISOString());
    if (logsFilters.endAt) params.set('endAt', new Date(logsFilters.endAt).toISOString());

    const res = await apiGet<{ filename: string; csv: string }>(`/admin/logs/export?${params.toString()}`);
    const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = res.data.filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function exportLogsSummaryCsv() {
    const params = new URLSearchParams();
    if (logsFilters.module) params.set('module', logsFilters.module);
    if (logsFilters.action) params.set('action', logsFilters.action);
    if (logsFilters.operator) params.set('operator', logsFilters.operator);
    if (logsFilters.keyword) params.set('keyword', logsFilters.keyword);
    if (logsFilters.warehouseId) params.set('warehouseId', logsFilters.warehouseId);
    if (logsFilters.userId) params.set('userId', logsFilters.userId);
    if (logsFilters.startAt) params.set('startAt', new Date(logsFilters.startAt).toISOString());
    if (logsFilters.endAt) params.set('endAt', new Date(logsFilters.endAt).toISOString());

    const res = await apiGet<{ filename: string; csv: string }>(`/admin/logs/summary/export?${params.toString()}`);
    const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = res.data.filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function openLogDetail(id: string) {
    const res = await apiGet<OperationLog>(`/admin/logs/${id}`);
    setSelectedLog(res.data);
  }

  async function copyLogPayload() {
    if (!selectedLogPayload || selectedLogPayload === '—') return;
    try {
      await navigator.clipboard.writeText(selectedLogPayload);
      setMessage('日志负载已复制。');
    } catch {
      setMessage('复制失败，请手动复制。');
    }
  }

  function applyQuickDateRange(type: 'today' | 'last7' | 'last30') {
    const now = new Date();
    const start = new Date(now);
    if (type === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (type === 'last7') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setDate(start.getDate() - 30);
    }

    const toLocalInput = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const nextFilters = {
      ...logsFilters,
      startAt: toLocalInput(start),
      endAt: toLocalInput(now),
    };
    setLogsFilters(nextFilters);
    void loadLogs(1, nextFilters);
    void loadLogsSummary(nextFilters);
  }

  const selectedLogPayload = (() => {
    if (!selectedLog?.payload) return '—';
    try {
      return JSON.stringify(JSON.parse(selectedLog.payload), null, 2);
    } catch {
      return selectedLog.payload;
    }
  })();

  const selectedLogPayloadJson = (() => {
    if (!selectedLog?.payload) return null;
    try {
      return JSON.parse(selectedLog.payload) as unknown;
    } catch {
      return null;
    }
  })();

  const selectedLogHighlights = (() => {
    if (!selectedLogPayloadJson || typeof selectedLogPayloadJson !== 'object') return null;
    const payload = selectedLogPayloadJson as Record<string, unknown>;
    const warehouseId = payload.warehouseId ?? payload.wid ?? null;
    const userId = payload.userId ?? payload.uid ?? null;
    return {
      action: selectedLog?.action ?? null,
      warehouseId: warehouseId ? String(warehouseId) : null,
      userId: userId ? String(userId) : null,
    };
  })();

  return (
    <AppShell title="日志中心" subtitle="集中查看、筛选、导出系统审计日志。">
      <section className="section">
        <h3>快捷入口</h3>
        <Link href="/admin">返回管理员总览</Link>
      </section>

      <section className="section">
        <h3>系统日志中心</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            type="text"
            placeholder="操作人"
            value={logsFilters.operator}
            onChange={(event) => setLogsFilters((prev) => ({ ...prev, operator: event.target.value }))}
          />
          <select
            value={logsFilters.module}
            onChange={(event) => {
              const moduleName = event.target.value;
              setLogsFilters((prev) => ({ ...prev, module: moduleName, action: '' }));
              void loadLogOptions(moduleName || undefined);
            }}
          >
            <option value="">全部模块</option>
            {logOptions.modules.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={logsFilters.action}
            onChange={(event) => setLogsFilters((prev) => ({ ...prev, action: event.target.value }))}
          >
            <option value="">全部动作</option>
            {logOptions.actions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            placeholder="关键词"
            value={logsFilters.keyword}
            onChange={(event) => setLogsFilters((prev) => ({ ...prev, keyword: event.target.value }))}
          />
          <input
            placeholder="仓库ID"
            value={logsFilters.warehouseId}
            onChange={(event) => setLogsFilters((prev) => ({ ...prev, warehouseId: event.target.value }))}
          />
          <input
            placeholder="用户ID"
            value={logsFilters.userId}
            onChange={(event) => setLogsFilters((prev) => ({ ...prev, userId: event.target.value }))}
          />
          <input
            type="datetime-local"
            value={logsFilters.startAt}
            onChange={(event) => setLogsFilters((prev) => ({ ...prev, startAt: event.target.value }))}
          />
          <input
            type="datetime-local"
            value={logsFilters.endAt}
            onChange={(event) => setLogsFilters((prev) => ({ ...prev, endAt: event.target.value }))}
          />
          <button
            onClick={() => {
              void loadLogs(1, logsFilters);
              void loadLogsSummary(logsFilters);
            }}
          >
            筛选
          </button>
          <button onClick={() => applyQuickDateRange('today')}>今天</button>
          <button onClick={() => applyQuickDateRange('last7')}>近7天</button>
          <button onClick={() => applyQuickDateRange('last30')}>近30天</button>
          <button onClick={() => void exportLogsCsv()}>导出 CSV</button>
          <button onClick={() => void exportLogsSummaryCsv()}>导出汇总 CSV</button>
          <button
            onClick={() => {
              setLogsFilters(emptyLogsFilters);
              void loadLogOptions();
              void loadLogs(1, emptyLogsFilters);
              void loadLogsSummary(emptyLogsFilters);
            }}
          >
            清空筛选
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
          <span>总日志数：{logsSummary.total}</span>
          <span>
            Top 模块：
            {logsSummary.modules.slice(0, 3).map((item) => `${item.module}(${item.count})`).join(' / ') || '—'}
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>模块</th>
              <th>动作</th>
              <th>操作人</th>
              <th>负载</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.module}</td>
                <td>{log.action}</td>
                <td>{log.operator}</td>
                <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.payload ?? '—'}
                </td>
                <td>
                  <button onClick={() => void openLogDetail(log.id)}>详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => void loadLogs(Math.max(1, logsMeta.page - 1), logsFilters)} disabled={logsMeta.page <= 1}>
            上一页
          </button>
          <span>
            第 {logsMeta.page} / {Math.max(logsMeta.pageCount, 1)} 页，共 {logsMeta.total} 条
          </span>
          <button
            onClick={() => void loadLogs(Math.min(logsMeta.page + 1, Math.max(logsMeta.pageCount, 1)), logsFilters)}
            disabled={logsMeta.page >= logsMeta.pageCount}
          >
            下一页
          </button>
        </div>
        {selectedLog ? (
          <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>日志详情</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => void copyLogPayload()}>复制负载</button>
                <button onClick={() => setSelectedLog(null)}>关闭</button>
              </div>
            </div>
            <p style={{ marginTop: 8 }}>
              {selectedLog.module} / {selectedLog.action} / {selectedLog.operator} / {new Date(selectedLog.createdAt).toLocaleString()}
            </p>
            {selectedLogHighlights ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ background: '#eef2ff', padding: '2px 8px', borderRadius: 12 }}>
                  action: {selectedLogHighlights.action ?? '—'}
                </span>
                <span style={{ background: '#ecfeff', padding: '2px 8px', borderRadius: 12 }}>
                  warehouseId: {selectedLogHighlights.warehouseId ?? '—'}
                </span>
                <span style={{ background: '#f0fdf4', padding: '2px 8px', borderRadius: 12 }}>
                  userId: {selectedLogHighlights.userId ?? '—'}
                </span>
              </div>
            ) : null}
            <pre
              style={{
                background: '#f7f7f7',
                padding: 12,
                borderRadius: 6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {selectedLogPayload}
            </pre>
            {selectedLogPayloadJson ? (
              <details style={{ marginTop: 8 }}>
                <summary>JSON 结构视图</summary>
                <pre
                  style={{
                    marginTop: 8,
                    background: '#f7f7f7',
                    padding: 12,
                    borderRadius: 6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(selectedLogPayloadJson, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
