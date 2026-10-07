# Backlog — débitos técnicos e specs não implementadas

Este arquivo lista trabalho pendente. Um chat novo deve consultar este arquivo para saber o que ainda falta fazer e o que já foi decidido mas não implementado.

## Fábrica Confinamento: entidade Carga para rastrear vagões por trato (spec aprovada 30/09/2026)

**Contexto**: hoje `registros_fabrica_confinamento` (master por trato) tem um único `vagao_id` e os insumos penduram direto no master. A operação precisa rastrear quantos e quais vagões produziram cada trato (ex.: trato de 1.000 kg = 500 no vagão A + 500 no vagão B), com kg realizado por insumo informado **a cada carga**. A estrutura atual perde esse rastro (segundo save sobrescreve `vagao_id`) e tem dois riscos multi-dispositivo: master duplicado por ordem (dois aparelhos offline criam linhas distintas via `local_id`) e lost update no `total_produzido` (update carrega total absoluto calculado de snapshot velho).

**Modelo aprovado** — três níveis `trato → carga → insumos`:

1. `CREATE TABLE registros_fabrica_confinamento_cargas`: uma linha por carga (`id`, `local_id` unique para idempotência offline, `registro_id` FK master, `vagao_id`, `kg_produzido`, `ordem`, `usuario`, `data`, `created_at`, `deleted_at`). Append-only — nunca update — o que torna a concorrência conflict-free.
2. `ALTER TABLE registros_fabrica_confinamento_insumos ADD carga_id uuid` (nullable; legado segue via `registro_id`).
3. `UNIQUE (fazenda_id, data, tipo, formulacao_id, ordem_trato)` no master: dois aparelhos offline convergem para a mesma linha no upsert.
4. Trigger `AFTER INSERT/UPDATE/DELETE ON cargas` recalcula `master.total_produzido = SUM(cargas)` — incremento atômico server-side, elimina lost update. `vagao_id` do master vira informativo (último usado) para não quebrar o Painel. Trigger de estoque em insumos não muda (baixa sai por carga, mais granular).

**PWA**: store IndexedDB `fabrica-confinamento-cargas`; save = upsert master + insert carga + insumos com `carga_id`; UX com SALVAR acumulando carga no trato aberto e ENCERRAR TRATO fechando e avançando; tela lista as cargas do trato ("Carga 1 · Kuhn · 500 kg"); rascunho por (trato, vagão).

**Painel**: `fetchFabricaAcompanhamento` continua lendo totais do master sem mudança; evolução opcional de listar cargas/vagões por trato.

**Migração de dados legados** (a decidir na implementação): deixar tratos antigos sem cargas ou gerar uma carga retroativa por master para histórico uniforme.

**Disparador**: quando mencionar cargas da fábrica, rastrear vagões por trato, produção parcial multi-vagão, ou master duplicado por ordem de trato, ler esta seção.

## CMS do texto da suplementação usa só a série do aparelho (28/09/2026)

`calcularMetricasSuplementacao` é chamada no share de registro (`ListaRegistros`) e no resumo diário (`SuplementacaoListaPage`) sobre `listarRegistros('suplementacao')`, que lê só o IndexedDB local. O sync é push-only: tratos lançados em outro aparelho (ex.: outro tratador do mesmo lote) nunca entram na série local. Com a série incompleta, a "média geral" do texto diverge da série completa do banco — caso observado na Fazenda Brilhante: aparelho com 8 tratos em 8 dias gerou CMN 4,941 enquanto a série completa de 10 tratos daria 5,647.

Direções possíveis (a decidir): calcular as métricas do texto sobre a série remota quando online (`getRegistrosSuplementacaoByLote`, já usada por `SuplementacaoPage`), com fallback local offline; ou puxar os registros do lote para o IndexedDB no refresh de cadastro; ou aceitar a limitação e remover o histórico do texto quando offline.

## Unificação do share de registro (SuccessModal vs ListaRegistros) — decidido adiar (24/09/2026)

