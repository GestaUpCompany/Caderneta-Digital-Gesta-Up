# Plano de Implementação - Módulo de Estoque de Insumos (Fazenda Marcon)

## Objetivo
Implementar módulo de estoque de insumos para a fazenda Marcon, com 3 telas: cadastro (visualização), entrada de insumos e produção/saída de insumos.

## Estrutura de Planilhas
- **Planilha Insumos-Marcon** (1 planilha com 3 páginas)
  - Página 1: Cadastro (base: insumos, dietas, fornecedores, funcionários)
  - Página 2: Entrada (registro de entrada de insumos)
  - Página 3: Saída (registro de produção/saída)

## Coluna "link" na Planilha Base de Dados
```
Caderneta: https://docs.google.com/spreadsheets/d/...
Insumo: https://docs.google.com/spreadsheets/d/...
```

---

## Fase 1: Backend - Extração de Links com Prefixos

### Objetivo
Modificar lógica de extração de links para suportar múltiplos links com prefixos na coluna "link" da planilha base de dados.

### Tarefas
- [x] Criar função `extractLinkByPrefix(cellValue, prefix)` em `googleSheetsService.ts`
- [x] Modificar `validateFarm` para aceitar parâmetro `prefix` (padrão: 'Caderneta')
- [x] Atualizar `sheetsController.ts` para aceitar `prefix` opcional no body

### Detalhes da Implementação
- Retrocompatibilidade com links sem prefixo
- Prefixo padrão 'Caderneta' para manter funcionamento atual
- Regex para extrair link após prefixo específico

### Arquivos Modificados
- `backend/src/services/googleSheetsService.ts`
- `backend/src/controllers/sheetsController.ts`

### Status
**CONCLUÍDO** ✅

---

## Fase 2: Frontend - Refatoração Home para Menu de Módulos

### Objetivo
Transformar Home em menu de módulos, com botões para Cadernetas e Estoque de Insumos.

### Estrutura Proposta
```
Home (menu de módulos)
  - Botão "CADERNETAS" → /modulos/cadernetas
  - Botão "ESTOQUE DE INSUMOS" → /modulos/insumos (só Marcon)

/modulos/cadernetas
  - Grid com 6 cadernetas (igual ao Home atual)

/modulos/insumos
  - 3 botões: Cadastro, Entrada, Produção
```

### Tarefas
- [ ] Criar `ModulosMenuPage.tsx` (menu de cadernetas)
- [ ] Criar `InsumosMenuPage.tsx` (menu de insumos)
- [ ] Refatorar `Home.tsx` para mostrar 2 botões de módulos
- [ ] Adicionar rotas no `App.tsx`:
  - `/modulos/cadernetas`
  - `/modulos/insumos`

### Detalhes da Implementação
- Mover grid de cadernetas do Home para ModulosMenuPage
- Botão de insumos só aparece para fazenda Marcon
- Manter estilo visual consistente

### Arquivos a Criar
- `frontend/src/pages/ModulosMenuPage.tsx`
- `frontend/src/pages/InsumosMenuPage.tsx`

### Arquivos a Modificar
- `frontend/src/pages/Home.tsx`
- `frontend/src/App.tsx`

### Status
**PENDENTE** ⏳

---

## Fase 3: Frontend - Tela de Cadastro (Visualização)

### Objetivo
Criar tela de visualização dos dados cadastrados na planilha de cadastro (insumos, dietas, fornecedores, funcionários).

### Campos da Planilha de Cadastro (Página exclusiva)
```
Insumos | Dietas | Fornecedores | Funcionários
```

### Tarefas
- [ ] Criar `CadastroPage.tsx` em `frontend/src/pages/estoque-insumos/`
- [ ] Implementar leitura da página "Cadastro" da planilha Insumos-Marcon
- [ ] Exibir 4 seções: Insumos, Dietas, Fornecedores, Funcionários
- [ ] Apenas leitura (sem formulário de edição)

### Detalhes da Implementação
- Usar endpoint backend para ler dados
- Layout com abas ou cards para cada seção
- Ícones e estilo visual consistente

### Arquivos a Criar
- `frontend/src/pages/estoque-insumos/CadastroPage.tsx`

### Arquivos a Modificar
- `frontend/src/App.tsx` (adicionar rota `/estoque-insumos/cadastro`)

### Status
**PENDENTE** ⏳

---

## Fase 4: Frontend - Tela de Entrada de Insumos

### Objetivo
Criar tela de entrada de insumos no estoque com formulário.

### Campos do Formulário
- Data Entrada (date)
- Horário (time)
- Produto (dropdown de insumos da base)
- Quantidade (kg) (number)
- Valor unitário (kg) (number)
- Valor total (calculado: quantidade * valor unitário)
- N° nota fiscal (text)
- Fornecedor (dropdown de fornecedores da base)
- Placa (text)
- Motorista (text)
- Responsável recebimento (dropdown de funcionários da base)

### Tarefas
- [ ] Criar `EntradaPage.tsx` em `frontend/src/pages/estoque-insumos/`
- [ ] Implementar formulário com validações
- [ ] Carregar dropdowns da página "Cadastro" da planilha
- [ ] Calcular valor total automaticamente
- [ ] Salvar na página "Entrada" da planilha

