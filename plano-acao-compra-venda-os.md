# Plano de Ação: Compra, Venda e Transferência de Animais (OS)

## Visão Geral
Implementar no aplicativo e no sistema administrativo (site) o fluxo completo de Ordem de Serviço (OS) para compra, venda e transferência de animais, incluindo recepção com laudo de chegada e manejo curral vinculado à OS.

**Aplicativo**: Cadernetas digitais para uso no campo (offline-first)
**Site**: Painel administrativo para gestão, aprovação e fechamento de OS

---

## Fase 1: Modelo de Dados (Supabase)

### 1.1 Tabelas Principais

#### `ordens_servico`
| Campo | Tipo | Constraints | Observação |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `fazenda_id` | uuid | FK → fazendas(id), NOT NULL | Tenancy |
| `tipo` | enum | CHECK IN ('compra', 'venda', 'transferencia') | |
| `numero_sequencial` | integer | NOT NULL | Sequência por fazenda/ano |
| `numero_os` | text | NOT NULL, UNIQUE(fazenda_id, numero_os) | COM-2026-00001 |
| `ano` | integer | NOT NULL | Extraído do número |
| `status` | enum | DEFAULT 'aberta', CHECK IN ('aberta', 'em_recebimento', 'divergencia', 'fechada', 'cancelada') | |
| `fazenda_origem_id` | uuid | FK → fazendas(id), nullable | Origem do gado |
| `fazenda_destino_id` | uuid | FK → fazendas(id), nullable | Destino (venda/transfer) |
| `quantidade_informada` | integer | NOT NULL | Qtd prevista no informativo |
| `quantidade_recebida` | integer | nullable | Preenchido no laudo de chegada |
| `sexo` | text | nullable | Macho/Fêmea/Misto |
| `idade` | text | nullable | Descrição textual |
| `raca` | text | nullable | Angus/Nelore/Cruzamento/Outro |
| `data_embarque` | date | nullable | |
| `data_chegada_prevista` | date | nullable | |
| `data_chegada_efetiva` | date | nullable | Preenchido na recepção |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |
| `created_by` | uuid | nullable | Usuário que criou |
| `closed_at` | timestamptz | nullable | Data de fechamento |
| `closed_by` | uuid | nullable | Quem fechou |

#### `os_laudos_compra` (preenchido no site — ADM/Originação)
| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | PK |
| `os_id` | uuid | FK → ordens_servico(id), ON DELETE CASCADE |
| `fazenda_id` | uuid | FK → fazendas(id) |
| `doc_origem` | text | |
| `nota_fiscal` | text | |
| `gta` | text | Guia de Trânsito Animal |
| `transportadora` | text | |
| `placa_veiculo` | text | |
| `motorista` | text | |
| `peso_balanca` | numeric(10,2) | kg |
| `peso_origem` | numeric(10,2) | kg |
| `hora_pesagem` | time | |
| `dados_pagamento` | jsonb | nullable (só compra) |
| `despesas` | jsonb | nullable (só compra) |
| `corretagem` | jsonb | nullable (só compra) |
| `observacoes` | text | |
| `responsavel` | text | |
| `auxiliar` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `os_laudos_recebimento` (preenchido no app — recepção)
| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | PK |
| `os_id` | uuid | FK → ordens_servico(id), ON DELETE CASCADE |
| `fazenda_id` | uuid | FK → fazendas(id) |
| `data_recebimento` | date | |
| `hora_recebimento` | time | |
| `doc_ok` | boolean | Sim/Não |
| `doc_observacao` | text | Se doc não OK |
| `transportadora` | text | |
| `placa_veiculo` | text | |
| `motorista` | text | |
| `peso_balanca` | numeric(10,2) | |
| `hora_pesagem` | time | |
| `peso_origem` | numeric(10,2) | |
| `quantidade_recebida` | integer | |
| `raca` | text | Angus/Nelore/Cruzamento/Outro |
| `sexo` | text | Macho/Fêmea/Misto |
| `categorias` | jsonb | Array {categoria, quantidade_f, quantidade_m} |
| `score_corporal` | integer | 1 a 5 |
| `destino` | text | Baia/Pasto |
| `responsavel` | text | |
| `auxiliar` | text | |
| `observacoes_gerais` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `os_laudos_recebimento_diagnostico` (checklist do laudo)
| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | PK |
| `laudo_recebimento_id` | uuid | FK |
| `fazenda_id` | uuid | FK → fazendas(id) |
| `sequencia` | integer | 1 a 20 |
| `diagnostico` | text | Nome do item (ex: "Estressados") |
| `sim` | boolean | |
| `nao` | boolean | |
| `observacao` | text | |
| `created_at` | timestamptz | |

