import { Component, inject } from '@angular/core';
import { toastSlide } from './animations';

import { ToastService } from './toast.service';

/** Стек всплывающих уведомлений; монтируется один раз в корневом компоненте. */
@Component({
  selector: 'ck-toasts',
  animations: [toastSlide],
  template: `
    <div class="ck-toasts" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="ck-toast" [class.error]="toast.tone === 'error'" [@toastSlide]
             (click)="toastService.dismiss(toast.id)">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ck-toasts {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 300;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        pointer-events: none;
      }

      .ck-toast {
        pointer-events: auto;
        cursor: pointer;
        padding: 10px 18px;
        border-radius: 999px;
        background: var(--success);
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        box-shadow: var(--shadow);
        animation: ck-toast-in 0.2s ease;
      }

      .ck-toast.error {
        background: var(--danger);
      }

      @keyframes ck-toast-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
      }
    `,
  ],
})
export class UiToasts {
  readonly toastService = inject(ToastService);
}
