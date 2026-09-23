-- NOTA: esta migración ya fue aplicada directamente sobre el proyecto de
-- Supabase (vía MCP) durante la sesión donde se implementó. Se deja aquí por
-- completitud/versionado del esquema; todas las sentencias son idempotentes
-- (seguras de volver a correr) salvo por el "drop constraint" inicial, que
-- solo falla si el constraint ya no existiera con ese nombre exacto.

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type = ANY (ARRAY[
    'gems_assigned'::text,
    'report_generated'::text,
    'contract_expiring_soon'::text,
    'contract_expired'::text,
    'admin_contracts_alert'::text
  ]));

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.notify_contract_expirations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  soon_count int := 0;
  today_count int := 0;
  admin_rec record;
  admin_body text;
begin
  -- 1) Inversionista: contrato vence en 5 días
  for rec in
    select i.id, i.user_id, i.company_name, i.contract_end_date, u.push_token
    from investments i
    join users u on u.id = i.user_id
    where i.interest_type is not null
      and i.contract_end_date = current_date + 5
      and not exists (
        select 1 from notifications n
        where n.type = 'contract_expiring_soon' and n.data->>'investmentId' = i.id::text
      )
  loop
    insert into notifications (user_id, type, title, body, data)
    values (
      rec.user_id, 'contract_expiring_soon', '⏳ Tu contrato está por vencer',
      'Tu contrato de inversión' || coalesce(' con ' || rec.company_name, '') ||
        ' vence el ' || to_char(rec.contract_end_date, 'DD/MM/YYYY') || ' (en 5 días).',
      jsonb_build_object('investmentId', rec.id, 'companyName', rec.company_name, 'contractEndDate', rec.contract_end_date)
    );
    soon_count := soon_count + 1;

    if rec.push_token is not null then
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'to', rec.push_token, 'sound', 'default',
          'title', '⏳ Tu contrato está por vencer',
          'body', 'Tu contrato de inversión' || coalesce(' con ' || rec.company_name, '') || ' vence en 5 días.',
          'priority', 'high'
        )
      );
    end if;
  end loop;

  -- 2) Inversionista: contrato vence hoy
  for rec in
    select i.id, i.user_id, i.company_name, i.contract_end_date, u.push_token
    from investments i
    join users u on u.id = i.user_id
    where i.interest_type is not null
      and i.contract_end_date = current_date
      and not exists (
        select 1 from notifications n
        where n.type = 'contract_expired' and n.data->>'investmentId' = i.id::text
      )
  loop
    insert into notifications (user_id, type, title, body, data)
    values (
      rec.user_id, 'contract_expired', '📅 Tu contrato vence hoy',
      'Tu contrato de inversión' || coalesce(' con ' || rec.company_name, '') || ' vence hoy. Contacta al administrador para renovarlo o cerrarlo.',
      jsonb_build_object('investmentId', rec.id, 'companyName', rec.company_name, 'contractEndDate', rec.contract_end_date)
    );
    today_count := today_count + 1;

    if rec.push_token is not null then
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'to', rec.push_token, 'sound', 'default',
          'title', '📅 Tu contrato vence hoy',
          'body', 'Tu contrato de inversión' || coalesce(' con ' || rec.company_name, '') || ' vence hoy.',
          'priority', 'high'
        )
      );
    end if;
  end loop;

  -- 3) Aviso agregado a los admins (uno por día, solo si hay algo que reportar)
  if soon_count > 0 or today_count > 0 then
    admin_body := '';
    if soon_count > 0 then
      admin_body := soon_count || case when soon_count = 1 then ' contrato vence' else ' contratos vencen' end || ' en 5 días';
    end if;
    if today_count > 0 then
      if admin_body <> '' then admin_body := admin_body || ' y '; end if;
      admin_body := admin_body || today_count || case when today_count = 1 then ' contrato vence' else ' contratos vencen' end || ' hoy';
    end if;
    admin_body := admin_body || '.';

    for admin_rec in
      select id, push_token from users where role = 'admin'
    loop
      if not exists (
        select 1 from notifications
        where user_id = admin_rec.id
          and type = 'admin_contracts_alert'
          and created_at::date = current_date
      ) then
        insert into notifications (user_id, type, title, body, data)
        values (
          admin_rec.id, 'admin_contracts_alert', '📋 Contratos por vencer',
          admin_body,
          jsonb_build_object('soonCount', soon_count, 'todayCount', today_count)
        );

        if admin_rec.push_token is not null then
          perform net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := jsonb_build_object(
              'to', admin_rec.push_token, 'sound', 'default',
              'title', '📋 Contratos por vencer',
              'body', admin_body,
              'priority', 'high'
            )
          );
        end if;
      end if;
    end loop;
  end if;
end;
$$;

select cron.schedule('notify-contract-expirations', '0 12 * * *', $$select public.notify_contract_expirations();$$);
