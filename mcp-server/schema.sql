-- Schema do Banco de Dados - Caderneta Digital Gesta-Up
-- Este script cria todas as tabelas necessárias para o sistema

-- ============================================
-- TABELAS CORE (Multi-tenant)
-- ============================================

-- Tabela de usuários (para sistema web)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_email ON usuarios(email);
  UNIQUE(usuario_id, fazenda_id)
);

-- Índices para usuario_fazenda
CREATE INDEX idx_usuario_fazenda_usuario ON usuario_fazenda(usuario_id);
CREATE INDEX idx_usuario_fazenda_fazenda ON usuario_fazenda(fazenda_id);
CREATE INDEX idx_usuario_fazenda_papel ON usuario_fazenda(papel);
CREATE INDEX idx_usuario_fazenda_ativo ON usuario_fazenda(ativo);

-- Tabela de fazendas
CREATE TABLE fazendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acesso_id TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT,
  planilha_id TEXT,
  tolerancia_rotina_minutos INTEGER DEFAULT 30,
  timezone TEXT DEFAULT 'America/Cuiaba',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para fazendas
CREATE INDEX idx_fazendas_nome ON fazendas(nome);
CREATE INDEX idx_fazendas_ativo ON fazendas(ativo);
CREATE INDEX idx_fazendas_acesso_id ON fazendas(acesso_id);

-- Tabela de dispositivos
CREATE TABLE dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE NOT NULL,
  nome TEXT,
  modelo TEXT,
  plataforma TEXT,
  ultimo_acesso TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para dispositivos
CREATE INDEX idx_dispositivos_fazenda ON dispositivos(fazenda_id);
CREATE INDEX idx_dispositivos_device_id ON dispositivos(device_id);
CREATE INDEX idx_dispositivos_ativo ON dispositivos(ativo);

-- ============================================
-- TABELAS DE CADASTRO
-- ============================================

