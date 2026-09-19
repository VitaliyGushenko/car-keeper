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

import { DocumentDraft, VehicleDocument } from './models';
import { watchSubcollection } from './watch-subcollection';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  private readonly cache = new Map<string, BehaviorSubject<VehicleDocument[]>>();

  watch(carId: string): Observable<VehicleDocument[]> {
    let subject = this.cache.get(carId);
    if (!subject) {
      subject = new BehaviorSubject<VehicleDocument[]>([]);
      this.cache.set(carId, subject);
      watchSubcollection<VehicleDocument>(this.injector, this.firestore, carId, 'documents').subscribe({
        next: (list) => subject!.next(list),
        error: (error) => console.warn('documents: не удалось загрузить документы', error),
      });
    }
    return subject;
  }

  /** Создаёт документ; `createExpense` — сразу добавить расход «Страховка». */
  async create(carId: string, draft: DocumentDraft, createExpense: boolean, currency: string): Promise<string> {
    const ref = doc(collection(this.firestore, 'cars', carId, 'documents'));
    await setDoc(ref, {
      ...draft,
      photo: draft.photo ?? null,
      createdAt: serverTimestamp(),
    });
    if (createExpense && (draft.cost ?? 0) > 0) {
      await addExpense(this.firestore, carId, ref.id, draft, currency);
    }
    return ref.id;
  }

  async update(carId: string, documentId: string, draft: DocumentDraft): Promise<void> {
    await updateDoc(doc(this.firestore, 'cars', carId, 'documents', documentId), {
      ...draft,
      photo: draft.photo ?? null,
    });
  }

  async remove(carId: string, document: VehicleDocument): Promise<void> {
    // Фото документа хранится в Storage — удаляется вызывающим кодом.
    await deleteDoc(doc(this.firestore, 'cars', carId, 'documents', document.id));
  }
}

async function addExpense(
  firestore: Firestore,
  carId: string,
  documentId: string,
  draft: DocumentDraft,
  currency: string,
): Promise<void> {
  const { addDoc, collection } = await import('@angular/fire/firestore');
  await addDoc(collection(firestore, 'cars', carId, 'expenses'), {
    type: 'insurance',
    title: draft.title,
    amount: draft.cost ?? 0,
    currency,
    date: draft.startDate ?? serverTimestamp(),
    mileageAt: null,
    notes: draft.number ? `Документ №${draft.number}` : null,
    receipt: draft.photo ?? null,
    linkedRepairId: null,
    linkedScheduleId: null,
    linkedFuelId: null,
    linkedDocumentId: documentId,
    createdAt: serverTimestamp(),
  });
}
