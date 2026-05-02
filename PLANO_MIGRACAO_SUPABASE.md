# Plano de Migração para Supabase

**Versão:** 1.0  
**Data:** 02/05/2026  
**Status:** Planejamento

---

## 1. Visão Geral

### 1.1 Objetivo
Migrar o sistema Caderneta Digital Gesta-Up de Google Sheets para Supabase, mantendo 100% de funcionalidade atual e preparando a infraestrutura para expansão futura.

### 1.2 Escopo Atual
- **Frontend:** React + TypeScript (PWA)
- **Backend:** Vercel Serverless + Google Sheets API
- **Banco de Dados:** Google Sheets (limitado a 100 req/100s)
- **Cadernetas:** 9 módulos (maternidade, pastagens, rodeio, suplementação, bebedouros, movimentacao, enfermaria, entrada-insumos, saida-insumos)
- **Sincronização:** Offline-first com IndexedDB + fila de sync
- **Acesso App Móvel:** Usuário digita ID da fazenda (sem login/senha)

### 1.3 Escopo Futuro (Sistema Web)
- **Sistema Web:** Dashboard administrativo para gestão de fazendas
- **Autenticação Web:** Login/senha com Supabase Auth
- **Hierarquia de Permissões:** Admin (todas fazendas + criar fazendas), Gerente (suas fazendas + criar cadastros), Peão (suas fazendas + apenas registros)
- **Cadastros:** Pastos, lotes, funcionários, insumos, checklists
- **Multi-tenant:** 25+ fazendas com isolamento de dados
- **Expansão:** 16 cadernetas + 20 checklists
- **Volume:** 2M+ registros/dia

### 1.4 Problemas Atuais
1. Google Sheets API: 100 requisições/100 segundos (insuficiente)
2. Rate limiting: Erros 429 frequentes
3. Performance: Travamentos com >100k linhas
4. Multi-tenant: Não há isolamento entre fazendas
5. Segurança: Autenticação rudimentar

---

## 2. Schema do Banco de Dados

### 2.1 Tabelas Core (Multi-tenant)
1. **fazendas** - Configuração de fazendas (inclui ID de acesso)
2. **usuarios** - Usuários do sistema web (admin, gerente, peão)
3. **usuario_fazenda** - Relação N:N entre usuários e fazendas com papéis
4. **dispositivos** - Dispositivos móveis registrados (por fazenda)

### 2.2 Tabelas de Cadastro
5. **pastos** - Cadastro de pastos
6. **lotes** - Cadastro de lotes
7. **categorias** - Categorias de animais
8. **insumos** - Cadastro de insumos
9. **funcionarios** - Cadastro de funcionários

### 2.3 Tabelas de Registros (9 Cadernetas)
10. **registros_maternidade** - Maternidade Cria
11. **registros_pastagens** - Troca de Pastos
12. **registros_rodeio** - Rodeio Gado
13. **registros_suplementacao** - Suplementação
14. **registros_bebedouros** - Bebedouros
15. **registros_movimentacao** - Movimentação
16. **registros_enfermaria** - Enfermaria
17. **registros_entrada_insumos** - Entrada Insumos
18. **registros_saida_insumos** - Saída Insumos

### 2.4 Tabelas de Sistema
19. **sync_queue** - Fila de sincronização
20. **conflictos** - Registro de conflitos
21. **audit_log** - Log de auditoria

### 2.5 Tabelas Futuras
22. **checklists** - Definição de checklists
23. **checklist_respostas** - Respostas de checklists

---

## 3. Estrutura das Tabelas Principais

### 3.1 fazendas
```sql
CREATE TABLE fazendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acesso_id TEXT UNIQUE NOT NULL, -- ID que usuário digita para acessar
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT, -- URL da logo (armazenada em Supabase Storage)
  planilha_id TEXT, -- Legado
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 dispositivos
```sql
CREATE TABLE dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE NOT NULL,
  nome TEXT,
  modelo TEXT,
  plataforma TEXT, -- iOS, Android
  ultimo_acesso TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true
);
```

### 3.3 usuarios (Para Sistema Web)
```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 usuario_fazenda (Para Sistema Web)
```sql
CREATE TABLE usuario_fazenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  papel TEXT NOT NULL, -- admin, gerente, peao
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, fazenda_id)
);
```

