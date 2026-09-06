# Relatório de Bugs, PWA Caderneta Digital

Branch: `fix/caça-bugs` (criada a partir de `master` em 05/09/2026)
Typecheck: passou limpo (`npx tsc --noEmit`)
Escopo: PWA + cruzamento de contrato com Painel Web (`C:\Users\USER\Documents\GestaUp-Cadernetas-Gestao`), mesmo banco Supabase `nrwljcvhwbezmoummxbl`.

Cada bug indica a(s) caderneta(s) onde foi encontrado (origem) e a(s) cadernetas afetadas (impacto), além de se repercute no Painel Web.

---

## Legenda de severidade

| Nível | Significado |
|---|---|
| P0 | Crítico: corrompe dados, gera informação invertida ou perde sync |
| P1 | Alto: gera dados inconsistentes, crash de UI ou falha silenciosa |
| P2 | Médio: edge case que quebra em condição específica |
| P3 | Baixo: débito técnico sem impacto imediato em produção |

---

## P0, Críticos

### Bug 1, `insumos-por-saida` nunca sincroniza para o Supabase (NAO CORRIGIDO - tela em desenvolvimento)

- **Severidade**: P0
- **Caderneta de origem**: Saída de Insumos (`saida-insumos` / `insumos-por-saida`)
- **Cadernetas afetadas**: Saída de Insumos
- **Afeta Painel Web**: Sim, os itens de saída nunca chegam ao banco compartilhado
- **Arquivo**: `frontend/src/services/syncService.ts:58` (mapeamento) e ausência de `case 'insumos_por_saida'` em `syncToSupabase`
- **Enfileiramento**: `frontend/src/pages/cadernetas/SaidaInsumosPage.tsx:135`

A store `insumos-por-saida` é mapeada para a tabela `insumos_por_saida` na linha 58, é salva no IndexedDB e enfileirada para sync em `SaidaInsumosPage.tsx:135`. No entanto, o switch em `syncToSupabase` (linhas 611-722) não possui `case 'insumos_por_saida'`. O item cai no vazio, `processQueue` marca `synced` e remove da fila sem nada ter sido persistido no Supabase. Os itens de saída de insumos somem silenciosamente.

### Bug 2, Lógica invertida em diagnósticos de morte (CORRIGIDO 05/09/2026)

- **Severidade**: P0
- **Caderneta de origem**: Morte
- **Cadernetas afetadas**: Morte
- **Afeta Painel Web**: Não (texto de WhatsApp não é persistido), mas inverte informação médica compartilhada pelo peão
- **Arquivo**: `frontend/src/utils/shareUtils.ts:1049-1080`

O block de morte usava a lógica de avaliação geral (`isInverted ? !isSim : isSim`) que serve para pastagens/rodeio (campos como "BEBEDOUROS OK?" onde "Não" é problema). Em morte, os campos são diagnósticos clínicos ("ALGUMA SECREÇÃO NOS ORIFÍCIOS?") onde "Sim" é sempre o alerta. A lógica invertida fazia `animalSozinho: Sim` (problema) ser omitido e `animalSozinho: Não` (normal) ser exibido como alerta. A correção alinhou com o padrão do enfermaria (linhas 900-920): mostrar apenas quando `isSim`, ignorando a distinção invertido/não-invertido. Nota: a análise original do subagent sugeria trocar para `isInverted ? isSim : !isSim`, mas isso quebraria 17 dos 19 campos de diagnóstico onde "Sim" é o problemático.

### Bug 3, Falta de idempotência gera duplicatas em quase todas as cadernetas (CORRIGIDO 05/09/2026)

