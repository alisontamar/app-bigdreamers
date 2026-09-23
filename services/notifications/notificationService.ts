import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSupabaseClient } from '@/services/supabase/supabase';

// En Expo Go (SDK 53+) el módulo expo-notifications lanza un error FATAL al
// evaluarse porque el push remoto fue removido de Expo Go. Por eso NO lo
// importamos estáticamente: lo cargamos de forma perezosa y sólo fuera de Expo Go.
// En un development build o en el APK, expo-notifications funciona normal.
const isExpoGo = Constants.appOwnership === 'expo';

async function loadNotifications() {
  if (isExpoGo) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

// Permite a app/_layout.tsx escuchar cuándo el usuario toca una notificación
// push (fuera de la app) sin duplicar la carga perezosa de expo-notifications.
export async function getNotificationsModule() {
  return loadNotifications();
}

export function setupNotificationHandler() {
  if (isExpoGo) return;
  loadNotifications()
    .then((Notifications) => {
      if (!Notifications) return;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    })
    .catch((e) => console.warn('Failed to set notification handler:', e));
}

export async function registerForPushNotifications(): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  try {
    const existingPerm: any = await Notifications.getPermissionsAsync();
    let granted = existingPerm.granted;

    if (!granted) {
      const result: any = await Notifications.requestPermissionsAsync();
      granted = result.granted;
    }

    if (!granted) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    const pushToken = tokenData.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD740',
      });
    }

    return pushToken;
  } catch (error) {
    return null;
  }
}

// Solo consulta el estado del permiso, sin pedirlo. Se usa para recordarle al
// usuario que las active si aún no lo hizo, cada vez que vuelve a la app.
// En Expo Go (push no soportado) devuelve true para no molestar con el aviso.
export async function hasNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return true;

  try {
    const perm: any = await Notifications.getPermissionsAsync();
    return !!perm.granted;
  } catch {
    return true;
  }
}

export async function savePushToken(userId: string, pushToken: string): Promise<void> {
  const supabase = await getSupabaseClient();
  await supabase
    .from('users')
    .update({ push_token: pushToken })
    .eq('id', userId);
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      }),
    });
    const result = await response.json();
    const ticket = Array.isArray(result?.data) ? result.data[0] : result?.data;
    if (ticket?.status === 'error') {
      console.error('Expo push error:', ticket.message, ticket.details);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

const EXPO_PUSH_BATCH_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Envía el mismo push a muchos tokens de una vez (avisos masivos: nuevo curso,
// nueva empresa). Expo acepta hasta 100 mensajes por request, por eso se
// divide en lotes.
export async function sendBulkPushNotifications(
  expoPushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const batches = chunk(expoPushTokens, EXPO_PUSH_BATCH_SIZE);

  for (const batch of batches) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          batch.map((to) => ({
            to,
            sound: 'default',
            title,
            body,
            data: data || {},
            priority: 'high',
          }))
        ),
      });
      const result = await response.json();
      const tickets = Array.isArray(result?.data) ? result.data : [];
      tickets.forEach((ticket: any) => {
        if (ticket?.status === 'error') {
          console.error('Expo push error:', ticket.message, ticket.details);
        }
      });
    } catch (error) {
      console.error('Error sending bulk push notification:', error);
    }
  }
}

export async function sendGemRequestNotification(
  userPushToken: string,
  status: 'approved' | 'rejected',
  gems: number,
  reason?: string
): Promise<void> {
  const title = status === 'approved'
    ? '✅ ¡Gemas aprobadas!'
    : '❌ Solicitud rechazada';

  const body = status === 'approved'
    ? `¡Felicidades! Tu solicitud de ${gems} gemas fue aprobada. Ya están disponibles en tu cuenta.`
    : reason
      ? `Tu solicitud de ${gems} gemas fue rechazada. Motivo: ${reason}`
      : `Tu solicitud de ${gems} gemas fue rechazada. Contacta al administrador para más información.`;

  await sendPushNotification(userPushToken, title, body, {
    type: 'gem_request',
    status,
    gems,
  });
}

export async function sendGemsAssignedNotification(
  userPushToken: string,
  gems: number,
  companyName?: string
): Promise<void> {
  const title = '💎 ¡Gemas asignadas!';
  const body = companyName
    ? `El administrador te asignó ${gems} gemas para tu inversión en ${companyName}.`
    : `El administrador te asignó ${gems} gemas. Ya están disponibles en tu cuenta.`;

  await sendPushNotification(userPushToken, title, body, {
    type: 'gems_assigned',
    gems,
    companyName,
  });
}

export async function sendReportGeneratedNotification(
  userPushToken: string,
  pdfUrl: string,
  companyName?: string
): Promise<void> {
  const title = '📄 Nuevo reporte disponible';
  const body = companyName
    ? `Se generó tu reporte mensual de inversión en ${companyName}. Ya puedes descargarlo.`
    : 'Se generó tu reporte mensual de inversión. Ya puedes descargarlo.';

  await sendPushNotification(userPushToken, title, body, {
    type: 'report_generated',
    companyName,
    pdfUrl,
  });
}
