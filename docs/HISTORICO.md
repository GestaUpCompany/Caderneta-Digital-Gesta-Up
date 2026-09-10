# Histórico de alterações (RESOLVIDO/IMPLEMENTADO)

Este arquivo registra mudanças já aplicadas no sistema. Um chat novo não precisa ler isto por padrão; consulte quando a pergunta for sobre "por que isso foi feito assim" ou para entender o estado anterior de uma parte do código.

## Notificações de morte exigem coordenadas (14/08/2026)

**Problema**: a trigger `trg_notify_morte_inserted` (função `notify_morte_inserted()`) criava notificação "Morte registrada" com ação "Ver no Mapa" para todo INSERT em `registros_morte`, mesmo quando `latitude` ou `longitude` eram NULL. O resultado: o usuário clicava em "Ver no Mapa" e o mapa abria sem ponto para centralizar (o `MapaFazenda.tsx` só centraliza quando `latitude != null && longitude != null`, linhas 137-142). 5 das 15 notificações existentes (33%) estavam nesse estado.

**Correção aplicada** (migration `20260814140000_notify_morte_apenas_com_coordenadas.sql`, repo Painel Web): a função `notify_morte_inserted()` agora retorna `NEW` imediatamente quando `NEW.latitude IS NULL OR NEW.longitude IS NULL`, sem criar notificação. O registro da morte continua sendo salvo normalmente; apenas a notificação é suprimida.

**Passivo limpo**: as 5 notificações órfãs pré-correção foram deletadas. Restam 10 notificações de morte, todas com coordenadas válidas.

**Teste** (fazenda `d649c65e-16ab-4b77-a84b-df937aa41cc3`): inserida morte sem coordenadas (0 notificações criadas) e morte com coordenadas (5 notificações criadas, uma por controller/admin). Dados de teste removidos e `quant_atual` restaurado.

**Disparador**: quando mencionar "notificação de morte", "Ver no Mapa sem coordenadas", ou trigger de notificação de morte, lembrar que agora exige coordenadas válidas.

## Sync de insumos da Fábrica Confinamento (RESOLVIDO 04/09/2026)

**Problema**: os insumos de `fabrica-confinamento-insumos` não sincronizavam para o Supabase. O `registro_id` no IndexedDB apontava para o ID local (formato `xxxxxxxx-timestamp`, não-UUID), enquanto o Supabase gerava um UUID próprio para o registro master em `registros_fabrica_confinamento`. A FK `registro_id` violada causava erro silencioso e os insumos ficavam presos na sync queue com retry infinito.

**Causa raiz**: o case `registros_fabrica_confinamento` em `syncToSupabase` usava `.upsert(data)` sem `.select()`, não capturando o UUID retornado pelo Supabase. O case `registros_fabrica_confinamento_insumos` enviava `id: registro.id` (não-UUID) no payload, que o Supabase rejeitava.

**Correção aplicada** (`syncService.ts`):
1. Master: trocado `upsert` por `.insert(data).select().single()`, capturando o UUID retornado. Após insert, atualiza o registro local com `supabaseId` e atualiza todos os insumos filhos trocando `registroId` local pelo UUID do Supabase (mesmo padrão já usado em `entrada-insumos`, linhas 684-701).
2. Insumos: removido `id: registro.id` do payload em `registroToSupabase` (Supabase gera o UUID). Trocado `upsert` por `insert` no sync.
3. `validateFabricaConfinamento`: adicionado `isValidDateWithTime` que aceita `DD/MM/AAAA HH:mm` (o `salvarRegistro` concatena a hora antes de validar).
4. `handleSalvar` em `FabricaConfinamentoPage.tsx`: removida duplicação de hora (passa `data` sem hora para o master; a concatenação para os insumos é feita separadamente).
5. `concluido`: adicionada tolerância de 0,5 kg na comparação `totalProduzidoNum >= totalPrevisto - jaProduzidoNoTrato` para evitar false por diferença de arredondamento.

