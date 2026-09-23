import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Elimina la cuenta del usuario que llama (identificado por su propio JWT,
// nunca por un id recibido en el body): borra su avatar en Storage si tiene
// uno, borra la fila de public.users (lo que en cascada borra investments,
// gem_requests, notifications, user_modules, user_milestones y
// user_module_unlocks), y finalmente borra el usuario de auth.users. Usa la
// service role key porque admin.deleteUser y el borrado de la fila de
// users requieren privilegios que el cliente nunca tiene.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await admin
      .from('users')
      .select('avatar')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.avatar) {
      try {
        const avatarPath = profile.avatar.split('/avatars/')[1];
        if (avatarPath) {
          await admin.storage.from('avatars').remove([decodeURIComponent(avatarPath)]);
        }
      } catch (storageError) {
        console.error('No se pudo borrar el avatar en Storage:', storageError);
      }
    }

    const { error: deleteRowError } = await admin.from('users').delete().eq('id', user.id);
    if (deleteRowError) {
      if (deleteRowError.code === '23503') {
        return jsonResponse({
          error: 'No se puede eliminar esta cuenta porque tiene reportes de inversión asociados como autor. Contacta a soporte.',
        }, 409);
      }
      throw deleteRowError;
    }

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) throw deleteAuthError;

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('delete-account error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Error inesperado' }, 500);
  }
});
