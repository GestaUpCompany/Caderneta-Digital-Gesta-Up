-- Adiciona campos de justificativa em atividade_funcionarios
-- Permite que o peao justifique a nao-execucao de atividades pendentes/atrasadas
-- que nunca foram iniciadas (inicio_at IS NULL).

ALTER TABLE public.atividade_funcionarios
  ADD COLUMN IF NOT EXISTS justificativa text DEFAULT NULL;

ALTER TABLE public.atividade_funcionarios
  ADD COLUMN IF NOT EXISTS justificada_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.atividade_funcionarios.justificativa IS
  'Texto livre do funcionario explicando por que nao executou a atividade.';

COMMENT ON COLUMN public.atividade_funcionarios.justificada_at IS
  'Data/hora em que o funcionario justificou a nao-execucao. Quando preenchida, status_individual = justificada.';
