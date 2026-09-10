# Backlog — débitos técnicos e specs não implementadas

Este arquivo lista trabalho pendente. Um chat novo deve consultar este arquivo para saber o que ainda falta fazer e o que já foi decidido mas não implementado.

## ~~Idempotência via `local_id` nas tabelas de registros~~ (RESOLVIDO — ver docs/HISTORICO.md)

## Tela de auditoria de erros de sync no Painel Web (rota /admin)

**Contexto**: a tabela `logs_sync_errors` no Supabase já é gravada pelo PWA (via `logSyncError` em syncService.ts) e agora também por triggers do banco. Mas não existe nenhuma interface para ler essa tabela. Hoje só é acessível via SQL direto no Supabase Studio, o que impede auditoria operacional por alguém não-técnico.

**Spec da implementação (Painel Web, repo `GestaUp-Cadernetas-Gestao`)**:

Criar rota `/admin/erros-sync` com:

1. **Tabela `logs_sync_errors`** (schema já existe):
   - `id` (uuid), `fazenda_id` (uuid), `dispositivo_id` (uuid), `caderneta` (text), `registro_id` (text), `operation` (text), `error_code` (text), `error_message` (text), `error_details` (text), `payload` (jsonb), `retry_count` (int), `resolved_at` (timestamptz), `resolved_by` (text), `created_at` (timestamptz), `dispositivo_uuid` (text), `app_version` (text), `platform` (text), `network_status` (text)

2. **Listagem paginada** com filtros:
   - Fazenda (select)
   - Caderneta (select: morte, movimentacao, maternidade, etc.)
   - Error code (select: CATEGORIA_NOT_IN_LOTE, network, 23505, 42501, etc.)
   - Período (date range)
   - Resolvido/não-resolvido (toggle)
   - Busca livre em `error_message` e `error_details`

3. **Colunas exibidas**: created_at, fazenda, caderneta, error_code, error_message (truncado), resolved (sim/não), actions

4. **Detalhe expandido** (click na linha ou modal): todos os campos, payload formatado como JSON, botão "marcar como resolvido" (seta `resolved_at = now()` e `resolved_by = usuário logado`)

5. **Acesso**: restrito a usuários com papel `admin` na `usuario_fazenda` (mesma policy já usada no Painel Web)

6. **Real-time**: opcional, subscrição via Supabase Realtime na tabela para atualização ao vivo

## Validação de categoria em triggers de desconto de cabeças

**Problema**: os triggers `trigger_update_quant_atual_morte`, `trigger_update_quant_atual_maternidade` e `trigger_update_quant_atual_movimentacao` fazem `UPDATE lote_categorias SET quant_atual = ... WHERE lote_id = NEW.lote_id AND LOWER(categoria) = LOWER(NEW.categoria)`. Se a categoria do registro não existe em `lote_categorias`, o UPDATE afeta 0 linhas silenciosamente: o registro é salvo mas a cabeça não é descontada de nenhuma categoria, sem erro nem log.

**Caso real (Fazenda Guanabara, 03/08/2026)**: peão lançou morte no lote "Farmacia" (pasto Enfermaria) com categoria "Bezerro", mas o lote só tinha "Boi Magro" ativa em `lote_categorias`. O trigger executou mas não descontou. `quant_atual` de "Boi Magro" permaneceu 15 e `morte` permaneceu 0.

**Correção aplicada (morte)**: a função `update_quant_atual_morte()` agora verifica se a categoria existe em `lote_categorias` antes do UPDATE. Se não existe, insere um registro em `logs_sync_errors` com `error_code = 'CATEGORIA_NOT_IN_LOTE'`, `caderneta = 'morte'`, e o payload com lote_id, categoria, brinco, pasto, lote, nome_usuario. O INSERT do registro não é rejeitado (o peão já salvou), mas o erro fica auditável na tabela.

**Correção aplicada (movimentacao, 10/08/2026)**: a função `update_quant_atual_movimentacao()` agora verifica se a categoria existe em `lote_categorias` para o lote origem antes do UPDATE. Se não existe, insere um registro em `logs_sync_errors` com `error_code = 'CATEGORIA_NOT_IN_LOTE'`, `caderneta = 'movimentacao'`, e o payload com lote_origem_id, lote_destino_id, categoria, motivo_movimentacao, numero_cabecas, nome_usuario. O INSERT do registro não é rejeitado, mas o erro fica auditável. Migração: `add_categoria_not_in_lote_guard_movimentacao`. Validação: inserido registro de teste com categoria fantasma no lote "Lote 16", log criado corretamente, registro e log de teste removidos após validação. Encontrados 28 registros órfãos em produção (9 lotes, 8 categorias distintas) que dispararão o log em novos INSERTs mas não retroativamente.

