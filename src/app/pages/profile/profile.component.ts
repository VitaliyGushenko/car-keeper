import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { UiButton } from '../../ui/button.directive';

const CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT', 'UAH', 'BYN'] as const;

@Component({
  selector: 'ck-profile',
  imports: [FormsModule, RouterLink, UiButton],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.less',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);

  readonly currencies = CURRENCIES;
  readonly busy = signal(false);
  readonly saved = signal(false);

  displayName = this.auth.profile()?.displayName ?? '';
  currency = this.auth.profile()?.settings?.currency ?? 'RUB';

  constructor() {
    // Профиль может прийти из Firestore позже первой отрисовки — заполняем при появлении.
    let filled = false;
    effect(() => {
      const profile = this.auth.profile();
      if (profile && !filled) {
        this.displayName = profile.displayName ?? '';
        this.currency = profile.settings?.currency ?? 'RUB';
        filled = true;
      }
    });
  }

  async save(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.saved.set(false);
    try {
      await this.auth.updateSettings({
        displayName: this.displayName.trim(),
        currency: this.currency,
      });
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2500);
    } finally {
      this.busy.set(false);
    }
  }
}
