import { MaintenanceTemplate } from './models';

/**
 * Дефолтные регламенты, которые копируются в новый автомобиль.
 * Если в Firestore есть коллекция maintenanceTemplates — используются она,
 * иначе эти значения (можно расширять/править через Firebase Console).
 */
export const DEFAULT_SCHEDULE_TEMPLATES: readonly Omit<MaintenanceTemplate, 'id'>[] = [
  { name: 'Замена моторного масла и масляного фильтра', intervalKm: 10_000, intervalMonths: 12, order: 1 },
  { name: 'Замена воздушного фильтра', intervalKm: 20_000, intervalMonths: 24, order: 2 },
  { name: 'Замена салонного фильтра', intervalKm: 15_000, intervalMonths: 12, order: 3 },
  { name: 'Замена топливного фильтра', intervalKm: 40_000, intervalMonths: 48, order: 4 },
  { name: 'Замена свечей зажигания', intervalKm: 30_000, intervalMonths: 36, order: 5 },
  { name: 'Замена тормозной жидкости', intervalKm: 60_000, intervalMonths: 24, order: 6 },
  { name: 'Замена антифриза', intervalKm: 90_000, intervalMonths: 60, order: 7 },
  { name: 'Замена масла в КПП', intervalKm: 80_000, intervalMonths: 60, order: 8 },
  { name: 'Проверка и замена ремня/цепи ГРМ', intervalKm: 90_000, intervalMonths: 72, order: 9 },
  { name: 'Проверка тормозных колодок и дисков', intervalKm: 30_000, intervalMonths: 12, order: 10 },
  { name: 'Сезонная замена шин', intervalMonths: 6, order: 11 },
  { name: 'Техосмотр / страховка (ОСАГО)', intervalMonths: 12, order: 12 },
];