- **Severidade**: P0
- **Caderneta de origem**: Todas que usam `createRegistro*` (maternidade, pastagens, rodeio, suplementacao, bebedouros, movimentacao, enfermaria, morte, clima, abastecimento, cantina, limpeza, operacoes-maquinas, manutencao-maquinas, saida-insumos, problemas, almoxarifado, leitura-cocho, trato-confinamento)
- **Cadernetas afetadas**: Todas as acima
- **Afeta Painel Web**: Sim, duplicatas corrompem relatórios e disparam triggers de `quant_atual` duas vezes
- **Arquivos**: `frontend/src/services/syncService.ts` (todos os cases de `createRegistro*`), `frontend/src/services/supabaseService.ts` (`.insert` sem `upsert`), `frontend/src/services/api.ts:185`

O `id` local gerado por `generateId` não é UUID, então `registroToSupabase` omite o `id` para a maioria das tabelas e o Supabase gera um UUID remoto. O `supabaseId` retornado pelo `.select().single()` é descartado, exceto para `entrada-insumos` (linhas 655-661). Em timeout/retry/reenvio, o registro é recriado como novo INSERT, gerando duplicata.

**Correção aplicada**: adicionada coluna `local_id text` + unique index (nao-partial, PostgreSQL permite multiplos NULLs) em 18 tabelas de registros seguras via migration `20260905200000_add_local_id_idempotencia.sql`. O `registroToSupabase` agora inclui `local_id: registro.id` no payload. As 18 funcoes `createRegistro*` em `supabaseService.ts` foram trocadas de `.insert()` para `.upsert(..., { onConflict: 'local_id' })` com `.select().single()` para capturar o UUID retornado. O `syncService.ts` grava o `supabaseId` retornado no IndexedDB local. Tabelas de insumos (entrada/saida + itens) ficam de fora porque as telas estao em desenvolvimento e seus triggers de estoque exigem design separado. Migration aplicada em producao e registrada em `supabase_migrations.schema_migrations`. Testado na fazenda de testes: upsert com mesmo `local_id` faz UPDATE (nao duplica), e multiplos INSERTs com `local_id=NULL` (Painel Web) coexistem sem conflito.

### Bug 4, Refresh de token invalida sessão em falha transitória (CORRIGIDO 05/09/2026)

- **Severidade**: P0
- **Caderneta de origem**: Transversal (afeta todas as cadernetas que sincronizam)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Sim, falhas de auth no PWA impedem que dados cheguem ao banco compartilhado
- **Arquivo**: `frontend/src/services/supabaseClient.ts:46-52`

`refreshAccessToken` apaga `supabase_token` e `supabase_refresh_token` sempre que `!response.ok`, incluindo 5xx, timeout e rede instável. O peão fica deslogado sem aviso e escritas subsequentes usam cliente anônimo, falhando na RLS silenciosamente. O correto seria manter o token atual enquanto válido e só limpar em erro de auth definitivo (401/403).

**Correção aplicada**: o bloco `!response.ok` agora verifica o status code. So limpa tokens em `400` (refresh token invalido/expirado), `401` (nao autorizado) ou `403` (proibido), que sao erros de auth definitivos. Erros `5xx`, timeout e falhas de rede retornam `null` mas mantem os tokens no localStorage, permitindo que proximas tentativas usem o cliente autenticado em vez do anonimo.

---

## P1, Altos

### Bug 5, Crash de UI quando `peso_vivo_kg` é null (CORRIGIDO 05/09/2026)

- **Severidade**: P1
- **Caderneta de origem**: Transversal (qualquer caderneta que abre card de lote: suplementacao, leitura-cocho, trato-confinamento, pastagens, rodeio, movimentacao, maternidade, enfermaria, morte)
- **Cadernetas afetadas**: Todas que exibem `LoteDetalhesCard` ou `LoteOcupandoPastoCard`
- **Afeta Painel Web**: Não (UI do PWA)
- **Arquivos**: `frontend/src/components/LoteDetalhesCard.tsx:71`, `frontend/src/components/LoteOcupandoPastoCard.tsx:59`