-- Tabela de pastos
CREATE TABLE pastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  area_util_ha NUMERIC(10,2),
  especie TEXT,
  altura_entrada_cm NUMERIC(5,2),
  altura_saida_cm NUMERIC(5,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pastos
CREATE INDEX idx_pastos_fazenda ON pastos(fazenda_id);
CREATE INDEX idx_pastos_nome ON pastos(nome);
CREATE INDEX idx_pastos_ativo ON pastos(ativo);

-- Tabela de lotes
CREATE TABLE lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  n_cabecas INTEGER,
  categorias TEXT,
  peso_vivo_kg NUMERIC(10,2),
  qtd_bezerros INTEGER,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para lotes
CREATE INDEX idx_lotes_fazenda ON lotes(fazenda_id);
CREATE INDEX idx_lotes_nome ON lotes(nome);
CREATE INDEX idx_lotes_ativo ON lotes(ativo);

-- Tabela de categorias
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para categorias
CREATE INDEX idx_categorias_fazenda ON categorias(fazenda_id);
CREATE INDEX idx_categorias_nome ON categorias(nome);
CREATE INDEX idx_categorias_ativo ON categorias(ativo);

-- Tabela de insumos
CREATE TABLE insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  estoque_atual NUMERIC(10,2),
  unidade TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para insumos
CREATE INDEX idx_insumos_fazenda ON insumos(fazenda_id);
CREATE INDEX idx_insumos_nome ON insumos(nome);
CREATE INDEX idx_insumos_tipo ON insumos(tipo);
CREATE INDEX idx_insumos_ativo ON insumos(ativo);

-- Tabela de funcionarios
CREATE TABLE funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  telefone TEXT,
  cargo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para funcionarios
CREATE INDEX idx_funcionarios_fazenda ON funcionarios(fazenda_id);
CREATE INDEX idx_funcionarios_nome ON funcionarios(nome);
CREATE INDEX idx_funcionarios_ativo ON funcionarios(ativo);

-- ============================================
-- TABELAS DE REGISTROS (9 Cadernetas)
-- ============================================

-- Tabela de registros de maternidade
CREATE TABLE registros_maternidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  peso_cria_kg NUMERIC(10,2),
  numero_cria TEXT,
  tratamento TEXT,
  tipo_parto TEXT,
  sexo TEXT,
  raca TEXT,
  numero_mae TEXT,
  categoria_mae TEXT,
  parto_vinculo_id UUID,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_maternidade
CREATE INDEX idx_maternidade_fazenda ON registros_maternidade(fazenda_id);
CREATE INDEX idx_maternidade_data ON registros_maternidade(data);
CREATE INDEX idx_maternidade_sync ON registros_maternidade(sync_status);
CREATE INDEX idx_maternidade_dispositivo ON registros_maternidade(dispositivo_id);
CREATE INDEX idx_maternidade_deleted ON registros_maternidade(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_maternidade_vinculo ON registros_maternidade(parto_vinculo_id) WHERE parto_vinculo_id IS NOT NULL;

-- Tabela de registros de pastagens
CREATE TABLE registros_pastagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  manejador TEXT,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  pasto_saida_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  avaliacao_saida INTEGER CHECK (avaliacao_saida >= 1 AND avaliacao_saida <= 5),
  pasto_entrada_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  avaliacao_entrada INTEGER CHECK (avaliacao_entrada >= 1 AND avaliacao_entrada <= 5),
  vaca INTEGER DEFAULT 0,
  touro INTEGER DEFAULT 0,
  bezerro INTEGER DEFAULT 0,
  boi_magro INTEGER DEFAULT 0,
  garrote INTEGER DEFAULT 0,
  novilha INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_pastagens
CREATE INDEX idx_pastagens_fazenda ON registros_pastagens(fazenda_id);
CREATE INDEX idx_pastagens_data ON registros_pastagens(data);
CREATE INDEX idx_pastagens_sync ON registros_pastagens(sync_status);
CREATE INDEX idx_pastagens_dispositivo ON registros_pastagens(dispositivo_id);
CREATE INDEX idx_pastagens_deleted ON registros_pastagens(deleted_at) WHERE deleted_at IS NULL;

-- Tabela de registros de rodeio
CREATE TABLE registros_rodeio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  vaca INTEGER DEFAULT 0,
  touro INTEGER DEFAULT 0,
  bezerro INTEGER DEFAULT 0,
  boi INTEGER DEFAULT 0,
  garrote INTEGER DEFAULT 0,
  novilha INTEGER DEFAULT 0,
  total_cabecas INTEGER DEFAULT 0,
  escore_gado_ideal BOOLEAN,
  escore_gado_ideal_obs TEXT,
  agua_boa_bebedouro BOOLEAN,
  agua_boa_bebedouro_obs TEXT,
  pastagem_adequada BOOLEAN,
  pastagem_adequada_obs TEXT,
  animais_doentes BOOLEAN,
  animais_doentes_obs TEXT,
  cercas_cochos BOOLEAN,
  cercas_cochos_obs TEXT,
  carrapatos_moscas BOOLEAN,
  carrapatos_moscas_obs TEXT,
  animais_entrevero BOOLEAN,
  animais_entrevero_obs TEXT,
  animal_morto BOOLEAN,
  animal_morto_obs TEXT,
  animais_tratados INTEGER DEFAULT 0,
  escore_fezes TEXT,
  equipe INTEGER,
  procedimentos TEXT[],
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_rodeio
CREATE INDEX idx_rodeio_fazenda ON registros_rodeio(fazenda_id);
CREATE INDEX idx_rodeio_data ON registros_rodeio(data);
CREATE INDEX idx_rodeio_sync ON registros_rodeio(sync_status);
CREATE INDEX idx_rodeio_dispositivo ON registros_rodeio(dispositivo_id);
CREATE INDEX idx_rodeio_deleted ON registros_rodeio(deleted_at) WHERE deleted_at IS NULL;

-- Tabela de registros de suplementação
CREATE TABLE registros_suplementacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data TIMESTAMPTZ NOT NULL,
  tratador TEXT,
  pasto TEXT,
  lote TEXT,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  formulacao TEXT,
  categorias TEXT,
  leitura TEXT,
  kg_cocho NUMERIC(10,2) DEFAULT 0,
  kg_deposito NUMERIC(10,2) DEFAULT 0,
  n_cabecas INTEGER,
  qtd_bezerros INTEGER,
  peso_vivo_kg NUMERIC(10,2),
  escore_fezes TEXT,
  espacamento_cocho_cm_cab NUMERIC(10,2),
  espacamento_cocho_obs TEXT,
  espacamento_cocho_detalhes JSONB,
  espacamento_cocho_ideal JSONB,
  checklist JSONB,
  consumo_medio_geral_percent_pv NUMERIC(10,6),
  consumo_medio_30dias_percent_pv NUMERIC(10,6),
  consumo_medio_geral_kg_mn NUMERIC(10,6),
  consumo_medio_30dias_kg_mn NUMERIC(10,6),
  consumo_medio_geral_kg_ms NUMERIC(10,6),
  consumo_medio_30dias_kg_ms NUMERIC(10,6),
  custo_medio_reais_cab_dia NUMERIC(10,6),
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_suplementacao
CREATE INDEX idx_suplementacao_fazenda ON registros_suplementacao(fazenda_id);
CREATE INDEX idx_suplementacao_data ON registros_suplementacao(data);
CREATE INDEX idx_suplementacao_sync ON registros_supplementacao(sync_status);
CREATE INDEX idx_supplementacao_dispositivo ON registros_supplementacao(dispositivo_id);
CREATE INDEX idx_supplementacao_deleted ON registros_supplementacao(deleted_at) WHERE deleted_at IS NULL;

-- Tabela de registros de bebedouros
CREATE TABLE registros_bebedouros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  responsavel TEXT,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  gado TEXT,
  categoria TEXT,
  leitura_bebedouro INTEGER CHECK (leitura_bebedouro >= 1 AND leitura_bebedouro <= 3),
  numero_bebedouro TEXT,
  observacao TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_bebedouros
CREATE INDEX idx_bebedouros_fazenda ON registros_bebedouros(fazenda_id);
CREATE INDEX idx_bebedouros_data ON registros_bebedouros(data);
CREATE INDEX idx_bebedouros_sync ON registros_bebedouros(sync_status);
CREATE INDEX idx_bebedouros_dispositivo ON registros_bebedouros(dispositivo_id);
CREATE INDEX idx_bebedouros_deleted ON registros_bebedouros(deleted_at) WHERE deleted_at IS NULL;

-- Tabela de registros de movimentação
CREATE TABLE registros_movimentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  lote_origem_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  lote_destino_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  numero_cabecas INTEGER,
  peso_medio_kg NUMERIC(10,2),
  vaca BOOLEAN DEFAULT false,
  touro BOOLEAN DEFAULT false,
  boi_gordo BOOLEAN DEFAULT false,
  boi_magro BOOLEAN DEFAULT false,
  garrote BOOLEAN DEFAULT false,
  bezerro BOOLEAN DEFAULT false,
  novilha BOOLEAN DEFAULT false,
  tropa BOOLEAN DEFAULT false,
  outros BOOLEAN DEFAULT false,
  motivo_movimentacao TEXT,
  brinco_chip TEXT,
  causa_observacao TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_movimentacao
CREATE INDEX idx_movimentacao_fazenda ON registros_movimentacao(fazenda_id);
CREATE INDEX idx_movimentacao_data ON registros_movimentacao(data);
CREATE INDEX idx_movimentacao_sync ON registros_movimentacao(sync_status);
CREATE INDEX idx_movimentacao_dispositivo ON registros_movimentacao(dispositivo_id);
CREATE INDEX idx_movimentacao_deleted ON registros_movimentacao(deleted_at) WHERE deleted_at IS NULL;

-- Tabela de registros de enfermaria
CREATE TABLE registros_enfermaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data DATE NOT NULL,
  pasto_id UUID REFERENCES pastos(id) ON DELETE SET NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE SET NULL,
  brinco_chip TEXT,
  categoria TEXT,
  tratamento TEXT,
  tratamento_outros TEXT,
  problema_casco BOOLEAN DEFAULT false,
  problema_casco_obs TEXT,
  sintomas_pneumonia BOOLEAN DEFAULT false,
  sintomas_pneumonia_obs TEXT,
  picado_cobra BOOLEAN DEFAULT false,
  picado_cobra_obs TEXT,
  incoordenacao_tremores BOOLEAN DEFAULT false,
  incoordenacao_tremores_obs TEXT,
  febre_alta BOOLEAN DEFAULT false,
  febre_alta_obs TEXT,
  presenca_sangue BOOLEAN DEFAULT false,
  presenca_sangue_obs TEXT,
  fraturas BOOLEAN DEFAULT false,
  fraturas_obs TEXT,
  desordens_digestivas BOOLEAN DEFAULT false,
  desordens_digestivas_obs TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_enfermaria
CREATE INDEX idx_enfermaria_fazenda ON registros_enfermaria(fazenda_id);
CREATE INDEX idx_enfermaria_data ON registros_enfermaria(data);
CREATE INDEX idx_enfermaria_sync ON registros_enfermaria(sync_status);
CREATE INDEX idx_enfermaria_dispositivo ON registros_enfermaria(dispositivo_id);
CREATE INDEX idx_enfermaria_deleted ON registros_enfermaria(deleted_at) WHERE deleted_at IS NULL;

-- Tabela de registros de entrada de insumos
CREATE TABLE registros_entrada_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data_entrada DATE NOT NULL,
  horario TEXT,
  produto TEXT,
  quantidade NUMERIC(10,2),
  valor_unitario NUMERIC(10,2),
  valor_total NUMERIC(10,2),
  nota_fiscal TEXT,
  fornecedor TEXT,
  placa TEXT,
  motorista TEXT,
  responsavel_recebimento TEXT,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_entrada_insumos
CREATE INDEX idx_entrada_insumos_fazenda ON registros_entrada_insumos(fazenda_id);
CREATE INDEX idx_entrada_insumos_data ON registros_entrada_insumos(data_entrada);
CREATE INDEX idx_entrada_insumos_sync ON registros_entrada_insumos(sync_status);
CREATE INDEX idx_entrada_insumos_dispositivo ON registros_entrada_insumos(dispositivo_id);
CREATE INDEX idx_entrada_insumos_deleted ON registros_entrada_insumos(deleted_at) WHERE deleted_at IS NULL;

-- Tabela de registros de saída de insumos
CREATE TABLE registros_saida_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT,
  data_producao DATE NOT NULL,
  dieta_produzida TEXT,
  destino_producao TEXT,
  total_produzido NUMERIC(10,2),
  insumos_quantidades JSONB,
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para registros_saida_insumos
CREATE INDEX idx_saida_insumos_fazenda ON registros_saida_insumos(fazenda_id);
CREATE INDEX idx_saida_insumos_data ON registros_saida_insumos(data_producao);
CREATE INDEX idx_saida_insumos_sync ON registros_saida_insumos(sync_status);
CREATE INDEX idx_saida_insumos_dispositivo ON registros_saida_insumos(dispositivo_id);
CREATE INDEX idx_saida_insumos_deleted ON registros_saida_insumos(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- TABELAS DE SISTEMA
-- ============================================

-- Tabela de fila de sincronização
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacao TEXT NOT NULL,
  prioridade TEXT DEFAULT 'normal',
  retry_count INTEGER DEFAULT 0,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processado_at TIMESTAMPTZ
);

-- Índices para sync_queue
CREATE INDEX idx_sync_queue_fazenda ON sync_queue(fazenda_id);
CREATE INDEX idx_sync_queue_dispositivo ON sync_queue(dispositivo_id);
CREATE INDEX idx_sync_queue_prioridade ON sync_queue(prioridade);
CREATE INDEX idx_sync_queue_created ON sync_queue(created_at);

-- Tabela de conflitos
CREATE TABLE conflitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  versao_local INTEGER,
  versao_remota INTEGER,
  dados_local JSONB,
  dados_remoto JSONB,
  resolvido_por TEXT,
  resolvido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para conflitos
CREATE INDEX idx_conflitos_fazenda ON conflitos(fazenda_id);
CREATE INDEX idx_conflitos_tabela ON conflitos(tabela);
CREATE INDEX idx_conflitos_resolvido ON conflitos(resolvido_por) WHERE resolvido_por IS NULL;

-- Tabela de audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela TEXT,
  registro_id UUID,
  dados_antigos JSONB,
  dados_novos JSONB,
  ip TEXT,
  user_agent TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_log
CREATE INDEX idx_audit_log_fazenda ON audit_log(fazenda_id);
CREATE INDEX idx_audit_log_dispositivo ON audit_log(dispositivo_id);
CREATE INDEX idx_audit_log_acao ON audit_log(acao);
CREATE INDEX idx_audit_log_criado_em ON audit_log(criado_em);

-- ============================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar trigger para atualizar updated_at em todas as tabelas
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fazendas_updated_at BEFORE UPDATE ON fazendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuario_fazenda_updated_at BEFORE UPDATE ON usuario_fazenda
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispositivos_updated_at BEFORE UPDATE ON dispositivos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pastos_updated_at BEFORE UPDATE ON pastos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lotes_updated_at BEFORE UPDATE ON lotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insumos_updated_at BEFORE UPDATE ON insumos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON funcionarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para tabelas de registros
CREATE TRIGGER update_registros_maternidade_updated_at BEFORE UPDATE ON registros_maternidade
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_pastagens_updated_at BEFORE UPDATE ON registros_pastagens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_rodeio_updated_at BEFORE UPDATE ON registros_rodeio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_supplementacao_updated_at BEFORE UPDATE ON registros_suplementacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_bebedouros_updated_at BEFORE UPDATE ON registros_bebedouros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_movimentacao_updated_at BEFORE UPDATE ON registros_movimentacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_enfermaria_updated_at BEFORE UPDATE ON registros_enfermaria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_entrada_insumos_updated_at BEFORE UPDATE ON registros_entrada_insumos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_saida_insumos_updated_at BEFORE UPDATE ON registros_saida_insumos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA DE LOGS DE FALHAS DE SINCRONIZAÇÃO
-- ============================================

CREATE TABLE logs_sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  caderneta TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  error_details TEXT,
  payload JSONB,
  retry_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para logs_sync_errors
CREATE INDEX idx_logs_sync_errors_fazenda ON logs_sync_errors(fazenda_id);
CREATE INDEX idx_logs_sync_errors_caderneta ON logs_sync_errors(caderneta);
CREATE INDEX idx_logs_sync_errors_registro ON logs_sync_errors(registro_id);
CREATE INDEX idx_logs_sync_errors_created_at ON logs_sync_errors(created_at);
CREATE INDEX idx_logs_sync_errors_unresolved ON logs_sync_errors(fazenda_id) WHERE resolved_at IS NULL;

-- Habilitar RLS
ALTER TABLE logs_sync_errors ENABLE ROW LEVEL SECURITY;

-- Política: app pode inserir logs (necessário para logar falhas de autenticação)
CREATE POLICY "App can insert sync error logs"
ON logs_sync_errors
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política: apenas usuários da fazenda podem visualizar
CREATE POLICY "Users can view their farm sync error logs"
ON logs_sync_errors
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT uf.fazenda_id
  FROM usuario_fazenda uf
  JOIN usuarios u ON u.id = uf.usuario_id
  WHERE u.auth_id = auth.uid() AND uf.ativo = true
));

