# Plano de Correções PWA — Impacto Exclusivo no PWA

> Auditoria realizada em julho/2026. Estas 52 correções podem ser aplicadas
> imediatamente no PWA sem afetar o Painel Web (`GestaUp-Cadernetas-Gestao`),
> pois são internas ao PWA ou adicionam colunas ao schema (o Painel faz
> `SELECT *` e ignora colunas extras).

---

## Grupo 1 — Consistência Schema/Sync (11 correções)

> **Risco**: dados perdidos silenciosamente no sync. O PWA envia campos que
> não existem no schema do Supabase; o Supabase ignora ou erro.

### C1 — Maternidade: 12 campos perdidos
- **Arquivo**: `frontend/src/services/syncService.ts:76-97`
- **Problema**: Campos enviados para `registros_maternidade` que não existem
  no schema: `pasto`, `lote`, `id_provisorio_cria`, `id_brinco_cria`,
  `id_chip_cria`, `observacao_parto`, `id_manejo_mae`, `id_brinco_mae`,
  `id_chip_mae`, `individuo_id_mae`, `individuo_id_cria`, `docilidade_matriz`.
  Schema só tem: `pasto_id`, `lote_id`, `numero_cria`, `numero_mae`.
- **Correção**: Adicionar as colunas faltantes ao schema via migration OU
  mapear para os campos existentes (`pasto_id`, `lote_id`, `numero_cria`,
  `numero_mae`).
- **Impacto Painel**: Neutro (Painel faz SELECT *).

### C2 — Pastagens: 14 campos perdidos
- **Arquivo**: `frontend/src/services/syncService.ts:103-157`
- **Problema**: Campos enviados para `registros_pastagens` que não existem
  no schema: `pasto_saida`, `lote`, `pasto_entrada`, `pasto_saida_area_util`,
  `pasto_saida_especie`, `pasto_entrada_area_util`, `pasto_entrada_especie`,
  `gado_contado`, `total_animais`, `escore_gado`, `avaliacao_geral` (objeto),
  `escore_fezes`, `numero_pessoas_manejo`, `equipe_nomes`.
- **Correção**: Adicionar colunas ao schema ou mapear para campos existentes
  (`pasto_saida_id`, `pasto_entrada_id`, `avaliacao_saida`,
  `avaliacao_entrada`).
- **Impacto Painel**: Neutro.

### C3 — Rodeio: campo `diagnosticos` como objeto
- **Arquivo**: `frontend/src/services/syncService.ts:162-179`
- **Problema**: Envia `diagnosticos` como objeto JSON, mas o schema usa
  campos booleanos individuais: `escore_gado_ideal`, `agua_boa_bebedouro`,
  `pastagem_adequada`, `animais_doentes`, `cercas_cochos`,
  `carrapatos_moscas`, `animais_entrevero`, `animal_morto` com respectivos
  `_obs`.
- **Correção**: Desestruturar o objeto `diagnosticos` em campos booleanos
  individuais no `registroToSupabase`.
- **Impacto Painel**: Neutro.

### C4 — Rodeio: nomes errados de campos
- **Arquivo**: `frontend/src/services/syncService.ts:170,178`
- **Problema**: Envia `boi` (schema tem `boi_gordo`) e `escore_gado`
  (schema tem `escore_gado_ideal`).
- **Correção**: Renomear no mapeamento: `boi_gordo: registro.boi` e
  remover `escore_gado` ou mapear para campo correto.
- **Impacto Painel**: Neutro.

### C5 — Bebedouros: campos não enviados
- **Arquivo**: `frontend/src/services/syncService.ts:218-227`
- **Problema**: `gado` e `categoria` existem no schema de
  `registros_bebedouros` mas o PWA não os envia.
- **Correção**: Adicionar `gado: registro.gado || null` e
  `categoria: registro.categoria || null` no case 'bebedouros'.
- **Impacto Painel**: Benéfico (Painel terá esses dados disponíveis).

### C6 — Leitura Cocho: tabela inexistente
- **Arquivo**: `frontend/src/services/syncService.ts:437-450`
- **Problema**: Caderneta 'leitura-cocho' envia para tabela
  `registros_leitura_cocho` que não existe no schema.
- **Correção**: Criar a tabela via migration OU remover o sync desta
  caderneta até a tabela existir.
- **Impacto Painel**: Neutro (Painel não referencia esta tabela).