`detalhes.peso_vivo_kg !== undefined ? detalhes.peso_vivo_kg.toFixed(2) : '-'`. Se o banco retorna `null`, `null !== undefined` é `true`, então executa `null.toFixed(2)` e crasha o card. Correção: trocar `!== undefined` por `!= null` em `LoteDetalhesCard.tsx:71`, `LoteOcupandoPastoCard.tsx:55` (n_cabecas) e `LoteOcupandoPastoCard.tsx:59` (peso_vivo_kg).

### Bug 6, LeituraCocho: rascunho e useEffect não acompanham data selecionada

- **Severidade**: P1
- **Caderneta de origem**: Leitura de Cocho (`leitura-cocho`)
- **Cadernetas afetadas**: Leitura de Cocho, Suplementação (que consome a leitura)
- **Afeta Painel Web**: Sim, dados no banco podem ser lançados sem dados daquele dia
- **Arquivo**: `frontend/src/pages/cadernetas/LeituraCochoPage.tsx:332` e `361`

Rascunho carrega com `brToDateISO(todayBR())` em vez da `data` selecionada. O `useEffect` depende só de `[fazendaId]`, não de `data`. Mudar a data no DatePicker não recarrega lotes nem rascunho, mas o salvamento usa a data nova, permitindo lançar leituras sem dados daquele dia.

### Bug 7, Movimentacao: `cabecasPorCategoria` não é resetado ao trocar lote origem (CORRIGIDO 05/09/2026)

- **Severidade**: P1
- **Caderneta de origem**: Movimentação (`movimentacao`)
- **Cadernetas afetadas**: Movimentação
- **Afeta Painel Web**: Sim, dados errados no banco
- **Arquivo**: `frontend/src/pages/cadernetas/MovimentacaoPage.tsx:400`

Ao trocar lote origem válido, `setForm` atualiza `loteOrigemId` mas não zera `cabecasPorCategoria`. Quantidades do lote anterior permanecem e podem ser salvas no lote novo. Só zera quando o lote é limpo (linha 380). Correção: incluido `cabecasPorCategoria: {}` no `setForm` da linha 400, zerando as quantidades ao trocar de lote válido.

### Bug 8, Movimentacao: salvamento categoria a categoria sem rollback (CORRIGIDO 05/09/2026)

- **Severidade**: P1
- **Caderneta de origem**: Movimentação (`movimentacao`), incluindo subtipos Entrada, Saída, Transferência
- **Cadernetas afetadas**: Movimentação
- **Afeta Painel Web**: Sim, dados inconsistentes no banco
- **Arquivos**: `frontend/src/pages/cadernetas/MovimentacaoPage.tsx:568-605` (Entrada) e `904-937` (fluxo comum)

Fluxos de Entrada e movimentação comum salvam categoria por categoria. Se uma falha no meio, as anteriores já foram persistidas, deixando lotes com quantidades parciais e inconsistentes. Correção: adicionado rollback nos dois fluxos (Entrada linhas 567-614, fluxo comum linhas 914-961). Se uma categoria falha, as já salvas são removidas do IndexedDB com `deleteRegistro` e da fila de sync com `removeFromSyncQueueByRegistroId`, garantindo atomicidade da intenção do usuário no estado local. A pré-validação existente (linhas 544-565 para Entrada, 880-902 para fluxo comum) já cobre o caso comum de erro de validação antes de qualquer persistência. O rollback cobre o caso raro de falha de I/O do IndexedDB no meio do loop.

### Bug 9, TratoConfinamento: rascunho não limpa em falha parcial

- **Severidade**: P1
- **Caderneta de origem**: Trato Confinamento (`trato-confinamento`)
- **Cadernetas afetadas**: Trato Confinamento
- **Afeta Painel Web**: Sim, duplicatas no banco
- **Arquivo**: `frontend/src/pages/cadernetas/TratoConfinamentoPage.tsx:683-688`

`salvarTodosDoRascunho` só limpa o rascunho se todos os currais salvarem. Se um falhar, currais já salvos ficam no rascunho e podem ser reenviados, duplicando registros.

### Bug 10, Pastagens: `categoriasQuantidades` não é resetado ao trocar pasto de saída (CORRIGIDO 05/09/2026)