-- ============================================
-- TABELA DE EXECUÇÕES DE ROTINA (AUDITORIA)
-- ============================================

CREATE TABLE execucoes_rotina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  rotina_id UUID REFERENCES rotinas(id) ON DELETE SET NULL,
  caderneta_id TEXT NOT NULL,
  data DATE NOT NULL,
  horario_programado TIME,
  primeiro_acesso TIMESTAMPTZ,
  primeiro_acesso_local TEXT,
  primeiro_registro TIMESTAMPTZ,
  primeiro_registro_local TEXT,
  status TEXT CHECK (status IN ('no_horario', 'atrasado', 'antecipado', 'nao_executado')),
  observacao TEXT,
  concluido BOOLEAN DEFAULT false,
  dispositivo_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_execucoes_rotina_fazenda ON execucoes_rotina(fazenda_id);
CREATE INDEX idx_execucoes_rotina_funcionario ON execucoes_rotina(funcionario_id);
CREATE INDEX idx_execucoes_rotina_caderneta ON execucoes_rotina(caderneta_id);
CREATE INDEX idx_execucoes_rotina_data ON execucoes_rotina(data);
CREATE INDEX idx_execucoes_rotina_status ON execucoes_rotina(status);
CREATE INDEX idx_execucoes_rotina_funcionario_data ON execucoes_rotina(funcionario_id, data);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Recalcula métricas de consumo de suplementação.
-- Passar NULL para recalcular todas as fazendas, ou um UUID específico.
CREATE OR REPLACE FUNCTION recalcular_metricas_suplementacao(p_fazenda_id UUID DEFAULT NULL)
RETURNS TABLE(
  registro_id UUID,
  peso_vivo_medio NUMERIC,
  animais_elegiveis INTEGER,
  consumo_geral_pct_pv NUMERIC,
  consumo_30dias_pct_pv NUMERIC,
  consumo_geral_kg_mn NUMERIC,
  consumo_30dias_kg_mn NUMERIC,
  consumo_geral_kg_ms NUMERIC,
  consumo_30dias_kg_ms NUMERIC,
  custo_medio_reais_cab_dia NUMERIC
) AS $$
DECLARE
  v_fazenda UUID;
  v_fazendas UUID[];
  v_registro RECORD;
  v_lote_id UUID;
  v_formulacao_nome TEXT;
  v_teor_ms NUMERIC;
  v_custo_mn_tonelada NUMERIC;
  v_peso_vivo_medio NUMERIC;
  v_animais_elegiveis INTEGER;
  v_registros_lote UUID[];
  v_datas_lote DATE[];
  v_kgs_lote NUMERIC[];
  v_total_dias INTEGER;
  v_total_mn NUMERIC;
  v_data_atual DATE;
  v_data_inicio DATE;
  v_i INTEGER;
  v_j INTEGER;
  v_intervalo_dias INTEGER;
  v_consumo_geral_kg_mn NUMERIC;
  v_consumo_30dias_kg_mn NUMERIC;
  v_consumo_geral_kg_ms NUMERIC;
  v_consumo_30dias_kg_ms NUMERIC;
  v_consumo_geral_pct_pv NUMERIC;
  v_consumo_30dias_pct_pv NUMERIC;
  v_custo_medio NUMERIC;
  v_fazenda_idx INTEGER;
