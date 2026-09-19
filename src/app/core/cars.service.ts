import { Injectable, Injector, effect, inject, runInInjectionContext, signal } from '@angular/core';
import {
  Firestore,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

import { AuthService } from './auth.service';
import { dateInputToTimestamp } from './format';
import { Car, CarDraft, StoredFile } from './models';
import { makeModelKey } from './normalize';
import { SchedulesService } from './schedules.service';
import { StorageService } from './storage.service';

const CAR_SUBCOLLECTIONS = ['schedules', 'faults', 'repairs', 'expenses'] as const;

@Injectable({ providedIn: 'root' })
export class CarsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly schedulesService = inject(SchedulesService);
  private readonly injector = inject(Injector);

  /** Все авто текущего пользователя, отсортированные по дате создания. */
  readonly cars = signal<Car[]>([]);
  readonly loading = signal(true);

  private carsSub?: Subscription;

  constructor() {
    effect(() => {
      const uid = this.auth.user()?.uid;
      this.carsSub?.unsubscribe();
      if (!uid) {
        this.cars.set([]);
        this.loading.set(!this.auth.isReady());
        return;
      }
      this.loading.set(true);
      // effect выполняется вне injection-контекста — оборачиваем явно.
      this.carsSub = runInInjectionContext(this.injector, () => {
        const queryRef = query(collection(this.firestore, 'cars'), where('ownerId', '==', uid));
        return collectionData(queryRef, { idField: 'id' }).subscribe({
          next: (all) => {
            const owned = (all as Car[]).sort(
              (a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt),
            );
            this.cars.set(owned);
            this.loading.set(false);
          },
          error: (error) => {
            // Чаще всего — не задеплоены правила Firestore.
            console.warn('cars: не удалось загрузить список авто', error);
            this.cars.set([]);
            this.loading.set(false);
          },
        });
      });
    });
  }

  carById(id: string): Car | undefined {
    return this.cars().find((car) => car.id === id);
  }

  async createCar(draft: CarDraft): Promise<string> {
    const uid = this.requireUid();
    const ref = await addDoc(collection(this.firestore, 'cars'), {
      ...draft,
      ownerId: uid,
      modelKey: makeModelKey(draft.make, draft.model),
      photos: [],
      customModel: null,
      createdAt: serverTimestamp(),
    });
    // Заполняем регламенты по умолчанию; сбой не должен отменять создание авто.
    await this.schedulesService.seedForNewCar(ref.id).catch((error) => console.error(error));
    return ref.id;
  }

  async updateCar(carId: string, draft: CarDraft): Promise<void> {
    await updateDoc(this.carRef(carId), {
      ...draft,
      modelKey: makeModelKey(draft.make, draft.model),
    });
  }

  async updateMileage(carId: string, mileageKm: number, measuredAt?: string): Promise<void> {
    const ts = measuredAt ? dateInputToTimestamp(measuredAt) : null;
    await updateDoc(this.carRef(carId), {
      mileageKm,
      mileageUpdatedAt: ts ?? serverTimestamp(),
    });
  }

  async deleteCar(car: Car): Promise<void> {
    // Сначала подколлекции (расходы читаем, чтобы удалить чеки из Storage).
    for (const sub of CAR_SUBCOLLECTIONS) {
      const snap = await getDocs(collection(this.firestore, 'cars', car.id, sub));
      if (sub === 'expenses') {
        await Promise.all(
          snap.docs
            .map((d) => (d.data() as { receipt?: StoredFile | null }).receipt)
            .filter((receipt): receipt is StoredFile => !!receipt?.path)
            .map((receipt) => this.storage.deleteFile(receipt.path).catch(() => null)),
        );
      }
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }

    await Promise.all(car.photos.map((photo) => this.storage.deleteFile(photo.path).catch(() => null)));
    if (car.customModel) {
      await this.storage.deleteFile(car.customModel.path).catch(() => null);
    }
    await deleteDoc(this.carRef(car.id));
  }

  /** Загружает фото авто в Storage и добавляет в документ. */
  async addPhoto(carId: string, file: File): Promise<void> {
    const uid = this.requireUid();
    const blob = await this.storage.compressImage(file);
    const safeName = file.name.replace(/[^\w.\-]+/g, '_') || 'photo.jpg';
    const path = `cars/${uid}/${carId}/photos/${Date.now()}_${safeName}`;
    const stored = await this.storage.uploadFile(path, blob, 'image/jpeg');
    await updateDoc(this.carRef(carId), { photos: arrayUnion(stored) });
  }

  async removePhoto(carId: string, photo: StoredFile): Promise<void> {
    await this.storage.deleteFile(photo.path);
    await updateDoc(this.carRef(carId), { photos: arrayRemove(photo) });
  }

  /** Загружает пользовательскую 3D-модель (GLB) и заменяет предыдущую. */
  async uploadCustomModel(carId: string, file: File): Promise<void> {
    const uid = this.requireUid();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_') || 'model.glb';
    const path = `cars/${uid}/${carId}/model/${Date.now()}_${safeName}`;
    const stored = await this.storage.uploadFile(path, file, 'model/gltf-binary');
    const previous = this.carById(carId)?.customModel ?? null;
    await updateDoc(this.carRef(carId), { customModel: stored });
    if (previous) {
      await this.storage.deleteFile(previous.path).catch(() => null);
    }
  }

  async removeCustomModel(carId: string): Promise<void> {
    const previous = this.carById(carId)?.customModel ?? null;
    await updateDoc(this.carRef(carId), { customModel: null });
    if (previous) {
      await this.storage.deleteFile(previous.path).catch(() => null);
    }
  }

  private carRef(carId: string) {
    return doc(this.firestore, 'cars', carId);
  }

  private requireUid(): string {
    const uid = this.auth.user()?.uid;
    if (!uid) {
      throw new Error('Пользователь не авторизован');
    }
    return uid;
  }

  private toMillis(value: unknown): number {
    const anyValue = value as { toMillis?: () => number } | null | undefined;
    return anyValue?.toMillis ? anyValue.toMillis() : 0;
  }
}