**Contexto**: o share de registro individual existe em dois pontos com lógica divergente: o `SuccessModal` chama `formatarRegistroComoTexto(registro, caderneta)` sem contexto, e o `ListaRegistros` enriquece o registro inline (métricas de consumo da suplementação, tempo/intervalo de limpeza do bebedouro) e passa `todosRegistros` do IndexedDB. Mudanças de texto precisam tocar os dois lados.

**O que foi tentado**: um `services/shareService.ts` com `compartilharRegistro(caderneta, registro, todosRegistros?)` centralizando enriquecer → formatar → abrir WhatsApp, chamado pelos dois pontos. Funcionou e gerou textos idênticos nos testes, mas foi revertido no mesmo dia porque a auditoria expôs o seguinte:

1. **Divergências que a unificação não resolve**: páginas anexam ao `registroSalvo` campos que não são persistidos no IndexedDB, então o card nunca os teria: `n_cabecas_apos_obito` (MortePage), `metaRodeio` (RodeioPage), `categoriasEntrada` consolidado (MovimentacaoPage, entrada multi-categoria), e o objeto sintético de `novo_lote` (MovimentacaoPage, que compartilha com `caderneta='novo_lote'` string que nem é `CadernetaStore`). Para unificar de verdade, esses campos precisam ser persistidos ou recomputados no serviço.
2. **Novos modos de falha**: share do modal passaria a depender de `await listarRegistros` (falha silenciosa sem catch) e os awaits entre o clique e o `navigator.share` podem estourar a janela de ativação do gesto em iOS/dispositivos lentos, bloqueando o share.
3. **`periodoTratoDias` com fontes diferentes**: a página calcula sobre linhas do Supabase; a lista recalcula sobre IndexedDB. Com históricos divergentes os dois textos podem mostrar períodos diferentes mesmo unificados.

**Se retomar**: envolver `compartilharRegistro` em try/catch com feedback; persistir ou recomputar no serviço os campos do item 1; decidir a precedência de `periodoTratoDias` (valor pré-calculado do save vs recálculo local); tipar `caderneta` no `SuccessModal` sem cast cego. Fluxos fora do escopo por design: resumos diários das listas, modal de sessão da pesagem e AtividadesPage (textos agregados próprios).

## Drop das colunas legadas de bezerros (aguardando migration do Painel)

`lotes.qtd_bezerros`, `lotes.quantidade_bezerros` e `lote_categorias.qtd_bezerros` serão dropadas por migration no repo do Painel (detalhes completos, funções bloqueantes e plano em `GestaUp-Cadernetas-Gestao/docs/BACKLOG.md`, seção "Drop das colunas legadas de bezerros"). No PWA restam ajustes para fazer junto ou depois: remover `qtd_bezerros` do `criar_lote` em `mcp-server/index.js`, regenerar `types/supabase.ts`, remover `qtd_bezerlos`/`quantidade_bezerros` de `types/relatorioLote.ts`, atualizar `mcp-server/schema.sql`.

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

## Auditoria de segurança de 07/10/2026: plano em fases (S4 + S3 + RPCs + Edge Functions)

Auditoria feita só com leitura/simulações revertidas na fazenda de testes `d649c65e`. Cada fase só avança depois de testada, aplicada (`db push`/`functions deploy` pelo usuário) e validada. Trilha em `docs/HISTORICO.md` ("Auditoria de segurança — Fase N") e rollbacks em `supabase/rollbacks/` (repo do Painel).

