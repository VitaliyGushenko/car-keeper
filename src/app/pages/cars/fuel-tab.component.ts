import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { FuelService } from '../../core/fuel.service';
import { fuelStats } from '../../core/fuel-stats';
import { formatMoney, formatDate, formatNumber, toDateInputValue, dateInputToTimestamp } from '../../core/format';
import { Car, FuelEntry } from '../../core/models';
import { ToastService } from '../../ui/toast.service';
import { UiBadge } from '../../ui/badge.component';
import { UiButton } from '../../ui/button.directive';
import { UiConfirm } from '../../ui/confirm.component';
import { UiDialog } from '../../ui/dialog.component';
import { UiEmptyState } from '../../ui/empty-state.component';
import { UiStatTile } from '../../ui/stat-tile.component';

@Component({
  selector: 'ck-fuel-tab',
  imports: [FormsModule, UiBadge, UiButton, UiConfirm, UiDialog, UiEmptyState, UiStatTile],
  templateUrl: './fuel-tab.component.html',
  styleUrl: './fuel-tab.component.less',
})
export class FuelTabComponent implements OnInit {
  readonly car = input.required<Car>();

  private readonly fuelService = inject(FuelService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly fuelState = signal<FuelEntry[]>([]);
  readonly entries = this.fuelState.asReadonly();

  readonly currency = computed(() => this.auth.profile()?.settings?.currency ?? 'RUB');

  readonly stats = computed(() => fuelStats(this.fuelState()));

  readonly sorted = computed(() =>
    [...this.fuelState()].sort((a, b) => b.odometerKm - a.odometerKm),
  );

  readonly busy = signal(false);
  readonly dialogOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  fuelDate = '';
  fuelOdometer: number | null = null;
  fuelLiters: number | null = null;
  fuelPrice: number | null = null;
  fuelTotal: number | null = null;
  fuelFullTank = true;
  fuelStation = '';

  readonly removeConfirm = signal<FuelEntry | null>(null);

  readonly formatMoney = formatMoney;
  readonly formatDate = formatDate;
  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    this.fuelService.watch(this.car().id).subscribe({
      next: (list) => this.fuelState.set(list),
      error: (error) => console.warn('fuel: ошибка загрузки', error),
    });
  }

  maxConsumption(): number {
    return Math.max(...this.stats().consumptions.map((c) => c.consumption), 1);
  }

  openAdd(): void {
    this.editingId.set(null);
    this.fuelDate = toDateInputValue(new Date());
    this.fuelOdometer = this.car().mileageKm;
    this.fuelLiters = null;
    this.fuelPrice = null;
    this.fuelTotal = null;
    this.fuelFullTank = true;
    this.fuelStation = '';
    this.dialogOpen.set(true);
  }

  openEdit(entry: FuelEntry): void {
    this.editingId.set(entry.id);
    this.fuelDate = toDateInputValue(entry.date);
    this.fuelOdometer = entry.odometerKm;
    this.fuelLiters = entry.liters;
    this.fuelPrice = entry.pricePerLiter ?? null;
    this.fuelTotal = entry.totalCost;
    this.fuelFullTank = entry.fullTank;
    this.fuelStation = entry.gasStation ?? '';
    this.dialogOpen.set(true);
  }

  onAmountInput(): void {
    if (this.fuelLiters !== null && this.fuelPrice !== null) {
      this.fuelTotal = Math.round(this.fuelLiters * this.fuelPrice * 100) / 100;
    }
  }

  async save(): Promise<void> {
    if (this.busy() || this.fuelLiters === null || this.fuelLiters <= 0 || this.fuelOdometer === null) {
      return;
    }
    this.busy.set(true);
    try {
      const draft = {
        date: dateInputToTimestamp(this.fuelDate),
        odometerKm: this.fuelOdometer,
        liters: this.fuelLiters,
        pricePerLiter: this.fuelPrice,
        totalCost: this.fuelTotal ?? 0,
        fullTank: this.fuelFullTank,
        gasStation: this.fuelStation.trim() || undefined,
      };
      const editing = this.editingId();
      if (editing) {
        await this.fuelService.update(this.car().id, editing, draft, this.currency());
        this.toast.success('Заправка сохранена');
      } else {
        await this.fuelService.create(this.car().id, draft, this.currency());
        this.toast.success('Заправка добавлена, расход «Топливо» создан');
      }
      this.dialogOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  async removeConfirmed(): Promise<void> {
    const entry = this.removeConfirm();
    if (!entry) {
      return;
    }
    this.removeConfirm.set(null);
    await this.fuelService.remove(this.car().id, entry);
    this.toast.success('Заправка и связанный расход удалены');
  }
}
