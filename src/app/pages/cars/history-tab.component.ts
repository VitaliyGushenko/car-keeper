import { Component, OnInit, computed, inject, input, signal } from '@angular/core';

import { AuthService } from '../../core/auth.service';
import { ExpensesService } from '../../core/expenses.service';
import { EXPENSE_TYPE_LABELS } from '../../core/expense-summary';
import { FaultsService } from '../../core/faults.service';
import { formatMoney, formatDate, formatNumber } from '../../core/format';
import { FuelService } from '../../core/fuel.service';
import { MileageService } from '../../core/mileage.service';
import { RepairsService } from '../../core/repairs.service';
import { SchedulesService } from '../../core/schedules.service';
import { Car } from '../../core/models';
import { UiButton } from '../../ui/button.directive';
import { UiEmptyState } from '../../ui/empty-state.component';

interface TimelineItem {
  date: Date;
  icon: string;
  title: string;
  subtitle: string;
  amount?: number;
  currency?: string;
}

@Component({
  selector: 'ck-history-tab',
  imports: [UiButton, UiEmptyState],
  templateUrl: './history-tab.component.html',
  styleUrl: './history-tab.component.less',
})
export class HistoryTabComponent implements OnInit {
  readonly car = input.required<Car>();

  private readonly schedulesService = inject(SchedulesService);
  private readonly faultsService = inject(FaultsService);
  private readonly repairsService = inject(RepairsService);
  private readonly expensesService = inject(ExpensesService);
  private readonly fuelService = inject(FuelService);
  private readonly mileageService = inject(MileageService);
  private readonly auth = inject(AuthService);

  private readonly schedulesState = signal<import('../../core/models').MaintenanceSchedule[]>([]);
  private readonly faultsState = signal<import('../../core/models').Fault[]>([]);
  private readonly repairsState = signal<import('../../core/models').Repair[]>([]);
  private readonly expensesState = signal<import('../../core/models').Expense[]>([]);
  private readonly fuelState = signal<import('../../core/models').FuelEntry[]>([]);
  private readonly mileageState = signal<import('../../core/models').MileageEntry[]>([]);

  readonly typeLabels = EXPENSE_TYPE_LABELS;
  readonly formatMoney = formatMoney;
  readonly formatDate = formatDate;
  readonly formatNumber = formatNumber;

  readonly currency = computed(() => this.auth.profile()?.settings?.currency ?? 'RUB');

  readonly items = computed<TimelineItem[]>(() => this.buildTimeline());

  ngOnInit(): void {
    const carId = this.car().id;
    this.schedulesService.watch(carId).subscribe((list) => this.schedulesState.set(list));
    this.faultsService.watch(carId).subscribe((list) => this.faultsState.set(list));
    this.repairsService.watch(carId).subscribe((list) => this.repairsState.set(list));
    this.expensesService.watch(carId).subscribe((list) => this.expensesState.set(list));
    this.fuelService.watch(carId).subscribe((list) => this.fuelState.set(list));
    this.mileageService.watch(carId).subscribe((list) => this.mileageState.set(list));
  }

  print(): void {
    window.print();
  }

  private buildTimeline(): TimelineItem[] {
    const items: TimelineItem[] = [];
    const toDate = (value: unknown): Date | null => {
      const d = (value as { toDate?: () => Date } | null)?.toDate?.() ?? null;
      return d;
    };

    for (const s of this.schedulesState()) {
      const date = toDate(s.lastDoneDate);
      if (!date) {
        continue;
      }
      const km = s.lastDoneKm !== null && s.lastDoneKm !== undefined ? ` на ${formatNumber(s.lastDoneKm)} км` : '';
      items.push({ date, icon: '🔧', title: s.name, subtitle: `Регламент выполнен${km}` });
    }

    for (const f of this.faultsState()) {
      const date = toDate(f.detectedAt);
      if (!date) {
        continue;
      }
      items.push({
        date,
        icon: '🛠',
        title: f.title,
        subtitle: f.status === 'fixed' ? 'Неисправность устранена' : 'Неисправность зафиксирована',
      });
    }

    for (const r of this.repairsState()) {
      const date = toDate(r.actualDate) ?? toDate(r.plannedDate);
      if (!date) {
        continue;
      }
      items.push({
        date,
        icon: '🔩',
        title: r.title,
        subtitle: r.status === 'done' ? 'Ремонт выполнен' : 'Ремонт запланирован',
        amount: (r.actualCost ?? r.plannedCost) ?? undefined,
        currency: this.currency(),
      });
    }

    for (const e of this.expensesState()) {
      if (e.linkedFuelId) {
        continue; // заправки показываются отдельной записью
      }
      const date = toDate(e.date);
      if (!date) {
        continue;
      }
      items.push({
        date,
        icon: '💰',
        title: e.title || this.typeLabels[e.type],
        subtitle: `Расход · ${this.typeLabels[e.type]}`,
        amount: e.amount,
        currency: e.currency,
      });
    }

    for (const f of this.fuelState()) {
      const date = toDate(f.date);
      if (!date) {
        continue;
      }
      items.push({
        date,
        icon: '⛽',
        title: `Заправка ${f.liters} л`,
        subtitle: `Одометр: ${formatNumber(f.odometerKm)} км`,
        amount: f.totalCost,
        currency: this.currency(),
      });
    }

    for (const m of this.mileageState()) {
      const date = toDate(m.date);
      if (!date) {
        continue;
      }
      items.push({
        date,
        icon: '🧭',
        title: `Пробег: ${formatNumber(m.odometerKm)} км`,
        subtitle: m.source === 'fuel' ? 'Замер из заправки' : 'Замер',
      });
    }

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