### 3.5 pastos
```sql
CREATE TABLE pastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  area_util_ha NUMERIC(10,2),
  especie TEXT,
  altura_entrada_cm NUMERIC(5,2),
  altura_saida_cm NUMERIC(5,2),
  ativo BOOLEAN DEFAULT true
);
```

### 3.6 lotes
```sql
CREATE TABLE lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  n_cabecas INTEGER,
  categorias TEXT,
  peso_vivo_kg NUMERIC(10,2),
  qtd_bezerros INTEGER,
  ativo BOOLEAN DEFAULT true
);
```

### 3.7 registros_maternidade (Exemplo)
```sql
CREATE TABLE registros_maternidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  dispositivo_id UUID REFERENCES dispositivos(id) ON DELETE SET NULL,
  nome_usuario TEXT, -- Nome do peão (em vez de usuario_id)
  
  -- Campos específicos
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
  
  -- Metadados
  sync_status TEXT DEFAULT 'synced',
  version INTEGER DEFAULT 1,
  google_row_id INTEGER, -- Legado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);
```

**Nota:** Todas as outras 8 tabelas de registros (registros_pastagens, registros_rodeio, registros_suplementacao, registros_bebedouros, registros_movimentacao, registros_enfermaria, registros_entrada_insumos, registros_saida_insumos) devem seguir o mesmo padrão, substituindo `usuario_id` por `nome_usuario TEXT` para manter compatibilidade com o sistema atual (nome do peão).

---

### 4. Row Level Security (RLS)

### 4.1 Princípios
1. **Isolamento por Fazenda:** Cada dispositivo só acessa dados da sua fazenda (via fazenda_id)
2. **Acesso por ID de Fazenda:** Usuário digita ID da fazenda para acessar (sem login/senha)
3. **Auditoria:** Todas as ações são logadas
4. **Soft Delete:** Dados nunca são deletados fisicamente

### 4.2 Estratégia de Acesso
- **Sem Supabase Auth:** Não usar autenticação do Supabase
- **Acesso por ID:** Usuário digita `acesso_id` da fazenda
- **Validação no Frontend:** Verificar se fazenda existe e está ativa
- **Validação no Backend:** Edge Function valida fazenda_id em todas as requisições
- **RLS por Fazenda:** Queries sempre filtram por `fazenda_id`

### 4.3 Exemplo de Política (pastos)
```sql
-- Acesso público (sem autenticação Supabase)
-- Isolamento é feito no frontend sempre incluindo fazenda_id nas queries

-- Habilitar RLS mas permitir acesso público com filtro
ALTER TABLE pastos ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos podem ler, mas frontend filtra por fazenda_id)
CREATE POLICY "Leitura pública"
ON pastos FOR SELECT
TO anon
USING (true);

-- Para escrita, usar anon key mas validar fazenda_id no frontend
CREATE POLICY "Inserção pública"
ON pastos FOR INSERT
TO anon
WITH CHECK (true);

-- Atualização pública
CREATE POLICY "Atualização pública"
ON pastos FOR UPDATE
TO anon
USING (true);
```

### 4.4 Exemplo de Política (registros)
```sql
ALTER TABLE registros_maternidade ENABLE ROW LEVEL SECURITY;

-- Leitura pública (frontend filtra por fazenda_id)
CREATE POLICY "Leitura pública"
ON registros_maternidade FOR SELECT
TO anon
USING (true);

-- Inserção pública (frontend valida fazenda_id)
CREATE POLICY "Inserção pública"
ON registros_maternidade FOR INSERT
TO anon
WITH CHECK (true);

-- Atualização pública
CREATE POLICY "Atualização pública"
ON registros_maternidade FOR UPDATE
TO anon
USING (true);
```

### 4.5 Validação de Acesso no Backend (Segurança Adicional)

Como não usamos Supabase Auth, implementamos uma camada extra de segurança no backend para garantir que cada requisição está acessando apenas dados da fazenda correta.

#### 4.5.1 Edge Function para Validação
```typescript
// supabase/functions/validate-fazenda/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Validar que fazenda_id no request corresponde ao acesso_id
  const fazendaId = req.headers.get('x-fazenda-id')
  const acessoId = req.headers.get('x-acesso-id')
  
  if (!fazendaId || !acessoId) {
    return new Response('Missing headers', { status: 401 })
  }
  
  // Validar no Supabase
  const { data: fazenda } = await supabase
    .from('fazendas')
    .select('id')
    .eq('id', fazendaId)
    .eq('acesso_id', acessoId)
    .eq('ativo', true)
    .single()
    
  if (!fazenda) {
    return new Response('Invalid fazenda', { status: 403 })
  }
  
  return new Response('OK', { status: 200 })
})
```

