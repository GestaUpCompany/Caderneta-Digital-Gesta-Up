# Roteiro E2E: saída de farmácia valorizada

Fazenda de teste: `d649c65e-16ab-4b77-a84b-df937aa41cc3`. Servidor em preview (`npm run build && npx vite preview`), aparelho com ID `gestaup`. Painel em dev, logado como controller da fazenda de teste.

## Pré-condições
- Saldos iniciais: Draxxin 19 (custo R$ 115,4429), Ivomec 8 (R$ 80), Exceller 3 (R$ 50), Vacina 20.
- Migration `20261022120000_farmacia_baixa_valorizada` aplicada e backfill feito (baixas antigas com custo e valor).

## Casos (resultado em 22/10/2026)
1. Saída de 1 Draxxin pelo PWA → baixa com custo = custo médio (115,4429) e valor R$ 115,44; saldo 19 → 18. ✅
2. Enfermaria, Draxxin 5 ml (0,010 frasco) → baixa valorizada em R$ 1,15. ✅
3. Saída offline de 1 Ivomec, depois sync → uma única baixa, valorizada (R$ 80), sem duplicar. ✅
4. Entrada retroativa (2026-10-21, R$ 100/frasco, feita direto no banco pelo mesmo caminho do trigger) → custo médio de Ivomec 80 → 84; as baixas de 22/10 são revalorizadas para R$ 84 por frasco. ✅
5. Saída de 10 Ivomec com saldo 7 → aviso "ficará em -3", saída salva, saldo -3, baixa valorizada em R$ 800. ✅
6. Ajuste inserido depois das baixas → valores das baixas inalterados. ✅
7. Painel: "Baixas no mês" = R$ 2.100,67, igual a `SUM(valor_total)` das baixas do mês. Listas de Saídas com colunas "Custo un." e "Valor". ✅
8. Exclusão lógica de uma baixa → "Baixas no mês" cai pelo valor da baixa (R$ 2.100,67 → R$ 2.016,67). O saldo não muda porque o ajuste posterior fixa o saldo absoluto. ✅

## Limpeza
Exclusão lógica das movimentações criadas no teste; saldos e custos médios conferidos contra os iniciais.
