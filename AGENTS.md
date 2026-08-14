# AGENTS.md — Caderneta Digital Gesta-Up

## Sistemas que compartilham o mesmo banco Supabase

- **PWA (este repo)**: `C:\Users\USER\Documents\Caderneta-Digital-Gesta-Up` — React PWA offline-first com sync IndexedDB
- **Painel Web (outro repo)**: `C:\Users\USER\Documents\GestaUp-Cadernetas-Gestao` — React + TanStack Query, online, gestão/admin

Projeto Supabase: `nrwljcvhwbezmoummxbl` ("Cadernetas Digitais")

## Fazenda de testes

`d649c65e-16ab-4b77-a84b-df937aa41cc3` ("Fazenda Gesta'Up") — usar sempre esta fazenda para testes que envolvam dados no Supabase. Não pertence a nenhum grupo (`grupo_id = null`), então funcionalidades que dependem de grupo (ex: Transferência entre fazendas) não são funcionais nela.

## Comandos

- Build PWA: `cd frontend && npm run build`
- Typecheck PWA: `cd frontend && npx tsc --noEmit`
- Dev PWA: `cd frontend && npm run dev`

## Notificações de morte exigem coordenadas (14/08/2026)

**Problema**: a trigger `trg_notify_morte_inserted` (função `notify_morte_inserted()`) criava notificação "Morte registrada" com ação "Ver no Mapa" para todo INSERT em `registros_morte`, mesmo quando `latitude` ou `longitude` eram NULL. O resultado: o usuário clicava em "Ver no Mapa" e o mapa abria sem ponto para centralizar (o `MapaFazenda.tsx` só centraliza quando `latitude != null && longitude != null`, linhas 137-142). 5 das 15 notificações existentes (33%) estavam nesse estado.

**Correção aplicada** (migration `20260814140000_notify_morte_apenas_com_coordenadas.sql`, repo Painel Web): a função `notify_morte_inserted()` agora retorna `NEW` imediatamente quando `NEW.latitude IS NULL OR NEW.longitude IS NULL`, sem criar notificação. O registro da morte continua sendo salvo normalmente; apenas a notificação é suprimida.

**Passivo limpo**: as 5 notificações órfãs pré-correção foram deletadas. Restam 10 notificações de morte, todas com coordenadas válidas.

**Teste** (fazenda `d649c65e-16ab-4b77-a84b-df937aa41cc3`): inserida morte sem coordenadas (0 notificações criadas) e morte com coordenadas (5 notificações criadas, uma por controller/admin). Dados de teste removidos e `quant_atual` restaurado.

**Disparador**: quando mencionar "notificação de morte", "Ver no Mapa sem coordenadas", ou trigger de notificação de morte, lembrar que agora exige coordenadas válidas.

## Débitos técnicos pendentes

### Tela de auditoria de erros de sync no Painel Web (rota /admin)

**Contexto**: a tabela `logs_sync_errors` no Supabase já é gravada pelo PWA (via `logSyncError` em syncService.ts) e agora também por triggers do banco (ver abaixo). Mas não existe nenhuma interface para ler essa tabela. Hoje só é acessível via SQL direto no Supabase Studio, o que impede auditoria operacional por alguém não-técnico.

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

### Validação de categoria em triggers de desconto de cabeças

**Problema**: os triggers `trigger_update_quant_atual_morte`, `trigger_update_quant_atual_maternidade` e `trigger_update_quant_atual_movimentacao` fazem `UPDATE lote_categorias SET quant_atual = ... WHERE lote_id = NEW.lote_id AND LOWER(categoria) = LOWER(NEW.categoria)`. Se a categoria do registro não existe em `lote_categorias`, o UPDATE afeta 0 linhas silenciosamente: o registro é salvo mas a cabeça não é descontada de nenhuma categoria, sem erro nem log.

**Caso real (Fazenda Guanabara, 03/08/2026)**: peão lançou morte no lote "Farmacia" (pasto Enfermaria) com categoria "Bezerro", mas o lote só tinha "Boi Magro" ativa em `lote_categorias`. O trigger executou mas não descontou. `quant_atual` de "Boi Magro" permaneceu 15 e `morte` permaneceu 0.