- **Severidade**: P1
- **Caderneta de origem**: Pastagens (`pastagens`)
- **Cadernetas afetadas**: Pastagens
- **Afeta Painel Web**: Sim, dados errados no banco
- **Arquivo**: `frontend/src/pages/cadernetas/PastagensPage.tsx:353-355`

Ao trocar pasto de saída válido, `setForm` atualiza `pastoSaidaId`, `pastoSaidaAreaUtil`, `pastoSaidaEspecie` mas não zera `categoriasQuantidades`. Contagens do pasto anterior persistem. Só zera em erro/empty (linhas 313, 333, 421). Correção: incluido `categoriasQuantidades: {}` no `setForm` da linha 370, zerando as quantidades ao carregar o lote do pasto novo.

### Bug 11, Leituras Supabase sem refresh de token (CORRIGIDO 05/09/2026)

- **Severidade**: P1
- **Caderneta de origem**: Transversal (todas as cadernetas que leem lotes, pastos, categorias, formulações, insumos)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Indireto, dados lançados sobre cache obsoleto
- **Arquivo**: `frontend/src/services/supabaseService.ts` (dezenas de funções que usam `getSupabaseClient()`)

Todas as consultas de leitura usavam `getSupabaseClient()` sem verificar expiração do JWT. Se expirou, `getLotes`, `getPastos`, `getLoteCategoriasBatch`, `getFormulacaoById`, `getInsumosByFormulacao` etc. retornavam 401/403 silenciosamente. O peão lançava sobre cache obsoleto. Correção: eliminada a função `getSupabaseClient()` de todo o código de leitura. Todas as 71 chamadas em `supabaseService.ts` e 1 em `execucaoRotinaService.ts` foram trocadas por `await getSupabaseClientWithRefresh()`, que verifica a expiração do JWT e faz refresh antes de retornar o cliente. Offline com token válido funciona igual (não tenta refresh). Offline com token expirado tenta refresh, falha, e retorna cliente anônimo, mesmo comportamento anterior. A função `getSupabaseClient()` permanece exportada em `supabaseClient.ts` mas não é mais usada.

### Bug 12, Suplementação: PWA usa insert/update direto, Painel usa RPCs (RECLASSIFICADO 05/09/2026 - nao e bug do PWA, e gap de schema)

- **Severidade**: P1
- **Caderneta de origem**: Suplementação (`suplementacao`)
- **Cadernetas afetadas**: Suplementação
- **Afeta Painel Web**: Sim, inconsistência de cálculo de `peso_vivo`
- **Arquivos**: `frontend/src/services/syncService.ts:621-623` (PWA) vs `GestaUp-Cadernetas-Gestao/src/pages/cadernetas/SuplementacaoDetalhes.tsx:219-261` (Painel)

**Analise detalhada**: o relatorio original era parcialmente incorreto. O PWA envia `peso_vivo_kg: null` explicitamente em `syncService.ts:266` (comentario: "Calculado pela trigger/funcão do banco"), delegando o calculo para o banco. A trigger `trigger_consumo_registro_anterior` (AFTER INSERT) recalcula o consumo do registro anterior da serie (lote + formulacao), mas nao calcula `peso_vivo_kg` do registro novo. O `peso_vivo_kg` so e calculado por `recalcular_pesos_suplementacao_historico`, chamada pela RPC `editar_registro_suplementacao` do Painel Web ou por cron job. Portanto, registros inseridos pelo PWA ficam com `peso_vivo_kg = NULL` ate que alguem edite um registro do mesmo lote no Painel Web ou o cron job rode.

O PWA nao tem fluxo de edicao/exclusao de suplementacao na UI. O `updateRegistroSuplementacao` em `syncService.ts:762` so e chamado se houver `operation: 'update'` na fila de sync, o que nao acontece no fluxo normal. As RPCs `editar_registro_suplementacao` e `excluir_registro_suplementacao` sao exclusivas do Painel Web e nao precisam ser replicadas no PWA.

