import { Injectable, Injector, inject } from '@angular/core';
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { Expense, ExpenseDraft, StoredFile } from './models';
import { StorageService } from './storage.service';
import { watchSubcollection } from './watch-subcollection';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  private readonly cache = new Map<string, BehaviorSubject<Expense[]>>();

  watch(carId: string): Observable<Expense[]> {
    let subject = this.cache.get(carId);
    if (!subject) {
      subject = new BehaviorSubject<Expense[]>([]);
      this.cache.set(carId, subject);
      watchSubcollection<Expense>(this.injector, this.firestore, carId, 'expenses').subscribe({
        next: (list) => subject!.next(list),
        error: (error) =>
          console.warn('expenses: не удалось загрузить расходы (проверьте правила Firestore)', error),
      });
    }
    return subject;
  }

  async create(carId: string, draft: ExpenseDraft): Promise<string> {
    const ref = doc(collection(this.firestore, 'cars', carId, 'expenses'));
    await setDoc(ref, { ...draft, createdAt: serverTimestamp() });
    return ref.id;
  }

  async update(carId: string, expenseId: string, draft: ExpenseDraft): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'expenses', expenseId);
    await updateDoc(ref, { ...draft });
  }

  async remove(carId: string, expense: Expense): Promise<void> {
    if (expense.receipt) {
      await this.storage.deleteFile(expense.receipt.path).catch(() => null);
    }
    const ref = doc(this.firestore, 'cars', carId, 'expenses', expense.id);
    await deleteDoc(ref);
  }

  /** Загружает фото чека (сжатие на клиенте). */
  async uploadReceipt(carId: string, file: File): Promise<StoredFile> {
    const uid = this.auth.user()?.uid;
    if (!uid) {
      throw new Error('Пользователь не авторизован');
    }
    const blob = await this.storage.compressImage(file, 1200, 0.75);
    const safeName = file.name.replace(/[^\w.\-]+/g, '_') || 'receipt.jpg';
    const path = `cars/${uid}/${carId}/receipts/${Date.now()}_${safeName}`;
    return this.storage.uploadFile(path, blob, 'image/jpeg');
  }
}