> **Trigger**: INSERT/UPDATE em `os_laudos_recebimento` deve sincronizar `quantidade_recebida` com `ordens_servico.quantidade_recebida` e atualizar status se houver divergência.

#### `manejo_curral_registros` (caderneta existente, agora vinculada)
| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | PK |
| `fazenda_id` | uuid | FK → fazendas(id) |
| `os_id` | uuid | FK → ordens_servico(id), nullable | Vinculação obrigatória para animais de entrada |
| `lote_id` | uuid | FK → lotes(id), nullable | |
| `plano_sanitario_id` | uuid | FK → planos_sanitarios(id), nullable | |
| `data` | date | |
| `procedimentos` | jsonb | |
| `observacoes` | text | |
| `sync_status` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `planos_sanitarios` (cadastro base)
| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | PK |
| `fazenda_id` | uuid | FK → fazendas(id) |
| `nome` | text | NOT NULL |
| `descricao` | text | |
| `ativo` | boolean | DEFAULT true |
| `created_at` | timestamptz | |

### 1.2 Triggers e Functions (Supabase)

#### Function: `gerar_numero_os()`
```sql
CREATE OR REPLACE FUNCTION gerar_numero_os()
RETURNS TRIGGER AS $$
DECLARE
  proximo_numero INTEGER;
  prefixo TEXT;
BEGIN
  -- Definir prefixo baseado no tipo
  prefixo := CASE NEW.tipo
    WHEN 'compra' THEN 'COM'
    WHEN 'venda' THEN 'VEN'
    WHEN 'transferencia' THEN 'TRA'
  END;

  -- Buscar próximo número sequencial para fazenda/ano
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1
  INTO proximo_numero
  FROM ordens_servico
  WHERE fazenda_id = NEW.fazenda_id
    AND ano = EXTRACT(YEAR FROM CURRENT_DATE);

  NEW.numero_sequencial := proximo_numero;
  NEW.numero_os := prefixo || '-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(proximo_numero::TEXT, 5, '0');
  NEW.ano := EXTRACT(YEAR FROM CURRENT_DATE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gerar_numero_os
  BEFORE INSERT ON ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION gerar_numero_os();
```

#### Function: `atualizar_status_os_recebimento()`
```sql
CREATE OR REPLACE FUNCTION atualizar_status_os_recebimento()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ordens_servico
  SET
    quantidade_recebida = NEW.quantidade_recebida,
    status = CASE
      WHEN NEW.quantidade_recebida = ordens_servico.quantidade_informada THEN 'em_recebimento'
      WHEN NEW.quantidade_recebida IS DISTINCT FROM ordens_servico.quantidade_informada THEN 'divergencia'
      ELSE ordens_servico.status
    END,
    data_chegada_efetiva = NEW.data_recebimento,
    updated_at = now()
  WHERE id = NEW.os_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_status_os_recebimento
  AFTER INSERT OR UPDATE ON os_laudos_recebimento
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_status_os_recebimento();
```

#### Function: `validar_fechamento_os()`
```sql
CREATE OR REPLACE FUNCTION validar_fechamento_os(os_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  qtd_informada INTEGER;
  qtd_recebida INTEGER;
BEGIN
  SELECT quantidade_informada, quantidade_recebida
  INTO qtd_informada, qtd_recebida
  FROM ordens_servico
  WHERE id = os_id;

  RETURN qtd_recebida IS NOT NULL AND qtd_recebida = qtd_informada;
END;
$$ LANGUAGE plpgsql;
```
> Usada no site para bloquear fechamento de OS com divergência.

