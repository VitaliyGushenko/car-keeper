import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ck-help',
  imports: [RouterLink],
  templateUrl: './help.component.html',
  styleUrl: './help.component.less',
})
export class HelpComponent {
  readonly sections = [
    { id: 's-start', label: 'Вход и профиль' },
    { id: 's-dashboard', label: 'Дашборд' },
    { id: 's-car', label: 'Автомобиль' },
    { id: 's-schedules', label: 'Регламенты' },
    { id: 's-faults', label: 'Неисправности' },
    { id: 's-fuel', label: 'Заправки' },
    { id: 's-documents', label: 'Документы' },
    { id: 's-expenses', label: 'Расходы' },
    { id: 's-history', label: 'История' },
    { id: 's-settings', label: 'Тема и 3D' },
  ];

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