**Pendente (maternidade)**: a função `update_quant_atual_maternidade()` precisa do mesmo tratamento. Tem o mesmo padrão de UPDATE condicional que pode afetar 0 linhas silenciosamente. A função existe no Painel Web em `supabase/migrations/20260825170000_migration_s_fix_unaccent_triggers.sql:205-238`, mas ainda não aplica o guard `CATEGORIA_NOT_IN_LOTE`: quando a categoria não existe, a função cria a linha em `lote_categorias` (linhas 224-230) em vez de inserir em `logs_sync_errors`.

## ~~Log de erro visível na lista de registros + eliminação de retries automáticos~~ (RESOLVIDO — ver docs/HISTORICO.md)

---

## Auditoria de código (julho/2026) — itens pendentes

Foram identificadas 87 falhas em 4 frentes. 30 itens já foram resolvidos (ver `docs/HISTORICO.md`). Os 57 pendentes estão listados abaixo.

### Matriz de impacto cruzado (PWA ↔ Painel Web)

Correções no PWA que **QUEBRAM** o Painel Web se aplicadas isoladamente:

| Correção | Tabelas | Onde quebra no Painel | Pré-requisito |
|---|---|---|---|
| S3 (RLS restritivo) | 22+ tabelas cadastro | Currais, Formulacoes, Insumos, Pastos, Funcionarios, Setores, Racas, Fornecedores, Frigorificos, Implementos, ItensAlmoxarifado, Locais, MaquinasVeiculos, Medicamentos, Mineral, Proteinado, Racao, Tratamentos, CausasMorte, Pluviometros, BebedourosCadastro, CadastrosAuxiliares | Garantir usuario_fazenda.ativo=true para todo usuário; policy usar u.auth_id=auth.uid() |
| S1 (fazendas) | fazendas | fazendasService.ts:87-130 | Permitir INSERT por admin; UPDATE/DELETE por usuario_fazenda admin |
| S4 (usuarios) | usuarios | usuariosService.ts:44-86, authService.ts:100 | Permitir UPDATE id=auth.uid() + admin edita qualquer um |
| S5 (senhas peoes) | peoes | fazendasService.ts:255-262 | Migrar para Supabase Auth nativo antes de remover coluna password |
| S7 (lote_historico) | lote_historico | IndividuoNovo.tsx:559,590,711 | Verificar se lote_historico tem fazenda_id; se não, policy com JOIN via lote_id |

Correções **SEGURAS** (sem impacto no Painel Web):

| Correção | Motivo |
|---|---|
| C2, C5, C9, C10, C13, C14 (schema/sync) | Mudanças no syncService.ts do PWA. Painel faz SELECT * e ignora extras |
| N1, N3-N5, N7-N9, N15, N18, N20-N21, N23, N27-N29 (lógica negócio) | Arquivos exclusivos do PWA (syncService, cadastroCache, validation) |
| R2, R6-R8, R11, R15-R16, R18-R24 (bugs runtime) | Páginas/componentes exclusivos do PWA |

### Ordem de aplicação recomendada

1. **Seguro (imediato)**: C2, C5, C9-C10, C13-C14, N1, N3-N5, N7-N9, N15, N18, N20-N21, N23, N27-N29, R2, R6-R8, R11, R15-R16, R18-R24
2. **Preparação (antes de RLS)**: verificar usuario_fazenda, lote_historico.fazenda_id, decidir política de controller, migrar senhas
3. **RLS (coordenado)**: S3, S1, S4, S7, S8 juntas, testar Painel após
4. **Senhas (por último)**: S5 após migrar ambos os sistemas

### Frente 1: Segurança/RLS — todos pendentes

**Críticos**

