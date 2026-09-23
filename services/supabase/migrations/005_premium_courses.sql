-- Cursos premium pagados con gemas.
-- Un módulo pue}

alter table learning_modules
  add column if not exists is_premium boolean not null default false,
  add column if not exists gems_cost integer not null default 0;

create table if not exists user_module_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  module_id uuid not null references learning_modules(id) on delete cascade,
  gems_spent integer not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, module_id)
);

create index if not exists idx_user_module_unlocks_user on user_module_unlocks(user_id);

-- RLS: cada usuario solo puede LEER sus propios desbloqueos. A propósito no
-- hay política de insert/update/delete para el rol authenticated: la única
-- forma de crear un desbloqueo es la función unlock_premium_module de abajo
-- (security definer), así nadie puede insertar una fila directamente desde
-- el cliente y saltarse el cobro de gemas.
alter table user_module_unlocks enable row level security;

create policy "users select own module unlocks" on user_module_unlocks
  for select using (user_id = auth.uid());

-- Descuenta las gemas del usuario y registra el desbloqueo en una sola
-- transacción atómica (bloquea las filas de users/learning_modules mientras
-- verifica saldo, así dos compras simultáneas no pueden dejar el saldo en
-- negativo). Es idempotente: si el módulo ya estaba desbloqueado, no cobra
-- de nuevo. Solo el propio usuario autenticado puede desbloquear para sí
-- mismo (p_user_id debe coincidir con auth.uid()); esto evita que cualquier
-- usuario autenticado llame la función con el id de otra persona y le
-- descuente las gemas.
create or replace function unlock_premium_module(p_user_id uuid, p_module_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost integer;
  v_is_premium boolean;
  v_gems integer;
begin
  if p_user_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  select gems_cost, is_premium into v_cost, v_is_premium
  from learning_modules
  where id = p_module_id
  for update;

  if not found then
    raise exception 'Módulo no encontrado';
  end if;

  if not v_is_premium then
    raise exception 'Este módulo no es premium';
  end if;

  if exists (
    select 1 from user_module_unlocks
    where user_id = p_user_id and module_id = p_module_id
  ) then
    return;
  end if;

  select gems into v_gems from users where id = p_user_id for update;

  if v_gems is null then
    raise exception 'Usuario no encontrado';
  end if;

  if v_gems < v_cost then
    raise exception 'Gemas insuficientes';
  end if;

  update users set gems = gems - v_cost where id = p_user_id;

  insert into user_module_unlocks (user_id, module_id, gems_spent)
  values (p_user_id, p_module_id, v_cost);
end;
$$;
