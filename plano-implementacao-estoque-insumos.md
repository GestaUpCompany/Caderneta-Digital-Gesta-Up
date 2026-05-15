# Plano de Ação: Implementação de Sistema de Estoque de Insumos

## Ordem de Execução Recomendada

**1. Fase 1** → Estrutura do Banco de Dados
**2. Fase 2** → Triggers e Functions
**3. Fase 3** → Frontend Entrada
**4. Fase 4** → Frontend Saída
**5. Fase 7** → Sincronização
**6. Fase 8** → Testes
**7. Fase 5** → Tela de Estoque (após validar entrada/saída)
**8. Fase 6** → Tela de Relatórios (após validar entrada/saída)
**9. Fase 9** → Documentação

> **Nota:** As fases 5 e 6 (Estoque e Relatórios) podem ser implementadas após validar que o sistema de entrada/saída está funcionando corretamente.

---

## Visão Geral

Este plano implementa uma arquitetura híbrida de estoque seguindo padrões de mercado para sistemas ERP/WMS, permitindo:
- Rastreabilidade completa de movimentações
- Consultas rápidas de estoque atual
- Relatórios analíticos por período
- Auditoria imutável de todas as operações

## Estrutura Proposta

- **insumos**: Master data (nome, tipo, custo, estoque_atual, estoque_minimo)
- **registros_entrada_insumos**: Registros de entrada (cabeçalho - dados compartilhados)
- **entrada_insumos_itens**: Tabela de itens normalizada para entradas (múltiplos insumos por entrada)
- **registros_saida_insumos**: Registros de saída (cabeçalho - dados compartilhados)
- **saida_insumos_itens**: Tabela de itens normalizada para saídas (múltiplos insumos por saída)
- **movimentacao_estoque**: Ledger de auditoria (já existe)

---

## Fase 1: Estrutura do Banco de Dados

**Objetivo:** Preparar estrutura relacional para suportar rastreabilidade e cálculo de estoque

### Tarefas

- [ ] Criar tabela `entrada_insumos_itens` para normalizar entradas (múltiplos insumos)
- [ ] Adicionar `insumo_id UUID` em `registros_saida_insumos` (chave estrangeira)
- [ ] Criar tabela `saida_insumos_itens` para normalizar saídas (remover JSON)
- [ ] Atualizar tipos TypeScript para novas tabelas/colunas

### SQL Esperado

```sql
-- Criar tabela de itens para entrada
CREATE TABLE entrada_insumos_itens (
  id UUID DEFAULT gen_random_uuid(),
  entrada_id UUID NOT NULL REFERENCES registros_entrada_insumos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC,
  valor_total NUMERIC,
  PRIMARY KEY (id)
);

-- Índices para performance
CREATE INDEX idx_entrada_itens_entrada_id ON entrada_insumos_itens(entrada_id);
CREATE INDEX idx_entrada_itens_insumo_id ON entrada_insumos_itens(insumo_id);

-- Adicionar insumo_id em saída
ALTER TABLE registros_saida_insumos ADD COLUMN insumo_id UUID REFERENCES insumos(id);

-- Criar tabela de itens para saída
CREATE TABLE saida_insumos_itens (
  id UUID DEFAULT gen_random_uuid(),
  saida_id UUID NOT NULL REFERENCES registros_saida_insumos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  quantidade NUMERIC NOT NULL,
  PRIMARY KEY (id)
);

-- Índices para performance
CREATE INDEX idx_saida_itens_saida_id ON saida_insumos_itens(saida_id);
CREATE INDEX idx_saida_itens_insumo_id ON saida_insumos_itens(insumo_id);
```

---

## Fase 2: Triggers e Functions

**Objetivo:** Automatizar atualização de estoque e auditoria

### Tarefas

- [ ] Criar função `atualizar_estoque_entrada()` - insere em `movimentacao_estoque` e atualiza `insumos.estoque_atual`
- [ ] Criar trigger AFTER INSERT em `registros_entrada_insumos`
- [ ] Criar função `atualizar_estoque_saida()` - insere em `movimentacao_estoque` e atualiza `insumos.estoque_atual`
- [ ] Criar trigger AFTER INSERT em `registros_saida_insumos`
- [ ] Criar trigger AFTER UPDATE (para correções)
- [ ] Criar trigger AFTER DELETE (para estornos)

### SQL Esperado

