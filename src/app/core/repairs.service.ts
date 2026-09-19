import { Injectable, Injector, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { dateInputToTimestamp } from './format';
import { Repair, RepairDraft } from './models';
import { watchSubcollection } from './watch-subcollection';

@Injectable({ providedIn: 'root' })
export class RepairsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  private readonly cache = new Map<string, BehaviorSubject<Repair[]>>();

  watch(carId: string): Observable<Repair[]> {
    let subject = this.cache.get(carId);
    if (!subject) {
      subject = new BehaviorSubject<Repair[]>([]);
      this.cache.set(carId, subject);
      watchSubcollection<Repair>(this.injector, this.firestore, carId, 'repairs').subscribe({
        next: (list) => subject!.next(list),
        error: (error) =>
          console.warn('repairs: не удалось загрузить ремонты (проверьте правила Firestore)', error),
      });
    }
    return subject;
  }

  /** Плановый ремонт по неисправности. */
  async create(carId: string, faultId: string, draft: RepairDraft): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'cars', carId, 'repairs'), {
      ...draft,
      faultId,
      status: 'planned',
      actualCost: null,
      actualDate: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(carId: string, repairId: string, draft: RepairDraft): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'repairs', repairId);
    await updateDoc(ref, { ...draft });
  }

  async remove(carId: string, repairId: string): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'repairs', repairId);
    await deleteDoc(ref);
  }

  /**
   * Подтверждение ремонта: фиксирует фактическую цену и дату (могут отличаться
   * от плана) и автоматически создаёт связанный расход.
   */
  async confirmDone(
    carId: string,
    repair: Repair,
    actualCost: number,
    actualDateInput: string,
    notes: string,
  ): Promise<void> {
    const actualDate = dateInputToTimestamp(actualDateInput);
    const ref = doc(this.firestore, 'cars', carId, 'repairs', repair.id);
    await updateDoc(ref, {
      status: 'done',
      actualCost,
      actualDate: actualDate ?? serverTimestamp(),
      notes: notes.trim() || (repair.notes ?? ''),
    });

    if (actualCost > 0) {
      const currency = this.auth.profile()?.settings?.currency ?? 'RUB';
      await addDoc(collection(this.firestore, 'cars', carId, 'expenses'), {
        type: 'repair',
        title: repair.title,
        amount: actualCost,
        currency,
        date: actualDate ?? serverTimestamp(),
        notes: notes.trim() || null,
        receipt: null,
        linkedRepairId: repair.id,
        linkedScheduleId: null,
        createdAt: serverTimestamp(),
      });
    }
  }

  draftFromForm(draft: {
    title: string;
    works: string;
    plannedCost: number | null;
    plannedDate: string;
    notes: string;
  }): RepairDraft {
    return {
      title: draft.title.trim(),
      works: draft.works.trim(),
      plannedCost: draft.plannedCost,
      plannedDate: dateInputToTimestamp(draft.plannedDate),
      notes: draft.notes.trim(),
    };
  }
}
