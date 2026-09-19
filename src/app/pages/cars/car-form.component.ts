import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CAR_MAKES } from '../../core/car-makes';
import { ToastService } from '../../ui/toast.service';
import { CarsService } from '../../core/cars.service';
import { dateInputToTimestamp, toDateInputValue } from '../../core/format';
import { Car, StoredFile } from '../../core/models';
import { UiButton } from '../../ui/button.directive';
import { UiConfirm } from '../../ui/confirm.component';
import { UiSpinner } from '../../ui/spinner.component';

interface QueuedPhoto {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'ck-car-form',
  imports: [FormsModule, RouterLink, UiButton, UiConfirm, UiSpinner],
  templateUrl: './car-form.component.html',
  styleUrl: './car-form.component.less',
})
export class CarFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly carsService = inject(CarsService);

  readonly makes = CAR_MAKES;
  readonly maxYear = new Date().getFullYear() + 1;

  /** id авто — задан в режиме редактирования. */
  readonly editing = signal<Car | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  make = '';
  model = '';
  year: number | null = null;
  mileageKm: number | null = null;
  mileageDate = toDateInputValue(new Date());
  vin = '';
  plate = '';
  purchaseDate = '';
  notes = '';

  /** Фото, уже сохранённые у авто (режим редактирования). */
  existingPhotos = signal<StoredFile[]>([]);
  /** Фото, ожидающие загрузки после сохранения. */
  readonly queuedPhotos = signal<QueuedPhoto[]>([]);

  readonly deleteConfirmOpen = signal(false);
  readonly photoRemoveConfirm = signal<StoredFile | null>(null);

  readonly isEdit = computed(() => this.editing() !== null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loading.set(true);
      const car = this.carsService.carById(id);
      if (car) {
        this.fillForm(car);
      }
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.error.set('');
    if (!this.make.trim() || !this.model.trim()) {
      this.error.set('Укажите марку и модель автомобиля.');
      return;
    }
    const mileage = this.mileageKm ?? 0;
    if (mileage < 0) {
      this.error.set('Пробег не может быть отрицательным.');
      return;
    }

    this.saving.set(true);
    try {
      const draft = {
        make: this.make.trim(),
        model: this.model.trim(),
        year: this.year,
        mileageKm: mileage,
        mileageUpdatedAt: dateInputToTimestamp(this.mileageDate),
        vin: this.vin.trim(),
        plate: this.plate.trim(),
        purchaseDate: dateInputToTimestamp(this.purchaseDate),
        notes: this.notes.trim(),
      };

      const current = this.editing();
      if (current) {
        await this.carsService.updateCar(current.id, draft);
        this.toast.success('Автомобиль сохранён');
        await this.uploadQueued(current.id);
        await this.router.navigate(['/cars', current.id]);
      } else {
        const newId = await this.carsService.createCar(draft);
        this.toast.success('Автомобиль добавлен');
        await this.uploadQueued(newId);
        await this.router.navigate(['/cars', newId]);
      }
    } catch (err) {
      this.error.set('Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.');
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const queued = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    this.queuedPhotos.update((list) => [...list, ...queued]);
    input.value = '';
  }

  removeQueued(index: number): void {
    this.queuedPhotos.update((list) => {
      const [removed] = list.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return [...list];
    });
  }

  async removeExistingPhoto(): Promise<void> {
    const photo = this.photoRemoveConfirm();
    const car = this.editing();
    if (!photo || !car) {
      return;
    }
    this.photoRemoveConfirm.set(null);
    await this.carsService.removePhoto(car.id, photo);
    this.existingPhotos.update((photos) => photos.filter((p) => p.path !== photo.path));
  }

  async deleteCar(): Promise<void> {
    const car = this.editing();
    if (!car) {
      return;
    }
    this.deleteConfirmOpen.set(false);
    await this.carsService.deleteCar(car);
    this.toast.success('Автомобиль удалён');
    await this.router.navigate(['/']);
  }

  private async uploadQueued(carId: string): Promise<void> {
    for (const item of this.queuedPhotos()) {
      await this.carsService.addPhoto(carId, item.file);
    }
    this.queuedPhotos().forEach((item) => URL.revokeObjectURL(item.previewUrl));
    this.queuedPhotos.set([]);
  }

  private fillForm(car: Car): void {
    this.editing.set(car);
    this.existingPhotos.set(car.photos ?? []);
    this.make = car.make;
    this.model = car.model;
    this.year = car.year ?? null;
    this.mileageKm = car.mileageKm;
    this.mileageDate = toDateInputValue(car.mileageUpdatedAt) || toDateInputValue(new Date());
    this.vin = car.vin ?? '';
    this.plate = car.plate ?? '';
    this.purchaseDate = toDateInputValue(car.purchaseDate);
    this.notes = car.notes ?? '';
  }
}