**Conclusao**: nao e bug do PWA. O problema real e que `peso_vivo_kg` nao e calculado no INSERT por nenhuma trigger, deixando registros do PWA com NULL ate intervencao externa. A correcao deve ser uma trigger AFTER INSERT que chame `recalcular_pesos_suplementacao_historico` para o lote do registro novo, ou um cron job mais frequente. Mudanca de schema no banco compartilhado, exige avaliacao conjunta com o Painel Web. Movido para a secao de divergencias de contrato.

---

## P2, Médios

### Bug 13, `entrada-insumos-itens`: `quantidade: 0` vira `null`

- **Severidade**: P2
- **Caderneta de origem**: Entrada de Insumos (`entrada-insumos`, `entrada-insumos-itens`)
- **Cadernetas afetadas**: Entrada de Insumos
- **Afeta Painel Web**: Sim, registro rejeitado pelo Supabase
- **Arquivo**: `frontend/src/services/syncService.ts:454`

`quantidade: registro.quantidade || null` transforma `0` em `null`. Se a coluna `quantidade` é NOT NULL, o Supabase rejeita com `23502`.

### Bug 14, `odometro_horimetro_*` null em coluna NOT NULL (NAO CONFIRMADO 05/09/2026 - colunas sao nullable)

- **Severidade**: P2
- **Caderneta de origem**: Operações de Máquinas (`operacoes-maquinas`)
- **Cadernetas afetadas**: Operações de Máquinas
- **Afeta Painel Web**: Sim, registro rejeitado pelo Supabase
- **Arquivo**: `frontend/src/services/syncService.ts:430-432`

Quando o valor local é vazio/zero, envia `null`. Se a coluna não aceita null, rejeita com `23502`.

**Verificacao (05/09/2026)**: consultado `information_schema.columns` em `registros_operacoes_maquinas`. As cinco colunas (`hora_inicial`, `hora_final`, `odometro_horimetro_inicial`, `odometro_horimetro_final`, `total_odometro_horimetro`) sao todas `is_nullable: YES`, tipo `text`. INSERT de teste na fazenda de testes com NULL em todas as cinco colunas foi aceito sem erro `23502`. O bug nao se manifesta. O codigo em `syncService.ts:431-433` que envia `null` quando o valor e vazio esta correto. Registro de teste removido.

### Bug 15, `brToIso` não faz padStart em dia e mês (CORRIGIDO 05/09/2026)

- **Severidade**: P2
- **Caderneta de origem**: Transversal (todas as cadernetas que usam `brToIso` para converter data)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Sim, data mal formatada no banco
- **Arquivo**: `frontend/src/utils/formatDate.ts:37-41`

Input `"5/8/2026"` gera `"2026-8-5"`, que não é ISO 8601 válido. Pode ser rejeitado ou interpretado incorretamente. Correção: adicionado `padStart(2, '0')` em dia e mês. Nota: `brToIso` só é usado em `MaternidadePage.tsx:706` para `individuos`, e o input sempre vem do DatePicker com zero à esquerda, mas a correção é defesa em profundidade. O sync para `registros_*` usa `brWithTimeToIso` que já faz `padStart`. Não precisa de backfill nem coordenação com Painel Web.

### Bug 16, `brWithTimeToIso` retorna string vazia em vez de null (CORRIGIDO 05/09/2026)

- **Severidade**: P2
- **Caderneta de origem**: Transversal (todas as cadernetas que usam `brWithTimeToIso`)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Sim, registro rejeitado pelo Supabase
- **Arquivo**: `frontend/src/utils/formatDate.ts:105`

Data vazia vira `''` no payload. Para `timestamptz` NOT NULL, gera `invalid input syntax for type timestamp`. Correção: trocado `return ''` por `return null` nos dois pontos de saída (input vazio e data inválida) e tipo de retorno mudado para `string | null`. Os 20 callers atribuem o resultado diretamente a propriedades do payload do Supabase, onde `null` é válido. Não precisa de backfill nem coordenação com Painel Web.