**Correção aplicada (morte)**: a função `update_quant_atual_morte()` agora verifica se a categoria existe em `lote_categorias` antes do UPDATE. Se não existe, insere um registro em `logs_sync_errors` com `error_code = 'CATEGORIA_NOT_IN_LOTE'`, `caderneta = 'morte'`, e o payload com lote_id, categoria, brinco, pasto, lote, nome_usuario. O INSERT do registro não é rejeitado (o peão já salvou), mas o erro fica auditável na tabela.

**Correção aplicada (movimentacao, 10/08/2026)**: a função `update_quant_atual_movimentacao()` agora verifica se a categoria existe em `lote_categorias` para o lote origem antes do UPDATE. Se não existe, insere um registro em `logs_sync_errors` com `error_code = 'CATEGORIA_NOT_IN_LOTE'`, `caderneta = 'movimentacao'`, e o payload com lote_origem_id, lote_destino_id, categoria, motivo_movimentacao, numero_cabecas, nome_usuario. O INSERT do registro não é rejeitado, mas o erro fica auditável. Migração: `add_categoria_not_in_lote_guard_movimentacao`. Validação: inserido registro de teste com categoria fantasma no lote "Lote 16", log criado corretamente, registro e log de teste removidos após validação. Encontrados 28 registros órfãos em produção (9 lotes, 8 categorias distintas) que dispararão o log em novos INSERTs mas não retroativamente.

**Pendente (maternidade)**: a função `update_quant_atual_maternidade()` precisa do mesmo tratamento. Tem o mesmo padrão de UPDATE condicional que pode afetar 0 linhas silenciosamente.

### Log de erro visível na lista de registros + eliminação de retries automáticos

**Contexto**: registros com `syncStatus === 'error'` mostram apenas `❌` e botão REENVIAR na lista, sem nenhuma informação sobre o erro. O erro é logado em `logs_sync_errors` no Supabase (via `logSyncError` em syncService.ts:636), mas se o log falha ao subir (offline, rede instável), o erro some sem rastro. Em produção, peões ficam sem saber por que o registro não sincronizou.

**Decisão aprovada (a implementar)**:

1. **Persistir erro localmente no IndexedDB** (frente 1, essencial): adicionar campo opcional `syncError` ao registro no IndexedDB com `{ code, message, details, retryCount, failedAt, operation }`. Gravar no catch de `processQueue` (syncService.ts:702-721) junto com `updateSyncStatus('error')`. Limpar `syncError` quando status muda para `synced`. Funciona offline, sobrevive a reload, não depende do Supabase. `logs_sync_errors` no Supabase continua sendo gravado para auditoria/Painel Web.

2. **Exibir erro no card da lista** (frente 2, UX): em `ListaRegistros.tsx`, quando `syncStatus === 'error'`, mostrar seção colapsável com mensagem amigável traduzida (tabela estática de ~10-15 códigos Postgres/Supabase: 42501=RLS, 23505=duplicata, 23502=not-null, network=sem conexão, etc.) e detalhes técnicos colapsáveis com botão "copiar" para enviar ao suporte.

3. **Eliminar retries automáticos**: no catch de `processQueue`, em vez de incrementar `retryCount` e recolocar na fila com backoff, remover o item da fila, marcar `syncStatus = 'error'`, gravar `syncError` local, e logar no Supabase. `calculateBackoffMs` e `MAX_RETRY_COUNT` deixam de ser usados. O reenvio manual (botão REENVIAR em ListaRegistros.tsx:836-846) continua funcionando como válvula de escape para falhas transitórias. Motivo: dois peões podem repetir a mesma operação em celulares diferentes; retries automáticos do que falhou causam duplicatas quando o outro peão já sincronizou.

**Débito não resolvido por essa mudança**: idempotência via `upsert` com `local_id` nas 21 tabelas de registros. Hoje o `registroToSupabase` não envia o `id` local como chave de idempotência; se o INSERT sucede no Supabase mas a resposta se perde (timeout, rede instável), o dispositivo não grava `supabaseId` e tenta criar de novo (duplicata). Eliminar retries encolhe a janela de risco mas não fecha o buraco. A correção estrutural exige adicionar coluna `local_id` (ou `idempotency_key`) nas tabelas + usar `upsert` com `onConflict`, migração coordenada com o Painel Web conforme matriz de impacto do AGENTS.md.

### Peão sem vínculo em `usuarios`/`usuario_fazenda` na criação de fazenda (Painel Web) — RESOLVIDO

