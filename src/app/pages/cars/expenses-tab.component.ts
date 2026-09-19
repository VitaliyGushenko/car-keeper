import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { ExpensesService } from '../../core/expenses.service';
import { EXPENSE_TYPE_LABELS, summarizeExpenses } from '../../core/expense-summary';
import { formatMoney, formatDate, formatNumber, toDateInputValue, dateInputToTimestamp } from '../../core/format';
import { Car, Expense, ExpenseDraft, ExpenseType, StoredFile } from '../../core/models';
import { StorageService } from '../../core/storage.service';
import { UiBadge, UiBadgeTone } from '../../ui/badge.component';
import { UiButton } from '../../ui/button.directive';
import { UiConfirm } from '../../ui/confirm.component';
import { UiDialog } from '../../ui/dialog.component';
import { UiEmptyState } from '../../ui/empty-state.component';
import { UiStatTile } from '../../ui/stat-tile.component';

const TYPE_TONES: Record<ExpenseType, UiBadgeTone> = {
  fuel: 'info',
  maintenance: 'accent',
  repair: 'danger',
  insurance: 'ok',
  tax: 'muted',
  other: 'muted',
};

const CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT', 'UAH', 'BYN'] as const;

@Component({
  selector: 'ck-expenses-tab',
  imports: [
    FormsModule,
    UiBadge,
    UiButton,
    UiConfirm,
    UiDialog,
    UiEmptyState,
    UiStatTile,
  ],
  templateUrl: './expenses-tab.component.html',
  styleUrl: './expenses-tab.component.less',
})
export class ExpensesTabComponent implements OnInit {
  readonly car = input.required<Car>();

  private readonly expensesService = inject(ExpensesService);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  // Подписка в ngOnInit: input.required ещё недоступен в конструкторе (NG0950).
  private readonly expensesState = signal<Expense[]>([]);
  readonly expenses = this.expensesState.asReadonly();

  readonly typeLabels = EXPENSE_TYPE_LABELS;
  readonly typeTones = TYPE_TONES;
  readonly typeKeys = Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[];
  readonly currencies = CURRENCIES;
  readonly formatMoney = formatMoney;
  readonly formatDate = formatDate;
  readonly formatNumber = formatNumber;

  readonly defaultCurrency = this.auth.profile()?.settings?.currency ?? 'RUB';

  readonly summary = computed(() => summarizeExpenses(this.expenses()));

  readonly sorted = computed(() =>
    [...this.expenses()].sort(
      (a, b) => this.toMillis(b.date) - this.toMillis(a.date),
    ),
  );

  readonly busy = signal(false);

  readonly dialogOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  /** Редактируемый расход — чтобы не потерять связь с ремонтом/регламентом при сохранении. */
  private editingExpense: Expense | null = null;
  expType: ExpenseType = 'fuel';
  expTitle = '';
  expAmount: number | null = null;
  expCurrency = 'RUB';
  expDate = '';
  expMileage: number | null = null;
  expNotes = '';
  receiptFile: File | null = null;
  receiptPreview = signal<StoredFile | null>(null);

  readonly removeConfirm = signal<Expense | null>(null);
  readonly receiptView = signal<StoredFile | null>(null);

  ngOnInit(): void {
    this.expensesService.watch(this.car().id).subscribe({
      next: (list) => this.expensesState.set(list),
      error: (error) => console.warn('expenses: не удалось загрузить расходы', error),
    });
  }

  openAdd(): void {
    this.editingId.set(null);
    this.editingExpense = null;
    this.expType = 'fuel';
    this.expTitle = '';
    this.expAmount = null;
    this.expCurrency = this.defaultCurrency;
    this.expDate = toDateInputValue(new Date());
    this.expMileage = this.car().mileageKm;
    this.expNotes = '';
    this.receiptFile = null;
    this.receiptPreview.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(expense: Expense): void {
    this.editingId.set(expense.id);
    this.editingExpense = expense;
    this.expType = expense.type;
    this.expTitle = expense.title ?? '';
    this.expAmount = expense.amount;
    this.expCurrency = expense.currency;
    this.expDate = toDateInputValue(expense.date);
    this.expMileage = expense.mileageAt ?? null;
    this.expNotes = expense.notes ?? '';
    this.receiptFile = null;
    this.receiptPreview.set(expense.receipt ?? null);
    this.dialogOpen.set(true);
  }

  onReceiptSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    inputEl.value = '';
    this.receiptFile = file;
  }

  removeReceiptFile(): void {
    this.receiptFile = null;
    this.receiptPreview.set(null);
  }

  async save(): Promise<void> {
    if (this.expAmount === null || this.expAmount < 0 || this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const draft: ExpenseDraft = {
        type: this.expType,
        title: this.expTitle.trim() || undefined,
        amount: this.expAmount,
        currency: this.expCurrency,
        date: dateInputToTimestamp(this.expDate),
        mileageAt: this.expMileage,
        notes: this.expNotes.trim() || undefined,
        receipt: this.receiptPreview(),
        linkedRepairId: this.editingExpense?.linkedRepairId ?? null,
        linkedScheduleId: this.editingExpense?.linkedScheduleId ?? null,
      };

      // Новый чек загружаем и заменяем старый файл.
      if (this.receiptFile) {
        const carId = this.car().id;
        const stored = await this.expensesService.uploadReceipt(carId, this.receiptFile);
        draft.receipt = stored;
        const old = this.receiptPreview();
        if (old && old.path !== stored.path) {
          await this.storage.deleteFile(old.path).catch(() => null);
        }
      }

      const carId = this.car().id;
      const editing = this.editingId();
      if (editing) {
        await this.expensesService.update(carId, editing, draft);
      } else {
        await this.expensesService.create(carId, draft);
      }
      this.dialogOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  async removeConfirmed(): Promise<void> {
    const expense = this.removeConfirm();
    if (!expense) {
      return;
    }
    this.removeConfirm.set(null);
    await this.expensesService.remove(this.car().id, expense);
  }

  maxMonthly(): number {
    return Math.max(...this.summary().monthly.map((m) => m.total), 1);
  }

  roundTotal(total: number): string {
    return Math.round(total).toLocaleString('ru-RU');
  }

  monthlyHeight(total: number): number {
    return Math.round((total / this.maxMonthly()) * 100);
  }

  private toMillis(value: unknown): number {
    const anyValue = value as { toMillis?: () => number } | null | undefined;
    return anyValue?.toMillis ? anyValue.toMillis() : 0;
  }
}
