import { getSupabaseClient } from '@/services/supabase/supabase';

// Elimina permanentemente la cuenta del usuario logueado (perfil, inversiones,
// gemas, notificaciones, progreso y la cuenta de autenticación). Lo hace la
// función delete-account con la service role key, porque el cliente nunca
// tiene permisos para borrar auth.users directamente.
export async function deleteAccount(): Promise<void> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('delete-account');

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