**Validação** (fazenda `d649c65e-16ab-4b77-a84b-df937aa41cc3`): produzido trato 1 de Terminação Boi (825,1 kg), master sincronizou com `concluido = true`, 3 insumos sincronizaram com `registro_id` apontando para o UUID do master, sync queue vazia.

**Débito não resolvido por essa mudança**: idempotência via `local_id` nas 21 tabelas de registros continua pendente (ver `docs/BACKLOG.md`).

## Peão sem vínculo em `usuarios`/`usuario_fazenda` na criação de fazenda (Painel Web) — RESOLVIDO

**Contexto**: o PWA autentica como peão (tabela `peoes`, email `peao.<acesso_id>@gestaup.internal`), não como controller. A RLS de `lote_categorias` (e outras tabelas protegidas) verifica `usuarios.auth_id = auth.uid()` com `usuario_fazenda.ativo = true`. Se o peão não tem registro em `usuarios` nem em `usuario_fazenda`, a RLS bloqueia o SELECT e o `LoteDetalhesCard` exibe categorias, peso e cabeças zerados, mesmo com dados válidos no banco. A tabela `lotes` tem policy `qual: true` (qualquer autenticado lê tudo), por isso PASTO e LOTE aparecem no card, criando a falsa impressão de que o lote foi encontrado mas está vazio.

**Causa raiz**: `createFazendaWithController` em `GestaUp-Cadernetas-Gestao/src/services/fazendasService.ts:222-276` (commit `e22f766`, 03/05/2026) criava o peão em `auth.users` (via Edge Function `create-auth-user-only`) e em `peoes`, mas não inseria em `usuarios` nem em `usuario_fazenda`. O controller recebia ambos (Passos 2-3 via `signUp` + insert em `usuario_fazenda`), o peão não (Passo 4 incompleto).

**Fazendas afetadas (backfill aplicado em 06/08/2026)**: América, Brilhante, Doce Ilusão, Gesta'Up Teste, Grupo GTC, Agropecuária Marca, Maringá, Monte Azul, RLA, Santa Cecília, Transcal. O backfill inseriu 11 registros em `usuarios` (com `id = auth_id = <uuid do auth.users>`, `papel = 'controller'`, `ativo = true`) e 11 em `usuario_fazenda` (vínculo peão↔fazenda).

**Correção aplicada no Painel Web** (`fazendasService.ts`, commit `95d2e8c`, 06/08/2026): o Passo 4 agora, após criar o peão em `auth.users` (via Edge Function) e em `peoes`, usa `peaoResult.user.id` (UUID retornado pela Edge Function) para inserir em `usuarios` (`id = auth_id = <uuid>`, `email`, `nome = 'Peão <nome fazenda>'`, `papel = 'controller'`, `ativo = true`) e em `usuario_fazenda` (`usuario_id = <uuid>`, `fazenda_id`, `papel = 'controller'`, `ativo = true`). Novas fazendas criadas pelo admin já nascem com o peão totalmente vinculado. A Edge Function `create-auth-user-only` retorna o UUID no payload em `peaoResult.user.id`.

**Disparador**: quando criar uma nova fazenda no Painel Web, ou quando um peão reportar que cards de lote mostram dados zerados mas o lote existe no banco, verificar se o peão tem vínculo em `usuarios`/`usuario_fazenda`. Para fazendas criadas antes de 06/08/2026, o backfill já foi aplicado; para fazendas criadas depois, o fluxo de criação já insere os vínculos corretamente.

## Transferência de lote entre fazendas do mesmo grupo (10/08/2026)

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

## Time tracking de atividades com sessões e imprevistos (19/08/2026)

