import { Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

/**
 * Поток документов подколлекции авто.
 * Запрос создаётся в injection-контексте (@angular/fire требует этого даже при
 * подписке снаружи — из defer/switchMap/effect). Ошибки обрабатывайте в
 * подписчике, чтобы отказ правил не приводил к необработанному исключению.
 */
export function watchSubcollection<T>(
  injector: Injector,
  firestore: Firestore,
  carId: string,
  subcollection: string,
): Observable<T[]> {
  return runInInjectionContext(
    injector,
    () =>
      collectionData(collection(firestore, 'cars', carId, subcollection), {
        idField: 'id',
      }) as Observable<T[]>,
  );
}
