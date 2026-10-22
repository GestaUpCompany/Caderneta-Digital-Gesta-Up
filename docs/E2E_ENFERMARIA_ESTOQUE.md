# Roteiro E2E: baixa de estoque da Enfermaria

Fazenda de teste obrigatória: `d649c65e-16ab-4b77-a84b-df937aa41cc3` ("Fazenda Gesta'Up").

## Preparação

- Servidor em **preview** (o Service Worker e o offline só existem no build):
  `cd frontend && npm run build && npx vite preview` (usar a porta da linha `Local:`, base `/Caderneta-Digital-Gesta-Up/`).
- Abrir pelo MCP `chrome-devtools`.
- Anotar os saldos antes de começar (consulta em `medicamentos.estoque_atual`):

| Medicamento | Unidade | Conteúdo | Saldo inicial |
|---|---|---|---|
| Draxxin (`57e29fe7-…`) | frasco | 500 mL | 19 |
| Ivomec Teste PWA (`82be43b3-…`) | frasco | 500 mL | 8 |
| Exceller (`56017cc0-…`) | dose | sem conteúdo | 3 |
| Vacina Teste SKU PWA (`dd8c9c02-…`) | dose | sem conteúdo | 20 |

## Casos

Cada caso confere `movimentacoes_farmacia` (origem `enfermaria`, `deleted_at` nulo) e `medicamentos.estoque_atual` depois do sync.

1. **Draxxin, 5 ml:** seletor de dose travado em ml; baixa de 0,01 frasco; saldo 18,99. No Painel, o histórico mostra "Baixa · Enfermaria".
2. **Ivomec, 15 ml:** seletor travado em ml; baixa de 0,03 frasco; saldo 7,97.
3. **Exceller, 3 ml (sem conteúdo):** aviso amarelo "não baixa o estoque"; o registro salva; nenhuma movimentação criada; saldo continua 3. No Painel, o card mostra o aviso "sem conteúdo definido".
4. **Exceller depois de definir 50 mL no Painel** (Ativar/Definir conteúdo): novo registro de 3 ml gera baixa de 0,06 dose.
5. **Penicilina (não controla estoque):** seletor livre; nenhuma movimentação.
6. **Offline:** no DevTools, colocar a rede em offline, salvar um registro com Draxxin, voltar online e aguardar o sync. Deve haver exatamente uma movimentação (sem duplicar) e saldo debitado uma vez.
7. **Exclusão do registro (soft delete):** a movimentação gerada recebe `deleted_at` e o saldo volta ao valor anterior.

## Limpeza

- Excluir (soft delete) os registros de teste criados.
- Conferir que os saldos voltaram aos valores iniciais.
- Restaurar o conteúdo do Exceller se tiver sido alterado no passo 4.
