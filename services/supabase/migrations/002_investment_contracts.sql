-- Ejecutar una sola vez en el SQL Editor del proyecto Supabase.
-- Agrega los datos de "contrato" (monto = gemas, vigencia, tipo de interés y tasa)
-- a las inversiones asignadas por el admin, y permite que cada reporte mensual
-- quede vinculado a un contrato concreto + guarde la foto del comprobante.
-- No borra ni renombra ninguna columna existente.

-- ─── Contrato de inversión (se fija una sola vez al asignar gemas) ─────────
alter table investments
  add column contract_start_date date,
  add column contract_end_date date,
  add column interest_type text check (interest_type in ('simple', 'compuesto')),
  add column interest_rate numeric;

-- La empresa ya no es obligatoria al asignar gemas ni al generar reportes: si
-- las columnas company_id / company_name eran NOT NULL, se relajan (no falla
-- si ya eran nullable).
alter table investments alter column company_id drop not null;
alter table investments alter column company_name drop not null;
alter table investment_reports alter column company_id drop not null;
alter table investment_reports alter column company_name drop not null;


-- ─── Reporte mensual: vínculo al contrato + comprobante ───────────────────
alter table investment_reports
  add column investment_id uuid references investments(id) on delete set null,
  add column interest_type text,
  add column contract_start_date date,
  add column contract_end_date date,
  add column receipt_image_url text;

-- La foto de comprobante se sube al bucket "receipts" ya existente (mismo que usa
-- la compra de gemas), bajo el prefijo "report-receipts/", así que no se necesita
-- crear un bucket ni políticas de Storage nuevas.
