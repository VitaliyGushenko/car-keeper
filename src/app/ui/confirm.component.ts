import { Component, input, output } from '@angular/core';

import { UiButton } from './button.directive';

/**
 * Диалог подтверждения действия (в т.ч. с опасным — красной — кнопкой):
 * `<ck-confirm [open]="…" title="Удалить?" message="…" confirmText="Удалить" [danger]="true" … />`
 */
@Component({
  selector: 'ck-confirm',
  imports: [UiButton],
  template: `
    @if (open()) {
      <div class="ck-overlay" (mousedown)="onOverlay($event)">
        <div class="ck-confirm" role="alertdialog" aria-modal="true">
          <h3>{{ title() }}</h3>
          <p class="muted">{{ message() }}</p>
          <div class="ck-confirm-actions">
            <button type="button" ckButton (click)="cancelled.emit()">Отмена</button>
            <button type="button" [ckButton]="danger() ? 'danger' : 'primary'"
                    (click)="confirmed.emit()">{{ confirmText() }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .ck-overlay {
        position: fixed;
        inset: 0;
        z-index: 110;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgb(8 10 14 / 62%);
        backdrop-filter: blur(3px);
      }

      .ck-confirm {
        width: 100%;
        max-width: 400px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-elev);
        box-shadow: var(--shadow);
        padding: 20px;
      }

      .ck-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 18px;
      }

      @media (max-width: 640px) {
        .ck-overlay {
          padding: 10px;
        }

        .ck-confirm {
          max-width: none;
        }
      }
    `,
  ],
  host: {
    '(document:keydown.escape)': 'cancelled.emit()',
  },
})
export class UiConfirm {
  readonly open = input.required<boolean>();
  readonly title = input('Вы уверены?');
  readonly message = input('');
  readonly confirmText = input('Подтвердить');
  readonly danger = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancelled.emit();
    }
  }
}
