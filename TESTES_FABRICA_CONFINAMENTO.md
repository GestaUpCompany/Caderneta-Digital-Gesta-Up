# Roteiro de Testes — Fábrica Confinamento

> Roteiro vivo. Cada caso deve ser testado individualmente, validando tela e fluxo.
> Marcar `[x]` quando passar, `[ ]` quando pendente, `[~]` quando em progresso.
> Adicionar novos casos abaixo dos existentes conforme surgirem.

## Contexto

- **Fazenda de testes**: `d649c65e-16ab-4b77-a84b-df937aa41cc3` (Fazenda Gesta'Up)
- **Tela**: `/caderneta/fabrica-confinamento`
- **Pré-requisito**: 4 lotes ativos, 8 currais, 3 dietas, 3 vagões, programação 4 tratos/dia (30/25/25/20%)

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

- [ ] Inserir total produzido < total previsto
- [ ] SALVAR e recarregar a tela
- [ ] Trato continua no mesmo número
- [ ] Mostra "Já produzido neste trato: X kg"
- [ ] Mostra "Faltam produzir: Y kg"
- [ ] Total previsto ajustado para (previsto original - já produzido)

### TC-07 — Bloqueio do próximo trato até completar o atual

**Critério de aceite**: com trato 1 parcial, o trato 2 não pode ser iniciado. A tela deve indicar que o trato anterior precisa ser concluído.

- [ ] Com trato 1 parcial, tentar avançar para trato 2
- [ ] Tela bloqueia ou avisa que trato 1 precisa ser concluído
- [ ] Não é possível salvar trato 2 enquanto trato 1 está em aberto

### TC-08 — Trato final com compensação de sobra

**Critério de aceite**: no trato 4 (último, 20%), se houve diferença entre o total produzido nos tratos anteriores e o total diário previsto, o trato final compensa a diferença. O total previsto do trato 4 = (total diário previsto - total já produzido nos tratos 1-3).

- [ ] Produzir tratos 1, 2 e 3 com valores exatos
- [ ] Ir para trato 4
- [ ] Total previsto do trato 4 = total diário - soma produzida nos tratos 1-3
- [ ] Se produziu a mais nos tratos anteriores, trato 4 mostra 0 ou valor negativo tratado
- [ ] Se produziu a menos, trato 4 compensa a diferença

### TC-09 — Capacidade do vagão excedida

**Critério de aceite**: se o total previsto do trato excede a capacidade do vagão selecionado, a tela deve avisar ou bloquear.

- [ ] Selecionar vagão Menta 2500 (2.500 kg)
- [ ] Selecionar dieta Terminação Boi (4 currais, total previsto > 2.500 kg no trato 1)
- [ ] Tela avisa que excede a capacidade do vagão
- [ ] Ou SALVAR bloqueado, ou aviso visível

### TC-10 — Persistência offline (IndexedDB)

**Critério de aceite**: com o navegador offline, preencher e salvar um trato. O registro é salvo no IndexedDB com `sync_status = 'pending'`. Ao voltar online, sincroniza com o Supabase.

- [ ] Desconectar rede (DevTools → Offline)
- [ ] Salvar trato 1
- [ ] Registro aparece na lista de registros
- [ ] Status mostra pendente/não sincronizado
- [ ] Reconectar rede
- [ ] Registro sincroniza automaticamente
- [ ] Status muda para sincronizado

### TC-11 — Sincronização com Supabase (registros_fabrica_confinamento)

**Critério de aceite**: após salvar online, o registro master aparece na tabela `registros_fabrica_confinamento` e os insumos em `registros_fabrica_confinamento_insumos`.

- [ ] Salvar trato 1 online
- [ ] Query em `registros_fabrica_confinamento` retorna o registro com `fazenda_id`, `data`, `ordem_trato`, `total_previsto`, `total_produzido`, `concluido`
- [ ] Query em `registros_fabrica_confinamento_insumos` retorna os insumos com `kg_previsto` e `kg_produzido` por insumo
- [ ] `sync_status = 'synced'` no IndexedDB

### TC-12 — Tela de Registros (histórico)

**Critério de aceite**: o botão "Registros" na tela abre a lista de registros de fábrica, mostrando os salvos com data, trato, total produzido e status de sync.

- [ ] Clicar em "Registros"
- [ ] Lista mostra os registros salvos
- [ ] Cada item mostra data, número do trato, total produzido
- [ ] Status de sincronização visível

### TC-13 — Troca de data

**Critério de aceite**: ao trocar a data, a tela recarrega os tratos daquela data. Se não há registros, começa no trato 1. Se há registros, continua de onde parou.

- [ ] Trocar para uma data sem registros → trato 1 de 4
- [ ] Trocar para uma data com registros parciais → continua no trato correto
- [ ] Trocar de volta para hoje → estado correto restaurado

### TC-14 — Integração com TratoConfinamento

**Critério de aceite**: após produzir na fábrica, o TratoConfinamento deve refletir a produção da fábrica no trato correspondente. (Pode ser implementação futura — marcar como pendente se ainda não integrado.)

- [ ] Produzir trato 1 na fábrica
- [ ] Abrir TratoConfinamento
- [ ] Trato 1 mostra a produção da fábrica como disponível
- [ ] Ou ao menos não duplica o que já foi produzido na fábrica

### TC-15 — Reset de dados entre testes

**Critério de aceite**: entre ciclos de teste, é possível limpar os registros de fábrica da fazenda de testes para recomeçar do trato 1.

- [ ] DELETE de `registros_fabrica_confinamento` e `registros_fabrica_confinamento_insumos` da fazenda
- [ ] Recarregar tela → trato volta para 1 de 4
- [ ] Total produzido zerado

---

## Como adicionar novos casos

Adicione novos casos abaixo desta linha, seguindo o formato:

```
### TC-XX — Título do caso

**Critério de aceite**: descrição do comportamento esperado.

- [ ] passo 1
- [ ] passo 2
```
