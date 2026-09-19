import { Timestamp } from '@angular/fire/firestore';

/** Число с разделителями: 123456 → «123 456». */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString('ru-RU');
}

/** Деньги: 12345.6 + 'RUB' → «12 345,60 ₽» (или код валюты, если символа нет). */
export function formatMoney(amount: number | null | undefined, currency = 'RUB'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '—';
  }
  try {
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    });
  } catch {
    // Неизвестный код валюты — печатаем просто число и код.
    return `${formatNumber(amount)} ${currency}`;
  }
}

/** Timestamp | Date → «19.09.2026». */
export function formatDate(value: Timestamp | Date | null | undefined): string {
  const date = toDateOrNull(value);
  return date ? date.toLocaleDateString('ru-RU') : '—';
}

/** Timestamp | Date → «19.09.2026, 14:05». */
export function formatDateTime(value: Timestamp | Date | null | undefined): string {
  const date = toDateOrNull(value);
  return date ? date.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

/** Дата в значение для `<input type="date">` (yyyy-MM-dd) или ''. */
export function toDateInputValue(value: Timestamp | Date | null | undefined): string {
  const date = toDateOrNull(value);
  if (!date) {
    return '';
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Строка из `<input type="date">` → Timestamp | null. */
export function dateInputToTimestamp(value: string): Timestamp | null {
  if (!value) {
    return null;
  }
  const [yyyy, mm, dd] = value.split('-').map(Number);
  if (!yyyy || !mm || !dd) {
    return null;
  }
  return Timestamp.fromDate(new Date(yyyy, mm - 1, dd));
}

export function toDateOrNull(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : value.toDate();
}

/** «Сегодня», «Вчера», иначе — дата. */
export function formatRelativeDate(value: Timestamp | Date | null | undefined): string {
  const date = toDateOrNull(value);
  if (!date) {
    return '—';
  }
  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) {
    return 'Сегодня';
  }
  if (diffDays === 1) {
    return 'Вчера';
  }
  return formatDate(date);
}
