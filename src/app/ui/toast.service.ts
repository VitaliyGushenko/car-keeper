import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'ok' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;

  readonly toasts = signal<ToastItem[]>([]);

  show(message: string, tone: 'ok' | 'error' = 'ok'): void {
    const id = ++this.counter;
    this.toasts.update((list) => [...list, { id, message, tone }]);
    setTimeout(() => this.dismiss(id), 3200);
  }

  success(message: string): void {
    this.show(message, 'ok');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
