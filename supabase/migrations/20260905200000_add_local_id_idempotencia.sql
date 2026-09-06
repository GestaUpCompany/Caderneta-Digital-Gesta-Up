-- Adiciona coluna local_id + unique index nas 18 tabelas de registros seguras para upsert.
-- Objetivo: idempotência no sync PWA -> Supabase via upsert com onConflict('local_id').
-- Tabelas de insumos (entrada/saida + itens) ficam de fora por enquanto (telas em desenvolvimento).
-- O unique index não é parcial: PostgreSQL permite múltiplos NULLs em unique index,
-- então INSERTs do Painel Web (sem local_id) não conflitam entre si.

-- registros_maternidade
ALTER TABLE public.registros_maternidade ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_maternidade_local_id_key
  ON public.registros_maternidade (local_id);

-- registros_pastagens
ALTER TABLE public.registros_pastagens ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_pastagens_local_id_key
  ON public.registros_pastagens (local_id);

-- registros_rodeio
ALTER TABLE public.registros_rodeio ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_rodeio_local_id_key
  ON public.registros_rodeio (local_id);

-- registros_suplementacao
ALTER TABLE public.registros_suplementacao ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_suplementacao_local_id_key
  ON public.registros_suplementacao (local_id);

-- registros_bebedouros
ALTER TABLE public.registros_bebedouros ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_bebedouros_local_id_key
  ON public.registros_bebedouros (local_id);

-- registros_movimentacao
ALTER TABLE public.registros_movimentacao ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_movimentacao_local_id_key
  ON public.registros_movimentacao (local_id);

-- registros_enfermaria
ALTER TABLE public.registros_enfermaria ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_enfermaria_local_id_key
  ON public.registros_enfermaria (local_id);

-- registros_morte
ALTER TABLE public.registros_morte ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_morte_local_id_key
  ON public.registros_morte (local_id);

-- registros_clima
ALTER TABLE public.registros_clima ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_clima_local_id_key
  ON public.registros_clima (local_id);

-- registros_abastecimento
ALTER TABLE public.registros_abastecimento ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_abastecimento_local_id_key
  ON public.registros_abastecimento (local_id);

-- registros_alimentacao (cantina)
ALTER TABLE public.registros_alimentacao ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_alimentacao_local_id_key
  ON public.registros_alimentacao (local_id);

-- registros_limpeza
ALTER TABLE public.registros_limpeza ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_limpeza_local_id_key
  ON public.registros_limpeza (local_id);

-- registros_operacoes_maquinas
ALTER TABLE public.registros_operacoes_maquinas ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_operacoes_maquinas_local_id_key
  ON public.registros_operacoes_maquinas (local_id);

-- registros_manutencao_maquinas
ALTER TABLE public.registros_manutencao_maquinas ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_manutencao_maquinas_local_id_key
  ON public.registros_manutencao_maquinas (local_id);

-- registros_problemas
ALTER TABLE public.registros_problemas ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_problemas_local_id_key
  ON public.registros_problemas (local_id);

-- registros_almoxarifado
ALTER TABLE public.registros_almoxarifado ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_almoxarifado_local_id_key
  ON public.registros_almoxarifado (local_id);

-- registros_leitura_cocho
ALTER TABLE public.registros_leitura_cocho ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_leitura_cocho_local_id_key
  ON public.registros_leitura_cocho (local_id);

-- registros_oferta_trato (trato-confinamento)
ALTER TABLE public.registros_oferta_trato ADD COLUMN IF NOT EXISTS local_id text;
CREATE UNIQUE INDEX IF NOT EXISTS registros_oferta_trato_local_id_key
  ON public.registros_oferta_trato (local_id);
