import { Directive, booleanAttribute, input } from '@angular/core';

export type UiButtonVariant = 'primary' | 'ghost' | 'danger' | 'default';

/**
 * Атрибутная директива для кнопок и ссылок-кнопок:
 * `<button ckButton="primary">Сохранить</button>`,
 * `<button ckButton ckSmall>Мелкая</button>`.
 */
@Directive({
  selector: 'button[ckButton], a[ckButton]',
  host: {
    '[class.btn]': 'true',
    '[class.btn-primary]': 'ckButton() === "primary"',
    '[class.btn-ghost]': 'ckButton() === "ghost"',
    '[class.btn-danger]': 'ckButton() === "danger"',
    '[class.btn-sm]': 'ckSmall()',
    '[class.btn-block]': 'ckBlock()',
  },
})
export class UiButton {
  /** Вариант: `ckButton="primary"` или просто `ckButton` (= default). */
  readonly ckButton = input<UiButtonVariant, unknown>('default', {
    transform: (value: unknown): UiButtonVariant =>
      value === '' || value === undefined || value === true
        ? 'default'
        : (value as UiButtonVariant),
  });
  readonly ckSmall = input(false, { transform: booleanAttribute });
  readonly ckBlock = input(false, { transform: booleanAttribute });
}
