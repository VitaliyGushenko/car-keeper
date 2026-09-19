import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { formatDate, formatNumber, toDateInputValue } from '../../core/format';
import { Car, MaintenanceSchedule, ScheduleDraft, ScheduleStatus } from '../../core/models';
import { ScheduleStatusInfo, formatInterval, scheduleStatus } from '../../core/schedule-status';
import { SchedulesService } from '../../core/schedules.service';
import { ToastService } from '../../ui/toast.service';
import { UiBadge, UiBadgeTone } from '../../ui/badge.component';
import { UiButton } from '../../ui/button.directive';
import { UiConfirm } from '../../ui/confirm.component';
import { UiDialog } from '../../ui/dialog.component';
import { UiEmptyState } from '../../ui/empty-state.component';

const STATUS_LABELS: Record<ScheduleStatus | 'unknown', string> = {
  overdue: 'Просрочено',
  'due-soon': 'Скоро',
  ok: 'В порядке',
  unknown: 'Не выполнялось',
};

const STATUS_TONES: Record<ScheduleStatus | 'unknown', UiBadgeTone> = {
  overdue: 'danger',
  'due-soon': 'warn',
  ok: 'ok',
  unknown: 'muted',
};

const STATUS_ORDER: Record<ScheduleStatus | 'unknown', number> = {
  overdue: 0,
  'due-soon': 1,
  ok: 2,
  unknown: 3,
};

@Component({
  selector: 'ck-schedules-tab',
  imports: [FormsModule, UiBadge, UiButton, UiConfirm, UiDialog, UiEmptyState],
  templateUrl: './schedules-tab.component.html',
  styleUrl: './schedules-tab.component.less',
})
export class SchedulesTabComponent implements OnInit {
  readonly car = input.required<Car>();

  private readonly schedulesService = inject(SchedulesService);
  private readonly toast = inject(ToastService);
  private readonly schedulesState = signal<MaintenanceSchedule[]>([]);
  private doneSchedule: MaintenanceSchedule | null = null;

  readonly formatNumber = formatNumber;
  readonly formatDate = formatDate;
  readonly formatInterval = formatInterval;

  readonly sorted = computed(() => {
    const mileage = this.car().mileageKm;
    return this.schedulesState()
      .map((schedule) => ({ schedule, info: scheduleStatus(schedule, mileage) }))
      .sort(
        (a, b) =>
          STATUS_ORDER[a.info.status] - STATUS_ORDER[b.info.status] ||
          b.info.progress - a.info.progress,
      );
  });

  /** Диалог добавления/редактирования. */
  readonly dialogOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  name = '';
  intervalKm: number | null = null;
  intervalMonths: number | null = null;
  notes = '';

  /** Диалог «выполнено». */
  readonly doneDialogOpen = signal(false);
  doneKm: number | null = null;
  doneDate = '';

  readonly removeConfirm = signal<MaintenanceSchedule | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    this.schedulesService.watch(this.car().id).subscribe((list) => {
      this.schedulesState.set(list);
    });
  }

  statusLabel(info: ScheduleStatusInfo): string {
    return STATUS_LABELS[info.status];
  }

  statusTone(info: ScheduleStatusInfo): UiBadgeTone {
    return STATUS_TONES[info.status];
  }

  /** «на 55 000 км · до 15.03.2027». */
  nextDue(info: ScheduleStatusInfo): string {
    const parts: string[] = [];
    if (info.km?.dueKm !== undefined) {
      parts.push(`на ${formatNumber(info.km.dueKm)} км`);
    }
    if (info.time?.dueDate) {
      parts.push(`до ${formatDate(info.time.dueDate)}`);
    }
    return parts.join(' · ');
  }

  openAdd(): void {
    this.editingId.set(null);
    this.name = '';
    this.intervalKm = null;
    this.intervalMonths = null;
    this.notes = '';
    this.dialogOpen.set(true);
  }

  openEdit(schedule: MaintenanceSchedule): void {
    this.editingId.set(schedule.id);
    this.name = schedule.name;
    this.intervalKm = schedule.intervalKm ?? null;
    this.intervalMonths = schedule.intervalMonths ?? null;
    this.notes = schedule.notes ?? '';
    this.dialogOpen.set(true);
  }

  async saveDialog(): Promise<void> {
    if (!this.name.trim() || this.busy()) {
      return;
    }
    this.busy.set(true);
    const draft: ScheduleDraft = {
      name: this.name.trim(),
      intervalKm: this.intervalKm && this.intervalKm > 0 ? this.intervalKm : null,
      intervalMonths: this.intervalMonths && this.intervalMonths > 0 ? this.intervalMonths : null,
      notes: this.notes.trim(),
      lastDoneKm: null,
      lastDoneDate: null,
    };
    try {
      const carId = this.car().id;
      const editing = this.editingId();
      if (editing) {
        // При редактировании историю выполнения не трогаем.
        const current = this.schedulesState().find((s) => s.id === editing);
        draft.lastDoneKm = current?.lastDoneKm ?? null;
        draft.lastDoneDate = current?.lastDoneDate ?? null;
        await this.schedulesService.update(carId, editing, draft);
        this.toast.success('Регламент сохранён');
      } else {
        await this.schedulesService.create(carId, draft);
        this.toast.success('Регламент добавлен');
      }
      this.dialogOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  openDone(schedule: MaintenanceSchedule): void {
    this.doneSchedule = schedule;
    this.doneKm = this.car().mileageKm;
    this.doneDate = toDateInputValue(new Date());
    this.doneDialogOpen.set(true);
  }

  async confirmDone(): Promise<void> {
    const schedule = this.doneSchedule;
    if (!schedule || this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.schedulesService.markDone(this.car().id, schedule.id, this.doneKm, this.doneDate);
      this.toast.success('Отмечено как выполненное');
      this.doneDialogOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  async removeConfirmed(): Promise<void> {
    const schedule = this.removeConfirm();
    if (!schedule) {
      return;
    }
    this.removeConfirm.set(null);
    await this.schedulesService.remove(this.car().id, schedule.id);
    this.toast.success('Регламент удалён');
  }
}
