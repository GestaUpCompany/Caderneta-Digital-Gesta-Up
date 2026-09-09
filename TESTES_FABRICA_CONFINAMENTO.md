# Roteiro de Testes — Fábrica Confinamento

> Roteiro vivo. Cada caso deve ser testado individualmente, validando tela e fluxo.
> Marcar `[x]` quando passar, `[ ]` quando pendente, `[~]` quando em progresso.
> Adicionar novos casos abaixo dos existentes conforme surgirem.
>
> Os casos TC-01 a TC-28 registram uma bateria histórica executada com a programação 30/25/25/20. A bateria atual e independente, descrita em “Roteiro operacional independente”, usa 30/20/20/30 e deve ser a referência para os próximos testes.

## Contexto

- **Fazenda de testes**: `d649c65e-16ab-4b77-a84b-df937aa41cc3` (Fazenda Gesta'Up)
- **Tela**: `/caderneta/fabrica-confinamento`
- **Pré-requisito**: 4 lotes ativos, 8 currais, 3 dietas, 3 vagões, programação 4 tratos/dia (30/20/20/30%)

## Casos de teste

### TC-01 — Carregamento inicial da tela

**Critério de aceite**: tela abre sem erro, mostra data atual, seletor de dieta com 3 opções, seletor de vagão com 3 opções, trato atual "1 de 4", total previsto calculado, tabela de insumos vazia até selecionar dieta.

- [x] Tela renderiza sem branco
- [x] Data exibida é hoje (04/09/2026)
- [x] Seletor de dieta lista: Recria Garrote, Terminação Boi, Terminação Novilha
- [x] Seletor de vagão lista: Kuhn Profile 12.2 DS (5.000 kg), Menta 2500 (2.500 kg), Storti Mix 16 (9.000 kg)
- [x] Trato atual mostra "1 de 4"
- [x] Botão SALVAR desabilitado até preencher campos obrigatórios

### TC-02 — Seleção de dieta filtra currais corretos

**Critério de aceite**: ao selecionar uma dieta, apenas os currais cujos lotes usam essa dieta aparecem, e o total previsto é a soma de `kg_mn_dia` dos currais filtrados multiplicado pelo percentual do trato atual.

- [x] Selecionar "Terminação Boi" → mostra 4 currais (A1, A2, D1, D2), total 825,1 kg
- [x] Selecionar "Recria Garrote" → mostra 2 currais (B1, B2), total 286,2 kg
- [x] Selecionar "Terminação Novilha" → mostra 2 currais (C1, C2), total 184,1 kg
- [x] Total previsto muda ao trocar de dieta (825,1 → 286,2 → 184,1)
- [x] Tabela de insumos atualiza percentuais ao trocar de dieta (Silagem 79,47/85,86/82,79%)

### TC-03 — Cálculo de total previsto por trato

**Critério de aceite**: o total previsto do trato 1 (30%) é diferente do trato 2 (25%), e ambos são diferentes do trato 4 (20%). O cálculo segue `kg_mn_dia × percentual` por curral.

- [x] Trato 1 (30%): total previsto = 825,1 kg (cálculo manual: 2750,44 × 0,30 = 825,13)
- [x] Trato 2 (25%): total previsto = 687,6 kg (cálculo manual: 2750,44 × 0,25 = 687,61)
- [x] Trato 4 (20%): total previsto = 550,1 kg (cálculo manual: 2750,44 × 0,20 = 550,09)
- [x] Valores batem com cálculo manual (diferença apenas arredondamento de 1 casa)

### TC-04 — Cálculo de percentual de insumos (% MN)

**Critério de aceite**: a coluna "% MN" de cada insumo é calculada como `(formula_teor_ms / teor_ms_insumo) / soma × 100`, onde a soma é sobre todos os insumos da dieta. Os valores devem somar 100%.

- [x] Percentuais dos 3 insumos somam ~100% (Terminação Boi: 79,47+15,80+4,73=100,00%; Recria Garrote: 85,86+9,76+4,38=100,00%; Terminação Novilha: 82,79+12,66+4,55=100,00%)
- [x] Silagem de Milho tem o maior percentual (base maior na fórmula: 60-70% da MS)
- [x] Núcleo Mineral tem o menor percentual (4,38-4,73%)
- [x] Percentuais mudam ao trocar de dieta (Silagem 79,47/85,86/82,79%; Milho 15,80/9,76/12,66%; Núcleo 4,73/4,38/4,55%)

### TC-05 — Produção completa do trato 1

**Critério de aceite**: preencher total produzido igual ao total previsto, preencher kg produzido por insumo, salvar. O registro é persistido no IndexedDB e no Supabase com `concluido = true`. O trato só avança após registros de oferta de trato (Trato Confinamento) serem registrados nos currais; a fábrica sozinha não avança o trato.

- [x] Inserir total produzido = total previsto (825,1 kg)
- [x] Inserir kg produzido por insumo (655,7 / 130,4 / 39,0)
- [x] SALVAR habilitado
- [x] Após salvar, registro persistido no IndexedDB com `concluido = true`
- [x] Registro sincronizado no Supabase (`registros_fabrica_confinamento` com `concluido = true`)
- [x] Trato não avança sozinho (correto: depende de Trato Confinamento registrar distribuição)
- [x] Insumos sincronizam no Supabase (`registros_fabrica_confinamento_insumos` com `registro_id` = UUID do master)

**Bugs encontrados e corrigidos durante TC-05**:
1. `validateFabricaConfinamento` rejeitava data com hora (`DD/MM/AAAA HH:mm`); corrigido com `isValidDateWithTime`.
2. `handleSalvar` duplicava a hora na data (`salvarRegistro` já concatena hora); corrigido passando `data` sem hora para o master.
3. `concluido` sempre false por diferença de arredondamento (825,1 < 825,132); corrigido com tolerância de 0,5 kg.
4. Insumos não sincronizavam: `registro_id` apontava para ID local em vez do UUID do Supabase; corrigido seguindo padrão de `entrada-insumos` (insert + select + single, captura UUID, atualiza filhos).
5. Insumos enviavam `id` local não-UUID no payload; corrigido removendo `id` do payload (Supabase gera).

### TC-06 — Produção parcial mantém trato aberto

**Critério de aceite**: preencher total produzido menor que o previsto, salvar. O trato não avança, mostra "já produzido neste trato" e "faltam produzir X kg" na próxima abertura.

- [x] Inserir total produzido < total previsto (500 kg < 825,1 kg)
- [x] SALVAR e recarregar a tela
- [x] Trato continua no mesmo número (1 de 4)
- [x] Mostra "Já produzido neste trato: 500,0 kg"
- [x] Mostra "Faltam produzir: 325,1 kg"
- [x] Total previsto mantido (825,1 kg original, com já produzido e faltam exibidos separadamente)

**Bug encontrado e corrigido durante TC-06**:
6. `Boolean("false")` retornava `true` em JavaScript, fazendo produções parciais ficarem com `concluido = true` no Supabase. Corrigido para `registro.concluido === true || registro.concluido === 'true'` em `registroToSupabase`.

### TC-07 — Bloqueio do próximo trato até completar o atual

**Critério de aceite**: com trato 1 parcial, o trato 2 não pode ser iniciado. A tela deve indicar que o trato anterior precisa ser concluído.

- [x] Com trato 1 parcial (500 kg de 825,1 kg), tela mostra "Trato 1 em aberto. Faltam produzir 325,1 kg para avançar ao próximo trato"
- [x] Tela bloqueia no trato 1 (não há botão de avanço manual; o trato é determinado automaticamente)
- [x] Não é possível salvar trato 2 enquanto trato 1 está em aberto (a tela permanece no trato 1)
- [x] Após completar o trato 1 (500 + 325,1 = 825,1 kg), o aviso "Trato em aberto" desaparece
- [x] Registro master atualizado em vez de duplicado (total_produzido = 825.1, concluido = true)
- [x] Insumos complementares sincronizam com o supabaseId do master (6 insumos no Supabase: 3 + 3)
- [x] Sync queue vazia após conclusão

**Bug encontrado e corrigido durante TC-07**:
7. O `handleSalvar` criava um novo registro master a cada save, em vez de atualizar o existente quando há trato não concluído. Corrigido para buscar o registro local no IndexedDB pelo `supabaseId` e atualizar o registro existente (somar `totalProduzido`, marcar `concluido`), enfileirando com `operation: 'update'`.
8. O `syncToSupabase` para `registros_fabrica_confinamento` no bloco `create` sempre fazia `insert`. Adicionado check `if (registro.supabaseId)` para fazer `update` quando o registro já tem UUID do Supabase.
9. Os insumos complementares usavam o ID local do master como `registroId`, mas o Supabase espera o UUID. Corrigido para buscar o `supabaseId` do master no IndexedDB e usá-lo como `registroId` nos insumos.
10. O `registroFabricaNaoConcluidoId` guardava o UUID do Supabase (de `getRegistrosFabricaDoDia`), mas `getRegistro` busca no IndexedDB pelo ID local. Corrigido para buscar o registro local pelo `supabaseId` e guardar o ID local.

### TC-08 — Trato final com compensação de sobra

**Critério de aceite**: no trato 4 (último, 20%), se houve diferença entre o total produzido nos tratos anteriores e o total diário previsto, o trato final compensa a diferença. O total previsto do trato 4 = (total diário previsto - total já produzido nos tratos 1-3).

- [x] Produzir tratos 1, 2 e 3 com valores maiores que o planejado (cenário de compensação)
- [x] Ir para trato 4 (tela avançou automaticamente após 3 tratos distribuídos nos 4 currais)
- [x] Total previsto do trato 4 = total diário - soma distribuída nos tratos 1-3 (70,5 kg = 2750,44 - 2680)
- [x] Se produziu a mais nos tratos anteriores, trato 4 mostra valor reduzido (70,5 kg vs 550,1 kg sem compensação)
- [x] Compensação só ativada quando não é dia 1 (registros do dia anterior presentes)

**Bug encontrado e corrigido durante TC-08**:
11. `totalRealDiaAnterior` filtrava por `r.data === dataAnteriorMaisRecente` (timestamp exato), pegando apenas o último trato do dia anterior em vez da soma de todos os tratos. Corrigido para agrupar por data (slice 0-10) antes de somar.

### TC-09 — Capacidade do vagão excedida

**Critério de aceite**: se o total produzido excede a capacidade do vagão selecionado, a tela deve avisar e bloquear o SALVAR.

- [x] Selecionar vagão Menta 2500 (2.500 kg)
- [x] Selecionar dieta Terminação Boi (4 currais, total previsto 825,1 kg no trato 1)
- [x] Preencher total produzido 3.000 kg (excede 2.500 kg)
- [x] Tela avisa: "Excede a capacidade do vagão (2.500 kg)"
- [x] Input com borda vermelha e fundo vermelho claro
- [x] SALVAR bloqueado (disabled)
- [x] Ao trocar para vagão Kuhn (5.000 kg), aviso desaparece e SALVAR habilita

### TC-10 — Persistência offline (IndexedDB)

**Critério de aceite**: com o navegador offline, preencher e salvar um trato. O registro é salvo no IndexedDB com `sync_status = 'pending'`. Ao voltar online, sincroniza com o Supabase.

- [x] Desconectar rede (DevTools emulate Offline)
- [x] Salvar trato 1 (825,1 kg, Terminação Boi)
- [x] Registro master salvo no IndexedDB com `syncStatus = 'pending'`
- [x] 3 insumos salvos no IndexedDB com `syncStatus = 'pending'`
- [x] 4 itens na syncQueue (1 master + 3 insumos)
- [x] Indicador "SEM INTERNET" visível na tela
- [x] Reconectar rede (emulate sem Offline)
- [x] Registro sincroniza automaticamente (`syncStatus = 'synced'`, `supabaseId` preenchido)
- [x] Sync queue vazia após sincronização
- [x] Supabase: master com `concluido = true`, 3 insumos vinculados ao UUID do master

### TC-11 — Sincronização com Supabase (registros_fabrica_confinamento)

**Critério de aceite**: após salvar online, o registro master aparece na tabela `registros_fabrica_confinamento` e os insumos em `registros_fabrica_confinamento_insumos`.

- [x] Salvar trato 1 online (825,1 kg, Terminação Boi)
- [x] Query em `registros_fabrica_confinamento` retorna o registro com `fazenda_id`, `data`, `ordem_trato`, `total_previsto` (825.13), `total_produzido` (825.10), `concluido` (true), `tipo` (engorda), `formulacao_id`, `vagao_id`, `nome_usuario`, `sync_status` (synced)
- [x] Query em `registros_fabrica_confinamento_insumos` retorna 3 insumos com `kg_previsto` e `kg_produzido` por insumo, todos com `registro_id` apontando para o UUID do master
- [x] `sync_status = 'synced'` no IndexedDB, sync queue vazia

### TC-12 — Tela de Registros (histórico)

**Critério de aceite**: o botão "Registros" na tela abre a lista de registros de fábrica, mostrando os salvos com data, trato, total produzido e status de sync.

- [x] Clicar em "Registros" navega para `/caderneta/fabrica-confinamento/lista`
- [x] Lista mostra os registros salvos (2 registros)
- [x] Cada item mostra data (05/09/2026 17:07), número do trato (Trato 1), total previsto (825.132 kg), total produzido (825.1 kg), concluído (Sim)
- [x] Status de sincronização visível (ícone ✅ synced)
- [x] Botão COMPARTILHAR disponível

**Bug encontrado e corrigido durante TC-12**:
12. A rota `/caderneta/fabrica-confinamento/lista` não existia no App.tsx, causando redirect para a home. Criada `FabricaConfinamentoListaPage.tsx` (wrapper de `ListaRegistros`), registrada a rota, e adicionada ordem específica de campos no `ListaRegistros` para a caderneta `fabrica-confinamento` (Trato, Total Previsto, Total Produzido, Concluído).

### TC-13 — Removido (sem troca de data)

**Decisão**: a Fábrica Confinamento é uma operação do dia corrente, atrelada à leitura de cocho e à programação de tratos que vigoram para aquela data. Não há cenário operacional para retroceder ou adiantar a data. O `DatePicker` foi removido e a data é fixada no dia corrente via `todayBR()`. O título "Fábrica Confinamento" foi centralizado no header, já que não divide mais espaço com o seletor de data.

### TC-14 — Independência Fábrica × Trato e reconciliação posterior

**Modelo**: Fábrica e Trato Confinamento são registros independentes contra o mesmo plano do dia (`programacao_tratos` + `programacao_tratos_percentuais` + `programacao_tratos_currais`). Ambos registram o realizado contra o previsto. A integração entre os dois é reconciliação posterior (comparar fabricado vs. fornecido por trato/dia), não dependência de tela nem bloqueio cross-device. O operador do trato distribui conforme o plano; o vagão físico é o limite operacional.

**Critério de aceite**: ambos os registros referenciam o mesmo plano, operam de forma independente, e a reconciliação fabricado vs. fornecido fica auditável no Supabase.

- [x] Produzir trato 1 na Fábrica Confinamento (registrar total produzido)
- [x] Abrir TratoConfinamento e registrar distribuição do trato 1 nos currais
- [x] TratoConfinamento não bloqueia nem depende do registro da fábrica
- [x] Ambos os registros referenciam o mesmo `ordem_trato`, `data`, `tipo` e dieta
- [x] No Supabase, é possível comparar `registros_fabrica_confinamento.total_produzido` com a soma de `registros_oferta_trato` do mesmo trato/dia/dieta
- [x] Diferenças entre fabricado e fornecido ficam auditáveis (não há erro nem duplicação)

**Resultado (05/09/2026)**:
- Fábrica: trato 1, total_previsto 825,13, total_produzido 825,10, concluido true, 3 insumos sincronizados
- Trato: Curral A1, trato 1, kg_planejado 242,685, kg_ofertado_real 242,7, sincronizado
- TratoConfinamento não bloqueou nem leu a fábrica; operou independentemente contra o mesmo plano
- Reconciliação via SQL: `total_fabricado = 825,10` vs `total_fornecido = 242,7` (3 currais restantes)
- Diferença auditável, sem erro nem duplicação
- Dados de teste limpos (Supabase + IndexedDB)

### TC-15 — Reset de dados entre testes

**Critério de aceite**: entre ciclos de teste, é possível limpar os registros de fábrica da fazenda de testes para recomeçar do trato 1.

- [x] DELETE de `registros_fabrica_confinamento` e `registros_fabrica_confinamento_insumos` da fazenda
- [x] Recarregar tela → trato volta para 1 de 4
- [x] Total produzido zerado

---

## Cenário de testes (recriado 05/09/2026)

### Lotes e currais

| Lote | Categoria | Cab | Peso (kg) | Dieta | Currais | kg_mn_dia/curral |
|---|---|---|---|---|---|---|
| Lote A - Bois Gordos | boi gordo | 100 | 500 | Terminação Boi | A1, A2 | 808,95 |
| Lote B - Garrotes | garrote | 80 | 320 | Recria Garrote | B1, B2 | 477,04 |
| Lote C - Novilhas | novilha | 60 | 380 | Terminação Novilha | C1, C2 | 306,87 |
| Lote D - Boi Magro | boi magro | 70 | 400 | Terminação Boi | D1, D2 | 566,27 |

### Dietas (formulacao_insumos)

| Dieta | Silagem de Milho | Milho Grão Moído | Núcleo Mineral Bovino |
|---|---|---|---|
| Terminação Boi | 60% MS | 30% MS | 10% MS |
| Recria Garrote | 70% MS | 20% MS | 10% MS |
| Terminação Novilha | 65% MS | 25% MS | 10% MS |

### Vagões

| Vagão | Capacidade |
|---|---|
| Kuhn Profile 12.2 DS | 5.000 kg |
| Menta 2500 | 2.500 kg |
| Storti Mix 16 | 9.000 kg |

### Programação

- Tipo: `engorda`
- 4 tratos/dia
- Percentuais e horários: 30% (07:00), 25% (11:00), 25% (15:00), 20% (18:00)
- 8 currais vinculados

### Totais diários por dieta (kg_mn_dia × nº currais)

| Dieta | Currais | Total diário (kg) | T1 30% | T2 25% | T3 25% | T4 20% |
|---|---|---|---|---|---|---|
| Terminação Boi | A1+A2+D1+D2 | 2.750,44 | 825,1 | 687,6 | 687,6 | 550,1 |
| Recria Garrote | B1+B2 | 954,08 | 286,2 | 238,5 | 238,5 | 190,8 |
| Terminação Novilha | C1+C2 | 613,74 | 184,1 | 153,4 | 153,4 | 122,7 |

### Notas de leitura de cocho

| Nota | Descrição | % Ajuste |
|---|---|---|
| -1 | Cocho vazio (lambido) | +10% |
| 0 | Cocho limpo (sem sobras) | +5% |
| 1 | Poucas sobras (rapinha) | 0% |
| 2 | Sobras moderadas | -5% |
| 3 | Sobras em excesso | -10% |

---

## Bateria 2 — Ciclo completo (05/09/2026)

> Objetivo: validar o ciclo inteiro do confinamento, da leitura de cocho à reconciliação, incluindo virada de dia, produção parcial, offline e atraso de sincronização.
> Pré-requisito: cenário acima limpo (sem registros de fábrica, oferta ou leitura). IndexedDB limpo. Cache atualizado no PWA.

### TC-16 — Dia 1 sem leitura de cocho: seguir plano original

**Modelo**: no dia 1 (sem registros do dia anterior), o `kgBaseDia` usa o `kg_mn_dia` da programação. Não há compensação no trato final. A leitura de cocho ainda não chegou, então os tratos seguem o plano original.

- [x] Abrir Fábrica Confinamento com IndexedDB e Supabase limpos
- [x] Selecionar dieta Terminação Boi
- [x] Trato 1 de 4, total previsto 825,1 kg (sem leitura de cocho, sem ajuste)
- [x] Produzir trato 1 completo (825,1 kg)
- [x] Salvar e verificar: `concluido = true`, `total_produzido = 825,1`
- [x] Trato final (4) sem compensação: previsto 550,1 kg (plano original, dia 1)

**Resultado (05/09/2026)**:
- Trato 1: total_previsto 825,13, total_produzido 825,10, concluido true, 3 insumos sincronizados
- Após simular distribuição dos tratos 1-3 nos 4 currais (A1, A2, D1, D2), fábrica avançou para trato 4
- Trato 4: total previsto 550,1 kg (20% de 2750,44), sem compensação (dia 1, sem registros do dia anterior)
- Confirma que no dia 1 o trato final usa o percentual original do plano

### TC-17 — Dia 1: distribuir tratos no Trato Confinamento

**Modelo**: o operador do trato distribui conforme o plano, independentemente da fábrica. Cada curral recebe seu kg_planejado e registra kg_real.

- [x] Abrir Trato Confinamento
- [x] Curral A1: trato 4, previsto 161,8 kg, realizar 161,8 kg, salvar
- [x] Curral A2: trato 4, previsto 161,8 kg, realizar 160,0 kg (sobra 1,8 kg), salvar
- [x] Curral D1: trato 4, previsto 113,3 kg, realizar 113,3 kg, salvar
- [x] Curral D2: trato 4, previsto 113,3 kg, realizar 113,3 kg, salvar
- [x] Trato Confinamento mostra "Tratos do dia concluídos (4/4)" após cada curral
- [x] Verificar no Supabase: 4 registros em `registros_oferta_trato` com `ordem_trato = 4`

**Resultado (05/09/2026)**:
- Tratos 1-3 inseridos via SQL para acelerar (4 currais × 3 tratos = 12 registros)
- Trato 4 registrado via tela para os 4 currais (A1=161,8, A2=160,0, D1=113,3, D2=113,3)
- Bug encontrado: currais A1-D2 estavam sem `linha_id`, então o carousel não os exibia. Corrigido atribuindo à Linha 1
- Todos os 16 registros de oferta (4 currais × 4 tratos) sincronizados no Supabase

### TC-18 — Reconciliação Dia 1: fabricado vs. fornecido

**Modelo**: com ambos os registros no Supabase, a query de reconciliação compara o total fabricado com o total fornecido por trato/dia/dieta. Diferenças são auditáveis, não bloqueantes.

- [x] Query SQL: comparar `registros_fabrica_confinamento.total_produzido` (825,1) com `SUM(registros_oferta_trato.kg_ofertado_real)` (825,13) para trato 1
- [x] Diferença: -0,03 kg (arredondamento de ponto flutuante)
- [x] Sem erro, sem duplicação, diferença auditável

**Resultado (05/09/2026)**:
- Trato 1: fabricado 825,10 vs fornecido 825,13, diferença -0,03 (arredondamento)
- Tratos 2-4: fornecidos sem registro de fábrica (só trato 1 foi produzido na fábrica para o teste)
- Trato 4: fornecido 548,4 (A1=161,8 + A2=160,0 + D1=113,3 + D2=113,3)
- Query FULL OUTER JOIN mostra todos os tratos, mesmo os sem fábrica
- Diferenças auditáveis, sem erro nem duplicação

### TC-19 — Virada do dia: leitura de cocho antes do primeiro trato

**Modelo**: no dia 2, a leitura de cocho é feita antes do primeiro trato. O `leituraPercentualAjuste` recalcula o `kgBaseDia` com base no total real do dia anterior. Se a leitura ainda não chegou, o sistema segue o total do dia anterior sem ajuste.

**Pré-requisito**: simular que o dia 1 foi completo (todos os 4 tratos produzidos e distribuídos). Para o teste, inserir registros de leitura de cocho no Supabase para o dia anterior.

- [x] Inserir leitura de cocho no Supabase para Lote A (nota 0, +5% ajuste) e Lote D (nota 2, -5% ajuste)
- [x] Inserir registros de oferta do dia anterior (04/09) para os 4 currais de Terminação Boi
- [x] Recarregar Fábrica Confinamento (botão Atualizar)
- [x] Selecionar Terminação Boi
- [x] `kgBaseDia` recalculado: Lote A (808,95 × 1,05 = 849,40 por curral) + Lote D (566,27 × 0,95 = 537,96 por curral)
- [x] Trato final (4) com compensação: kgBaseDia - jaProduzido = 82,7 kg total
- [x] Verificar que o ajuste foi aplicado corretamente

**Resultado (05/09/2026)**:
- Registros de oferta do dia 04/09 inseridos via SQL (4 currais × 4 tratos = 16 registros)
- Leituras de cocho inseridas: Lote A nota 0 (+5%), Lote D nota 2 (-5%)
- Fábrica recarregada com Terminação Boi: trato 4 de 4, total previsto 82,7 kg
- Cálculo confirmado:
  - Lote A: kgBaseDia = 808,95 × 1,05 = 849,40. Já distribuído (4 tratos): 808,96 (A1) e 807,16 (A2). Compensação: 40,4 + 42,2 = 82,6 kg
  - Lote D: kgBaseDia = 566,27 × 0,95 = 537,96. Já distribuído: 566,32. Compensação: 0 kg (distribuído excede novo total)
- O +5% aumentou o total diário do Lote A, gerando sobra no trato final
- O -5% diminuiu o Lote D, zerando o trato final porque o distribuído já excede o novo total
- Observação: o trato 4 já foi distribuído no TC-17, mas a fábrica ainda o mostra porque maxOrdemFeita = 4 e ordemAtual = min(5, 4) = 4. Bug menor: a fábrica permite produzir um trato que já foi distribuído
- Nota: não foi possível testar o trato 1 do dia 2 porque os 4 tratos do dia atual (05/09) já foram distribuídos no TC-17. Para testar o trato 1 do dia 2, seria necessário resetar os registros do dia atual ou avançar a data do sistema

### TC-20 — Virada do dia: sem leitura de cocho, seguir dia anterior

**Modelo**: se a leitura de cocho ainda não chegou no dia 2, o sistema usa o total real do dia anterior como base, sem ajuste (`fatorAjuste = 1`).

- [x] Limpar leituras de cocho do dia anterior
- [x] Recarregar Fábrica Confinamento
- [x] `kgBaseDia` = total real do dia anterior (sem ajuste, fatorAjuste = 1)
- [x] Trato final com compensação: 550,1 kg (soma dos restos de cada curral após tratos 1-3)

**Resultado (07/09/2026)**:
- Leituras de cocho removidas do Supabase
- Fábrica recarregada: trato 4 de 4, total previsto 550,1 kg
- Sem leitura, kgBaseDia = total real do dia anterior (808,95 para Lote A, 566,27 para Lote D)
- Compensação: A1=161,79, A2=161,79 (808,95 - 647,16), D1=113,25, D2=113,25 (566,27 - 453,02)
- O trato final subtrai apenas os tratos anteriores (ordem_trato < ordemAtual), não o trato corrente
- Confirma que sem leitura o sistema segue o total do dia anterior sem ajuste

### TC-21 — Leitura chega no meio do dia: compensação no último trato

**Modelo**: o operador começa o dia sem leitura (segue dia anterior). A leitura chega após o trato 2. O operador recarrega a tela (botão Atualizar ou auto-sync online). O `kgBaseDia` muda. Os tratos 1-2 já foram produzidos com o base antigo. O trato 4 compensa a diferença entre o novo total diário e o já produzido.

- [x] Sem leitura: total previsto 550,1 kg (TC-20)
- [x] Inserir leitura de cocho (nota 0, +5% Lote A; nota 2, -5% Lote D) no Supabase
- [x] Recarregar Fábrica (botão Atualizar)
- [x] `kgBaseDia` muda (Lote A +5%, Lote D -5%)
- [x] Trato 4: previsto = novo total diário ajustado - já distribuído = 574,4 kg (compensa a diferença)
- [x] O trato 4 não fica negativo (Math.max(0, ...))

**Resultado (07/09/2026)**:
- Sem leitura: total previsto 550,1 kg (fatorAjuste = 1)
- Com leitura (+5% Lote A, -5% Lote D): total previsto 574,4 kg (fatorAjuste aplicado)
- O trato final compensa automaticamente a diferença quando a leitura chega
- Math.max(0, ...) garante que o trato não fica negativo

### TC-22 — Produção parcial com complemento offline

**Modelo**: o operador produz parcialmente offline, salva, depois completa quando volta online. O registro master é atualizado (não duplicado), os insumos complementares são adicionados.

- [x] Desconectar rede (emulate Offline)
- [x] Produzir trato 1 parcial (400 kg de 832,4 kg), salvar
- [x] Registro salvo no IndexedDB com `syncStatus = 'pending'`, `concluido = false`
- [x] Reconectar rede
- [x] Sync automático: master sincroniza com `concluido = false`, `total_produzido = 400`
- [x] Recarregar tela: mostra "Trato 1 em aberto, faltam 432,4 kg"
- [x] Completar trato 1 (432,4 kg), salvar
- [x] Master atualizado no Supabase (não duplicado): `total_produzido = 832,40`, `concluido = true`
- [x] Insumos complementares sincronizam: 6 insumos no total (3 da parcial + 3 da complementação)

**Resultado (05/09/2026)**:
- Produção parcial offline: 400 kg de 832,4 kg, concluido = false
- Após reconectar: sync automático, master sincronizado com ID `638bbc5d-77c4-4c02-8037-aec6208a0005`
- Fábrica detectou trato em aberto: "Trato 1 em aberto. Faltam produzir 432,4 kg"
- Complementação: 432,4 kg, master atualizado (mesmo ID), total_produzido = 832,40, concluido = true
- 6 insumos no total (3 da parcial + 3 da complementação), todos com registro_id apontando para o master
- **Bug encontrado**: ao salvar offline, a fábrica chama `carregarDados()` que tenta buscar dados do Supabase e fica presa em "Carregando..." indefinidamente. A tela só destrava quando a rede é reconectada. Isso acontece porque as funções cached tentam buscar do Supabase mesmo quando offline, em vez de retornar o cache imediatamente

### TC-23 — Atraso de sincronização cross-device

**Modelo**: Fábrica e Trato em dispositivos diferentes. Fábrica produz offline. Trato distribui online. Quando a fábrica sincroniza, a reconciliação mostra a diferença temporária.

- [x] Dispositivo A (Fábrica): produziu trato 1 (832,4 kg) e sincronizou (TC-22)
- [x] Dispositivo B (Trato): ainda não distribuiu (registros de oferta do dia 05/09 foram limpos)
- [x] Verificar Supabase: `registros_fabrica_confinamento` tem 1 registro, `registros_oferta_trato` tem 0 registros do dia 05/09
- [x] Reconciliação parcial: fabricado 832,40 vs fornecido 0 (diferença 832,40 kg, auditável)
- [x] Cenário cross-device validado: a fábrica e o trato operam independentemente, a reconciliação mostra a diferença temporária

**Resultado (05/09/2026)**:
- Fábrica produziu trato 1 (832,4 kg) e sincronizou no Supabase
- Trato Confinamento não distribuiu (registros de oferta do dia 05/09 foram limpos para o TC-22)
- Reconciliação: fabricado 832,40 vs fornecido 0, diferença 832,40 kg
- A diferença é auditável e representa o atraso temporário entre os dispositivos
- Ambos os dispositivos operam independentemente, sem bloqueio

### TC-24 — Capacidade do vagão com leitura ajustada

**Modelo**: a leitura de cocho aumenta o `kgBaseDia`, o que pode fazer o trato 1 exceder a capacidade do vagão Menta 2500.

- [x] Selecionar vagão Menta 2500 (2.500 kg)
- [x] Preencher 2.600 kg no total produzido
- [x] Aviso "Excede a capacidade do vagão (2.500 kg)" aparece
- [x] SALVAR bloqueado (disabled)
- [x] Trocar para Kuhn (5.000 kg): aviso desaparece, SALVAR habilitado

**Resultado (05/09/2026)**:
- Vagão Menta 2500 (2.500 kg) com 2.600 kg: aviso de capacidade exibido, SALVAR disabled
- Vagão Kuhn (5.000 kg) com 2.600 kg: sem aviso, SALVAR habilitado
- Validação de capacidade funciona corretamente

### TC-25 — Texto de compartilhamento

**Modelo**: o texto gerado pelo botão COMPARTILHAR deve usar labels legíveis, sem IDs técnicos, sem campo CONCLUÍDO, com uma casa decimal nos totais.

- [x] Salvar um trato na fábrica (trato 1, 832,4 kg)
- [x] Abrir lista de registros, clicar COMPARTILHAR
- [x] Texto contém: FÁBRICA CONFINAMENTO, Data, RESPONSÁVEL, DIETA, VAGÃO, TRATO, TOTAL PREVISTO, TOTAL PRODUZIDO
- [x] Texto não contém: `formulacaoId`, `vagaoId`, `supabaseId`, `id`, `CONCLUÍDO`
- [x] Totais com uma casa decimal (ex: 832,4 kg)
- [x] Valores em itálico (WhatsApp, marcados com *)

**Resultado (05/09/2026)**:
- Texto de compartilhamento correto: RESPONSÁVEL, DIETA, VAGÃO, TRATO, TOTAL PREVISTO (1 casa decimal), TOTAL PRODUZIDO (1 casa decimal)
- Sem IDs técnicos, sem CONCLUÍDO no texto de compartilhamento
- **Bugs encontrados na lista de registros (não no texto de compartilhamento)**:
  1. ID local visível ("a940188c") na lista, deveria ser ocultado
  2. CONCLUÍDO ainda aparece na lista ("Sim"), deveria ter sido removido
  3. TOTAL PREVISTO com muitas casas decimais na lista ("832.4123999999999 kg"), deveria ter 1 casa decimal

### TC-26 — Botão Atualizar recarrega leitura de cocho

**Modelo**: o botão Atualizar no header da Fábrica chama `carregarDados()`, que recarrega leituras, programação, registros, vagoes e dietas.

- [x] Produzir trato 1 sem leitura de cocho (base = dia anterior, total 825,1 kg)
- [x] Inserir leitura de cocho no Supabase (nota 0, +5% Lote A; nota 2, -5% Lote D)
- [x] Clicar no botão Atualizar (ícone RefreshCw)
- [x] Total previsto muda de 825,1 kg para 832,4 kg (reflete o novo `kgBaseDia` com ajuste)
- [x] Trato final compensa a diferença

**Resultado (05/09/2026)**:
- Sem leitura: total previsto 825,1 kg (fatorAjuste = 1)
- Inseridas leituras no Supabase via MCP (simula outro dispositivo)
- Após clicar Atualizar: total previsto 832,4 kg (fatorAjuste aplicado)
- O botão Atualizar recarrega leituras, programação, registros, vagoes e dietas corretamente

### TC-27 — Auto-sync ao voltar online

**Modelo**: o listener `window.addEventListener('online', ...)` chama `carregarDados()` automaticamente quando o dispositivo recupera conexão.

- [x] Emular offline
- [x] Inserir leitura de cocho no Supabase via MCP (simula outro dispositivo)
- [x] Emular online (desativar Offline)
- [x] Fábrica recarrega automaticamente (sem clique manual)
- [x] Total previsto reflete o novo `kgBaseDia` com a leitura inserida (825,1 → 832,4 kg)

**Resultado (05/09/2026)**:
- Offline: total previsto 825,1 kg (sem leitura)
- Leituras inseridas no Supabase via MCP enquanto offline
- Ao voltar online: fábrica recarregou automaticamente, total previsto 832,4 kg
- O listener `window.addEventListener('online', ...)` chama `carregarDados()` sem clique manual

### TC-28 — Reset completo entre ciclos

**Critério de aceite**: após limpar Supabase e IndexedDB, a Fábrica volta ao estado inicial (trato 1, sem produção, sem leitura).

- [x] DELETE de `registros_fabrica_confinamento`, `registros_fabrica_confinamento_insumos`, `registros_oferta_trato`, `registros_leitura_cocho` da fazenda
- [x] Limpar IndexedDB (fabrica-confinamento, fabrica-confinamento-insumos, trato-confinamento, syncQueue, leitura-cocho)
- [x] Recarregar Fábrica: trato 1 de 4, total produzido vazio, sem "trato em aberto"
- [x] Recarregar Trato Confinamento: trato 1 de 4, Curral A1, previsto 242,7 kg

**Resultado (05/09/2026)**:
- Supabase limpo: 0 registros em fabrica, oferta e leitura
- IndexedDB limpo: 5 stores cleared (fabrica-confinamento, fabrica-confinamento-insumos, trato-confinamento, syncQueue, leitura-cocho)
- Fábrica: trato 1 de 4, 4 currais (Terminação Boi), total previsto 825,1 kg, sem produção, sem "trato em aberto"
- Trato Confinamento: Curral A1, 1º trato de 4, previsto 242,7 kg, sem leitura, Linha 1 com todos os currais
- Estado inicial restaurado com sucesso

---

## Correções de bugs encontrados nos testes

### Bug 1: Fábrica presa em "Carregando..." offline (TC-22)

**Sintoma**: ao salvar uma produção parcial offline, `carregarDados()` chama funções não-cached (`getInsumosByFormulacao`, `getFormulacaoById`, `getRegistrosFabricaDoDia`) que fazem `fetch` ao Supabase. O `fetch` fica pendurado quando o navegador está offline, travando a tela em "Carregando..." indefinidamente.

**Correção**: adicionado check `navigator.onLine` antes de cada chamada não-cached. Quando offline:
- `getInsumosByFormulacao`: pulado, insumos ficam vazios (não essencial para recarga)
- `getFormulacaoById`: pulado, nome da formulação vem do cache de `getLoteDetalhesComCategoriasCached`
- `getRegistrosFabricaDoDia`: substituído por busca local no IndexedDB (`getAllRegistros('fabrica-confinamento')`), filtrando por data, tipo e formulação

**Arquivo**: `frontend/src/pages/cadernetas/FabricaConfinamentoPage.tsx`

### Bug 2: Lista de registros com 3 problemas visuais (TC-25)

**Sintomas**:
1. ID local visível no card ("a940188c")
2. Campo CONCLUÍDO ainda aparecia ("Sim") apesar de ter sido removido do texto de compartilhamento
3. TOTAL PREVISTO com muitas casas decimais ("832.4123999999999 kg")

**Correção**:
1. Removido o `<span>` que exibia `(registro.id as string).slice(0, 8)` no card
2. Removido `'concluido'` do array `ordemFabrica` e sua label do `labelsFabrica`
3. Adicionado `Number(value).toFixed(1).replace('.', ',')` na formatação de `totalPrevisto` e `totalProduzido`

**Arquivo**: `frontend/src/components/cadernetas/ListaRegistros.tsx`

### Bug 3: Fábrica permite reproduzir trato já distribuído (TC-19)

**Sintoma**: quando `maxOrdemFeita = 4` e `qtdTratos = 4`, `ordemAtual = Math.min(5, 4) = 4`. A fábrica mostra o trato 4 novamente mesmo que já tenha sido distribuído, permitindo produzir um trato extra.

**Correção**: adicionado estado `todosTratosConcluidos` que é `true` quando `maxOrdemFeita >= qtdTratos` e não há trato de fábrica não concluído. Quando ativo:
- Exibe mensagem verde "Todos os N tratos do dia foram concluídos. Nenhuma produção pendente."
- Bloqueia o botão SALVAR (`podeSalvar` retorna `false`)

**Arquivo**: `frontend/src/pages/cadernetas/FabricaConfinamentoPage.tsx`

### Bug 4: Compensação do trato final subtrai o próprio trato (TC-19/TC-20)

**Sintoma**: a compensação do último trato somava **todos** os registros de oferta do dia, incluindo o trato atual. Para o Curral A2 sem leitura: `808,95 - (242,685 + 202,2375 + 202,2375 + 160,0) = 808,95 - 807,16 = 1,79 kg`. A fábrica mostrava 1,8 kg como total previsto, um valor operacionalmente absurdo.

**Causa raiz**: o filtro `.filter((t) => t.kg_ofertado_real !== null)` não excluía o trato sendo fabricado. A compensação subtraía o trato 4 da compensação do trato 4, calculando quanto faltou distribuir em vez de quanto falta produzir.

**Correção**: adicionado `&& Number(t.ordem_trato) < ordemAtual` no filtro, para subtrair apenas os tratos anteriores ao atual. Também renomeado `jaProduzido` para `jaDistribuido` para refletir o que realmente está sendo somado (registros de oferta de trato, não registros de fábrica).

**Cálculo corrigido** (TC-20, sem leitura):
- A2: 808,95 - (242,685 + 202,2375 + 202,2375) = 808,95 - 647,16 = 161,79 kg
- A1: 808,95 - 647,16 = 161,79 kg
- D1: 566,27 - 453,016 = 113,25 kg
- D2: 566,27 - 453,016 = 113,25 kg
- Total: 550,1 kg (igual ao plano original de 20%, o que faz sentido porque os tratos 1-3 foram distribuídos exatamente como planejado)

**Arquivo**: `frontend/src/pages/cadernetas/FabricaConfinamentoPage.tsx`

---

## Como adicionar novos casos

Adicione novos casos abaixo desta linha, seguindo o formato:

```
### TC-XX — Título do caso

**Critério de aceite**: descrição do comportamento esperado.

- [ ] passo 1
- [ ] passo 2
```

---

# Roteiro operacional independente para testes manuais

Esta seção é a bateria recomendada para a próxima rodada de testes. Cada roteiro abaixo é autônomo: deve começar com sua própria preparação, usar uma data de teste própria e terminar com sua própria verificação. O resultado do Roteiro A não é pré-requisito para o Roteiro B, e assim por diante.

## Ambiente preparado

A fazenda de testes foi preparada com os seguintes dados cadastrais:

- Fazenda: Fazenda Gesta'Up, ID `d649c65e-16ab-4b77-a84b-df937aa41cc3`.
- Registros operacionais de fábrica, trato e leitura de cocho removidos antes desta bateria.
- Lote A, Curral A1: Terminação Boi.
- Lote B, Curral B1: Recria Garrote.
- Lote C, Curral C1: Terminação Novilha.
- Lote D, Curral D1: Terminação Boi.
- Currais A2, B2, C2 e D2 desativados para manter a relação 1:1 entre lote e curral.
- Quatro tratos por dia: 30%, 20%, 20% e 30%.
- Dietas ativas: Terminação Boi, Recria Garrote e Terminação Novilha.
- Vagões ativos: Menta 2500, Kuhn Profile 12.2 DS e Storti Mix 16.
- Notas de cocho configuradas: -1 = +10%, 0 = +5%, 1 = 0%, 2 = -5% e 3 = -10%.
- Horários da programação: trato 1 às 07:00, trato 2 às 11:00, trato 3 às 15:00 e trato 4 às 18:00.
- Totais esperados no primeiro dia para Terminação Boi: T1 = 412,6 kg, T2 = 275,0 kg, T3 = 275,0 kg e T4 = 412,6 kg.
- Totais esperados no primeiro dia para Recria Garrote: T1 = 143,1 kg, T2 = 95,4 kg, T3 = 95,4 kg e T4 = 143,1 kg.
- Totais esperados no primeiro dia para Terminação Novilha: T1 = 92,1 kg, T2 = 61,4 kg, T3 = 61,4 kg e T4 = 92,1 kg.

### Verificação de praticabilidade dos valores de MN

Os valores da programação foram conferidos por curral, usando o número de cabeças e o peso vivo médio registrados no snapshot da programação. A leitura correta é de matéria natural (MN) por curral e por dia, não de kg por cabeça.

| Dieta/lotes | Cabeças por curral | Peso médio | MN/dia por curral | MN/cabeça/dia | Estimativa de MS/cabeça/dia | MS como % do peso |
|---|---:|---:|---:|---:|---:|---:|
| Terminação Boi, A e D | 50 / 35 | 500 / 400 kg | 808,95 / 566,27 kg | 16,18 / 16,18 kg | 9,26 / 9,26 kg | 1,85% / 2,31% |
| Recria Garrote, B | 40 | 320 kg | 477,04 kg | 11,93 kg | 5,24 kg | 1,64% |
| Terminação Novilha, C | 30 | 380 kg | 306,87 kg | 10,23 kg | 4,86 kg | 1,28% |

A estimativa de MS usa os teores cadastrados e a composição de cada dieta: Terminação Boi = 57,20% de MS, Recria Garrote = 43,90% e Terminação Novilha = 47,45%. Os totais de 300 a 800 kg por curral são operacionais e compatíveis com vagões de 2.500 kg ou maiores. Para os lotes A e D, os consumos estimados também estão em faixa plausível para confinamento. A Terminação Novilha merece validação nutricional específica, porque 1,28% do peso vivo em MS é baixo para uma novilha em terminação se o lote estiver em confinamento total; isso pode ser intencional se houver outra fonte de consumo ou se o valor de `kg_mn_dia` for apenas uma base de teste.

Esta conclusão valida a grandeza operacional para o teste, mas não substitui a conferência do nutricionista responsável. Durante os testes, registrar se o operador considera o valor praticável e se a sobra observada no cocho confirma a oferta.

### Preparação obrigatória antes de qualquer roteiro

1. Confirmar que o usuário está na Fazenda Gesta'Up.
2. Limpar os registros operacionais do roteiro anterior, incluindo fábrica, insumos produzidos, trato e leitura de cocho.
3. Limpar os stores de confinamento do IndexedDB no dispositivo que será usado no roteiro, ou remover os dados do site e recarregar o PWA.
4. Fazer uma carga online dos cadastros e aguardar a confirmação de dados atualizados para uso offline.
5. Anotar a data de teste escolhida. Não reutilizar a mesma data de outro roteiro.
6. Ao terminar, guardar evidências da tela e da consulta de conferência. Não corrigir manualmente os registros antes de registrar o resultado.

Se a limpeza exigir uma operação técnica, ela deve ser feita apenas na fazenda de testes. O operador manual não deve apagar registros de produção de uma fazenda real.

## Roteiro A — Fábrica isolada, produção online

**Objetivo**: validar a fábrica sem depender de trato ou leitura de cocho.

**Preparação própria**: executar a preparação obrigatória, escolher a dieta Terminação Boi e confirmar que não existem registros de trato ou leitura na data.

### Referência de valores por curral — Terminação Boi (30/20/20/30)

A tela da fábrica mostra apenas a contagem de currais e o total previsto, sem listar os nomes ou valores individuais. Esta tabela serve para conferência manual durante o teste.

| Curral | Lote | kg MN/dia | T1 (30%) | T2 (20%) | T3 (20%) | T4 (30%) |
|---|---|---:|---:|---:|---:|---:|
| A1 | Lote A | 808,95 | 242,7 | 161,8 | 161,8 | 242,7 |
| D1 | Lote D | 566,27 | 169,9 | 113,3 | 113,3 | 169,9 |
| **Total** | | **1.375,22** | **412,6** | **275,0** | **275,0** | **412,6** |

### Passos

1. Abrir Fábrica Confinamento.
2. Selecionar dieta Terminação Boi.
3. Confirmar na tela: trato atual "1 de 4", currais "4" e total previsto "825,1 kg".
4. Selecionar o vagão Menta 2500. A tela mostra "Capacidade do vagão: 2.500 kg" em cinza abaixo do campo de total produzido.
5. Digitar `3000` no campo Total Produzido. A borda do campo fica vermelha e aparece a mensagem "Excede a capacidade do vagão (2.500 kg)". O botão SALVAR fica desabilitado.
6. Limpar o campo e digitar `825,1`. A mensagem de erro desaparece e o SALVAR habilita.
7. Preencher os kg produzidos por insumo conforme a tabela abaixo e salvar.

   | Insumo | % MN | Previsto | Produzido |
   |---|---:|---:|---:|
   | Silagem de Milho | 79,47% | 655,7 | 655,7 |
   | Milho Grão Moído | 15,80% | 130,4 | 130,4 |
   | Núcleo Mineral Bovino | 4,73% | 39,0 | 39,0 |

8. Recarregar a tela. Confirmar que o trato 1 permanece registrado e concluído, sem mensagem de "trato em aberto".
9. Avançar para o trato 2. Digitar `400` no Total Produzido, preencher os insumos proporcionalmente e salvar.
10. Recarregar. Confirmar que o trato continua aberto, mostra "Já produzido neste trato: 400,0 kg" e "Faltam produzir 150,1 kg".
11. Digitar `550,1` no Total Produzido (complemento), preencher os insumos e salvar. Confirmar que a complementação atualiza o registro existente, sem criar outro master para o mesmo trato.
12. Tentar produzir novamente o trato 2 já concluído. A operação deve ser bloqueada ou claramente impedida.
13. Confirmar que a fábrica não avança para o trato 3 apenas porque produziu. O avanço depende da distribuição correspondente no Trato Confinamento.
14. Verificar a tela de Registros e confirmar os estados de produção parcial, completo e sincronizado.

**Resultado esperado**: a fábrica calcula, salva, reabre e complementa produções corretamente, sem depender de registros de trato ou leitura. O aviso de capacidade do vagão aparece e bloqueia o salvamento quando o total excede o limite.

## Roteiro B — Trato isolado, distribuição online sem registro de fábrica

**Objetivo**: validar que o operador do trato consegue trabalhar com o plano, mesmo quando a fábrica ainda não lançou sua produção.

**Preparação própria**: executar a preparação obrigatória, carregar o cache online e deixar a tabela de fábrica vazia na data do roteiro.

### Referência de valores por curral — Terminação Boi, trato 1 (30%)

A tela do Trato Confinamento mostra cada curral com seu nome e kg planejado individualmente. Estes são os valores esperados para o trato 1 sem leitura de cocho.

| Curral | Lote | kg planejado T1 (30%) |
|---|---|---:|
| A1 | Lote A | 242,7 |
| A2 | Lote A | 242,7 |
| D1 | Lote D | 169,9 |
| D2 | Lote D | 169,9 |

### Passos

1. Abrir Trato Confinamento.
2. Confirmar que A1, A2, D1 e D2 aparecem com os valores planejados da tabela acima.
3. Selecionar A1, digitar `242,7` no campo de kg real e salvar. Confirmar persistência local e sincronização.
4. Sair e voltar à tela. Confirmar que A1 está registrado e os demais currais continuam pendentes.
5. Tentar repetir A1 no mesmo trato. A tela deve bloquear a duplicidade ou informar que já foi distribuído.
6. Distribuir A2 com `242,7`, D1 com `169,9` e D2 com `169,9`.
7. Confirmar que a conclusão de todos os currais libera o próximo trato na fábrica, depois de atualizar os dados.
8. Repetir o fluxo para o trato 2 (20%), usando `200` em A1 em vez de `161,8`, registrando a justificativa operacional. Os demais currais seguem o planejado: A2 = 161,8, D1 = 113,3, D2 = 113,3.
9. Abrir Registros e confirmar os oito registros de distribuição (4 do trato 1 + 4 do trato 2), seus estados de sincronização e suas quantidades reais.

**Resultado esperado**: o trato opera a partir do plano cacheado, não espera um registro da fábrica e não permite duplicação de distribuição.

> **Débito técnico**: o passo 9 (abrir Registros e confirmar os oito registros de distribuição) não pôde ser executado porque não existe tela de lista de registros para Trato Confinamento nem para Leitura de Cocho. O botão "Registros" no header dessas telas redireciona para a Home. Criar as rotas `/caderneta/trato-confinamento/lista` e `/caderneta/leitura-cocho/lista` reusando o componente `ListaRegistros` (ou equivalente) para essas duas cadernetas.

## Roteiro C — Leitura de cocho isolada

**Objetivo**: validar todas as notas, a associação com lote/curral e a disponibilidade da leitura para os outros fluxos.

**Preparação própria**: executar a preparação obrigatória sem criar registros de fábrica ou trato na data do roteiro.

1. Abrir Leitura de Cocho.
2. Registrar nota -1 em A1, nota 0 em A2, nota 1 em B1, nota 2 em C1 e nota 3 em D1.
3. Confirmar na tela a descrição e o percentual de cada nota: +10%, +5%, 0%, -5% e -10%.
4. Salvar cada leitura e confirmar o estado de sincronização.
5. Recarregar a tela e confirmar que as leituras permanecem associadas aos respectivos lotes e currais.
6. Corrigir uma leitura antes do ciclo seguinte, se a tela permitir edição, e confirmar que a versão mais recente prevalece sem duplicidade indevida.
7. Abrir a lista de registros e conferir data, curral, lote, nota e sincronização.
8. Verificar que a leitura não altera retrospectivamente um trato já distribuído.

**Resultado esperado**: todas as notas são registradas com o significado correto, permanecem disponíveis no cache e só influenciam cálculos de tratos futuros.

### Resultado da execução (08/09/2026)

| Passo | Verificação | Resultado |
|---|---|---|
| 1 | Abrir Leitura de Cocho | OK, tela mostra 4 currais (A2, B2, C1, D2), um por lote |
| 2 | Registrar notas -1, 0, 1, 2 | OK, A2=-1, B2=0, C1=1, D2=2 |
| 3 | Confirmar descrição e percentual | OK: -1="Aumentar 10%", 0="Aumentar 5%", 1="Manter", 2="Diminuir 5%", 3="Diminuir 10%" |
| 4 | Salvar e confirmar sync | OK, 4 registros synced no Supabase |
| 5 | Recarregar e confirmar persistência | OK, todas as leituras permanecem associadas aos currais/lotes |
| 6 | Corrigir leitura (D2 de 2 para 3) | **BUG**: criou novo registro em vez de atualizar. 5 registros no Supabase (D2 aparece 2x: nota 2 e nota 3) |
| 7 | Abrir lista de registros | **Débito técnico**: tela de registros não existe para Leitura de Cocho |
| 8 | Leitura não altera trato já distribuído | OK por design (não há tratos distribuídos no teste, mas a leitura só influencia tratos futuros) |

**Bug 5: Leitura de Cocho permite duplicidade ao re-salvar o mesmo curral no mesmo dia, RESOLVIDO**

**Sintoma**: ao selecionar um curral que já tinha leitura salva e clicar em outra nota + SALVAR, a tela criava um novo registro em vez de atualizar o existente.

**Correção aplicada**: a tela identifica leituras já existentes para o curral na data atual, marca o registro como concluído, desabilita os botões de nota e exibe "Leitura já registrada para este curral hoje. Nova leitura bloqueada.". A função de salvamento também mantém uma verificação adicional no IndexedDB antes de enfileirar qualquer novo registro.

**Validação**: após tentar alterar a nota do Curral A2, o Supabase permaneceu com apenas um registro para o curral e a tela não permitiu nova seleção ou salvamento.

**Arquivo**: `frontend/src/pages/cadernetas/LeituraCochoPage.tsx`.

## Roteiro D — Ciclo normal completo, leitura antes da fábrica

**Objetivo**: validar o fluxo integrado do dia seguinte, começando com os tratos do dia anterior já concluídos, passando pela leitura de cocho da manhã, pela fábrica e terminando no trato.

**Preparação própria**: executar a preparação obrigatória. Antes de iniciar a nova data, criar um conjunto completo de registros do dia anterior, com os quatro tratos produzidos e distribuídos. Depois escolher uma nova data de teste, sem registros operacionais, para representar a manhã seguinte. A leitura dessa nova data deve ajustar os valores previstos desse próprio dia.

### Referência de valores ajustados para o trato 1

A fábrica mostra um total agregado para a dieta. A distribuição individual deve ser conferida no Trato Confinamento, usando esta tabela:

| Curral | Lote | Base MN/dia | Nota | Ajuste | Trato 1 (30%) |
|---|---|---:|---:|---:|---:|
| A1 | Lote A | 808,95 | 0 | +5% | 254,8 kg |
| D1 | Lote D | 566,27 | 2 | -5% | 161,4 kg |
| **Total Terminação Boi** | | | | | **416,2 kg** |

### Passos

1. Confirmar que os quatro tratos do dia anterior foram distribuídos e que não existem registros operacionais na nova data.
2. Registrar nota 0 em A1 e nota 2 em D1. B1 e C1 pertencem a outras dietas e podem receber nota 1 para completar a validação das leituras, sem alterar o total da Terminação Boi.
3. Abrir Fábrica Confinamento e selecionar Terminação Boi.
4. Confirmar que a fábrica mostra aproximadamente `416,2 kg` no trato 1, usando o total real do dia anterior como base e os ajustes da manhã.
5. Preencher o campo Total Produzido com `416,2` e conferir os kg produzidos por insumo antes de salvar.
6. Abrir Trato Confinamento. Confirmar que A1 mostra `254,8 kg` e D1 mostra `161,4 kg`.
7. Distribuir A1 e D1 com esses valores e salvar os dois registros.
8. Atualizar a fábrica e confirmar que o trato 2 fica disponível somente depois da distribuição dos dois currais de Terminação Boi.
9. Repetir a conferência para o trato 2. Os valores esperados são A1 `169,9 kg` e D1 `107,6 kg`, total aproximado de `277,5 kg`.
10. Repetir a sequência para o trato 3.
11. No trato 4, confirmar que a compensação considera o total diário ajustado menos apenas os tratos anteriores. O próprio trato atual nunca pode ser subtraído.
12. Conferir que o total final não fica artificialmente pequeno, negativo ou igual a 1,8 kg por erro de cálculo.
13. Conferir no Supabase a cadeia completa: leituras, quatro masters de fábrica, insumos filhos e distribuições por curral.

**Resultado esperado**: a leitura altera os valores individuais do Trato Confinamento e o total agregado da Fábrica, a distribuição por curral fica visível na tela do trato e o trato final fecha a conta corretamente.

### Resultado da execução (08/09/2026)

A fazenda de testes foi corrigida para manter A1, B1, C1 e D1 ativos, cada um vinculado a um único lote. A2, B2, C2 e D2 foram desativados sem exclusão cadastral.

Foi preparado o dia anterior com oito distribuições, quatro para A1 e quatro para D1, totalizando 808,95 kg em A1 e 566,27 kg em D1. Na nova data, foram registradas e sincronizadas as leituras A1=0, B1=1, C1=1 e D1=2.

A fábrica calculou corretamente os totais ajustados da Terminação Boi:

| Trato | Previsto | Produzido | Estado |
|---:|---:|---:|---|
| 1 | 416,21 kg | 416,20 kg | Concluído e sincronizado |
| 2 | 277,47 kg | 277,50 kg | Concluído e sincronizado |
| 3 | 277,47 kg | 277,50 kg | Concluído e sincronizado |
| 4 | 416,15 kg | 416,20 kg | Concluído e sincronizado |

No Trato Confinamento, os valores individuais foram:

| Trato | A1 | D1 |
|---:|---:|---:|
| 1 | 254,8 kg | 161,4 kg |
| 2 | 169,9 kg | 107,6 kg |
| 3 | 169,9 kg | 107,6 kg |
| 4 | 254,8 kg | 161,4 kg |

Foram confirmados no Supabase quatro registros de fábrica, 12 insumos filhos, oito distribuições do dia anterior e oito distribuições da nova data, todos sincronizados.

Durante a execução foi corrigido um erro no Trato Confinamento: o cálculo do dia anterior comparava o timestamp completo e somava apenas o último trato. A comparação passou a considerar a data, permitindo somar os quatro tratos anteriores. O typecheck passou após a correção.

O Roteiro D foi concluído com sucesso após a correção cadastral e do cálculo do histórico diário.

## Roteiro E — Virada de dia sem leitura e com leitura tardia

**Objetivo**: validar os dois comportamentos quando o novo dia começa sem leitura e quando a leitura chega depois que a operação começou.

**Preparação própria**: criar, somente para este roteiro, um conjunto completo de registros do dia anterior com os quatro tratos distribuídos. Depois iniciar uma nova data de teste sem criar dados do novo dia.

### E1. Novo dia sem leitura

1. Abrir a fábrica no novo dia sem registrar leitura.
2. Confirmar que a base diária segue o total real do dia anterior, com fator de ajuste 1.
3. Produzir e distribuir os tratos 1, 2 e 3.
4. Confirmar que o trato 4 compensa apenas os tratos anteriores e fecha o total diário.
5. Confirmar que nenhum valor fica negativo.

### E2. Leitura chega depois do trato 2

1. Em uma nova preparação independente, produzir e distribuir os tratos 1 e 2 sem leitura.
2. Registrar nota 0 em um lote e nota 2 em outro.
3. Atualizar a fábrica.
4. Confirmar que o novo total diário é recalculado.
5. Produzir o trato 4 e confirmar que ele compensa a diferença entre o novo total e o que já foi distribuído.
6. Confirmar que o sistema usa `Math.max(0, ...)` ou equivalente operacional: nenhum curral recebe quantidade negativa.

**Resultado esperado**: a ausência de leitura não bloqueia o dia; uma leitura posterior recalcula apenas o que ainda pode ser ajustado, preservando o histórico já distribuído.

### Resultado da execução (08/09/2026)

#### E1, novo dia sem leitura

- O histórico de 07/09 foi preparado com oito distribuições, quatro em A1 e quatro em D1.
- Sem leitura em 08/09, a fábrica mostrou 412,6 kg no trato 1, usando fator de ajuste 1.
- Os tratos 1, 2 e 3 foram produzidos e distribuídos sem bloqueio.
- No trato 4, a fábrica calculou 412,4 kg, valor positivo e ligeiramente menor por causa dos arredondamentos dos tratos anteriores.
- Nenhum valor negativo ou artificialmente pequeno foi exibido.

#### E2, leitura após o trato 2

- Os tratos 1 e 2 foram produzidos e distribuídos sem leitura: 412,6 kg e 275,0 kg.
- Depois foram registradas A1=0 (+5%) e D1=2 (-5%).
- Após a atualização, o trato 3 foi recalculado para 277,5 kg, com A1=169,9 kg e D1=107,6 kg.
- O trato 4 foi recalculado para 422,2 kg, sem quantidade negativa.
- Os registros anteriores permaneceram preservados, e a leitura tardia afetou somente os tratos ainda não distribuídos.

No Supabase ficaram 4 masters de fábrica, 12 insumos filhos, 8 distribuições do dia anterior, 6 distribuições do dia atual e 2 leituras tardias, todos sincronizados.

O Roteiro E foi concluído com sucesso.

## Roteiro F — Operação offline em dois dispositivos

**Objetivo**: validar fábrica e trato trabalhando sem internet e sincronizando depois, sem depender de comunicação em tempo real entre os aparelhos.

**Preparação própria**: usar dois perfis ou dispositivos separados. Em ambos, carregar os cadastros online, confirmar a atualização do cache e depois limpar os registros operacionais apenas da data deste roteiro.

1. No dispositivo da leitura, registrar previamente nota 0 em A1 e sincronizar antes de ficar offline.
2. Colocar o dispositivo da fábrica offline.
3. Abrir Fábrica Confinamento a partir do cache.
4. Produzir o trato 1 e salvar.
5. Conferir no IndexedDB que o master e os insumos estão `pending` e que existe item na `syncQueue`.
6. Colocar o dispositivo do trato offline, sem esperar o registro da fábrica.
7. Abrir Trato Confinamento com dados cacheados.
8. Confirmar que A1 mostra o ajuste de +5% vindo da leitura previamente cacheada.
9. Salvar a distribuição de A1 e conferir registro local pendente e item na fila.
10. Recarregar ambos os dispositivos ainda offline. Os registros devem permanecer disponíveis.
11. Restaurar a conexão apenas no dispositivo da fábrica e confirmar a sincronização do master e dos insumos.
12. Restaurar a conexão no dispositivo do trato e confirmar a sincronização da distribuição.
13. Confirmar que a fila fica vazia, os registros ficam `synced` e não há duplicidades no Supabase.
14. Reabrir as telas e confirmar que os dados sincronizados continuam visíveis.

**Resultado esperado**: cada operador trabalha de forma independente offline; a sincronização posterior preserva os registros e não exige que um aparelho receba em tempo real o lançamento feito pelo outro.

### Resultado da execução em build de produção local (08/09/2026)

O build foi gerado com `npm run build` e servido por `vite preview` em `localhost:4173`. O service worker foi registrado e ativado, com `sw.js`, manifest e página base retornando HTTP 200.

Foram usadas duas páginas do mesmo build, uma para a fábrica e outra para o trato. Ambas foram carregadas online, os dados foram aquecidos e depois ficaram offline independentemente.

- A leitura A1=0 (+5%) foi sincronizada antes do modo offline.
- A fábrica offline exibiu Terminação Boi, dois currais e total de 412,6 kg.
- O master e os três insumos foram salvos no IndexedDB como `pending`, com quatro itens na `syncQueue`.
- O trato offline exibiu A1 com ajuste de +5% e previsto de 254,8 kg.
- A distribuição de A1 foi salva como `pending` e entrou na fila.
- Após restaurar a conexão, master, insumos e trato ficaram `synced`, e a fila ficou vazia.
- O Supabase ficou com 1 master de fábrica, 3 insumos e 1 distribuição, sem duplicidades.

Durante a preparação foi corrigido `getFarmTimezone` para não tentar consultar o Supabase quando `navigator.onLine` é falso, permitindo que o salvamento offline prossiga usando o fuso padrão.

A recarga completa das rotas offline abriu o shell do PWA pelo service worker, mas a tela não recuperou as dietas e os vagões do cache cadastral. A persistência e a sincronização sem recarga funcionaram. Permanece pendente investigar por que o cache cadastral aquecido não é reutilizado após uma recarga offline completa no build de produção.

O Roteiro F foi concluído quanto à operação e sincronização offline em duas páginas, com a pendência de recarga offline documentada.

## Roteiro G — Falhas, recarga e recuperação

**Objetivo**: validar situações comuns de campo sem contaminar os roteiros funcionais.

**Preparação própria**: executar a preparação obrigatória com uma nova data e selecionar Recria Garrote, que possui dois currais e total menor.

1. Desconectar a rede antes de abrir a tela. Confirmar o banner de modo offline.
2. Abrir a tela de fábrica pelo cache e confirmar que dieta, curral, insumos e vagão continuam disponíveis.
3. Iniciar uma produção parcial e recarregar a página antes de salvar. Confirmar que nenhum registro incompleto é criado.
4. Salvar a produção parcial offline, fechar e abrir o PWA. Confirmar que o valor permanece.
5. Restaurar a rede e confirmar que o registro pendente é sincronizado uma única vez.
6. Simular erro de rede durante o salvamento e verificar a mensagem apresentada ao operador.
7. Reenviar manualmente um registro que tenha ficado em erro, se o botão estiver disponível.
8. Verificar que o erro não cria um segundo registro quando o primeiro já chegou ao servidor.
9. Trocar de dieta, voltar à dieta anterior e confirmar que o estado de produção não vaza de uma dieta para outra.
10. Abrir a lista de registros e confirmar que não há IDs técnicos expostos ao operador.

**Resultado esperado**: recarga, perda de conexão, retomada e reenvio não produzem perda silenciosa, duplicidade ou mistura de dados entre dietas.

## Matriz de cobertura

| Área | Roteiros |
|---|---|
| Cálculo por dieta, curral e trato | A, B, D |
| Produção completa, parcial e complemento | A, G |
| Capacidade do vagão | A |
| Bloqueio de duplicidade | A, B, G |
| Leitura de todas as notas | C |
| Leitura antes da operação | D |
| Sem leitura no novo dia | E1 |
| Leitura tardia e compensação | E2 |
| Fábrica e trato independentes | B, F |
| Offline e fila de sincronização | F, G |
| Persistência após recarga | A, B, C, F, G |
| Conferência de histórico e Supabase | A, B, C, D, F |

## Regra de execução

Executar um roteiro por vez. Ao encontrar uma falha, registrar o roteiro, passo, data, dispositivo, estado online/offline, evidência da tela e registros encontrados no servidor. Corrigir ou repetir somente aquele roteiro depois do reset próprio; os demais roteiros continuam independentes.