**Funcionalidade**: o peão pode iniciar, pausar, retomar e concluir atividades com cronômetro real medindo tempo produtivo vs bruto. Pausas podem ser marcadas como não-trabalhadas (ex: almoço) e descontadas do tempo produtivo. Imprevistos categorizados (Chuva/Tempo, Gado escapou, Cerca/instalação, etc.) podem ser registrados durante a execução.

**Princípio**: time tracking por **sessões** (uma linha por par Iniciar/Pausar em `atividade_sessoes`), não cronômetro único. O `tempo_gasto_segundos` em `atividade_funcionarios` deixa de ser campo editável e passa a ser **soma calculada** das sessões trabalhadas, mantida por trigger `trg_recalc_tempo_gasto_af`.

**Schema (migration `20260819140000_atividade_sessoes_imprevistos.sql`, repo Painel Web)**:
- `atividade_sessoes`: `id`, `atividade_funcionario_id` (FK CASCADE), `inicio_at`, `fim_at` (null=aberta), `duracao_segundos`, `trabalhada` (bool, false=almoço), `motivo_pausa`, `created_at`.
- `atividade_imprevistos`: `id`, `atividade_funcionario_id` (FK CASCADE), `tipo` (categoria), `descricao`, `ocorrido_at`, `impacto_minutos`, `created_at`.
- `atividade_imprevisto_categorias`: `id`, `fazenda_id` (FK CASCADE), `nome`, `ativo`, UNIQUE `(fazenda_id, nome)`. Seed de 6 categorias para todas as fazendas + trigger `trg_seed_imprevisto_categorias` para novas.
- `atividade_funcionarios.status_individual`: domínio passa a incluir `pausada` e `cancelada` (sem constraint nova, é text).
- Trigger `trg_recalc_tempo_gasto_af` AFTER INSERT/UPDATE/DELETE ON `atividade_sessoes`: recalcula `atividade_funcionarios.tempo_gasto_segundos = SUM(duracao_segundos) WHERE trabalhada=true`.
- RPCs: `get_sessoes_abertas_by_fazenda(fazenda_id)` e `get_imprevistos_recentes_by_fazenda(fazenda_id, data_inicio)` para o Painel Web.
- RLS permissiva (igual `atividade_funcionarios`), exceto `atividade_imprevisto_categorias` select com `user_has_fazenda_access`.

**PWA** (`AtividadesPage.tsx` + `atividadesService.ts`):
- Card mostra cronômetro ao vivo quando `em_andamento` com sessão aberta (`setInterval` 1s, funciona offline via `inicio_at` local).
- Botões contextuais por estado: **Iniciar** (pendente→em_andamento, cria sessão aberta), **Pausar** (em_andamento→pausada, fecha sessão com `trabalhada=true`), **Almoço** (em_andamento→pausada, fecha sessão com `trabalhada=false`, motivo="Almoço"), **Retomar** (pausada→em_andamento, nova sessão), **Imprevisto** (modal com categoria + descrição + impacto), **Concluir** (fecha sessão aberta + modal de detalhamento + soma tempo).
- Cada peão controla seu próprio cronômetro independentemente (decisão: independente por peão, não coletivo).
- Sessões e imprevistos são enfileirados no IndexedDB via `enqueueRegistro` nos stores `atividade-sessoes` e `atividade-imprevistos`, sincronizados como as outras cadernetas.
- `iniciarAtividadeLocal`, `pausarAtividadeLocal`, `retomarAtividadeLocal`, `concluirAtividadeLocal`, `registrarImprevistoLocal` em `atividadesService.ts`. `marcarEmAndamentoLocal`/`marcarConcluidaLocal` mantidos como wrappers deprecated.
- `calcularTempoLocal(afId)` retorna `{ produtivoSeg, brutoSeg, temSessaoAberta, inicioSessaoAberta, sessaoAbertaId }` para a UI.
- `getImprevistoCategorias(fazendaId)` busca do Supabase com cache IndexedDB.
- Filtro "Pausadas" adicionado à lista de atividades.
- Card concluído expansível mostra todas as sessões (com tipo trabalhada/não e motivo) e imprevistos.
- `formatarTempo(segundos)` em `atividadesService.ts` (formato "1h30min", "45min", "30s").

