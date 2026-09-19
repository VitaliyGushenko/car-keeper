import { Injectable, Injector, inject } from '@angular/core';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

import { DEFAULT_SCHEDULE_TEMPLATES } from './default-schedules';
import { dateInputToTimestamp } from './format';
import { MaintenanceSchedule, MaintenanceTemplate, ScheduleDraft } from './models';
import { watchSubcollection } from './watch-subcollection';

@Injectable({ providedIn: 'root' })
export class SchedulesService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  private readonly cache = new Map<string, BehaviorSubject<MaintenanceSchedule[]>>();

  /** Поток регламентов авто (кэшируется на всё время работы приложения). */
  watch(carId: string): Observable<MaintenanceSchedule[]> {
    let subject = this.cache.get(carId);
    if (!subject) {
      subject = new BehaviorSubject<MaintenanceSchedule[]>([]);
      this.cache.set(carId, subject);
      watchSubcollection<MaintenanceSchedule>(this.injector, this.firestore, carId, 'schedules').subscribe({
        next: (list) => subject!.next(list),
        error: (error) =>
          console.warn('schedules: не удалось загрузить регламенты (проверьте правила Firestore)', error),
      });
    }
    return subject;
  }

  async create(carId: string, draft: ScheduleDraft): Promise<string> {
    const ref = doc(collection(this.firestore, 'cars', carId, 'schedules'));
    await setDoc(ref, { ...draft, createdAt: serverTimestamp() });
    return ref.id;
  }

  async update(carId: string, scheduleId: string, draft: ScheduleDraft): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'schedules', scheduleId);
    await updateDoc(ref, { ...draft });
  }

  async remove(carId: string, scheduleId: string): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'schedules', scheduleId);
    await deleteDoc(ref);
  }

  /** Отметить регламент выполненным: фиксирует пробег и дату последнего выполнения. */
  async markDone(carId: string, scheduleId: string, doneKm: number | null, doneDateInput: string): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'schedules', scheduleId);
    await updateDoc(ref, {
      lastDoneKm: doneKm,
      lastDoneDate: dateInputToTimestamp(doneDateInput) ?? serverTimestamp(),
    });
  }

  /**
   * Наполняет регламенты нового авто: из коллекции maintenanceTemplates,
   * а если она пуста — из встроенных дефолтов.
   */
  async seedForNewCar(carId: string): Promise<void> {
    const templates = await this.loadTemplates();
    const schedulesRef = collection(this.firestore, 'cars', carId, 'schedules');
    for (const template of templates) {
      await setDoc(doc(schedulesRef), {
        name: template.name,
        intervalKm: template.intervalKm ?? null,
        intervalMonths: template.intervalMonths ?? null,
        notes: '',
        lastDoneKm: null,
        lastDoneDate: null,
        createdAt: serverTimestamp(),
      });
    }
  }

  private async loadTemplates(): Promise<MaintenanceTemplate[]> {
    try {
      const snap = await getDocs(collection(this.firestore, 'maintenanceTemplates'));
      if (!snap.empty) {
        return snap.docs
          .map((d) => ({ ...(d.data() as MaintenanceTemplate), id: d.id }))
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      }
    } catch {
      // Нет доступа или пусто — используем встроенные дефолты.
    }
    return DEFAULT_SCHEDULE_TEMPLATES.map((t, index) => ({ ...t, id: `default-${index}` }));
  }
}
