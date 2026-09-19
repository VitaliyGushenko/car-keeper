# CarKeeper

Учёт автомобилей: расходы, ремонты, регламенты обслуживания и 3D-модели.

Angular 19 (standalone, signals) + Firebase (Auth, Firestore, Storage, Hosting, Analytics).

## Возможности

- **Авторизация** — email/пароль (Firebase Auth), русский текст ошибок, восстановление пароля.
- **Автомобили** — марка, модель, год, VIN, госномер, пробег с датой замера, фото (сжатие на клиенте).
- **3D-модели** — автоподстановка по марке+модели из каталога `vehicleModels`, просмотр через `<model-viewer>`, можно загрузить свой GLB.
- **Регламенты ТО** — дефолтный набор копируется при добавлении авто; интервалы по км и месяцам; статусы «в порядке / скоро / просрочено».
- **Неисправности и ремонты** — одна неисправность → несколько ремонтов: план (цена, дата) → подтверждение с фактической ценой и датой.
- **Расходы** — топливо/ремонт/страховка/налоги, фото чека, сводки по категориям и месяцам; подтверждённые ремонты попадают в расходы автоматически.
- **Дашборд** — просроченные ТО и открытые поломки по всем авто, расходы за месяц.

## Разработка

```bash
npm install     # один раз
npm start       # http://localhost:4200
npm run build   # прод-сборка → dist/car-keeper/browser
npm test        # unit-тесты (Karma)
```

Конфиг Firebase уже лежит в `src/environments/environment.ts` (для прод-сборки — `environment.prod.ts`, подставляется через fileReplacements).

## Firebase-проект

Проект: **car-keeper-a97bb** (см. `.firebaserc`).

Перед первым запуском в Firebase Console:

1. **Authentication → Sign-in method** — включить провайдер **Email/Password**.
2. **Firestore Database** — создать базу (production mode).
3. **Storage** — создать бакет (production mode).
4. **CORS для Storage** — обязательно для загрузок из браузера (фото, GLB). В Console UI нет — используйте Cloud Shell ([console.cloud.google.com](https://console.cloud.google.com), иконка терминала вверху):

```bash
gcloud storage buckets update gs://car-keeper-a97bb.firebasestorage.app \
  --cors-file=cors.json   # cors.json лежит в корне репозитория
```

Без этого любая загрузка файлов упрётся в ошибку «blocked by CORS policy».


Правила безопасности живут в репозитории: `firestore.rules` и `storage.rules` — деплоятся CI-ем вместе с хостингом (или вручную: `firebase deploy --only firestore:rules,storage`).

## Структура данных (Firestore)

```
users/{uid}                             — email, настройки (валюта)
cars/{carId}                            — авто владельца uid
  ├── schedules/{id}                    — регламенты ТО
  ├── faults/{id}                       — неисправности
  ├── repairs/{id}                      — ремонты (faultId → неисправность)
  └── expenses/{id}                     — расходы (linkedRepairId → ремонт)
vehicleModels/{make_model}              — каталог 3D-моделей (public read)
maintenanceTemplates/{id}               — шаблоны регламентов (public read)
```

Storage:

```
cars/{uid}/{carId}/photos/**            — фото авто
cars/{uid}/{carId}/receipts/**          — фото чеков
cars/{uid}/{carId}/model/**             — пользовательские GLB
models/**                               — GLB каталога (public read)
```

## Каталог 3D-моделей

Чтобы 3D-модель подставилась автоматически:

1. Загрузите файл GLB в Storage в папку `models/` (например `models/lada_vesta.glb`).
2. Скопируйте его **download URL**.
3. В Firestore создайте документ в коллекции `vehicleModels` с id `lada_vesta` (нормализованные марка_модель, латиница/кириллица в нижнем регистре):

| поле | значение |
|---|---|
| `make` | `Lada` |
| `model` | `Vesta` |
| `modelUrl` | `https://firebasestorage…` |
| `previewUrl` | (необязательно) ссылка на превью |

Пользователь добавит авто «Lada Vesta» — модель подставится сама (см. `core/normalize.ts`).

## Деплой (GitHub Actions → Firebase Hosting)

Пуш в `main` автоматически собирает прод-версию и деплоит hosting + правила (`.github/workflows/deploy.yml`).

Одна настройка — секрет `FIREBASE_SERVICE_ACCOUNT` в GitHub (Settings → Secrets and variables → Actions):

```bash
# 1. Создайте service account с ролью «Firebase Admin» (или используйте firebase-adminsdk из проекта):
#    Firebase Console → Project settings → Service accounts → Generate new private key
# 2. Сохраните содержимое JSON-ключа как секрет FIREBASE_SERVICE_ACCOUNT.
```

Локальный деплой (если нужно вручную): `firebase deploy` после `firebase login`.

## Git

```bash
git remote -v   # origin → github.com/VitaliyGushenko/car-keeper.git
git push -u origin main
```
