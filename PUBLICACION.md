# Publicación de BigDreamers - Notas y roadmap

## Estado actual (Google Play)

- Package name corregido: `com.bigdreamers` (antes tenía un typo: `com.bigdreamerss.bigdreamerss`).
- Se detectó mismatch de firma: el `.aab` subido estaba firmado con un keystore distinto al que Play Console esperaba.
- Se solicitó **restablecimiento de la clave de carga** (upload key reset) en Play Console, adjuntando el certificado correcto (`upload_certificate.pem`, exportado del keystore que usa EAS: `@bigdramers__bolt-expo-nativewind.jks`).
- Solicitud **aprobada**. La nueva clave de carga entra en vigencia el **Jul 11, 2026, 3:08 AM UTC** (= **Jul 10, 2026, ~11:08 PM hora Bolivia**). Es un periodo de seguridad obligatorio de Google (~72h), no una demora real. No se puede subir ningún `.aab`/`.apk` nuevo hasta esa hora.

## Comandos útiles

Generar el `.aab` (para subir a Play Console):
```
eas build --platform android --profile production
```

Generar un `.apk` (para instalar directo en un dispositivo, pruebas rápidas):
```
eas build --platform android --profile production-apk
```

Ver/gestionar credenciales de firma de Android:
```
eas credentials -p android
```

## Roadmap - Google Play (una vez aprobado el reset de la clave)

1. **Volver a subir el mismo `.aab`** a la versión de Prueba interna (ya no debería marcar error de firma).
2. **Completar info de la app** que Play Console pida antes de repartir el link:
   - Política de privacidad (URL pública)
   - Clasificación de contenido (cuestionario)
   - Público objetivo y contenido
   - Declaración de anuncios
   - Seguridad de los datos (data safety)
   - Acceso a la app (credenciales de prueba si hay login)
   - Ficha de tienda básica (ícono, descripción, capturas)
3. **Agregar testers a Prueba interna**: lista de correos en Testers, compartir el link de opt-in.
4. **Prueba cerrada**: mínimo 12 verificadores (correos de Google que acepten y instalen), corriendo 14 días continuos sin bajar de 12. Esto es requisito de Google para cuentas nuevas antes de poder pedir acceso a producción.
5. **Solicitar acceso a producción** (botón se habilita tras cumplir el paso 4).
6. **Monetización**: vincular cuenta de comerciante en "Monetiza con Play" antes de activar compras/suscripciones reales.
7. **Publicar en producción**: subir versión final, esperar revisión de Google (horas a días), queda disponible al público.

## Roadmap - Apple App Store

1. ~~**Cuenta de Apple Developer Program** (99 USD/año).~~ **Listo** — cuenta obtenida.
2. ~~**Configurar el proyecto para iOS**~~ **Listo** — ya está en el repo:
   - `bundleIdentifier` presente en `app.json` (`ios.bundleIdentifier: "com.bigdreamers"`).
   - El perfil `production` de `eas.json` ya incluye bloque `ios` (comparte `env` con Android); no hace falta un perfil separado, `eas build -p ios` lo usa tal cual.
3. ~~**Registrar el App ID**~~ **Listo**.
4. ~~**Crear el registro de la app en App Store Connect**~~ **Listo**.
5. ~~**Completar metadata**~~ **Listo**.
6. ~~**Build y subida**~~ **Listo**.
7. ~~**Responder solicitud de info adicional de Apple**~~ **Listo** — se sacó del flujo el cobro de gemas dentro de la app (ahora solo se solicitan y un admin las asigna manualmente, sin IAP), se grabó el video de demo con un build `preview` instalado vía QR (ad-hoc, sin TestFlight) en un iPhone 11 (iOS 18.7.8), y se respondió en el Resolution Center con el video + las notas (dispositivo probado, descripción de la app, servicios externos usados: Supabase, Sign in with Apple/Google, Expo push).
8. ~~**Enviar a revisión de App Store**~~ **APROBADA** ✅ (aprobación recibida, disponible en el App Store en hasta 24h desde la aprobación).
9. **Pendiente si se monetiza en el futuro**: configurar Acuerdos, Impuestos y Datos bancarios en App Store Connect (sección "Agreements, Tax, and Banking") antes de activar compras/suscripciones.
10. ~~Una vez aprobada, se publica y queda disponible en el App Store.~~ **Listo**.
