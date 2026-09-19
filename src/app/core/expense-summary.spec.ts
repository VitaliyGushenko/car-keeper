import { Timestamp } from '@angular/fire/firestore';

import { Expense, ExpenseType } from './models';
import { summarizeExpenses } from './expense-summary';

function expense(type: ExpenseType, amount: number, date: Date, currency = 'RUB'): Expense {
  return {
    id: `${type}-${amount}-${date.getTime()}`,
    type,
    amount,
    currency,
    date: Timestamp.fromDate(date),
    linkedRepairId: null,
    linkedScheduleId: null,
  };
}

describe('summarizeExpenses', () => {
  const now = new Date(2026, 8, 15); // 15 сентября 2026

  it('считает общую сумму', () => {
    const summary = summarizeExpenses(
      [expense('fuel', 1000, new Date(2026, 7, 1)), expense('repair', 2500, new Date(2026, 7, 20))],
      now,
    );
    expect(summary.total).toBe(3500);
  });

  it('разделяет текущий и прошлый месяц', () => {
    const summary = summarizeExpenses(
      [
        expense('fuel', 1000, new Date(2026, 8, 5)),
        expense('repair', 2500, new Date(2026, 7, 20)),
        expense('other', 500, new Date(2026, 6, 10)),
      ],
      now,
    );
    expect(summary.thisMonth).toBe(1000);
    expect(summary.prevMonth).toBe(2500);
    expect(summary.total).toBe(4000);
  });

  it('считает категории и сортирует по убыванию', () => {
    const summary = summarizeExpenses(
      [
        expense('fuel', 1000, new Date(2026, 8, 1)),
        expense('repair', 3000, new Date(2026, 8, 2)),
        expense('repair', 1000, new Date(2026, 8, 3)),
      ],
      now,
    );
    expect(summary.byType[0].type).toBe('repair');
    expect(summary.byType[0].total).toBe(4000);
    expect(summary.byType[0].percent).toBeCloseTo(4000 / 5000);
  });

  it('строит 6 последних месяцев от старых к новым', () => {
    const summary = summarizeExpenses([expense('fuel', 123, new Date(2026, 3, 10))], now);
    expect(summary.monthly.length).toBe(6);
    expect(summary.monthly[0].key).toBe('2026-04');
    expect(summary.monthly[0].total).toBe(123);
    expect(summary.monthly[5].key).toBe('2026-09');
  });

  it('пустой список — нули', () => {
    const summary = summarizeExpenses([], now);
    expect(summary.total).toBe(0);
    expect(summary.byType).toEqual([]);
    expect(summary.monthly.every((m) => m.total === 0)).toBe(true);
  });
});
