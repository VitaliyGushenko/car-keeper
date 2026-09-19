import { Timestamp } from '@angular/fire/firestore';

/** Документ users/{uid}. */
export interface UserProfile {
  uid?: string;
  email: string;
  displayName?: string;
  settings?: UserSettings;
  createdAt?: Timestamp | null;
}

export interface UserSettings {
  currency?: string;
  theme?: ThemeMode;
}

export type ThemeMode = 'light' | 'dark';

/** Файл фото/чека, загруженный в Storage. */
export interface StoredFile {
  /** Полный download URL. */
  url: string;
  /** Путь в Storage — по нему файл удаляется. */
  path: string;
  createdAt?: Timestamp | null;
}

/** Документ cars/{carId}. */
export interface Car {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year?: number | null;
  vin?: string;
  plate?: string;
  /** Текущий одометр, км. */
  mileageKm: number;
  /** Дата последнего замера пробега. */
  mileageUpdatedAt?: Timestamp | null;
  purchaseDate?: Timestamp | null;
  notes?: string;
  photos: StoredFile[];
  /** Нормализованный ключ «марка_модель» для автоподстановки 3D-модели. */
  modelKey?: string;
  /** GLB, загруженный самим пользователем (приоритетнее каталога). */
  customModel?: StoredFile | null;
  createdAt?: Timestamp | null;
}

/** Форма создания/редактирования авто (без служебных полей). */
export type CarDraft = Omit<Car, 'id' | 'ownerId' | 'photos' | 'customModel' | 'createdAt' | 'modelKey'>;

export type ScheduleStatus = 'ok' | 'due-soon' | 'overdue';

/** Регламент обслуживания конкретного авто: cars/{carId}/schedules/{id}. */
export interface MaintenanceSchedule {
  id: string;
  name: string;
  notes?: string;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  /** Пробег последнего выполнения. */
  lastDoneKm?: number | null;
  /** Дата последнего выполнения. */
  lastDoneDate?: Timestamp | null;
  createdAt?: Timestamp | null;
}

export type ScheduleDraft = Omit<MaintenanceSchedule, 'id' | 'createdAt'>;

/** Глобальный шаблон дефолтных регламентов: maintenanceTemplates/{id}. */
export interface MaintenanceTemplate {
  id: string;
  name: string;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  order?: number;
}

export type FaultSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FaultStatus = 'open' | 'in-work' | 'fixed';

/** Неисправность: cars/{carId}/faults/{id}. */
export interface Fault {
  id: string;
  title: string;
  description?: string;
  severity: FaultSeverity;
  status: FaultStatus;
  /** Когда заметили. */
  detectedAt: Timestamp | null;
  resolvedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
}

export type FaultDraft = Omit<Fault, 'id' | 'status' | 'resolvedAt' | 'createdAt'>;

export type RepairStatus = 'planned' | 'done';

/** Ремонт по неисправности: cars/{carId}/repairs/{id}. Одна неисправность → несколько ремонтов. */
export interface Repair {
  id: string;
  faultId: string;
  title: string;
  works?: string;
  plannedCost?: number | null;
  plannedDate?: Timestamp | null;
  /** Фактическая цена после подтверждения (может отличаться от плана). */
  actualCost?: number | null;
  actualDate?: Timestamp | null;
  status: RepairStatus;
  notes?: string;
  createdAt?: Timestamp | null;
}

export type RepairDraft = Omit<
  Repair,
  'id' | 'faultId' | 'status' | 'actualCost' | 'actualDate' | 'createdAt'
>;

export type ExpenseType = 'fuel' | 'maintenance' | 'repair' | 'insurance' | 'tax' | 'other';

/** Расход: cars/{carId}/expenses/{id}. */
export interface Expense {
  id: string;
  type: ExpenseType;
  title?: string;
  amount: number;
  currency: string;
  date: Timestamp | null;
  mileageAt?: number | null;
  notes?: string;
  receipt?: StoredFile | null;
  linkedRepairId?: string | null;
  linkedScheduleId?: string | null;
  linkedFuelId?: string | null;
  linkedDocumentId?: string | null;
  createdAt?: Timestamp | null;
}

export type ExpenseDraft = Omit<Expense, 'id' | 'createdAt'>;

/** Заправка: cars/{carId}/fuel/{id}. */
export interface FuelEntry {
  id: string;
  date: Timestamp | null;
  /** Одометр на момент заправки, км. */
  odometerKm: number;
  liters: number;
  pricePerLiter: number | null;
  totalCost: number;
  fullTank: boolean;
  gasStation?: string;
  /** Расход, созданный вместе с заправкой. */
  linkedExpenseId?: string | null;
  createdAt?: Timestamp | null;
}

export type FuelDraft = Omit<FuelEntry, 'id' | 'linkedExpenseId' | 'createdAt'>;

/** Документ авто (ОСАГО, КАСКО, техосмотр): cars/{carId}/documents/{id}. */
export interface VehicleDocument {
  id: string;
  title: string;
  number?: string;
  startDate?: Timestamp | null;
  endDate?: Timestamp | null;
  cost?: number | null;
  notes?: string;
  photo?: StoredFile | null;
  createdAt?: Timestamp | null;
}

export type DocumentDraft = Omit<VehicleDocument, 'id' | 'createdAt'>;

/** Запись журнала пробегов: cars/{carId}/mileage/{id}. */
export interface MileageEntry {
  id: string;
  odometerKm: number;
  date: Timestamp | null;
  photo?: StoredFile | null;
  source?: 'manual' | 'fuel';
  createdAt?: Timestamp | null;
}

/** Запись каталога 3D-моделей: vehicleModels/{make_model}. Чтение — всем, запись — вручную. */
export interface VehicleModel {
  id: string;
  make: string;
  model: string;
  /** Download URL GLB в Storage (модели в public-папке). */
  modelUrl: string;
  previewUrl?: string;
}