| Fase | Escopo | Status |
|---|---|---|
| 1 | Views `security_invoker` + sem anon/escrita; `backup_*` com RLS; escrita pública de storage `logos` | **CONCLUÍDA e validada em 07/10/2026** (ver docs/HISTORICO.md) |
| 2 | Edge Functions `create-user-without-confirmation`, `create-auth-user-only`, `rollback-user-creation`, `change-user-password`: exigir admin/super_admin (hoje só checam header `Authorization`: qualquer logado cria `super_admin` ou apaga fazenda/usuário) | **CONCLUÍDA e validada em 07/10/2026** (negativo com peão e positivo/negações com admin; ver docs/HISTORICO.md) |
| 3 | S4 `usuarios`: policies `Allow authenticated insert/update` abertas permitem autopromoção a `super_admin` (comprovado em transação revertida); trigger de proteção de colunas | **CONCLUÍDA e validada em 07/10/2026** (24 cenários + login real; ver docs/HISTORICO.md) |
| 4 | `audit_log` (SELECT `true` + policy ALL: leitura cruzada e adulteração da trilha). `impersonation_sessions`/`system_health_samples`: policies `true` mortas (authenticated nem tem privilégio), alinhadas por defesa em profundidade | **CONCLUÍDA e validada em 07/10/2026** (ver docs/HISTORICO.md) |
| 5 | 118 RPCs `SECURITY DEFINER` com EXECUTE para `anon`/`authenticated`, a maioria sem checagem de autorização (inclui `soft_delete_record(p_schema,p_table,p_id)` com SQL dinâmico, `transferir_lote_entre_fazendas`, `get_audit_log`, `cleanup_audit_log`, `set_audit_context`, `autenticar_peao_app` que devolve a senha do peão) | **5.0 concluído**; **5.1** (34 funções cron/internas/sem chamador fechadas + `calcular_peso_medio_lote_visivel` nas views) e **5.1b** (default global: funções novas nascem fechadas) concluídas e validadas em produção (ver HISTORICO); Fase 5 (RPCs) CONCLUÍDA: 5.0 a 5.4 validadas. Próximo: Fase B (S3) em lotes e varredura final |
| 6–10 | S3 em lotes: atividades, catálogos, estrutura da fazenda, pessoas, fábrica/históricos (+ S6/S7, leituras públicas `ativo = true`) | pendente |
| 11 | Varredura final + `get_advisors(security)` sem ERROR | pendente |

**Correção de afirmação anterior**: as 16 tabelas `backup_*` NÃO estavam acessíveis pela API (não têm privilégio para `anon`/`authenticated`); a Fase 1 só adiciona RLS como defesa em profundidade.

**Pendências derivadas (fora das fases)**: (a) logos: qualquer `authenticated` ainda sobrescreve/apaga logo de outra fazenda; exige o Painel gravar em `{fazenda_id}/...` (hoje usa nomes por timestamp, 78 objetos) antes de escopar por prefixo; mesmo para `fotos-atividades`/`fotos-morte`/`fotos-registros`. (b) Ligar `auth_leaked_password_protection` no painel do Supabase. (c) Admin global (`is_admin_user()`) sem vínculo em `usuario_fazenda` enxerga só o que as policies das tabelas-base permitem (as views antes mostravam tudo). (d) ~~Edge Functions de usuário não versionadas~~ resolvido na Fase 2 (as 4 funções agora vivem em `supabase/functions/` do Painel). (e) `rollback-user-creation` apaga só a conta do Auth e deixa linha órfã em `public.usuarios` (e vínculos em `usuario_fazenda`, se houver); o fluxo `createFazendaWithController` em caso de falha herda isso. (f) Em um navegador, validar `NovoUsuario.tsx` (sem opção Admin para admin) e o fluxo criar fazenda + controller + peão; a Fase 3 deve cobrir também a opção de papel em `EditarUsuario.tsx`.

## Estoque de suplementação: pendências após o incidente de itens perdidos (07/10/2026)

Incidente: itens de Produção Fábrica (`saida_insumos_itens`) estouravam `57014` e o estoque dos produtos finais não era creditado (fazenda `d3965505-74d5-4af7-9858-f773d2e8aab3`). Backfill de 28 itens feito via MCP; correção no PWA (cabeçalho passa a enviar os itens e vira `error` se algum falhar); correção estrutural no Painel (trigger-cascata `SECURITY DEFINER`). Ver `docs/HISTORICO.md`. Ficam pendentes:

**Aplicado em 07/10/2026**: migration `20261007210000_cascata_estoque_security_definer.sql` (ver `docs/HISTORICO.md`). Falta commitar/pushar o arquivo no repo do Painel e commitar as mudanças do PWA.

