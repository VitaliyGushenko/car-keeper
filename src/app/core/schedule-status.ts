import { MaintenanceSchedule, ScheduleStatus } from './models';
import { toDateOrNull } from './format';

/** Порог «скоро»: осталось ≤ 20% интервала. */
export const DUE_SOON_THRESHOLD = 0.8;

export interface SchedulePartInfo {
  /** Пробег, на котором нужно выполнить регламент. */
  dueKm?: number;
  /** Дата, до которой нужно выполнить регламент. */
  dueDate?: Date;
  overdue: boolean;
  /** Доля израсходованного интервала 0..1; null — нет точки отсчёта. */
  progress: number | null;
  remainingKm?: number;
  remainingDays?: number;
}

export interface ScheduleStatusInfo {
  status: ScheduleStatus | 'unknown';
  /** Худшая (наибольшая) доля израсходованного интервала. */
  progress: number;
  neverDone: boolean;
  km?: SchedulePartInfo;
  time?: SchedulePartInfo;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  // Если день не существует в новом месяце (31 → 30), фиксируем на последний день.
  if (result.getDate() < day) {
    result.setDate(0);
  }
  return result;
}

/**
 * Считает статус регламента по текущему пробегу и времени.
 * Просрочено — любой интервал вышел; «скоро» — любой интервал израсходован на 80%+.
 */
export function scheduleStatus(
  schedule: MaintenanceSchedule,
  currentMileageKm: number,
  now: Date = new Date(),
): ScheduleStatusInfo {
  let progress = 0;
  let overdue = false;
  let hasInterval = false;
  let neverDone = false;

  const km = computeKmPart(schedule, currentMileageKm);
  if (km) {
    hasInterval = true;
    if (km.progress === null) {
      neverDone = true;
    } else {
      progress = Math.max(progress, km.progress);
      overdue = overdue || km.overdue;
    }
  }

  const time = computeTimePart(schedule, now);
  if (time) {
    hasInterval = true;
    if (time.progress === null) {
      neverDone = true;
    } else {
      progress = Math.max(progress, time.progress);
      overdue = overdue || time.overdue;
    }
  }

  const status: ScheduleStatus | 'unknown' = !hasInterval
    ? 'unknown'
    : overdue
      ? 'overdue'
      : progress >= DUE_SOON_THRESHOLD
        ? 'due-soon'
        : 'ok';

  return {
    status,
    progress: Math.min(1, Math.max(0, progress)),
    neverDone,
    km: km ?? undefined,
    time: time ?? undefined,
  };
}

function computeKmPart(schedule: MaintenanceSchedule, currentMileageKm: number): SchedulePartInfo | null {
  const intervalKm = schedule.intervalKm ?? 0;
  if (intervalKm <= 0) {
    return null;
  }
  const lastDoneKm = schedule.lastDoneKm ?? null;
  if (lastDoneKm === null) {
    return { overdue: false, progress: null };
  }
  const dueKm = lastDoneKm + intervalKm;
  const remainingKm = dueKm - currentMileageKm;
  return {
    dueKm,
    remainingKm,
    overdue: remainingKm <= 0,
    progress: (currentMileageKm - lastDoneKm) / intervalKm,
  };
}

function computeTimePart(schedule: MaintenanceSchedule, now: Date): SchedulePartInfo | null {
  const intervalMonths = schedule.intervalMonths ?? 0;
  if (intervalMonths <= 0) {
    return null;
  }
  const lastDoneDate = toDateOrNull(schedule.lastDoneDate ?? null);
  if (!lastDoneDate) {
    return { overdue: false, progress: null };
  }
  const dueDate = addMonths(lastDoneDate, intervalMonths);
  const remainingDays = (dueDate.getTime() - now.getTime()) / 86_400_000;
  const totalDays = intervalMonths * 30.44;
  return {
    dueDate,
    remainingDays,
    overdue: remainingDays <= 0,
    progress: 1 - remainingDays / totalDays,
  };
}

/** Человекочитаемое описание интервала: «10 000 км / 12 мес». */
export function formatInterval(schedule: MaintenanceSchedule): string {
  const parts: string[] = [];
  if (schedule.intervalKm) {
    parts.push(`${schedule.intervalKm.toLocaleString('ru-RU')} км`);
  }
  if (schedule.intervalMonths) {
    parts.push(`${schedule.intervalMonths} мес`);
  }
  return parts.join(' / ') || 'интервал не задан';
}

/** Темп езды, км/день, по журналу пробегов (МНК). Нужны ≥2 точки с разницей дат. */
export function kmPerDayTrend(history: { odometerKm: number; date: Date }[]): number | null {
  const pts = [...history].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (pts.length < 2) {
    return null;
  }
  const t0 = pts[0].date.getTime();
  const xs = pts.map((p) => (p.date.getTime() - t0) / 86_400_000);
  const ys = pts.map((p) => p.odometerKm);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom <= 0) {
    return null;
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  return slope > 0 ? slope : null;
}

/** Прогноз даты достижения «следующей замены» по км при текущем темпе езды. */
export function forecastDueDate(
  info: ScheduleStatusInfo,
  kmPerDay: number | null,
  now: Date = new Date(),
): Date | null {
  if (!kmPerDay || !info.km || info.km.dueKm === undefined || info.km.overdue) {
    return null;
  }
  const kmLeft = info.km.remainingKm ?? 0;
  if (kmLeft <= 0) {
    return null;
  }
  return new Date(now.getTime() + (kmLeft / kmPerDay) * 86_400_000);
}