### C7 — Movimentação: nomes errados
- **Arquivo**: `frontend/src/services/syncService.ts:233-238`
- **Problema**: `lote_origem` (schema tem `lote_origem_id`), `destino`
  (schema tem `lote_destino_id`), `peso_vivo_atual_kg` (schema tem
  `peso_medio_kg`).
- **Correção**: Renomear no mapeamento.
- **Impacto Painel**: Neutro.

### C8 — Maternidade: tipo_parto como array
- **Arquivo**: `frontend/src/services/syncService.ts:85`
- **Problema**: Envia `tipo_parto` como array, mas schema define como TEXT.
- **Correção**: `tipo_parto: Array.isArray(registro.tipoParto) ?
  registro.tipoParto.join(', ') : (registro.tipoParto || null)`.
- **Impacto Painel**: Neutro.

### C11 — Pastagens: avaliacao_geral sem estrutura
- **Arquivo**: `frontend/src/services/syncService.ts:124-153`
- **Problema**: `avaliacao_geral` é objeto complexo sem coluna JSONB no
  schema.
- **Correção**: Adicionar coluna JSONB `avaliacao_geral` ao schema ou
  achatar em campos individuais.
- **Impacto Painel**: Neutro.

### C12 — Pastagens: equipe_nomes sem campo
- **Arquivo**: `frontend/src/services/syncService.ts:156`
- **Problema**: `equipe_nomes` enviado como JSON.stringify sem campo no
  schema.
- **Correção**: Adicionar coluna `equipe_nomes TEXT` ou `equipe TEXT[]`
  ao schema.
- **Impacto Painel**: Neutro.

### C14 — Typos em índices do schema
- **Arquivo**: `mcp-server/schema.sql:332-334`
- **Problema**: `idx_supplementacao_dispositivo` e
  `idx_supplementacao_deleted` com typo (supplementacao → suplementacao).
- **Correção**: Renomear índices.
- **Impacto Painel**: Neutro.

---

## Grupo 2 — Cálculos: Divisões por Zero (6 correções)

> **Risco**: NaN/Infinity em relatórios compartilhados e métricas.

### N10 — calcularCmsIntervalo
- **Arquivo**: `frontend/src/utils/leituraCochoMetrics.ts:103-114`
- **Problema**: Se `diasIntervalo === 0` (mesmo dia), retorna NaN.
- **Correção**: `if (diasIntervalo <= 0) return null` no início.

### N11 — calcularPesoVivoMedio
- **Arquivo**: `frontend/src/utils/leituraCochoMetrics.ts:228`
- **Problema**: Divide por `quantTotal` sem verificar se é zero antes do
  return.
- **Correção**: `if (quantTotal === 0) return null` antes da divisão.

### N12 — calcularMediaMsKg
- **Arquivo**: `frontend/src/utils/leituraCochoMetrics.ts:291`
- **Problema**: Divide por `cabecas` sem verificação prévia.
- **Correção**: `if (cabecas === 0) return null` no início.

### N13 — calcularPeriodoTrato
- **Arquivo**: `frontend/src/utils/shareUtils.ts:111-143`
- **Problema**: Não verifica se `todosRegistros` é null/undefined antes de
  filtrar.
- **Correção**: `if (!todosRegistros || !Array.isArray(todosRegistros) ||
  todosRegistros.length === 0) return null`.

### N14 — supplementMetrics: divisões sem verificação
- **Arquivo**: `frontend/src/utils/supplementMetrics.ts:229,240,255-261`
- **Problema**: Divide por `animaisElegiveis` e `pesoVivoMedio` sem checar
  zero.
- **Correção**: `if (animaisElegiveis === 0) return nullMetrics(...)` e
  `if (pesoVivoMedio === 0) return nullMetrics(...)`.

### N26 — Médias não arredondadas
- **Arquivo**: `frontend/src/utils/leituraCochoMetrics.ts:201-202`
- **Problema**: Média de 10 dias e geral não arredondam, retornam muitos
  decimais.
- **Correção**: `Math.round(valor * 100) / 100`.

---

## Grupo 3 — Fuso Horário (3 correções)

> **Risco**: datas/horas incorretas em registros (diferença de 4 horas
> entre fuso do dispositivo e America/Cuiaba).

### C9 — todayBR() sem timezone
- **Arquivo**: `frontend/src/utils/formatDate.ts:1-7`
- **Problema**: Usa `new Date()` (fuso do dispositivo) em vez de
  America/Cuiaba.