**Para discutir com o usuário**
- **Sobrecarga legada `recalcular_custo_medio_item(text, uuid, uuid)`**: ainda trata `estorno` (removido em 01/10) e faz `UPDATE` em `insumos`/`formulacoes` sem `fazenda_id`. É `INVOKER` e chamável como RPC por `authenticated`; nenhuma função nem código do Painel/PWA a chama (só aparece nos tipos gerados). Candidata a `DROP FUNCTION` numa migration própria.
- **Id local de 21/09** (`e16b4577-1790016222334`): 6 itens (12.000,1 kg) enfileirados com o id LOCAL do cabeçalho, nunca viraram UUID. Descobrir a qual cabeçalho pertencem (data/formulação/soma) ou descartar. Os logs seguem sem `resolved_at`.
- **4 cabeçalhos sem itens e sem log de erro** (itens nunca saíram do aparelho, sem payload para recuperar): SAL UREADO 02/10 (300 kg, `5d2978ad`), Engorda 1,8% 03/10 (5.700 kg, `c29dba87`), PROTEINADO 0,3% 06/10 (3.660 kg, `754242b9`) e 28/09 (3.660 kg, `88010c16`). Opções: peão relança, estimar pelos % da formulação × `total_produzido` (estimativa, não dado real) ou ignorar.
- **Bugs separados vistos nos logs**: `maternidade` com `42601` ("INSERT has more target columns than expressions", 7 erros em 06/10) e `entrada-combustivel` com `42P10` (sem constraint única para o `ON CONFLICT`, 3 erros).
- **Residual do PWA**: se o cabeçalho sincronizar antes de os itens serem gravados no IndexedDB, o item sobe pela fila e, se falhar, só o item fica em `error` (cabeçalho `synced`). Janela pequena; avaliar tornar a gravação cabeçalho+itens atômica.

**Melhorias de médio prazo (estoque/RLS, sem mexer em segurança)**
- Trocar `auth.uid()` por `(select auth.uid())` nas policies e marcar as funções de acesso (`user_has_fazenda_access`, `user_has_fazenda_role`, `current_user_has_access`, `is_admin_user`) como `STABLE`, para o Postgres avaliar uma vez por statement e não por linha. O plano de execução do insert do peão mostrou `usuarios` varrida por seq scan e as funções reavaliadas por linha. Beneficia todas as telas.
- Replay incremental: `recalcular_custo_medio_item` percorre o histórico inteiro do item a cada movimentação (125 linhas só no E/A Engorda). Recalcular a partir da movimentação alterada.
- Cada produção com 6 insumos dispara 6 replays da MESMA formulação (linha quente). Avaliar crédito da formulação agregado por cabeçalho em vez de por item.

**Segurança (S3)**: `insumos`/`formulacoes` (e as tabelas filhas) foram isoladas por tenant em 07/10/2026; ver S3 abaixo e `docs/HISTORICO.md`. Hardening de privilégios (`TRUNCATE`, `REFERENCES`, `TRIGGER` para `anon`/`authenticated`) aplicado só nessas quatro tabelas; as demais tabelas de cadastro ainda têm esses grants e entram no mesmo tratamento quando forem escopadas.

