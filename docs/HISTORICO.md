# Histórico de alterações (RESOLVIDO/IMPLEMENTADO)

Este arquivo registra mudanças já aplicadas no sistema. Um chat novo não precisa ler isto por padrão; consulte quando a pergunta for sobre "por que isso foi feito assim" ou para entender o estado anterior de uma parte do código.

## Auditoria do módulo comercial — lado PWA (28/09/2026)

Correções do PWA vindas da auditoria do módulo comercial (detalhes de banco e painel no HISTORICO do repo de gestão, migration `20260928100000`):

- **Embarque duplicado**: ao finalizar a pesagem de novo (edição na revisão ou retry após falha), as saídas eram recriadas com o mesmo `sessao_id`, que o servidor aceita, dobrando o débito no lote. Agora a sessão guarda `movimentacoesSalvas` por chave `lote|categoria`: saída existente é atualizada e reenfileirada via upsert por `local_id`, e saída de grupo removido na revisão é descartada localmente.
- **OS estornada travada**: a guarda local de embarque único bloqueava a OS para sempre após o primeiro embarque, inclusive quando o painel estornava e devolvia a OS a `aberta`. O bloqueio agora compara `updated_at` da OS com o último registro local; registro pendente de sync sempre bloqueia.
- **Menu de transferência offline**: `getFazendasDoMesmoGrupoCached` não tinha fallback do IndexedDB nem timeout — abrir o app offline escondia a caderneta e deixava o select de destino vazio. Agora usa `getCachedQueryFromIDB` + `withTimeout` de 3s.
- **Laudo com categoria repetida**: duas linhas com a mesma categoria no recebimento colidiam no `local_id` sintético da conferência e travavam a carga. As contagens agora são agregadas por categoria (case-insensitive) antes de salvar.
- **Sync**: `fazenda_destino_id` só é enviado quando `tipo='transferencia'` (CHECK novo no banco), `observacao` do laudo passa a ser persistida (coluna nova), e o select de OS abertas inclui `updated_at`.
- **Validação**: `validateOrdensServico` rejeitava mal — tipo desconhecido passava com `isValid: errors.length === 0`. Agora retorna inválido explicitamente.
- **`types/supabase.ts` regenerado**: fecha o drift acumulado com o schema real.

**Disparador**: quando mencionar débito dobrado no embarque, `movimentacoesSalvas`, OS estornada que não aceita pesagem, menu de transferência sumindo offline, ou observação do laudo perdida, ler esta seção.

## Módulo de transferência entre fazendas do grupo (27/09/2026)

Terceiro comunicado do grupo **Comercial** (`comunicado-transferencia`), completando o módulo com venda e compra. Transferência é sempre entre fazendas do mesmo `grupo_id`: a OS tem `fazenda_id` = origem e `fazenda_destino_id` = destino (validados no banco, ver HISTORICO do painel). O comunicado (`ComunicadoTransferenciaPage`) tem solicitante, fazenda destino (select de `getFazendasDoMesmoGrupo`), quantidade, sexo, era, embarque, chegada prevista e observação. O menu só exibe a caderneta quando a fazenda tem `acessoComercial` e ao menos uma outra fazenda ativa no grupo (`modulosMenuGroups`/`ProgramacaoHojePage` checam `getFazendasDoMesmoGrupo`).

Fluxo: comunicado → OS `aberta` → a Pesagem passa a listar OS de transferência da fazenda como origem (select mostra "TRA-...· Transferência → <destino>"), trava o manejo e gera `Saída/Transferência` com `fazenda_destino_id`, marcando indivíduos como `Transferido` → a caderneta Recebimento lista OS de transferência com `fazenda_destino_id` = fazenda atual e status `embarcada`/`recebida` (`getOrdensServicoTransferenciaEntrada`), reusa o laudo por carga da compra, mas `buildMovimentacaoRecebimento` retorna `[]` para transferência: **a entrada só vira movimentação quando o controller confere a carga no painel** (`conferir_recebimento_transferencia`), então não há crédito de estoque antes da conferência. Tipos de manejo `transf_saida`/`transf_entrada` continuam disponíveis para fluxo manual sem OS.

E2E validado entre Fazenda Gesta'Up (origem) e Gesta'Up Teste (destino): `TRA-2026-00001`, 3 embarcadas, laudo com 2 recebidas + 1 morte, conferência no painel creditou L1, OS `fechada` sem acerto. Saldos conferidos nos dois lados (origem −3, destino +2).

**Disparador**: quando mencionar comunicado de transferência, `comunicado-transferencia`, `fazenda_destino_id`, `transf_saida`/`transf_entrada`, `getOrdensServicoTransferenciaEntrada`, ou recebimento de transferência, ler esta seção.

## Comunicados de compra e venda simplificados (27/09/2026)

Os comunicados viraram mensagens curtas para a equipe de gado (só o essencial para se preparar), seguindo o modelo fornecido pelo usuário. As três telas do módulo (`comunicado-venda`, `comunicado-compra`, `recebimento-compra`) formam o grupo **Comercial** no menu de cadernetas e ficam atrás do feature flag `fazendas.acesso_comercial` (mesmo padrão de `acesso_confinamento`: coluna no banco, carregada no login/`atualizarControleAcesso` para `config.acessoComercial`, filtro em `ModulosMenuPage` e `ProgramacaoHojePage`). Hoje só a fazenda de testes tem o flag; os date pickers de embarque/chegada/abate/pagamento usam a variante `compact` do `DatePicker` em grid de 2 colunas.

- **Compra** (`ComunicadoCompraPage`): de ~30 campos para 8 obrigatórios + observação: COMPRADOR (quem negociou pela fazenda, novo uso da coluna `comprador`), EMPRESA (quem vendeu, coluna `fornecedor`), QUANTIDADE, SEXO, ERA, DATA DE EMBARQUE (coluna `data_saida`) e DATA DE CHEGADA NA FAZENDA (coluna `data_prevista_embarque`, que a compra já reutilizava). Cortados do formulário: origem/localização/município, categoria, raça, jejum, tipo de pesagem, todo o bloco de preço (modo, valor/kg, valor/UA, total previsto), pagamento/favorecido, transporte (já coletado por carga no recebimento), corretagem, histórico nutricional e despesas. `compra_detalhes` deixa de ser preenchido; as colunas permanecem no schema e OS antigas seguem íntegras.
- **Venda** (`ComunicadoVendaPage`): já estava próxima do modelo; o label COMPRADOR virou EMPRESA.
- **`validation.ts`**: a compra exige só comprador, empresa, quantidade, sexo, era, embarque e chegada; caíram as exigências de fazenda de origem e modo de preço.
- **`shareUtils.ts`**: corpos do WhatsApp refeitos no formato do modelo (COMPRADOR/EMPRESA/ANIMAIS/SEXO/ERA/EMBARQUE/CHEGADA na compra; VENDEDOR/EMPRESA/ANIMAIS/SEXO/ERA/EMBARQUE/ABATE/PREÇO/PAGAMENTO/CORRETORA na venda, com "CORRETORA: Direto" quando a venda é direta).
- **Display config `ordensServico.ts`** e `labelConfig.ts`: fornecedor rotulado EMPRESA, dataSaida rotulada EMBARQUE, comprador exibido também para compra, e os campos legados (origem, modo de preço, valor total, forma de pagamento, frete) só aparecem quando preenchidos, preservando registros antigos.

**Disparador**: quando mencionar comunicado simplificado, campos removidos da compra, EMPRESA no lugar de fornecedor, ou o corpo do WhatsApp dos comunicados, ler esta seção.

## Módulo de Compra: comunicado + recebimento por carga + processamento (27/09/2026)

Segunda operação comercial sobre a arquitetura de OS da venda. O comunicado de compra (`ComunicadoCompraPage`, store `ordens-servico` com `tipo='compra'`) espelha o laudo de compra: origem, animais, preço por KG ou por UA, pagamento/favorecido, transporte, corretagem, histórico nutricional e despesas; o núcleo consultável vai em colunas e o restante em `compra_detalhes` jsonb. A lista de compra filtra `tipo='compra'` (o `ListaRegistros` ganhou prop `filtro` e a lista de venda passou a filtrar `tipo='venda'` para não misturar).

O recebimento é uma caderneta própria (`recebimento-compra`, store `os-recebimentos`), um laudo por caminhão/GTA, porque cada veículo exige GTA própria: GTA, NF, transporte, contagens F/M por categoria, peso médio do balanço (kg/cab), peso origem, checklist diagnóstico de 20 itens, score corporal, destino baia/pasto + lote, assinaturas e **vídeo de descarregamento** (blob fica no IndexedDB e sobe para o bucket `videos-os` no sync, fora do pipeline de fotos; `os_documentos` recebe tipo `video` + `os_recebimento_id` + `bucket`). Cada laudo gera movimentações `Entrada`/`Compras` por categoria+sexo, com o lote receptor em `loteOrigemId` (convenção do schema para Entrada); a OS acumula cargas e vai para `recebida` via trigger. `getOrdensServicoAbertas(fazendaId, 'compra')` retorna `aberta`+`recebida` para permitir cargas adicionais.

A identificação dos animais (3-5 dias após a chegada) é manejo separado: `PesagemPage` ganhou o tipo `processamento` ("Processamento/Identificação"), sem vínculo de OS, que permite criar o indivíduo na chipagem tardia.

**Disparador**: quando mencionar compra de gado, recebimento, laudo de chegada, GTA, balanço/balancão, `os-recebimentos`, vídeo de descarregamento, `processamento` na pesagem ou `compra_detalhes`, ler esta seção.

## Listas de Leitura de Cocho e Trato Confinamento + share do trato (25/09/2026)

Criadas `LeituraCochoListaPage.tsx` e `TratoConfinamentoListaPage.tsx` como wrappers de `ListaRegistros`, no mesmo padrão das demais cadernetas, com rotas `/caderneta/leitura-cocho/lista` e `/caderneta/trato-confinamento/lista` em `App.tsx`. A lista de trato tornou o compartilhamento da caderneta alcançável pela UI pela primeira vez, o que expôs o fallback genérico de `shareUtils.ts`: o texto saía como dump de chaves cruas (`CURRALID`, `LOTEID`, `PROGRAMACAOID`, `KGPLANEJADO`). Adicionado bloco dedicado `else if (caderneta === 'trato-confinamento')` em `formatarRegistroComoTexto` com RESPONSÁVEL, CURRAL, LOTE, TRATO (ordem), KG PLANEJADO, KG FORNECIDO e LEITURA COCHO (nota), sempre sem os IDs internos. `SyncErrorModal` também recebeu o label de `os-recebimentos`, que faltava no `Record<CadernetaStore, string>` e quebrava o typecheck.

Os cards da lista usavam o mesmo dump genérico (sem `CADERNETA_DISPLAY_CONFIG` as chaves viram `key.toUpperCase()`). Criados `config/cadernetas/leituraCocho.ts` e `config/cadernetas/tratoConfinamento.ts`, registrados em `config/cadernetas/index.ts`, com labels amigáveis (RESPONSÁVEL, CURRAL, LOTE, TRATO, KG PLANEJADO, KG FORNECIDO, LEITURA COCHO) e kg formatado em pt-BR; os IDs internos ficam em `hiddenFields`.

**Disparador**: quando mencionar share do trato com campos crus, `PROGRAMACAOID`/`LOTEID`/`CURRALID`/`NOTACONFIGID` no texto ou no card, ou as telas de lista de leitura de cocho/trato, ler esta seção.

## Trava opcional de suplementação por lote e dia (25/09/2026)

Adicionada a trava retrocompatível de no máximo um trato por lote por dia. A fazenda controla a ativação por `fazendas.trava_suplementacao`, cujo padrão é `false`; fazendas existentes e PWAs antigos continuam podendo sincronizar porque `data_local` é opcional e o índice é parcial. Quando habilitada, o PWA verifica o IndexedDB, os registros carregados e faz uma consulta online com timeout; o banco permanece como garantia contra corridas entre aparelhos offline. A data local é calculada no fuso da fazenda e erros de unicidade `23505` recebem mensagem orientando a correção pelo administrativo.

A migration foi aplicada antes do PWA e a flag foi ativada apenas na fazenda de testes `d649c65e-16ab-4b77-a84b-df937aa41cc3`. A implementação mantém o comportamento original quando a flag está desligada.

## Share de entrada-combustivel com campos crus e tanqueId exposto (25/09/2026)

O texto compartilhável de `entrada-combustivel` saía como dump genérico de chaves (`TANQUEID`, `TANQUENOME`, `QUANTIDADEL`, `VALORTOTAL`, `PRECOPORLITRO` em ponto decimal), porque a caderneta não tinha bloco dedicado em `formatarRegistroComoTexto` (`shareUtils.ts`) e caía no fallback que imprime `key.toUpperCase()` para todos os campos do registro. Adicionado bloco `else if (caderneta === 'entrada-combustivel')` no padrão das demais: COMBUSTÍVEL, TANQUE (nome, sem o id), QUANTIDADE em L, VALOR TOTAL e PREÇO POR LITRO em `R$` pt-BR, e FORNECEDOR/PLACA DO VEÍCULO/MOTORISTA/NOTA FISCAL/OBSERVAÇÃO/RESPONSÁVEL quando preenchidos. `tanqueId` nunca entra no texto.

