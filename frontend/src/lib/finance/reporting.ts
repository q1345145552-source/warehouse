import type { FinanceRecord } from './types';

function escapeCsvCell(value: string) {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

export function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

export function filterRecordsByMonth(records: FinanceRecord[], month: string) {
  if (!month) return records;
  return records.filter((item) => item.recordDate.slice(0, 7) === month);
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const content = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