**Disparador**: quando mencionar `saida_insumos_itens`, itens perdidos de produção, estoque de formulação sem crédito, `trg_saida_insumos_itens_mov` ou timeout 57014 em insumos-por-saida, ler esta seção.

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
| ~~S1~~ | fazendas | ~~Policies Auth delete/insert/update com qual=true~~ **RESOLVIDO** (06/10/2026, migration Painel `20261006180000_isolamento_tenant`): INSERT/DELETE só `is_admin_user()`; UPDATE admin/controller da própria fazenda | — |
| ~~S2~~ | fazendas | ~~Policy Enable public read access (role public)~~ **RESOLVIDO** (06/10/2026, mesma migration): SELECT restrito a vínculo direto ou mesmo `grupo_id` (preserva transferências) | — |
| S3 | checklist_regras, funcionarios, ~~formulacoes~~, frigorificos, ~~insumos~~, itens_almoxarifado, locais, implementos, medicamentos, mineral, proteinado, racao, tratamentos, setores, maquinas_veiculos, currais, ~~lotes, pastos~~, racas, fornecedores, causas_morte, bebedouros | Todas com policies qual=true (SELECT/INSERT/UPDATE/DELETE), qualquer usuário autenticado acessa dados de todas as fazendas. **PARCIAL** (06/10/2026): `lotes`, `pastos`, `fazendas`, `usuario_fazenda` e `peoes` isoladas via `caller_has_fazenda_access`/`user_has_fazenda_role`; RPC `sincronizar_historico_pasto_lote_edit` hardenada | Substituir nas tabelas restantes por `caller_has_fazenda_access(fazenda_id)` (cobre painel via usuario_fazenda e peão PWA via email JWT). **`insumos`, `formulacoes`, `formulacao_insumos` e `formulacoes_historico` RESOLVIDOS em 07/10/2026** (ver docs/HISTORICO.md); restam as demais tabelas da lista; auditar RPCs definer restantes (`transferir_lote_entre_fazendas`, `aprovar_solicitacao_novo_lote`) |
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
| 1 | S3 | Segurança | 22+ tabelas com RLS qual=true (PARCIAL 06/10: lotes, pastos, fazendas, usuario_fazenda, peoes resolvidos) | QUEBRA se isolado |
| 2 | S5 | Segurança | ~~Senhas peões em texto plano~~ (aceito como está) | NEUTRO |
| 3 | ~~S1~~ | Segurança | ~~fazendas: DELETE/INSERT/UPDATE por qualquer usuário~~ (RESOLVIDO 06/10) | — |
| 4 | C2, C5 | Consistência | syncService envia campos inexistentes no schema de pastagens e bebedouros | NEUTRO |
| 5 | N1 | Negócio | Sem conflito de versão no sync | NEUTRO |
| 6 | N3 | Negócio | Sync entrada-insumos não transacional | NEUTRO |
| 7 | ~~S2~~ | Segurança | ~~fazendas: SELECT público~~ (RESOLVIDO 06/10) | — |
| 8 | ~~C9-C10, C13~~ | Consistência | ~~Fuso horário não aplicado no PWA~~ (RESOLVIDO) | NEUTRO |
| 9 | N4 | Negócio | currentFazendaId global | NEUTRO |
| 10 | Log erro visível | Negócio | Erro de sync não visível + retries automáticos causam duplicatas | NEUTRO |


- **(07/10/2026, achados da Fase 5.3)** (a) `update_quant_atual_with_data` falha com 42P10 (`ON CONFLICT (lote_id, categoria)` sem constraint única correspondente; já era assim, usada em `IndividuoNovo.tsx`). (b) Peão e gestor têm papel `controller` em `usuario_fazenda`; checagens "apenas controller+" (ex.: `excluir_registro_*`) não os separam. Definir separação (ex.: e-mail `@gestaup.internal`) antes de usar papel como autorização. (c) Confirmar que o PWA envia `funcionario_id` válido em `registrar_push_subscription` (FK rejeitou id de teste). (d) Funções de plano (`iniciar/encerrar/migrar_plano_*`) validar em tela com plano real.
- **(07/10/2026, Fase 5.4)** Tokens de `relatorios_publicos` nunca expiram (`expira_em` nulo em 100% das linhas): decidir validade padrão/rotação. Tornar obrigatória a gravação da sessão em `impersonate-user` (hoje falha silenciosa deixa a ação sem "impersonado por").
- **(07/10/2026, Fase B)** Lote 1 (atividades) CONCLUÍDO. Próximos: Lote 2a catálogos, 2b estrutura da fazenda, 2c pessoas, Lote 3 fábrica/históricos, Lote 4 varredura final. Dependência anon a tratar nos lotes seguintes: a página pública de relatórios (`RelatorioPublico.tsx`, `RelatorioAtividadesPublico.tsx`) lê `relatorios_publicos` e `fazendas` direto como anon; migrar para RPC por token antes de fechar essas tabelas.

