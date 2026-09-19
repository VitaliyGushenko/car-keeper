import { Expense } from './models';
import { EXPENSE_TYPE_LABELS } from './expense-summary';
import { formatDate, formatNumber } from './format';

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** CSV для Excel (разделитель «;», BOM для корректной кириллицы). */
export function expensesToCsv(expenses: Expense[]): string {
  const rows: string[][] = [['Дата', 'Тип', 'Название', 'Сумма', 'Валюта', 'Пробег, км', 'Заметки']];
  const sorted = [...expenses].sort(
    (a, b) => (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0),
  );
  for (const e of sorted) {
    rows.push([
      formatDate(e.date),
      EXPENSE_TYPE_LABELS[e.type],
      e.title ?? '',
      String(e.amount ?? 0).replace('.', ','),
      e.currency,
      e.mileageAt !== null && e.mileageAt !== undefined ? String(e.mileageAt) : '',
      e.notes ?? '',
    ]);
  }
  return '\uFEFF' + rows.map((row) => row.map(csvEscape).join(';')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvFileName(make: string, model: string): string {
  const safe = `${make}_${model}`.replace(/[^\w\-]+/g, '_');
  return `car-keeper_${safe}_expenses.csv`.replace('__', '_');
}

// formatNumber используется в других модулях экспорта; экспортируем обёртку на будущее.
export const mileageText = (km: number | null | undefined): string =>
  km === null || km === undefined ? '' : formatNumber(km);