### 1.3 Views para o Site

#### `v_os_em_aberto`
```sql
CREATE VIEW v_os_em_aberto AS
SELECT
  os.*,
  f_origem.nome AS fazenda_origem_nome,
  f_destino.nome AS fazenda_destino_nome
FROM ordens_servico os
LEFT JOIN fazendas f_origem ON os.fazenda_origem_id = f_origem.id
LEFT JOIN fazendas f_destino ON os.fazenda_destino_id = f_destino.id
WHERE os.status IN ('aberta', 'em_recebimento', 'divergencia');
```

#### `v_os_resumo`
```sql
CREATE VIEW v_os_resumo AS
SELECT
  os.id,
  os.numero_os,
  os.tipo,
  os.status,
  os.quantidade_informada,
  os.quantidade_recebida,
  os.fazenda_id,
  lc.doc_origem AS laudo_compra_doc_origem,
  lc.nota_fiscal AS laudo_compra_nf,
  lr.quantidade_recebida AS laudo_recebimento_qtd,
  lr.doc_ok AS laudo_recebimento_doc_ok,
  lr.data_recebimento
FROM ordens_servico os
LEFT JOIN os_laudos_compra lc ON os.id = lc.os_id
LEFT JOIN os_laudos_recebimento lr ON os.id = lr.os_id;
```

### 1.4 RLS (Row Level Security)
- Todas as tabelas devem ter `fazenda_id` como coluna de tenancy.
- Política padrão: `auth.uid() IN (SELECT user_id FROM fazendas_usuarios WHERE fazenda_id = fazenda_id)`
- Ou via JWT claim `fazenda_id` se usar service role / Edge Functions.

---

## Fase 2: Backend / Supabase (API)

### 2.1 Edge Functions (opcional, se necessário)
- `fechar-os`: Recebe `os_id`, executa `validar_fechamento_os()`, atualiza status para 'fechada' se válido, retorna erro se divergência.
- `listar-os-abertas`: Retorna OS em aberto para a fazenda do usuário autenticado.
- `relatorio-os`: Gera resumo de OS por período (para relatórios do site).

### 2.2 RPC Functions
- `get_proximo_numero_os(fazenda_id UUID, tipo TEXT)` → TEXT: Para pré-visualização do número antes de salvar (opcional, já que o trigger faz isso).
- `get_os_status_divergencia(os_id UUID)` → JSON: Retorna `{qtd_informada, qtd_recebida, divergencia, pode_fechar}`.

---

## Fase 3: Aplicativo — Caderneta "Informativo de Compra/Venda/Transferência"

### 3.1 Fluxo
1. Usuário seleciona tipo: **Compra / Venda / Transferência**
2. Formulário com campos: Fazenda Origem, Quantidade, Sexo, Idade, Raça, Data Embarque, Data Chegada
3. Ao salvar:
   - Salva no IndexedDB (offline-first)
   - Agenda sync para Supabase
   - Número OS gerado automaticamente pelo trigger (ex: `COM-2026-00001`)
4. Tela de confirmação mostrando o número OS gerado

### 3.2 Componentes/Campos
- `TipoOSRadio` (Compra, Venda, Transferência)
- `SearchableModal` para Fazenda Origem (busca de cadastro de fazendas)
- `Input` para Quantidade, Sexo, Idade, Raça
- `DatePicker` para Data Embarque e Data Chegada
- Status inicial: **"Aberta"**

### 3.3 Sync
- Tabela: `ordens_servico`
- Campo `status` inicia como `'aberta'`
- Campo `fazenda_id` vinculado à fazenda logada
- O `numero_os` não deve ser enviado no INSERT (é gerado pelo trigger). Se enviado, o trigger deve respeitar ou sobrescrever.

---

## Fase 4: Aplicativo — Caderneta "Recepção de Animais"

