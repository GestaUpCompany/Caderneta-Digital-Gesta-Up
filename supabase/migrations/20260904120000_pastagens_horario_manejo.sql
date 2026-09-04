-- Adiciona coluna horario_manejo em registros_pastagens
-- Permite que o peão informe o horário real do manejo, independentemente
-- do timestamp de salvamento do registro. O campo data já leva o horário
-- informado (via api.ts), mas horario_manejo fica separado para auditoria.

ALTER TABLE public.registros_pastagens
  ADD COLUMN IF NOT EXISTS horario_manejo time;
