import { Timestamp } from '@angular/fire/firestore';

import { MaintenanceSchedule } from './models';
import { formatInterval, scheduleStatus } from './schedule-status';

function schedule(partial: Partial<MaintenanceSchedule>): MaintenanceSchedule {
  return {
    id: 's1',
    name: 'Замена масла',
    intervalKm: 10_000,
    intervalMonths: 12,
    lastDoneKm: null,
    lastDoneDate: null,
    ...partial,
  };
}

const monthsAgo = (n: number): Timestamp => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return Timestamp.fromDate(d);
};

describe('scheduleStatus', () => {
  it('никогда не выполнявшийся регламент — unknown при отсутствии интервалов', () => {
    const info = scheduleStatus({ id: 's1', name: 'x' }, 50_000);
    expect(info.status).toBe('unknown');
    expect(info.neverDone).toBe(false);
  });

  it('никогда не выполнявшийся регламент с интервалом — ok + neverDone', () => {
    const info = scheduleStatus(schedule({}), 50_000);
    expect(info.status).toBe('ok');
    expect(info.neverDone).toBe(true);
    expect(info.progress).toBe(0);
  });

  it('свежая замена — ok', () => {
    const info = scheduleStatus(
      schedule({ lastDoneKm: 100_000, lastDoneDate: monthsAgo(1) }),
      105_000,
    );
    expect(info.status).toBe('ok');
    expect(info.progress).toBeCloseTo(0.5);
    expect(info.km?.dueKm).toBe(110_000);
  });

  it('80%+ интервала по пробегу — due-soon', () => {
    const info = scheduleStatus(schedule({ lastDoneKm: 100_000 }), 108_500);
    expect(info.status).toBe('due-soon');
    expect(info.km?.remainingKm).toBe(1_500);
  });

  it('пробег за интервалом — overdue', () => {
    const info = scheduleStatus(schedule({ lastDoneKm: 100_000 }), 110_000);
    expect(info.status).toBe('overdue');
    expect(info.km?.overdue).toBe(true);
  });

  it('время за интервалом (12 мес) — overdue', () => {
    const info = scheduleStatus(
      schedule({ lastDoneKm: 0, lastDoneDate: monthsAgo(13) }),
      5_000,
    );
    expect(info.status).toBe('overdue');
    expect(info.time?.overdue).toBe(true);
  });

  it('11 месяцев по времени — due-soon', () => {
    const info = scheduleStatus(
      schedule({ lastDoneKm: 0, lastDoneDate: monthsAgo(11) }),
      5_000,
    );
    expect(info.status).toBe('due-soon');
  });

  it('учитывается худший из двух интервалов', () => {
    // По км всё хорошо, по времени просрочено.
    const info = scheduleStatus(
      schedule({ lastDoneKm: 100_000, lastDoneDate: monthsAgo(24) }),
      100_500,
    );
    expect(info.status).toBe('overdue');
  });

  it('учитывается только км, если месяцы не заданы', () => {
    const info = scheduleStatus(
      schedule({ intervalMonths: null, lastDoneKm: 100_000 }),
      105_000,
    );
    expect(info.time).toBeUndefined();
    expect(info.status).toBe('ok');
  });
});

describe('formatInterval', () => {
  // toLocaleString('ru-RU') использует неразрывные пробелы — убираем их для сравнения.
  const normalize = (value: string) => value.replace(/[\u00A0\u202F]/g, ' ');

  it('форматирует км и месяцы', () => {
    expect(normalize(formatInterval(schedule({ intervalKm: 10_000, intervalMonths: 12 })))).toBe(
      '10 000 км / 12 мес',
    );
  });

  it('только месяцы', () => {
    expect(formatInterval(schedule({ intervalKm: null, intervalMonths: 6 }))).toBe('6 мес');
  });

  it('без интервалов', () => {
    expect(formatInterval({ id: 's', name: 'x' })).toBe('интервал не задан');
  });
});
