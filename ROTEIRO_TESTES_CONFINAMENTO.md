# Roteiro de Testes, Confinamento online

## Escopo

Validar o fluxo online entre programação, produção na Fábrica, distribuição no Trato e acompanhamento no Painel Web. Este roteiro não cobre offline, sincronização posterior ou reconciliação entre dispositivos.

**Fazenda de testes:** `d649c65e-16ab-4b77-a84b-df937aa41cc3`

**Programação preservada:** Engorda, 4 tratos, percentuais 20%, 25%, 25%, 30%, horários 06:00, 09:00, 13:00 e 16:00.

| Curral | Formulação | Cabeças | kg MN/dia |
|---|---|---:|---:|
| A1 | Terminação Boi | 100 | 1200 |
| B1 | Recria Garrote | 80 | 640 |
| C1 | Terminação Novilha | 60 | 540 |
| D1 | Terminação Boi | 70 | 700 |

## Regras que devem ser validadas

1. A Fábrica produz por combinação de tipo e dieta. A distribuição não bloqueia nem libera a produção.
2. Depois de salvar o trato 1 como concluído, a Fábrica deve permitir produzir o trato 2, mesmo que nenhum curral tenha sido distribuído.
3. Produção parcial mantém o mesmo trato até completar o saldo.
4. O Trato calcula a próxima ordem por curral, a partir dos registros de distribuição daquele curral.
5. Informar `0` no kg realizado e salvar é uma distribuição válida e significa que aquele trato não foi realizado.
6. Um trato intermediário salvo com zero libera o próximo trato do curral.
7. O último trato de cada curral não pode ser salvo com zero. Deve ser informado valor maior que zero.
8. A compensação é manual. O operador pode informar valor acima do planejado nos tratos restantes. O sistema não deve ratear automaticamente nem bloquear esse valor.
9. No último trato, o previsto deve ser o saldo da base ajustada menos o que já foi distribuído nos tratos anteriores do curral, alinhado ao cálculo da Fábrica.
10. Quando houver compensação positiva no último trato, a tela deve identificar que o previsto inclui compensação pela leitura de cocho recebida após o início dos tratos.
11. O Painel deve mostrar o desvio causado pelo zero e pela compensação.
12. A Leitura de Cocho standalone fica fora deste ciclo, pois ocorre no dia seguinte e influencia a base do próximo dia.

## Fase 1, validar o carregamento

1. Abrir PWA, Trato Confinamento.
2. Selecionar Engorda.
3. Confirmar os valores do trato 1:
   - A1: 240 kg.
   - B1: 128 kg.
   - C1: 108 kg.
   - D1: 140 kg.
4. Confirmar que cada curral começa no trato 1 de 4.
5. Abrir Fábrica Confinamento e confirmar que as dietas são selecionadas separadamente:
   - Terminação Boi: 2 currais, total previsto de 380 kg no trato 1.
   - Recria Garrote: 1 curral, total previsto de 128 kg no trato 1.
   - Terminação Novilha: 1 curral, total previsto de 108 kg no trato 1.

## Fase 2, produzir tratos sem depender da distribuição

1. Na Fábrica, selecionar Engorda, Terminação Boi e um vagão ativo.
2. Produzir o trato 1 completo, total de 380 kg.
3. Recarregar a tela antes de distribuir qualquer curral.
4. Confirmar que o trato atual é 2 de 4.
5. Produzir o trato 2 completo, total de 475 kg.
6. Recarregar novamente sem distribuir os currais.
7. Confirmar que o trato atual é 3 de 4.
8. Produzir o trato 3 completo, total de 475 kg.
9. Confirmar que o trato atual é 4 de 4.
10. Produzir o trato 4 completo, total de 570 kg.
11. Confirmar que a Fábrica informa que todos os tratos da dieta foram concluídos.

Repetir a mesma validação para as outras dietas, usando os totais:

| Dieta | Trato 1 | Trato 2 | Trato 3 | Trato 4 |
|---|---:|---:|---:|---:|
| Recria Garrote | 128 | 160 | 160 | 192 |
| Terminação Novilha | 108 | 135 | 135 | 162 |

## Fase 3, distribuir normalmente

1. Abrir Trato Confinamento.
2. Confirmar que cada curral ainda está no trato 1, mesmo que a Fábrica já tenha produzido os quatro tratos.
3. Informar o kg planejado no trato 1:
   - A1: 240 kg.
   - B1: 128 kg.
   - C1: 108 kg.
   - D1: 140 kg.
