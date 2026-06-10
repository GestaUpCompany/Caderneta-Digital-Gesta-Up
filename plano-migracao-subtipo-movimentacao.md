# Plano de Migração: Unificar tipo_saida + tipo_entrada em subtipo

## Objetivo
Substituir as colunas `tipo_saida` e `tipo_entrada` (mutuamente exclusivas) por uma única coluna `subtipo`, e eliminar a coluna derivada `tipo_destino`.

## Estrutura Atual
| Coluna | Tipo | Uso |
|---|---|---|
| `motivo_movimentacao` | enum | Discriminador principal (Consumo, Saída, Entrada, Abate, etc.) |
| `tipo_saida` | enum | Subtipo quando motivo = 'Saída' (Enfermaria, Apartação, Transferência) |
| `tipo_entrada` | enum | Subtipo quando motivo = 'Entrada' (Compras, Apartação, Transferência) |
| `tipo_destino` | text | **Derivado** de motivo + subtipo (cantina, frigorifico, lote, etc.) |
| `causa_observacao` | text | Observação livre — mantida |

## Fase 1: Schema DB (Aditiva — sem drops) ✅ CONCLUÍDO
1. Criar enum `tipo_movimentacao_subtipo` com valores: `Enfermaria`, `Apartação`, `Transferência`, `Compras`.
2. Adicionar coluna `subtipo tipo_movimentacao_subtipo` em `registros_movimentacao`.
3. Migrar dados existentes:
   ```sql
   UPDATE registros_movimentacao
   SET subtipo = CASE
     WHEN tipo_saida IS NOT NULL THEN tipo_saida::text::tipo_movimentacao_subtipo
     WHEN tipo_entrada IS NOT NULL THEN tipo_entrada::text::tipo_movimentacao_subtipo
   END
   WHERE tipo_saida IS NOT NULL OR tipo_entrada IS NOT NULL;
   ```
4. Verificar migração: 2 registros migrados com sucesso.

## Fase 2: Frontend — Atualizar Código ✅ CONCLUÍDO
5. **Regenerar tipos Supabase** (ou adicionar `subtipo` manualmente em `supabase.ts`).
6. **MovimentacaoPage.tsx**:
   - Substituir `tipoSaida` + `tipoEntrada` no `FormState` por `subtipo`.
   - Unificar arrays `TIPO_SAIDA` + `TIPO_ENTRADA` em lógica que renderiza opções condicionais baseado em `motivoMovimentacao`, mas escreve no mesmo campo `subtipo`.
   - Remover lógica de `tipoDestino` do formulário e do payload de salvamento.
7. **syncService.ts**:
   - Mapear `subtipo` → `subtipo`.
   - Remover mapeamento de `tipoSaida`, `tipoEntrada`, `tipoDestino`.
8. **shareUtils.ts**:
   - Substituir condicionais `tipoSaida`/`tipoEntrada` por `subtipo`.
9. **validation.ts**: Ajustar se necessário (provavelmente nenhuma mudança — validação é em `motivoMovimentacao`).
10. **ListaRegistros.tsx / movimentacao.ts**: Adicionar `subtipo` à config de exibição para aparecer nos cards.

## Fase 3: Validação ✅ CONCLUÍDO
11. Compilar (`tsc --noEmit`) e testar fluxo completo: criar registro de Saída (Enfermaria) e Entrada (Compras).
12. Verificar que registros antigos exibem `subtipo` corretamente.

## Fase 4: Limpeza (APÓS APROVAÇÃO DO USUÁRIO) ✅ CONCLUÍDO
13. `ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS tipo_saida;`
14. `ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS tipo_entrada;`
15. `ALTER TABLE registros_movimentacao DROP COLUMN IF EXISTS tipo_destino;`
16. `DROP TYPE IF EXISTS tipo_movimentacao_saida;`
17. `DROP TYPE IF EXISTS tipo_movimentacao_entrada;`
18. Limpar tipos Supabase (`supabase.ts`) — removidas referências às colunas e enums antigas.

## Arquivos Afetados
- `frontend/src/types/supabase.ts`
- `frontend/src/pages/cadernetas/MovimentacaoPage.tsx`
- `frontend/src/services/syncService.ts`
- `frontend/src/utils/shareUtils.ts`
- `frontend/src/components/cadernetas/ListaRegistros.tsx`
- `frontend/src/config/cadernetas/movimentacao.ts`
- `frontend/src/utils/validation.ts` (possivelmente sem mudanças)
