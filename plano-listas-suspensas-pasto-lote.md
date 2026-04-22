# Plano de Implementação: Listas Suspensas para Pasto e Lote

## Objetivo
Adicionar listas suspensas com valores pré-cadastrados para número do pasto e do lote na caderneta de suplementação, similar ao funcionamento atual dos produtos.

## Estrutura da Planilha Base de Dados

### Atual
```
id | nome | link | MINERAL | PROTEINADO | RACAO
```

### Nova
```
id | nome | link | MINERAL | PROTEINADO | RACAO | PASTO | LOTE
```

- Coluna PASTO: índice 6 (coluna G)
- Coluna LOTE: índice 7 (coluna H)

---

## Fase 1: Backend - googleSheetsService.ts

### Nova Função: `getPastosELotesDaFazenda`

**Parâmetros:**
- `spreadsheetUrl`: string - URL da planilha base de dados
- `farmId`: string - ID da fazenda

**Retorno:**
```typescript
{
  pastos: string[],
  lotes: string[]
}
```

**Lógica:**
1. Listar todas as abas da planilha
2. Mapear colunas: PASTO (índice 6), LOTE (índice 7)
3. Converter índices para letras: G (PASTO), H (LOTE)
4. Buscar valores não vazios das colunas G e H a partir da linha 2
5. Filtrar valores vazios e duplicados
6. Retornar arrays ordenados alfabeticamente

**Exemplo de código:**
```typescript
export async function getPastosELotesDaFazenda(
  spreadsheetUrl: string,
  farmId: string
): Promise<{ pastos: string[], lotes: string[] }> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)

  const response = await sheets.spreadsheets.get({ spreadsheetId })
  const sheetNames = response.data.sheets?.map((sheet) => sheet.properties?.title).filter((title): title is string => title !== undefined) || []

  for (const sheetName of sheetNames) {
    try {
      // Buscar colunas G (PASTO) e H (LOTE) a partir da linha 2
      const range = `${sheetName}!G2:H1000`
      const cellResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })

      const values = cellResponse.data.values
      if (!values || values.length === 0) {
        continue
      }

      const pastos: string[] = []
      const lotes: string[] = []

      for (const row of values) {
        const pasto = row.length > 0 ? String(row[0]).trim() : ''
        const lote = row.length > 1 ? String(row[1]).trim() : ''

        if (pasto && pasto !== '') {
          pastos.push(pasto)
        }
        if (lote && lote !== '') {
          lotes.push(lote)
        }
      }

      if (pastos.length > 0 || lotes.length > 0) {
        logger.info(`Pastos e lotes encontrados na aba ${sheetName}`)
        return {
          pastos: [...new Set(pastos)].sort(),
          lotes: [...new Set(lotes)].sort()
        }
      }
    } catch (error) {
      logger.error(`Erro ao buscar pastos e lotes na aba ${sheetName}: ${error}`)
    }
  }

  logger.warn(`Nenhum pasto ou lote encontrado para fazenda ${farmId}`)
  return { pastos: [], lotes: [] }
}
```

---

## Fase 2: Backend - suplementacaoController.ts

### Novo Endpoint: `GET /suplementacao/pastos-lotes`

**Query Params:**
- `fazenda`: string (obrigatório)

**Retorno:**
```typescript
{
  success: boolean,
  pastos: string[],
  lotes: string[]
}
```

**Erros:**
- 400: fazenda não fornecido
- 500: erro ao buscar dados

**Exemplo de código:**
```typescript
suplementacaoRouter.get('/pastos-lotes', async (req: Request, res: Response) => {
  const { fazenda } = req.query as { fazenda?: string }

  if (!fazenda) {
    return res.status(400).json({ success: false, error: 'fazenda é obrigatório' })
  }

  try {
    const result = await getPastosELotesDaFazenda(DATABASE_URL, fazenda)
    return res.json({ success: true, ...result })
  } catch (error) {
    logger.error(`Erro ao buscar pastos e lotes: ${error}`)
    return res.status(500).json({ success: false, error: 'Erro ao buscar pastos e lotes' })
  }
})
```

