import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

import { VehicleModel } from './models';

/**
 * Глобальный каталог 3D-моделей (коллекция vehicleModels, public read).
 * Наполняется вручную через Firebase Console: документ с id вида `lada_vesta`
 * содержит make, model и modelUrl — download URL файла GLB из Storage.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly firestore = inject(Firestore);

  readonly vehicleModels = signal<VehicleModel[]>([]);

  private sub?: Subscription;

  constructor() {
    const ref = collection(this.firestore, 'vehicleModels');
    collectionData(ref, { idField: 'id' }).subscribe({
      next: (data) => this.vehicleModels.set(data as VehicleModel[]),
      error: (error) =>
        console.warn('catalog: не удалось загрузить 3D-модели (проверьте правила Firestore)', error),
    });
  }

  findModelByKey(modelKey?: string): VehicleModel | undefined {
    if (!modelKey) {
      return undefined;
    }
    const key = modelKey.toLowerCase();
    return this.vehicleModels().find((m) => m.id.toLowerCase() === key);
  }
}
