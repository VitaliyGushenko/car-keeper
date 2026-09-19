#!/usr/bin/env bash
# ============================================================
# CarKeeper — полное обновление прода
#   ./deploy.sh              — тесты + сборка + деплой (полный цикл)
#   ./deploy.sh --skip-tests — без unit-тестов
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

SKIP_TESTS=false
if [[ "${1:-}" == "--skip-tests" ]]; then
  SKIP_TESTS=true
fi

echo "==> Проверка окружения"
command -v firebase >/dev/null 2>&1 || {
  echo "❌ firebase CLI не найден. Установите: npm i -g firebase-tools"
  exit 1
}
firebase projects:list >/dev/null 2>&1 || {
  echo "❌ Нет входа в Firebase. Выполните: firebase login"
  exit 1
}
echo "    OK: CLI на месте, вход выполнен"

if [ "$SKIP_TESTS" = false ]; then
  echo "==> Unit-тесты (ChromeHeadless)"
  npx ng test --watch=false --browsers=ChromeHeadless
else
  echo "==> Unit-тесты пропущены (--skip-tests)"
fi

echo "==> Сборка прод-версии"
npm run build

echo "==> Деплой: hosting + правила Firestore"
firebase deploy --only hosting,firestore:rules --project car-keeper-a97bb

echo ""
echo "✅ Прод обновлён: https://car-keeper-a97bb.web.app"
