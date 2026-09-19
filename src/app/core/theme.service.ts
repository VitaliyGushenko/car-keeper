import { Injectable, effect, signal } from '@angular/core';

import { ThemeMode } from './models';

const STORAGE_KEY = 'ck-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.restoreTheme());

  readonly isDark = () => this.theme() === 'dark';

  constructor() {
    effect(() => {
      document.documentElement.dataset['theme'] = this.theme();
      try {
        localStorage.setItem(STORAGE_KEY, this.theme());
      } catch {
        // localStorage может быть недоступен (приватный режим) — тема просто не сохранится.
      }
    });
  }

  toggle(): void {
    this.theme.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  private restoreTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // игнорируем — используем тёмную тему по умолчанию.
    }
    return 'dark';
  }
}