**Contexto**: o PWA autentica como peão (tabela `peoes`, email `peao.<acesso_id>@gestaup.internal`), não como controller. A RLS de `lote_categorias` (e outras tabelas protegidas) verifica `usuarios.auth_id = auth.uid()` com `usuario_fazenda.ativo = true`. Se o peão não tem registro em `usuarios` nem em `usuario_fazenda`, a RLS bloqueia o SELECT e o `LoteDetalhesCard` exibe categorias, peso e cabeças zerados, mesmo com dados válidos no banco. A tabela `lotes` tem policy `qual: true` (qualquer autenticado lê tudo), por isso PASTO e LOTE aparecem no card, criando a falsa impressão de que o lote foi encontrado mas está vazio.

**Causa raiz**: `createFazendaWithController` em `GestaUp-Cadernetas-Gestao/src/services/fazendasService.ts:222-276` (commit `e22f766`, 03/05/2026) criava o peão em `auth.users` (via Edge Function `create-auth-user-only`) e em `peoes`, mas não inseria em `usuarios` nem em `usuario_fazenda`. O controller recebia ambos (Passos 2-3 via `signUp` + insert em `usuario_fazenda`), o peão não (Passo 4 incompleto).

**Fazendas afetadas (backfill aplicado em 06/08/2026)**: América, Brilhante, Doce Ilusão, Gesta'Up Teste, Grupo GTC, Agropecuária Marca, Maringá, Monte Azul, RLA, Santa Cecília, Transcal. O backfill inseriu 11 registros em `usuarios` (com `id = auth_id = <uuid do auth.users>`, `papel = 'controller'`, `ativo = true`) e 11 em `usuario_fazenda` (vínculo peão↔fazenda).

**Correção aplicada no Painel Web** (`fazendasService.ts`, commit `95d2e8c`, 06/08/2026): o Passo 4 agora, após criar o peão em `auth.users` (via Edge Function) e em `peoes`, usa `peaoResult.user.id` (UUID retornado pela Edge Function) para inserir em `usuarios` (`id = auth_id = <uuid>`, `email`, `nome = 'Peão <nome fazenda>'`, `papel = 'controller'`, `ativo = true`) e em `usuario_fazenda` (`usuario_id = <uuid>`, `fazenda_id`, `papel = 'controller'`, `ativo = true`). Novas fazendas criadas pelo admin já nascem com o peão totalmente vinculado. A Edge Function `create-auth-user-only` retorna o UUID no payload em `peaoResult.user.id`.

**Disparador**: quando criar uma nova fazenda no Painel Web, ou quando um peão reportar que cards de lote mostram dados zerados mas o lote existe no banco, verificar se o peão tem vínculo em `usuarios`/`usuario_fazenda`. Para fazendas criadas antes de 06/08/2026, o backfill já foi aplicado; para fazendas criadas depois, o fluxo de criação já insere os vínculos corretamente.

### Transferência de lote entre fazendas do mesmo grupo (10/08/2026)

**Funcionalidade**: o motivo `Saída` no PWA ganhou o subtipo `Transferência`, que permite mover parcial ou totalmente um lote para outra fazenda do mesmo `grupo_id`. Disponível apenas para fazendas com `grupo_id NOT NULL`.

**RPC no Supabase**: `transferir_lote_entre_fazendas(p_lote_origem_id, p_fazenda_destino_id, p_categorias jsonb, p_nome_usuario text)` em `SECURITY DEFINER`, atômica. Migrações: `add_transferir_lote_entre_fazendas_rpc`, `fix_transferir_lote_filter_peoes`, `fix_transferir_lote_n_cabecas_origem`.

**Regras implementadas**:
- **Total**: se todas as cabeças do lote origem são transferidas, o lote origem é inativado (`ativo=false`, `n_cabecas=0`, `lote_categorias.ativo=false`).
- **Parcial**: o lote origem permanece ativo, `quant_atual` das categorias transferidas é decrementado, `transf_saida` incrementado, `n_cabecas`/`numero_cabecas` atualizado para a soma real das categorias restantes.
- **Snapshot completo**: o lote destino é criado com todos os dados cadastrais da origem (peso, categoria, dados financeiros, raca, sexo, idade, etc.), exceto `pasto_id` e `modulo_id` (específicos da fazenda origem).
- **Sem plano nutricional**: `formulacao_id` é sempre NULL no lote destino, conforme spec.
- **Colisão de nome**: se o lote destino já existe na fazenda destino, o nome é sufixado com ` (1)`, ` (2)`, etc.
- **Notificações**: criadas para todos os controllers (`papel IN ('admin','controller')`, email não-`@gestaup.internal`) de ambas as fazendas. Mensagens distintas: "Lote recebido da fazenda X" (destino) e "Lote transferido para fazenda Y" (origem).

