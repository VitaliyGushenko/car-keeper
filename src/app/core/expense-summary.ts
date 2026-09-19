import { Expense, ExpenseType } from './models';
import { toDateOrNull } from './format';

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  fuel: 'Топливо',
  maintenance: 'Обслуживание',
  repair: 'Ремонт',
  insurance: 'Страховка',
  tax: 'Налоги и сборы',
  other: 'Прочее',
};

export interface TypeSummary {
  type: ExpenseType;
  total: number;
  /** Доля от общей суммы 0..1. */
  percent: number;
}

export interface MonthSummary {
  /** Ключ вида «2026-09». */
  key: string;
  label: string;
  total: number;
}

export interface ExpenseSummary {
  total: number;
  thisMonth: number;
  prevMonth: number;
  byType: TypeSummary[];
  /** Последние 6 месяцев, от старых к новым. */
  monthly: MonthSummary[];
}

const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function summarizeExpenses(expenses: Expense[], now: Date = new Date()): ExpenseSummary {
  let total = 0;
  let thisMonth = 0;
  let prevMonth = 0;
  const byTypeTotals = new Map<ExpenseType, number>();
  const monthTotals = new Map<string, number>();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  for (const expense of expenses) {
    const date = toDateOrNull(expense.date);
    if (!date) {
      continue;
    }
    const amount = expense.amount || 0;
    total += amount;
    byTypeTotals.set(expense.type, (byTypeTotals.get(expense.type) ?? 0) + amount);

    if (date >= monthStart) {
      thisMonth += amount;
    } else if (date >= prevMonthStart) {
      prevMonth += amount;
    }

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + amount);
  }

  const byType: TypeSummary[] = [...byTypeTotals.entries()]
    .map(([type, sum]) => ({ type, total: sum, percent: total > 0 ? sum / total : 0 }))
    .sort((a, b) => b.total - a.total);

  const monthly: MonthSummary[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly.push({
      key,
      label: MONTH_NAMES[d.getMonth()],
      total: monthTotals.get(key) ?? 0,
    });
  }

  return { total, thisMonth, prevMonth, byType, monthly };
}
