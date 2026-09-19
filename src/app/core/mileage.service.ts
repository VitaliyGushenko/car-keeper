import { Injectable, Injector, inject } from '@angular/core';
import {
  Firestore,
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
import { MileageEntry } from './models';
import { StorageService } from './storage.service';
import { watchSubcollection } from './watch-subcollection';

@Injectable({ providedIn: 'root' })
export class MileageService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  private readonly cache = new Map<string, BehaviorSubject<MileageEntry[]>>();

  watch(carId: string): Observable<MileageEntry[]> {
    let subject = this.cache.get(carId);
    if (!subject) {
      subject = new BehaviorSubject<MileageEntry[]>([]);
      this.cache.set(carId, subject);
      watchSubcollection<MileageEntry>(this.injector, this.firestore, carId, 'mileage').subscribe({
        next: (list) => subject!.next(list),
        error: (error) => console.warn('mileage: не удалось загрузить журнал пробега', error),
      });
    }
    return subject;
  }

  /**
   * Добавляет запись в журнал пробегов и обновляет одометр авто.
   * `photo.file` — фото одометра (сжимается на клиенте).
   */
  async add(
    carId: string,
    odometerKm: number,
    dateInput: string,
    options: { photoFile?: File | null; source?: 'manual' | 'fuel' } = {},
  ): Promise<void> {
    const uid = this.auth.user()?.uid;
    let stored = null;
    if (options.photoFile && uid) {
      const blob = await this.storage.compressImage(options.photoFile, 1200, 0.75);
      const path = `cars/${uid}/${carId}/odometer/${Date.now()}_odometer.jpg`;
      stored = await this.storage.uploadFile(path, blob, 'image/jpeg');
    }
    await setDoc(doc(collection(this.firestore, 'cars', carId, 'mileage')), {
      odometerKm,
      date: dateInputToTimestamp(dateInput) ?? serverTimestamp(),
      photo: stored,
      source: options.source ?? 'manual',
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(this.firestore, 'cars', carId), {
      mileageKm: odometerKm,
      mileageUpdatedAt: dateInputToTimestamp(dateInput) ?? serverTimestamp(),
    });
  }

  async remove(carId: string, entry: MileageEntry): Promise<void> {
    if (entry.photo) {
      await this.storage.deleteFile(entry.photo.path).catch(() => null);
    }
    await deleteDoc(doc(this.firestore, 'cars', carId, 'mileage', entry.id));
  }
}
