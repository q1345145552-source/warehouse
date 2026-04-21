'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { apiGet, apiPost, apiPut } from '@/lib/api';

type KpiResult = {
  id: string;
  totalScore: number;
  grade: string;
  cycleType: string;
};

type MetricScore = {
  id: string;
  metricCode: string;
  scoreCeiling: number;
  actualScore: number;
};

type AnalysisItem = {
  id: string;
  analysisType: string;
  content: string;
  riskLevel?: string;
};

type KpiRuleVersion = {
  id: string;
  versionName: string;
  isActive: boolean;
  businessCeiling: number;
  businessDivisor: number;
  errorCeiling: number;
  errorPenalty: number;
  efficiencyCeiling: number;
  efficiencyDivisor: number;
  loadCeiling: number;
  loadMultiplier: number;
  excellentMin: number;
  goodMin: number;
  passMin: number;
  improveMin: number;
};

type KpiRule = {
  id: string;
  warehouseId: string;
  ruleName: string;
  versions: KpiRuleVersion[];
};

type KpiRuleTemplate = {
  key: string;
  name: string;
  description: string;
  config: {
    businessCeiling: number;
    businessDivisor: number;
    errorCeiling: number;
    errorPenalty: number;
    efficiencyCeiling: number;
    efficiencyDivisor: number;
    loadCeiling: number;
    loadMultiplier: number;
    excellentMin: number;
    goodMin: number;
    passMin: number;
    improveMin: number;
  };
};

const defaultConfig = {
  businessCeiling: 35,
  businessDivisor: 10,
  errorCeiling: 30,
  errorPenalty: 1,
  efficiencyCeiling: 20,
  efficiencyDivisor: 1,
  loadCeiling: 15,
  loadMultiplier: 10,
  excellentMin: 90,
  goodMin: 80,
  passMin: 70,
  improveMin: 60,
};