Na sequência foi auditado o mesmo risco nas demais cadernetas: `trato-confinamento` é a única salva sem bloco dedicado (payload tem `curralId`, `loteId`, `programacaoId`), mas não tem caminho de share hoje (página não usa `SuccessModal` e não existe rota de lista), então é latente. Como blindagem, o filtro do dump genérico passou a excluir também `supabaseId` (gravado no registro do IndexedDB após o sync), `isTestRecord`, `fazendaId` e qualquer chave terminada em `_id`.

**Disparador**: quando mencionar share de combustível com campos crus, `tanqueId`/`TANQUENOME` no texto, ou formatação do share de `entrada-combustivel`, ler esta seção.

## SuccessModal fechando sozinho ao salvar (SuplementacaoPage) (25/09/2026)

**Problema**: em produção, salvar na SuplementacaoPage não mostrava o modal de sucesso — o registro era gravado e sincronizado normalmente, mas o usuário não via confirmação. Não era exclusivo da suplementação em tese, mas a cascata de re-renders pós-save dessa tela (`setForm(makeInitial())` dispara ~8 effects assíncronos com setState) tornava a falha determinística nela; telas com poucos re-renders (ex.: RodeioPage) escapavam por timing.

**Causa raiz** (verificada por instrumentação no Chrome DevTools, poll de 50ms + log de popstate): o effect de histórico do `SuccessModal` tinha `onClose` nas deps (`[isOpen, onClose]`), e todos os pais passam `onClose` como arrow inline — nova referência a cada render. Com o modal aberto, cada re-render rodava o cleanup (`history.back()` quando `history.state.modalOpen`) e re-fazia `pushState`. Quando um `back()` resolvia depois do re-push, o popstate caía numa entrada `{modalOpen:true}` e o handler chamava `onClose` — o modal abria e fechava em ~15ms, sem frame visível. Log do bug: popstate `{idx:0}` → `{modalOpen:true}` (fecha) → `{idx:0}`.

**Correção** em `components/SuccessModal.tsx`: `onClose` passou a ser lido via `onCloseRef` (atualizado a cada render, sem entrar nas deps) e o effect de histórico depende só de `[isOpen]` — re-renders com o modal aberto não geram mais ciclo de back/push. Também foi invertida a condição do `handlePopState`: agora fecha quando o popstate cai em entrada **sem** `modalOpen` (o botão voltar do aparelho leva à entrada anterior, que é o caso de uso real; antes fechava ao cair *numa* entrada modalOpen, que só acontecia na race interna). O botão voltar do Android agora de fato fecha o modal, e fechar pela UI remove a entrada do histórico como antes.

**Mesmo hardening aplicado** em `components/PdfModal.tsx` (tinha `[isOpen, onClose]` com cleanup que deixava a entrada no histórico via `replaceState` — agora usa `onCloseRef`, deps `[isOpen]` e `history.back()` no cleanup) e em `components/ui/SearchableModal.tsx` (deps já eram estáveis, mas a condição do popstate era a mesma invertida — corrigida para `!e.state?.modalOpen`). Auditoria: `pushState`/`popstate` no `src` existem só nesses três componentes e no guard de sessão da `PesagemPage` (deps `[sessaoAtiva]`, mecanismo diferente e correto); as demais telas de registro usam `SuccessModal` ou feedback inline sem histórico.

**Verificado em build de produção** (`vite build` + `vite preview`, chrome-devtools, fazenda de testes, usuário Victor Hugo): antes da correção o modal abria e fechava em ~15ms (registro salvo, modal ausente); depois, o modal "Salvo com sucesso" permanece aberto e `history.state` fica `{modalOpen:true}` estável. Typecheck limpo.

**Disparador**: quando mencionar "modal de sucesso não aparece", SuccessModal sumindo, popstate/modalOpen, ou comportamento do botão voltar do Android em modal, ler esta seção.

## Tratos: folha por ocupação lote-curral, aba TIP e feed target do dia 1 (24/09/2026)

Redesenho coordenado com o Painel (branch `feat/tratos-ocupacao` nos dois repos): a lista de currais da folha de trato deixa de vir do snapshot `programacao_tratos_currais` (que travava a participação no momento do save da programação e omitia currais que entraram depois) e passa a ser derivada da ocupação real do curral na data, via nova tabela `lote_curral_historico` criada no Painel. A programação fica só com o cronograma (quantidade de tratos, percentuais, horários).

- `supabaseService.ts`: nova `getOcupacoesCurralNaData(fazendaId, data)` lendo `lote_curral_historico` com `data_inicial <= data` e `(data_final null ou >= data)`, com join de `lotes(nome, sistema_producao)`. `getProgramacaoTratosCompleta` continua retornando `currais` lendo o espelho de compatibilidade (trigger no banco mantém `programacao_tratos_currais` sincronizado), mas nenhum consumidor usa mais esse campo.
- `cadastroCache.ts`: `getOcupacoesCurralNaDataCached` com fallback memória → IndexedDB offline; `warmAllCadastroCache` aquece ocupações de hoje/ontem e os registros anteriores por curral ocupado (antes iterava `progCompleta.currais`). As datas do warm-up passaram a usar `getDateTimePartsInTimezone` (fuso da fazenda): antes era `toISOString()` UTC e entre 20h e 23h59 locais as chaves de cache não batiam com as datas calculadas pelas páginas, deixando a folha offline vazia nesse horário.
- `TratoConfinamentoPage.tsx`: seletor de tipo ganhou a aba TIP (antes só confinamento/sequestro); os currais listados são as ocupações vigentes na data cujo lote tem o `sistema_producao` do tipo (`SISTEMA_POR_TIPO`); "dia 1" passa a ser por ocupação (só contam registros anteriores desde a entrada do lote atual, então lote novo reinicia o baseline); `kg_mn_dia_dia1` é o feed target opcional da ocupação e, quando nulo, o previsto mostra "a definir" em vez de fabricar zero.
- `FabricaConfinamentoPage.tsx`: dietas filtradas pelo `sistema_producao` do tipo selecionado (antes sempre 'Confinamento', incluindo TIP errado); planejamento por ocupação com `kgBaseDia` nullable; dia 1 por ocupação com o mesmo filtro de entrada.
- `MovimentacaoPage.tsx`: `usaCurralSistema` reconhece Confinamento, TIP e Sequestro para exigir/mostrar o campo curral no fluxo Novo Lote (antes só Confinamento, então lote TIP criado pelo PWA nunca ocupava curral).
- `ProgramacaoHojePage.tsx`: sem mudança (só consome percentuais/horários).

Compatibilidade: enquanto houver PWA antigo em campo, o trigger `trg_lch_sync_programacao_currais` mantém `programacao_tratos_currais` espelhado. Remover o espelho e a coluna `currais` de `getProgramacaoTratosCompleta` na fase de limpeza pós-janela de transição.

**Disparador**: quando mencionar folha de trato por ocupação, `lote_curral_historico`, `getOcupacoesCurralNaData`, feed target do dia 1, "a definir" no previsto, aba TIP no trato, ou `programacao_tratos_currais` como whitelist, ler esta seção.

## Aviso "registros pendentes de sincronização" travava o Atualizar Dados (24/09/2026)

**Problema**: o card "Erros na sincronização — Há registros pendentes de sincronização" aparecia na Home e ficava preso na tela. O guard em `syncAllCadastroData` (`cadastroCache.ts`) aborta a atualização de cadastros quando `countPending() > 0` (registros com `syncStatus='pending'` no IndexedDB), para não sobrescrever o cache enquanto registros locais referenciam IDs antigos. O comportamento tinha três falhas: o guard recusava sem tentar sincronizar a fila primeiro; o card de erro nunca se limpava sozinho (só na próxima tentativa manual); e registros `pending` órfãos (sem item na `syncQueue`, ex.: crash entre `updateSyncStatus` e `enqueueRegistro`, ou modo teste) ficavam presos para sempre, bloqueando o Atualizar Dados eternamente.

**O que foi feito**:

- `cadastroCache.ts`: `syncAllCadastroData` agora drena a fila antes do guard — quando `navigator.onLine`, reautentica se o token estiver inválido e roda `processQueue(fazendaId)`. Só depois disso verifica `countPending`. Offline o drain é pulado e o guard continua valendo. A mensagem virou a constante exportada `PENDING_SYNC_ERROR_MSG`. Efeito colateral intencional: registro que falha no drain vira `syncStatus='error'` (não conta como pending), então não bloqueia mais o Atualizar Dados — aparece na lista da caderneta com REENVIAR.
- `Home.tsx`: o card remove a mensagem de pendência automaticamente quando `state.sync.pendingCount` chega a 0 (effect filtrando `PENDING_SYNC_ERROR_MSG`); ao fim do `handleSync` o `pendingCount` do Redux é atualizado via `getSyncQueue()` para não esperar o tick de 10s do `useSync`.
- `syncService.ts`: nova `reconcileOrphanPending()` reenfileira registros `pending` sem item na fila (pula `isTestRecord`, usa `update` quando há `supabaseId`). Chamada uma vez por sessão no `useSync`, e dispara `runSync` se reenfileirou algo. `STORES` do `indexedDB.ts` foi exportado para isso.
- `processQueue` (`syncService.ts`): `getRegistro` entrou dentro do try por item, e a marcação de erro (`removeFromSyncQueue` + `updateSyncStatus` + `updateSyncError`) ganhou try próprio — uma falha de IndexedDB num item não aborta mais o processamento dos demais.

**Verificado em dev (chrome-devtools, fazenda de testes)**: registro `pending` órfão foi reenfileirado no boot e sincronizado; offline, o aviso continua aparecendo ao tentar atualizar e o card some sozinho quando a rede volta e o registro sobe; online, ATUALIZAR DADOS com pendente na fila drena, sincroniza e atualiza o cache sem erro. Typecheck e build limpos.

**Disparador**: quando mencionar "registros pendentes de sincronização", card de erro na Home, Atualizar Dados bloqueado, `countPending`, `reconcileOrphanPending` ou pending órfão, ler esta seção.

## Divergência ativo/deleted_at: "Pasto não encontrado" por duplicata (24/09/2026)

O erro "Pasto não encontrado. Selecione outro pasto" na `PastagensPage` aparecia quando o pasto tinha mais de uma linha ativa com o mesmo nome na fazenda (caso da Santa Vitória: Pasto 5, 8 e 9 duplicados). Dois fatores combinados: (1) `getPastoByNome` usava `.single()`, que estoura com 0 **ou mais de 1** linha, com mensagem enganosa pois o pasto existia; (2) o delete do Painel em `Pastos.tsx`/`Lotes.tsx`/`Racas.tsx`/`Currais.tsx`/`atividadesService.ts` setava só `deleted_at` sem `ativo=false`, e o PWA lia só `ativo=true` sem filtrar `deleted_at`, então entidades "excluídas" no Painel continuavam vivas no PWA.

Correções neste repo:

- `supabaseService.ts`: todas as leituras de entidades com coluna `deleted_at` passaram a filtrar `.is('deleted_at', null)` (pastos, lotes, bebedouros, funcionarios, currais, setores, linhas_confinamento, racas, locais, implementos, maquinas_veiculos, medicamentos, insumos, fornecedores, formulacoes, faixas_categorias, causas_morte, pluviometros, tanques_combustivel, individuos).
- `getPastoByNome`, `getBebedouroByNome` e `getMaquinaVeiculoByNome` trocaram `.single()` por `.order('created_at').limit(1).maybeSingle()`, tolerando duplicata de nome ao retornar a linha mais antiga.
- `cadastroCache.ts`: `getSaldoInsumosCached` ganhou o mesmo filtro.
- Tabelas SEM `deleted_at` (mineral, proteinado, racao, tratamentos, categorias, frigorificos, rotinas, checklist_regras, programacao_tratos, lote_categorias, planos_nutricionais, fazendas) ficaram inalteradas; as views `itens_almoxarifado_pwa`/`itens_cantina_pwa` não expõem a coluna e também não foram tocadas.

Dados corrigidos via MCP (24/09/2026): `ativo=false` em todas as linhas com `deleted_at` preenchido (3 pastos, 6 bebedouros, 30 atividades) e soft-delete do Pasto 5 duplicado da Santa Vitória (`bb513715`). As duplicatas vivas de outras fazendas (`111` na Sementes Tropical-Arizona, `Lajeado 1B` na Jacamim) foram resolvidas no mesmo dia mantendo o registro criado por último em cada par (decisão do usuário): mantidos `b521620a` ("111") e `a5ed9523` ("Lajeado 1B"); soft-deletados `acda7322` e `954ed89d`.

Lado do Painel (repo `GestaUp-Cadernetas-Gestao`): todo soft-delete passa a gravar `ativo=false` junto com `deleted_at`, e o cadastro de pasto bloqueia nome duplicado (case-insensitive) na mesma fazenda. Índice único parcial `ux_pastos_fazenda_nome_ativo` em `pastos(fazenda_id, lower(nome)) WHERE deleted_at IS NULL` aplicado em 24/09/2026 (migration `20260924090000` no repo do Painel), após a resolução das duplicatas vivas.