- **Correção**: Usar `getDateTimePartsInTimezone(new Date(),
  'America/Cuiaba')`.
- **Impacto Painel**: Indireto — se o PWA enviar datas corretas, o Painel
  precisa alinhar filtros de data com o mesmo fuso (ver C13).

### C10 — Funções delete* sem timezone
- **Arquivo**: `frontend/src/services/supabaseService.ts` (14 funções:
  deletePasto, deleteLote, deleteBebedouro, deleteSetor, deleteRaca, etc.)
- **Problema**: Usam `new Date().toISOString()` para `deleted_at`.
- **Correção**: Usar `getCurrentDateTimeInTimezone('America/Cuiaba')`.
- **Impacto Painel**: Indireto (mesmo caso C9).

### C13 — Data inicial sem timezone
- **Arquivo**: `frontend/src/services/api.ts:28-30`
- **Problema**: `data.data` vem do formulário que usa `todayBR()` sem
  timezone.
- **Correção**: Garantir que `todayBR()` aplique timezone (corrigido em
  C9).

---

## Grupo 4 — Bugs de Runtime (24 correções)

> **Risco**: crashes, loops infinitos, estados inconsistentes.

### Crítico

| ID | Arquivo:Linha | Problema | Correção |
|---|---|---|---|
| R1 | AlmoxarifadoPage.tsx:241-248 | useEffect com dependência faltante pode causar loop infinito | Adicionar `itemEditando` às dependências ou usar useCallback |

### Altos

| ID | Arquivo:Linha | Problema | Correção |
|---|---|---|---|
| R2 | CantinaPage.tsx:102-104 | `form.quemAjudou.forEach` sem null check | `(form.quemAjudou \|\| []).forEach(...)` |
| R3 | ClimaPage.tsx:69-71 | `form.medicoes.forEach` sem null check | `(form.medicoes \|\| []).forEach(...)` |
| R4 | EnfermariaPage.tsx:120 | `useState(makeInitial)` em vez de lazy initializer | `useState(() => makeInitial())` |
| R5 | EntradaInsumosPage.tsx:186-202 | setInterval sem cleanup em caso de erro | Mover verificação para dentro do efeito |

### Médios

| ID | Arquivo:Linha | Problema | Correção |
|---|---|---|---|
| R6 | LimpezaPage.tsx:99-107 | `form.limpezaRealizada.forEach` sem null check | `(form.limpezaRealizada \|\| []).forEach(...)` |
| R7 | ManutencaoMaquinasPage.tsx:116-118 | `p.checklist[campo]` sem optional chaining | `p.checklist?.[campo]` |
| R8 | MaternidadePage.tsx:162 | `useState(makeInitial)` | `useState(() => makeInitial())` |
| R9 | MortePage.tsx:162 | `useState(makeInitial)` | `useState(() => makeInitial())` |
| R10 | MovimentacaoPage.tsx:104 | `useState(makeInitial)` | `useState(() => makeInitial())` |
| R11 | OperacoesMaquinasPage.tsx:125-127 | split de string sem verificação | `form.horaInicial?.split(':') \|\| ['0','0']` |
| R12 | PastagensPage.tsx:195-197 | useEffect com dependência não memoizada | useCallback em `garantirExecucao` |
| R13 | ProblemasPage.tsx:91 | `useState(makeInitial)` | `useState(() => makeInitial())` |
| R14 | RodeioPage.tsx:162-164 | useEffect com dependência não memoizada | useCallback em `garantirExecucao` |
| R15 | SaidaInsumosPage.tsx:130 | `suplementacaoData!.insumos` com assertion | `suplementacaoData?.insumos \|\| []` |
| R16 | SaidaInsumosPage.tsx:127 | `result.id` sem verificação | `result?.id` |
| R17 | SuplementacaoPage.tsx:167-169 | useEffect com dependência não memoizada | useCallback em `garantirExecucao` |

### Baixos

| ID | Arquivo:Linha | Problema | Correção |
|---|---|---|---|
| R18 | AbastecimentoPage.tsx:199 | `setSalvando(false)` não executado em erro | try-catch-finally |
| R19 | BebedourosPage.tsx:183-192 | Event listener sem verificação de unsubscribe | `typeof unsubscribe === 'function'` |
| R20 | EnfermariaPage.tsx:244-259 | Erro silenciado sem feedback ao usuário | Adicionar estado de erro visual |
| R21 | LeituraCochoPage.tsx:193-198 | Erro silenciado | Tratamento mais específico |
| R22 | MovimentacaoPage.tsx:190-201 | Event listener sem verificação | `typeof unsubscribe === 'function'` |
| R23 | PastagensPage.tsx:202-212 | Event listener sem verificação | `typeof unsubscribe === 'function'` |
| R24 | RodeioPage.tsx:202-212 | Event listener sem verificação | `typeof unsubscribe === 'function'` |

