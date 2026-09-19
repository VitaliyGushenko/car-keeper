import { FuelEntry } from './models';
import { toDateOrNull } from './format';

export interface FillupConsumption {
  id: string;
  date: Date | null;
  /** Расход в литрах на 100 км за период до этой заправки. */
  consumption: number;
}

export interface FuelStats {
  /** Средний расход л/100км по полным бакам. */
  avgConsumption: number | null;
  /** Стоимость одного километра (топливо). */
  costPerKm: number | null;
  totalCost: number;
  fillups: number;
  /** Расход по каждой заправке «до полного» (кроме первой). */
  consumptions: FillupConsumption[];
}

/**
 * Классический метод: бак заливается «до полного», расход считается
 * по объёму, залитому до следующей полной заправки, делённому на пройденное расстояние.
 */
export function fuelStats(entries: FuelEntry[]): FuelStats {
  const sorted = [...entries].sort((a, b) => a.odometerKm - b.odometerKm);
  let pendingLiters = 0;
  let prevFullOdo: number | null = null;
  let litersInSpans = 0;
  let distance = 0;
  let totalCost = 0;
  let minOdo: number | null = null;
  let maxOdo: number | null = null;
  const consumptions: FillupConsumption[] = [];

  for (const entry of sorted) {
    totalCost += entry.totalCost || 0;
    if (minOdo === null || entry.odometerKm < minOdo) {
      minOdo = entry.odometerKm;
    }
    if (maxOdo === null || entry.odometerKm > maxOdo) {
      maxOdo = entry.odometerKm;
    }
    pendingLiters += entry.liters || 0;
    if (entry.fullTank) {
      if (prevFullOdo !== null && entry.odometerKm > prevFullOdo && pendingLiters > 0) {
        const span = entry.odometerKm - prevFullOdo;
        consumptions.push({
          id: entry.id,
          date: toDateOrNull(entry.date),
          consumption: (pendingLiters / span) * 100,
        });
        litersInSpans += pendingLiters;
        distance += span;
      }
      prevFullOdo = entry.odometerKm;
      pendingLiters = 0;
    }
  }

  const avgConsumption = distance > 0 ? (litersInSpans / distance) * 100 : null;
  const costPerKm =
    minOdo !== null && maxOdo !== null && maxOdo > minOdo && totalCost > 0
      ? totalCost / (maxOdo - minOdo)
      : null;

  return { avgConsumption, costPerKm, totalCost, fillups: sorted.length, consumptions };
}
