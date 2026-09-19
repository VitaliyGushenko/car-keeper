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

import { dateInputToTimestamp } from './format';
import { Fault, FaultDraft, FaultStatus } from './models';
import { watchSubcollection } from './watch-subcollection';

@Injectable({ providedIn: 'root' })
export class FaultsService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  private readonly cache = new Map<string, BehaviorSubject<Fault[]>>();

  watch(carId: string): Observable<Fault[]> {
    let subject = this.cache.get(carId);
    if (!subject) {
      subject = new BehaviorSubject<Fault[]>([]);
      this.cache.set(carId, subject);
      watchSubcollection<Fault>(this.injector, this.firestore, carId, 'faults').subscribe({
        next: (list) => subject!.next(list),
        error: (error) =>
          console.warn('faults: не удалось загрузить неисправности (проверьте правила Firestore)', error),
      });
    }
    return subject;
  }

  async create(carId: string, draft: FaultDraft): Promise<string> {
    const ref = doc(collection(this.firestore, 'cars', carId, 'faults'));
    await setDoc(ref, {
      ...draft,
      status: 'open',
      resolvedAt: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(carId: string, faultId: string, draft: FaultDraft): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'faults', faultId);
    await updateDoc(ref, { ...draft });
  }

  async setStatus(carId: string, faultId: string, status: FaultStatus): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'faults', faultId);
    await updateDoc(ref, {
      status,
      resolvedAt: status === 'fixed' ? serverTimestamp() : null,
    });
  }

  async remove(carId: string, faultId: string): Promise<void> {
    const ref = doc(this.firestore, 'cars', carId, 'faults', faultId);
    await deleteDoc(ref);
  }

  draftFromForm(draft: {
    title: string;
    description: string;
    severity: Fault['severity'];
    detectedAt: string;
  }): FaultDraft {
    return {
      title: draft.title.trim(),
      description: draft.description.trim(),
      severity: draft.severity,
      detectedAt: dateInputToTimestamp(draft.detectedAt),
    };
  }
}
