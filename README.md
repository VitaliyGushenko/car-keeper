# CarKeeper

Учёт автомобилей: расходы, ремонты, регламенты обслуживания и 3D-модели.

Angular 19 (standalone, signals) + Firebase (Auth, Firestore, Hosting, Analytics) + Supabase Storage (файлы).

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

Конфиг Firebase и Supabase лежит в `src/environments/environment.ts` (для прод-сборки — `environment.prod.ts`, подставляется через fileReplacements).

## Firebase-проект

Проект: **car-keeper-a97bb** (см. `.firebaserc`).

Перед первым запуском в Firebase Console:

1. **Authentication → Sign-in method** — включить провайдер **Email/Password**.
2. **Firestore Database** — создать базу (production mode).

Правила безопасности Firestore живут в репозитории: `firestore.rules` — деплоятся CI-ем вместе с хостингом (или вручную: `firebase deploy --only firestore:rules`).

## Файлы: Supabase Storage

Firebase Storage требует план Blaze с привязанной картой, поэтому файлы (фото авто, чеки, пользовательские GLB) хранятся в **Supabase Storage** (бесплатно, без карты):

1. Зарегистрируйтесь на [supabase.com](https://supabase.com) и создайте проект (Free).
2. **Storage → New bucket**: имя `car-keeper`, включите **Public bucket**.
3. **Project Settings → API**: скопируйте **Project URL** и **anon public key**.
4. Впишите их в `src/environments/environment.ts` и `environment.prod.ts` (поля `supabase.url` / `supabase.anonKey`).

CORS у Supabase Storage открыт по умолчанию — ничего дополнительно настраивать не нужно.

Пути в бакете (чтение публичное, приватность обеспечивается неугадываемыми путями):

```
cars/{uid}/{carId}/photos/**    — фото авто
cars/{uid}/{carId}/receipts/**  — фото чеков
cars/{uid}/{carId}/model/**     — пользовательские GLB
```

## Каталог 3D-моделей

Каталог хранится прямо в репозитории (`public/models/`) и раздаётся Firebase Hosting — без карты и CORS (same-origin):

1. Положите файл в `public/models/` (например, `public/models/lada_vesta.glb`). Оптимизируйте вес (~5–10 МБ): `npx @gltf-transform/cli optimize model.glb public/models/lada_vesta.glb`.
2. Закоммитьте и задеплойте — файл доступен по пути `/models/lada_vesta.glb` (в dev — на localhost:4200, в проде — на домене Hosting).
3. В Firestore создайте документ в коллекции `vehicleModels` с id `lada_vesta` (нормализованные марка_модель, см. `core/normalize.ts`):

| поле | значение |
|---|---|
| `make` | `Lada` |
| `model` | `Vesta` |
| `modelUrl` | `/models/lada_vesta.glb` |
| `previewUrl` | (необязательно) ссылка на превью |

Пользователь добавит авто «Lada Vesta» — модель подставится сама.

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

## Деплой (GitHub Actions → Firebase Hosting)

Пуш в `main` автоматически собирает прод-версию и деплоит hosting + правила Firestore (`.github/workflows/deploy.yml`).

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
