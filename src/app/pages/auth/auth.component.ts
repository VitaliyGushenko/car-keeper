import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { firebaseErrorMessage } from '../../core/firebase-error-map';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'ck-auth',
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.less',
})
export class AuthComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<AuthMode>('login');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  email = '';
  password = '';
  displayName = '';

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set('');
    this.notice.set('');
  }

  async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      if (this.mode() === 'register') {
        await this.authService.register(this.email, this.password, this.displayName);
      } else {
        await this.authService.login(this.email, this.password);
      }
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.error.set(firebaseErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async forgotPassword(): Promise<void> {
    if (!this.email.trim()) {
      this.error.set('Введите email в поле выше — отправим на него ссылку для сброса пароля.');
      return;
    }
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      await this.authService.resetPassword(this.email);
      this.notice.set('Ссылка для сброса пароля отправлена на указанный email.');
    } catch (error) {
      this.error.set(firebaseErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
