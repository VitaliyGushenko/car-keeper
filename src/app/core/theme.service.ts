import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeSetting = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ck-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly systemDark = signal(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  );

  /** Настройка пользователя: light / dark / как в системе. */
  readonly theme = signal<ThemeSetting>(this.restoreTheme());

  readonly isDark = computed(() => {
    const setting = this.theme();
    return setting === 'system' ? this.systemDark() : setting === 'dark';
  });

  constructor() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (event) => this.systemDark.set(event.matches));
    }
    effect(() => {
      document.documentElement.dataset['theme'] = this.isDark() ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, this.theme());
      } catch {
        // localStorage может быть недоступен (приватный режим) — тема просто не сохранится.
      }
    });
  }

  /** Цикл переключения: dark → light → system → dark. */
  cycle(): void {
    const order: ThemeSetting[] = ['dark', 'light', 'system'];
    this.theme.update((mode) => order[(order.indexOf(mode) + 1) % order.length]);
  }

  icon(): string {
    return this.theme() === 'system' ? '🖥️' : this.isDark() ? '🌙' : '☀️';
  }

  title(): string {
    return this.theme() === 'system'
      ? 'Тема: как в системе'
      : this.isDark()
        ? 'Тёмная тема'
        : 'Светлая тема';
  }

  private restoreTheme(): ThemeSetting {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // игнорируем — используем системную тему по умолчанию.
    }
    return 'system';
  }
}
