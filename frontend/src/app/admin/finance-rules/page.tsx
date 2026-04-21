'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost, apiPut } from '@/lib/api';

type WarehouseOption = {
  id: string;
  name: string;
};

type FinanceRuleVersion = {
  id: string;
  versionName: string;
  isActive: boolean;
  effectiveStartAt: string;
  sharedExpenseRate: string | number;
  purchaseCostRate: string | number;
  includeAdjustmentsInSnapshot?: boolean;
  details?: FinanceRuleDetail[];
  createdAt: string;
};

type FinanceRuleDetail = {
  id?: string;
  targetType: 'expense' | 'purchase';
  method: 'fixed_ratio' | 'income_proportion';
  projectId?: string;
  ratioValue?: string | number;
  priority?: number;
  isEnabled?: boolean;
};

type FinanceRule = {
  id: string;
  ruleName: string;
  warehouseId: string;
  currentVersionId: string | null;
  versions: FinanceRuleVersion[];
};

type RuleCompareChange = {
  key: string;
  from: number;
  to: number;
};

type RuleDraftConfig = {
  sharedExpenseRate: string;
  purchaseCostRate: string;
  includeAdjustmentsInSnapshot: boolean;
  allocationDetails: FinanceRuleDetail[];
};

type RulePublishConfig = {
  versionName: string;
  effectiveStartAt: string;
};

