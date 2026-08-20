-- Adiciona coluna JSONB para armazenar o breakdown exato de categorias
-- do lote no momento do manejo de pastagens, permitindo distinguir
-- categorias como "bezerro" e "bezerro ao pé" que compartilham a
-- mesma coluna fixa (bezerro) na tabela.
--
-- Estrutura esperada:
-- [
--   { "nome": "bezerro", "quant_atual": 10, "quant_informada": 8 },
--   { "nome": "bezerro ao pé", "quant_atual": 5, "quant_informada": 5 },
--   { "nome": "garrote", "quant_atual": 45, "quant_informada": 42 }
-- ]

ALTER TABLE public.registros_pastagens
  ADD COLUMN IF NOT EXISTS categorias_detalhes jsonb DEFAULT NULL;

COMMENT ON COLUMN public.registros_pastagens.categorias_detalhes IS
  'Breakdown por categoria do lote no momento do manejo. Cada item: { nome, quant_atual, quant_informada }.';
