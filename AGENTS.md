# AGENTS.md — Caderneta Digital Gesta-Up

## Sistemas que compartilham o mesmo banco Supabase

- **PWA (este repo)**: `C:\Users\USER\Documents\Caderneta-Digital-Gesta-Up` — React PWA offline-first com sync IndexedDB
- **Painel Web (outro repo)**: `C:\Users\USER\Documents\GestaUp-Cadernetas-Gestao` — React + TanStack Query, online, gestão/admin

Projeto Supabase: `nrwljcvhwbezmoummxbl` ("Cadernetas Digitais")

## Comandos

- Build PWA: `cd frontend && npm run build`
- Typecheck PWA: `cd frontend && npx tsc --noEmit`
- Dev PWA: `cd frontend && npm run dev`

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
