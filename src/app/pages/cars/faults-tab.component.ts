import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { formatMoney, formatDate, toDateInputValue } from '../../core/format';
import { Car, Fault, FaultSeverity, Repair } from '../../core/models';
import { FaultsService } from '../../core/faults.service';
import { RepairsService } from '../../core/repairs.service';
import { FaultCardComponent } from './fault-card.component';
import { UiBadgeTone } from '../../ui/badge.component';
import { UiButton } from '../../ui/button.directive';
import { UiConfirm } from '../../ui/confirm.component';
import { UiDialog } from '../../ui/dialog.component';
import { UiEmptyState } from '../../ui/empty-state.component';

const SEVERITY_LABELS: Record<FaultSeverity, string> = {
  low: 'Незначительная',
  medium: 'Средняя',
  high: 'Высокая',
  critical: 'Критичная',
};

const SEVERITY_TONES: Record<FaultSeverity, UiBadgeTone> = {
  low: 'info',
  medium: 'warn',
  high: 'accent',
  critical: 'danger',
};

@Component({
  selector: 'ck-faults-tab',
  imports: [FormsModule, UiButton, UiConfirm, UiDialog, UiEmptyState, FaultCardComponent],
  templateUrl: './faults-tab.component.html',
  styleUrl: './faults-tab.component.less',
})
export class FaultsTabComponent implements OnInit {
  readonly car = input.required<Car>();

  private readonly faultsService = inject(FaultsService);
  private readonly repairsService = inject(RepairsService);
  private readonly auth = inject(AuthService);

  // Подписка в ngOnInit: input.required ещё недоступен в конструкторе (NG0950).
  private readonly faultsState = signal<Fault[]>([]);
  private readonly repairsState = signal<Repair[]>([]);

  readonly faults = this.faultsState.asReadonly();
  readonly repairs = this.repairsState.asReadonly();

  readonly currency = this.auth.profile()?.settings?.currency ?? 'RUB';

  readonly openFaults = computed(() =>
    this.faults()
      .filter((f) => f.status !== 'fixed')
      .sort((a, b) => this.severityWeight(b.severity) - this.severityWeight(a.severity)),
  );
  readonly fixedFaults = computed(() =>
    this.faults()
      .filter((f) => f.status === 'fixed')
      .sort((a, b) => this.toMillis(b.detectedAt) - this.toMillis(a.detectedAt)),
  );