**PWA**: `MovimentacaoPage.tsx` carrega `fazendasDoGrupo` via `getFazendasDoMesmoGrupo(fazendaId)` no `supabaseService.ts`. Quando `subtipo='Transferência'`, mostra seletor de fazenda destino e chama `transferirLoteEntreFazendas()` (RPC) em vez de `salvarRegistro()`. A validação de cabeças por categoria reusa a mesma UI dos outros subtipos. O `SuccessModal` suprime o botão COMPARTILHAR para transferência (caderneta=undefined).

**Painel Web**: não requer mudanças. As notificações aparecem na rota `/controller/notificacoes` existente. O lote criado na fazenda destino aparece na listagem de lotes normalmente.

## Auditoria de código (julho/2026)

Foram identificadas 87 falhas em 4 frentes. As matrizes completas estão abaixo.

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
| C1-C6 (schema/sync) | Mudanças no syncService.ts do PWA ou adicionam colunas. Painel faz SELECT * e ignora extras |
| N1-N14 (lógica negócio) | Arquivos exclusivos do PWA (syncService, cadastroCache, leituraCochoMetrics, supplementMetrics, validation) |
| R1-R24 (bugs runtime) | Páginas/components exclusivos do PWA |
| C9-C10 (timezone) | Correção em formatDate.ts e supabaseService.ts do PWA |

### Ordem de aplicação recomendada

1. **Seguro (imediato)**: C1-C6, N8-N14, R1-R24, C9-C10
2. **Preparação (antes de RLS)**: verificar usuario_fazenda, lote_historico.fazenda_id, decidir política de controller, migrar senhas
3. **RLS (coordenado)**: S3, S1, S4, S7, S8 juntas — testar Painel após
4. **Senhas (por último)**: S5 após migrar ambos os sistemas

---

## Auditoria completa — Frente 1: Segurança/RLS

### Críticos

| ID | Tabela/Arquivo | Problema | Correção |
|---|---|---|---|
| S1 | fazendas | Policies Auth delete/insert/update com qual=true — qualquer usuário autenticado pode deletar/criar/alterar qualquer fazenda | Restringir DELETE/INSERT/UPDATE ao id IN (SELECT fazenda_id FROM usuario_fazenda WHERE usuario_id = auth.uid() AND papel = 'admin') |
| S2 | fazendas | Policy Enable public read access (role public) — qualquer pessoa na internet pode listar todas as fazendas | Remover policy public; manter apenas SELECT por usuario_fazenda |
| S3 | checklist_regras, funcionarios, formulacoes, frigorificos, insumos, itens_almoxarifado, locais, implementos, medicamentos, mineral, proteinado, racao, tratamentos, setores, maquinas_veiculos, currais, lotes, pastos, racas, fornecedores, causas_morte, bebedouros | Todas com policies qual=true (SELECT/INSERT/UPDATE/DELETE) — qualquer usuário autenticado acessa dados de todas as fazendas | Substituir por filtro fazenda_id IN (SELECT uf.fazenda_id FROM usuario_fazenda uf JOIN usuarios u ON u.id=uf.usuario_id WHERE u.auth_id=auth.uid() AND uf.ativo=true) |
| S4 | usuarios | Policies Allow authenticated insert/update com qual=true — qualquer usuário pode criar/alterar qualquer usuário | Restringir INSERT/UPDATE a id = auth.uid() ou role admin |
| S5 | peoes (coluna password) | Senhas dos peões em texto plano; usadas em authController.ts:42 para signInWithPassword | Remover coluna password; usar Supabase Auth nativo |

### Altos