4. Salvar os quatro currais.
5. Confirmar que cada curral avança individualmente para o trato 2.
6. Distribuir os tratos seguintes normalmente, conferindo que a Fábrica não bloqueia a produção e que o Trato segue a ordem própria de cada curral.

## Fase 4, registrar trato intermediário não realizado

Executar em uma nova data de teste ou após limpar os registros do ciclo anterior.

1. Selecionar um curral no trato 1 ou 2, mas não no último trato.
2. Digitar `0` no campo realizado.
3. Salvar.
4. Confirmar que o registro foi criado com `kg_ofertado_real = 0`.
5. Recarregar a tela.
6. Confirmar que o curral avançou para o trato seguinte.
7. Confirmar que não houve erro de validação nem bloqueio por valor zero.
8. Confirmar que outros currais continuam independentes e não avançam por causa desse curral.

## Fase 5, compensar manualmente

Exemplo usando uma programação de 4 tratos. Se o segundo trato planejado for 300 kg e for salvo como zero:

1. No terceiro trato, informar 150 kg acima do planejado.
2. Salvar.
3. No quarto trato, informar os outros 150 kg acima do planejado.
4. Salvar.
5. Confirmar que ambos os valores acima do previsto são aceitos.
6. Confirmar que o sistema não redistribui automaticamente os valores.
7. Confirmar no Painel que:
   - o trato zerado gera desvio negativo;
   - os tratos compensados geram desvio positivo;
   - o desvio acumulado reflete a soma dos realizados e planejados.

## Fase 6, bloquear zero no último trato

1. Avançar um curral até o trato 4 de 4.
2. Digitar `0`.
3. Tentar salvar.
4. Confirmar que o registro não é enviado ao banco.
5. Confirmar mensagem informando que o último trato precisa ser maior que zero.
6. Confirmar que é possível salvar um valor positivo, inclusive maior que o planejado.
7. Repetir em outro curral para confirmar que o bloqueio é por curral.

## Fase 6A, último trato compensado por leitura tardia

1. Execute todos os tratos de uma data anterior.
2. No dia seguinte, registre o trato 1 antes de lançar a leitura do dia anterior.
3. Lance a leitura de cocho do dia anterior com ajuste positivo.
4. Recarregue o Trato Confinamento e avance até o último trato.
5. Confirmar que o previsto do último trato é a base ajustada menos o que já foi distribuído nos tratos anteriores do curral.
6. Confirmar que o previsto do último trato na Fábrica apresenta o mesmo saldo.
7. Confirmar na tela do Trato o aviso de que o valor inclui compensação pela leitura recebida após o início dos tratos.

## Fase 7, produção parcial

1. Na Fábrica, iniciar um trato com total menor que o previsto.
2. Salvar.
3. Confirmar `concluido = false`.
4. Recarregar e confirmar o saldo restante.
5. Completar a produção.
6. Confirmar `concluido = true`.
7. Confirmar que a produção seguinte é liberada sem exigir distribuição anterior.

## Fase 8, Painel Web

1. Abrir Acompanhamento de Tratos.
2. Filtrar a fazenda, a data e Engorda.
3. Confirmar que o Painel lê distribuição em `registros_oferta_trato`.
4. Confirmar que produção de Fábrica não aparece como oferta realizada.
5. Validar planejado, real, desvio em kg, desvio percentual, quantidade de tratos e status.
6. Confirmar as faixas de status:
   - até 5%: OK;
   - acima de 5% até 15%: Alerta;
   - acima de 15%: Crítico.
7. Confirmar que um trato zero aparece como execução registrada com real igual a zero, e não como ausência de registro.

## Fase 9, limpeza

Após o teste, remover somente os registros operacionais criados na fazenda de testes e nas datas usadas:

- `registros_fabrica_confinamento`;
- `registros_fabrica_confinamento_insumos`;
- `registros_oferta_trato`.

Preservar `programacao_tratos`, `programacao_tratos_percentuais` e `programacao_tratos_currais`.

## Critérios de sucesso

- A Fábrica avança pelos tratos sem depender da distribuição.
- Produção parcial permanece no mesmo trato.
- Zero é aceito em tratos intermediários e avança o curral.
- Zero é rejeitado no último trato de cada curral.
- Valores acima do planejado são aceitos para compensação manual.
- Cada curral mantém sua própria ordem de distribuição.
- O Painel representa corretamente os desvios.
- Nenhuma leitura standalone de cocho é criada ou usada neste ciclo.