**Painel Web** (`MonitoramentoAtividades.tsx` + `atividadesService.ts`):
- Seção **"Trabalhando agora"** no topo: sessões abertas em tempo real via `getSessoesAbertasByFazenda`, mostrando funcionário, atividade e tempo decorrido. Click abre o detalhe da atividade.
- Seção **"Imprevistos recentes"** (últimos 7 dias) via `getImprevistosRecentesByFazenda`: tabela com quando, tipo, atividade, funcionário, descrição, impacto.
- Modal de detalhe enriquecido: por funcionário, mostra tempo produtivo, badge "gravando" se sessão aberta, lista de sessões (com tipo e motivo) e lista de imprevistos.
- Subscrição Realtime em `atividade_sessoes` e `atividade_imprevistos` atualiza as seções ao vivo.
- `iniciarAtividade` (atalho coletivo do controller) agora cria sessão aberta para cada `atividade_funcionario` pendente, além de marcar `em_andamento`.
- CRUD de categorias de imprevisto em `atividadesService.ts` (`getImprevistoCategorias`, `createImprevistoCategoria`, `updateImprevistoCategoria`, `deleteImprevistoCategoria`).

**Sessões abertas órfãs**: se o peão fecha o app sem pausar/concluir, no próximo `loadAtividades` o card mostra "gravando" com o tempo decorrido desde `inicio_at`. O peão pode "Retomar" (na verdade continua) ou "Pausar agora". O app não fecha sessões automaticamente para não inventar tempo.

**Disparador**: quando mencionar "cronômetro de atividade", "tempo gasto em atividade", "sessões de atividade", "pausar atividade", "imprevisto em atividade", ou "tempo produtivo vs bruto", lembrar que o modelo é por sessões com flag `trabalhada`, e que `tempo_gasto_segundos` é calculado por trigger.

## Mapas KML, georreferenciamento e GPS offline (12/08/2026)

Arquitetura aprovada para o MVP de mapas no PWA: baixar mapa da fazenda do usuário, fundo de satélite online (ESRI World Imagery), projetar posição do usuário via GPS, projetar pastos como polígonos, selecionar pasto-alvo e ver distância. Funcionalidade core (polígonos, GPS, distância) funciona offline; satélite exige conexão com fallback gracioso.

Documento completo (decisões de arquitetura, modelo de dados, stack): `GestaUp-Cadernetas-Gestao/docs/ARQUITETURA_MAPA_KML.md`.

**Resumo para o PWA:**

1. **Biblioteca de mapa**: MapLibre GL JS + `vis.gl/react-map-gl`. Mesma lib do Painel Web, consistência.

2. **GPS**: `@capacitor/geolocation` para watchPosition (nativo, mais preciso que Web Geolocation API). Plugin Capacitor 8 a adicionar.

3. **Distância até pasto-alvo**: `turf.js` (`turf.distance` para centroide, `turf.pointToPolygonDistance` para borda), rodando no celular sem rede.

4. **Offline**: GeoJSON dos pastos/bebedouros/estradas cacheado no IndexedDB via `cadastroCache.ts` (mesmo padrão existente). Query `SELECT id, nome, ST_AsGeoJSON(geometria) as geometria FROM pastos WHERE fazenda_id = <id> AND geometria IS NOT NULL`. Payload pequeno (200-500KB para 100 pastos). Sem multi-tenancy: peão loga com `acesso_id` da fazenda dele, baixa só os dados dela.

5. **Satélite**: ESRI World Imagery online (gratuito). Fallback gracioso offline: quando o MapLibre não carrega tiles, mostra fundo verde acinzentado com aviso discreto. Polígonos, GPS e distância continuam funcionando. Satélite offline via PMTiles fica para o futuro (fonte a definir: ortomosaicos próprios do setor de projetos ideal, Mapbox pago como fallback).