#### 4.5.2 Uso no Frontend
```typescript
// Adicionar headers em todas as requisições críticas
const { data } = await supabase
  .from('registros_maternidade')
  .select('*')
  .eq('fazenda_id', fazendaId)
  .setHeader('x-acesso-id', acessoId) // Validado pela Edge Function
```

#### 4.5.3 Estratégia de Geração de acesso_id
Durante a migração, gerar `acesso_id` único para cada fazenda:
- Normalizar nome da fazenda (remover acentos, espaços)
- Adicionar sufixo numérico se houver duplicatas
- Exemplo: "aruã-001", "sol-nascente-001"

---

## 5. Cronograma de Migração (6 Semanas)

### FASE 1: Preparação (Semana 1)
- **Dia 1-2:** Setup Supabase, Environment Variables (sem Auth)
- **Dia 3-4:** Criar schema database (todas as tabelas + índices)
- **Dia 5:** Criar RLS e políticas de segurança (acesso público com filtro por fazenda_id)
- **Dia 6:** Implementar Edge Function para validação de acesso_id
- **Dia 7:** Setup frontend (supabaseClient, tipos TypeScript)

### FASE 2: Migração de Dados (Semana 2)
- **Dia 1-2:** Criar script de migração (Google Sheets → Supabase)
- **Dia 3-4:** Migrar cadastros (fazendas com acesso_id, pastos, lotes, insumos)
- **Dia 5-6:** Migrar registros (9 cadernetas)
- **Dia 7:** Validação (contagem, integridade)

### FASE 3: Integração Frontend (Semana 3)
- **Dia 1-2:** Criar supabaseService (CRUD para 9 cadernetas)
- **Dia 3-4:** Atualizar IndexedDB (adicionar supabase_id)
- **Dia 5-6:** Atualizar useSync para usar Supabase
- **Dia 7:** Atualizar páginas das cadernetas

### FASE 4: Sistema de Acesso por ID (Semana 4)
- **Dia 1-2:** Implementar validação de acesso_id da fazenda
- **Dia 3-4:** Implementar upload de logos para Supabase Storage
- **Dia 5-6:** Atualizar tela de configuração para usar Supabase
- **Dia 7:** Testes de acesso por ID

### FASE 5: Testes e Validação (Semana 5)
- **Dia 1-2:** Testes unitários (serviços, hooks)
- **Dia 3-4:** Testes de integração (offline → online)
- **Dia 5:** Testes de performance (100k, 1M registros)
- **Dia 6:** Testes de isolamento por fazenda
- **Dia 7:** Correção de bugs

### FASE 6: Deploy (Semana 6)
- **Dia 1-2:** Deploy staging
- **Dia 3-4:** Testes com usuários reais
- **Dia 5:** Backup final do Google Sheets
- **Dia 6:** Deploy produção
- **Dia 7:** Monitoramento inicial

---

## 6. Implementação Detalhada

### 6.1 Setup Supabase

#### 6.1.1 Criar Projeto
1. Acessar https://supabase.com
2. Criar projeto: `caderneta-digital-gestaup`
3. Região: `South America (São Paulo)`
4. **NÃO habilitar Auth** (usaremos acesso por ID de fazenda)

#### 6.1.2 Environment Variables
```bash
# frontend/.env.local
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6.2 Setup Frontend

#### 6.2.1 Instalar Dependências
```bash
npm install @supabase/supabase-js
```

#### 6.2.2 Criar supabaseClient.ts
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 6.3 Script de Migração

```typescript
// backend/scripts/migrateToSupabase.ts
import { createClient } from '@supabase/supabase-js'
import { getRows } from '../services/googleSheetsService'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateFazendas() {
  const rows = await getRows(planilhaUrl, 'Administrativo')
  const fazendas = rows.map(row => ({
    nome: row[0],
    cnpj: row[1],
    ativo: true
  }))
  
  await supabase.from('fazendas').insert(fazendas)
}

async function migratePastos() {
  // Similar para pastos, lotes, etc.
}