### Detalhes da Implementação
- Formulário com campos obrigatórios
- Validação de campos numéricos
- Integração com backend para salvar dados
- Feedback visual de sucesso/erro

### Arquivos a Criar
- `frontend/src/pages/estoque-insumos/EntradaPage.tsx`

### Arquivos a Modificar
- `frontend/src/App.tsx` (adicionar rota `/estoque-insumos/entrada`)

### Status
**PENDENTE** ⏳

---

## Fase 5: Frontend - Tela de Produção/Saída

### Objetivo
Criar tela de produção/saída de insumos com lógica de insumos por dieta.

### Campos do Formulário
- Data de produção (date)
- Dieta produzida (dropdown de dietas da base)
- Destino da produção (dropdown hardcoded: cria, recria, engorda, tropa, outros animais)
- Total produzido (calculado: soma dos insumos)
- Lista de insumos cadastrados com campos de quantidade para cada

### Funcionalidade Avançada
- Exibir apenas insumos relevantes para a dieta selecionada
- Mapear dieta → insumos na planilha base
- Insumos não usados são gravados como 0

### Tarefas
- [ ] Criar `ProducaoPage.tsx` em `frontend/src/pages/estoque-insumos/`
- [ ] Implementar formulário com validações
- [ ] Carregar dropdown de dietas da página "Cadastro"
- [ ] Implementar lógica de insumos por dieta
- [ ] Calcular total produzido automaticamente
- [ ] Salvar na página "Saída" da planilha

### Detalhes da Implementação
- Formulário dinâmico baseado na dieta selecionada
- Mapeamento dieta → insumos (a definir na planilha base)
- Colunas dinâmicas na planilha Saída (uma por insumo)
- Integração com backend para salvar dados

### Arquivos a Criar
- `frontend/src/pages/estoque-insumos/ProducaoPage.tsx`

### Arquivos a Modificar
- `frontend/src/App.tsx` (adicionar rota `/estoque-insumos/producao`)

### Status
**PENDENTE** ⏳

---

## Fase 6: Backend - Endpoints para Estoque de Insumos

### Objetivo
Criar endpoints backend para suportar as operações do módulo de estoque de insumos.

### Tarefas
- [ ] Criar `insumosController.ts` em `backend/src/controllers/`
- [ ] Implementar endpoint GET `/insumos/cadastro` (ler página Cadastro)
- [ ] Implementar endpoint POST `/insumos/entrada` (salvar na página Entrada)
- [ ] Implementar endpoint POST `/insumos/producao` (salvar na página Saída)
- [ ] Adicionar rotas no `index.ts` do backend

### Detalhes da Implementação
- Usar `validateFarm` com prefixo 'Insumo'
- Reutilizar funções existentes (`getRows`, `appendRow`)
- Validação de dados de entrada

### Arquivos a Criar
- `backend/src/controllers/insumosController.ts`

### Arquivos a Modificar
- `backend/src/index.ts`

### Status
**PENDENTE** ⏳

---

## Fase 7: Integração e Testes

### Objetivo
Integrar frontend com backend e testar o fluxo completo.

### Tarefas
- [ ] Testar extração de links com prefixo 'Insumo'
- [ ] Testar navegação do menu de módulos
- [ ] Testar tela de cadastro (visualização)
- [ ] Testar tela de entrada (formulário + salvamento)
- [ ] Testar tela de produção (lógica de insumos por dieta + salvamento)
- [ ] Testar em PC (localhost) e mobile (produção)

### Detalhes dos Testes
- Verificar se botão de insumos só aparece para Marcon
- Verificar se dropdowns são carregados corretamente
- Verificar se cálculos automáticos funcionam
- Verificar se dados são salvos corretamente na planilha

### Status
**PENDENTE** ⏳

---

## Fase 8: Deploy e Documentação

### Objetivo
Fazer deploy das alterações e documentar o uso do módulo.

### Tarefas
- [ ] Commit e push das alterações
- [ ] Deploy no GitHub Pages (frontend)
- [ ] Deploy no Vercel (backend)
- [ ] Atualizar documentação se necessário

### Status
**PENDENTE** ⏳

---

## Resumo de Status

- [x] Fase 1: Backend - Extração de Links com Prefixos
- [ ] Fase 2: Frontend - Refatoração Home para Menu de Módulos
- [ ] Fase 3: Frontend - Tela de Cadastro (Visualização)
- [ ] Fase 4: Frontend - Tela de Entrada de Insumos
- [ ] Fase 5: Frontend - Tela de Produção/Saída
- [ ] Fase 6: Backend - Endpoints para Estoque de Insumos
- [ ] Fase 7: Integração e Testes
- [ ] Fase 8: Deploy e Documentação

## Notas Importantes

- O módulo de estoque de insumos é específico para a fazenda Marcon
- A estrutura é modular para permitir adicionar módulos diferentes para outras fazendas no futuro
- Links na coluna "link" da planilha base usam prefixos (Caderneta:, Insumo:)
- Retrocompatibilidade mantida para links sem prefixo
