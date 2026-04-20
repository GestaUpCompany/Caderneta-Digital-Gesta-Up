---
description: Plano de implementação de subtipos de suplementação e campo Creep
---

# Plano de Implementação - Subtipos de Suplementação + Creep

## Contexto
Implementar funcionalidade de subtipos dinâmicos para os tipos de suplementação (Mineral, Proteinado, Ração) e adicionar campo numérico para Creep. Os subtipos são configurados na planilha base de dados por fazenda.

## Estrutura das Planilhas

### Planilha Base de Dados (colunas D-F)
- Coluna D: MINERAL (subtipos de mineral)
- Coluna E: PROTEINADO (subtipos de proteinado)
- Coluna F: RAÇÃO (subtipos de ração)

**Nota:** Creep não tem coluna na base de dados, pois usa apenas campo numérico de quantidade.

**Formato:** Subtipos em células separadas (Opção A)

### Planilha de Registro de Suplementação
**Nova estrutura:**
```
id | Data | Tratador | Pasto | Número Lote | Produto | Subtipo/Qtd | Gado | Categorias | Leitura | KG
```

**Campo Subtipo/Qtd:**
- Se tipo é Mineral/Proteinado/Ração: armazena subtipo selecionado
- Se tipo é Creep: armazena quantidade numérica

---

## Fase 1: Backend (2 tarefas)

### Tarefa 1: Criar endpoint `/api/suplementacao/subtipos`
- **Arquivo:** `backend/src/routes/suplementacao.ts` (ou criar novo)
- **Método:** GET
- **Parâmetros query:** `fazenda`, `tipo`
- **Response:**
  ```json
  {
    "success": true,
    "subtipos": ["Mineral P", "Mineral S", "Mineral F"]
  }
  ```
- **Erro:**
  ```json
  {
    "success": false,
    "error": "Fazenda não encontrada"
  }
  ```

### Tarefa 2: Implementar lógica de leitura da planilha base
- Ler planilha base de dados (DATABASE_URL)
- Encontrar linha da fazenda pelo ID (coluna A)
- Mapear tipo para coluna:
  - "Mineral" → Coluna D
  - "Proteinado" → Coluna E
  - "Ração" → Coluna F
  - "Creep" → Coluna G
- Ler subtipos da coluna (células não vazias)
- Retornar array limpo (sem valores vazios ou null)

---

## Fase 2: Frontend - Estado e Lógica (3 tarefas)

### Tarefa 3: Adicionar CREEP ao array PRODUTOS
- **Arquivo:** `frontend/src/pages/cadernetas/SuplementacaoPage.tsx`
- **Alteração:**
  ```typescript
  const PRODUTOS = [
    { value: 'Mineral', label: 'MINERAL', icon: '🥄' },
    { value: 'Proteinado', label: 'PROTEINADO', icon: '🥩' },
    { value: 'Ração', label: 'RAÇÃO', icon: '🌽' },
    { value: 'Creep', label: 'CREEP', icon: '🍼' },
  ]
  ```

### Tarefa 4: Adicionar estado em SuplementacaoPage
- **Arquivo:** `frontend/src/pages/cadernetas/SuplementacaoPage.tsx`
- **Novos estados:**
  ```typescript
  const [subtipos, setSubtipos] = useState<string[]>([])
  const [subtipo, setSubtipo] = useState('')
  const [quantidadeCreep, setQuantidadeCreep] = useState('')
  const [carregandoSubtipos, setCarregandoSubtipos] = useState(false)
  ```

### Tarefa 5: useEffect para carregar subtipos
- **Arquivo:** `frontend/src/pages/cadernetas/SuplementacaoPage.tsx`
- **Lógica:**
  - Disparar quando `form.produto` muda
  - **Não carregar** quando `form.produto === 'Creep'`
  - Chamar API `/api/suplementacao/subtipos?fazenda={id}&tipo={tipo}`
  - Atualizar estado `subtipos`
  - Resetar `subtipo` e `quantidadeCreep` quando tipo muda

