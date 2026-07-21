# Auralis Mobile

Aplicación nativa Expo/React Native de Auralis. Usa la misma cuenta, deployment
de producción y datos Convex que `turnos.valentorassa.com`. No usa WebView.

## Funciones incluidas

- Login con sesión guardada en `expo-secure-store`
- Resumen de hoy, agenda diaria y tareas en tiempo real
- Alta, edición y eliminación nativa de actividades desde Hoy y Agenda
- Tipos con paciente, pago y recordatorio condicionales, incluyendo Curso Armas / CLU y actividades que terminan al día siguiente
- Fichas de pacientes con datos administrativos, alertas, estadísticas, próximo turno, historial y WhatsApp
- Alta y edición de pacientes
- Generación de los próximos seis meses del psiquiatra y asignación de pacientes a horarios libres
- Ajustes de jornada y duración predeterminada, y consulta de capacidades de tipos
- Bloqueo biométrico opcional con re-bloqueo al mandar la app a segundo plano
- Notificaciones locales privadas: el contenido visible no contiene nombres de pacientes

## Configuración

```bash
cd mobile
npm install
cp .env.example .env.local
```

Definí la URL del deployment Convex de producción en `.env.local`:

```env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Las dependencias nativas deben instalarse con la versión compatible de Expo:

```bash
npx expo install @react-native-community/datetimepicker expo-local-authentication expo-notifications
```

Los plugins requeridos están declarados en `app.json`. Después de cambiar un
plugin es necesario crear un nuevo development build; Expo Go no representa
todas las capacidades nativas de biometría y notificaciones.

## Ejecutar

Desde la raíz del repo:

```bash
npm run mobile
```

O desde `mobile/`:

```bash
npm run android
npm run ios
```

## Validación

```bash
cd mobile
npx tsc --noEmit
npm run lint
npx expo-doctor
npx expo export --platform android
```

## Notificaciones

La app registra los `ExpoPushToken` por usuario y Convex revisa cada cinco
minutos los recordatorios vencidos para enviarlos mediante Expo Push Service.
Si todavía no existe un proyecto EAS, Auralis usa una notificación local como
fallback. Los tokens se eliminan al cerrar sesión.

Para activar push remoto hay que definir `EXPO_PUBLIC_EAS_PROJECT_ID` y
configurar las credenciales APNs/FCM del proyecto EAS.

No se deben incluir nombres, teléfonos ni datos clínicos en el payload remoto.

## Arquitectura compartida

`convex/` se publica dentro del repo como el paquete privado
`@auralis/backend`, de modo que web y mobile consumen las mismas referencias
tipadas. El formulario mobile también acepta defensivamente metadata opcional
de tipos (`requiresPatient`, `tracksPayment`, `supportsReminder` y `code`), con
fallbacks por nombre para deployments que todavía no la exponen.

## Pendiente para distribución

- Proyecto EAS, credenciales de firma y builds internos
- Íconos y splash finales
- Pruebas físicas de Face ID/Touch ID y canales de notificación Android