| ID | Tabela/Arquivo | Problema | Correção |
|---|---|---|---|
| S1 | fazendas | Policies Auth delete/insert/update com qual=true, qualquer usuário autenticado pode deletar/criar/alterar qualquer fazenda | Restringir DELETE/INSERT/UPDATE ao id IN (SELECT fazenda_id FROM usuario_fazenda WHERE usuario_id = auth.uid() AND papel = 'admin') |
| S2 | fazendas | Policy Enable public read access (role public), qualquer pessoa na internet pode listar todas as fazendas | Remover policy public; manter apenas SELECT por usuario_fazenda |
| S3 | checklist_regras, funcionarios, formulacoes, frigorificos, insumos, itens_almoxarifado, locais, implementos, medicamentos, mineral, proteinado, racao, tratamentos, setores, maquinas_veiculos, currais, lotes, pastos, racas, fornecedores, causas_morte, bebedouros | Todas com policies qual=true (SELECT/INSERT/UPDATE/DELETE), qualquer usuário autenticado acessa dados de todas as fazendas | Substituir por filtro fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id=uf.usuario_id WHERE u.auth_id=auth.uid() AND uf.ativo=true) |
| S4 | usuarios | Policies Allow authenticated insert/update com qual=true, qualquer usuário pode criar/alterar qualquer usuário | Restringir INSERT/UPDATE a id = auth.uid() ou role admin |
| S5 | peoes (coluna password) | Senhas dos peões em texto plano; usadas em authController.ts:42 para signInWithPassword | **Aceito como está** (decisão do usuário, 2026-09-10): peão é perfil de acesso limitado a dados da fazenda, não tem acesso a dados sensíveis. Hashing é melhoria opcional de defesa-em-profundidade, sem urgência. Se implementar no futuro: migration que hashea as existentes + ajustar authController.ts. |

**Altos**

| ID | Local | Problema | Correção |
|---|---|---|---|
| S6 | bebedouros, categorias, medicamentos, peoes, racas, setores, locais, pluviometros | Policies SELECT com role public, dados acessíveis sem login | Remover policies public; restringir a authenticated com filtro por fazenda |
| S7 | lote_historico | Policy Enable all operations for authenticated users com qual=true, ALL sem filtro de fazenda | Adicionar filtro por fazenda_id |
| S8 | execucoes_rotina, execucoes_rotina_historico | Policies com role public, qualquer pessoa pode inserir execuções | Mudar role para authenticated e adicionar filtro por fazenda |
| S9 | backend/src/app.ts | Nenhum middleware de autenticação no backend Express | Adicionar middleware verifyToken que valida JWT do Supabase |

**Médios**

| ID | Local | Problema |
|---|---|---|
| S10 | frontend/.env.example:10 | Anon key commitada (aceitável, mas expõe URL) |
| S11 | backend/src/controllers/authController.ts:32 | ilike em campo que deveria ser UUID |

### Frente 2: Lógica de Negócio — pendentes

**Críticos**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| N1 | syncService.ts:78, 846-989 | `registroToSupabase` seta `version` mas update não lê a versão remota nem trata conflitos |
| N3 | syncService.ts:724-739 | `entrada-insumos` cria o pai e depois atualiza itens em loop; não há transação atômica/RPC |
| N4 | cadastroCache.ts:514 | `currentFazendaId` continua como variável global do módulo |
| N5 | supabaseService.ts:151-173 | Funções de escrita não validam permissões do lado do app; confiam apenas no RLS |

**Altos**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| N7 | syncService.ts:998-1004 | `calculateBackoffMs` faz exponencial puro, sem jitter |
| N8 | cadastroCache.ts:129-208 | `loadQueryCacheFromIndexedDB` não verifica timestamp; `loadFromCache` não verifica timestamp |
| N9 | cadastroCache.ts:213-243 | `saveToCache` grava sem validar frescura e mantém fallback de `individuos` do cache anterior |
| N15 | validation.ts:320-327 | `validateSuplementacao`: `kgCocho` e `kgDeposito` só exigem `> 0`, sem limite máximo |

**Médios**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| N18 | useFormValidation.ts:163-169 | `rule.custom(value, form)` chamado sem `try/catch` |
| N20 | indexedDB.ts:45 | `openDB(DB_NAME, 27, ...)` com versão hardcoded |
| N21 | cadastroCache.ts:17 | `CACHE_EXPIRY_MS = 30 * 60 * 1000` fixo |
| N23 | useFuncionarioAuth.ts:46-57 | `funcionarioLogado` reconstruído do Redux sem validar contra a lista carregada |