### 4.1 Fluxo
1. Seleciona OS em aberto da fazenda (lista vinda do Supabase/IndexedDB)
2. Tela 1 — Verificação de Documentação:
   - Documentação OK? **Sim / Não**
   - Observação (obrigatória se "Não")
3. Tela 2 — Laudo de Recebimento (baseado no formulário da imagem):
   - **Transporte**: Transportadora, Placa, Motorista
   - **Dados dos Animais**: Quantidade recebida, Raça, Sexo, Categorias (Boi/Vaca/Garrote/Novilha/Bezerro/Bezerra/Touro), Peso balança, Peso origem, Hora pesagem, Score corporal (1-5), Destino (Baia/Pasto)
   - **Checklist de Diagnóstico**: Tabela com 20 itens (Sim/Não + Observação)
     1. Estressados
     2. Rastreados
     3. Debilitado (fraco)
     4. Pneumonia
     5. Mancando
     6. Problema de pele
     7. Miíase (Bicheira)
     8. Sem Orelha
     9. Quebrado
     10. Problema no casco
     11. Deitado (Pisoteado)
     12. Má Formação
     13. Papilomatose (Verruga)
     14. Carrapatos
     15. Sintomas Intoxicação
     16. Umbigueira
     17. Fraturas/Trauma/Lesão (Recuperado)
     18. Animal morto
     19. Condições/Score Corporal
     20. Destino
   - Responsável, Auxiliar
4. Salvar → gera `os_laudos_recebimento` + `os_laudos_recebimento_diagnostico` (20 registros)
5. Trigger atualiza `ordens_servico.status` e `quantidade_recebida`

### 4.2 Validações
- Se `quantidade_recebida` ≠ `quantidade_informada` da OS: salvar com `status = 'divergencia'` (trigger faz isso automaticamente)
- Documentação não OK: permitir salvar, mas marcar flag e exigir observação
- Score corporal: 1 a 5
- Campos obrigatórios: Quantidade recebida, Data/Hora, Responsável

### 4.3 Sync
- Salva `os_laudos_recebimento` e os 20 registros de `os_laudos_recebimento_diagnostico`
- O trigger no Supabase já atualiza a OS automaticamente ao syncar

---

## Fase 5: Aplicativo — Caderneta "Manejo Curral"

### 5.1 Contexto
- Já existe a caderneta de Manejo Curral em construção
- Agora deve ser vinculada à OS de entrada do animal/lote

### 5.2 Alterações Necessárias
- Adicionar campo `os_id` (UUID) no formulário
- `SearchableModal` para selecionar OS em aberto (filtrar por tipo = compra/transferencia e status = fechada)
- `SearchableModal` para selecionar Plano Sanitário (cadastro base `planos_sanitarios`)
- Validação: se animal/lote é de entrada, obrigar `os_id`
- Plano sanitário: lista suspensa vinda do Supabase/IndexedDB

### 5.3 Sync
- Tabela: `manejo_curral_registros` (ou `registros_manejo_curral` se seguir padrão)
- Campo `os_id` opcional para animais já existentes, obrigatório para novos animais de entrada

---

## Fase 6: Site — ADM/Originação

### 6.1 Tela 1: Seleção do Tipo de Entrada
- Botões: **Transferência** / **Compra**
- Filtro: mostrar apenas OS com status = 'aberta' e tipo correspondente

### 6.2 Tela 2: Seleção da OS
- Lista de OS em aberto (`v_os_em_aberto`)
- Colunas: Número OS, Tipo, Fazenda Origem, Quantidade, Data Embarque, Status
- Filtros: por tipo, por data, por fazenda origem
- Ordenação: por data de criação

### 6.3 Tela 3: Laudo de Compra (preenchimento)
- **Campos obrigatórios**: Doc Origem, Nota Fiscal, GTA
- **Transporte**: Transportadora, Placa, Motorista
- **Pesagem**: Peso balança, Peso origem, Hora pesagem
- **Dados de pagamento** (JSON): só aparece se tipo = compra
- **Despesas** (JSON): só aparece se tipo = compra
- **Corretagem** (JSON): só aparece se tipo = compra
- **Observações** gerais
- **Responsável** e **Auxiliar**
- Ao salvar: cria registro em `os_laudos_compra`

