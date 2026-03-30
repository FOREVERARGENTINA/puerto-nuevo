# Firebase Emulado v1

## Resumen
- El entorno local usará `Auth`, `Firestore`, `Functions` y `Storage` emulados con un `projectId` de prueba único (`demo-puerto-nuevo`) para no depender del proyecto real.
- Las reglas que se probarán serán exactamente las del repo: `firestore.rules` y `storage.rules` cargadas desde `firebase.json`. Si faltan o no cargan, el arranque debe fallar.
- El mismo contrato servirá para local y CI: un solo comando arranca emuladores, resetea/siembra datos, levanta Vite y corre tests.
- Email y push quedarán en modo seguro: no salen a Brevo ni FCM; se registran en `emulatorOutbox`.

## Cambios clave
- En `src/config/firebase.js`, agregar modo emulado por env para conectar `connectAuthEmulator`, `connectFirestoreEmulator`, `connectFunctionsEmulator` y `connectStorageEmulator`, usando el mismo `projectId` demo que los emuladores.
- En `firebase.json`, definir puertos fijos y mantener como fuente única de reglas de producción para emulador.
- Agregar tests directos de reglas con `@firebase/rules-unit-testing` para Firestore y Storage; no depender solo de Playwright para validar permisos.
- Definir el contrato de E2E así:
  - `firebase emulators:exec` es quien arranca y apaga emuladores.
  - Un script wrapper hace `reset + seed + espera de puertos + ejecución de Playwright`.
  - `playwright.config` usa `webServer` solo para Vite.
  - `globalSetup` no arranca infraestructura; solo puede preparar `storageState` o verificar precondiciones.
- No hacer un refactor amplio de Functions al inicio.
  - Solo extraer handlers internos mínimos para `onConversationMessageCreated`, `onConversationUpdated`, `sendSnacksReminder` y `sendAppointmentSameDayReminder`.
  - Cada extracción debe entrar con tests de paridad antes de reutilizarse en seed o comandos manuales.
  - El resto de triggers queda sin refactor en v1.
- Seed estable y amplio para todos los roles, con UIDs y documentos fijos.
  - Usuarios demo con custom claims y espejo en `users`.
  - Datos para conversaciones, turnos, snacks, eventos, documentos, talleres y social.
  - Subir durante el seed 2-3 archivos binarios mínimos de fixture a Storage para cubrir avatar/galería/medios y evitar dashboards rotos por “sin archivo”.
- Mantener una limitación explícita:
  - No se replica una galería pesada ni videos grandes de producción.
  - Si una vista falla aun con fixtures mínimos, se considera bug del entorno local y se corrige.

## CI/CD
- Como el repo hoy no tiene workflows, agregar uno nuevo para PR y rama principal.
- El workflow instalará:
  - dependencias raíz del repo
  - dependencias de `functions`
  - navegadores y dependencias de sistema de Playwright con `npx playwright install --with-deps`
  - JDK requerido por Firebase Emulator Suite
- Luego ejecutará el mismo comando orquestado que local.
- El pipeline bloqueará merge con:
  - tests de reglas Firestore/Storage
  - tests de Functions extraídas
  - smoke E2E emulado
- La suite completa por todos los roles queda disponible en local y puede pasar a nightly cuando estabilice; en PR se corre smoke para mantener tiempos razonables.

## Plan de pruebas
- Reglas Firestore:
  - familia solo accede a sus hijos, documentos y conversaciones permitidas
  - admin/coordinación/docente/tallerista respetan permisos reales
- Reglas Storage:
  - uploads permitidos y denegados según rol y path
  - lectura de paths privados y públicos según reglas actuales
- Functions:
  - nuevo mensaje escuela→familia genera registro `push` en `emulatorOutbox`
  - cierre de conversación limpia `mensajesSinLeerEscuela` sin alterar lectura familiar
  - recordatorio semanal de snacks crea comunicaciones y marca recordatorios
  - recordatorio de turnos del día registra emails simulados sin proveedor real
- Playwright:
  - login por rol
  - conversación admin/familia
  - eventos
  - snacks
  - turnos
  - un flujo real con upload a Storage emulator

## Supuestos y defaults
- Tú instalas `Vitest` y `Playwright`; esta parte asume que el repo ya tiene la config mínima para correrlos.
- El entorno emulado nunca se activa por defecto; solo con variables/scripts explícitos.
- El `projectId` demo se usa en todas las invocaciones de emulador, tests de reglas y E2E para evitar mezcla con producción.
- La referencia técnica base será la documentación oficial de Firebase Emulator Suite, `rules-unit-testing` y `Playwright webServer/globalSetup`:
  - https://firebase.google.com/docs/emulator-suite/install_and_configure
  - https://firebase.google.com/docs/rules/unit-tests
  - https://playwright.dev/docs/next/test-webserver
  - https://playwright.dev/docs/next/test-global-setup-teardown