BEGIN
  IF p_fazenda_id IS NULL THEN
    SELECT array_agg(DISTINCT fazenda_id)
    INTO v_fazendas
    FROM registros_suplementacao
    WHERE deleted_at IS NULL AND fazenda_id IS NOT NULL;
  ELSE
    v_fazendas := ARRAY[p_fazenda_id];
  END IF;

  IF v_fazendas IS NULL OR array_length(v_fazendas, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR v_fazenda_idx IN 1 .. array_length(v_fazendas, 1) LOOP
    v_fazenda := v_fazendas[v_fazenda_idx];

    FOR v_registro IN
      SELECT r.id, r.lote_id, r.formulacao, r.data::date as data_reg, r.kg_cocho
      FROM registros_suplementacao r
      WHERE r.fazenda_id = v_fazenda
        AND r.deleted_at IS NULL
        AND r.lote_id IS NOT NULL
      ORDER BY r.lote_id, r.data
    LOOP
      v_lote_id := v_registro.lote_id;
      v_formulacao_nome := v_registro.formulacao;

      SELECT
        COALESCE(SUM(CASE WHEN LOWER(c.categoria) NOT LIKE '%bezerro%' AND LOWER(c.categoria) NOT LIKE '%bezerra%' THEN c.quant_atual ELSE 0 END), 0)::integer,
        COALESCE(SUM(CASE WHEN LOWER(c.categoria) NOT LIKE '%bezerro%' AND LOWER(c.categoria) NOT LIKE '%bezerra%' THEN c.peso_vivo_atual_kg_cab * c.quant_atual ELSE 0 END), 0) /
        NULLIF(SUM(CASE WHEN LOWER(c.categoria) NOT LIKE '%bezerro%' AND LOWER(c.categoria) NOT LIKE '%bezerra%' THEN c.quant_atual ELSE 0 END), 0)
      INTO v_animais_elegiveis, v_peso_vivo_medio
      FROM lote_categorias c
      WHERE c.lote_id = v_lote_id;

      IF v_peso_vivo_medio IS NULL OR v_peso_vivo_medio = 0 OR v_animais_elegiveis IS NULL OR v_animais_elegiveis = 0 THEN
        CONTINUE;
      END IF;

      SELECT f.teor_ms_dieta, f.custo_mn_tonelada
      INTO v_teor_ms, v_custo_mn_tonelada
      FROM formulacoes f
      WHERE f.fazenda_id = v_fazenda
        AND f.nome = v_formulacao_nome
      LIMIT 1;

      SELECT array_agg(r.id ORDER BY r.data::date),
             array_agg(r.data::date ORDER BY r.data::date),
             array_agg(r.kg_cocho ORDER BY r.data::date)
      INTO v_registros_lote, v_datas_lote, v_kgs_lote
      FROM registros_suplementacao r
      WHERE r.fazenda_id = v_fazenda
        AND r.lote_id = v_lote_id
        AND r.formulacao = v_formulacao_nome
        AND r.deleted_at IS NULL;

      IF v_registros_lote IS NULL OR array_length(v_registros_lote, 1) IS NULL OR array_length(v_registros_lote, 1) < 2 THEN
        CONTINUE;
      END IF;

      v_total_mn := 0;
      v_total_dias := 0;
      FOR v_i IN 1 .. array_length(v_registros_lote, 1) - 1 LOOP
        v_intervalo_dias := GREATEST((v_datas_lote[v_i + 1] - v_datas_lote[v_i])::integer, 1);
        v_total_mn := v_total_mn + (v_kgs_lote[v_i] / v_intervalo_dias);
        v_total_dias := v_total_dias + 1;
      END LOOP;

      IF v_total_dias = 0 THEN
        CONTINUE;
      END IF;

      v_consumo_geral_kg_mn := v_total_mn / NULLIF(v_animais_elegiveis, 0);

      v_data_inicio := CURRENT_DATE - 30;
      v_total_mn := 0;
      v_total_dias := 0;
      FOR v_i IN 1 .. array_length(v_registros_lote, 1) - 1 LOOP
        v_intervalo_dias := GREATEST((v_datas_lote[v_i + 1] - v_datas_lote[v_i])::integer, 1);
        v_data_atual := v_datas_lote[v_i];
        FOR v_j IN 0 .. v_intervalo_dias - 1 LOOP
          IF v_data_atual >= v_data_inicio AND v_data_atual <= CURRENT_DATE THEN
            v_total_mn := v_total_mn + (v_kgs_lote[v_i] / v_intervalo_dias);
            v_total_dias := v_total_dias + 1;
          END IF;
          v_data_atual := v_data_atual + 1;
        END LOOP;
      END LOOP;

      IF v_total_dias > 0 AND v_animais_elegiveis > 0 THEN
        v_consumo_30dias_kg_mn := (v_total_mn / v_total_dias) / v_animais_elegiveis;
      ELSE
        v_consumo_30dias_kg_mn := NULL;
      END IF;

      IF v_teor_ms IS NOT NULL AND v_teor_ms > 0 THEN
        v_consumo_geral_kg_ms := v_consumo_geral_kg_mn * (v_teor_ms / 100);
        v_consumo_30dias_kg_ms := v_consumo_30dias_kg_mn * (v_teor_ms / 100);
      ELSE
        v_consumo_geral_kg_ms := NULL;
        v_consumo_30dias_kg_ms := NULL;
      END IF;

      IF v_consumo_geral_kg_ms IS NOT NULL AND v_peso_vivo_medio > 0 THEN
        v_consumo_geral_pct_pv := (v_consumo_geral_kg_ms / v_peso_vivo_medio) * 100;
      ELSE
        v_consumo_geral_pct_pv := NULL;
      END IF;

      IF v_consumo_30dias_kg_ms IS NOT NULL AND v_peso_vivo_medio > 0 THEN
        v_consumo_30dias_pct_pv := (v_consumo_30dias_kg_ms / v_peso_vivo_medio) * 100;
      ELSE
        v_consumo_30dias_pct_pv := NULL;
      END IF;

      IF v_custo_mn_tonelada IS NOT NULL AND v_consumo_geral_kg_mn IS NOT NULL THEN
        v_custo_medio := (v_custo_mn_tonelada * v_consumo_geral_kg_mn) / 1000;
      ELSE
        v_custo_medio := NULL;
      END IF;

      UPDATE registros_suplementacao
      SET
        consumo_medio_geral_percent_pv = v_consumo_geral_pct_pv,
        consumo_medio_30dias_percent_pv = v_consumo_30dias_pct_pv,
        consumo_medio_geral_kg_mn = v_consumo_geral_kg_mn,
        consumo_medio_30dias_kg_mn = v_consumo_30dias_kg_mn,
        consumo_medio_geral_kg_ms = v_consumo_geral_kg_ms,
        consumo_medio_30dias_kg_ms = v_consumo_30dias_kg_ms,
        custo_medio_reais_cab_dia = v_custo_medio,
        updated_at = NOW()
      WHERE id = v_registro.id;

      RETURN QUERY SELECT
        v_registro.id,
        v_peso_vivo_medio,
        v_animais_elegiveis,
        v_consumo_geral_pct_pv,
        v_consumo_30dias_pct_pv,
        v_consumo_geral_kg_mn,
        v_consumo_30dias_kg_mn,
        v_consumo_geral_kg_ms,
        v_consumo_30dias_kg_ms,
        v_custo_medio;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Permissões para anon e authenticated
GRANT SELECT, INSERT, UPDATE ON public.execucoes_rotina TO anon;
GRANT SELECT, INSERT, UPDATE ON public.execucoes_rotina TO authenticated;

-- Habilitar RLS
ALTER TABLE execucoes_rotina ENABLE ROW LEVEL SECURITY;

-- Política: app pode inserir/atualizar execuções de rotina
CREATE POLICY "App can upsert execucoes_rotina"
ON execucoes_rotina
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Política: usuários da fazenda podem visualizar execuções
CREATE POLICY "Users can view their farm execucoes_rotina"
ON execucoes_rotina
FOR SELECT
TO authenticated
USING (fazenda_id IN (
  SELECT uf.fazenda_id
  FROM usuario_fazenda uf
  JOIN usuarios u ON u.id = uf.usuario_id
  WHERE u.auth_id = auth.uid() AND uf.ativo = true
));