```sql
-- Função para entrada
CREATE OR REPLACE FUNCTION atualizar_estoque_entrada()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
  v_valor_total NUMERIC;
BEGIN
  -- Para cada item da entrada
  FOR v_insumo_id, v_quantidade, v_valor_total IN 
    SELECT insumo_id, quantidade, valor_total FROM entrada_insumos_itens WHERE entrada_id = NEW.id
  LOOP
    -- Criar movimentação de auditoria
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, custo_total, custo_unitario,
      registro_id, tabela_origem, fazenda_id, fornecedor, nota_fiscal,
      data_movimentacao, criado_por
    ) VALUES (
      'entrada', v_quantidade, v_valor_total, 
      CASE WHEN v_quantidade > 0 THEN v_valor_total / v_quantidade ELSE 0 END,
      NEW.id, 'registros_entrada_insumos', NEW.fazenda_id, NEW.fornecedor, NEW.nota_fiscal,
      NEW.data_entrada, NEW.nome_usuario
    );
    
    -- Atualizar estoque atual
    UPDATE insumos 
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_quantidade,
        custo_total_estoque = COALESCE(custo_total_estoque, 0) + v_valor_total
    WHERE id = v_insumo_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para entrada
CREATE TRIGGER trg_estoque_entrada
AFTER INSERT ON registros_entrada_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_entrada();

-- Função para saída
CREATE OR REPLACE FUNCTION atualizar_estoque_saida()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id UUID;
  v_quantidade NUMERIC;
BEGIN
  -- Para cada item da saída
  FOR v_insumo_id, v_quantidade IN 
    SELECT insumo_id, quantidade FROM saida_insumos_itens WHERE saida_id = NEW.id
  LOOP
    -- Criar movimentação de auditoria
    INSERT INTO movimentacao_estoque (
      tipo_movimentacao, quantidade, registro_id, tabela_origem, 
      fazenda_id, data_movimentacao, criado_por
    ) VALUES (
      'saida', v_quantidade, NEW.id, 'registros_saida_insumos',
      NEW.fazenda_id, NEW.data_producao, NEW.nome_usuario
    );
    
    -- Atualizar estoque atual
    UPDATE insumos 
    SET estoque_atual = estoque_atual - v_quantidade
    WHERE id = v_insumo_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para saída
CREATE TRIGGER trg_estoque_saida
AFTER INSERT ON registros_saida_insumos
FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_saida();
```

---

## Fase 3: Frontend Entrada

**Objetivo:** Adaptar tela de entrada para usar IDs de insumos

### Tarefas

- [ ] Verificar se `getInsumos` já existe no supabaseService
- [ ] Alterar `EntradaInsumosPage` para permitir múltiplos insumos (lista dinâmica)
- [ ] Cada item deve ter: insumo_id, quantidade, valor_unitario, valor_total
- [ ] Atualizar `syncService` para incluir tabela `entrada_insumos_itens`
- [ ] Testar integração com Supabase

### Mudanças Esperadas

```typescript
// EntradaInsumosPage.tsx
// Antes: form.produto (string)
// Depois: form.itens (array de { insumoId, quantidade, valorUnitario, valorTotal })

// syncService.ts
// Adicionar mapeamento para entrada-insumos-itens
case 'entrada-insumos': {
  return {
    ...baseData,
    data_entrada: brWithTimeToIso(registro.dataEntrada as string),
    horario: registro.horario || null,
    nota_fiscal: registro.notaFiscal || null,
    fornecedor: registro.fornecedor || null,
    placa: registro.placa || null,
    motorista: registro.motorista || null,
    responsavel_recebimento: registro.responsavelRecebimento || null,
  }
}

// Adicionar caderneta 'entrada-insumos-itens'
case 'entrada-insumos-itens': {
  return {
    entrada_id: registro.entradaId,
    insumo_id: registro.insumoId,
    quantidade: registro.quantidade,
    valor_unitario: registro.valorUnitario,
    valor_total: registro.valorTotal,
  }
}
```

---

## Fase 4: Frontend Saída

**Objetivo:** Normalizar tela de saída para usar tabela de itens

### Tarefas

- [ ] Normalizar `SaidaInsumosPage` para usar tabela `saida_insumos_itens`
- [ ] Adicionar seleção de múltiplos insumos por ID
- [ ] Atualizar `syncService` para incluir itens da saída
- [ ] Testar integração com Supabase

### Mudanças Esperadas

```typescript
// SaidaInsumosPage.tsx
// Antes: insumos_quantidades (JSON)
// Depois: itens (array de { insumoId, quantidade })

// syncService.ts
// Enviar itens separadamente ou incluir no payload
```

---

## Fase 5: Tela de Estoque

**Objetivo:** Criar interface para visualizar estoque atual

### Tarefas

- [ ] Criar página `EstoquePage` com lista de insumos e estoque atual
- [ ] Mostrar alertas de estoque mínimo
- [ ] Adicionar filtro por tipo de insumo

### Query Esperada

```sql
SELECT 
  id, nome, tipo, unidade, estoque_atual, estoque_minimo,
  custo_total_estoque, custo_unitario,
  CASE 
    WHEN estoque_atual <= estoque_minimo THEN true 
    ELSE false 
  END as alerta_estoque_baixo
FROM insumos
WHERE fazenda_id = ? AND ativo = true
ORDER BY nome
```

---

## Fase 6: Tela de Relatórios

**Objetivo:** Criar interface para relatórios analíticos

### Tarefas

- [ ] Criar `RelatoriosInsumosPage`
- [ ] Relatório de entradas por período
- [ ] Relatório de saídas por período
- [ ] Relatório de custo total por período

### Queries Esperadas