## Segurança S3/S4 — o que falta (consolidado em 07/10/2026)

Concluído: Fases 1–4, Fase 5 inteira (RPCs SECURITY DEFINER, 5.0 a 5.4) e Fase B Lote 1 (atividades). Detalhes em `docs/HISTORICO.md` ("Auditoria de segurança"). Rollbacks em `supabase/rollbacks/` do repo do Painel.

**Fase B (S3) — policies abertas por lote** (levantamento aproximado por `pg_policies` com `true`/`public`/`anon`; confirmar uma a uma antes de cada lote; sempre levantar quem lê como `anon` e criar RPC por token antes de fechar):
- **Lote 2a catálogos:** `causas_morte`, `faixas_categorias`, `frigorificos`, `medicamentos`, `mineral`, `proteinado`, `racao`, `tratamentos`, `fornecedores`, `racas`, `implementos`, `maquinas_veiculos`, `locais`, `setores` (e remover leituras públicas `ativo = true`).
- **Lote 2b estrutura da fazenda:** `bebedouros`, `pasto_bebedouros`, `pluviometros`, `currais` (escrita anon), `linhas_confinamento`, `vagoes`, `rotinas` (escrita anon), `checklist_regras`, `categorias`.
- **Lote 2c pessoas:** `funcionarios`, `funcionario_setores` (preservar leitura do peão por PIN).
- **Lote 3 fábrica e históricos:** `registros_fabrica_confinamento` (+ `_insumos`), `lote_categorias_transicoes`, `lote_modulo_historico`, `lote_pasto_historico`, `lote_curral_historico` (anon), `plano_categoria_personalizacao`, `lote_historico`, `grupos_fazenda`, `formulacao_categorias_gmd`, `planos_nutricionais`, `planos_nutricionais_snapshots`.
- **Outras que apareceram na varredura:** `ia_fazenda_config`, `ia_config_global`, `notificacoes_config`, `notas_leitura_cocho_config`, `chat_ia_logs`, `execucoes_rotina`, `execucoes_rotina_historico`, `lote_categorias`, `relatorios_publicos`, `precos_categorias`.
- **Dependência anon conhecida:** `RelatorioPublico.tsx` e `RelatorioAtividadesPublico.tsx` leem `relatorios_publicos` e `fazendas` direto como anon; `setores`, `funcionarios`, `bebedouros`, `pluviometros`, `medicamentos` aparecem em relatórios públicos e no boot do PWA. Migrar para RPC por token antes de fechar.
- **Lote 4 varredura final:** provar 0 policies `true`/`anon`/`public` não intencionais e 0 tabelas sem RLS; rodar `get_advisors(security)` sem ERROR; documentar exceções (`logs_sync_errors` INSERT anon, `precos_categorias` leitura anon).
- **Storage (A7):** prefixo de fazenda nos buckets `fotos-*` e nas escritas de `logos` (só o INSERT público de `logos` foi tratado).

**Ações do usuário:** commit/push dos repos (PWA tem commit local 889f37d sem push); ligar `auth_leaked_password_protection` no dashboard do Supabase; trocar a senha do admin exposta no chat e a do controller de testes; testar o cronômetro de atividades no campo (sync de `atividade_sessoes`/`atividade_imprevistos` não foi exercitado na tela); apagar a atividade de teste "TESTE Fase B1 isolamento" da d649 se quiser.

**Pendências de produto/qualidade registradas na Fase 5:** tokens de `relatorios_publicos` sem validade (`expira_em` nulo em 100%); gravação garantida da sessão em `impersonate-user`; peão e gestor com o mesmo papel (`controller`) em `usuario_fazenda`; `update_quant_atual_with_data` com 42P10; `get_audit_log.tabelasAuditadas` agrega contagem global; validar funções de plano (`iniciar/encerrar/migrar_plano_*`) em tela com plano real; confirmar `funcionario_id` válido em `registrar_push_subscription` (FK).

