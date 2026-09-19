import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { DocumentsService } from '../../core/documents.service';
import { daysLeftText, documentStatus, expiringOrExpired } from '../../core/doc-status';
import { formatMoney, formatDate, toDateInputValue, dateInputToTimestamp } from '../../core/format';
import { Car, StoredFile, VehicleDocument } from '../../core/models';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../ui/toast.service';
import { UiBadge, UiBadgeTone } from '../../ui/badge.component';
import { UiButton } from '../../ui/button.directive';
import { UiConfirm } from '../../ui/confirm.component';
import { UiDialog } from '../../ui/dialog.component';
import { UiEmptyState } from '../../ui/empty-state.component';

const STATUS_LABELS: Record<string, string> = {
  active: 'Действует',
  expiring: 'Истекает',
  expired: 'Истёк',
};

const STATUS_TONES: Record<string, UiBadgeTone> = {
  active: 'ok',
  expiring: 'warn',
  expired: 'danger',
};

@Component({
  selector: 'ck-documents-tab',
  imports: [FormsModule, UiBadge, UiButton, UiConfirm, UiDialog, UiEmptyState],
  templateUrl: './documents-tab.component.html',
  styleUrl: './documents-tab.component.less',
})
export class DocumentsTabComponent implements OnInit {
  readonly car = input.required<Car>();

  private readonly documentsService = inject(DocumentsService);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly documentsState = signal<VehicleDocument[]>([]);
  readonly documents = this.documentsState.asReadonly();

  readonly currency = computed(() => this.auth.profile()?.settings?.currency ?? 'RUB');

  readonly statusLabels = STATUS_LABELS;
  readonly statusTones = STATUS_TONES;
  readonly documentStatus = documentStatus;
  readonly daysLeftText = daysLeftText;
  readonly formatMoney = formatMoney;
  readonly formatDate = formatDate;

  readonly busy = signal(false);
  readonly dialogOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  docTitle = '';
  docNumber = '';
  docStart = '';
  docEnd = '';
  docCost: number | null = null;
  docNotes = '';
  docCreateExpense = true;
  docPhotoFile: File | null = null;
  docPhoto = signal<StoredFile | null>(null);

  readonly removeConfirm = signal<VehicleDocument | null>(null);
  readonly photoView = signal<StoredFile | null>(null);

  readonly expiring = computed(() => expiringOrExpired(this.documentsState()));

  ngOnInit(): void {
    this.documentsService.watch(this.car().id).subscribe({
      next: (list) => this.documentsState.set(list),
      error: (error) => console.warn('documents: ошибка загрузки', error),
    });
  }

  openAdd(): void {
    this.editingId.set(null);
    this.docTitle = '';
    this.docNumber = '';
    this.docStart = toDateInputValue(new Date());
    this.docEnd = '';
    this.docCost = null;
    this.docNotes = '';
    this.docCreateExpense = true;
    this.docPhotoFile = null;
    this.docPhoto.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(document: VehicleDocument): void {
    this.editingId.set(document.id);
    this.docTitle = document.title;
    this.docNumber = document.number ?? '';
    this.docStart = toDateInputValue(document.startDate);
    this.docEnd = toDateInputValue(document.endDate);
    this.docCost = document.cost ?? null;
    this.docNotes = document.notes ?? '';
    this.docCreateExpense = false;
    this.docPhotoFile = null;
    this.docPhoto.set(document.photo ?? null);
    this.dialogOpen.set(true);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.docPhotoFile = input.files?.[0] ?? null;
    input.value = '';
  }

  removePhotoFile(): void {
    this.docPhotoFile = null;
    this.docPhoto.set(null);
  }

  async save(): Promise<void> {
    if (!this.docTitle.trim() || this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const draft = {
        title: this.docTitle.trim(),
        number: this.docNumber.trim() || undefined,
        startDate: dateInputToTimestamp(this.docStart),
        endDate: dateInputToTimestamp(this.docEnd),
        cost: this.docCost,
        notes: this.docNotes.trim() || undefined,
        photo: this.docPhoto(),
      };
      const carId = this.car().id;
      if (this.docPhotoFile) {
        const uid = this.auth.user()?.uid;
        if (!uid) {
          throw new Error('Пользователь не авторизован');
        }
        const blob = await this.storage.compressImage(this.docPhotoFile, 1200, 0.75);
        const path = `cars/${uid}/${carId}/docs/${Date.now()}_doc.jpg`;
        const stored = await this.storage.uploadFile(path, blob, 'image/jpeg');
        draft.photo = stored;
        const old = this.docPhoto();
        if (old && old.path !== stored.path) {
          await this.storage.deleteFile(old.path).catch(() => null);
        }
      }
      const editing = this.editingId();
      if (editing) {
        await this.documentsService.update(carId, editing, draft);
        this.toast.success('Документ сохранён');
      } else {
        await this.documentsService.create(carId, draft, this.docCreateExpense, this.currency());
        this.toast.success('Документ добавлен');
      }
      this.dialogOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  async removeConfirmed(): Promise<void> {
    const document = this.removeConfirm();
    if (!document) {
      return;
    }
    this.removeConfirm.set(null);
    if (document.photo) {
      await this.storage.deleteFile(document.photo.path).catch(() => null);
    }
    await this.documentsService.remove(this.car().id, document);
    this.toast.success('Документ удалён');
  }
}
