import { Injectable, Injector, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { dateInputToTimestamp } from './format';
import { Expense, FuelDraft, FuelEntry } from './models';
import { watchSubcollection } from './watch-subcollection';

@Injectable({ providedIn: 'root' })
export class FuelService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  private readonly cache = new Map<string, BehaviorSubject<FuelEntry[]>>();

  watch(carId: string): Observable<FuelEntry[]> {
    let subject = this.cache.get(carId);
    if (!subject) {
      subject = new BehaviorSubject<FuelEntry[]>([]);
      this.cache.set(carId, subject);
      watchSubcollection<FuelEntry>(this.injector, this.firestore, carId, 'fuel').subscribe({
        next: (list) => subject!.next(list),
        error: (error) => console.warn('fuel: не удалось загрузить заправки', error),
      });
    }
    return subject;
  }

  /** Создаёт заправку и связанный расход «Топливо». */
  async create(carId: string, draft: FuelDraft, currency: string): Promise<string> {
    const ref = doc(collection(this.firestore, 'cars', carId, 'fuel'));
    await setDoc(ref, { ...draft, linkedExpenseId: null, createdAt: serverTimestamp() });
    const expenseId = await this.createLinkedExpense(carId, ref.id, draft, currency);
    await updateDoc(ref, { linkedExpenseId: expenseId });
    return ref.id;
  }

  async update(carId: string, fuelId: string, draft: FuelDraft, currency: string): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'fuel', fuelId);
    await updateDoc(ref, { ...draft });
    const current = this.cache.get(carId)?.value.find((f) => f.id === fuelId);
    if (current?.linkedExpenseId) {
      await updateDoc(doc(this.firestore, 'cars', carId, 'expenses', current.linkedExpenseId), {
        amount: draft.totalCost,
        date: draft.date ?? serverTimestamp(),
        mileageAt: draft.odometerKm,
        title: `Заправка ${draft.liters} л`,
      });
    } else {
      const expenseId = await this.createLinkedExpense(carId, fuelId, draft, currency);
      await updateDoc(ref, { linkedExpenseId: expenseId });
    }
  }

  /** Удаляет заправку вместе со связанным расходом. */
  async remove(carId: string, fuel: FuelEntry): Promise<void> {
    if (fuel.linkedExpenseId) {
      await deleteDoc(doc(this.firestore, 'cars', carId, 'expenses', fuel.linkedExpenseId)).catch(() => null);
    }
    await deleteDoc(doc(this.firestore, 'cars', carId, 'fuel', fuel.id));
  }

  private async createLinkedExpense(
    carId: string,
    fuelId: string,
    draft: FuelDraft,
    currency: string,
  ): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'cars', carId, 'expenses'), {
      type: 'fuel',
      title: `Заправка ${draft.liters} л`,
      amount: draft.totalCost,
      currency,
      date: draft.date ?? serverTimestamp(),
      mileageAt: draft.odometerKm,
      notes: draft.gasStation || null,
      receipt: null,
      linkedRepairId: null,
      linkedScheduleId: null,
      linkedFuelId: fuelId,
      linkedDocumentId: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
}