```sql
-- Entradas por período
SELECT 
  i.nome,
  SUM(me.quantidade) as total_entrada,
  SUM(me.custo_total) as custo_total
FROM movimentacao_estoque me
JOIN entrada_insumos_itens eii ON eii.entrada_id = me.registro_id
JOIN insumos i ON i.id = eii.insumo_id
WHERE me.tipo_movimentacao = 'entrada'
  AND me.data_movimentacao BETWEEN ? AND ?
  AND me.fazenda_id = ?
GROUP BY i.nome
ORDER BY total_entrada DESC;

-- Saídas por período
SELECT 
  i.nome,
  SUM(me.quantidade) as total_saida
FROM movimentacao_estoque me
JOIN saida_insumos_itens sii ON sii.saida_id = me.registro_id
JOIN insumos i ON i.id = sii.insumo_id
WHERE me.tipo_movimentacao = 'saida'
  AND me.data_movimentacao BETWEEN ? AND ?
  AND me.fazenda_id = ?
GROUP BY i.nome
ORDER BY total_saida DESC;
```

---

## Fase 7: Sincronização

**Objetivo:** Garantir sincronização offline/online das novas tabelas

### Tarefas

- [ ] Adicionar tabelas ao `syncService` (`entrada_insumos_itens`, `saida_insumos_itens`)
- [ ] Atualizar IndexedDB schema para novas tabelas
- [ ] Testar sincronização offline/online

### Mudanças Esperadas

```typescript
// syncService.ts
const cadernetaToTable: Record<string, string> = {
  // ...
  'entrada-insumos': 'registros_entrada_insumos',
  'entrada-insumos-itens': 'entrada_insumos_itens', // novo
  'saida-insumos': 'registros_saida_insumos',
  'saida-insumos-itens': 'saida_insumos_itens', // novo
}

// indexedDB.ts
// Adicionar schema para entrada_insumos_itens e saida_insumos_itens
```

---

## Fase 8: Testes

**Objetivo:** Validar consistência e funcionamento do sistema

### Tarefas

- [ ] Testar triggers com dados de entrada
- [ ] Testar triggers com dados de saída
- [ ] Testar atualização de estoque (trigger UPDATE)
- [ ] Testar estorno de estoque (trigger DELETE)
- [ ] Validar consistência (soma movimentações = estoque atual)

### Teste de Consistência

```sql
-- Validar consistência do estoque
SELECT 
  i.id,
  i.nome,
  i.estoque_atual as estoque_cadastrado,
  COALESCE(
    (SELECT SUM(quantidade) FROM movimentacao_estoque me
     JOIN entrada_insumos_itens eii ON eii.entrada_id = me.registro_id
     WHERE tipo_movimentacao = 'entrada' AND eii.insumo_id = i.id
    ), 0
  ) - COALESCE(
    (SELECT SUM(quantidade) FROM movimentacao_estoque me
     JOIN saida_insumos_itens sii ON sii.saida_id = me.registro_id
     WHERE tipo_movimentacao = 'saida' AND sii.insumo_id = i.id
    ), 0
  ) as estoque_calculado,
  CASE 
    WHEN i.estoque_atual = (
      COALESCE((SELECT SUM(quantidade) FROM movimentacao_estoque me JOIN entrada_insumos_itens eii ON eii.entrada_id = me.registro_id WHERE tipo_movimentacao = 'entrada' AND eii.insumo_id = i.id), 0)
      - COALESCE((SELECT SUM(quantidade) FROM movimentacao_estoque me JOIN saida_insumos_itens sii ON sii.saida_id = me.registro_id WHERE tipo_movimentacao = 'saida' AND sii.insumo_id = i.id), 0)
    ) THEN 'OK'
    ELSE 'INCONSISTENTE'
  END as status
FROM insumos i
WHERE fazenda_id = ?
HAVING i.estoque_atual != (
  COALESCE((SELECT SUM(quantidade) FROM movimentacao_estoque me JOIN entrada_insumos_itens eii ON eii.entrada_id = me.registro_id WHERE tipo_movimentacao = 'entrada' AND eii.insumo_id = i.id), 0)
  - COALESCE((SELECT SUM(quantidade) FROM movimentacao_estoque me JOIN saida_insumos_itens sii ON sii.saida_id = me.registro_id WHERE tipo_movimentacao = 'saida' AND sii.insumo_id = i.id), 0)
);
```

---

## Fase 9: Documentação

**Objetivo:** Documentar nova arquitetura para manutenção futura

### Tarefas

- [ ] Documentar triggers e functions
- [ ] Atualizar README com nova arquitetura

---

## Notas Importantes

- As fases 5 e 6 (Estoque e Relatórios) podem ser implementadas após validar que o sistema de entrada/saída está funcionando corretamente
- Triggers não funcionam offline - IndexedDB manterá estado temporário e syncService aplicará triggers após sincronização
- Considerar usar FIFO ou custo médio para cálculo de custo em saídas
- Testar extensivamente em ambiente de desenvolvimento antes de produção