export default function AdminFinanceRulesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; projectName: string; warehouseId: string }>>([]);
  const [financeRules, setFinanceRules] = useState<FinanceRule[]>([]);
  const [newRule, setNewRule] = useState({ warehouseId: '', ruleName: '', scopeType: 'warehouse' });
  const [ruleDraftConfigs, setRuleDraftConfigs] = useState<Record<string, RuleDraftConfig>>({});
  const [rulePublishConfigs, setRulePublishConfigs] = useState<Record<string, RulePublishConfig>>({});
  const [ruleCompareSelection, setRuleCompareSelection] = useState<
    Record<string, { fromVersionId: string; toVersionId: string }>
  >({});
  const [ruleCompareResult, setRuleCompareResult] = useState<Record<string, RuleCompareChange[]>>({});
  const [message, setMessage] = useState('');
  const ruleCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const versionRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const detailRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [focusNavIndex, setFocusNavIndex] = useState(0);
  const [focusParams, setFocusParams] = useState<{ ruleId: string; ruleVersionId: string; ruleDetailId: string }>({
    ruleId: '',
    ruleVersionId: '',
    ruleDetailId: '',
  });
  const focusRuleId = focusParams.ruleId;
  const focusRuleVersionId = focusParams.ruleVersionId;
  const focusRuleDetailId = focusParams.ruleDetailId;
  const hasFocusParams = Boolean(focusRuleId || focusRuleVersionId || focusRuleDetailId);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setFocusParams({
      ruleId: params.get('ruleId') ?? '',
      ruleVersionId: params.get('ruleVersionId') ?? '',
      ruleDetailId: params.get('ruleDetailId') ?? '',
    });
  }, []);

  const getFocusTargets = useCallback(() => {
    const targets: Array<{ key: string; label: string; element: Element }> = [];
    if (focusRuleDetailId && detailRowRefs.current[focusRuleDetailId]) {
      targets.push({
        key: `detail:${focusRuleDetailId}`,
        label: `明细 ${focusRuleDetailId}`,
        element: detailRowRefs.current[focusRuleDetailId] as Element,
      });
    }
    if (focusRuleVersionId && versionRowRefs.current[focusRuleVersionId]) {
      targets.push({
        key: `version:${focusRuleVersionId}`,
        label: `版本 ${focusRuleVersionId}`,
        element: versionRowRefs.current[focusRuleVersionId] as Element,
      });
    }
    if (focusRuleId && ruleCardRefs.current[focusRuleId]) {
      targets.push({
        key: `rule:${focusRuleId}`,
        label: `规则 ${focusRuleId}`,
        element: ruleCardRefs.current[focusRuleId] as Element,
      });
    }
    const seen = new Set<Element>();
    return targets.filter((item) => {
      if (seen.has(item.element)) return false;
      seen.add(item.element);
      return true;
    });
  }, [focusRuleDetailId, focusRuleVersionId, focusRuleId]);

  useEffect(() => {
    const targets = getFocusTargets();
    if (targets.length === 0) return;
    const targetIndex = Math.min(focusNavIndex, targets.length - 1);
    targets[targetIndex]?.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [getFocusTargets, financeRules, focusNavIndex]);

  useEffect(() => {
    setFocusNavIndex(0);
  }, [focusRuleDetailId, focusRuleVersionId, focusRuleId]);

  function gotoPrevFocusTarget() {
    const targets = getFocusTargets();
    if (targets.length <= 1) return;
    setFocusNavIndex((prev) => (prev - 1 + targets.length) % targets.length);
  }

  function gotoNextFocusTarget() {
    const targets = getFocusTargets();
    if (targets.length <= 1) return;
    setFocusNavIndex((prev) => (prev + 1) % targets.length);
  }

  function clearFocusParams() {
    setFocusParams({ ruleId: '', ruleVersionId: '', ruleDetailId: '' });
    setFocusNavIndex(0);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('ruleId');
      url.searchParams.delete('ruleVersionId');
      url.searchParams.delete('ruleDetailId');
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    }
  }

  const focusTargets = useMemo(() => getFocusTargets(), [getFocusTargets]);
  const currentFocusIndex = focusTargets.length === 0 ? 0 : Math.min(focusNavIndex, focusTargets.length - 1);
  const currentFocusTarget = focusTargets[currentFocusIndex];
  const currentFocusTypeLabel = currentFocusTarget
    ? currentFocusTarget.key.startsWith('detail:')
      ? '明细'
      : currentFocusTarget.key.startsWith('version:')
        ? '版本'
        : '规则'
    : '-';
  const currentFocusId = currentFocusTarget?.key.includes(':') ? currentFocusTarget.key.split(':')[1] : '';

  async function copyCurrentFocusId() {
    if (!currentFocusId) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentFocusId);
      } else {
        const input = document.createElement('input');
        input.value = currentFocusId;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setMessage(`已复制当前命中ID：${currentFocusId}`);
    } catch {
      setMessage('复制失败，请手动复制当前命中ID。');
    }
  }

  async function copyFocusLink() {
    if (!hasFocusParams || typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (focusRuleId) url.searchParams.set('ruleId', focusRuleId);
      else url.searchParams.delete('ruleId');
      if (focusRuleVersionId) url.searchParams.set('ruleVersionId', focusRuleVersionId);
      else url.searchParams.delete('ruleVersionId');
      if (focusRuleDetailId) url.searchParams.set('ruleDetailId', focusRuleDetailId);
      else url.searchParams.delete('ruleDetailId');
      const link = url.toString();

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement('input');
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setMessage('已复制完整定位链接。');
    } catch {
      setMessage('复制定位链接失败，请手动复制地址栏链接。');
    }
  }

  async function load() {
    try {
      const [warehousesRes, financeRulesRes, projectsRes] = await Promise.all([
        apiGet<WarehouseOption[]>('/admin/warehouses'),
        apiGet<FinanceRule[]>('/finance/rules'),
        apiGet<Array<{ id: string; projectName: string; warehouseId: string }>>('/finance/projects'),
      ]);
      setWarehouses(warehousesRes.data.map((item) => ({ id: item.id, name: item.name })));
      setFinanceRules(financeRulesRes.data);
      setProjects(projectsRes.data);
      setRuleDraftConfigs((prev) => {
        const next = { ...prev };
        for (const rule of financeRulesRes.data) {
          const latest = rule.versions[0];
          if (!next[rule.id]) {
            next[rule.id] = {
              sharedExpenseRate: String(Number(latest?.sharedExpenseRate ?? 1)),
              purchaseCostRate: String(Number(latest?.purchaseCostRate ?? 1)),
              includeAdjustmentsInSnapshot: Boolean(latest?.includeAdjustmentsInSnapshot ?? false),
              allocationDetails: (latest?.details ?? []).map((item, index) => ({
                id: item.id,
                targetType: item.targetType,
                method: item.method,
                projectId: item.projectId ?? undefined,
                ratioValue: String(Number(item.ratioValue ?? 0)),
                priority: item.priority ?? index + 1,
                isEnabled: item.isEnabled ?? true,
              })),
            };
          }
        }
        return next;
      });
      setRulePublishConfigs((prev) => {
        const next = { ...prev };
        for (const rule of financeRulesRes.data) {
          if (!next[rule.id]) {
            next[rule.id] = {
              versionName: `v${rule.versions.length + 1}.0`,
              effectiveStartAt: '',
            };
          }
        }
        return next;
      });
    } catch {
      setMessage('请先登录管理员账号。');
      setWarehouses([]);
      setFinanceRules([]);
      setProjects([]);
    }
  }

  async function createFinanceRule() {
    if (!newRule.ruleName.trim()) {
      setMessage('请先填写规则名称。');
      return;
    }
    if (!newRule.warehouseId) {
      setMessage('请先选择仓库。');
      return;
    }
    await apiPost('/finance/rules', {
      warehouseId: newRule.warehouseId,
      ruleName: newRule.ruleName.trim(),
      scopeType: newRule.scopeType,
    });
    setMessage('财务规则已创建。');
    setNewRule({ warehouseId: '', ruleName: '', scopeType: 'warehouse' });
    await load();
  }

  async function saveFinanceRuleConfig(ruleId: string) {
    const cfg = ruleDraftConfigs[ruleId];
    if (!cfg) return;
    const sharedExpenseRate = Number(cfg.sharedExpenseRate);
    const purchaseCostRate = Number(cfg.purchaseCostRate);
    if (Number.isNaN(sharedExpenseRate) || Number.isNaN(purchaseCostRate)) {
      setMessage('请输入合法的规则系数。');
      return;
    }
    if (sharedExpenseRate < 0 || sharedExpenseRate > 5 || purchaseCostRate < 0 || purchaseCostRate > 5) {
      setMessage('规则系数范围需在 0 到 5 之间。');
      return;
    }
    await apiPut(`/finance/rules/${ruleId}/config`, {
      sharedExpenseRate,
      purchaseCostRate,
      includeAdjustmentsInSnapshot: cfg.includeAdjustmentsInSnapshot,
      allocationDetails: cfg.allocationDetails
        .filter((item) => item.isEnabled !== false)
        .map((item, index) => ({
          targetType: item.targetType,
          method: item.method,
          projectId: item.projectId || undefined,
          ratioValue: item.method === 'fixed_ratio' ? Number(item.ratioValue ?? 0) : undefined,
          priority: item.priority ?? index + 1,
          isEnabled: item.isEnabled ?? true,
        })),
    });
    setMessage('财务规则草稿已保存。');
    await load();
  }

  async function publishFinanceRule(ruleId: string) {
    const cfg = rulePublishConfigs[ruleId];
    if (!cfg) return;
    const versionName = cfg.versionName.trim();
    if (!versionName) {
      setMessage('请填写发布版本号。');
      return;
    }
    if (!/^v\d+(\.\d+){0,2}$/i.test(versionName)) {
      setMessage('版本号格式建议为 v2 / v2.0 / v2.0.1。');
      return;
    }
    if (!cfg.effectiveStartAt) {
      setMessage('请选择生效时间。');
      return;
    }
    const effectiveAt = new Date(cfg.effectiveStartAt);
    if (Number.isNaN(effectiveAt.getTime())) {
      setMessage('生效时间格式不合法。');
      return;
    }
    if (effectiveAt.getTime() < Date.now() - 60_000) {
      setMessage('生效时间不能早于当前时间。');
      return;
    }
    const targetRule = financeRules.find((item) => item.id === ruleId);
    if (targetRule?.versions.some((item) => item.versionName.toLowerCase() === versionName.toLowerCase())) {
      setMessage('该版本号已存在，请更换。');
      return;
    }
    await apiPost(`/finance/rules/${ruleId}/publish`, {
      versionName,
      effectiveStartAt: effectiveAt.toISOString(),
    });
    setMessage('财务规则已发布。');
    await load();
  }

  async function compareFinanceRule(rule: FinanceRule) {
    const selected = ruleCompareSelection[rule.id];
    if (!selected?.fromVersionId || !selected?.toVersionId) {
      setMessage('请先选择要对比的两个版本。');
      return;
    }
    const query = new URLSearchParams({
      fromVersionId: selected.fromVersionId,
      toVersionId: selected.toVersionId,
    }).toString();
    const res = await apiGet<{ fromVersionId: string; toVersionId: string; changes: RuleCompareChange[] }>(
      `/finance/rules/${rule.id}/versions/compare?${query}`,
    );
    setRuleCompareResult((prev) => ({
      ...prev,
      [rule.id]: res.data.changes,
    }));
  }

  async function rollbackFinanceRule(ruleId: string, targetVersionId: string) {
    if (!window.confirm('确认回滚到该版本吗？当前生效版本将被替换。')) return;
    await apiPost(`/finance/rules/${ruleId}/versions/${targetVersionId}/rollback`);
    setMessage('财务规则已回滚到目标版本。');
    await load();
  }

  function copyVersionAsDraft(ruleId: string, version: FinanceRuleVersion) {
    setRuleDraftConfigs((prev) => ({
      ...prev,
      [ruleId]: {
        sharedExpenseRate: String(Number(version.sharedExpenseRate)),
        purchaseCostRate: String(Number(version.purchaseCostRate)),
        includeAdjustmentsInSnapshot: Boolean(version.includeAdjustmentsInSnapshot ?? false),
        allocationDetails: (version.details ?? []).map((item, index) => ({
          id: item.id,
          targetType: item.targetType,
          method: item.method,
          projectId: item.projectId ?? undefined,
          ratioValue: String(Number(item.ratioValue ?? 0)),
          priority: item.priority ?? index + 1,
          isEnabled: item.isEnabled ?? true,
        })),
      },
    }));
    setRulePublishConfigs((prev) => ({
      ...prev,
      [ruleId]: {
        versionName: `${version.versionName}-copy`,
        effectiveStartAt: '',
      },
    }));
    setMessage('已将该版本参数复制到草稿编辑区。');
  }

  return (
    <AppShell title="财务规则中心" subtitle="集中完成规则创建、草稿、发布、对比与回滚。">
      <section className="section">
        <h3>快捷入口</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/admin">返回管理员总览</Link>
        </div>
      </section>

      <section className="section">
        <h3>创建新规则</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={newRule.warehouseId}
            onChange={(event) => setNewRule((prev) => ({ ...prev, warehouseId: event.target.value }))}
          >
            <option value="">选择仓库</option>
            {warehouses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            placeholder="新规则名称"
            value={newRule.ruleName}
            onChange={(event) => setNewRule((prev) => ({ ...prev, ruleName: event.target.value }))}
          />
          <button onClick={() => void createFinanceRule()}>创建规则</button>
        </div>
      </section>

      <section className="section">
        <h3>规则列表与版本治理</h3>
        {hasFocusParams ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <p style={{ margin: 0 }}>
              已定位来源：明细 `{focusRuleDetailId || '-'}` / 版本 `{focusRuleVersionId || '-'}` / 规则 `{focusRuleId || '-'}`。
            </p>
            <span>
              当前命中：{focusTargets.length === 0 ? '0/0' : `${currentFocusIndex + 1}/${focusTargets.length}`}（{currentFocusTypeLabel}）
            </span>
            <button onClick={gotoPrevFocusTarget}>上一个命中</button>
            <button onClick={gotoNextFocusTarget}>下一个命中</button>
            <button onClick={() => void copyCurrentFocusId()} disabled={!currentFocusId}>
              复制当前命中ID
            </button>
            <button onClick={() => void copyFocusLink()} disabled={!hasFocusParams}>
              复制完整定位链接
            </button>
            <button onClick={clearFocusParams}>清除定位参数</button>
          </div>
        ) : null}
        {financeRules.map((rule) => {
          const selected = ruleCompareSelection[rule.id] ?? { fromVersionId: '', toVersionId: '' };
          const changes = ruleCompareResult[rule.id] ?? [];
          const draftCfg = ruleDraftConfigs[rule.id] ?? {
            sharedExpenseRate: '1',
            purchaseCostRate: '1',
            includeAdjustmentsInSnapshot: false,
            allocationDetails: [],
          };
          const projectOptions = projects.filter((item) => item.warehouseId === rule.warehouseId);
          const publishCfg = rulePublishConfigs[rule.id] ?? { versionName: '', effectiveStartAt: '' };
          const matchedByRuleId = focusRuleId ? rule.id === focusRuleId : false;
          const matchedByDetailId = focusRuleDetailId
            ? rule.versions.some((version) => (version.details ?? []).some((detail) => detail.id === focusRuleDetailId))
            : false;
          const matchedByVersionId = focusRuleVersionId ? rule.versions.some((version) => version.id === focusRuleVersionId) : false;
          const isFocusedRule = matchedByRuleId || matchedByDetailId || matchedByVersionId;
          return (
            <div
              key={rule.id}
              ref={(node) => {
                ruleCardRefs.current[rule.id] = node;
              }}
              style={{
                border: isFocusedRule ? '2px solid #f59e0b' : '1px solid #ddd',
                background: isFocusedRule ? 'rgba(245, 158, 11, 0.08)' : undefined,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <p>
                <strong>{rule.ruleName}</strong>（规则ID: {rule.id}）
                {isFocusedRule ? ' <- 异常来源命中' : ''}
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                <span>共享成本系数</span>
                <input
                  style={{ width: 100 }}
                  value={draftCfg.sharedExpenseRate}
                  onChange={(event) =>
                    setRuleDraftConfigs((prev) => ({
                      ...prev,
                      [rule.id]: { ...draftCfg, sharedExpenseRate: event.target.value },
                    }))
                  }
                />
                <span>采购成本系数</span>
                <input
                  style={{ width: 100 }}
                  value={draftCfg.purchaseCostRate}
                  onChange={(event) =>
                    setRuleDraftConfigs((prev) => ({
                      ...prev,
                      [rule.id]: { ...draftCfg, purchaseCostRate: event.target.value },
                    }))
                  }
                />
                <button onClick={() => void saveFinanceRuleConfig(rule.id)}>保存草稿</button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={draftCfg.includeAdjustmentsInSnapshot}
                    onChange={(event) =>
                      setRuleDraftConfigs((prev) => ({
                        ...prev,
                        [rule.id]: { ...draftCfg, includeAdjustmentsInSnapshot: event.target.checked },
                      }))
                    }
                  />
                  纳入审批调整项重算
                </label>
                <button
                  onClick={() =>
                    setRuleDraftConfigs((prev) => ({
                      ...prev,
                      [rule.id]: {
                        ...draftCfg,
                        allocationDetails: [
                          ...draftCfg.allocationDetails,
                          {
                            targetType: 'expense',
                            method: 'fixed_ratio',
                            projectId: projectOptions[0]?.id,
                            ratioValue: '0.1',
                            priority: draftCfg.allocationDetails.length + 1,
                            isEnabled: true,
                          },
                        ],
                      },
                    }))
                  }
                >
                  +固定比例分摊行
                </button>
                <button
                  onClick={() =>
                    setRuleDraftConfigs((prev) => ({
                      ...prev,
                      [rule.id]: {
                        ...draftCfg,
                        allocationDetails: [
                          ...draftCfg.allocationDetails,
                          {
                            targetType: 'expense',
                            method: 'income_proportion',
                            priority: draftCfg.allocationDetails.length + 1,
                            isEnabled: true,
                          },
                        ],
                      },
                    }))
                  }
                >
                  +按收入占比分摊行
                </button>
              </div>
              {draftCfg.allocationDetails.length > 0 ? (
                <table className="table" style={{ marginBottom: 8 }}>
                  <thead>
                    <tr>
                      <th>目标池</th>
                      <th>方法</th>
                      <th>项目</th>
                      <th>比例</th>
                      <th>优先级</th>
                      <th>启用</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftCfg.allocationDetails.map((detail, idx) => (
                      <tr
                        key={`${rule.id}-detail-${idx}`}
                        ref={(node) => {
                          if (detail.id) detailRowRefs.current[detail.id] = node;
                        }}
                        style={detail.id && focusRuleDetailId && detail.id === focusRuleDetailId ? { background: 'rgba(250, 204, 21, 0.2)' } : undefined}
                      >
                        <td>
                          <select
                            value={detail.targetType}
                            onChange={(event) =>
                              setRuleDraftConfigs((prev) => {
                                const next = [...draftCfg.allocationDetails];
                                next[idx] = { ...detail, targetType: event.target.value as 'expense' | 'purchase' };
                                return { ...prev, [rule.id]: { ...draftCfg, allocationDetails: next } };
                              })
                            }
                          >
                            <option value="expense">expense</option>
                            <option value="purchase">purchase</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={detail.method}
                            onChange={(event) =>
                              setRuleDraftConfigs((prev) => {
                                const next = [...draftCfg.allocationDetails];
                                next[idx] = {
                                  ...detail,
                                  method: event.target.value as 'fixed_ratio' | 'income_proportion',
                                };
                                return { ...prev, [rule.id]: { ...draftCfg, allocationDetails: next } };
                              })
                            }
                          >
                            <option value="fixed_ratio">fixed_ratio</option>
                            <option value="income_proportion">income_proportion</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={detail.projectId ?? ''}
                            disabled={detail.method !== 'fixed_ratio'}
                            onChange={(event) =>
                              setRuleDraftConfigs((prev) => {
                                const next = [...draftCfg.allocationDetails];
                                next[idx] = { ...detail, projectId: event.target.value || undefined };
                                return { ...prev, [rule.id]: { ...draftCfg, allocationDetails: next } };
                              })
                            }
                          >
                            <option value="">未指定</option>
                            {projectOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.projectName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            style={{ width: 100 }}
                            value={String(detail.ratioValue ?? '')}
                            disabled={detail.method !== 'fixed_ratio'}
                            onChange={(event) =>
                              setRuleDraftConfigs((prev) => {
                                const next = [...draftCfg.allocationDetails];
                                next[idx] = { ...detail, ratioValue: event.target.value };
                                return { ...prev, [rule.id]: { ...draftCfg, allocationDetails: next } };
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            style={{ width: 80 }}
                            type="number"
                            value={detail.priority ?? idx + 1}
                            onChange={(event) =>
                              setRuleDraftConfigs((prev) => {
                                const next = [...draftCfg.allocationDetails];
                                next[idx] = { ...detail, priority: Number(event.target.value) };
                                return { ...prev, [rule.id]: { ...draftCfg, allocationDetails: next } };
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={detail.isEnabled !== false}
                            onChange={(event) =>
                              setRuleDraftConfigs((prev) => {
                                const next = [...draftCfg.allocationDetails];
                                next[idx] = { ...detail, isEnabled: event.target.checked };
                                return { ...prev, [rule.id]: { ...draftCfg, allocationDetails: next } };
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            onClick={() =>
                              setRuleDraftConfigs((prev) => ({
                                ...prev,
                                [rule.id]: {
                                  ...draftCfg,
                                  allocationDetails: draftCfg.allocationDetails.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                <input
                  placeholder="版本号，如 v2.0"
                  value={publishCfg.versionName}
                  onChange={(event) =>
                    setRulePublishConfigs((prev) => ({
                      ...prev,
                      [rule.id]: { ...publishCfg, versionName: event.target.value },
                    }))
                  }
                />
                <input
                  type="datetime-local"
                  value={publishCfg.effectiveStartAt}
                  onChange={(event) =>
                    setRulePublishConfigs((prev) => ({
                      ...prev,
                      [rule.id]: { ...publishCfg, effectiveStartAt: event.target.value },
                    }))
                  }
                />
                <button onClick={() => void publishFinanceRule(rule.id)}>发布版本</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selected.fromVersionId}
                  onChange={(event) =>
                    setRuleCompareSelection((prev) => ({
                      ...prev,
                      [rule.id]: {
                        ...selected,
                        fromVersionId: event.target.value,
                      },
                    }))
                  }
                >
                  <option value="">选择对比起始版本</option>
                  {rule.versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.versionName}
                    </option>
                  ))}
                </select>
                <select
                  value={selected.toVersionId}
                  onChange={(event) =>
                    setRuleCompareSelection((prev) => ({
                      ...prev,
                      [rule.id]: {
                        ...selected,
                        toVersionId: event.target.value,
                      },
                    }))
                  }
                >
                  <option value="">选择对比目标版本</option>
                  {rule.versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.versionName}
                    </option>
                  ))}
                </select>
                <button onClick={() => void compareFinanceRule(rule)}>版本差异对比</button>
                {rule.versions[0] ? (
                  <button onClick={() => copyVersionAsDraft(rule.id, rule.versions[0])}>复制最新版本为草稿</button>
                ) : null}
              </div>
              {changes.length > 0 ? (
                <ul>
                  {changes.map((item) => (
                    <li key={`${rule.id}-${item.key}`}>
                      {item.key}: {item.from} {'->'} {item.to}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ marginTop: 8 }}>暂无差异结果</p>
              )}
              <table className="table">
                <thead>
                  <tr>
                    <th>版本</th>
                    <th>生效时间</th>
                    <th>共享成本系数</th>
                    <th>采购成本系数</th>
                    <th>纳入调整项</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rule.versions.map((version) => (
                    <tr
                      key={version.id}
                      ref={(node) => {
                        versionRowRefs.current[version.id] = node;
                      }}
                      style={
                        (focusRuleVersionId && version.id === focusRuleVersionId) ||
                        (focusRuleDetailId && (version.details ?? []).some((detail) => detail.id === focusRuleDetailId))
                          ? { background: 'rgba(250, 204, 21, 0.2)' }
                          : undefined
                      }
                    >
                      <td>{version.versionName}</td>
                      <td>{new Date(version.effectiveStartAt).toLocaleString()}</td>
                      <td>{Number(version.sharedExpenseRate)}</td>
                      <td>{Number(version.purchaseCostRate)}</td>
                      <td>{version.includeAdjustmentsInSnapshot ? '是' : '否'}</td>
                      <td>{version.isActive ? '生效中' : '未生效'}</td>
                      <td>
                        <button onClick={() => copyVersionAsDraft(rule.id, version)} style={{ marginRight: 8 }}>
                          复制为草稿
                        </button>
                        <button onClick={() => void rollbackFinanceRule(rule.id, version.id)} disabled={version.isActive}>
                          回滚到该版本
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {message ? <p>{message}</p> : null}
      </section>
    </AppShell>
  );
}