---

## Grupo 5 — Validação e Lógica (8 correções)

> **Risco**: dados inválidos aceitos, erros de validação não tratados.

### N15 — validateSuplementacao: sem range máximo
- **Arquivo**: `frontend/src/utils/validation.ts:236-241`
- **Problema**: Não valida range máximo para `kgCocho` e `kgDeposito`.
  Valores absurdamente altos são aceitos.
- **Correção**: `if (!isScaleValue(data.kgCocho, 0, 10000))` ou limitar
  conforme capacidade real.

### N16 — validateMovimentacao: sem máximo em numeroCabecas
- **Arquivo**: `frontend/src/utils/validation.ts:279`
- **Problema**: Verifica se `numeroCabecas > 0` mas não valida máximo.
- **Correção**: `if (Number(data.numeroCabecas) > 10000)
  errors.push(...)`.

### N17 — useFormValidation: min/max sem verificar tipo
- **Arquivo**: `frontend/src/hooks/useFormValidation.ts:142-151`
- **Problema**: Validação de `min` e `max` não verifica se valor é número
  antes de comparar. String numérica falha silenciosamente.
- **Correção**: Adicionar `typeof value === 'number'` ou converter com
  `Number(value)`.

### N18 — useFormValidation: validação custom sem try-catch
- **Arquivo**: `frontend/src/hooks/useFormValidation.ts:159-166`
- **Problema**: Se `rule.custom` lançar erro, quebra toda a validação.
- **Correção**: `try { const customError = rule.custom(value, form); ...
  } catch (e) { errors[field] = 'Erro na validação' }`.

### N27 — shareUtils: filtragem de zeros hardcoded
- **Arquivo**: `frontend/src/utils/shareUtils.ts:187-197`
- **Problema**: Filtragem de campos com valor zero é hardcoded por
  caderneta. Duplicação de código.
- **Correção**: Extrair para configuração centralizada em constants.ts ou
  config da caderneta.

### N28 — isValidDate: impede datas futuras
- **Arquivo**: `frontend/src/utils/validation.ts:11-23`
- **Problema**: Verifica se data <= hoje. Impede registrar datas futuras,
  mas pode ser necessário para planejamento.
- **Correção**: Adicionar parâmetro `allowFuture: boolean`.

### N29 — Redux persist não inclui sync
- **Arquivo**: `frontend/src/store/store.ts:12`
- **Problema**: Redux persist whitelist não inclui `sync`. Estado de sync
  é perdido ao recarregar.
- **Correção**: Avaliar se `sync` deve ser persistido. Se sim, adicionar
  à whitelist; se não, documentar decisão.

### N30 — supabaseService: create/update sem retorno completo em erro
- **Arquivo**: `frontend/src/services/supabaseService.ts:1311-1334`
- **Problema**: Funções create/update não retornam o registro atualizado
  completo em caso de erro parcial.
- **Correção**: Garantir retorno do estado atual ou erro claro. Usar
  transações onde aplicável.

---

## Resumo

| Grupo | Quantidade | Risco principal | Pode aplicar agora |
|---|---|---|---|
| Schema/Sync (C1-C14) | 11 | Dados perdidos no sync | Sim |
| Cálculos (N10-N14, N26) | 6 | NaN/Infinity em relatórios | Sim |
| Fuso horário (C9, C10, C13) | 3 | Datas/horas incorretas | Sim |
| Bugs runtime (R1-R24) | 24 | Crashes e loops | Sim |
| Validação (N15-N18, N27-N30) | 8 | Dados inválidos aceitos | Sim |
| **Total** | **52** | — | **Sim** |

### Ordem sugerida de aplicação

1. **Schema/Sync (C1-C8)** — dados sendo perdidos agora
2. **Cálculos (N10-N14)** — NaN em relatórios compartilhados
3. **Fuso horário (C9, C10, C13)** — datas incorretas
4. **Bugs runtime críticos e altos (R1-R5)** — crashes
5. **Bugs runtime médios e baixos (R6-R24)** — robustez
6. **Validação (N15-N18, N27-N30)** — qualidade de dados