  repairsOf(faultId: string): Repair[] {
    return this.repairs()
      .filter((r) => r.faultId === faultId)
      .sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt));
  }

  readonly severityLabels = SEVERITY_LABELS;
  readonly severityTones = SEVERITY_TONES;
  readonly severityKeys = Object.keys(SEVERITY_LABELS) as FaultSeverity[];
  readonly formatMoney = formatMoney;
  readonly formatDate = formatDate;
  readonly toDateInputValue = toDateInputValue;

  readonly busy = signal(false);

  /** Диалог неисправности (добавление/редактирование). */
  readonly faultDialogOpen = signal(false);
  readonly editingFaultId = signal<string | null>(null);
  faultTitle = '';
  faultDescription = '';
  faultSeverity: FaultSeverity = 'medium';
  faultDetectedAt = '';

  /** Диалог ремонта (добавление/редактирование). */
  readonly repairDialogOpen = signal(false);
  readonly editingRepairId = signal<string | null>(null);
  repairFaultId = signal<string | null>(null);
  repairTitle = '';
  repairWorks = '';
  repairPlannedCost: number | null = null;
  repairPlannedDate = '';
  repairNotes = '';

  /** Диалог подтверждения ремонта. */
  readonly confirmDialogOpen = signal(false);
  repairToConfirm = signal<Repair | null>(null);
  actualCost: number | null = null;
  actualDate = '';
  confirmNotes = '';

  readonly faultRemoveConfirm = signal<Fault | null>(null);
  readonly repairRemoveConfirm = signal<Repair | null>(null);

  ngOnInit(): void {
    const carId = this.car().id;
    this.faultsService.watch(carId).subscribe({
      next: (list) => this.faultsState.set(list),
      error: (error) => console.warn('faults: не удалось загрузить неисправности', error),
    });
    this.repairsService.watch(carId).subscribe({
      next: (list) => this.repairsState.set(list),
      error: (error) => console.warn('repairs: не удалось загрузить ремонты', error),
    });
  }

  openAddFault(): void {
    this.editingFaultId.set(null);
    this.faultTitle = '';
    this.faultDescription = '';
    this.faultSeverity = 'medium';
    this.faultDetectedAt = toDateInputValue(new Date());
    this.faultDialogOpen.set(true);
  }

  openEditFault(fault: Fault): void {
    this.editingFaultId.set(fault.id);
    this.faultTitle = fault.title;
    this.faultDescription = fault.description ?? '';
    this.faultSeverity = fault.severity;
    this.faultDetectedAt = toDateInputValue(fault.detectedAt);
    this.faultDialogOpen.set(true);
  }

  async saveFault(): Promise<void> {
    if (!this.faultTitle.trim() || this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const draft = this.faultsService.draftFromForm({
        title: this.faultTitle,
        description: this.faultDescription,
        severity: this.faultSeverity,
        detectedAt: this.faultDetectedAt,
      });
      const editing = this.editingFaultId();
      const carId = this.car().id;
      if (editing) {
        await this.faultsService.update(carId, editing, draft);
      } else {
        await this.faultsService.create(carId, draft);
      }
      this.faultDialogOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  openAddRepair(faultId: string): void {
    this.repairFaultId.set(faultId);
    this.editingRepairId.set(null);
    this.repairTitle = '';
    this.repairWorks = '';
    this.repairPlannedCost = null;
    this.repairPlannedDate = '';
    this.repairNotes = '';
    this.repairDialogOpen.set(true);
  }

  openEditRepair(repair: Repair): void {
    this.repairFaultId.set(repair.faultId);
    this.editingRepairId.set(repair.id);
    this.repairTitle = repair.title;
    this.repairWorks = repair.works ?? '';
    this.repairPlannedCost = repair.plannedCost ?? null;
    this.repairPlannedDate = toDateInputValue(repair.plannedDate);
    this.repairNotes = repair.notes ?? '';
    this.repairDialogOpen.set(true);
  }

  async saveRepair(): Promise<void> {
    if (!this.repairTitle.trim() || !this.repairFaultId() || this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const draft = this.repairsService.draftFromForm({
        title: this.repairTitle,
        works: this.repairWorks,
        plannedCost: this.repairPlannedCost,
        plannedDate: this.repairPlannedDate,
        notes: this.repairNotes,
      });
      const carId = this.car().id;
      const editing = this.editingRepairId();
      if (editing) {
        await this.repairsService.update(carId, editing, draft);
      } else {
        await this.repairsService.create(carId, this.repairFaultId()!, draft);
      }
      this.repairDialogOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  openConfirmRepair(repair: Repair): void {
    this.repairToConfirm.set(repair);
    this.actualCost = repair.plannedCost ?? null;
    this.actualDate = toDateInputValue(new Date());
    this.confirmNotes = repair.notes ?? '';
    this.confirmDialogOpen.set(true);
  }

  async doConfirmRepair(): Promise<void> {
    const repair = this.repairToConfirm();
    if (!repair || this.actualCost === null || this.actualCost < 0 || this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.repairsService.confirmDone(
        this.car().id,
        repair,
        this.actualCost,
        this.actualDate,
        this.confirmNotes,
      );
      this.confirmDialogOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  async markFault(status: 'in-work' | 'fixed', fault: Fault): Promise<void> {
    await this.faultsService.setStatus(this.car().id, fault.id, status);
  }

  async removeFaultConfirmed(): Promise<void> {
    const fault = this.faultRemoveConfirm();
    if (!fault) {
      return;
    }
    this.faultRemoveConfirm.set(null);
    this.busy.set(true);
    try {
      // Удаляем и ремонты этой неисправности.
      for (const repair of this.repairsOf(fault.id)) {
        await this.repairsService.remove(this.car().id, repair.id);
      }
      await this.faultsService.remove(this.car().id, fault.id);
    } finally {
      this.busy.set(false);
    }
  }

  async removeRepairConfirmed(): Promise<void> {
    const repair = this.repairRemoveConfirm();
    if (!repair) {
      return;
    }
    this.repairRemoveConfirm.set(null);
    await this.repairsService.remove(this.car().id, repair.id);
  }

  private severityWeight(severity: FaultSeverity): number {
    return { low: 0, medium: 1, high: 2, critical: 3 }[severity];
  }

  private toMillis(value: unknown): number {
    const anyValue = value as { toMillis?: () => number } | null | undefined;
    return anyValue?.toMillis ? anyValue.toMillis() : 0;
  }
}