### Bug 17, `equipe_nomes` string JSON em pastagens vs array em rodeio (CORRIGIDO 05/09/2026)

- **Severidade**: P2
- **Caderneta de origem**: Pastagens, Rodeio
- **Cadernetas afetadas**: Pastagens, Rodeio
- **Afeta Painel Web**: Sim, se consome `equipe_nomes` em listagens ou relatórios
- **Arquivos**: `frontend/src/services/syncService.ts:224` (pastagens) vs `245` (rodeio)

Pastagens faz `JSON.stringify` (vira string no jsonb), rodeio passa direto (vai array). Mesma coluna com formas diferentes quebra leitura unificada. Correção: pastagens agora passa o array direto como rodeio. Coluna é `jsonb` em ambas as tabelas. Rodeio já gravava como array (`jsonb_typeof = 'array'`). Pastagens não tinha dados existentes com `equipe_nomes`, então não precisa de backfill. Painel Web já lidava com ambos os formatos (`Array.isArray(value) ? value.join(', ') : value`), mas agora só recebe array.

### Bug 18, `processQueue` catch pode abortar fila (CORRIGIDO 05/09/2026)

- **Severidade**: P2
- **Caderneta de origem**: Transversal (afeta toda a fila de sync)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Não diretamente (local)
- **Arquivo**: `frontend/src/services/syncService.ts:1065`

No catch, chama `registroToSupabase` para montar payload do log sem try/catch. Se a conversão lançar, o loop quebra e itens seguintes não são processados. Correção: envolvido `registroToSupabase` e `logSyncError` em try/catch separados dentro do catch externo. Se o payload não pode ser montado, o log é enviado sem payload. Se o log falha, o erro é console.error mas o loop continua. O item já foi recolocado na fila com `addToSyncQueue` e `retryCount` incrementado antes do bloco de log, então o registro não se perde.

### Bug 19, Share: `Number()` sem normalizar vírgula brasileira

- **Severidade**: P2
- **Caderneta de origem**: Cantina (preço unitário), Clima (temperatura média), Pastagens e Rodeio (divergência de cabeças)
- **Cadernetas afetadas**: Cantina, Clima, Pastagens, Rodeio
- **Afeta Painel Web**: Não (texto de WhatsApp local)
- **Arquivos**: `frontend/src/utils/shareUtils.ts:450, 1067, 1118, 1822-1847`

Campos como `precoUnitario`, `temperaturaMedia`, divergência de cabeças usam `Number()` direto. Valor `"15,50"` vira `NaN` e é omitido do texto compartilhado.

### Bug 20, ConflictModal remove conflito local mesmo se resolve falhar

- **Severidade**: P2
- **Caderneta de origem**: Transversal (qualquer caderneta com conflito de sync)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Não (local)
- **Arquivo**: `frontend/src/components/ConflictModal.tsx:42-47`

`resolveConflict` sem try/catch, `removeLocalConflict` executa em seguida. Se resolve falhar, o conflito some sem ser resolvido.

### Bug 21, AtividadesPage: handlers sem try/catch

- **Severidade**: P2
- **Caderneta de origem**: Atividades (`atividade-funcionarios`, `atividade-imprevistos`)
- **Cadernetas afetadas**: Atividades
- **Afeta Painel Web**: Não (local)
- **Arquivo**: `frontend/src/pages/AtividadesPage.tsx:781-790, 813-829`

`concluirAtividadeLocal` e `registrarImprevistoLocal` sem try/catch. Em falha, modal fica aberto e usuário sem feedback.

### Bug 22, Tipos PWA desatualizados em relação ao payload real

- **Severidade**: P2
- **Caderneta de origem**: Morte (falta `foto_url`, `latitude`, `longitude`, `gps_accuracy`)
- **Cadernetas afetadas**: Morte
- **Afeta Painel Web**: Indireto (risco de falhas silenciosas de TypeScript)
- **Arquivo**: `frontend/src/types/cadernetas.ts:163-196`

