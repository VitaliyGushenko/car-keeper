import { Timestamp } from '@angular/fire/firestore';

import { toDateOrNull } from './format';
import { VehicleDocument } from './models';

export type DocumentStatus = 'active' | 'expiring' | 'expired';

/** Документ считается «истекающим» за 30 дней до окончания срока. */
export const EXPIRING_SOON_DAYS = 30;

export function documentStatus(document: VehicleDocument, now: Date = new Date()): DocumentStatus {
  const end = toDateOrNull(document.endDate ?? null);
  if (!end) {
    return 'active';
  }
  const daysLeft = (end.getTime() - now.getTime()) / 86_400_000;
  if (daysLeft <= 0) {
    return 'expired';
  }
  return daysLeft <= EXPIRING_SOON_DAYS ? 'expiring' : 'active';
}

/** «истекает через 12 дн.» / «истёк 3 дн. назад» / дней осталось. */
export function daysLeftText(document: VehicleDocument, now: Date = new Date()): string | null {
  const end = toDateOrNull(document.endDate ?? null);
  if (!end) {
    return null;
  }
  const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) {
    return 'истекает сегодня';
  }
  if (days > 0) {
    return `истекает через ${days} дн.`;
  }
  return `истёк ${Math.abs(days)} дн. назад`;
}

export function expiringOrExpired(documents: VehicleDocument[], now: Date = new Date()): VehicleDocument[] {
  return documents
    .filter((d) => documentStatus(d, now) !== 'active')
    .sort((a, b) => ts(a.endDate) - ts(b.endDate));
}

function ts(value: Timestamp | null | undefined): number {
  return value?.toMillis ? value.toMillis() : 0;
}
