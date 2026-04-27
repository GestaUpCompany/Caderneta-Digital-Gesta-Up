# Plano de Ação - Sistema de Estoque de Insumos

## Visão Geral
Implementar sistema de controle de estoque de insumos com cálculo automático de entradas, saídas, estoque atual e previsão de estoque para 30 dias.

## Requisitos do Sistema

### Aba "Estoque" na Planilha
**Colunas:**
1. Data Inicial - Data da primeira entrada do insumo
2. Data Final - Sempre o dia atual (atualizada a cada cálculo)
3. Insumo - Nome do insumo (chave para identificar a linha)
4. Qtd Entrada (kg) - Soma acumulada das quantidades da aba "Entrada"
5. Qtd Saída (kg) - Soma acumulada do total produzido da aba "Saída"
6. Estoque (kg) - Qtd Entrada - Qtd Saída
7. Previsão Estoque - 30 dias - Estoque projetado para daqui 30 dias

### Regras de Negócio
- **Inicialização:** Tela permite inserir estoque inicial para cada insumo ou começar zerado
- **Linhas:** Quantidade de linhas = quantidade de insumos cadastrados
- **Criação:** Linhas criadas apenas quando novo insumo é cadastrado
- **Atualizações:** Para cada entrada/saída, update na linha correspondente ao nome do insumo
- **Cálculos:** Atualizações sob demanda: qtd entrada, saída, data final, estoque, previsão

### Fórmulas
- Qtd Entrada = Σ quantidade (kg) da aba "Entrada" para aquele insumo
- Qtd Saída = Σ total produzido da aba "Saída" para aquele insumo
- Estoque = Qtd Entrada - Qtd Saída
- Previsão Estoque 30 dias = Calcular saída média diária entre Data Inicial e Data Final, projetar para +30 dias

## Estrutura Atual do Projeto

### Backend
- **insumosController.ts:** Endpoints /cadastro, /entrada, /producao, /dieta-insumos
- **googleSheetsService.ts:** Funções getRows, appendRow, getNextId, updateRow

### Frontend
- **EntradaPage.tsx:** Registro de entradas de insumos
- **ProducaoPage.tsx:** Registro de produção (saída)
- **CadastroPage.tsx:** Listagem de insumos cadastrados

## Lacunas Identificadas

### Backend
- ❌ Endpoint para ler dados da aba "Estoque"
- ❌ Endpoint para inicializar linhas de estoque
- ❌ Endpoint para atualizar estoque após entrada/saída
- ❌ Função para calcular previsão de estoque (30 dias)
- ❌ Integração: após salvar entrada, atualizar estoque
- ❌ Integração: após salvar produção, atualizar estoque

### Frontend
- ❌ Página "EstoquePage.tsx" para visualização e gerenciamento
- ❌ Formulário para definir estoque inicial
- ❌ Tabela/lista mostrando todos os insumos com estoque
- ❌ Indicadores visuais (estoque baixo, previsão crítica)

## Plano de Implementação

### FASE 1: Backend - Funções Auxiliares (2 horas)
**Objetivo:** Criar funções de cálculo e manipulação de estoque

1. **Função `findRowByInsumo`** (googleSheetsService.ts)
   - Parâmetros: spreadsheetUrl, sheetName, insumoName
   - Retorna: número da linha onde o insumo está localizado
   - Lógica: busca na coluna "Insumo" (coluna C)

2. **Função `calcularPrevisaoEstoque`** (googleSheetsService.ts)
   - Parâmetros: qtdSaida, dataInicial, dataFinal
   - Retorna: estoque previsto para 30 dias
   - Lógica:
     - Calcular dias entre dataInicial e dataFinal
     - Calcular saída média diária = qtdSaida / dias
     - Previsão = estoqueAtual - (saídaMédia * 30)

3. **Função `calcularEstoque`** (googleSheetsService.ts)
   - Parâmetros: spreadsheetUrl, insumoName
   - Retorna: objeto com qtdEntrada, qtdSaida, estoque, previsao
   - Lógica:
     - Ler todas as entradas da aba "Entrada" para o insumo
     - Ler todas as saídas da aba "Saída" para o insumo
     - Somar quantidades
     - Calcular estoque e previsão

### FASE 2: Backend - Endpoints de Estoque (2 horas)
**Objetivo:** Criar endpoints para gerenciar estoque

1. **Endpoint `GET /api/insumos/estoque`**
   - Parâmetros: insumosSheetUrl
   - Retorna: todas as linhas da aba "Estoque"
   - Uso: Frontend para exibir tabela de estoque

2. **Endpoint `POST /api/insumos/estoque/inicializar`**
   - Parâmetros: insumosSheetUrl, insumos (array com estoques iniciais)
   - Lógica:
     - Ler insumos cadastrados
     - Para cada insumo, criar linha na aba "Estoque"
     - Se já existir linha, não duplicar
   - Retorna: sucesso e linhas criadas

