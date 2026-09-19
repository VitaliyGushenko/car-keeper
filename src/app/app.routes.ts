import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { AuthComponent } from './pages/auth/auth.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'auth', component: AuthComponent, canActivate: [guestGuard], title: 'Вход — CarKeeper' },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardComponent, title: 'Мои автомобили — CarKeeper' },
      {
        path: 'cars/new',
        loadComponent: () => import('./pages/cars/car-form.component').then((m) => m.CarFormComponent),
        title: 'Новый автомобиль — CarKeeper',
      },
      {
        path: 'cars/:id',
        loadComponent: () => import('./pages/cars/car-detail.component').then((m) => m.CarDetailComponent),
        title: 'Автомобиль — CarKeeper',
      },
      {
        path: 'cars/:id/edit',
        loadComponent: () => import('./pages/cars/car-form.component').then((m) => m.CarFormComponent),
        title: 'Редактирование — CarKeeper',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
