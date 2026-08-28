-- Mãe adotiva para guacho (bezerro abandonado e adotado por outra vaca)
-- Preserva a mãe biológica em `mae`/`individuo_id_mae` e adiciona a adotiva
-- em colunas novas, com FK self-reference em individuos.

-- Tabela individuos: mãe adotiva como FK self-reference
ALTER TABLE individuos
  ADD COLUMN IF NOT EXISTS mae_adotiva_id UUID REFERENCES individuos(id) ON DELETE SET NULL;

-- Tabela registros_maternidade: espelha o padrão da mãe biológica
ALTER TABLE registros_maternidade
  ADD COLUMN IF NOT EXISTS individuo_id_mae_adotiva UUID REFERENCES individuos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_manejo_mae_adotiva TEXT,
  ADD COLUMN IF NOT EXISTS id_brinco_mae_adotiva TEXT,
  ADD COLUMN IF NOT EXISTS id_chip_mae_adotiva TEXT,
  ADD COLUMN IF NOT EXISTS categoria_mae_adotiva TEXT,
  ADD COLUMN IF NOT EXISTS raca_mae_adotiva TEXT;

-- Índice para consultas "quais bezerros a vaca X adotou"
CREATE INDEX IF NOT EXISTS idx_individuos_mae_adotiva
  ON individuos(mae_adotiva_id) WHERE mae_adotiva_id IS NOT NULL;

COMMENT ON COLUMN individuos.mae_adotiva_id IS 'UUID da mãe adotiva (guacho). A biológica fica em `mae`.';
COMMENT ON COLUMN registros_maternidade.individuo_id_mae_adotiva IS 'UUID da mãe adotiva quando guacho. A biológica fica em `individuo_id_mae`.';
