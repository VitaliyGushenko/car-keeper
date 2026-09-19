import { Component, input } from '@angular/core';

export type UiBadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'muted' | 'accent';

/** Цветная метка статуса: `<ck-badge tone="ok">В порядке</ck-badge>`. */
@Component({
  selector: 'ck-badge',
  template: `<span class="ck-badge" [class]="'ck-badge ' + tone()"><ng-content /></span>`,
  styles: [
    `
      .ck-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.4;
        white-space: nowrap;
      }

      .ok {
        background: var(--success-soft);
        color: var(--success);
      }

      .warn {
        background: var(--warning-soft);
        color: var(--warning);
      }

      .danger {
        background: var(--danger-soft);
        color: var(--danger);
      }

      .info {
        background: var(--info-soft);
        color: var(--info);
      }

      .accent {
        background: var(--accent-soft);
        color: var(--accent);
      }

      .muted {
        background: var(--surface-2);
        color: var(--text-muted);
      }
    `,
  ],
})
export class UiBadge {
  readonly tone = input<UiBadgeTone>('muted');
}