async function migrateRegistros() {
  // Migrar 9 cadernetas
  // Preservar sync_status e google_row_id
}
```

### 6.4 Supabase Service

```typescript
// frontend/src/services/supabaseService.ts
import { supabase } from './supabaseClient'

export async function salvarRegistroMaternidade(registro: any, fazendaId: string) {
  const { data, error } = await supabase
    .from('registros_maternidade')
    .insert({ ...registro, fazenda_id: fazendaId, sync_status: 'synced' })
    .select()
    
  if (error) throw error
  return data[0]
}

export async function getRegistrosMaternidade(fazendaId: string, startDate?: Date, endDate?: Date) {
  let query = supabase
    .from('registros_maternidade')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    
  if (startDate) query = query.gte('data', startDate.toISOString())
  if (endDate) query = query.lte('data', endDate.toISOString())
    
  const { data, error } = await query
  if (error) throw error
  return data
}
```

### 6.4 Sistema de Acesso por ID

#### 6.4.1 Validar Acesso por ID
```typescript
// frontend/src/services/fazendaService.ts
import { supabase } from './supabaseClient'

export async function validarFazenda(acessoId: string) {
  const { data, error } = await supabase
    .from('fazendas')
    .select('*')
    .eq('acesso_id', acessoId)
    .eq('ativo', true)
    .single()
    
  if (error || !data) {
    throw new Error('Fazenda não encontrada ou inativa')
  }
  
  return data
}

export async function getFazendaPorId(fazendaId: string) {
  const { data, error } = await supabase
    .from('fazendas')
    .select('*')
    .eq('id', fazendaId)
    .single()
    
  if (error) throw error
  return data
}
```

#### 6.4.2 Upload de Logo para Supabase Storage
```typescript
// frontend/src/services/storageService.ts
import { supabase } from './supabaseClient'

export async function uploadLogo(fazendaId: string, file: File) {
  const fileName = `logos/${fazendaId}/${file.name}`
  
  const { data, error } = await supabase.storage
    .from('logos')
    .upload(fileName, file)
    
  if (error) throw error
  
  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('logos')
    .getPublicUrl(fileName)
    
  // Atualizar fazenda com logo_url
  await supabase
    .from('fazendas')
    .update({ logo_url: publicUrl })
    .eq('id', fazendaId)
    
  return publicUrl
}
```

#### 6.4.3 Atualizar Tela de Configuração
```typescript
// frontend/src/pages/ConfiguracaoPage.tsx
// Manter o fluxo atual: usuário digita ID da fazenda