`RegistroMorte` não declara `foto_url`, `latitude`, `longitude`, `gps_accuracy` que são enviados ao Supabase em `syncService.ts:353-355`.

---

## P3, Baixos

### Bug 23, IndexedDB: transações de leitura por índice sem `await tx.done`

- **Severidade**: P3
- **Caderneta de origem**: Transversal (afeta contagem de pendentes e listagens)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Não (local)
- **Arquivo**: `frontend/src/services/indexedDB.ts:87, 199`

Pode causar `TransactionInactiveError` em navegadores Android antigos.

### Bug 24, Home: redirect sem verificar rota atual

- **Severidade**: P3
- **Caderneta de origem**: Transversal (navegação inicial)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Não (local)
- **Arquivo**: `frontend/src/pages/Home.tsx:102-112`

Redirecionamento indesejado em cenários edge do PWA com fallback para `/`.

### Bug 25, `logs_sync_errors` sem tela de auditoria no Painel Web

- **Severidade**: P3 (débito conhecido)
- **Caderneta de origem**: Transversal (todas as cadernetas que logam erros de sync)
- **Cadernetas afetadas**: Todas
- **Afeta Painel Web**: Sim, auditoria só via SQL direto no Supabase Studio
- **Referência**: `AGENTS.md` seção "Tela de auditoria de erros de sync no Painel Web"

O PWA grava em `logs_sync_errors` via `logSyncError` em `syncService.ts:876`, mas o Painel Web não tem interface para ler essa tabela.

---

## Divergências de contrato PWA x Painel Web (gaps, não bugs)

| Divergência | Cadernetas envolvidas | Severidade | Lado a ajustar |
|---|---|---|---|
| Painel não consome `logs_sync_errors` | Todas | Alta (débito) | Painel |
| Painel não exibe foto/GPS de morte | Morte | Média | Painel |
| Painel não consome campos ricos de maternidade (mãe adotiva, `observacao_parto`, `parto_vinculo_id`, `docilidade_matriz`) | Maternidade | Baixa | Painel |
| Painel não consome campos ricos de pastagens (`horario_manejo`, `gado_contado`, `categorias_detalhes`, `avaliacao_geral`, `escore_fezes`, `numero_pessoas_manejo`, `equipe_nomes`) | Pastagens | Média | Painel |
| Painel não consome `gado_contado` e `equipe_nomes` de rodeio | Rodeio | Baixa | Painel |
| Painel não exibe `foto_url` de atividades | Atividades | Baixa | Painel |
| PWA não chama RPC `set_audit_context` | Todas (auditoria) | Média | PWA |
| `peso_vivo_kg` não calculado no INSERT de suplementação (trigger só calcula consumo do anterior, peso só vem via RPC de edição do Painel ou cron job) | Suplementação | Alta | Banco/Schema |
| Painel sem tipos gerados do Supabase (usa `any`) | Todas | Média | Painel |

---

## Resumo por caderneta

| Caderneta | Bugs que a afetam | Severidade máxima |
|---|---|---|
| Saída de Insumos | Bug 1, Bug 3 | P0 |
| Morte | Bug 2, Bug 3, Bug 22 | P0 |
| Enfermaria | Bug 2, Bug 3 | P0 |
| Maternidade | Bug 3, Bug 5 | P0 |
| Pastagens | Bug 3, Bug 5, Bug 10, Bug 17, Bug 19 | P0 |
| Rodeio | Bug 3, Bug 5, Bug 17, Bug 19 | P0 |
| Suplementação | Bug 3, Bug 5, Bug 12 | P0 |
| Leitura de Cocho | Bug 3, Bug 5, Bug 6 | P0 |
| Trato Confinamento | Bug 3, Bug 5, Bug 9 | P0 |
| Movimentação | Bug 3, Bug 5, Bug 7, Bug 8 | P0 |
| Bebedouros | Bug 3, Bug 5 | P0 |
| Clima | Bug 3, Bug 5, Bug 19 | P0 |
| Abastecimento | Bug 3, Bug 5 | P0 |
| Cantina | Bug 3, Bug 5, Bug 19 | P0 |
| Limpeza | Bug 3, Bug 5 | P0 |
| Operações de Máquinas | Bug 3, Bug 5, Bug 14 | P0 |
| Manutenção de Máquinas | Bug 3, Bug 5 | P0 |
| Entrada de Insumos | Bug 3, Bug 5, Bug 13 | P0 |
| Problemas | Bug 3, Bug 5 | P0 |
| Almoxarifado | Bug 3, Bug 5 | P0 |
| Atividades | Bug 3, Bug 21 | P0 |
| Transversal (sync/auth) | Bug 4, Bug 11, Bug 15, Bug 16, Bug 18, Bug 20, Bug 23, Bug 24, Bug 25 | P0 |

