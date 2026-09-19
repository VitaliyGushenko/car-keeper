import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { UiButton } from './ui/button.directive';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, UiButton],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less',
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/auth');
  }
}