**Baixos**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| N27 | shareUtils.ts:203-219 | Filtros de campos por caderneta continuam hardcoded |
| N28 | validation.ts:13-25 | `isValidDate` ainda exige `date <= new Date()`, bloqueando datas futuras |
| N29 | store.ts:12 | `whitelist: ['config', 'cadernetas']` não inclui o slice `sync` |

### Frente 3: Bugs de Runtime — pendentes

**Altos**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| R2 | CantinaPage.tsx:189 | `form.quemAjudou.forEach` sem null/undefined check |
| R6 | LimpezaPage.tsx:103,135 | `form.limpezaRealizada.forEach` sem null check |
| R7 | ManutencaoMaquinasPage.tsx:93,102 | `p.checklist[campo]` sem optional chaining |
| R8 | MaternidadePage.tsx:215 | `useState<FormState>(makeInitial())` executa a função a cada render |

**Médios**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| R11 | OperacoesMaquinasPage.tsx:130-131 | `split(':')` sem verificar formato/undefined |
| R15 | SaidaInsumosPage.tsx:132 | `suplementacaoData!.insumos` com non-null assertion |
| R16 | SaidaInsumosPage.tsx:129 | `const saidaId = result.id` sem verificar se existe |

**Baixos**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| R18 | AbastecimentoPage.tsx:191-219 | Sem `try/finally`; `setSalvando(false)` não executado em erro |
| R19 | BebedourosPage.tsx:161-168 | `return unsubscribe` sem verificar se é uma função |
| R20 | EnfermariaPage.tsx:242-250 | Carrega lotes sem `try/catch` nem feedback de erro |
| R21 | LeituraCochoPage.tsx:248,260 | `catch { // ignorar erro }` silenciando falhas |
| R22 | MovimentacaoPage.tsx:363-372 | `return unsubscribe` sem verificação |
| R23 | PastagensPage.tsx:295-303 | `return unsubscribe` sem verificação |
| R24 | RodeioPage.tsx:199-208 | `return unsubscribe` sem verificação |

### Frente 4: Consistência — pendentes

**Críticos**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| C2 | syncService.ts:171,193 | `horario_manejo` e `categorias_detalhes` enviados para `registros_pastagens` mas não existem no schema |
| C5 | syncService.ts:282-293 | `gado` e `categoria` existem no schema de bebedouros mas não são enviados |

**Altos**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| C9 | formatDate.ts:1-7 | ~~`todayBR()` continua usando `new Date()` local, sem `America/Cuiaba`~~ (RESOLVIDO) |
| C10 | supabaseService.ts (15 ocorrências) | ~~`delete*` usam `new Date().toISOString()` sem timezone da fazenda~~ (RESOLVIDO: 2 ocorrências de data de referência corrigidas; 15 de `deleted_at` continuam em UTC, que é correto para storage) |
| C13 | api.ts:28-30 | ~~Data inicial não converte para `America/Cuiaba`; depende de C9~~ (RESOLVIDO via C9) |

**Médios**

| ID | Arquivo:Linha | Problema |
|---|---|---|
| C14 | mcp-server/schema.sql:334-336 | Índices com typo: `idx_supplementacao_*` (duplo `p`) ainda presente no DDL local |

### Top 10 prioridades (atualizado)

| # | ID | Frente | Problema | Impacto no Painel |
|---|---|---|---|---|
| 1 | S3 | Segurança | 22+ tabelas com RLS qual=true | QUEBRA se isolado |
| 2 | S5 | Segurança | ~~Senhas peões em texto plano~~ (aceito como está) | NEUTRO |
| 3 | S1 | Segurança | fazendas: DELETE/INSERT/UPDATE por qualquer usuário | QUEBRA se isolado |
| 4 | C2, C5 | Consistência | syncService envia campos inexistentes no schema de pastagens e bebedouros | NEUTRO |
| 5 | N1 | Negócio | Sem conflito de versão no sync | NEUTRO |
| 6 | N3 | Negócio | Sync entrada-insumos não transacional | NEUTRO |
| 7 | S2 | Segurança | fazendas: SELECT público | QUEBRA se isolado |
| 8 | ~~C9-C10, C13~~ | Consistência | ~~Fuso horário não aplicado no PWA~~ (RESOLVIDO) | NEUTRO |
| 9 | N4 | Negócio | currentFazendaId global | NEUTRO |
| 10 | Log erro visível | Negócio | Erro de sync não visível + retries automáticos causam duplicatas | NEUTRO |