6. **Tela nova**: "Mapa da Fazenda" no PWA, mostra polígonos + satélite (se online) + posição GPS + lista de pastos para selecionar como alvo + distância destacada.

7. **Fora do MVP (futuro aditivo, sem reescrita)**: satélite offline via PMTiles, routing pelas estradas (`graph.path` ou `turf.shortestPath`), edição de geometrias no PWA (só no Painel Web no MVP).

**Pontos de atenção para a implementação no PWA:**
- Separar camadas no MapLibre: source de satélite separado dos sources de GeoJSON, para trocar online por PMTiles offline sem refactor.
- Incrementar versão do cadastroCache para forçar refresh quando o schema do Painel Web mudar (coluna geometria adicionada a pastos/bebedouros).
- `@capacitor/geolocation` precisa de permissão de localização no AndroidManifest.xml e Info.plist.

**Disparador**: quando mencionar "mapa KML", "georreferenciamento", "pastos no mapa", "GPS no PWA", "MapLibre", "PostGIS", "geometria de pasto", "distância até pasto", ou retomar a implementação de mapas, ler esta seção e o `GestaUp-Cadernetas-Gestao/docs/ARQUITETURA_MAPA_KML.md`.

## Mãe adotiva para guacho (28/08/2026)

**Funcionalidade**: o checkbox GUACHO em MaternidadePage agora identifica o bezerro abandonado pela mãe biológica e adotado por outra vaca. A mãe adotiva é selecionada via AnimalIdentifier, com criação de indivíduo quando não existe na base (mesmo padrão da biológica: categoria Vaca Parida, classificação de matriz selecionável, raça auto-preenchida da raça da cria correspondente).

**Schema (migration `add_mae_adotiva.sql`, aplicada via MCP)**:
- `individuos.mae_adotiva_id` (UUID, FK self-reference `individuos_mae_adotiva_id_fkey`, ON DELETE SET NULL). A biológica continua em `mae`.
- `registros_maternidade`: 6 colunas novas (`individuo_id_mae_adotiva`, `id_manejo_mae_adotiva`, `id_brinco_mae_adotiva`, `id_chip_mae_adotiva`, `categoria_mae_adotiva`, `raca_mae_adotiva`).
- Índice `idx_individuos_mae_adotiva` para consultas de adoções.

**PWA (MaternidadePage.tsx)**:
- Checkbox GUACHO da 1ª cria revela AnimalIdentifier + bloco de nova mãe adotiva (raça, classificação de matriz).
- Mesmo para 2ª cria quando gêmeos.
- Raça da adotiva é auto-preenchida com a raça da cria correspondente ao marcar o checkbox.
- `criarIndividuoCria` recebe `maeAdotivaId` e grava em `individuos.mae_adotiva_id`.
- `salvarRegistro` envia os 6 campos de adotiva no payload.
- `syncService` mapeia para `individuo_id_mae_adotiva`, `id_manejo_mae_adotiva`, etc.
- Validação: quando guacho, pelo menos um ID da adotiva é obrigatório; raça e classificação de matriz são obrigatórias se a adotiva for nova.
- A observação 'Guacho' continua sendo adicionada para compatibilidade com listagens/PDFs legados.

**Painel Web**: a RPC `get_relatorio_lote_ciclo_vida` precisa ser atualizada para incluir `id_brinco_mae_adotiva` no resultado da seção de reprodução. O tipo TS `ReproducaoLote.linhas` já tem o campo opcional.

**Disparador**: quando mencionar guacho, mãe adotiva, bezerro abandonado, adoção de bezerro, ou `mae_adotiva_id`, lembrar que o sistema agora vincula estruturalmente a mãe adotiva via FK em `individuos`.