---

## Fase 3: Frontend - UI (2 tarefas)

### Tarefa 6: Renderizar lista suspensa para subtipo
- **Arquivo:** `frontend/src/pages/cadernetas/SuplementacaoPage.tsx`
- **Componente:** `<select>` ou `<Input type="select">`
- **Posicionamento:** Abaixo do Radio de tipo principal
- **Condição de exibição:** Visível apenas quando tipo é Mineral/Proteinado/Ração
- **Opções:** Dinâmicas baseadas em `subtipos`
- **Placeholder:** "Selecione o tipo..."

### Tarefa 7: Renderizar campo numérico para Creep
- **Arquivo:** `frontend/src/pages/cadernetas/SuplementacaoPage.tsx`
- **Componente:** `<Input type="number">`
- **Posicionamento:** Abaixo do Radio de tipo principal
- **Condição de exibição:** Visível apenas quando tipo é Creep
- **Label:** "QUANTIDADE"
- **Placeholder:** "0"
- **inputMode:** "decimal"
- **min:** "0"

---

## Fase 4: Frontend - Integração (3 tarefas)

### Tarefa 8: Atualizar labelConfig.ts
- **Arquivo:** `frontend/src/config/labelConfig.ts`
- **Alteração:**
  ```typescript
  const SUPLEMENTACAO_LABELS = {
    ...COMMON_LABELS,
    tratador: 'TRATADOR',
    numeroLote: 'NÚMERO LOTE',
    produto: 'PRODUTO',
    gado: 'TIPO DE GADO',
    recria: 'CREEP',
    leitura: 'LEITURA DO COCHO',
    kg: 'KG',
    sacos: 'SACOS',
    subtipoQtd: 'SUBTIPO/QTD', // NOVO
  }
  ```

### Tarefa 9: Integrar no salvamento e compartilhamento
- **Arquivo:** `frontend/src/pages/cadernetas/SuplementacaoPage.tsx`
- **Lógica handleSalvar:**
  ```typescript
  // Se tipo é Creep: salvar quantidade
  // Se tipo é Mineral/Proteinado/Ração: salvar subtipo
  const subtipoQtd = form.produto === 'Creep' ? quantidadeCreep : subtipo
  ```
- **Adicionar ao registro salvo:** `subtipoQtd`
- **Adicionar ao compartilhamento:** `subtipoQtd`

### Tarefa 10: Remover campo obsoleto
- **Arquivo:** `frontend/src/pages/cadernetas/SuplementacaoPage.tsx`
- **Remover:** `sacos` do FormState
- **Remover:** Input de Sacos do JSX
- **Remover:** `sacos` do handleSalvar e compartilhamento

---

## Fase 5: Testes (1 tarefa)

### Tarefa 11: Testar fluxo completo
- Selecionar Mineral → carregar subtipos → selecionar subtipo
- Selecionar Proteinado → carregar subtipos → selecionar subtipo
- Selecionar Ração → carregar subtipos → selecionar subtipo
- Selecionar Creep → exibir campo numérico → inserir quantidade
- Salvar registro com subtipo ou quantidade
- Compartilhar registro com subtipo ou quantidade
- Verificar dados na planilha de registro

---

## Ordem de Implementação
1. Fase 1: Backend (Tarefas 1-2)
2. Fase 2: Frontend - Estado e Lógica (Tarefas 3-5)
3. Fase 3: Frontend - UI (Tarefas 6-7)
4. Fase 4: Frontend - Integração (Tarefas 8-10)
5. Fase 5: Testes (Tarefa 11)

## Observações
- Subtipos são dinâmicos e configuráveis por fazenda na planilha base
- Não é necessário saber quantos subtipos serão no início
- A coluna Subtipo/Qtd na planilha de registro armazena tanto subtipo quanto quantidade
- Creep não tem subtipos, apenas campo numérico de quantidade
