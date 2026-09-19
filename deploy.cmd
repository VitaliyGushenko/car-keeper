@echo off
rem ============================================================
rem CarKeeper - полная сборка + деплой (hosting + правила Firestore)
rem Для тестов отдельно: npx ng test --watch=false --browsers=ChromeHeadless
rem ============================================================
echo ==^> Сборка прод-версии
call npm run build
if errorlevel 1 goto :err

echo ==^> Деплой: hosting + правила Firestore
call firebase deploy --only hosting,firestore:rules --project car-keeper-a97bb
if errorlevel 1 goto :err

echo.
echo ✅ Прод обновлён: https://car-keeper-a97bb.web.app
goto :eof

:err
echo ❌ Ошибка деплоя - см. сообщения выше
exit /b 1
