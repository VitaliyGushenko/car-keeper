import { Component, booleanAttribute, input, output } from '@angular/core';

/**
 * Модальное окно: `<ck-dialog [open]="dlgOpen()" title="…" (closed)="dlgOpen.set(false)">…</ck-dialog>`.
 * Контент проецируется; закрытие — крестик, клик по фону или Escape.
 */
@Component({
  selector: 'ck-dialog',
  template: `
    @if (open()) {
      <div class="ck-overlay" (mousedown)="onOverlay($event)">
        <div class="ck-dialog" role="dialog" aria-modal="true" [attr.aria-label]="title()">
          <div class="ck-dialog-head">
            <h3>{{ title() }}</h3>
            <button type="button" class="btn-icon" aria-label="Закрыть" (click)="close()">✕</button>
          </div>
          <div class="ck-dialog-body">
            <ng-content />
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
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgb(8 10 14 / 62%);
        backdrop-filter: blur(3px);
      }

      .ck-dialog {
        width: 100%;
        max-width: 520px;
        max-height: calc(100vh - 40px);
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-elev);
        box-shadow: var(--shadow);
      }

      .ck-dialog-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--border);
      }

      .ck-dialog-head h3 {
        margin: 0;
      }

      .ck-dialog-body {
        padding: 18px;
        overflow-y: auto;
      }
    `,
  ],
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class UiDialog {
  readonly open = input.required<boolean>();
  readonly title = input('');
  readonly dismissable = input(true, { transform: booleanAttribute });

  readonly closed = output<void>();

  close(): void {
    if (this.open() && this.dismissable()) {
      this.closed.emit();
    }
  }

  onOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
