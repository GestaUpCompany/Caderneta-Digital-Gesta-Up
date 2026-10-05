-- Novos campos da caderneta Clima (redesign de layout, referência 12 - Clima):
--   choveu                -> "Choveu desde a última leitura?" (true/false)
--   esvaziou_pluviometros -> "Esvaziou os pluviômetros?" (true/false)
--   tempo_atual           -> condição do tempo no momento ('sol', 'nublado',
--                            'chuva_fraca', 'chuva_forte', 'temporal',
--                            'vento_forte', 'frio', 'seco_poeira')
--
-- NOTA DE PROCESSO: migration criada no repo do PWA por decisão do usuário
-- (normalmente o schema é de responsabilidade do Painel Web). Este arquivo
-- precisa ser copiado para GestaUp-Cadernetas-Gestao/supabase/migrations e
-- registrado lá, para não divergir o histórico de schema.

ALTER TABLE public.registros_clima ADD COLUMN IF NOT EXISTS choveu boolean;
ALTER TABLE public.registros_clima ADD COLUMN IF NOT EXISTS esvaziou_pluviometros boolean;
ALTER TABLE public.registros_clima ADD COLUMN IF NOT EXISTS tempo_atual text;