### 6.4 Tela 4: Fechamento de OS e Gestão de Divergências
- **Dashboard de OS**: lista todas com status colorido
  - Verde: fechada
  - Amarelo: em recebimento
  - Vermelho: divergência
  - Cinza: aberta (sem laudo)
- **Ação "Fechar OS"**: 
  - Disponível apenas se `validar_fechamento_os()` retornar TRUE
  - Se divergência: botão desabilitado, exibe mensagem: "Divergência detectada: informada X, recebida Y. Ajuste a quantidade no laudo de chegada ou corrija a OS."
- **Ação "Ajustar Quantidade"**: permite editar `quantidade_informada` da OS (somente ADM)
- **Relatório**: exportar OS por período (CSV/PDF)

### 6.5 Tela 5: Cadastro de Planos Sanitários
- CRUD simples para `planos_sanitarios`
- Nome, descrição, ativo/inativo
- Usado no aplicativo no Manejo Curral

---

## Fase 7: Integração, Testes e Ajustes

### 7.1 Testes de Fluxo Completo
1. App: cria OS de compra (COM-2026-00001)
2. Site: preenche laudo de compra
3. App: recepção preenche laudo de chegada (qtd = informada)
4. Site: fecha OS ✓
5. App: cria OS de compra (COM-2026-00002)
6. App: recepção com qtd diferente
7. Site: tenta fechar → bloqueado, mostra divergência
8. Site: ADM ajusta qtd ou corrige laudo
9. Site: fecha OS ✓
10. App: manejo curral vinculado à OS fechada

### 7.2 Testes de Sync Offline
- Criar OS offline → sync automático quando online
- Recepção offline → sync e trigger atualiza OS no Supabase
- Verificar se `numero_os` não conflita entre fazendas (tenancy garante isso)

### 7.3 Testes de Segurança
- RLS: usuário de fazenda A não vê OS da fazenda B
- Site: apenas perfil ADM pode fechar OS e ajustar quantidades
- App: apenas usuários da fazenda logada podem criar/receber OS

### 7.4 Performance
- Índices em `ordens_servico(fazenda_id, status, tipo)`
- Índices em `ordens_servico(fazenda_id, ano, numero_sequencial)`
- Índices em `os_laudos_recebimento(os_id)`
- Índices em `os_laudos_compra(os_id)`
- View materializada `v_os_resumo` se volume for alto (opcional)

---

## Resumo de Dependências por Fase

| Fase | Depende de | Bloca |
|---|---|---|
| 1 (Modelo) | — | 2, 3, 4, 5, 6 |
| 2 (Backend) | 1 | 3, 4, 5, 6 |
| 3 (App Informativo) | 1, 2 | — |
| 4 (App Recepção) | 1, 2 | — |
| 5 (App Manejo) | 1, 2 | — |
| 6 (Site ADM) | 1, 2 | — |
| 7 (Testes) | 3, 4, 5, 6 | — |

**Fases 3, 4, 5 e 6 podem ser desenvolvidas em paralelo** após conclusão das Fases 1 e 2.

---

## Notas de Implementação
- **Nomenclatura OS**: o trigger garante que o número seja único por fazenda e ano. O prefixo muda conforme o tipo (COM/VEN/TRA).
- **Tenancy**: todas as tabelas têm `fazenda_id`. A sequência de número é por fazenda.
- **Divergência**: o trigger no Supabase detecta automaticamente. O site usa a function `validar_fechamento_os()` para bloquear o fechamento.
- **Fotos/vídeos**: conforme definido, não serão armazenados no sistema. O usuário envia diretamente pelo WhatsApp.
- **Laudo de chegada**: os 20 itens de diagnóstico são salvos como registros individuais em `os_laudos_recebimento_diagnostico` para facilitar relatórios e filtros no site futuramente.
