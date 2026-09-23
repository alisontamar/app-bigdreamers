-- Agrega los tipos de notificación para avisos masivos (a todos los usuarios)
-- cuando el admin publica un curso nuevo o una empresa nueva.

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type = ANY (ARRAY[
    'gems_assigned'::text,
    'report_generated'::text,
    'contract_expiring_soon'::text,
    'contract_expired'::text,
    'admin_contracts_alert'::text,
    'course_published'::text,
    'company_published'::text
  ]));
