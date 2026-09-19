import { Component, input, output } from '@angular/core';

import { formatMoney, formatDate } from '../../core/format';
import { Fault, FaultSeverity, Repair } from '../../core/models';
import { UiBadge, UiBadgeTone } from '../../ui/badge.component';
import { UiButton } from '../../ui/button.directive';

/** Карточка неисправности со списком ремонтов (презентационный компонент). */
@Component({
  selector: 'ck-fault-card',
  imports: [UiBadge, UiButton],
  template: `
    <div class="card fault-card">
      <div class="row fault-head">
        <div class="grow">
          <div class="fault-title">{{ fault().title }}</div>
          <div class="faint">Обнаружено: {{ formatDate(fault().detectedAt) }}</div>
        </div>
        <ck-badge [tone]="severityTones()[fault().severity]">{{ severityLabels()[fault().severity] }}</ck-badge>
        <ck-badge [tone]="fault().status === 'fixed' ? 'ok' : fault().status === 'in-work' ? 'info' : 'warn'">
          {{ fault().status === 'fixed' ? 'Исправлена' : fault().status === 'in-work' ? 'В работе' : 'Открыта' }}
        </ck-badge>
      </div>

      @if (fault().description) {
        <p class="muted fault-desc">{{ fault().description }}</p>
      }
      @if (fault().status === 'fixed' && fault().resolvedAt) {
        <div class="faint">Закрыта: {{ formatDate(fault().resolvedAt) }}</div>
      }

      @if (repairs().length > 0) {
        <div class="repairs">
          @for (repair of repairs(); track repair.id) {
            <div class="repair-row">
              <div class="grow">
                <div class="repair-title">{{ repair.title }}</div>
                <div class="faint">
                  План: {{ repair.plannedCost ? formatMoney(repair.plannedCost, currency()) : '—' }}
                  {{ repair.plannedDate ? '· ' + formatDate(repair.plannedDate) : '' }}
                </div>
                @if (repair.status === 'done') {
                  <div class="repair-actual">
                    Факт: <b>{{ formatMoney(repair.actualCost, currency()) }}</b>
                    {{ repair.actualDate ? '· ' + formatDate(repair.actualDate) : '' }}
                  </div>
                }
              </div>
              <ck-badge [tone]="repair.status === 'done' ? 'ok' : 'accent'">
                {{ repair.status === 'done' ? 'Выполнен' : 'Запланирован' }}
              </ck-badge>
              <div class="repair-actions">
                @if (repair.status !== 'done') {
                  <button type="button" ckButton="primary" ckSmall (click)="repairConfirm.emit(repair)">
                    Подтвердить
                  </button>
                }
                <button type="button" ckButton="ghost" ckSmall (click)="repairEdit.emit(repair)">Изменить</button>
                <button type="button" ckButton="ghost" ckSmall (click)="repairRemove.emit(repair)">Удалить</button>
              </div>
            </div>
          }
        </div>
      }

      <div class="fault-actions">
        <button type="button" ckButton ckSmall (click)="repairAdd.emit()">+ Ремонт</button>
        @if (fault().status !== 'fixed') {
          <button type="button" ckButton="ghost" ckSmall (click)="faultFix.emit()">Исправлена</button>
        } @else {
          <button type="button" ckButton="ghost" ckSmall (click)="faultUnfix.emit()">Вернуть в работу</button>
        }
        <button type="button" ckButton="ghost" ckSmall (click)="faultEdit.emit()">Изменить</button>
        <button type="button" ckButton="ghost" ckSmall (click)="faultRemove.emit()">Удалить</button>
      </div>
    </div>
  `,
  styles: [
    `
      .fault-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .fault-title {
        font-weight: 600;
      }

      .fault-desc {
        margin: 0;
        white-space: pre-line;
      }

      .repairs {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .repair-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface-2);
        flex-wrap: wrap;
      }

      .repair-title {
        font-weight: 600;
        font-size: 14px;
      }

      .repair-actual {
        font-size: 14px;
        margin-top: 2px;
      }

      .repair-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .fault-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 2px;
      }
    `,
  ],
})
export class FaultCardComponent {
  readonly fault = input.required<Fault>();
  readonly repairs = input.required<Repair[]>();
  readonly currency = input('RUB');
  readonly severityLabels = input.required<Record<FaultSeverity, string>>();
  readonly severityTones = input.required<Record<FaultSeverity, UiBadgeTone>>();

  readonly repairAdd = output<void>();
  readonly repairEdit = output<Repair>();
  readonly repairConfirm = output<Repair>();
  readonly repairRemove = output<Repair>();
  readonly faultEdit = output<void>();
  readonly faultFix = output<void>();
  readonly faultUnfix = output<void>();
  readonly faultRemove = output<void>();

  readonly formatMoney = formatMoney;
  readonly formatDate = formatDate;
}