3. **Endpoint `POST /api/insumos/estoque/atualizar`**
   - Parâmetros: insumosSheetUrl, insumoName
   - Lógica:
     - Chamar calcularEstoque
     - Encontrar linha do insumo
     - Atualizar colunas: Qtd Entrada, Qtd Saída, Estoque, Previsão, Data Final
   - Retorna: valores atualizados

### FASE 3: Backend - Integração com Entrada/Saída (1 hora)
**Objetivo:** Atualizar estoque automaticamente após entrada/saída

1. **Modificar endpoint `/api/insumos/entrada`**
   - Após salvar entrada, chamar atualizar estoque do insumo
   - Usar o nome do produto para identificar

2. **Modificar endpoint `/api/insumos/producao`**
   - Após salvar produção, atualizar estoque de todos os insumos usados
   - Ler da aba "Dieta Insumos" para saber quais insumos foram usados

### FASE 4: Frontend - Página de Estoque (3 horas)
**Objetivo:** Criar interface para visualizar e gerenciar estoque

1. **Criar `EstoquePage.tsx`**
   - Estrutura similar a CadastroPage.tsx
   - Componentes: tabela/lista de insumos com estoque
   - Colunas: Insumo, Estoque Atual, Qtd Entrada, Qtd Saída, Previsão 30 dias
   - Indicadores visuais:
     - 🟢 Estoque saudável (> 30 dias de previsão)
     - 🟡 Estoque baixo (10-30 dias)
     - 🔴 Estoque crítico (< 10 dias)

2. **Formulário de Inicialização**
   - Botão "Inicializar Estoque"
   - Modal/form para definir estoque inicial por insumo
   - Validação: valores numéricos positivos

3. **Botão "Atualizar Estoque"**
   - Força recálculo de todos os estoques
   - Útil para correções manuais ou sincronização

### FASE 5: Frontend - Integração com Navegação (30 minutos)
**Objetivo:** Adicionar acesso à página de estoque

1. **Adicionar rota em App.tsx**
   - Rota: /estoque-insumos/estoque
   - Componente: EstoquePage

2. **Adicionar botão em CadastroPage.tsx**
   - Botão "VER ESTOQUE"
   - Navega para EstoquePage

### FASE 6: Testes e Validação (2 horas)
**Objetivo:** Garantir funcionamento correto

1. **Teste de inicialização**
   - Criar linhas de estoque para insumos
   - Verificar se duplica linhas existentes
   - Verificar estoque inicial definido corretamente

2. **Teste de entrada**
   - Registrar entrada de insumo
   - Verificar se Qtd Entrada incrementou
   - Verificar se Estoque atualizou

3. **Teste de produção**
   - Registrar produção
   - Verificar se Qtd Saída incrementou
   - Verificar se Estoque atualizou

4. **Teste de previsão**
   - Verificar cálculo de previsão 30 dias
   - Comparar com cálculo manual

5. **Teste de indicadores visuais**
   - Verificar cores corretas para estoque baixo/crítico

## Cronograma Estimado

| Fase | Tempo | Dependências |
|------|-------|--------------|
| FASE 1: Backend - Funções Auxiliares | 2h | - |
| FASE 2: Backend - Endpoints de Estoque | 2h | FASE 1 |
| FASE 3: Backend - Integração | 1h | FASE 2 |
| FASE 4: Frontend - Página de Estoque | 3h | FASE 2 |
| FASE 5: Frontend - Integração | 30min | FASE 4 |
| FASE 6: Testes e Validação | 2h | Todas fases anteriores |
| **TOTAL** | **10.5h** | |

## Riscos e Mitigações

### Risco 1: Performance ao calcular estoque
- **Descrição:** Se houver muitas entradas/saídas, o cálculo pode ser lento
- **Mitigação:** Implementar cache ou cálculo incremental

### Risco 2: Conflito de dados
- **Descrição:** Múltiplos usuários atualizando estoque simultaneamente
- **Mitigação:** Usar fila de sincronização existente

### Risco 3: Erro no cálculo de previsão
- **Descrição:** Cálculo incorreto pode levar a decisões erradas
- **Mitigação:** Testes exaustivos e validação manual

## Decisões Pendentes

1. **Estoque inicial:** Deve ser inserido apenas uma vez ou pode ser ajustado posteriormente?
2. **Atualização automática:** Deve ser síncrona (após cada entrada/saída) ou assíncrona (fila)?
3. **Indicadores visuais:** Quais valores definem estoque baixo/crítico? (padrão: 30 e 10 dias)
4. **Histórico:** Deve manter histórico de estoque ao longo do tempo?

## Critérios de Sucesso

- ✅ Usuário pode inicializar estoque para cada insumo
- ✅ Estoque atualiza automaticamente após entrada/saída
- ✅ Previsão de estoque calculada corretamente
- ✅ Indicadores visuais funcionam corretamente
- ✅ Performance aceitável (< 2s para cálculo)
- ✅ Sem duplicação de linhas
- ✅ Integração com sistema existente sem quebras
