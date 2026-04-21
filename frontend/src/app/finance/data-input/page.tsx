'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createFinanceRecord,
  fetchFinanceDashboard,
  fetchAllFinanceInputRecords,
  submitFinanceRecord,
} from '@/lib/finance/finance-api';
import { FINANCE_MODULE_FIELD_TEMPLATES } from '@/lib/finance/module-field-templates';
import { FINANCE_TARGET_MODULE_OPTIONS } from '@/lib/finance/module-routing';
import { emitFinanceDataUpdated } from '@/lib/finance/sync';
import { useFinanceTerminology } from '@/lib/finance/terminology';
import type { FinanceDashboard, FinanceRecord, FinanceRecordType, FinanceTargetModule, SaveFinanceRecordPayload } from '@/lib/finance/types';

const emptyDashboard: FinanceDashboard = {
  monthlyIncome: 0,
  monthlyExpense: 0,
  purchaseCost: 0,
  netProfit: 0,
};

function recordTypeTermKey(type: FinanceRecordType): 'finance.recordType.income' | 'finance.recordType.expense' | 'finance.recordType.purchase' {
  if (type === 'income') return 'finance.recordType.income';
  if (type === 'expense') return 'finance.recordType.expense';
  return 'finance.recordType.purchase';
}

export default function FinanceDataInputPage() {
  const { term, moduleLabel, moduleFieldLabel } = useFinanceTerminology();
  const [dashboard, setDashboard] = useState<FinanceDashboard>(emptyDashboard);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [recordType, setRecordType] = useState<FinanceRecordType>('income');
  const [targetModule, setTargetModule] = useState<FinanceTargetModule>('profit_statement');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadData();
    // 仅在挂载时拉取；避免术语切换等导致重复请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      const [dashboardRes, merged] = await Promise.all([
        fetchFinanceDashboard(),
        fetchAllFinanceInputRecords(),
      ]);
      setDashboard(dashboardRes.data);
      setRecords(merged);
      setMessage('');
    } catch {
      setDashboard(emptyDashboard);
      setRecords([]);
      setMessage(term('finance.dataInput.msg.loadError'));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const moduleFields = FINANCE_MODULE_FIELD_TEMPLATES[targetModule] ?? [];
    const moduleData = moduleFields.reduce<Record<string, string | number>>((acc, field) => {
      const rawValue = form.get(`moduleData__${field.key}`);
      if (rawValue === null || rawValue === '') return acc;
      if (field.type === 'number') {
        const parsed = Number(rawValue);
        if (Number.isFinite(parsed)) {
          acc[field.key] = parsed;
        }
        return acc;
      }
      acc[field.key] = String(rawValue).trim();
      return acc;
    }, {});

    const payload: SaveFinanceRecordPayload = {
      recordDate: String(form.get('recordDate')),
      category: String(form.get('category')),
      recordType,
      targetModule,
      moduleData,
      amount: Number(form.get('amount')),
      currencyCode: String(form.get('currencyCode') || 'CNY'),
      fxRateToCny: form.get('fxRateToCny') ? Number(form.get('fxRateToCny')) : undefined,
      counterparty: String(form.get('counterparty') || ''),
      costNature: String(form.get('costNature') || ''),
      note: String(form.get('note') || ''),
    };

    try {
      const created = await createFinanceRecord(recordType, payload);
      await submitFinanceRecord(recordType, created.data.id);
      emitFinanceDataUpdated();
      setMessage(term('finance.dataInput.msg.saveSuccess'));
      event.currentTarget.reset();
      await loadData();
    } catch {
      setMessage(term('finance.dataInput.msg.saveError'));
    } finally {
      setLoading(false);
    }
  }

  const cards = useMemo(
    () => [
      { key: 'monthlyIncome', label: term('finance.dataInput.dashboard.monthlyIncome'), value: dashboard.monthlyIncome },
      { key: 'monthlyExpense', label: term('finance.dataInput.dashboard.monthlyExpense'), value: dashboard.monthlyExpense },
      { key: 'purchaseCost', label: term('finance.dataInput.dashboard.purchaseCost'), value: dashboard.purchaseCost },
      { key: 'netProfit', label: term('finance.dataInput.dashboard.netProfit'), value: dashboard.netProfit },
    ],
    [dashboard, term],
  );

  return (
    <>
      <section className="cards">
        {cards.map((item) => (
          <div key={item.key} className="card">
            <h3>{item.label}</h3>
            <strong>¥ {item.value}</strong>
          </div>
        ))}
      </section>

      <section className="section">
        <h3>{term('finance.tab.dataInput')}</h3>
        <form className="form-grid" onSubmit={onSubmit}>
          <select value={recordType} onChange={(event) => setRecordType(event.target.value as FinanceRecordType)}>
            <option value="income">{term('finance.recordType.income')}</option>
            <option value="expense">{term('finance.recordType.expense')}</option>
            <option value="purchase">{term('finance.recordType.purchase')}</option>
          </select>
          <select value={targetModule} onChange={(event) => setTargetModule(event.target.value as FinanceTargetModule)}>
            {FINANCE_TARGET_MODULE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {term('finance.form.routeToPrefix')}
                {moduleLabel(item.value)}
              </option>
            ))}
          </select>
          <input name="recordDate" type="date" required />
          <input name="category" placeholder={term('finance.form.category')} required />
          <input name="amount" type="number" min="0" step="0.01" placeholder={term('finance.form.amount')} required />
          <select name="currencyCode" defaultValue="CNY">
            <option value="CNY">CNY</option>
            <option value="USD">USD</option>
            <option value="THB">THB</option>
          </select>
          <input name="fxRateToCny" type="number" min="0" step="0.000001" placeholder={term('finance.form.fxRate')} />
          <input name="counterparty" placeholder={term('finance.form.counterparty')} />
          <input name="costNature" placeholder={term('finance.form.costNature')} />
          <input name="note" placeholder={term('finance.form.note')} />
          {FINANCE_MODULE_FIELD_TEMPLATES[targetModule].map((field) => (
            <input
              key={`${targetModule}-${field.key}`}
              name={`moduleData__${field.key}`}
              type={field.type}
              required={field.required}
              min={field.type === 'number' ? 0 : undefined}
              step={field.type === 'number' ? '0.01' : undefined}
              placeholder={`${moduleFieldLabel(targetModule, field.key)}${field.placeholder ? `（${field.placeholder}）` : ''}`}
            />
          ))}
          <button type="submit" disabled={loading}>
            {loading ? term('finance.form.submitting') : term('finance.form.submit')}
          </button>
        </form>
        {message ? <p>{message}</p> : null}
      </section>

      <section className="section">
        <h3>{term('finance.dataInput.recentTitle')}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{term('finance.dataInput.col.date')}</th>
              <th>{term('finance.dataInput.col.type')}</th>
              <th>{term('finance.dataInput.col.category')}</th>
              <th>{term('finance.dataInput.col.targetModule')}</th>
              <th>{term('finance.dataInput.col.amountOriginal')}</th>
              <th>{term('finance.dataInput.col.amountCny')}</th>
              <th>{term('finance.dataInput.col.moduleFields')}</th>
              <th>{term('finance.dataInput.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.recordDate.slice(0, 10)}</td>
                <td>{term(recordTypeTermKey(record.recordType))}</td>
                <td>{record.category}</td>
                <td>
                  {record.targetModule ? moduleLabel(record.targetModule) : term('finance.dataInput.targetUnset')}
                </td>
                <td>
                  {record.currencyCode ?? 'CNY'} {record.amount}
                </td>
                <td>¥ {record.amountCny ?? record.amount}</td>
                <td>
                  {record.moduleData
                    ? Object.entries(record.moduleData)
                        .map(([key, value]) => {
                          const label = record.targetModule ? moduleFieldLabel(record.targetModule, key) : key;
                          return `${label}:${value}`;
                        })
                        .join('；')
                    : '-'}
                </td>
                <td>{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
