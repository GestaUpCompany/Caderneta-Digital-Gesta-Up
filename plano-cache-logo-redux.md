# Plano de Ação: Cache de Logo da Fazenda no Redux

## Problema
- A logo da fazenda não está sendo carregada corretamente nas telas do app, exceto no Home principal
- Existe um delay pequeno até a logo ser carregada e exibida cada vez que o usuário entra numa tela diferente
- A logo deve ser consultada do banco de dados (tabela fazendas), mas atualmente usa função hardcoded

## Análise da Implementação Atual

### Home.tsx (funciona corretamente)
- Usa `getFazendaByAcessoId(acessoId)` para buscar a fazenda do banco de dados
- Extrai `logo_url` da fazenda retornada
- Salva em estado local `logoUrl`
- Passa `logoUrl` como prop para o componente `FarmLogo`

### FarmLogo.tsx
- Recebe `farmName` e `logoUrl` como props
- Se `logoUrl` for fornecido e não vazio, usa ela
- Caso contrário, usa `getFarmLogo(farmName)` (função hardcoded em constants.ts)

### Outras páginas (não funcionam)
- Usam o componente `FarmLogo` passando apenas `farmName`
- NÃO passam `logoUrl`
- Por isso, o componente usa a função hardcoded `getFarmLogo` em vez de buscar do banco

### constants.ts
- `getFarmLogo(farmName)` retorna URLs estáticas baseadas no nome da fazenda (hardcoded)
- Não consulta o banco de dados

### Tabela fazendas no banco
- Tem o campo `logo_url` que armazena a URL da logo customizada

### supabaseService.ts
- Tem `getFazendaByAcessoId(acessoId)` para buscar fazenda pelo acesso_id
- Tem funções para upload/delete de logo que atualizam o campo `logo_url`

### configSlice Redux
- Já tem o campo `logoUrl` no estado
- Redux está configurado com persistência no localStorage
- whitelist inclui 'config', então logoUrl será persistido

## Solução Proposta

### Estratégia
1. Atualizar Home.tsx para salvar logoUrl no Redux em vez de estado local
2. Atualizar todas as páginas para usar logoUrl do Redux
3. Eliminar delay usando cache global do Redux (persistido)

### Benefícios
- Logo carregada do banco apenas uma vez (no Home)
- Cacheada no Redux (persistido no localStorage)
- Todas as páginas usam logo cacheada instantaneamente
- Zero delay após o primeiro carregamento
- Ao mudar de fazenda, logo atualizada automaticamente (useEffect reage ao acessoId)

## Plano de Ação Detalhado

### Fase 1: Home.tsx (fonte de verdade)
**Arquivo:** `frontend/src/pages/Home.tsx`

1. Adicionar `useDispatch` import
2. Remover estado local `logoUrl`
3. Usar `logoUrl` do Redux via `useSelector`
4. No useEffect, salvar logoUrl no Redux com `dispatch(setConfig({ logoUrl }))`

**Mudanças:**
```typescript
// Antes:
const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)

// Depois:
const dispatch = useDispatch()
const { logoUrl } = useSelector((state: RootState) => state.config)

// No useEffect:
// Antes:
setLogoUrl(fazendaData.logo_url)

// Depois:
dispatch(setConfig({ logoUrl: fazendaData.logo_url }))
```

### Fase 2: Páginas de cadernetas (14 páginas)
**Arquivos:**
- `frontend/src/pages/cadernetas/MaternidadePage.tsx`
- `frontend/src/pages/cadernetas/RodeioPage.tsx`
- `frontend/src/pages/cadernetas/PastagensPage.tsx`
- `frontend/src/pages/cadernetas/SuplementacaoPage.tsx`
- `frontend/src/pages/cadernetas/MortePage.tsx`
- `frontend/src/pages/cadernetas/EnfermariaPage.tsx`
- `frontend/src/pages/cadernetas/BebedourosPage.tsx`
- `frontend/src/pages/cadernetas/MovimentacaoPage.tsx`
- `frontend/src/pages/cadernetas/AbastecimentoPage.tsx`
- `frontend/src/pages/cadernetas/CantinaPage.tsx`
- `frontend/src/pages/cadernetas/LimpezaPage.tsx`
- `frontend/src/pages/cadernetas/ClimaPage.tsx`
- `frontend/src/pages/cadernetas/OperacoesMaquinasPage.tsx`

**Mudanças para cada página:**
1. Adicionar `logoUrl` ao `useSelector` do config
2. Passar `logoUrl={logoUrl}` como prop para o componente `FarmLogo`

**Exemplo:**
```typescript
// Antes:
const { fazenda } = useSelector((state: RootState) => state.config)

// Depois:
const { fazenda, logoUrl } = useSelector((state: RootState) => state.config)

// No FarmLogo:
// Antes:
<FarmLogo farmName={fazenda} type="both" size="medium" />

// Depois:
<FarmLogo farmName={fazenda} logoUrl={logoUrl} type="both" size="medium" />
```

### Fase 3: Páginas de menu (3 páginas)
**Arquivos:**
- `frontend/src/pages/ModulosMenuPage.tsx`
- `frontend/src/pages/RelatoriosPage.tsx`
- `frontend/src/pages/ChecklistsMenuPage.tsx`

**Mudanças (mesmo padrão da Fase 2):**
1. Adicionar `logoUrl` ao `useSelector` do config
2. Passar `logoUrl={logoUrl}` como prop para o componente `FarmLogo`

### Fase 4: Páginas de checklists (4 páginas)
**Arquivos:**
- `frontend/src/pages/estoque-insumos/EntradaPage.tsx`
- `frontend/src/pages/estoque-insumos/ProducaoPage.tsx`
- `frontend/src/pages/estoque-insumos/EstoquePage.tsx`
- `frontend/src/pages/estoque-insumos/CadastroPage.tsx`

**Mudanças (mesmo padrão da Fase 2):**
1. Adicionar `logoUrl` ao `useSelector` do config
2. Passar `logoUrl={logoUrl}` como prop para o componente `FarmLogo`

## Total de Arquivos a Modificar
- **1 arquivo** (Home.tsx) - mudança maior (adicionar dispatch, remover estado local)
- **21 arquivos** (todas as outras páginas) - mudança padrão (adicionar logoUrl ao selector e passar como prop)

## Resultado Esperado
1. Logo carregada do banco apenas no Home (primeira vez)
2. Cacheada no Redux (persistido no localStorage via redux-persist)
3. Todas as páginas usam logo cacheada instantaneamente
4. Zero delay após o primeiro carregamento
5. Ao mudar de fazenda (acessoId), logo atualizada automaticamente no Home e propagada para todas as páginas

## Fluxo de Atualização ao Mudar de Fazenda
1. Usuário muda fazenda nas configurações
2. `acessoId` muda no Redux
3. Home.tsx detecta mudança (useEffect depende de `[acessoId, configurado]`)
4. useEffect roda novamente
5. Busca nova fazenda do banco usando novo `acessoId`
6. Atualiza `logoUrl` no Redux com logo da nova fazenda
7. Todas as páginas usam `logoUrl` do Redux
8. Logo nova exibida instantaneamente em todas as páginas