**Disparador**: quando mencionar "pasto não encontrado", duplicata de pasto, divergência `ativo`/`deleted_at`, ou soft-delete não refletido no PWA, ler esta seção.

## PERÍODO DE TRATO ausente no share do SuccessModal (24/09/2026)

O label `PERÍODO DE TRATO` no texto compartilhável de suplementação só aparecia quando o share era feito pelo card da lista (`ListaRegistros` passa `todosRegistros` do IndexedDB, camelCase); pelo `SuccessModal` nunca aparecia. A causa: `SuplementacaoPage` calcula `periodoTratoDias` ao salvar com `calcularPeriodoTrato(registroComPeriodo, registrosSuplementacao)`, mas `registrosSuplementacao` vem do Supabase em snake_case (`lote_id`) enquanto a função filtrava por `r.loteId` (camelCase), então o filtro nunca casava e o cálculo sempre retornava null. `calcularPeriodoTrato` em `shareUtils.ts` agora aceita as duas formas (`r.loteId ?? r.lote_id`, idem para o registro atual), exclui também a linha já sincronizada do próprio registro via `local_id`, e retorna null se o registro atual não tiver lote (evita casar `undefined === undefined` entre lotes distintos). Observação operacional: mesmo pelo card da lista, o período só é calculado sobre registros presentes no IndexedDB do aparelho (o sync é só de envio; tratos feitos em outro aparelho não entram na conta).

Uma tentativa de unificar o share do `SuccessModal` e do `ListaRegistros` num `shareService` único foi implementada e validada em browser (textos idênticos nos dois fluxos, em suplementação e bebedouros), mas revertida no mesmo dia por decisão do usuário: a auditoria mostrou divergências pré-existentes que a unificação não resolveria (campos anexados só ao `registroSalvo` e não persistidos: `n_cabecas_apos_obito` na morte, `metaRodeio` no rodeio, `categoriasEntrada` na movimentação) e modos de falha novos (share do modal passaria a depender de leitura async do IndexedDB, risco de perder a janela de ativação do `navigator.share`). Detalhes no `docs/BACKLOG.md`, seção "Unificação do share de registro".

Em 25/09/2026 surgiu uma segunda causa de label ausente, reportada na fazenda Guanabara: `calcularPeriodoTrato` usava `Math.floor(diffMs / 86400000)` sobre o tempo decorrido, então tratos do mesmo lote com menos de 24h de intervalo (rotina comum: trato à tarde e de novo na manhã seguinte, ~16h) retornavam 0 dias e o label era omitido. O cálculo passou a comparar dias de calendário (datas sem hora), coerente com `diferencaDias` de `supplementMetrics.ts`/`LeituraCochoPage.tsx`: datas consecutivas dão "1 dia" independente do horário; dois registros no mesmo dia continuam sem label.

**Disparador**: quando mencionar "período de trato", `periodoTratoDias`, `calcularPeriodoTrato`, ou share de suplementação sem o label de dias, ler esta seção.

## Creep feeding: suplementação por alvo na SuplementacaoPage (23/09/2026)

Quando o lote tem bezerro(a) ao pé **com dieta creep vinculada** (`lote_categorias.formulacao_id` apontando para `formulacoes.e_creep = true`), a suplementação passa a ser por alvo: só o lote, só o creep, ou ambos no mesmo lançamento. Sem dieta vinculada o PWA não mostra nada de creep (sem seção, sem aviso, sem inputs). Schema, guards e relatório vivem no repo do painel (migration `20260923140000_creep_feeding.sql` e sequentes); aqui ficam as mudanças do PWA.

- **SuplementacaoPage.tsx**: a página se reorganiza em seções sempre visíveis por alvo: "LOTE — CATEGORIAS ADULTAS" (formulação do plano + métricas + leitura/kg próprios), botão POP LEITURA DE COCHO entre as seções, "CREEP FEEDING — BEZERRO(A) AO PÉ (N CAB)" (formulação creep + métricas próprias + leitura/kg próprios), depois depósito (título "DEPÓSITO E FEZES" só quando o pasto tem depósito; senão "FEZES") e checklist. Um grupo é considerado "a suplementar" quando o usuário preenche qualquer campo dele; a validação exige leitura + kg dos grupos preenchidos e ao menos um grupo no total. O gate de exibição (`temCreepDisponivel`) exige categoria ao pé com `quant_atual > 0` **e** `formulacao_id` vinculado; o helper `isCategoriaAoPe`/`processarCategorias` vive em `utils/categorias.ts` (compartilhado com share/card/PDF). Com bezerro **e** bezerra ao pé é uma seção única agregada (o painel garante dieta única via modal + trigger de propagação).
- **Modelo de gravação**: um registro local pode virar duas linhas no Supabase. `registroToSupabase` grava a linha primária com `escopo` ('lote' por padrão; 'creep' quando a operação é só creep) e `grupo_operacao = registro.id` quando ambos os alvos existem. O sync (`syncService.ts`) gera a segunda linha com `local_id` derivado `<id>:creep` (upsert idempotente, retry seguro), `kg_deposito = 0` na linha creep (o depósito fica só na primária para não duplicar baixa de estoque), `n_cabecas` = nº de bezerros ao pé, `qtd_bezerros = 0`, e `categorias` filtrado por escopo (a linha adulta não carrega as categorias ao pé). Update também faz upsert da linha pareada.
- **Validação**: `validateSuplementacao` aceita `suplementarAdulto`/`suplementarCreep` booleanos; creep com `formulacao_id` mas sem dieta `e_creep` válida exibe aviso e bloqueia só o grupo creep.
- **Exibição**: `ListaRegistros.tsx`/`suplementacao.ts` mostram a seção "CREEP FEEDING" no card (escondendo os campos genéricos duplicados quando o registro é só creep, e filtrando `categorias` por escopo em registros antigos), `shareUtils.ts` emite o texto adulto no formato original + bloco creep separado por divisor (meta, cabeças, PV, leituras — sem label CATEGORIAS, redundante), `SuplementacaoListaPage.tsx` e `pdfUtils.ts` seguem o mesmo layout no resumo diário/PDF. `FormulacaoDetalhesCard` exibe só as 5 métricas que saem no texto (CMS/CMN geral e 30 dias + custo; os kg/MS continuam gravados mas não são exibidos).
- **Types/schema**: `types/supabase.ts` regenerado (UTF-8 agora, antes era UTF-16 — cuidado para não regredir o encoding) e `mcp-server/schema.sql` atualizado com `escopo`/`grupo_operacao`/`e_creep`.
- **Fazendas sem creep**: quando não há dieta vinculada (`temCreepDisponivel` falso), o registro fica visualmente idêntico ao formato anterior — `nCabecasLote` total do lote e `categorias`/`categoriasString` listando todas as categorias. A diferença deliberada: `qtdBezerrosLote` passa a ser `creepNCabecas` (cabeças reais das categorias ao pé) em vez do campo legado `lote_categorias.qtd_bezerros`, que não é confiável (vem null no Teste 2 e replicado por linha na Sirio). Isso garante que o denominador `n_cabecas - qtd_bezerros` sempre isole adultos — invariante "consumo adulto não inclui cabeças de bezerro". Com dieta, a linha 'lote' grava `n_cabecas` só de adultos + `qtd_bezerros = 0` (mesmo denominador, sem depender de campo legado).
- **Campo legado aposentado**: `lotes.qtd_bezerros` e `lote_categorias.qtd_bezerros` são legados (o input que os alimentava não existe mais) e deixaram de ser fonte em todo o app. `buildLoteDetalhesFromCategorias`/`cadastroCache` agora derivam bezerros somando `quant_atual` das categorias ao pé; os totais `n_cabecas + qtd_bezerros` viraram só `n_cabecas` (que já inclui as linhas ao pé — a soma duplicava bezerro) em `shareUtils`, `pdfUtils`, `RodeioPage`, `RodeioListaPage` e `PastagensPage`; o snapshot de movimentação grava `qtd_bezerros = numeroCabecas` para categoria ao pé em vez de copiar a coluna legada.

**Disparador**: quando mencionar creep feeding, suplementar bezerro ao pé, dois cochos no mesmo lote, `suplementarCreep`, `escopo='creep'`, `local_id` derivado `:creep`, `grupo_operacao`, ou `temCreepDisponivel`, ler esta seção.

## Correções do teste E2E de venda abate (22/09/2026)

Teste E2E completo (comunicado → OS → pesagem → embarque → documentos → fechamento) na fazenda de testes expôs um bug no PWA:

- **Compatibilidade categoria×sexo case-sensitive**: `categoriasCompativeis` em `PesagemPage.tsx` filtrava pelos sets `CATEGORIAS_MACHO`/`CATEGORIAS_FEMEA` em Title Case, mas `lote_categorias.categoria` pode vir em minúsculo (ex: `boi gordo`). Marcar sexo zerava a lista de categorias. Corrigido com comparação normalizada (`toLowerCase().trim()`).
- **SuccessModal modernizado**: o componente compartilhado `components/SuccessModal.tsx` foi restilizado com o visual do modal da pesagem (CheckCircle2, rounded-3xl, botões empilhados COMPARTILHAR / NOVO REGISTRO / VOLTAR PARA O INÍCIO, texto "registrada no aparelho. Será enviada ao sincronizar."). Mesma interface de props e handlers (ESC, botão voltar do Android, overlay). O modal da `PesagemPage` continua próprio porque tem ações específicas de sessão (contagem de registros, erros de sync, VER REGISTROS).
- **Tipo de manejo travado com OS vinculada (23/09/2026)**: com OS selecionada, os botões de tipo de manejo ficavam clicáveis e `handleSelecionarTipoManejo` desvinculava a OS silenciosamente ao tocar em outro tipo (a pesagem virava comum, sem desconto via OS). Agora os botões ficam `disabled` quando `sessao.osId` está preenchido, com texto explicativo "Tipo definido pela OS. Para pesagem comum, selecione 'Sem OS' acima." O caminho para sair da OS é explícito: trocar o seletor para "Sem OS (pesagem comum)".
- **Nº da OS na pesagem (23/09/2026)**: o registro de pesagem passa a gravar `numeroOs` (campo local, não enviado ao Supabase — o payload de sync usa whitelist). O texto compartilhável da pesagem inclui "🔢 OS: *VEN-...*", e a lista/detalhe exibe "Nº OS" na seção SESSÃO (`pesagem.ts` + `labelConfig`).

**Disparador**: quando mencionar categoria sumindo ao marcar sexo, `categoriasCompativeis`, case de `lote_categorias`, ou tipo de manejo travado/desvinculando OS, ler esta seção.

## Módulo de Venda via Ordem de Serviço (OS) — PWA (22/09/2026)

Fluxo de venda: o comunicado criado no app gera uma OS (`VEN-ano-00000`, número gerado no servidor), a pesagem vinculada à OS desconta as cabeças dos lotes via `registros_movimentacao`, e o fechamento é manual no painel. O schema é genérico (`tipo` venda/compra/transferencia) para os próximos módulos. Migration e triggers vivem no repo do painel (`20260922260000_modulo_venda_os.sql`).

- **IndexedDB**: store `ordens-servico` (DB version 8) com sync pelo pipeline normal. `salvarRegistro` passou a respeitar `id` uuid fornecido pelo chamador (`api.ts`), então a OS criada offline tem uuid real e pode ser referenciada pela pesagem antes do sync.
- **Sync**: `syncService.ts` mapeia `ordens-servico` → `ordens_servico` (upsert por `local_id`, captura `numero_os` gerado pelo trigger e grava em `numeroOs` local) e `createOrdemServico`/`getOrdensServicoAbertas` em `supabaseService.ts`. Movimentações e pesagens enviam `os_id`; movimentação com `os_id` também envia `sessao_id` (CHECK no banco exige).
- **Comunicado de Venda**: `ComunicadoVendaPage.tsx` (`/caderneta/comunicado-venda`) com tipo da venda (abate/animal vivo), partes, quantidade, sexo, era, datas previstas, preço/arroba, venda direta/corretora e observação; rascunho via `useRascunhoForm` e texto compartilhável (`shareUtils`) disponível no modal de sucesso e na lista. Lista em `ComunicadoVendaListaPage.tsx` (`/caderneta/comunicado-venda/lista`). Card "COMUNICADO DE VENDA" no grupo Gado & Pastagens em `constants.ts`. Display config `ordensServico.ts`, labels em `labelConfig.ts`, validador `validateOrdemServico` em `validation.ts`, nome da store em `SyncErrorModal`.
- **Pesagem com OS**: `PesagemPage.tsx` mostra seletor de OS na preparação quando o tipo de manejo é `abate`/`venda_vivo` (tipos de venda exigem OS — validação em `validatePesagem` e gate no botão de iniciar). O seletor junta OS abertas remotas (`getOrdensServicoAbertas` via `cadastroCache`) com as locais pendentes de sync, e exclui OS já usadas em pesagem local. Selecionar a OS fixa o tipo de manejo (abate→`abate`, animal vivo→`venda_vivo`). Com OS, o campo categoria usa as `lote_categorias` reais do lote (`getLoteDetalhesComCategoriasCached`) em vez da lista fixa — evita `CATEGORIA_NOT_IN_LOTE` no desconto. Ao finalizar, cada animal é gravado como pesagem com `os_id` e o app gera movimentações `Saída`/`Venda` agrupadas por lote+categoria com `os_id`+`sessao_id`; é isso que desconta as cabeças e transiciona a OS para `embarcada` no servidor. O modal de sucesso também observa o sync das movimentações geradas.
- **Idempotência de retry**: se a finalização falhar parcialmente, animais já gravados são atualizados e reenfileirados como `create` (upsert por `local_id`), sem duplicar.

