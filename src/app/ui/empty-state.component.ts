import { Component, input } from '@angular/core';

/**
 * Пустое состояние списка:
 * ```html
 * <ck-empty-state title="Пока пусто" description="Добавьте первый автомобиль">
 *   <button ckButton="primary" action>Добавить</button>
 * </ck-empty-state>
 * ```
 */
@Component({
  selector: 'ck-empty-state',
  template: `
    <div class="ck-empty">
      @if (icon()) {
        <div class="ck-empty-icon" aria-hidden="true">{{ icon() }}</div>
      }
      <h3>{{ title() }}</h3>
      @if (description()) {
        <p class="muted">{{ description() }}</p>
      }
      <div class="ck-empty-action">
        <ng-content select="[action]" />
      </div>
    </div>
  `,
  styles: [
    `
      .ck-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
        padding: 42px 20px;
      }

      .ck-empty-icon {
        font-size: 40px;
        line-height: 1;
        margin-bottom: 6px;
        opacity: 0.8;
      }

      .ck-empty p {
        max-width: 420px;
        margin: 0;
      }

      .ck-empty-action {
        margin-top: 12px;
      }
    `,
  ],
})
export class UiEmptyState {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly icon = input('🚗');
}
