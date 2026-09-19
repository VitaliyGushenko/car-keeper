import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { CarsService } from '../../core/cars.service';
import { CatalogService } from '../../core/catalog.service';
import { ExpensesService } from '../../core/expenses.service';
import { EXPENSE_TYPE_LABELS } from '../../core/expense-summary';
import { formatMoney, formatNumber, formatDate } from '../../core/format';
import { Car, Expense, Fault, MaintenanceSchedule } from '../../core/models';
import { FaultsService } from '../../core/faults.service';
import { ScheduleStatusInfo, scheduleStatus } from '../../core/schedule-status';
import { SchedulesService } from '../../core/schedules.service';
import { formatInterval } from '../../core/schedule-status';
import { UiBadge } from '../../ui/badge.component';
import { UiButton } from '../../ui/button.directive';
import { UiEmptyState } from '../../ui/empty-state.component';
import { UiSpinner } from '../../ui/spinner.component';
import { UiStatTile } from '../../ui/stat-tile.component';

interface ScheduleRow {
  car: Car;
  schedule: MaintenanceSchedule;
  info: ScheduleStatusInfo;
}

interface FaultRow {
  car: Car;
  fault: Fault;
}

@Component({
  selector: 'ck-dashboard',
  imports: [RouterLink, UiBadge, UiButton, UiEmptyState, UiSpinner, UiStatTile],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.less',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DashboardComponent {
  readonly carsService = inject(CarsService);
  private readonly schedulesService = inject(SchedulesService);
  private readonly faultsService = inject(FaultsService);
  private readonly expensesService = inject(ExpensesService);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);

  // <model-viewer> подгружается отдельным чанком (общим со страницей авто).
  constructor() {
    void import('@google/model-viewer');
  }

  readonly formatNumber = formatNumber;
  readonly formatMoney = formatMoney;
  readonly formatDate = formatDate;
  readonly formatInterval = formatInterval;

  /** Валюта из профиля — реактивно. */
  readonly defaultCurrency = computed(() => this.auth.profile()?.settings?.currency ?? 'RUB');

  private readonly cars$ = toObservable(this.carsService.cars);

  /** Строки «(авто, элемент)» по всем авто пользователя. */
  private readonly perCarItems = <T>(
    watch: (carId: string) => Observable<T[]>,
  ): Observable<{ car: Car; item: T }[]> =>
    this.cars$.pipe(
      switchMap((cars) =>
        cars.length === 0
          ? of([])
          : combineLatest(
              cars.map((car) => watch(car.id).pipe(map((items) => items.map((item) => ({ car, item }))))),
            ),
      ),
      map((groups) => groups.flat()),
    );

  private readonly scheduleRows = toSignal(
    this.perCarItems((id) => this.schedulesService.watch(id)),
    { initialValue: [] as { car: Car; item: MaintenanceSchedule }[] },
  );

  private readonly faultRows = toSignal(this.perCarItems((id) => this.faultsService.watch(id)), {
    initialValue: [] as { car: Car; item: Fault }[],
  });

  private readonly expenseRows = toSignal(this.perCarItems((id) => this.expensesService.watch(id)), {
    initialValue: [] as { car: Car; item: Expense }[],
  });

  /** Просроченные и приближающиеся регламенты по всем авто. */
  readonly scheduleIssues = computed<ScheduleRow[]>(() => {
    const now = new Date();
    return this.scheduleRows()
      .map(({ car, item }) => ({
        car,
        schedule: item,
        info: scheduleStatus(item, car.mileageKm, now),
      }))
      .filter((row) => row.info.status === 'overdue' || row.info.status === 'due-soon')
      .sort(
        (a, b) =>
          (a.info.status === 'overdue' ? 0 : 1) - (b.info.status === 'overdue' ? 0 : 1) ||
          b.info.progress - a.info.progress,
      )
      .slice(0, 6);
  });

  readonly overdueSchedulesCount = computed(
    () =>
      this.scheduleRows().filter(
        (row) => scheduleStatus(row.item, row.car.mileageKm).status === 'overdue',
      ).length,
  );

  readonly openFaults = computed<FaultRow[]>(() =>
    this.faultRows()
      .map(({ car, item }) => ({ car, fault: item }))
      .filter((row) => row.fault.status !== 'fixed')
      .sort((a, b) => this.severityWeight(b.fault.severity) - this.severityWeight(a.fault.severity))
      .slice(0, 6),
  );

  readonly openFaultsCount = computed(
    () => this.faultRows().filter((row) => row.item.status !== 'fixed').length,
  );

  readonly monthExpensesTotal = computed(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.expenseRows()
      .filter((row) => row.item.currency === this.defaultCurrency())
      .filter((row) => {
        const date = row.item.date?.toDate?.() ?? null;
        return date ? date >= monthStart : false;
      })
      .reduce((sum, row) => sum + (row.item.amount || 0), 0);
  });

  /** Бейджи на карточках авто: сколько просроченных ТО и открытых поломок. */
  readonly carBadges = computed(() => {
    const map = new Map<string, { overdue: number; faults: number }>();
    for (const car of this.carsService.cars()) {
      map.set(car.id, { overdue: 0, faults: 0 });
    }
    for (const row of this.scheduleRows()) {
      if (scheduleStatus(row.item, row.car.mileageKm).status === 'overdue') {
        const entry = map.get(row.car.id);
        if (entry) {
          entry.overdue++;
        }
      }
    }
    for (const row of this.faultRows()) {
      if (row.item.status !== 'fixed') {
        const entry = map.get(row.car.id);
        if (entry) {
          entry.faults++;
        }
      }
    }
    return map;
  });

  carPhoto(carId: string): string | null {
    return this.carsService.carById(carId)?.photos[0]?.url ?? null;
  }

  /** 3D-модель: своя загрузка имеет приоритет над каталогом. */
  modelUrl(carId: string): string | null {
    const car = this.carsService.carById(carId);
    if (!car) {
      return null;
    }
    return car.customModel?.url ?? this.catalog.findModelByKey(car.modelKey)?.modelUrl ?? null;
  }

  private severityWeight(severity: Fault['severity']): number {
    return { low: 0, medium: 1, high: 2, critical: 3 }[severity];
  }
}