| ID | Local | Problema | Correção |
|---|---|---|---|
| S6 | bebedouros, categorias, medicamentos, peoes, racas, setores, locais, pluviometros | Policies SELECT com role public — dados acessíveis sem login | Remover policies public; restringir a authenticated com filtro por fazenda |
| S7 | lote_historico | Policy Enable all operations for authenticated users com qual=true — ALL sem filtro de fazenda | Adicionar filtro por fazenda_id |
| S8 | execucoes_rotina, execucoes_rotina_historico | Policies com role public — qualquer pessoa pode inserir execuções | Mudar role para authenticated e adicionar filtro por fazenda |
| S9 | backend/src/app.ts | Nenhum middleware de autenticação no backend Express | Adicionar middleware verifyToken que valida JWT do Supabase |

### Médios

| ID | Local | Problema |
|---|---|---|
| S10 | frontend/.env.example:10 | Anon key commitada (aceitável, mas expõe URL) |
| S11 | backend/src/controllers/authController.ts:32 | ilike em campo que deveria ser UUID |

---

## Auditoria completa — Frente 2: Lógica de Negócio

### Críticos

| ID | Arquivo:Linha | Problema |
|---|---|---|
| N1 | syncService.ts:544-609 | Sem verificação de conflitos de versão em updates |
| N2 | syncService.ts:679-683 | Race condition: registro deletado entre leitura da fila e sync |
| N3 | syncService.ts:510-525 | Sync de entrada-insumos não é transacional |
| N4 | cadastroCache.ts:381-421 | currentFazendaId global — race condition em múltiplas abas |
| N5 | supabaseService.ts:148-181 | Funções de escrita não verificam permissões |

### Altos

| ID | Arquivo:Linha | Problema |
|---|---|---|
| N6 | syncService.ts:659-719 | processQueue sem ordenação por dependência |
| N7 | syncService.ts:616-622 | Backoff sem jitter — thundering herd |
| N8 | cadastroCache.ts:82-88 | Filtro de cache não verifica timestamp |
| N9 | cadastroCache.ts:175-177 | saveToCache perpetua dados desatualizados |
| N10 | leituraCochoMetrics.ts:103-114 | calcularCmsIntervalo: divisão por zero em diasIntervalo |
| N11 | leituraCochoMetrics.ts:228 | calcularPesoVivoMedio: divisão por quantTotal sem verificação |
| N12 | leituraCochoMetrics.ts:291 | calcularMediaMsKg: divisão por cabecas sem verificação |
| N13 | shareUtils.ts:111-143 | calcularPeriodoTrato: não verifica null em todosRegistros |
| N14 | supplementMetrics.ts:229,240,255-261 | Divisões por animaisElegiveis e pesoVivoMedio sem verificação |
| N15 | validation.ts:236-241 | validateSuplementacao: sem range máximo em kgCocho/kgDeposito |
| N16 | validation.ts:279 | validateMovimentacao: sem máximo em numeroCabecas |

### Médios

| ID | Arquivo:Linha | Problema |
|---|---|---|
| N17 | useFormValidation.ts:142-151 | Validação min/max não verifica se valor é número |
| N18 | useFormValidation.ts:159-166 | Validação custom sem try-catch |
| N19 | syncService.ts:62-453 | switch case sem default com warning |
| N20 | indexedDB.ts:34 | Versão do DB hardcoded (21) |
| N21 | cadastroCache.ts:15 | CACHE_EXPIRY_MS fixo 10 min |
| N22 | funcionarioAuthService.ts:28 | cadernetas_permitidas não valida valores |
| N23 | useFuncionarioAuth.ts:37-48 | funcionarioLogado sem validar propriedades obrigatórias |
| N24 | backend/src/controllers/authController.ts:32-34 | ilike em UUID |
| N25 | backend/src/app.ts:36-47 | CORS permite requests sem origin |

### Baixos

| ID | Arquivo:Linha | Problema |
|---|---|---|
| N26 | leituraCochoMetrics.ts:201-202 | Médias não arredondam resultados |
| N27 | shareUtils.ts:187-197 | Filtragem de zeros hardcoded por caderneta |
| N28 | validation.ts:11-23 | isValidDate impede datas futuras |
| N29 | store.ts:12 | Redux persist não inclui sync |
| N30 | supabaseService.ts:1311-1334 | Funções create/update não retornam registro completo em erro parcial |

---

## Auditoria completa — Frente 3: Bugs de Runtime

### Crítico

| ID | Arquivo:Linha | Problema | Correção |
|---|---|---|---|
| R1 | AlmoxarifadoPage.tsx:241-248 | useEffect com dependência faltante pode causar loop infinito | Adicionar itemEditando às dependências ou useCallback |

