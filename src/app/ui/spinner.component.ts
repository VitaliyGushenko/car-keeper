import { Component, booleanAttribute, input } from '@angular/core';

/** Индикатор загрузки: `<ck-spinner />` (по центру блока) или `<ck-spinner fullscreen />`. */
@Component({
  selector: 'ck-spinner',
  template: `
    <div class="ck-spinner-wrap" [class.fullscreen]="fullscreen()">
      <div class="spinner" [class.spinner-lg]="fullscreen()"></div>
    </div>
  `,
  styles: [
    `
      .ck-spinner-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
      }

      .ck-spinner-wrap.fullscreen {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: var(--bg);
      }
    `,
  ],
})
export class UiSpinner {
  readonly fullscreen = input(false, { transform: booleanAttribute });
}
