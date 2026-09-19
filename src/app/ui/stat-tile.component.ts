import { Component, input } from '@angular/core';

/** Плитка-показатель: `<ck-stat-tile label="За месяц" value="12 400 ₽" hint="…" />`. */
@Component({
  selector: 'ck-stat-tile',
  template: `
    <div class="ck-stat card">
      <div class="ck-stat-label">{{ label() }}</div>
      <div class="ck-stat-value">{{ value() }}</div>
      @if (hint()) {
        <div class="faint">{{ hint() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .ck-stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 14px 16px;
      }

      .ck-stat-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
      }

      .ck-stat-value {
        font-size: 24px;
        font-weight: 700;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class UiStatTile {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input('');
}