**Disparador**: quando mencionar OS, ordem de serviço, comunicado de venda, pesagem com OS, desconto de venda, `ordens-servico` ou `sessao_id`, ler esta seção.

## Liberação geral das cadernetas por fazenda (22/09/2026)

Todas as telas que estavam restritas a listas hardcoded de `fazenda_id` foram liberadas para todas as fazendas, com duas exceções que continuam limitadas.

- **Removido do PWA**: `frontend/src/config/features.ts` (mapa `FEATURE_ACCESS`) e `frontend/src/components/FeatureLock.tsx` (tela "EM BREVE") foram deletados; `EntradaInsumosPage` e `ProducaoFabricaPage` perderam o wrapper `FeatureLock`; `ModulosMenuPage` e `ProgramacaoHojePage` perderam `CADERNETAS_EXCLUSIVAS`/`FAZENDAS_COM_INSUMOS`. Com isso `entrada-insumos`, `saida-insumos`, `entrada-almoxarifado` e `entrada-cantina` passam a aparecer e funcionar em qualquer fazenda.
- **Mantido restrito**: a opção "Novo Lote" em `MovimentacaoPage` continua limitada a `FAZENDAS_NOVO_LOTE_HABILITADO` (Marcon, Guanabara, Gesta'Up teste, Bom Jesus - Mirandópolis); no painel, Editar/Excluir em `SuplementacaoDetalhes` continua limitado a `FAZENDAS_HABILITADAS` (Guanabara, Brilhante, Doce Ilusão, Chibata).
- **Mantido o flag de banco**: `fazendas.acesso_confinamento` continua controlando a visibilidade das cadernetas de confinamento (`leitura-cocho`, `trato-confinamento`, `fabrica-confinamento`) por fazenda. A entrada `leitura-cocho` que existia em `FEATURE_ACCESS` era config morta e sumiu junto com o arquivo.

**Disparador**: quando mencionar liberação de telas por fazenda, whitelist de fazendas, `FEATURE_ACCESS`, `FeatureLock`, ou "EM BREVE" por fazenda, ler esta seção.

## Criação de itens de almoxarifado/cantina pelo PWA + CHECK de classificação (22/09/2026)

As telas de entrada de estoque passaram a permitir cadastrar item novo na hora, e a classificação virou lista fechada validada no banco.

- **CHECK constraints** (migrations `20260922210000` e `20260922240000` no repo do painel): `itens_almoxarifado.classificacao` aceita só as 19 opções (Ferramentas, Peças, Hidráulica, Elétrica, Insumos, Fertilizantes, Corretivos, Defensivos, Herbicidas, Fungicidas, Inseticidas, Adjuvantes, Sementes, Medicamentos, Equipamentos, Combustíveis, Lubrificantes, EPI, Materiais de Construção); `itens_cantina.classificacao` aceita as 6 (Perecíveis, Não Perecíveis, Bebidas, Limpeza/Higiene, Hortifruti, Carnes). O painel já usava exatamente essas listas, então nenhuma alteração foi necessária lá.
- **RPCs `SECURITY DEFINER`**: `criar_item_almoxarifado_pwa(p_id, p_fazenda_id, p_nome, p_classificacao, p_unidade)` e `criar_item_cantina_pwa(p_id, p_fazenda_id, p_nome, p_classificacao, p_unidade_medida)`. Validam vínculo do usuário com a fazenda (`usuarios.auth_id = auth.uid()` + `usuario_fazenda.ativo`), validam classificação/unidade, são idempotentes por `p_id` (retry de sync) e deduplicam por `lower(btrim(nome))` na fazenda — dedupe retorna o item existente e liga `controla_estoque` se estava desligado (senão o trigger ignoraria a entrada silenciosamente). Peão não tem INSERT direto nas tabelas `itens_*` (RLS admin/controller), por isso RPC.
- **PWA**: `constants.ts` ganhou `CLASSIFICACOES_ALMOXARIFADO`, `CLASSIFICACOES_CANTINA`, `UNIDADES_ALMOXARIFADO`, `UNIDADES_CANTINA`. As telas de entrada usam a constante como fonte das classificações (antes era derivada dos itens existentes, o que escondia classificações sem item). No seletor de item há o botão "＋ CADASTRAR NOVO ITEM" que abre campos de nome + unidade; o item recebe `crypto.randomUUID()` como `itemId` e flag `novoItem: true` no payload, então funciona offline.
- **Sync**: `criarItensPendentes` em `syncService.ts` roda antes de postar registros `entrada-almoxarifado`/`entrada-cantina` — para cada item com `novoItem` chama a RPC e reescreve o `itemId` no payload com o id retornado (cobre o caso de dedupe por nome). Se a RPC falhar, o registro fica na fila de sync normalmente.
- **Atenção**: qualquer classificação/unidade nova exige migration de CHECK + update nas constantes do PWA + opções do painel, nas três pontas ao mesmo tempo.

**Disparador**: quando mencionar cadastro de item pelo PWA, "cadastrar novo item", `novoItem`, `criar_item_*_pwa`, ou CHECK de classificação, ler esta seção.

## Entrada de estoque: EntradaAlmoxarifadoPage e EntradaCantinaPage (22/09/2026)

Duas cadernetas novas dão entrada ao estoque, quase cópias das telas de saída. Ficam no grupo "Entrada de Estoque" e só aparecem na fazenda de testes (`d649c65e-16ab-4b77-a84b-df937aa41cc3`, via `CADERNETAS_EXCLUSIVAS` + `FEATURE_ACCESS`). O schema/triggers vivem no repo do painel (migrations `20260922180000` e `20260922190000`, já aplicadas).

- **Ids e rotas**: `entrada-almoxarifado` (`/caderneta/entrada-almoxarifado[/lista]`) e `entrada-cantina` (`/caderneta/entrada-cantina[/lista]`). Stores novas no IndexedDB (`openDB` versão 29→30).
- **Sync**: ambas caem nas tabelas existentes — `registros_almoxarifado` com `tipo='entrada'` + `quem_recebeu`, e `registros_alimentacao` com `modo='entrada'` + `quem_recebeu` + `itens` (mapa nome→qtd) + `itens_detalhe` (array com `itemId`/`quantidade`). Os triggers no banco geram movimentações de `entrada` e recalculam o saldo; o PWA nunca escreve no ledger direto (RLS admin/controller).
- **Formulários**: campos mínimos (data, quem recebeu, itens com classificação→item→quantidade, observação). Sem setor/devolução (almoxarifado) e sem cozinheiras/refeições/marmita (cantina). Seletor de item só lista `controla_estoque=true`. Após salvar, o cache local de saldo é incrementado (`updateItemAlmoxarifadoSaldoCache` / novo `updateItemCantinaSaldoCache`).
- **CantinaPage (saída)** passa a enviar `itensDetalhe` com `itemId` por item para o modo `cantina` baixar estoque no banco; `supabaseService` lê o catálogo da view `itens_cantina_pwa` (a tabela `itens_cantina` ficou restrita a admin/controller).
- Plumbing: `CadernetaStore`, `CadernetaType`, validadores `validateEntradaAlmoxarifado`/`validateEntradaCantina`, cards em `constants.ts`, display configs `entradaAlmoxarifado`/`entradaCantina` + renderers em `registroSpecialComponents`, labels em `labelConfig.ts`, nomes em `SyncErrorModal` e texto de compartilhamento em `shareUtils.ts`.
- **Limitação conhecida**: registros de cantina criados por versões antigas do app não têm `itens_detalhe` e não baixam estoque; o saldo da cantina só é confiável a partir desta versão.

**Disparador**: quando mencionar entrada de estoque, `entrada-almoxarifado`, `entrada-cantina`, `itensDetalhe`, ou saldo da cantina, ler esta seção.

## Leitura de Cocho: carga em batch, dedup por curralId e 23505 amigável (22/09/2026)

Revisão de performance e robustez do módulo de confinamento no PWA:

- **Carga em batch em `LeituraCochoPage`**: a página fazia ~3 queries por lote (`getLoteDetalhesComCategoriasCached`, `getRegistrosOfertaTratoByLoteCached`, `getRegistrosLeituraCochoByLoteCached`), ~120 requests numa fazenda com 40 currais. Agora faz 4 queries para a fazenda inteira via novos wrappers em `cadastroCache.ts` (`getLoteCategoriasBatchCached`, `getRegistrosOfertaTratoBatchCached`, `getRegistrosLeituraCochoBatchCached`, `getFormulacoesBatchCached`), que seguem o padrão lazy-cache (online sempre consulta, offline cai no cache em memória/IndexedDB). `supabaseService.ts` ganhou `getRegistrosOfertaTratoBatch` (linhas completas por lote, necessário para `calcularCmsPorJanelas` — `getUltimoTratoTotalBatch` só retorna totais) e `buildLoteDetalhesFromCategorias` (agregação extraída de `getLoteDetalhesComCategorias` para reuso com o mapa batch). Dieta e `teor_ms_dieta` são resolvidos em memória a partir do batch de formulações (`formById`/`formByNome`), com fallback às funções antigas quando o batch não está em cache. Verificado no Chrome: a página emite 4 requests de dados (lote_categorias, oferta_trato, leitura_cocho, formulacoes) em vez de 3 por lote.
- **Dedup offline por `curralId`**: o match de leitura existente no IndexedDB (efeito de data e `salvarNota`) e o match remoto passam a aceitar `curralId`/`curral_id` além de `loteId`/`pastoCurral`, cobrindo curral renomeado ou mudança de lote entre registro e verificação. O efeito de data agora varre todas as leituras (`Object.values(leiturasPorLote).flat()`), não só as do lote atual, para casar por `curral_id` mesmo quando a leitura ficou sob um `lote_id` antigo. O registro inserido no mapa local após save carrega `lote_id`/`curral_id` para o match continuar funcionando.
- **Erro 23505 traduzido por constraint**: `translateSyncError` em `syncErrorMessages.ts` agora reconhece `registros_leitura_cocho_curral_dia_uk` ("Já existe uma leitura de cocho para este curral nesta data.") e `registros_oferta_trato_dia_operacional_uk` ("Já existe um trato para este curral nesta data e ordem.") pelo nome da constraint na mensagem/detalhes, antes do fallback genérico de duplicado. Código e detalhes originais continuam no `syncError` e no log para diagnóstico.
- **Bug no `SyncErrorModal`**: a lista lia `registro.errorMessage`, campo que nunca é gravado — o erro vive em `registro.syncError`. Agora exibe `translateSyncError(registro.syncError)`, então o peão vê a mensagem amigável.
- **Warnings do React Router**: `App.tsx` recebeu `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` no `BrowserRouter`, silenciando os warnings de v7 (o `path="*"` usa `Navigate` absoluto, sem impacto).

**Disparador**: quando mencionar lentidão ao abrir leitura de cocho, muitos requests por lote, dedup de leitura offline, ou "erro de sync duplicado", ler esta seção.

## Leitura de Cocho passa a gravar curral_id (22/09/2026)

**Contexto**: `registros_leitura_cocho` ganhou a coluna `curral_id` (FK `currais`) e o índice único parcial `registros_leitura_cocho_curral_dia_uk` por `(fazenda_id, curral_id, dia operacional)` entre linhas ativas (migration `20260922170000` no repo do painel). A unicidade "uma leitura por curral por dia" agora é garantida no banco, não só na UI.

**O que foi feito**:
- `LeituraCochoPage.tsx`: o payload de `salvarRegistro('leitura-cocho')` inclui `curralId: lote.curralId` (já existia em `LoteItem`, vindo de `curraisPorLote`).
- `syncService.ts`: o caso `leitura-cocho` de `registroToSupabase` mapeia `curral_id: registro.curralId || null`.
- Registros antigos sem `curralId` local continuam sincronizando normalmente (`curral_id` fica NULL e não entra no índice). Uma duplicata real no mesmo curral/dia agora falha no sync com 23505 em vez de criar linha extra — aparece como erro de sync no app.
- Backfill por fazenda roda no painel/MCP (fazenda de testes já está 100%).

**Disparador**: quando mencionar `curral_id` em leitura, duplicata de leitura no sync, ou "23505 leitura de cocho", ler esta seção.

## Leitura de Cocho: bloqueio por data selecionada, não só por hoje (21/09/2026)

**Problema**: no `LeituraCochoPage`, o bloqueio de "leitura já registrada" era calculado uma única vez no `useEffect` de carga (dep só `fazendaId`) e comparava sempre contra `todayBR()`. Trocar a data no DatePicker do header não recalculava nada, então um curral com leitura hoje ficava bloqueado mesmo quando o usuário selecionava uma data passada para lançar retroativamente. A chave do rascunho no IndexedDB também era fixada em hoje.

**O que foi feito** (`LeituraCochoPage.tsx`):
- Novo estado `leiturasPorLote` (`Record<loteId, registros>`) populado em `carregarDadosIniciais` com `leitOrdenados` de cada lote.
- Novo `useEffect` em `[data, fazendaId, leiturasPorLote]` recomputa por data selecionada: `bloqueado`, `notaSalva`, `nota` (prefill do registro existente) e `rascunhoSalvo`. Consulta tanto as leituras remotas (Supabase, `r.data` ISO) quanto registros locais no IndexedDB (`getAllRegistros('leitura-cocho')`, `r.data` BR com hora), cobrindo registros criados offline ou ainda não sincronizados; o rascunho passa a ser lido pela chave da data selecionada.
- `bloqueadoHoje` renomeado para `bloqueado` (o nome antigo mentia a semântica nova). Mensagem âmbar agora diz "nesta data".
- `salvarNota`: match de duplicado no IndexedDB aceita `r.loteId === lote.id` além de `pastoCurral`; ao salvar com sucesso o lote fica `bloqueado: true` (botões de nota desabilitam, igual ao que um reload mostraria); duplicado encontrado marca `bloqueado: true` sem `erroSalvar` (a UI mostra o aviso âmbar correto em vez de erro vermelho).
- `limparNotas` não toca mais em lotes bloqueados (o check verde de leitura registrada não some ao limpar a linha).

**Não alterado (verificar se faz sentido depois)**: os painéis de contexto continuam ancorados no presente, não na data selecionada: leituras anteriores 1d/2d/3d e KG COCHO mostram os registros mais recentes, e `calcularCmsPorJanelas` usa `new Date()` internamente para as janelas. Se o uso retroativo virar rotina, vale ancorar esses painéis na data selecionada.

**Disparador**: quando mencionar "leitura de cocho bloqueada", "lançar leitura retroativa", "date picker não muda nada na leitura", lembrar que o estado por data vive no `useEffect` de `leiturasPorLote` + scan do IndexedDB, e que os painéis de contexto seguem ancorados em hoje.

## Share de Entrada multi-categoria mostra todas as categorias (21/09/2026)

**Problema**: uma Entrada com N categorias grava N linhas independentes em `registros_movimentacao` (uma por categoria, sem id de grupo) e o `SuccessModal` recebia apenas o último registro salvo (`ultimoRegistroEntrada`), então o texto compartilhado listava só a última categoria do manejo.

**O que foi feito**:
- `MovimentacaoPage.tsx`: o registro passado ao `SuccessModal` agora carrega `categoriasEntrada: [{ categoria, cabecas, pesoAtual }]` com todas as categorias do lançamento.
- `shareUtils.ts` (seção QUANTIFICAÇÃO de `movimentacao`): quando `categoriasEntrada` tem mais de um item, renderiza `NÚMERO CABEÇAS` com o total do manejo e uma lista `CATEGORIAS:` com uma linha por categoria (nome: cabeças + peso médio em kg). Entrada de categoria única mantém o formato original (`NÚMERO CABEÇAS` + `CATEGORIA`).
- Limitação mantida: o compartilhamento a partir da lista (`ListaRegistros`) continua por registro individual, pois os N registros de um mesmo manejo não têm vínculo de grupo; a correção estrutural seria um `grupo_manejo_id` compartilhado.

## Maternidade: medicamentos opcionais por cria + MedicamentosSection compartilhado (18/09/2026)

**Regra de negócio**: a caderneta Maternidade passa a ter uma seção opcional de medicamentos por cria (1ª cria e, em gêmeos, 2ª cria viva), com a mesma lógica que já existia na Enfermaria: filtro por tipo, seleção do medicamento, exibição de princípio ativo e dose recomendada, dose aplicada, adicionar/editar/remover múltiplos itens.

**O que foi feito**:
- Novo componente `frontend/src/components/cadernetas/MedicamentosSection.tsx` com a lógica extraída da Enfermaria (props `items`, `onChange`, `medicamentosDisponiveis`; estado de edição interno, então cada cria tem instância independente). Exporta a interface `MedicamentoItem` (`medicamentoId`, `tipo`, `nomeComercial`, `principioAtivo`, `doseRecomendada`, `doseAplicada`).
- `EnfermariaPage.tsx` refatorada para usar o componente (removidos ~150 linhas de JSX e 6 handlers duplicados); comportamento preservado.
- `MaternidadePage.tsx`: `form.medicamentos` e `form.medicamentos2`, carga de `getMedicamentosCached(fazendaId)`, seção "MEDICAMENTOS (opcional)" após PRIMEIROS CUIDADOS de cada cria, `medicamentos2` limpo ao desmarcar gêmeos, payload com `medicamentos: []` em aborto/cria morta.
- `syncService.ts`: mapeia `medicamentos` no case `'maternidade'` (fallback `[]`) para a nova coluna `registros_maternidade.medicamentos` (jsonb), criada por migration no repo do Painel Web. Cria 1 e cria 2 gravam registros separados, cada um com sua própria lista.
- Foto (18/09/2026, mesmo conjunto): `usePhotoGps({ comGps: false })` + `FotoSection` como secção "5. FOTO" antes das acções, `fotoBase64` nos dois payloads (em gêmeos, os dois registos guardam a mesma foto sob paths distintos por `registro.id`), `maternidade: 'fotos-registros'` em `FOTO_BUCKET_BY_STORE`, `limparFoto()` no sucesso e no LIMPAR. Persiste em `registros_maternidade.foto_url` (migration `20260918240000` no Painel), idêntico à Enfermaria.
- Verificado: typecheck e build do PWA limpos; fluxo manual nas duas telas (adicionar, filtrar, selecionar, editar, remover; listas independentes por cria) sem erros de console.

## Reorganização do menu de cadernetas (18/09/2026)

O menu foi reorganizado em sete grupos conforme o fluxo operacional definido: Suplementação a Pasto, Confinamento & TIP, Gado & Pastagens, Infraestrutura & Geral, Máquinas & Combustível, Materiais & Geral e Estoque (Entradas). A ordem das cadernetas dentro de cada grupo também foi ajustada para priorizar o uso esperado.

`pesagem` permanece em Gado & Pastagens. A caderneta existente `saida-insumos` permanece com seu ID, rota, permissões e sincronização, sendo exibida no grupo Suplementação a Pasto como `SAÍDA INSUMOS`. As cadernetas específicas de entrada de almoxarifado e cantina ainda não existem no PWA e não foram criadas nesta reorganização.

## Maternidade: aborto é cria morta — não entra no rebanho (18/09/2026)

**Regra de negócio**: Aborto é tratado integralmente como animal morto. A cria abortada não pede identificação (ID provisório, brinco, chip), peso, sexo, raça ou primeiros cuidados, não gera registro em `individuos` e não entra em headcount/rebanho. O mesmo vale para 2ª cria natimorta em gêmeos.

**O que foi feito** (`MaternidadePage.tsx`):
- `isAborto = problemasParto.includes('Aborto')` e `cria2Morta = gemelosNatimorto || isAborto` são as flags centrais; todas as regras de validação da cria usam `required: !isAborto` / `required: form.gemelos && !cria2Morta` (o `custom` do `useFormValidation` não roda em valor vazio — early return — então `required` calculado por render é o mecanismo correto; uma versão anterior com `custom` deixou o peso opcional sempre).
- `tipoPartoFinal` passa a incluir `'Aborto'` (antes ia só em `observacao_parto`); 2ª cria morta inclui `'Natimorto'`.
- `criarIndividuoCria` é pulado para aborto/cria2Morta (`individuoIdCria`/`individuoIdCria2` ficam `''`), e os dois payloads gravam todos os campos de cria como `null`.
- UI: a seção "3. 1ª CRIA" vira um aviso ("será registrada como abortada e não entrará no rebanho"), e o seletor VIVA/NATIMORTA da 2ª cria se esconde no aborto com aviso equivalente.
- `validateMaternidade` em `validation.ts` pula obrigatórios da cria quando `tipoParto` contém 'Aborto' (mesmo padrão que já existia para 'Natimorto').
- Resumos (`MaternidadeListaPage`, `pdfUtils`): `houveMorte` passa a contar Aborto, então nenhuma seção de cria viva é renderizada.

**Correção no banco** (migration `20260918130000_maternidade_trigger_skip_dead_cria.sql` no Painel Web, `db push`, commit `d9892b7`): o trigger `create_individual_from_maternidade()` criava um `individuos` sempre que `individuo_id_cria` era NULL — para cria morta isso violava `sexo NOT NULL` e derrubava o upsert inteiro (sync error). Agora `tipo_parto` contendo 'Aborto' ou 'Natimorto' retorna sem inserir. Efeito colateral preexistente coberto pela mesma guarda: registros de 2ª cria natimorta de gêmeos também falhariam no sync por esse trigger.

**Validação** (fazenda `d649c65e-16ab-4b77-a84b-df937aa41cc3`, Chrome DevTools): fluxo completo com Aborto + Normal, zero dados de cria → SALVAR habilitou, registro sincronizou com `tipo_parto = {Normal, Aborto}` e TODOS os campos de cria null (`peso_cria_kg`, `id_provisorio_cria`, brinco, chip, `sexo`, `raca`, `tratamento`, `individuo_id_cria`); contagem de `individuos` inalterada (9). Lista exibe "Normal, Aborto" sem seção de cria. O registro anterior de teste (`2026-999`, 07:44) ficou com cria — pré-correção.

**Disparador**: quando mencionar "aborto", "natimorto não entra no rebanho", "cria morta no rebanho", ou sync de maternidade falhando em `individuos.sexo`, lembrar que (1) a regra de morte vive em `isAborto`/`cria2Morta` na página + guarda de `tipo_parto` no trigger do banco, e (2) `required` condicional, não `custom`, é como validação condicional funciona no `useFormValidation`.

## Caderneta Pesagem: sessão cronometrada offline-first (17/09/2026)

**O que foi feito**: nova caderneta `/caderneta/pesagem` para pesagem/manejo sequencial de animais, priorizando velocidade. Fluxo: preparação (tipo de manejo + 4 checks S/N) → INICIAR dispara cronômetro → captura animal a animal com autocomplete por chip/brinco sobre o cache de indivíduos → "SALVAR E AVANÇAR" grava draft local → FINALIZAR abre modal de revisão (editar/excluir com confirmação) → "SALVAR E FINALIZAR" grava os registros e enfileira o sync. Lista em `/caderneta/pesagem/lista`.

**Implementação**:
- `PesagemPage.tsx`: sessão é um draft persistido no IndexedDB (`rascunhos`, key `pesagem-sessao-{fazendaId}`) que sobrevive a fechar o app; durante sessão ativa o Voltar pede confirmação e o rascunho continua. `salvarEFinalizar` guarda `registroId` por animal para retry idempotente (reenfileira `create`, upsert por `local_id` no sync, sem duplicar).
- Categoria do animal é filtrada pelo `destino` do lote (mesma lógica de `Lotes.tsx` do Painel) e depois pelo sexo; era IND-EA obrigatória (`0-4m` a `>36m`), idade em dias opcional.
- Infra: store `pesagem` no IndexedDB (DB_VERSION 29), `RegistroPesagem` em `types/cadernetas.ts`, validator em `validation.ts`, `TABLE_MAP`/case `pesagem`/`createRegistroPesagem` no sync, `IndividuoCache` ganhou `data_nascimento`/`lote_atual`/`idade_era` (autocomplete), entrada no menu Gado & Pastagens (`pesagem.png`), labels, display config.
- **Share**: `formatarRegistroComoTexto` tem case `pesagem` que agrupa os registros pelo mesmo `horarioInicio` e gera UM resumo da sessão (totais, animais por lote, alertas de manejo). O modal de sucesso guarda `textoShare` gerado antes de resetar a sessão. `compartilharWhatsApp` corrigido: `navigator.share` só no mobile (no desktop abria o painel do SO sem WhatsApp, e share pendente quebrava as próximas com `InvalidStateError`), fallback via clique em `<a>` + cópia para clipboard, `AbortError` não abre wa.me.

**Schema** (migration `20260916270000_caderneta_pesagem.sql` no Painel Web, `db push`, commit `3417bed`): tabela `registros_pesagem` (1 linha/animal, campos de sessão desnormalizados), `individuos.idade_era`, `individuos_categoria_check` ampliado (Bezerro/Bezerra/Boi Gordo/Tourinho/Tropa/Vaca), trigger `trg_registros_pesagem_upsert_individuo` faz upsert em `individuos` por chip/brinco + `fazenda_id` no insert sincronizado e grava `individuo_id` de volta. `origem` por tipo (compra→Compra, transf_entrada→Transferência, demais→Cadastro Manual); não altera `status` nem headcount.

**Nota RBAC**: `pesagem` precisa constar em `cadernetas_permitidas` do funcionário (lista no Painel `src/utils/cadernetas.ts`, já no master). O cache de permissões só é renovado quando `useFuncionarioAuth` roda na `Home` — usuário navegando direto ao menu vê a lista antiga por até 24h.

**Disparador**: quando mencionar "pesagem", "pesar gado", `registros_pesagem`, `idade_era`, "cronômetro da pesagem", "revisão da pesagem" ou "compartilhar não funciona", lembrar que sync só acontece após revisão/finalização e que a trigger no banco é quem faz o upsert em `individuos`.

## Foto nas cadernetas Enfermaria, Rodeio, Manutenção de Máquinas e Limpeza (16/09/2026)

**O que foi feito**: replicada a captura de foto da `MortePage` (sem as coordenadas GPS) nas 4 cadernetas. A foto fica salva no IndexedDB como `fotoBase64` (entra no texto compartilhado via `compartilharWhatsApp`, que anexa o arquivo via Web Share API), sobe para o Storage no sync e a URL pública vai para a coluna `foto_url` do registro.

**Implementação**:
- `usePhotoGps` ganhou a opção `comGps?: boolean` (default `true`). Com `comGps: false`, nenhum fluxo captura GPS, inclusive o fallback web via `handleFileInputChange`.
- Novo componente compartilhado `components/cadernetas/FotoSection.tsx` (preview, botão tirar/remover, erro, input file oculto). As 4 telas o usam como seção final antes dos botões de ação, passando `fotoBase64` no payload do `salvarRegistro` e chamando `limpar` no salvar/limpar.
- `syncService.ts`: os dois blocos duplicados de upload (morte, atividade-funcionarios) viraram o helper `uploadFotoRegistro` + mapa `FOTO_BUCKET_BY_STORE`. Buckets legados mantêm path `${fazendaId}/${registroId}/foto.jpg`; o bucket novo `fotos-registros` usa `${fazendaId}/${store}/${registroId}/foto.jpg`.
- `shareUtils.ts`: nome do arquivo anexado mudou de `foto_morte.jpg` para `foto_registro.jpg`.

**Schema** (migration `20260916260000_foto_url_cadernetas.sql` no repo do Painel Web, aplicada via `db push` e commitada em `d46c2a8`): `foto_url text` em `registros_enfermaria`, `registros_rodeio`, `registros_manutencao_maquinas`, `registros_limpeza`; bucket público `fotos-registros` com as mesmas 4 policies `authenticated` do `fotos-morte` (read/upload/update/delete).

**Nota**: os 3 arquivos `*_remote_history_placeholder.sql` (150000/160000/170000) foram removidos no mesmo commit. Eles duplicavam versions já registradas remotamente e quebravam o `db push` com PK duplicada; o version remoto se pareia com o arquivo real local.

**Pendente**: o Painel Web ainda não exibe `foto_url` dessas 4 cadernetas (só exibe a de morte/atividades).

**Disparador**: quando mencionar "foto na enfermaria/rodeio/manutenção/limpeza", `fotos-registros`, `FotoSection`, ou `comGps`, lembrar que a foto não captura GPS e que o upload usa bucket compartilhado com store no path.

## Correções no cronômetro de atividades: pausas, sessões remotas e conclusão (16/09/2026)

**Problema**: pausas nem sempre paravam o cronômetro. Causas encontradas na auditoria de `AtividadesPage.tsx` + `atividadesService.ts`:

1. **Fechava só a primeira sessão aberta**: `pausarAtividadeLocal`/`retomarAtividadeLocal`/`concluirAtividadeLocal` usavam `find((s) => !s.fimAt)`. Com duas sessões abertas (ex: af resetado a pendente pelo Painel com sessão local aberta, depois Iniciar de novo), a segunda ficava aberta e `temSessaoAberta` continuava true, tickando o cronômetro mesmo em `pausada`.
2. **Sessões remotas invisíveis**: o PWA nunca baixava `atividade_sessoes`/`atividade_imprevistos`. Sessão criada pelo atalho coletivo `iniciarAtividade` do Painel (ou outro aparelho) deixava o af `em_andamento` com cronômetro congelado em 0, e Pausar não fechava nada no servidor (sessão órfã eterna no "Trabalhando agora").
3. **Pausa normal não registrava o gap**: `pausarAtividadeLocal(af, true)` não abria sessão de pausa, então o intervalo Pausar/Retomar não entrava nem em bruto nem em produtivo, diferente do Almoço.
4. **Pausa ao abrir o modal de conclusão era redundante e frágil**: `concluirAtividadeLocal` já fecha a sessão no confirm; a flag `conclusaoPausouTimer` era setada antes do pause ter sucesso e o cancel chamava `retomarAtividadeLocal` pela flag, não pelo estado real.
5. `pausarAtividadeLocal` hardcodava `trabalhada: true, motivoPausa: null` ao fechar, corrompendo sessão de almoço aberta que fosse fechada por esse caminho.
6. RPC `get_atividades_funcionario` não retornava `justificativa`/`justificada_at`/`atrasada` (merge online sempre zerava justificativa; atrasada nunca chegava ao PWA).
7. Menores: duração sem clamp (relógio errado gera duração negativa), botões Concluir/Imprevisto sem `disabled={acting}`, Confirmar Conclusão sem guard de double-submit, contador de imprevistos não atualizava offline.

**Correções aplicadas**:

- `atividadesService.ts`: novo helper `fecharSessoesAbertas(afId)` fecha TODAS as sessões abertas preservando `trabalhada`/`motivoPausa` e com `duracao = Math.max(0, ...)`; usado por iniciar (fecha órfãs), pausar, retomar e concluir.
- **Semântica da pausa mudou** (decisão do usuário): `pausarAtividadeLocal(af, motivoPausa?)` sempre abre sessão `trabalhada=false` com motivo ('Pausa', 'Almoço'). Pausar e Almoço diferem só pelo motivo; o tempo pausado conta no bruto, não no produtivo. Efeito colateral aceito: pausa overnight infla o bruto.
- **Pull remoto**: `pullSessoesImprevistosRemotos(afIds)` roda dentro de `getAtividadesOnlineFirst` após o fetch; faz select em `atividade_sessoes`/`atividade_imprevistos` por `atividade_funcionario_id` e mescla no IndexedDB (registros `pending` locais nunca são sobrescritos; match por `id`, `local_id` ou `supabaseId`).
- `getLocalPendingMutations` passa a incluir `justificativa`/`justificadaAt` no merge; `AtividadeFuncionarioPWA` ganhou campo `atrasada`.
- **Race de conclusão**: `getAtividadesOnlineFirst` captura as mutações `pending` ANTES do fetch RPC e de novo depois, unindo os dois snapshots. Sem isso, o fetch retornava `em_andamento` do servidor antes do update `concluida` chegar; aí o `processQueue` marcava a mutação como `synced` antes do scan pós-fetch, o merge não sobrepunha nada e a UI ficava stale em "Em Andamento" mesmo com o banco já `concluida`.
- `AtividadesPage.tsx`: handlers de iniciar/pausar/retomar/concluir usam diff antes/depois (`enqueueSessoesDiff`) para enfileirar update de todas as sessões fechadas + create das abertas novas; `handlePausar(motivo)` recebe 'Pausa'/'Almoço'; removida a pausa ao abrir o modal de conclusão e o estado `conclusaoPausouTimer` (cancelar não toca em nada; o tempo de preenchimento do detalhamento conta como trabalhado); `concluindo` protege Confirmar Conclusão; Concluir/Imprevisto ganharam `disabled={acting}`; `detalhesVersion` força reload de sessões/imprevistos do card após registrar imprevisto; badge "Atrasada" em cards pendentes com `af.atrasada`; removido o guard morto `statusIndividual === 'atrasada'`.
- **Painel Web** (migration `20260916130000_get_atividades_funcionario_justificativa_atrasada.sql`, aplicada via `db push` e commitada na branch `feat/mapa-morte-pdf`): RPC passa a retornar `justificativa`, `justificada_at` e `atrasada`.

**Convenção de sync mantida**: sessões fechadas são enfileiradas como `'update'` e abertas novas como `'create'`. `'create'` em `atividade_sessoes` faz upsert por `local_id`, então sessões puxadas do servidor (que têm `local_id` NULL remoto) devem ser enfileiradas como `'update'`, nunca `'create'`, senão o upsert insere duplicata por conflito no `id`.

**Disparador**: quando mencionar "pausa não funciona", "cronômetro não para", "sessões duplas", "sessão criada pelo Painel", "tempo bruto errado", ou "justificativa não aparece", lembrar que o fechamento é por `fecharSessoesAbertas` (todas as abertas), a pausa sempre cria sessão não-trabalhada, e o pull remoto acontece em `getAtividadesOnlineFirst`.

## Estoque de suplementos: schema promovido em produção (2026-09-15)

**O que aconteceu**: 7 migrations estruturais (A a G) foram aplicadas em produção pelo Painel Web via `supabase db push`, promovendo o schema da branch `estoque-suplementos`. A branch foi deletada após a promoção.

**Impacto no PWA**:
- As funções de cache em `cadastroCache.ts` (`getSaldoInsumosCached`, `getSaldoFormulacoesCached`, `getSaldoItemByIdCached`) agora funcionam contra produção, pois as colunas `controla_estoque`, `estoque_minimo`, `custo_unitario` em `insumos` e os campos de estoque em `formulacoes` existem em produção.
- Os triggers nas tabelas de itens (`entrada_insumos_itens`, `saida_insumos_itens`, `registros_fabrica_confinamento_insumos`, `registros_suplementacao`) agora criam movimentações em `movimentacoes_estoque_suplementos` automaticamente quando o sync do PWA envia registros. O PWA não precisa escrever diretamente na tabela de movimentações.
- Os triggers legados que causavam dupla contagem foram removidos (migration G).
- `EstoquePage.tsx` e `EntradaPage.tsx` (em `estoque-insumos/`) continuam como stubs. A gestão de estoque fica no Painel Web (`EstoqueSuplementacao.tsx`). O PWA consome os saldos via cache.

**Disparador**: quando mencionar "estoque de suplementos", "movimentacoes_estoque_suplementos", `controla_estoque`, "triggers de estoque", ou "branch estoque-suplementos", lembrar que o schema foi promovido em 2026-09-15 e os triggers legados foram removidos.

## Pasto de entrada bloqueado como ocupado sem lote (14/09/2026)

**Problema**: na fazenda Jacamim, o lote "Laj- 01" estava no pasto Lajeado 2B e o usuário queria manejar para Lajeado 2C, mas o `PastagensPage` bloqueava a seleção dizendo "Este pasto está ocupado (último registro foi entrada)". O Lajeado 2C não tinha lote ativo (vazio na tabela `lotes`).

**Causa dupla**:
1. **Dados**: o lote foi movido de Lajeado 2C para Lajeado 2A via edição administrativa no Painel Web (atualizando `lotes.pasto_id` diretamente), sem criar `registros_pastagens` para essa movimentação. O `lote_pasto_historico` foi fechado corretamente (pelo trigger `trg_sync_lote_modulo`), mas o `registros_pastagens` não tem o registro de saída de Lajeado 2C, ficando stale.
2. **Código**: o `PastagensPage` fazia duas verificações em sequência para o pasto de entrada. A primeira consultava a tabela `lotes` (fonte da verdade, dizia "vazio"). A segunda consultava `registros_pastagens` via `getUltimoStatusPastoCached`, que via apenas a entrada de 05/09 sem saída correspondente, retornava `'entrada'` e bloqueava a seleção. A segunda verificação era redundante e ficava stale quando o lote era movido sem registro de pastagens.

**Correção aplicada no PWA** (`PastagensPage.tsx`): removida a verificação via `getUltimoStatusPastoCached` (linhas 458-467) e o import correspondente. A verificação via `getLotesByPastoIdCached` (tabela `lotes`, fonte da verdade) permanece como única fonte de bloqueio.

**Correção aplicada no Painel Web** (`Lotes.tsx` + migrations `20260914160100` e `20260914160200`): criada RPC `sincronizar_historico_pasto_lote_edit` que fecha o `lote_pasto_historico` aberto e abre um novo quando o pasto do lote muda na edição administrativa, espelhando a lógica do trigger `processar_movimentacao_pastagem` (incluindo `set_config('app.skip_sync_lote_modulo', 'true', true)` para evitar duplicação via `trg_sync_lote_modulo`). A RPC é chamada após o UPDATE do lote quando o `pasto_id` mudou.

**Teste** (fazenda `d649c65e-16ab-4b77-a84b-df937aa41cc3`): lote "Teste 2" movido de P20 (Módulo 2) para P30 (Módulo 1) via RPC. `lote_pasto_historico` e `lote_modulo_historico` sincronizados corretamente (P20/Módulo 2 fechados, P30/Módulo 1 abertos). Teste revertido movendo de volta para P20.

**Passivo**: 2 pastos afetados na fazenda Jacamim (Lajeado 2C e "Manejo no curral") com `registros_pastagens` stale. A correção do PWA resolve o bloqueio; os dados stale não causam mais problema.

**Disparador**: quando mencionar "pasto ocupado sem lote", "getUltimoStatusPasto", "pasto bloqueado na pastagens", ou edição de pasto do lote no Painel Web, lembrar que a fonte da verdade é `lotes.pasto_id` e a RPC sincroniza o histórico.

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

## Itens da auditoria de código (julho/2026) já resolvidos

Os itens abaixo foram identificados na auditoria de julho/2026 e já foram corrigidos no código. Listados aqui para referência; os pendentes continuam em `docs/BACKLOG.md`.

### Idempotência via `local_id` (parcialmente resolvido)

`syncService.ts:73-79` envia `local_id: registro.id` no `baseData`. `syncService.ts:644-712` chama `createRegistro*` para 18 tabelas usando `upsert` com `onConflict: 'local_id'`. Migrations `20260905200000_add_local_id_idempotencia.sql` e `20260908200000_add_local_id_confinamento.sql` adicionaram a coluna em 20 tabelas. Falta consumir a idempotência em `fabrica-confinamento`, `fabrica-confinamento-insumos`, `entrada-insumos`, `saida-insumos`, `entrada-insumos-itens`, `atividades`, `atividade-funcionarios`, `atividade-sessoes` e `atividade-imprevistos`.

### Frente 2 (Lógica de Negócio) — resolvidos

| ID | Arquivo | Evidência |
|---|---|---|
| N2 | syncService.ts:1163-1169 | `processQueue` chama `getRegistro` e remove da fila se `!registro` |
| N6 | indexedDB.ts:160-179 | `getSyncQueue` ordena por `priority`, `storeOrder` e `timestamp` |
| N10 | leituraCochoMetrics.ts:107-118 | `calcularCmsIntervalo` retorna `null` se `diasIntervalo <= 0` |
| N11 | leituraCochoMetrics.ts:237-239 | `calcularPesoVivoMedio` verifica `quantTotal === 0` antes de dividir |
| N12 | leituraCochoMetrics.ts:302-303 | `calcularMediaMsKg` verifica `diasComRegistro === 0 \|\| cabecas <= 0` |
| N13 | shareUtils.ts:128-157 | `calcularPeriodoTrato` verifica nulidade de `todosRegistros`, `dataAtual`, `dataR` |
| N14 | supplementMetrics.ts:109,130-131,167,268-273,279 | divisões protegidas por `> 0` ou `diferencaDias` mínima de 1 |
| N16 | validation.ts:393 | `validateMovimentacao` checa `numeroCabecas > maxCabecasLote` |
| N17 | useFormValidation.ts:145-154 | `min`/`max` usam `typeof value === 'number'` antes de comparar |
| N19 | syncService.ts:577 | `switch` de `registroToSupabase` possui `default: return baseData` |
| N22 | funcionarioAuthService.ts:28 | `cadernetas_permitidas` valida com `Array.isArray(...)` |
| N26 | leituraCochoMetrics.ts:211-212 | médias `dezDias` e `geral` usam `round4(...)` |
| N30 | supabaseService.ts:1319-1328 | `.insert(...).select().single()` retorna o registro completo |

### Frente 3 (Bugs de Runtime) — resolvidos

| ID | Arquivo | Evidência |
|---|---|---|
| R1 | AlmoxarifadoPage.tsx:241 | `useEffect(..., [itemEditando?.classificacao, fazendaId])` evita loop |
| R3 | ClimaPage.tsx:77 | `form.medicoes?.forEach` com optional chaining |
| R4 | EnfermariaPage.tsx:121 | `useState<FormState>(makeInitial)` lazy initializer |
| R5 | EntradaInsumosPage.tsx:208 | `clearInterval(interval)` no cleanup do `useEffect` |
| R9 | MortePage.tsx:158 | `useState<FormState>(makeInitial)` lazy |
| R10 | MovimentacaoPage.tsx:160 | `useState<FormState>(makeInitial)` lazy |
| R12 | PastagensPage.tsx:226-228 | `useEffect(..., [garantirExecucao])` com `useCallback` |
| R13 | ProblemasPage.tsx:94-95 | `useRascunhoForm({ makeInitial })` |
| R14 | RodeioPage.tsx:165-167 | `useEffect(..., [garantirExecucao])` com `useCallback` |
| R17 | SuplementacaoPage.tsx:169-171 | `useEffect(..., [garantirExecucao])` com `useCallback` |

### Frente 4 (Consistência) — resolvidos

| ID | Arquivo | Evidência |
|---|---|---|
| C1 | syncService.ts:133-166 | Os 12 campos de maternidade agora existem no schema (`types/supabase.ts:3696-3734`) |
| C3 | syncService.ts:245 | `diagnosticos` enviado e coluna existe como `Json \| null` (`types/supabase.ts:4446`) |
| C4 | syncService.ts:241,249 | `boi` e `escore_gado` confirmados no schema (`types/supabase.ts:4442/4451`) |
| C6 | syncService.ts:61 | Tabela `registros_leitura_cocho` agora existe no schema (`types/supabase.ts:3453`) |
| C7 | syncService.ts:299-310 | `lote_origem`, `destino`, `peso_vivo_atual_kg` confirmados no schema |
| C8 | syncService.ts:146 | `tipo_parto` como array suportado pelo schema `Json \| null` |
| C11 | syncService.ts:195-224 | `avaliacao_geral` como objeto confirmado no schema `Json \| null` |
| C12 | syncService.ts:227 | `equipe_nomes` enviado direto (sem `JSON.stringify`), coluna existe como `Json \| null` |

## Log de erro visível na lista de registros + eliminação de retries automáticos (RESOLVIDO 2026-09-10)

Implementadas as três frentes aprovadas para o item 3 do backlog.

**Frente 1 — Persistir erro localmente no IndexedDB:**
- Adicionado tipo `SyncError` e campo `syncError?: SyncError | null` na interface `Registro` em `types/cadernetas.ts`.
- Adicionada função `updateSyncError(store, id, syncError)` em `indexedDB.ts`.
- `updateSyncStatus` agora limpa `syncError` automaticamente quando status muda para `synced`.
- O erro persiste localmente, sobrevive a reload, não depende do Supabase. `logs_sync_errors` no Supabase continua sendo gravado para auditoria/Painel Web.

**Frente 2 — Exibir erro no card da lista:**
- Criado `utils/syncErrorMessages.ts` com tabela de tradução de ~15 códigos Postgres/Supabase/rede (42501=RLS, 23505=duplicata, 23502=not-null, network=sem conexão, etc.) e funções `translateSyncError` e `formatSyncErrorForSupport`.
- Em `ListaRegistros.tsx`, quando `syncStatus === 'error'`, o card mostra seção vermelha colapsável com mensagem amigável traduzida. Ao expandir, mostra código, mensagem original, detalhes técnicos, tentativas e data. Botão "Copiar para suporte" copia texto formatado para a área de transferência.
- O botão REENVIAR manual continua funcionando como válvula de escape para falhas transitórias.

**Frente 3 — Eliminar retries automáticos:**
- No catch de `processQueue` em `syncService.ts`, em vez de incrementar `retryCount` e recolocar na fila com backoff, o item é removido da fila, `syncStatus` é marcado como `error`, `syncError` é gravado localmente, e o erro é logado no Supabase.
- `calculateBackoffMs` foi removido (não é mais chamado). `MAX_RETRY_COUNT` em `utils/constants.ts` não é mais importado em nenhum lugar.
- Motivo: dois peões podem repetir a mesma operação em celulares diferentes; retries automáticos do que falhou causam duplicatas quando o outro peão já sincronizou.

**Débito não resolvido por essa mudança**: idempotência via `upsert` com `local_id` nas tabelas restantes (ver `docs/BACKLOG.md`). Eliminar retries encolhe a janela de risco mas não fecha o buraco.

Typecheck e build passaram.

## Idempotência via `local_id` em todas as tabelas de registros (RESOLVIDO 2026-09-10)

Completada a cobertura de idempotência nas 9 tabelas restantes. Agora todas as 27 tabelas de registros do PWA usam `upsert` com `onConflict: 'local_id'`, eliminando o risco de duplicatas quando o INSERT sucede no Supabase mas a resposta se perde (timeout, rede instável).

**Migration `20260910200000_add_local_id_restantes.sql`** (repo Painel Web, aplicada via `supabase db push`): adicionou coluna `local_id` + unique index em 7 tabelas: `registros_entrada_insumos`, `entrada_insumos_itens`, `registros_saida_insumos`, `atividade_funcionarios`, `atividade_sessoes`, `atividade_imprevistos`, `atividades`. As 2 tabelas de confinamento já tinham a coluna (migration `20260908200000`).

**Mudanças no `supabaseService.ts`**: 3 funções trocadas de `insert` para `upsert` com `onConflict: 'local_id'`: `createRegistroEntradaInsumos`, `createEntradaInsumosItem`, `createRegistroSaidaInsumos`.

**Mudanças no `syncService.ts`**: 6 cases no `syncToSupabase` trocados de `insert`/`upsert` sem onConflict para `upsert` com `onConflict: 'local_id'`: `registros_fabrica_confinamento`, `registros_fabrica_confinamento_insumos`, `atividade_funcionarios`, `atividade_sessoes`, `atividade_imprevistos`, `atividades`.

**Mudanças no `registroToSupabase`**: 5 cases que não incluíam `local_id` no payload agora incluem `local_id: registro.id`: `atividade-funcionarios`, `atividade-sessoes`, `atividade-imprevistos`, `atividades`, `entrada-insumos-itens`. Os cases `fabrica-confinamento` e `entrada-insumos` já usavam `...baseData` (que inclui `local_id`), e `fabrica-confinamento-insumos` já tinha `local_id` explícito.

Typecheck e build passaram.

## Fuso horário corrigido no PWA (C9, C10, C13) (RESOLVIDO 2026-09-10)

Três itens de fuso horário corrigidos, todos no PWA, sem impacto no Painel Web.

**C9: `todayBR()` agora usa fuso da fazenda** (`formatDate.ts`):
- Antes: `new Date()` extrai dia/mês/ano do fuso do navegador. Peão em Brasília (UTC-3) lançando às 23:30 via a data de amanhã porque Cuiabá (UTC-4) já passou da meia-noite.
- Depois: `getDateTimePartsInTimezone(new Date(), DEFAULT_FARM_TIMEZONE)` extrai dia/mês/ano no fuso de Cuiabá. `DEFAULT_FARM_TIMEZONE` movido para o topo do arquivo para evitar TDZ.
- Impacto: 36 formulários de caderneta (Pastagens, Movimentacao, Maternidade, Morte, etc.) e `DatePicker` agora pre-preenchem a data correta.

**C10: `supabaseService.ts` data de referência em fuso da fazenda**:
- 2 ocorrências de `new Date().toISOString().slice(0, 10)` trocadas por `getCurrentDateTimeInTimezone(DEFAULT_FARM_TIMEZONE).slice(0, 10)` em `getProgramacaoTratosCompleta` e `getTiposProgramacaoTratos`. Às 21:00 de Cuiabá (01:00 UTC do dia seguinte), essas funções buscavam a programação do dia errado.
- 15 ocorrências de `new Date().toISOString()` em `delete*` (gravam `deleted_at`) mantidas como estão: timestamp completo em UTC é correto para storage, o Postgres converte para display no fuso certo.
- 2 ocorrências de `dataFim.toISOString().slice(0, 10)` (linhas 2953, 2983) não corrigidas: calculam o dia seguinte a partir de um parâmetro `data` (não a data atual), e o problema de fuso nelas é diferente e mais sutil (range de consulta em UTC vs fuso da fazenda).

**C13: `api.ts` data do registro**:
- Resolvido automaticamente via C9. O `salvarRegistro` já capturava a hora no fuso da fazenda (linha 62), mas a data vinha do payload do formulário, que usa `todayBR()`. Corrigindo `todayBR()`, a data concatenada com a hora está correta.

Typecheck e build passaram.

## Controle de expediente (implementado em 2026-09-10)

Sistema de bloqueio do PWA por horário de expediente, integrado ao RBAC existente. Quando controleAcessoHabilitado = true e expedienteHabilitado = true no Redux, o PWA bloqueia acesso fora do horário configurado.

**Arquitetura:**
- configSlice.ts: adiciona expedienteHabilitado, expedienteTimezone, expedienteDias ao Redux (persistido via redux-persist).
- funcionarioAuthService.ts: adiciona expediente_override à interface FuncionarioRBAC e ao cache IndexedDB.
- useExpediente.ts (novo hook): valida horário no timezone da fazenda usando Intl.DateTimeFormat. Suporta turno noturno (fim < início). Re-verifica a cada 60s e em visibilitychange.
- Home.tsx: tela de bloqueio por fora de expediente (z-index 60, distinta da tela de PIN). Logout automático quando expediente acaba. Revalidação em sync manual, sync automático (SW), interval de 10min, e visibilitychange.

**Hierarquia de bloqueio:** fora de expediente > app lock por inatividade > login inicial. A tela de fora de expediente tem prioridade e suprime as outras.

Disparador: quando mencionar "expediente", "horário de atividade", "bloqueio por horário", expedienteHabilitado, expedienteDias, expediente_override, useExpediente, ler esta seção.

## LeituraCochoPage lê registros_oferta_trato em vez de registros_suplementacao (RESOLVIDO 10/09/2026)

**Problema**: a tela de Leitura de Cocho mostrava KG COCHO como "—" para todos os currais ativos, mesmo havendo 16 registros de trato de confinamento lançados no dia 2026-09-09 para os 4 lotes ativos (A, B, C, D). A causa: a página importava `getRegistrosSuplementacaoByLoteCached`, que lê `registros_suplementacao` (tabela de pasto), quando deveria ler `registros_oferta_trato` (tabela de curral/confinamento).

**Correção aplicada** (commit `a09cfc3`):
1. `supabaseService.ts`: adicionada `getRegistrosOfertaTratoByLote(fazendaId, loteId)` que consulta `registros_oferta_trato` por `lote_id` com `deleted_at IS NULL`, ordenada por `data desc` e `ordem_trato asc`.
2. `cadastroCache.ts`: adicionada `getRegistrosOfertaTratoByLoteCached(fazendaId, loteId)` com fallback offline via cache em memória.
3. `LeituraCochoPage.tsx`: trocado o import e a chamada de `getRegistrosSuplementacaoByLoteCached` para `getRegistrosOfertaTratoByLoteCached`. Os registros são mapeados (`kg_ofertado_real` -> `kg_cocho`) antes de passar para `calcularCmsPorJanelas`. A busca da formulação via `curralInfo.formulacao_id` foi mantida, já que `registros_oferta_trato` não armazena o nome da formulação.

**Validação** (fazenda `d649c65e-16ab-4b77-a84b-df937aa41cc3`): KG COCHO passou a mostrar 1.200 (A1), 637 (B1), 537 (C1) e 700 (D1), somatórios dos 4 tratos de cada curral no dia 2026-09-09.

Disparador: quando mencionar "Leitura de Cocho", "KG COCHO", "kg cocho", `registros_oferta_trato` vs `registros_suplementacao`, `getRegistrosOfertaTratoByLote`, ler esta secao.

## Cabeças após óbito no texto compartilhado da MortePage (RESOLVIDO 10/09/2026)

**Problema**: o texto gerado por `shareUtils.ts` para a caderneta de morte não informava quantas cabeças restaram no lote após a morte do animal, deixando o destinatário sem contexto do impacto no plantel.

**Correção aplicada** (commit `63340f5`):
1. `MortePage.tsx`: ao salvar, `registroSalvo` agora inclui `n_cabecas_apos_obito = detalhesLote.n_cabecas - 1` (contagem antes do óbito menos 1).
2. `shareUtils.ts`: no bloco da caderneta `morte`, após as linhas de PASTO/CURRAL e LOTE, adicionada a linha `CABEÇAS APÓS ÓBITO: *X*` quando o campo está presente.

Disparador: quando mencionar "cabeças após óbito", "morte compartilhamento", `n_cabecas_apos_obito`, ler esta secao.

## Equipe no manejo da Movimentação + nomes no texto compartilhável (implementado em 2026-09-10)

**Funcionalidade** (commit `c3f6f94`): a MovimentacaoPage ganhou uma seção opcional "EQUIPE NO MANEJO" onde o peão informa quantas pessoas participaram (1 a 5) e seleciona cada uma via `SearchableModal` alimentado por `funcionariosDisponiveis` do `cadastroCache`. Os nomes selecionados são persistidos em `equipeNomes` e incluídos no texto compartilhável gerado por `shareUtils.ts` (bloco `EQUIPE NO MANEJO` com `N° PESSOAS` e `PESSOAS`).

**PWA (`MovimentacaoPage.tsx`)**: rádio `equipe` (1 a 5) revela um `SearchableModal` por pessoa, com `options={funcionariosDisponiveis}`, `placeholder="Buscar funcionário..."`, seguindo o mesmo padrão de `RodeioPage.tsx`. Quando não há funcionários em cache, cai em fallback de `Input` livre. `equipeNomes` é validado: se `equipe > 0`, todos os nomes são obrigatórios.

**`shareUtils.ts`**: no bloco da caderneta `movimentacao`, após `CAUSA/OBSERVAÇÃO`, adicionada a seção `EQUIPE NO MANEJO` com `N° PESSOAS` e `PESSOAS` (nomes separados por vírgula) quando `registro.equipe` é maior que zero.

Disparador: quando mencionar "equipe no manejo", "pessoas no manejo", `equipeNomes`, `equipe` em movimentação, ler esta seção.

## Tipo de registro (Curativo/Preventivo) na Enfermaria + label duplicado removido do PDF de bebedouros (implementado em 2026-09-10)

**Funcionalidade** (commit `f35ba7b`): a EnfermariaPage ganhou um campo obrigatório `TIPO` com opções `CURATIVO` e `PREVENTIVO` via componente `Radio`, no início da seção "3. TRATAMENTOS" (renomeada de "3. TRATAMENTO"). O valor é persistido em `tipoRegistro`, enviado ao Supabase como `tipo_registro`, e incluído no texto compartilhável como `TIPO: *Curativo*` ou `TIPO: *Preventivo*`.

**PWA (`EnfermariaPage.tsx`)**: `tipoRegistro: string` adicionado a `FormState` e `makeInitial`. `validationRules.tipoRegistro = { required: true }`. `salvarRegistro` inclui `tipoRegistro` no payload. O `Radio` usa `name="tipoRegistro"` com `gridCols={2}`.

**`syncService.ts`**: no case `enfermaria` de `registroToSupabase`, adicionado `tipo_registro: registro.tipoRegistro || null`. A coluna `tipo_registro` já existia no banco (text nullable) mas não estava mapeada no sync nem nos tipos locais; ambos foram corrigidos.

**`pdfUtils.ts`**: removida a linha `labelValue('Total de inspeções:', String(totalInspecoes))` do PDF de resumo de bebedouros, que duplicava a informação já presente em "Bebedouros inspecionados" e confundia o leitor (o "total de inspeções" contava registros, não bebedouros).

Disparador: quando mencionar "tipo de registro", "Curativo/Preventivo", `tipoRegistro`, `tipo_registro` em enfermaria, "label duplicado bebedouros", "total de inspeções PDF", ler esta seção.

## Sync e schema da equipe no manejo da Movimentação (RESOLVIDO 12/09/2026)

**Problema**: a funcionalidade de equipe no manejo (commit `c3f6f94`, 10/09/2026) estava visível no PWA mas não persistia no Supabase. O `syncService.ts` não mapeava `equipe` e `equipe_nomes` no case `movimentacao`, a tabela `registros_movimentacao` não tinha as colunas correspondentes, e os tipos TypeScript locais (`types/supabase.ts` e `types/cadernetas.ts`) não declaravam os campos.

**Causa raiz**: a feature foi implementada apenas na camada de UI (formulário e `shareUtils`), sem propagar para as camadas de sync, schema e tipos. O mesmo padrão já funcionava em `registros_rodeio` (`equipe integer`, `equipe_nomes jsonb`), mas não foi replicado em `registros_movimentacao`.

**Correção aplicada**:

1. **Migration** `20260912120000_add_equipe_movimentacao.sql` (repo Painel Web, aplicada via `supabase db push`, commit `d07927e`): adicionou `equipe integer` e `equipe_nomes jsonb` (ambas nullable) em `registros_movimentacao`, mesmos tipos de `registros_rodeio`.

2. **`syncService.ts`** (case `movimentacao` de `registroToSupabase`): adicionado `equipe: registro.equipe ? Number(registro.equipe) : null` e `equipe_nomes: registro.equipeNomes || null` no payload enviado ao Supabase.

3. **`types/supabase.ts`**: adicionados `equipe` e `equipe_nomes` em `Row`, `Insert` e `Update` de `registros_movimentacao`. Aproveitado para adicionar `tipo_registro` em `Row`, `Insert` e `Update` de `registros_enfermaria` (coluna já existia no banco mas faltava nos tipos locais).

4. **`types/cadernetas.ts`**: adicionados `equipe: number | null` e `equipeNomes: string[]` em `RegistroMovimentacao`, e `tipoRegistro: string | null` em `RegistroEnfermaria`.

**Validação** (fazenda `d649c65e-16ab-4b77-a84b-df937aa41cc3`): registro de Entrada criado no PWA com equipe=2 e nomes=["Victor Hugo", "Camila"] selecionados via `SearchableModal`. Sync enviou os campos, Supabase confirmou `equipe=2` e `equipe_nomes=["Victor Hugo","Camila"]` na linha em `registros_movimentacao`. Registro de teste removido após validação.

Typecheck e build do PWA passaram.

Disparador: quando mencionar "equipe no manejo sync", `equipe` em `registros_movimentacao`, `equipe_nomes` em movimentação, "sync equipe movimentação", ler esta seção.

## Itens da Cantina com classificacao e unidade de medida (13/09/2026)

**Problema**: a CantinaPage usava itens_supermercado (tabela sem classificacao) para selecionar alimentos. O usuario queria o mesmo padrao do AlmoxarifadoPage: primeiro selecionar uma classificacao, depois o item, com unidade de medida definida no cadastro.

**Solucao aplicada**:

1. **Migration** 20260913120000_create_itens_cantina_table.sql (repo Painel Web): criou tabela itens_cantina com 
ome, classificacao (CHECK: Pereciveis, Nao Pereciveis, Bebidas, Limpeza/Higiene, Hortifruti, Carnes), unidade_medida (CHECK: kg, g, L, mL, Unidade, Pacote), tivo, deleted_at, RLS e indexes. Aplicada via supabase db push.

2. **Backfill** (via MCP, pontual): 23 itens migrados de itens_supermercado para itens_cantina, mapeando Unidades->Unidade e Pacotes->Pacote, com classificacao padrao Nao Pereciveis. itens_supermercado nao foi droppada (pendente de validacao e autorizacao do usuario).

3. **Painel Web** (CadastrosAuxiliares.tsx): adicionada tab itens-cantina com campos nome, classificacao (select) e unidade_medida (select).

4. **PWA** (supabaseService.ts): adicionadas getClassificacoesCantina e getItensCantina(fazendaId, classificacao?).

5. **PWA** (cadastroCache.ts): adicionadas getClassificacoesCantinaCached e getItensCantinaCached com cache lazy, fase de warmup cantina no phaseOrder, e item Classificacoes Cantina no preload de extras.

6. **PWA** (CantinaPage.tsx): substituida selecao flat de itens por classificacao -> item (mesmo padrao do AlmoxarifadoPage). Input de quantidade adaptativo: decimal para kg/g/L/mL, inteiro para Unidade/Pacote. Label da quantidade mostra a unidade (ex: QUANTIDADE (Pacote)).

**Validacao** (fazenda d649c65e-16ab-4b77-a84b-df937aa41cc3): fluxo completo testado via Chrome DevTools. Selecao de classificacao Nao Pereciveis carregou 3 itens (Arroz/Pacote, Carne Bovina/kg, Ovos/Unidade). Item Arroz adicionado com quantidade 5 (inteiro), item Carne Bovina adicionado com quantidade 2.5 (decimal). Itens ja adicionados aparecem desabilitados no seletor. Display do item mostra nome, classificacao, quantidade e unidade.

Disparador: quando mencionar itens_cantina, classificacao de alimentos da cantina, unidade de medida na cantina, getClassificacoesCantina, getItensCantina, ler esta secao.

## Isolamento do cache do mapa por fazenda (24/09/2026)

**Problema**: em logins de outra fazenda no mesmo dispositivo, o mapa exibia as geometrias da fazenda anterior. `loadMapaFazenda()` usava a chave única `mapa_fazenda` no IndexedDB e `MapaFazendaPage` renderizava o cache sem conferir o `fazendaId` da sessão.

**Correção** (`frontend/src/services/mapaCache.ts`):

- Chave do cache namespacada: `mapa_fazenda_<fazendaId>`; `loadMapaFazenda(fazendaId)` exige o id e retorna null se o conteúdo for de outra fazenda (sanity check em `data.fazendaId`).
- Chave legada `mapa_fazenda` purgada uma vez por sessão (`purgeLegacyCache`).
- `mapaPrecisaAtualizar`: cache ausente ou de outra fazenda agora conta como "precisa sincronizar" quando há versão no servidor; antes, fazenda sem linha em `mapa_versao` retornava `false` e servia o cache errado mesmo online.
- `syncMapaSePreciso` e `MapaFazendaPage` passam `fazendaId` em todas as chamadas de `loadMapaFazenda`.

A mudança acompanha hardening no banco (repo Painel Web, migration `20260924160000_isolamento_tenant_mapa.sql`): todas as RPCs de mapa/routing passaram a validar o vínculo do chamador via `caller_has_fazenda_access`, `mapa_versao` deixou `USING(true)`, e `mapa_estradas_vertices_pgr` ganhou RLS sem policies + REVOKE de grants.

Typecheck (`npx tsc --noEmit`) passou.

Disparador: quando mencionar "mapa de outra fazenda", "geometria errada no mapa", "cache do mapa", `mapa_fazenda` no IndexedDB, `caller_has_fazenda_access`, ler esta seção.
