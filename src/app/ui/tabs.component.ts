import { Component, input, output } from '@angular/core';

export interface UiTab {
  key: string;
  label: string;
  /** Необязательный счётчик рядом с подписью. */
  badge?: number | null;
}

/** Вкладки: `<ck-tabs [tabs]="tabs" [active]="tab()" (activeChange)="tab.set($event)" />`. */
@Component({
  selector: 'ck-tabs',
  template: `
    <div class="ck-tabs" role="tablist">
      @for (tab of tabs(); track tab.key) {
        <button type="button" role="tab" class="ck-tab"
                [class.active]="tab.key === active()"
                [attr.aria-selected]="tab.key === active()"
                (click)="activeChange.emit(tab.key)">
          {{ tab.label }}
          @if (tab.badge) {
            <span class="ck-tab-badge">{{ tab.badge }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      .ck-tabs {
        display: flex;
        gap: 4px;
        padding: 4px;
        border-radius: var(--radius-sm);
        background: var(--surface-2);
        overflow-x: auto;
      }

      .ck-tab {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 8px 14px;
        border: none;
        border-radius: var(--radius-xs);
        background: transparent;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-muted);
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .ck-tab:hover {
        color: var(--text);
      }

      .ck-tab.active {
        background: var(--accent);
        color: var(--accent-contrast);
        animation: ck-pop 0.22s var(--ease);
      }

      @keyframes ck-pop {
        0% {
          transform: scale(0.96);
        }
      }

      .ck-tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 999px;
        font-size: 11px;
        background: var(--surface-3);
        color: var(--text);
      }

      .ck-tab.active .ck-tab-badge {
        background: rgb(255 255 255 / 30%);
        color: var(--accent-contrast);
      }
    `,
  ],
})
export class UiTabs {
  readonly tabs = input.required<UiTab[]>();
  readonly active = input.required<string>();
  readonly activeChange = output<string>();
}