const handleConfigurar = async () => {
  try {
    const fazenda = await validarFazenda(acessoId)
    
    // Armazenar fazenda no Redux
    dispatch(setFazenda(fazenda))
    
    // Navegar para home
    navigate('/')
  } catch (error) {
    setErro('ID de fazenda inválido')
  }
}
```

### 6.5 Atualizar useSync
```typescript
// frontend/src/hooks/useSync.ts
const runSync = useCallback(async () => {
  const queue = await getSyncQueue()
  const fazendaId = useSelector((state: RootState) => state.config.fazenda?.id)
  
  for (const item of queue) {
    try {
      const registro = await getRegistro(item.store, item.registroId)
      
      if (item.operation === 'create') {
        await salvarRegistroMaternidade(registro, fazendaId)
      }
      
      await removeFromSyncQueue(item.id)
    } catch (error) {
      // Tratamento de erro
    }
  }
}, [fazendaId])
```

### 6.6 Atualizar Configuração Redux
```typescript
// frontend/src/store/slices/configSlice.ts
const configSlice = createSlice({
  name: 'config',
  initialState: {
    fazenda: null, // Objeto completo da fazenda (incluindo acesso_id, logo_url)
    // ... outros campos
  },
  reducers: {
    setFazenda: (state, action) => {
      state.fazenda = action.payload
    },
    // ... outros reducers
  }
})
```

---

## 7. Sistema Web Futuro (Dashboard)

### 7.1 Stack Tecnológica
- **Next.js 14:** React Server Components + App Router
- **Supabase:** Database + Auth + Real-time
- **TailwindCSS:** Estilização
- **shadcn/ui:** Componentes UI
- **Chart.js:** Visualização de dados

### 7.2 Funcionalidades
- **Gestão de Fazendas:** CRUD completo
- **Cadastros Base:** Pastos, lotes, funcionários, insumos
- **Visualização de Dados:** Dashboard com métricas
- **Relatórios:** Produção, movimentação, saúde, estoque
- **Real-time:** Sync automático com app mobile

### 7.3 Real-time Integration
```typescript
// web-dashboard/app/realtime/page.tsx
useEffect(() => {
  const subscription = supabase
    .channel('registros_maternidade')
    .on('postgres_changes', { event: 'INSERT', table: 'registros_maternidade' }, (payload) => {
      setRegistros(prev => [...prev, payload.new])
    })
    .subscribe()
    
  return () => subscription.unsubscribe()
}, [])
```

---

## 8. Segurança

### 8.1 Medidas de Segurança

#### 8.1.1 Acesso por ID de Fazenda
- ✅ Acesso controlado por acesso_id único por fazenda
- ✅ Validação no frontend antes de permitir acesso
- ✅ Isolamento por fazenda_id em todas as queries
- ✅ Soft delete (nunca deleta fisicamente)

#### 8.1.2 Isolamento de Dados
- ✅ Todas as queries filtram por fazenda_id
- ✅ RLS habilitado (acesso público com validação frontend)
- ✅ Cada fazenda tem dados isolados
- ✅ Audit log para auditoria

#### 8.1.3 Proteção de Dados
- ✅ Soft delete em todas as tabelas
- ✅ Criptografia em repouso (Supabase)
- ✅ Criptografia em trânsito (HTTPS)
- ✅ Backup automático diário (Supabase)

#### 8.1.4 API Security
- ✅ Service role key nunca exposta (apenas backend)
- ✅ Anon key exposta (RLS restringe acesso)
- ✅ Rate limiting (Supabase)
- ✅ CORS configurado

### 8.2 Backup e Recovery
- **Backup automático:** Diário (Supabase)
- **Retenção:** 7 dias (gratuito), 30 dias (Pro)
- **Point-in-time recovery:** Plano Pro

---

## 9. Performance e Escalabilidade

### 9.1 Capacidade (Plano Gratuito)
- 500MB database
- 2GB bandwidth
- 500k requests/mês
- 60 conexões simultâneas

### 9.2 Capacidade (Plano Pro - $25/mês)
- 8GB database
- 100GB bandwidth
- Ilimitado requests
- 200 conexões simultâneas
- Point-in-time recovery

### 9.3 Cenário de 25 Fazendas
- **Volume diário:** 2,187,000 registros
- **Volume mensal:** ~65 milhões de registros
- **Tamanho estimado:** ~2GB
- **Recomendação:** Plano Pro

---

## 10. Riscos e Mitigações

### 10.1 Risco: Perda de Dados na Migração
- **Mitigação:** Backup completo do Google Sheets, validação de contagem, rollback plan

### 10.2 Risco: Downtime Durante Migração
- **Mitigação:** Migração em fases, manter Google Sheets como backup

### 10.3 Risco: Performance Degradation
- **Mitigação:** Testes de performance, otimização de queries, partitioning

### 10.4 Risco: Resistência à Mudança
- **Mitigação:** Treinamento, suporte ativo, manter UI similar

---

## 11. Métricas de Monitoramento Pós-Migração

### 11.1 Métricas Técnicas

#### Performance
- **Tempo de resposta médio:** <500ms para queries simples
- **Tempo de resposta 95º percentil:** <1s
- **Taxa de erro de API:** <1%
- **Tempo de sync:** <5s para 100 registros
- **Uso de banda:** <100MB/dia por fazenda

#### Banco de Dados
- **Tamanho do database:** Monitorar crescimento mensal
- **Conexões simultâneas:** <50 (plano gratuito), <150 (plano Pro)
- **Query performance:** <100ms para queries principais
- **Index hit ratio:** >95%

#### Sincronização
- **Taxa de sucesso de sync:** >99%
- **Taxa de conflitos:** <1%
- **Tempo de resolução de conflitos:** <1min
- **Queue size:** <100 itens pendentes

### 11.2 Métricas de Negócio

#### Usuários
- **Taxa de adoção:** >90% após 1 semana
- **Satisfação:** >85% (pesquisa)
- **Suporte:** <5 chamadas/semana
- **Tempo para primeira tarefa:** <30s

#### Dados
- **Volume diário de registros:** Monitorar tendências
- **Atividade por fazenda:** Identificar fazendas inativas
- **Tempo de preenchimento:** <2min por caderneta
- **Taxa de registros completos:** >95%

### 11.3 Ferramentas de Monitoramento

#### Supabase Dashboard
- Database metrics (conexões, tamanho, queries)
- API metrics (requests, errors, latência)
- Storage metrics (uso, bandwidth)
- Real-time logs

#### Frontend Monitoring
- Sentry (error tracking) - plano gratuito
- Google Analytics (uso) - gratuito
- Custom logging (sync status, conflicts)

#### Alertas
- Taxa de erro >5%
- Tempo de resposta >2s
- Sync queue >1000 itens
- Database size >80% do limite

### 11.4 Relatórios Semanais

#### Relatório Técnico
- Performance média
- Erros e incidentes
- Crescimento de dados
- Status de sincronização

#### Relatório de Negócio
- Número de usuários ativos
- Volume de registros
- Fazendas mais ativas
- Feedback dos usuários

---

## 12. Rollback Plan Detalhado

### 12.1 Pré-Migração (Backup)

#### Backup do Google Sheets
1. Fazer download completo da planilha principal
2. Fazer download de todas as abas (9 cadernetas)
3. Salvar em formato XLSX e CSV
4. Armazenar em local seguro (Google Drive + backup local)
5. Documentar timestamp do backup

#### Backup do Frontend
1. Fazer commit com tag `pre-migration`
2. Documentar versão atual do app
3. Capturar configuração atual (environment variables)
4. Backup do IndexedDB (se houver dados críticos)

### 12.2 Durante Migração

#### Checkpoints de Validação
Após cada fase da migração:
1. **Fase 1 (Schema):** Validar que todas as tabelas foram criadas
2. **Fase 2 (Dados):** Validar contagem de registros (antes/depois)
3. **Fase 3 (Frontend):** Testar funcionalidade básica
4. **Fase 4 (Acesso):** Testar login por ID de fazenda

#### Critérios de Sucesso
- Contagem de registros: 100% migrados
- Integridade de dados: 0% de corrupção
- Funcionalidade: 100% das cadernetas funcionando
- Performance: Tempo de resposta <1s

### 12.3 Pós-Migração (30 dias)

#### Período de Observação
- **Dia 1-7:** Monitoramento intensivo (24h)
- **Dia 8-14:** Monitoramento diário
- **Dia 15-30:** Monitoramento semanal

#### Critérios de Rollback
**Se algum critério falhar nos primeiros 7 dias:**
1. Taxa de erro >10% (vs <1% esperado)
2. Tempo de resposta >3s (vs <1s esperado)
3. Taxa de sync <90% (vs >99% esperado)
4. Perda de dados >1 registro
5. Feedback negativo >50% dos usuários

### 12.4 Procedimento de Rollback

#### Rollback para Google Sheets
1. **Parar app:** Desabilitar frontend (GitHub Pages)
2. **Reverter frontend:** Fazer checkout do commit `pre-migration`
3. **Reverter backend:** Reverter para Vercel anterior
4. **Restaurar dados:** Reupar planilha do backup
5. **Testar:** Validar que sistema funciona como antes
6. **Comunicar:** Avisar usuários sobre rollback
7. **Investigar:** Analisar causa do problema

#### Rollback Parcial
Se apenas uma fazenda tiver problemas:
1. Isolar fazenda problemática
2. Reverter apenas essa fazenda para Google Sheets
3. Continuar operação para outras fazendas
4. Corrigir problema e migrar novamente

### 12.5 Comunicação com Usuários

#### Pré-Migração (7 dias antes)
```
"Caros usuários,

