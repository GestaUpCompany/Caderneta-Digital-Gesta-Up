-- Adiciona coluna local_id + unique index nas tabelas de confinamento (fábrica e insumos).
-- Objetivo: idempotência no sync PWA -> Supabase via upsert com onConflict('local_id').
-- O unique index não é parcial: PostgreSQL permite múltiplos NULLs em unique index,
-- então INSERTs do Painel Web (sem local_id) não conflitam entre si.

-- registros_fabrica_confinamento
ALTER TABLE public.registros_fabrica_confinamento ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_fabrica_confinamento_local_id_key
  ON public.registros_fabrica_confinamento (local_id);

-- registros_fabrica_confinamento_insumos
ALTER TABLE public.registros_fabrica_confinamento_insumos ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_fabrica_confinamento_insumos_local_id_key
  ON public.registros_fabrica_confinamento_insumos (local_id);