---

## Fase 3: Frontend - SuplementacaoPage.tsx (Estados)

### Novos Estados
```typescript
const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
const [carregandoPastosLotes, setCarregandoPastosLotes] = useState(false)
```

---

## Fase 4: Frontend - SuplementacaoPage.tsx (useEffect)

### Novo useEffect
```typescript
useEffect(() => {
  async function carregarPastosELotes() {
    if (!fazenda) return

    setCarregandoPastosLotes(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/suplementacao/pastos-lotes?fazenda=${encodeURIComponent(fazenda)}`)
      const data = await response.json()

      if (data.success) {
        setPastosDisponiveis(data.pastos || [])
        setLotesDisponiveis(data.lotes || [])
      }
    } catch (error) {
      console.error('Erro ao carregar pastos e lotes:', error)
    } finally {
      setCarregandoPastosLotes(false)
    }
  }

  carregarPastosELotes()
}, [fazenda])
```

---

## Fase 5: Frontend - SuplementacaoPage.tsx (UI)

### Alterações na UI

**Substituir input de Pasto:**
```tsx
{pastosDisponiveis.length > 0 ? (
  <Select
    label="Pasto"
    value={form.pasto}
    onChange={set('pasto')}
    options={pastosDisponiveis.map(p => ({ value: p, label: p }))}
    placeholder="Selecione o pasto..."
  />
) : (
  <Input
    label="Pasto"
    placeholder="Digite o pasto..."
    value={form.pasto}
    onChange={setInput('pasto')}
  />
)}
```

**Substituir input de Número Lote:**
```tsx
{lotesDisponiveis.length > 0 ? (
  <Select
    label="Número Lote"
    value={form.numeroLote}
    onChange={set('numeroLote')}
    options={lotesDisponiveis.map(l => ({ value: l, label: l }))}
    placeholder="Selecione o lote..."
  />
) : (
  <Input
    label="Número Lote"
    placeholder="Digite o número do lote..."
    value={form.numeroLote}
    onChange={setInput('numeroLote')}
  />
)}
```

**Indicador de carregamento:**
```tsx
{carregandoPastosLotes && (
  <div className="text-sm text-gray-500">Carregando pastos e lotes...</div>
)}
```

---

## Fase 6: Planilha Base de Dados

### Atualização da Planilha

1. Adicionar colunas PASTO (coluna G) e LOTE (coluna H) após RACAO
2. Cadastrar valores para cada fazenda nas respectivas colunas
3. Valores podem ser repetidos entre fazendas (cada aba tem seus próprios valores)

### Exemplo de Estrutura
| id | nome | link | MINERAL | PROTEINADO | RACAO | PASTO | LOTE |
|----|------|------|---------|------------|-------|-------|------|
| FAZENDA1 | Fazenda 1 | link... | Mineral A | Proteinado B | Ração C | Pasto 1<br>Pasto 2 | Lote 1<br>Lote 2<br>Lote 3 |
| FAZENDA2 | Fazenda 2 | link... | Mineral D | Proteinado E | Ração F | Pasto 3<br>Pasto 4 | Lote 4<br>Lote 5 |

---

## Compatibilidade e Fallback

### Comportamento Esperado
- Se arrays vazios (erro ou não cadastrado), usar inputs de texto
- Manter compatibilidade com dados existentes
- Não quebrar funcionalidade atual de subtipos
- Fallback para input de texto se falhar ao buscar pastos/lotes

### Validação
- Permitir valores personalizados mesmo com lista suspensa (se necessário)
- Não validar se valor está na lista (flexibilidade para casos especiais)

---

## Status das Fases

- [ ] Fase 1: Backend - googleSheetsService.ts
- [ ] Fase 2: Backend - suplementacaoController.ts
- [ ] Fase 3: Frontend - Estados
- [ ] Fase 4: Frontend - useEffect
- [ ] Fase 5: Frontend - UI
- [ ] Fase 6: Planilha Base de Dados