Informamos que realizaremos uma atualização do sistema no dia XX/XX às HH:00.
O app ficará indisponível por aproximadamente 30 minutos.

Após a atualização:
- O app funcionará normalmente
- Todos os dados estarão preservados
- A velocidade será melhorada

Em caso de dúvidas, entre em contato pelo WhatsApp: [número]"
```

#### Pós-Migração (após sucesso)
```
"Atualização concluída com sucesso!

O app está funcionando normalmente com melhorias de performance.
Todos os dados foram migrados com sucesso.

Se encontrar algum problema, entre em contato."
```

#### Rollback (se necessário)
```
"Encontramos um problema na atualização.
Estamos revertendo para o sistema anterior.

O app estará disponível novamente em 30 minutos.
Pedimos desculpas pelo inconveniente."
```

---

## 13. Checklist Final

### 13.1 Pré-Migração
- [ ] Backup completo do Google Sheets
- [ ] Projeto Supabase criado
- [ ] Environment variables configuradas
- [ ] Schema database criado
- [ ] RLS habilitado
- [ ] Políticas de segurança criadas
- [ ] Edge Function implementada
- [ ] Commit tag `pre-migration` criado

### 13.2 Migração
- [ ] Cadastros migrados (fazendas com acesso_id)
- [ ] Registros migrados (9 cadernetas)
- [ ] Validação de contagem (100%)
- [ ] Validação de integridade (0% corrupção)

### 13.3 Integração
- [ ] supabaseService implementado
- [ ] IndexedDB atualizado (supabase_id)
- [ ] useSync atualizado
- [ ] Sistema de acesso por ID implementado
- [ ] Upload de logos funcional

### 13.4 Testes
- [ ] Testes unitários
- [ ] Testes de integração (offline → online)
- [ ] Testes de performance (<1s)
- [ ] Testes de isolamento por fazenda
- [ ] Testes com usuários reais

### 13.5 Deploy
- [ ] Deploy staging
- [ ] Monitoramento inicial (7 dias)
- [ ] Backup final do Google Sheets
- [ ] Deploy produção
- [ ] Monitoramento contínuo (30 dias)

---

## 14. Conclusão

Este plano detalha a migração completa do sistema Caderneta Digital Gesta-Up de Google Sheets para Supabase, garantindo:

1. **100% de funcionalidade atual** mantida
2. **Escalabilidade** para 25+ fazendas
3. **Segurança** com RLS e validação em duas camadas
4. **Performance** consistente (sem rate limiting)
5. **Futuro** preparado para sistema web e checklists
6. **Rollback** plan detalhado para contingências
7. **Monitoramento** métricas para acompanhamento pós-migração

A migração é dividida em 6 semanas, com testes extensivos em cada fase para garantir zero downtime e perda zero de dados.

---

## 15. Autenticação: App Móvel vs Sistema Web

### 15.1 App Móvel (PWA)
- **Acesso:** Usuário digita ID da fazenda (sem login/senha)
- **Validação:** Frontend + Edge Function
- **Isolamento:** Por fazenda_id em todas as queries
- **Rastreabilidade:** Nome do peão (campo nome_usuario) + device_id
- **Use Case:** Peões em campo, baixa fricção

### 15.2 Sistema Web (Dashboard)
- **Acesso:** Login/senha com Supabase Auth
- **Validação:** Supabase Auth + RLS
- **Isolamento:** Por usuário_id + fazenda_id via usuario_fazenda
- **Rastreabilidade:** Usuario_id em audit_log
- **Use Case:** Gestão administrativa, controle total

### 15.3 Hierarquia de Permissões (Sistema Web)

#### Admin
- Acesso a todas as fazendas
- Criar/editar/deletar fazendas
- Criar/editar/deletar usuários
- Atribuir papéis (admin, gerente, peao)
- Ver todos os dados de todas as fazendas

#### Gerente
- Acesso apenas às fazendas atribuídas
- Criar/editar/deletar cadastros (pastos, lotes, insumos)
- Ver todos os dados das suas fazendas
- Atribuir peões às suas fazendas

#### Peão
- Acesso apenas às fazendas atribuídas
- Criar registros (9 cadernetas)
- Ver apenas seus próprios registros
- Não pode criar/editar cadastros

### 15.4 RLS para Sistema Web

```sql
-- Exemplo: RLS para pastos (sistema web)
CREATE POLICY "Gerente pode ver pastos da sua fazenda"
ON pastos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuario_fazenda
    WHERE usuario_fazenda.usuario_id = auth.uid()
    AND usuario_fazenda.fazenda_id = pastos.fazenda_id
    AND usuario_fazenda.papel IN ('admin', 'gerente')
  )
);

-- Admin pode ver todos os pastos
CREATE POLICY "Admin pode ver todos os pastos"
ON pastos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuario_fazenda
    WHERE usuario_fazenda.usuario_id = auth.uid()
    AND usuario_fazenda.papel = 'admin'
  )
);
```

---
