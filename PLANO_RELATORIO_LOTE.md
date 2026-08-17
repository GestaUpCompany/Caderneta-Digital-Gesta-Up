# Plano de Implementação — Relatório de Lotes (Ciclo de Vida)

## Contexto

Relatório de ciclo de vida de lotes para o PWA (`Caderneta-Digital-Gesta-Up`) e futuro Painel Web (`GestaUp-Cadernetas-Gestao`). Ambos compartilham o mesmo banco Supabase (`nrwljcvhwbezmoummxbl`). A maior parte da montagem dos dados fica em RPC no Supabase, para que PWA e Painel Web consumam a mesma fonte sem duplicação de lógica.

Fazenda de testes: `d649c65e-16ab-4b77-a84b-df937aa41cc3` (Fazenda Gesta'Up). Todo teste que envolva dados deve usar esta fazenda.

## Validações já concluídas na fazenda de testes

| Validação | Resultado |
|---|---|
| Seções 1+2 (cadastro + estado atual) | OK, payload ~1.5KB |
| Seções 3+4 (cronologia + nutricional) | OK, transição boi magro→Boi Gordo com snapshot |
| Seções 5+6 (ocupação + movimentações) | OK, linha do tempo P10→P30→P20→Lavoura 1, 13 movs |
| Seções 7+8+9 (mortalidade + reprodução + consumo) | OK, 21 partos, 9 consumos |
| Seções 10+11 (indivíduos + auditoria) | OK, 20 animais, 3 UPDATEs com diff |
| Seção 12 (indicadores consolidados) | OK, 64 dias, 147 cab, 422.4kg, 332.4kg ganho |
| Validação de posse (lote de outra fazenda) | OK, rejeitado corretamente |
| Lote inativo (L4, encerrado) | OK, relatório renderiza com histórico |
| Tamanho total do payload (lote mais rico L1) | 11 KB |
| Performance (subqueries correlacionadas) | 9.4ms |
| Performance (JOINs em cascata artificial) | 1201ms — NÃO usar este padrão |

Conclusão: usar subqueries correlacionadas independentes (cada seção como InitPlan separado dentro do `jsonb_build_object`), igual a `get_dados_relatorio_morte` e `get_dashboard_stats`. Nunca JOINs em cascata.

## Escopo da v1

- 10 seções (sem Auditoria de Alterações, que fica para v2 quando os triggers de `audit_log` estiverem completos).
- Lazy-load desde já: RPC carrega cadastro + indicadores + estado atual na primeira chamada; demais seções sob demanda ao abrir o accordion.
- Sem Compartilhar: só visualização no app. Compartilhamento e export ficam para v2 junto com o Painel Web.

## Princípio de UI/UX

O usuário-alvo é um fazendeiro idoso que usa o PWA no celular. O design precisa ser autoexplicativo sem ser infantil.

Regras práticas:

- Uma informação por linha, label em cima, valor embaixo, igual ao `LoteDetalhesCard` já existente.
- Seções colapsáveis com título claro e um número (badge) indicando quantos itens há dentro.
- Linguagem rural direta: "Cabeças" em vez de "Indivíduos", "Pastos por onde passou" em vez de "Linha do tempo de ocupação", "Mortes" em vez de "Mortalidade".
- Zero jargão técnico visível: "GMD" vira "Ganho de peso/dia", "CMS" vira "Consumo/dia", "RC" vira "Rendimento de carcaça".
- Cores semânticas já estabelecidas: verde `#23503a` para header, azul `#3b82f6` para destaque de cabeças, vermelho para alertas, amarelo para avisos.
- Botões grandes (min-h 40px), texto base 16px, contraste alto.

## Fase 1 — Supabase (RPC)

### 1.1 Migration

Arquivo: `GestaUp-Cadernetas-Gestao/supabase/migrations/20260821100000_criar_rpc_relatorio_lote_ciclo_vida.sql`

As migrations ficam no repo do Painel Web, conforme padrão existente do projeto.

### 1.2 RPC principal

```sql
get_relatorio_lote_ciclo_vida(
  p_fazenda_id uuid,
  p_lote_id    uuid,
  p_secoes     text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET "TimeZone" TO 'America/Cuiaba'
```

Padrão: idêntico a `get_dashboard_stats` / `get_gado_stats` (RPC interna autenticada, `SECURITY DEFINER`, grant só `authenticated`). Não segue o padrão de token público (`get_dados_relatorio_morte`) porque é consumo interno de PWA e Painel Web, ambos autenticados.

### 1.3 Estrutura interna da RPC

1. **Validação de posse**: `SELECT 1 INTO v_found FROM lotes WHERE id=p_lote_id AND fazenda_id=p_fazenda_id AND deleted_at IS NULL`. Se `NOT FOUND`, retorna `jsonb_build_object('success', false, 'error', 'Lote nao encontrado')`.

2. **10 seções como variáveis jsonb independentes**, cada uma preenchida por uma subquery correlacionada (não JOIN em cascata):

| Variável | Seção | Fonte |
|---|---|---|
| `v_cadastro` | cadastro | `lotes` + `pastos` + `currais` |
| `v_estado_atual` | estado_atual | `lote_categorias` WHERE `ativo=true` |
| `v_cronologia` | cronologia_categorias | `lote_categorias_transicoes` + `lote_categorias` encerradas |
| `v_nutricional` | historico_nutricional | `planos_nutricionais` + `planos_nutricionais_snapshots` |
| `v_ocupacao` | linha_tempo_ocupacao | `lote_pasto_historico` + `lote_modulo_historico` |
| `v_movimentacoes` | movimentacoes | `registros_movimentacao` (origem/destino) |
| `v_mortalidade` | mortalidade | `registros_morte` + resumo agregado |
| `v_reproducao` | reproducao | `registros_maternidade` (condicional) |
| `v_consumo` | consumo_suplementacao | `registros_suplementacao` (série temporal) |
| `v_individuos` | individuos | `individuos` |
| `v_indicadores` | indicadores_consolidados | KPIs calculados das seções acima |

3. **Lazy-load**: cada seção só é calculada se `p_secoes IS NULL OR array_position(p_secoes, '<nome_secao>') IS NOT NULL`. O `RETURN` final inclui só as variáveis que foram pedidas. Se `p_secoes IS NULL`, calcula todas.

4. **Condicional da reprodução**: só inclui se `v_lote.sistema_producao IN ('Cria','Recria')` OU `EXISTS(SELECT 1 FROM registros_maternidade WHERE lote_id=p_lote_id AND deleted_at IS NULL)`. Evita seção vazia em lotes de engorda/confinamento.

5. **Correções identificadas nos testes**:
   - Mortalidade: `count(*)` e `jsonb_agg` ambos com `deleted_at IS NULL`.
   - Datas: todas com `to_char(... AT TIME ZONE 'America/Cuiaba', 'YYYY-MM-DD')`.
   - Indicadores: usa soma de `quant_atual` (fonte verdade), não `n_cabecas`.

6. **Grant**: `GRANT EXECUTE ON FUNCTION public.get_relatorio_lote_ciclo_vida(uuid, uuid, text) TO authenticated;` (só autenticados, não `anon`).

### 1.4 RPC auxiliar (mesma migration)

```sql
get_lotes_para_relatorio(p_fazenda_id uuid) RETURNS jsonb
```

Devolve `[{lote_id, nome, ativo, n_cabecas, categorias, pasto_nome, data_criacao, tem_movimentacao, tem_morte, tem_consumo}]`. Flags `tem_*` via `EXISTS(...)`. Ordenado por `ativo DESC, nome ASC`.

### 1.5 Teste da RPC na fazenda de testes

Após aplicar a migration, testar via `execute_sql`:

1. L1 (`d3596b7b-733f-4007-a1ba-af24e25dfe66`, lote rico) com `p_secoes=NULL`: confirmar 10 seções, payload ~10KB.
2. L1 com `p_secoes=ARRAY['cadastro','estado_atual','indicadores_consolidados']`: confirmar lazy-load, payload ~2KB.
3. L4 (`6e78d84b-696c-4fca-a29b-f2cc44387f0f`, inativo): confirmar que renderiza com histórico.
4. Lote de outra fazenda (`7468b68e-9400-4df2-aaf0-d9af034a00cf`): confirmar `success: false`.
5. Lote sem dados (Lote Curral 5, `fb6284dd-f49d-4541-8c28-1bbb581b5ba8`): confirmar seções vazias sem erro.
6. `get_lotes_para_relatorio`: confirmar lista com badges `tem_*`.

## Fase 2 — PWA (camada de serviço)

### 2.1 Tipo TypeScript do payload

Arquivo novo: `frontend/src/types/relatorioLote.ts`.

Interfaces para as 10 seções:

- `CadastroLote` (id, nome, raca, sexo, sistema_producao, destino, pasto_nome, pasto_area_ha, curral_nome, produtor_rural, propriedade_origem, numero_contrato, mes_competencia, data_liberacao_sisbov, periodo_liberacao_sisbov, data_embarque_previsto, created_at, ativo, n_cabecas, qtd_bezerros, peso_entrada_kg_cab, gmd, data_pesagem, data_meta, peso_vivo_meta_kg, peso_vivo_kg, periodo, idade, idade_meses, rc_inicial, meta_intervalo_rodeio_dias, data_proximo_rodeio)
- `EstadoAtualLote` (cabecas_totais, peso_medio_ponderado, categorias_ativas: [{categoria, quant_atual, peso_vivo_atual_kg, peso_entrada_kg, gmd, morte, abate, transf_entrada, transf_saida, data_meta_projetada, dias_restantes_meta}])
- `CronologiaCategoria` (data_transicao, categoria_origem, categoria_destino, peso_na_transicao_kg, motivo, usuario_id, snapshot_resumido) + `CategoriaEncerrada` (id, categoria, quant_inicial, quant_atual, peso_entrada_kg, peso_vivo_atual_kg, data_inicio, data_fim, categoria_origem_id)
- `HistoricoNutricional` (plano_id, nome, formulacao_id, formulacao_nome, periodo_dias, peso_meta_kg, data_inicio, data_fim, ativo, snapshots: [{duracao_dias, ganho_peso_total_kg_cab, gmd_realizado, gmd_planejado, producao_arroba_lote, mortalidade_percent, motivo_migracao}])
- `OcupacaoHistorico` (tipo: 'pasto'|'modulo', pasto_id, pasto_nome, area_util_ha, data_entrada, data_saida, cabecas_entrada, cabecas_saida, peso_vivo_medio_entrada_kg, peso_vivo_medio_saida_kg, taxa_lotacao_ua_ha, meta_intervalo_ocupacao_dias, desvio_tempo_ocupacao_percent)
- `MovimentacaoLote` (id, data, tipo: 'entrada'|'saida', lote_origem_id, lote_origem_nome, lote_destino_id, lote_destino_nome, numero_cabecas, categoria, motivo_movimentacao, subtipo, causa_observacao, responsavel, fazenda_destino_id, fazenda_destino_nome)
- `MortalidadeLote` (total, linhas: [{id, data, causa_morte, categoria, sexo, raca, peso_vivo, brinco, chip, nutricao_atual, nutricao_anterior, nome_usuario}])
- `ReproducaoLote` (total_partos, linhas: [{id, data, tipo_parto, sexo_cria, raca, peso_cria_kg, id_brinco_cria, id_brinco_mae, escore_matriz, docilidade_matriz, observacao_parto, nome_usuario}])
- `ConsumoSuplementacao` (id, data, formulacao, leitura, kg_cocho, n_cabecas, peso_vivo_kg, consumo_medio_geral_percent_pv, consumo_medio_geral_kg_ms, custo_medio_reais_cab_dia, escore_fezes, tratador)
- `IndividuoLote` (id, id_manejo, id_brinco, id_chip, sexo, categoria, raca, data_nascimento, peso_atual_kg, peso_meta_kg, data_entrada_fazenda, pv_entrada_kg, data_desmama, peso_desmama_kg, status, numero_partos)
- `IndicadoresConsolidados` (idade_lote_dias, cabecas_atual, peso_medio_atual_kg, peso_entrada_medio_kg, ganho_peso_total_kg_cab, total_mortes, total_saidas, total_entradas, total_partos, total_consumo_registros, total_pastos_ocupados, total_transicoes_categoria, ativo)

Interface raiz `RelatorioLotePayload` com todas as seções opcionais (lazy-load) + `success?: boolean` + `error?: string`.

Tipo `LoteRelatorioSimplificado` para o seletor: `{lote_id, nome, ativo, n_cabecas, categorias, pasto_nome, data_criacao, tem_movimentacao, tem_morte, tem_consumo}`.

### 2.2 Funções em `supabaseService.ts`

Adicionar ao final de `frontend/src/services/supabaseService.ts`, seguindo o padrão de `transferirLoteEntreFazendas`:

```typescript
export async function getRelatorioLoteCicloVida(
  fazendaId: string,
  loteId: string,
  secoes?: string[]
): Promise<RelatorioLotePayload> {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client.rpc('get_relatorio_lote_ciclo_vida', {
    p_fazenda_id: fazendaId,
    p_lote_id: loteId,
    p_secoes: secoes || null,
  })
  if (error) throw error
  return data
}

export async function getLotesParaRelatorio(
  fazendaId: string
): Promise<LoteRelatorioSimplificado[]> {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client.rpc('get_lotes_para_relatorio', {
    p_fazenda_id: fazendaId,
  })
  if (error) throw error
  return data
}
```

### 2.3 Hook `useRelatorioLote`

Arquivo novo: `frontend/src/hooks/useRelatorioLote.ts`.

Gerencia:

- `dados`: estado parcial do payload (começa com seções iniciais, cresce conforme abre accordions).
- `loading`, `erro`, `secaoCarregando` (qual seção está carregando no momento).
- `carregarInicial(fazendaId, loteId)`: chama RPC com `p_secoes=ARRAY['cadastro','estado_atual','indicadores_consolidados']`.
- `carregarSecao(nomeSecao)`: chama RPC com `p_secoes=ARRAY[nomeSecao]`, faz merge no `dados`.
- `recarregar()`: refaz a chamada inicial.

## Fase 3 — PWA (UI/UX)

### 3.1 Rota e entry point

`frontend/src/App.tsx`: adicionar rotas lazy:

```typescript
const RelatorioLoteSeletorPage = lazy(() => import('./pages/RelatorioLoteSeletorPage'))
const RelatorioLotePage = lazy(() => import('./pages/RelatorioLotePage'))
```

Rotas:

```tsx
<Route path="/modulos/relatorios/lote" element={<RelatorioLoteSeletorPage />} />
<Route path="/modulos/relatorios/lote/:loteId" element={<RelatorioLotePage />} />
```

`frontend/src/pages/RelatoriosPage.tsx`: adicionar item ao `menuItems`:

```typescript
const menuItems = [
  {
    id: 'lote',
    label: 'Lote (Ciclo de Vida)',
    emoji: '🐄',
    color: '#3b82f6',
    path: '/modulos/relatorios/lote',
  },
]
```

### 3.2 Seletor de lotes: `RelatorioLoteSeletorPage.tsx`

Arquivo novo: `frontend/src/pages/RelatorioLoteSeletorPage.tsx`.

Padrão visual idêntico ao `ListaRegistros.tsx`:

- Header verde gradient com "Voltar" pill e título "Relatório de Lote".
- Input de busca: "Buscar lote por nome...".
- Filtro pill: "Ativos" / "Todos".
- Cards verticais, um por lote:
  - Linha 1: nome `font-bold text-lg` + badge "Ativo" (verde) / "Inativo" (cinza).
  - Linha 2: `N animais` em azul `#3b82f6` + `pasto_nome` em cinza.
  - Linha 3: categorias truncadas.
  - Linha 4: badges com emojis `🐄 N movs` `⚰️ N mortes` `🌿 N consumos` `👶 N partos` (só os `tem_*=true`).
- Tap no card navega para `/modulos/relatorios/lote/:loteId`.
- Estado vazio: card roxo "Nenhum lote encontrado".
- Loading: `PageLoader` existente.

### 3.3 Relatório: `RelatorioLotePage.tsx`

Arquivo novo: `frontend/src/pages/RelatorioLotePage.tsx`.

Estrutura de cima para baixo:

**Header verde gradient** (padrão existente):

- "Voltar" pill à esquerda.
- Título: nome do lote.
- Subtítulo: "Relatório do Lote" em `text-white/75`.

**Cartão de indicadores** (sempre visível, primeiro card):

`bg-white rounded-2xl p-4 shadow-lg border border-gray-100`, grid 2x2:

| Ganho de peso/dia | Cabeças |
|---|---|
| Peso médio | Idade do lote |

Labels `text-gray-500 font-semibold text-xs uppercase`, valores `text-gray-900 font-bold text-xl`. Badge "INATIVO" vermelha no canto superior direito se aplicável. Abaixo do grid, linha de badges: `⚰️ N mortes` `👶 N partos` `🌿 N consumos` `🔄 N movs` `📍 N pastos`.

**Seções colapsáveis** (accordion vertical, uma aberta por vez, Cadastro aberta por padrão):

Cada seção é um `SecaoRelatorio` com header `bg-gray-50 rounded-xl p-3 border border-gray-200`: emoji à esquerda, título `font-bold text-gray-900`, badge de contagem à direita, `ChevronDown` que rotaciona ao expandir.

Ordem (do mais importante ao mais detalhado):

1. **📋 Cadastro** — raça, sexo, sistema de produção, destino, pasto atual, produtor, propriedade origem, contrato, Sisbov. Grid 2 colunas label/valor.
2. **📊 Estado Atual** — categorias ativas com cabeças, peso, GMD, meta projetada. Sub-cards por categoria.
3. **🔄 Trocas de Categoria** — linha do tempo vertical com bolinhas verdes conectadas. Data, origem → destino, peso na transição. Vazio: "Nenhuma troca registrada".
4. **🥗 Histórico Nutricional** — planos com formulação, GMD planejado vs realizado, ganho de peso. Vazio: "Sem plano nutricional registrado".
5. **📍 Pastos por onde passou** — lista de pastos com data entrada → saída, dias, taxa de lotação.
6. **🔄 Movimentações** — entradas (verde) e saídas (vermelho). Data, cabeças, categoria, motivo, lote origem/destino.
7. **⚰️ Mortes** — total + causa mais frequente no topo, depois lista. Zero: "Nenhuma morte registrada" com ✅ em verde.
8. **👶 Nascimentos** — só aparece se houver dados. Total de partos + lista com data, tipo, sexo da cria, peso.
9. **🌿 Consumo** — série temporal de leituras. Data, leitura, kg cocho, consumo %PV, custo/dia. Vazio: "Sem registro de consumo".
10. **🏷️ Animais do Lote** — indivíduos com brinco, categoria, peso, status. Vazio: "Lote sem rastreabilidade individual".

**Comportamento do accordion**:

- Uma seção aberta por vez (abrir fecha a outra). Reduz scroll no mobile.
- Cadastro vem aberta por padrão.
- Ao abrir uma seção ainda não carregada (lazy-load), mostra spinner dentro do accordion e chama `carregarSecao(nomeSecao)`.
- Seção vazia mostra mensagem amigável, não some.

**Sem botão flutuante** (Compartilhar fica para v2).

### 3.4 Componente `SecaoRelatorio.tsx`

Arquivo novo: `frontend/src/components/relatorios/SecaoRelatorio.tsx`.

Props: `icone`, `titulo`, `contagem`, `expandida`, `onToggle`, `carregando`, `children`. Renderiza header do accordion + conteúdo colapsável com CSS transition de altura. Spinner dentro quando `carregando=true`.

### 3.5 Sub-cards por seção

Arquivos novos em `frontend/src/components/relatorios/`:

- `CadastroCard.tsx` — grid 2 colunas label/valor.
- `EstadoAtualCard.tsx` — sub-cards por categoria ativa.
- `CronologiaTimeline.tsx` — linha do tempo vertical com bolinhas verdes.
- `OcupacaoTimeline.tsx` — lista de pastos com datas e dias.
- `MovimentacaoLista.tsx` — lista com badges verde (entrada) / vermelho (saída).
- `MortalidadeCard.tsx` — resumo agregado + lista detalhada.
- `ReproducaoCard.tsx` — resumo + lista de partos.
- `ConsumoLista.tsx` — série temporal de leituras.
- `IndividuosLista.tsx` — tabela simplificada brinco/categoria/peso/status.

Cada componente recebe a seção do payload tipada e renderiza no padrão visual do PWA (cards `bg-gray-50 rounded-xl p-4 border border-gray-200`, labels `text-gray-500 font-semibold uppercase`, valores `text-gray-900 font-bold`).

### 3.6 Tratamento de estados

- **Loading inicial**: `PageLoader` existente.
- **Loading de seção (lazy-load)**: spinner dentro do accordion.
- **Erro de rede**: card amarelo "Sem conexão. Toque para tentar de novo." com botão "Recarregar".
- **Lote não encontrado**: card roxo "Lote não encontrado".
- **RPC retorna `success: false`**: card vermelho com a mensagem.
- **Seção vazia**: mensagem dentro da seção, não oculta a seção.

## Fase 4 — Verificação

1. **Typecheck**: `cd frontend && npx tsc --noEmit` — zero erros.
2. **Build**: `cd frontend && npm run build` — zero erros.
3. **Teste manual na fazenda de testes** (`d649c65e-16ab-4b77-a84b-df937aa41cc3`):
   - Abrir L1 (`d3596b7b-733f-4007-a1ba-af24e25dfe66`, lote rico): confirmar indicadores, 10 seções, accordion, lazy-load ao abrir seção ainda não carregada.
   - Abrir L4 (`6e78d84b-696c-4fca-a29b-f2cc44387f0f`, inativo): confirmar badge "INATIVO", histórico visível.
   - Abrir Lote Curral 5 (`fb6284dd-f49d-4541-8c28-1bbb581b5ba8`, sem dados): confirmar seções vazias com mensagem amigável.
   - Testar offline (desligar rede): confirmar card de erro com botão recarregar.
   - Confirmar que abrir uma seção fecha a anterior.
4. **Performance**: confirmar carregamento inicial < 500ms (RPC 9ms + 3 seções + rede), seção sob demanda < 300ms.

## Fase 5 — Painel Web (futura, não bloqueia o PWA)

- Rota `/controller/relatorios/lote/:loteId` com tabela buscável + visualização desktop.
- Tabelas em vez de accordions, gráfico de linha do tempo da cronologia.
- Export XLSX multi-sheet e PDF (reaproveita utilitários existentes do Painel).
- Link público opcional (v3): `relatorios_publicos` com `tipo='lote'`, variante `get_relatorio_lote_publico(p_token)`.
- Auditoria de Alterações (seção 11) entra aqui quando os triggers de `audit_log` estiverem completos.
- Compartilhar via WhatsApp entra aqui também.

## Ordem de execução

| Passo | Arquivo | Dependência |
|---|---|---|
| 1 | Migration RPC (`criar_rpc_relatorio_lote_ciclo_vida.sql`) | nenhuma |
| 2 | Teste da RPC via `execute_sql` na fazenda de testes | passo 1 |
| 3 | Tipo TypeScript (`relatorioLote.ts`) | passo 2 |
| 4 | Funções em `supabaseService.ts` | passo 3 |
| 5 | Hook `useRelatorioLote.ts` | passo 4 |
| 6 | Componente `SecaoRelatorio.tsx` | passo 5 |
| 7 | Sub-cards por seção (9 arquivos) | passo 6 |
| 8 | `RelatorioLoteSeletorPage.tsx` | passos 4, 6 |
| 9 | `RelatorioLotePage.tsx` | passos 5, 6, 7 |
| 10 | Rota em `App.tsx` + item em `RelatoriosPage.tsx` | passos 8, 9 |
| 11 | Typecheck + build | passo 10 |
| 12 | Teste manual na fazenda de testes | passo 11 |

## IDs de referência para testes

- Fazenda de testes: `d649c65e-16ab-4b77-a84b-df937aa41cc3`
- L1 (lote rico, ativo): `d3596b7b-733f-4007-a1ba-af24e25dfe66`
- L4 (lote inativo): `6e78d84b-696c-4fca-a29b-f2cc44387f0f`
- Lote Curral 5 (sem dados): `fb6284dd-f49d-4541-8c28-1bbb581b5ba8`
- Lote de outra fazenda (para testar posse): `7468b68e-9400-4df2-aaf0-d9af034a00cf`

## Padrões de código a seguir

- RPC: `SECURITY DEFINER`, `SET search_path TO 'public'`, `SET "TimeZone" TO 'America/Cuiaba'`, subqueries correlacionadas (não JOINs em cascata), `GRANT EXECUTE TO authenticated`.
- Datas: `to_char(... AT TIME ZONE 'America/Cuiaba', 'YYYY-MM-DD')`.
- Filtros: `deleted_at IS NULL` em todas as tabelas que têm a coluna; `ativo=true` em `lote_categorias`, `lotes` (opcional, relatório mostra inativos também), `currais`, `pastos`.
- PWA: `getSupabaseClientWithRefresh()` para chamadas RPC, `useSelector` para `fazendaId` do Redux, `PageLoader` para loading, `ChevronLeft` do `lucide-react` para botão voltar.
- Visual: header `bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a]`, cards `bg-white rounded-2xl p-4 shadow-lg border border-gray-100` ou `bg-gray-50 rounded-xl p-4 border border-gray-200`, labels `text-gray-500 font-semibold uppercase`, valores `text-gray-900 font-bold`, destaque azul `text-[#3b82f6]`.