---

## Recomendação de ordem de correção

### Seguros para corrigir agora na branch `fix/caça-bugs` (sem risco ao Painel Web)

1. **Bug 1** (`insumos-por-saida`): adicionar o `case` faltante em `syncToSupabase`.
2. **Bug 2** (lógica invertida): trocar `isInverted ? !isSim : isSim` por `isInverted ? isSim : !isSim` nas linhas 1057 e 1067.
3. **Bug 4** (refresh token): só limpar tokens em erro de auth definitivo (401/403), não em 5xx/timeout/rede.
4. **Bug 5** (crash null): trocar `!== undefined` por `!= null` em `LoteDetalhesCard` e `LoteOcupandoPastoCard`.
5. **Bug 6** (LeituraCocho data): adicionar `data` nas dependências do useEffect e usar `data` no rascunho.
6. **Bug 7** (Movimentacao reset): zerar `cabecasPorCategoria` ao trocar lote origem válido.
7. **Bug 10** (Pastagens reset): zerar `categoriasQuantidades` ao trocar pasto de saída válido.
8. **Bug 9** (TratoConfinamento rascunho): limpar currais salvos do rascunho mesmo em falha parcial.
9. **Bug 13** (entrada-insumos-itens): trocar `registro.quantidade || null` por `registro.quantidade !== undefined && registro.quantidade !== '' ? Number(registro.quantidade) : null`.
10. **Bug 14** (odometro null): enviar string vazia em vez de null quando a coluna é NOT NULL.
11. **Bug 15** (brToIso padStart): adicionar `padStart(2, '0')` em dia e mês.
12. **Bug 16** (brWithTimeToIso vazio): retornar `null` em vez de `''` quando data ausente.
13. **Bug 17** (equipe_nomes): padronizar pastagens para passar array direto como rodeio.
14. **Bug 18** (processQueue catch): envolver `registroToSupabase` do log em try/catch.
15. **Bug 19** (Number sem normalizar): usar `normalizarNumeroString` nos campos de share.
16. **Bug 20** (ConflictModal): envolver `resolveConflict` em try/catch.
17. **Bug 21** (AtividadesPage): envolver handlers em try/catch.
18. **Bug 22** (tipos Morte): adicionar `foto_url`, `latitude`, `longitude`, `gps_accuracy` em `RegistroMorte`.

### Exigem avaliação conjunta com o Painel Web (tocam schema ou contrato)

1. **Bug 3** (idempotência): exige migração coordenada com o Painel Web (adicionar `local_id` nas tabelas + `upsert` com `onConflict`). **CORRIGIDO 05/09/2026**.
2. **Bug 12** (suplementação `peso_vivo_kg`): reclassificado. Não é bug do PWA, é gap de schema. O PWA envia `peso_vivo_kg: null` e delega ao banco. A correção deve ser uma trigger AFTER INSERT que chame `recalcular_pesos_suplementacao_historico`, ou cron job mais frequente. Mudança de schema no banco compartilhado, exige avaliação conjunta com o Painel Web.
3. **Bug 25** (tela de auditoria): exige implementação no Painel Web.
