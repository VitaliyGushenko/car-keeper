import { animate, query, stagger, state, style, transition, trigger } from '@angular/animations';

/**
 * Общие анимации интерфейса. Используются диалогами, тостами и списками.
 * При prefers-reduced-motion браузерные CSS-анимации отключаются стилями;
 * для Angular-анимаций действует ANIMATION_MODULE_TYPE по умолчанию.
 */

export const overlayFade = trigger('overlayFade', [
  transition(':enter', [style({ opacity: 0 }), animate('180ms ease-out', style({ opacity: 1 }))]),
  transition(':leave', [animate('160ms ease-in', style({ opacity: 0 }))]),
]);

export const panelRise = trigger('panelRise', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(14px) scale(0.97)' }),
    animate('240ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'none' })),
  ]),
  transition(':leave', [
    animate('160ms ease-in', style({ opacity: 0, transform: 'translateY(10px) scale(0.98)' })),
  ]),
]);

export const toastSlide = trigger('toastSlide', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(12px)' }),
    animate('220ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'none' })),
  ]),
  transition(':leave', [animate('160ms ease-in', style({ opacity: 0, transform: 'translateY(8px)' }))]),
]);

/** Каскадное появление элементов списка: [@listStagger] на контейнере. */
export const listStagger = trigger('listStagger', [
  transition(':enter', [
    query(':enter', [style({ opacity: 0, transform: 'translateY(10px)' })], { optional: true }),
    query(
      ':enter',
      [stagger(45, [animate('320ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'none' }))])],
      { optional: true },
    ),
  ]),
]);

export const fadeSwap = trigger('fadeSwap', [
  state('in', style({ opacity: 1, transform: 'none' })),
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('240ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'none' })),
  ]),
]);
