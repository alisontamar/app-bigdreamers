-- Ejecutar una sola vez en el SQL Editor del proyecto Supabase.
-- Permite que un usuario solicite gemas directamente (sin paquete ni
-- comprobante de pago) desde el botón "Recargar gemas" en Perfil, y que el
-- admin reciba una notificación in-app automática con cada solicitud nueva.

-- ─── gem_requests: package_id / bs_price pasan a ser opcionales ───────────
-- El flujo viejo (paquete + comprobante) sigue funcionando igual; estos
-- campos solo quedan en null para las solicitudes "libres" nuevas.
alter table gem_requests alter column package_id drop not null;
alter table gem_requests alter column bs_price drop not null;
alter table gem_requests alter column bs_price set default 0;

-- ─── Nuevos tipos de notificación ──────────────────────────────────────────
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type = ANY (ARRAY[
    'gems_assigned'::text,
    'report_generated'::text,
    'contract_expiring_soon'::text,
    'contract_expired'::text,
    'admin_contracts_alert'::text,
    'course_published'::text,
    'company_published'::text,
    'gem_request_pending'::text,
    'gem_request_rejected'::text
  ]));

-- ─── RPC: crear solicitud + notificar a todos los admins ──────────────────
-- SECURITY DEFINER porque la política de insert de "notifications" solo deja
-- insertar a quien ya es admin (auth.uid() con role = 'admin'); un usuario
-- normal no podría notificar al admin de otra forma sin abrir esa tabla a
-- cualquiera. Esta función corre con permisos elevados y hace ambas cosas
-- (insertar la solicitud + notificar) en una sola transacción.
create or replace function request_gems(p_user_id uuid, p_gems integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_user_name text;
begin
  if p_gems is null or p_gems <= 0 then
    raise exception 'La cantidad de gemas debe ser mayor a 0';
  end if;

  select name into v_user_name from users where id = p_user_id;

  insert into gem_requests (user_id, gems, status)
  values (p_user_id, p_gems, 'pending')
  returning id into v_request_id;

  insert into notifications (user_id, type, title, body, data)
  select
    u.id,
    'gem_request_pending',
    '💎 Nueva solicitud de gemas',
    coalesce(v_user_name, 'Un usuario') || ' solicitó ' || p_gems || ' gemas.',
    jsonb_build_object('requestId', v_request_id, 'userId', p_user_id, 'gems', p_gems)
  from users u
  where u.role = 'admin';

  return v_request_id;
end;
$$;

grant execute on function request_gems(uuid, integer) to authenticated;
