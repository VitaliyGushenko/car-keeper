import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { defer } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import '@google/model-viewer';

import { CarsService } from '../../core/cars.service';
import { ToastService } from '../../ui/toast.service';
import { CatalogService } from '../../core/catalog.service';
import { formatNumber, formatRelativeDate, formatDate } from '../../core/format';
import { MaintenanceSchedule, Fault, StoredFile } from '../../core/models';
import { SchedulesService } from '../../core/schedules.service';
import { FaultsService } from '../../core/faults.service';
import { SchedulesTabComponent } from './schedules-tab.component';
import { FaultsTabComponent } from './faults-tab.component';
import { ExpensesTabComponent } from './expenses-tab.component';
import { FuelTabComponent } from './fuel-tab.component';
import { DocumentsTabComponent } from './documents-tab.component';
import { FuelService } from '../../core/fuel.service';
import { DocumentsService } from '../../core/documents.service';
import { FuelEntry, VehicleDocument } from '../../core/models';
import { expiringOrExpired } from '../../core/doc-status';
import { UiBadge } from '../../ui/badge.component';
import { UiButton } from '../../ui/button.directive';
import { UiConfirm } from '../../ui/confirm.component';
import { UiDialog } from '../../ui/dialog.component';
import { UiEmptyState } from '../../ui/empty-state.component';
import { UiSpinner } from '../../ui/spinner.component';
import { UiTabs, UiTab } from '../../ui/tabs.component';

@Component({
  selector: 'ck-car-detail',
  imports: [
    FormsModule,
    RouterLink,
    UiButton,
    UiConfirm,
    UiDialog,
    UiEmptyState,
    UiSpinner,
    UiTabs,
    SchedulesTabComponent,
    FaultsTabComponent,
    ExpensesTabComponent,
    FuelTabComponent,
    DocumentsTabComponent,
  ],
  templateUrl: './car-detail.component.html',
  styleUrl: './car-detail.component.less',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CarDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly carsService = inject(CarsService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);

  private readonly paramMap = toSignal(this.route.paramMap);
  readonly carId = computed(() => this.paramMap()?.get('id') ?? '');
  readonly car = computed(() => this.carsService.carById(this.carId()));

  private readonly schedulesService = inject(SchedulesService);
  private readonly faultsService = inject(FaultsService);
  private readonly fuelService = inject(FuelService);
  private readonly documentsService = inject(DocumentsService);
  /** Регламенты и неисправности нужны здесь для счётчиков на вкладках. */
  private readonly schedules = toSignal(
    defer(() => this.schedulesService.watch(this.carId())),
    { initialValue: [] as MaintenanceSchedule[] },
  );
  private readonly openFaultsCount = toSignal(
    defer(() => this.faultsService.watch(this.carId())),
    { initialValue: [] as Fault[] },
  );

  private readonly fuelEntries = toSignal(
    defer(() => this.fuelService.watch(this.carId())),
    { initialValue: [] as FuelEntry[] },
  );
  private readonly documents = toSignal(
    defer(() => this.documentsService.watch(this.carId())),
    { initialValue: [] as VehicleDocument[] },
  );

  readonly activeTab = signal('overview');

  readonly tabs = computed<UiTab[]>(() => [
    { key: 'overview', label: 'Обзор' },
    { key: 'schedules', label: 'Регламенты', badge: this.schedules().length },
    {
      key: 'faults',
      label: 'Неисправности',
      badge: this.openFaultsCount().filter((f) => f.status !== 'fixed').length,
    },
    { key: 'expenses', label: 'Расходы' },
  ]);

  /** Фото для полноэкранного просмотра. */
  readonly lightboxPhoto = signal<StoredFile | null>(null);

  readonly mileageDialogOpen = signal(false);
  mileageValue: number | null = null;
  mileageDate = '';

  readonly deleteConfirmOpen = signal(false);

  /** 3D-модель: своя загрузка имеет приоритет над каталогом. */
  readonly modelUrl = computed(
    () => this.car()?.customModel?.url ?? this.catalog.findModelByKey(this.car()?.modelKey)?.modelUrl ?? null,
  );
  readonly catalogModel = computed(() => this.catalog.findModelByKey(this.car()?.modelKey));
  readonly modelBusy = signal(false);

  readonly formatNumber = formatNumber;
  readonly formatRelativeDate = formatRelativeDate;
  readonly formatDate = formatDate;

  async onModelFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const car = this.car();
    if (!file || !car || this.modelBusy()) {
      return;
    }
    this.modelBusy.set(true);
    try {
      await this.carsService.uploadCustomModel(car.id, file);
    } finally {
      this.modelBusy.set(false);
    }
  }

  async removeCustomModel(): Promise<void> {
    const car = this.car();
    if (car) {
      await this.carsService.removeCustomModel(car.id);
    }
  }

  openMileageDialog(): void {
    const car = this.car();
    if (!car) {
      return;
    }
    this.mileageValue = car.mileageKm;
    this.mileageDate = formatRelativeDate(car.mileageUpdatedAt) === '—' ? '' : this.todayInput();
    this.mileageDialogOpen.set(true);
  }

  async saveMileage(): Promise<void> {
    const car = this.car();
    if (!car || this.mileageValue === null || this.mileageValue < 0) {
      return;
    }
    this.mileageDialogOpen.set(false);
    await this.carsService.updateMileage(car.id, this.mileageValue, this.mileageDate);
    this.toast.success('Пробег обновлён');
  }

  async deleteCar(): Promise<void> {
    const car = this.car();
    if (!car) {
      return;
    }
    this.deleteConfirmOpen.set(false);
    await this.carsService.deleteCar(car);
    this.toast.success('Автомобиль удалён');
    await this.router.navigate(['/']);
  }

  private todayInput(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-${dd}`;
  }
}