export default function KpiPage() {
  const [results, setResults] = useState<KpiResult[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [rule, setRule] = useState<KpiRule | null>(null);
  const [config, setConfig] = useState(defaultConfig);
  const [selectedResultId, setSelectedResultId] = useState('');
  const [metricScores, setMetricScores] = useState<MetricScore[]>([]);
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [templates, setTemplates] = useState<KpiRuleTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    await Promise.all([loadResults(), loadRules(), loadTemplates()]);
  }

  async function loadResults() {
    try {
      const response = await apiGet<KpiResult[]>('/kpi/results');
      setResults(response.data);
    } catch {
      setResults([]);
      setMessage('暂时无法连接后端，当前显示空数据。');
    }
  }

  async function loadRules() {
    try {
      const response = await apiGet<KpiRule[]>('/kpi/rules');
      const first = response.data[0] ?? null;
      setRule(first);
      const active = first?.versions.find((v) => v.isActive) ?? first?.versions[0];
      if (active) {
        setConfig({
          businessCeiling: Number(active.businessCeiling),
          businessDivisor: Number(active.businessDivisor),
          errorCeiling: Number(active.errorCeiling),
          errorPenalty: Number(active.errorPenalty),
          efficiencyCeiling: Number(active.efficiencyCeiling),
          efficiencyDivisor: Number(active.efficiencyDivisor),
          loadCeiling: Number(active.loadCeiling),
          loadMultiplier: Number(active.loadMultiplier),
          excellentMin: Number(active.excellentMin),
          goodMin: Number(active.goodMin),
          passMin: Number(active.passMin),
          improveMin: Number(active.improveMin),
        });
      }
    } catch {
      setRule(null);
    }
  }

  async function loadTemplates() {
    try {
      const response = await apiGet<KpiRuleTemplate[]>('/kpi/rule-templates');
      setTemplates(response.data);
      if (response.data[0] && !selectedTemplateKey) {
        setSelectedTemplateKey(response.data[0].key);
      }
    } catch {
      setTemplates([]);
    }
  }

  async function ensureRule() {
    if (rule) return rule;
    const created = await apiPost<KpiRule, { ruleName: string; scopeType: string }>('/kpi/rules', {
      ruleName: '默认KPI规则',
      scopeType: 'warehouse',
    });
    setRule(created.data);
    return created.data;
  }

  async function onSubmitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    const payload = {
      targetType: String(form.get('targetType')),
      cycleType: String(form.get('cycleType')),
      startDate: String(form.get('startDate')),
      endDate: String(form.get('endDate')),
      orderCount: Number(form.get('orderCount')),
      warehouseArea: Number(form.get('warehouseArea')),
      staffCount: Number(form.get('staffCount')),
      errorCount: Number(form.get('errorCount')),
      inboundCount: Number(form.get('inboundCount')),
    };

    try {
      const created = await apiPost<{ id: string }, typeof payload>('/kpi/entries', payload);
      await apiPost(`/kpi/entries/${created.data.id}/submit`);
      setMessage('KPI 数据已提交审核。');
      event.currentTarget.reset();
      await loadResults();
    } catch {
      setMessage('提交失败，请检查后端服务。');
    } finally {
      setLoading(false);
    }
  }

  async function loadResultDetail(resultId: string) {
    if (!resultId) return;
    try {
      const [metricRes, analysisRes] = await Promise.all([
        apiGet<MetricScore[]>(`/kpi/results/${resultId}/metrics`),
        apiGet<AnalysisItem[]>(`/kpi/results/${resultId}/analysis`),
      ]);
      setMetricScores(metricRes.data);
      setAnalysisItems(analysisRes.data);
    } catch {
      setMetricScores([]);
      setAnalysisItems([]);
    }
  }

  async function saveConfig() {
    try {
      const currentRule = await ensureRule();
      await apiPut(`/kpi/rules/${currentRule.id}/config`, config);
      setMessage('规则草稿已保存。');
      await loadRules();
    } catch {
      setMessage('规则保存失败。');
    }
  }

  async function publishConfig() {
    try {
      const currentRule = await ensureRule();
      await apiPost(`/kpi/rules/${currentRule.id}/publish`, {
        versionName: `v${new Date().toISOString().slice(0, 10)}`,
        effectiveStartAt: new Date().toISOString(),
      });
      setMessage('规则已发布并生效。');
      await loadRules();
    } catch {
      setMessage('规则发布失败。');
    }
  }

  async function applyTemplate() {
    if (!selectedTemplateKey) {
      setMessage('请先选择模板。');
      return;
    }
    try {
      const currentRule = await ensureRule();
      await apiPost(`/kpi/rules/${currentRule.id}/apply-template`, {
        templateKey: selectedTemplateKey,
      });
      const selectedTemplate = templates.find((item) => item.key === selectedTemplateKey);
      if (selectedTemplate) {
        setConfig(selectedTemplate.config);
      }
      setMessage('模板已应用到草稿。');
      await loadRules();
    } catch {
      setMessage('模板应用失败。');
    }
  }

  function renderConfigInput(label: string, key: keyof typeof defaultConfig) {
    return (
      <label style={{ display: 'grid', gap: 6 }}>
        <span>{label}</span>
        <input
          type="number"
          step="0.01"
          value={config[key]}
          onChange={(e) => setConfig((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
        />
      </label>
    );
  }

  return (
    <AppShell title="KPI 考核" subtitle="支持仓库自定义规则、日周月多周期分析和 AI 解释。">
      <section className="section">
        <h3>KPI 数据填报</h3>
        <form className="form-grid" onSubmit={onSubmitEntry}>
          <select name="targetType" defaultValue="warehouse">
            <option value="warehouse">仓库整体</option>
            <option value="personal">个人</option>
          </select>
          <select name="cycleType" defaultValue="weekly">
            <option value="daily">日</option>
            <option value="weekly">周</option>
            <option value="monthly">月</option>
          </select>
          <input name="startDate" type="date" required />
          <input name="endDate" type="date" required />
          <input name="orderCount" type="number" min="0" placeholder="入订单数量" required />
          <input name="warehouseArea" type="number" min="0" placeholder="仓库面积" required />
          <input name="staffCount" type="number" min="0" placeholder="员工数量" required />
          <input name="errorCount" type="number" min="0" placeholder="发错数量" required />
          <input name="inboundCount" type="number" min="0" placeholder="入库数量" required />
          <button type="submit" disabled={loading}>{loading ? '提交中...' : '提交KPI数据'}</button>
        </form>
      </section>

      <section className="section">
        <h3>KPI 规则配置（第三阶段）</h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedTemplateKey} onChange={(e) => setSelectedTemplateKey(e.target.value)}>
            <option value="">选择模板</option>
            {templates.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </select>
          <button onClick={() => void applyTemplate()}>应用模板到草稿</button>
          {selectedTemplateKey ? (
            <span style={{ opacity: 0.8 }}>
              {templates.find((item) => item.key === selectedTemplateKey)?.description ?? ''}
            </span>
          ) : null}
        </div>
        <div className="form-grid">
          {renderConfigInput('业务得分上限', 'businessCeiling')}
          {renderConfigInput('业务除数阈值', 'businessDivisor')}
          {renderConfigInput('差错得分上限', 'errorCeiling')}
          {renderConfigInput('差错扣分系数', 'errorPenalty')}
          {renderConfigInput('人效得分上限', 'efficiencyCeiling')}
          {renderConfigInput('人效除数阈值', 'efficiencyDivisor')}
          {renderConfigInput('负载得分上限', 'loadCeiling')}
          {renderConfigInput('负载乘数', 'loadMultiplier')}
          {renderConfigInput('优秀分界', 'excellentMin')}
          {renderConfigInput('良好分界', 'goodMin')}
          {renderConfigInput('合格分界', 'passMin')}
          {renderConfigInput('需改善分界', 'improveMin')}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={() => void saveConfig()}>保存规则草稿</button>
          <button onClick={() => void publishConfig()}>发布并生效</button>
        </div>
      </section>

      <section className="section">
        <h3>KPI 结果</h3>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <select
            value={selectedResultId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedResultId(id);
              void loadResultDetail(id);
            }}
          >
            <option value="">选择一个结果查看明细与AI分析</option>
            {results.map((row) => (
              <option key={row.id} value={row.id}>
                {row.id} / {row.cycleType} / {row.grade}
              </option>
            ))}
          </select>
        </div>
        <table className="table">
          <thead>
            <tr><th>ID</th><th>周期</th><th>总分</th><th>等级</th></tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.cycleType}</td>
                <td>{row.totalScore}</td>
                <td>{row.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {message ? <p>{message}</p> : null}
      </section>

      <section className="section">
        <h3>KPI 指标明细</h3>
        <table className="table">
          <thead>
            <tr><th>指标</th><th>满分</th><th>实得分</th></tr>
          </thead>
          <tbody>
            {metricScores.map((item) => (
              <tr key={item.id}>
                <td>{item.metricCode}</td>
                <td>{item.scoreCeiling}</td>
                <td>{item.actualScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h3>KPI AI 分析</h3>
        <table className="table">
          <thead>
            <tr><th>类型</th><th>风险</th><th>内容</th></tr>
          </thead>
          <tbody>
            {analysisItems.map((item) => (
              <tr key={item.id}>
                <td>{item.analysisType}</td>
                <td>{item.riskLevel ?? '-'}</td>
                <td>{item.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
