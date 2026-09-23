import { getAllUserIdsAndTokens } from '@/services/supabase/userService';
import { createNotificationForUsers } from '@/services/supabase/notificationDbService';
import { NotificationType } from '@/services/supabase/notificationDbService';
import { sendBulkPushNotifications } from '@/services/notifications/notificationService';

async function broadcastNotification(input: {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<void> {
  const users = await getAllUserIdsAndTokens();
  if (users.length === 0) return;

  await createNotificationForUsers(
    users.map((u) => u.id),
    { type: input.type, title: input.title, body: input.body, data: input.data }
  );

  const tokens = users.map((u) => u.pushToken).filter((t): t is string => !!t);
  if (tokens.length > 0) {
    await sendBulkPushNotifications(tokens, input.title, input.body, {
      type: input.type,
      ...input.data,
    });
  }
}

export async function notifyAllUsersCoursePublished(moduleId: string, title: string): Promise<void> {
  await broadcastNotification({
    type: 'course_published',
    title: '📚 ¡Nuevo curso disponible!',
    body: `Ya puedes aprender "${title}" en la sección de cursos.`,
    data: { moduleId, title },
  });
}

export async function notifyAllUsersCompanyPublished(companyId: string, name: string): Promise<void> {
  await broadcastNotification({
    type: 'company_published',
    title: '🏢 ¡Nueva empresa disponible!',
    body: `Descubre "${name}" y empieza a invertir.`,
    data: { companyId, companyName: name },
  });
}