### Altos

| ID | Arquivo:Linha | Problema |
|---|---|---|
| R2 | CantinaPage.tsx:102-104 | form.quemAjudou.forEach sem null check |
| R3 | ClimaPage.tsx:69-71 | form.medicoes.forEach sem null check |
| R4 | EnfermariaPage.tsx:120 | useState(makeInitial) em vez de lazy initializer |
| R5 | EntradaInsumosPage.tsx:186-202 | setInterval sem cleanup em caso de erro |

### Médios

| ID | Arquivo:Linha | Problema |
|---|---|---|
| R6 | LimpezaPage.tsx:99-107 | form.limpezaRealizada.forEach sem null check |
| R7 | ManutencaoMaquinasPage.tsx:116-118 | p.checklist[campo] sem optional chaining |
| R8 | MaternidadePage.tsx:162 | useState(makeInitial) |
| R9 | MortePage.tsx:162 | useState(makeInitial) |
| R10 | MovimentacaoPage.tsx:104 | useState(makeInitial) |
| R11 | OperacoesMaquinasPage.tsx:125-127 | split de string sem verificação |
| R12 | PastagensPage.tsx:195-197 | useEffect com dependência não memoizada |
| R13 | ProblemasPage.tsx:91 | useState(makeInitial) |
| R14 | RodeioPage.tsx:162-164 | useEffect com dependência não memoizada |
| R15 | SaidaInsumosPage.tsx:130 | suplementacaoData!.insumos com assertion |
| R16 | SaidaInsumosPage.tsx:127 | result.id sem verificação |
| R17 | SuplementacaoPage.tsx:167-169 | useEffect com dependência não memoizada |

### Baixos

| ID | Arquivo:Linha | Problema |
|---|---|---|
| R18 | AbastecimentoPage.tsx:199 | setSalvando(false) não executado em erro |
| R19 | BebedourosPage.tsx:183-192 | Event listener sem verificação de unsubscribe |
| R20 | EnfermariaPage.tsx:244-259 | Erro silenciado sem feedback ao usuário |
| R21 | LeituraCochoPage.tsx:193-198 | Erro silenciado |
| R22 | MovimentacaoPage.tsx:190-201 | Event listener sem verificação |
| R23 | PastagensPage.tsx:202-212 | Event listener sem verificação |
| R24 | RodeioPage.tsx:202-212 | Event listener sem verificação |

---

## Auditoria completa — Frente 4: Consistência

### Críticos

| ID | Arquivo:Linha | Problema |
|---|---|---|
| C1 | syncService.ts:76-97 | 12 campos enviados para registros_maternidade não existem no schema |
| C2 | syncService.ts:103-157 | 14 campos enviados para registros_pastagens não existem no schema |
| C3 | syncService.ts:162-179 | Campo diagnosticos (objeto) enviado para registros_rodeio não existe no schema |
| C4 | syncService.ts:170,178 | Campos boi (schema tem boi_gordo) e escore_gado (schema tem escore_gado_ideal) com nomes errados |
| C5 | syncService.ts:218-227 | Campos gado e categoria existem no schema de bebedouros mas não são enviados |
| C6 | syncService.ts:437-450 | Caderneta leitura-cocho envia para tabela registros_leitura_cocho que não existe no schema |

### Altos

| ID | Arquivo:Linha | Problema |
|---|---|---|
| C7 | syncService.ts:233-238 | lote_origem, destino, peso_vivo_atual_kg com nomes errados em movimentação |
| C8 | syncService.ts:85 | tipo_parto enviado como array mas schema é TEXT |
| C9 | formatDate.ts:1-7 | todayBR() não aplica timezone America/Cuiaba |
| C10 | supabaseService.ts (14 funções) | Funções delete* usam toISOString() sem timezone da fazenda |

### Médios

| ID | Arquivo:Linha | Problema |
|---|---|---|
| C11 | syncService.ts:124-153 | avaliacao_geral objeto sem estrutura no schema |
| C12 | syncService.ts:156 | equipe_nomes enviado como JSON.stringify sem campo no schema |
| C13 | api.ts:28-30 | Data inicial não usa timezone |
| C14 | schema.sql:332-334 | Índices com typo: supplementacao → suplementacao |

---

## Top 10 prioridades

