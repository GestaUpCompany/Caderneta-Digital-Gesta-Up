# Plano de Testes - Entrada de Insumos com Múltiplos Itens

## Contexto
Funcionalidade implementada permite registrar entrada de múltiplos insumos em uma única operação, com sincronização automática para Supabase e atualização de estoque via triggers.

## Situações de Erro Identificadas

1. **Offline/Conexão perdida durante salvamento**
2. **Validação de dados inválidos** (quantidade negativa, valores nulos)
3. **Trigger falhando silenciosamente**
4. **Update de entrada após itens salvos**
5. **Delete em cascata**
6. **Conflito de sincronização**
7. **Rate limiting com muitos itens**
8. **Insumo deletado após entrada criada**

## Plano de Testes

### Teste 1 (CRÍTICO): Trigger DELETE - Deletar entrada e verificar cascata

**Objetivo:** Verificar se itens são deletados em cascata quando entrada é deletada

**Passos:**
1. Criar entrada com 2 itens
2. Verificar no banco que itens existem
3. Deletar entrada no banco via SQL
4. Verificar se itens foram deletados
5. Verificar se movimentação de estoque foi deletada ou permanece

**Resultado esperado:**
- Itens deletados em cascata (FK ON DELETE CASCADE)
- Movimentação de estoque: pode permanecer (auditoria) ou ser deletada

**Comando SQL:**
```sql
-- Deletar entrada
DELETE FROM registros_entrada_insumos WHERE id = 'entrada_id';

-- Verificar itens
SELECT * FROM entrada_insumos_itens WHERE entrada_id = 'entrada_id';

-- Verificar movimentação
SELECT * FROM movimentacao_estoque WHERE registro_id = 'entrada_id';
```

---

### Teste 2 (CRÍTICO): Trigger UPDATE - Atualizar entrada após itens salvos

**Objetivo:** Verificar consistência ao atualizar entrada após itens sincronizados

**Passos:**
1. Criar entrada com itens
2. Atualizar entrada (ex: mudar fornecedor)
3. Verificar se trigger UPDATE reprocessa itens
4. Verificar se há inconsistência nos dados

**Resultado esperado:**
- Trigger UPDATE não reprocessa itens (itens já sincronizados)
- Nenhuma inconsistência nos dados
- Se necessário, trigger UPDATE deve ser removido e depender apenas de trigger em itens

**Comando SQL:**
```sql
-- Atualizar entrada
UPDATE registros_entrada_insumos 
SET fornecedor = 'Novo Fornecedor' 
WHERE id = 'entrada_id';

-- Verificar itens
SELECT * FROM entrada_insumos_itens WHERE entrada_id = 'entrada_id';

-- Verificar movimentação
SELECT * FROM movimentacao_estoque WHERE registro_id = 'entrada_id';
```

---

### Teste 3 (ALTA): Validação de dados - Quantidade negativa

**Objetivo:** Verificar se sistema impede quantidade negativa

**Passos:**
1. Tentar salvar entrada com quantidade negativa (-10)
2. Verificar se frontend impede
3. Se frontend permitir, verificar se backend rejeita

**Resultado esperado:**
- Frontend impede com mensagem de erro
- Backend rejeita se frontend não validar

**Teste manual:**
- Preencher formulário com quantidade: -10
- Clicar em Salvar
- Verificar mensagem de erro

---

### Teste 4 (ALTA): Validação de dados - Insumo não selecionado

**Objetivo:** Verificar se sistema impede salvar sem selecionar insumo

**Passos:**
1. Adicionar item sem selecionar insumo
2. Tentar salvar
3. Verificar se frontend impede

**Resultado esperado:**
- Frontend impede com mensagem de erro
- Botão Salvar desabilitado se item inválido

**Teste manual:**
- Adicionar item
- Não selecionar insumo
- Clicar em Salvar
- Verificar mensagem de erro

---

### Teste 5 (MÉDIA): Offline - Salvar entrada offline

**Objetivo:** Verificar sincronização ao voltar online

**Passos:**
1. Desconectar internet
2. Criar entrada com itens
3. Verificar se salvou no IndexedDB
4. Reconectar internet
5. Aguardar sincronização (5 segundos)
6. Verificar no banco se dados foram sincronizados

**Resultado esperado:**
- Salva no IndexedDB offline
- Sincroniza automaticamente ao voltar online
- Dados consistentes no banco

**Verificação:**
```sql
SELECT * FROM registros_entrada_insumos ORDER BY created_at DESC LIMIT 1;
SELECT * FROM entrada_insumos_itens WHERE entrada_id = 'entrada_id';
```

---

### Teste 6 (MÉDIA): Rate limiting - Entrada com 10+ itens

**Objetivo:** Verificar se há erros de API com muitos itens

**Passos:**
1. Criar entrada com 10+ itens
2. Salvar
3. Verificar console por erros de rate limiting (429)
4. Verificar se todos itens foram sincronizados

**Resultado esperado:**
- Todos itens sincronizados sem erros
- Se houver erro, implementar batching ou delay

**Verificação:**
```sql
SELECT COUNT(*) FROM entrada_insumos_itens WHERE entrada_id = 'entrada_id';
```

---

### Teste 7 (BAIXA): FK RESTRICT - Deletar insumo em uso

**Objetivo:** Verificar se FK impede delete de insumo em uso

**Passos:**
1. Criar entrada com insumo X
2. Tentar deletar insumo X
3. Verificar se erro é retornado

**Resultado esperado:**
- Erro de FK impede delete
- Mensagem clara informando que insumo está em uso

**Comando SQL:**
```sql
-- Tentar deletar insumo
DELETE FROM insumos WHERE id = 'insumo_id';
-- Esperado: erro de violação de FK
```

---

### Teste 8 (BAIXA): Conflito de versão - Edição simultânea

**Objetivo:** Verificar comportamento ao editar mesma entrada em 2 dispositivos

**Passos:**
1. Abrir entrada em dispositivo A
2. Abrir mesma entrada em dispositivo B
3. Editar e salvar em A
4. Editar e salvar em B
5. Verificar resultado

**Resultado esperado:**
- Sistema detecta conflito de versão
- Última edição sobrescreve ou mensagem de erro
- Se não implementado, documentar comportamento atual

---

## Status dos Testes

- [ ] Teste 1: Trigger DELETE
- [ ] Teste 2: Trigger UPDATE
- [ ] Teste 3: Validação - Quantidade negativa
- [ ] Teste 4: Validação - Insumo não selecionado
- [ ] Teste 5: Offline
- [ ] Teste 6: Rate limiting
- [ ] Teste 7: FK RESTRICT
- [ ] Teste 8: Conflito de versão

## Observações

- Testes marcados como CRÍTICO devem ser realizados antes de colocar em produção
- Testes marcados como ALTA são importantes para UX
- Testes marcados como MÉDIA são para cenários específicos
- Testes marcados como BAIXA são edge cases menos prováveis