| # | ID | Frente | Problema | Impacto no Painel |
|---|---|---|---|---|
| 1 | S3 | Segurança | 22+ tabelas com RLS qual=true | QUEBRA se isolado |
| 2 | S5 | Segurança | Senhas peões em texto plano | QUEBRA se isolado |
| 3 | S1 | Segurança | fazendas: DELETE/INSERT/UPDATE por qualquer usuário | QUEBRA se isolado |
| 4 | C1-C6 | Consistência | syncService envia campos inexistentes no schema | NEUTRO |
| 5 | N1 | Negócio | Sem conflito de versão no sync | NEUTRO |
| 6 | N3 | Negócio | Sync entrada-insumos não transacional | NEUTRO |
| 7 | S2 | Segurança | fazendas: SELECT público | QUEBRA se isolado |
| 8 | N10-N14 | Negócio | Divisões por zero em métricas | NEUTRO |
| 9 | C9-C10 | Consistência | Fuso horário não aplicado | NEUTRO |
| 10 | N4 | Negócio | currentFazendaId global | NEUTRO |


## Mapas KML, georreferenciamento e GPS offline � adicionado em 2026-08-12

Arquitetura aprovada para o MVP de mapas no PWA: baixar mapa da fazenda do usu�rio, fundo de sat�lite online (ESRI World Imagery), projetar posi��o do usu�rio via GPS, projetar pastos como pol�gonos, selecionar pasto-alvo e ver dist�ncia. Funcionalidade core (pol�gonos, GPS, dist�ncia) funciona offline; sat�lite exige conex�o com fallback gracioso.

Documento completo (decis�es de arquitetura, modelo de dados, stack): GestaUp-Cadernetas-Gestao/docs/ARQUITETURA_MAPA_KML.md.

**Resumo para o PWA:**

1. **Biblioteca de mapa**: MapLibre GL JS + is.gl/react-map-gl. Mesma lib do Painel Web, consist�ncia.

2. **GPS**: @capacitor/geolocation para watchPosition (nativo, mais preciso que Web Geolocation API). Plugin Capacitor 8 a adicionar.

3. **Dist�ncia at� pasto-alvo**: 	urf.js (	urf.distance para centroide, 	urf.pointToPolygonDistance para borda), rodando no celular sem rede.

4. **Offline**: GeoJSON dos pastos/bebedouros/estradas cacheado no IndexedDB via cadastroCache.ts (mesmo padr�o existente). Query SELECT id, nome, ST_AsGeoJSON(geometria) as geometria FROM pastos WHERE fazenda_id =  AND geometria IS NOT NULL. Payload pequeno (200-500KB para 100 pastos). Sem multi-tenancy: pe�o loga com cesso_id da fazenda dele, baixa s� os dados dela.

5. **Sat�lite**: ESRI World Imagery online (gratuito). Fallback gracioso offline: quando o MapLibre n�o carrega tiles, mostra fundo verde acinzentado com aviso discreto. Pol�gonos, GPS e dist�ncia continuam funcionando. Sat�lite offline via PMTiles fica para o futuro (fonte a definir: ortomosaicos pr�prios do setor de projetos ideal, Mapbox pago como fallback).

6. **Tela nova**: "Mapa da Fazenda" no PWA, mostra pol�gonos + sat�lite (se online) + posi��o GPS + lista de pastos para selecionar como alvo + dist�ncia destacada.

7. **Fora do MVP (futuro aditivo, sem reescrita)**: sat�lite offline via PMTiles, routing pelas estradas (
graph.path ou 	urf.shortestPath), edi��o de geometrias no PWA (s� no Painel Web no MVP).

**Pontos de aten��o para a implementa��o no PWA:**
- Separar camadas no MapLibre: source de sat�lite separado dos sources de GeoJSON, para trocar online por PMTiles offline sem refactor.
- Incrementar vers�o do cadastroCache para for�ar refresh quando o schema do Painel Web mudar (coluna geometria adicionada a pastos/ebedouros).
- @capacitor/geolocation precisa de permiss�o de localiza��o no AndroidManifest.xml e Info.plist.

Disparador: quando mencionar "mapa KML", "georreferenciamento", "pastos no mapa", "GPS no PWA", "MapLibre", "PostGIS", "geometria de pasto", "dist�ncia at� pasto", ou retomar a implementa��o de mapas, ler esta se��o e o GestaUp-Cadernetas-Gestao/docs/ARQUITETURA_MAPA_KML.md.