# Inventário das RPCs `SECURITY DEFINER` — Fase 5.0 (07/10/2026)

Entregável **somente leitura**: nada foi alterado no banco. Serve para revisão antes de qualquer `REVOKE`.
Fonte: `pg_proc` (schema `public`, `prosecdef`, não-trigger, com `EXECUTE` para `anon` ou `authenticated`), `cron.job`, `pg_depend`, corpo das funções e `grep` de `.rpc(...)` / `/rest/v1/rpc/` no PWA, no Painel e nas Edge Functions.

**Total: 118 funções expostas** (todas executáveis por `anon` e `authenticated`, salvo 11 só para `authenticated`). Hoje **só ~40 têm alguma checagem de autorização** no corpo; a maior parte aceita `p_fazenda_id`/`p_usuario_id` do chamador sem validar.

## Regras de segurança para revogar sem quebrar

1. **Cron roda como `postgres`**: revogar `EXECUTE` de `anon`/`authenticated` não afeta os 9 jobs.
2. **Chamadores internos**: verifiquei que todos os chamadores DB->DB das funções "internas" são `SECURITY DEFINER` (rodam como dono), então continuam funcionando.
3. **Dependências que chamam como o USUÁRIO** (não podem perder `EXECUTE` para `authenticated`):
   - *policies*: `caller_has_fazenda_access`, `caller_mesmo_grupo_fazenda`, `current_user_has_access`, `get_peao_fazenda_id`, `is_admin_user`, `is_super_admin`, `os_fazenda_pertence`, `storage_os_object_access`, `user_has_fazenda_access`, `user_has_fazenda_access_with_papel`, `user_has_fazenda_role`, `user_has_os_access`, `user_has_programacao_access`;
   - *views* (agora `security_invoker`): **`calcular_peso_medio_lote`** (usada por `v_lote_pasto_ocupacao_atual` e `v_lote_modulo_ocupacao_atual`) e `user_has_fazenda_access` (`itens_almoxarifado_pwa`).
4. Padrão de checagem a adicionar nas funções chamadas pelo cliente: no topo, `IF NOT (public.is_admin_user() OR public.caller_has_fazenda_access(<fazenda do OBJETO alvo>)) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;`. A fazenda vem do **objeto** (lote, categoria, solicitação...), nunca só de `p_fazenda_id`. `p_usuario_id`/`p_usuario_email` deixam de ser confiados (derivar de `auth.uid()`).
5. Defesa em profundidade ao final: `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon` (funções novas nascem fechadas) e `SET search_path` nas funções que não têm.

## Achados críticos confirmados lendo o corpo

| Função | Problema | Impacto |
|---|---|---|
| `soft_delete_record(p_schema, p_table, p_id)` | SQL dinâmico `UPDATE %I.%I SET deleted_at = now() WHERE id = ...` sem dono, sem allowlist, **`anon` executa** | Qualquer pessoa com a chave pública "apaga" (soft) qualquer linha de qualquer tabela com `deleted_at`, em qualquer schema (inclusive `auth.users`, se houver a coluna). **Sem nenhum chamador no código** |
| `set_audit_context(...)` (2 sobrecargas) | Grava `app.current_user_*` na sessão sem validar `p_user_id = auth.uid()`; `anon` executa | Forja a identidade registrada em `audit_log` |
| `end_impersonation_session(p_session_id)` | Sem checagem; `anon` executa | Qualquer um encerra sessões de impersonação |
| `cleanup_audit_log()` | Apaga auditoria > 90 dias; `anon` executa | Já é o job de cron; não precisa de `EXECUTE` para clientes |
| `autenticar_peao_app(p_acesso_id)` | **Devolve e-mail e senha em texto do peão** para qualquer `acesso_id`; `anon` executa | Faz parte do desenho do PWA (S5 aceito em 10/09), mas é a função mais sensível: ver decisão 2 |
| `registrar_push_subscription` / `remover_push_subscription` | Sem checagem de fazenda; `anon` executa | Registrar/apagar assinaturas push de qualquer fazenda |
| `salvar_notificacoes_config(p_fazenda_id, ...)` | Upsert sem checar a fazenda | Alterar notificações de qualquer fazenda |
| `rejeitar_solicitacao_novo_lote`, `aprovar_solicitacao_novo_lote` | Sem checagem; confia em `p_usuario_id` | Aprovar/rejeitar solicitações de qualquer fazenda como qualquer usuário |
| `corrigir_peso_categoria(...)` | Sem checagem de tenant | Alterar peso de qualquer categoria de lote |
| `get_controller_email_fazenda_grupo(origem, destino)` | Valida só "mesmo grupo", não o chamador | Vaza e-mail de controller entre fazendas do grupo para `anon` |

## Classificação e ação proposta

Legenda de ação: **R-all** = `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`; **R-anon** = `REVOKE ... FROM PUBLIC, anon` (mantém `authenticated`); **+authz** = acrescentar checagem de tenant/papel no corpo; **manter** = sem mudança.

### Sub-fase 5.1 — internas/cron/sem chamador → **R-all** (impacto funcional ~zero)

| Grupo | Funções | Evidência |
|---|---|---|
| Cron (9) | `verificar_ocupacoes_acima_meta`, `notificar_individuos_incompletos_antigos`, `notificar_proximidade_desmama`, `update_dados_lotes`, `update_pesos_individuos`, `sample_system_health`, `cleanup_audit_log`, `fn_atualizar_status_atividades_automatico`, `fp_rollover` | `cron.job` 4–14 |
| Internas (chamadas só por funções/triggers DEFINER) | `calcular_cabecas_lote`, `calcular_taxa_lotacao_modulo`, `calcular_taxa_lotacao_pasto`, `fp_seed_imprevisto_categorias`, `fp_seed_indicadores`, `gerar_notificacao_ocupacao`, `notificar_individuo_incompleto`, `recalc_consumo_series`, `recalcular_consumo_por_formulacao`, `recalcular_estoque_cantina`, `recalcular_formulacao`, `recalcular_peso_vivo_lote`, `recalcular_pesos_suplementacao_historico` | todos os chamadores DB->DB são DEFINER; nenhum `.rpc()` no código; sem dependência de view/policy |
| Sem nenhum chamador (código/cron/DB) | `soft_delete_record`, `atualizar_peso_entrada_por_nascimento`, `atualizar_pesos_em_lote`, `calcular_peso_vivo_atual_individual`, `listar_individuos_para_atualizacao_peso`, `update_quant_atual`, `get_descendentes_individuo`, `fp_set_dia`, `fp_set_obs_semana`, `fp_set_status_semana`, `atualizar_cotacao_dolar` | só aparecem em migrations/types; ver decisão 1 antes de revogar |

### Sub-fase 5.2 — leitura/estatísticas chamadas pelo Painel/PWA sem checagem → **R-anon + authz**

| Tipo de checagem | Funções |
|---|---|
| Apenas admin (`is_admin_user()` / `is_super_admin()`) | `get_audit_log`, `get_admin_evolution`, `get_farm_usage_metrics`, `get_system_health`, `get_ia_monitoramento` |
| Acesso à fazenda (`caller_has_fazenda_access(p_fazenda_id)`) | `get_dashboard_stats`, `get_gado_stats`, `get_recent_activities`, `get_rastreio_usuarios`, `get_rastreio_cadernetas`, `get_rastreio_cadernetas_detalhe`, `get_imprevistos_recentes_by_fazenda`, `get_sessoes_abertas_by_fazenda`, `get_atividades_funcionario`, `obter_execucoes_rotina`, `resumo_execucoes_rotina`, `get_lotes_para_relatorio`, `get_relatorio_lote_ciclo_vida` |
| Pelo objeto (lote/indivíduo) | `get_registros_atividades(periodo)` (sem fazenda: escopar pelo usuário), `get_controller_email_fazenda_grupo` (exigir acesso à origem) |
| Mudar para `SECURITY INVOKER` | `calcular_peso_medio_lote` (respeita o RLS do chamador e mantém as views funcionando) |

### Sub-fase 5.3 — escrita/exclusão chamadas pelo cliente sem checagem → **R-anon + authz de tenant + usuário via `auth.uid()`**

`aprovar_solicitacao_novo_lote`, `rejeitar_solicitacao_novo_lote`, `transferir_lote_entre_fazendas` (PWA e Painel; checar origem E destino), `corrigir_peso_categoria`, `recategorizar_lote_categoria`, `iniciar_plano_lote`, `encerrar_plano_lote`, `migrar_plano_lote`, `migrar_plano_nutricional`, `encerrar_plano_nutricional`, `criar_snapshot_entrada`, `excluir_registro_abastecimento`, `excluir_registro_entrada_insumos`, `gerar_notificacoes_recategorizacao`, `salvar_notificacoes_config`, `registrar_push_subscription`, `remover_push_subscription`, `update_quant_atual_with_data`.

### Sub-fase 5.3b — já têm alguma checagem → **R-anon + revisão de qualidade**

Verificar que a fazenda vem do OBJETO e não de `p_fazenda_id`, e que `p_usuario_id` não é confiado: `editar_registro_{clima,leitura_cocho,oferta_trato,suplementacao}`, `excluir_registro_{clima,leitura_cocho,oferta_trato,suplementacao}`, `cancelar_os_venda`, `conferir_recebimento_transferencia`, `estornar_baixa_os`, `fechar_os_venda`, `alocar_lote_curral`, `criar_item_almoxarifado_pwa`, `criar_item_cantina_pwa`, `get_itens_pendentes_devolucao`, `sincronizar_historico_pasto_lote_edit`, funções do mapa (`salvar_*`, `atualizar_*`, `remover_*`, `get_*_com_geometria`, `get_detalhes_*_mapa`, `get_lote_por_*`, `encontrar_*`, `detectar_gaps_estradas`, `validar_conectividade_estradas`, `reconstruir_topologia_estradas`, `remover_geometrias_lote`), `vision_{atualizar_payload,atualizar_relatorio,baixar_payload,criar_relatorio,excluir_relatorio,listar_relatorios}`, `get_{bebedouros_permitidos,dados}_relatorio_*_fazenda` (7 funções), `get_relatorio_consumo(p_token,...,p_fazenda_id_param)`.

### Sub-fase 5.4 — identidade/auditoria e `anon` legítimo

| Função | Ação |
|---|---|
| `set_audit_context` (2) | **R-anon**; exigir `p_user_id = auth.uid()` (ou `is_super_admin()` para impersonação); ignorar se não autenticado |
| `end_impersonation_session` | **R-anon**; exigir que o chamador seja o `super_admin_id` da sessão |
| `autenticar_peao_app`, `get_fazenda_por_acesso` | **anon legítimo** (boot do PWA): ver decisão 2 |
| Relatórios públicos por token: `get_dados_relatorio_{abastecimento,clima,consumo,estoque,morte,pastagens,rodeio,tratos}`, `get_bebedouros_permitidos_relatorio`, `get_relatorio_consumo(p_token,...)`, `vision_relatorio_payload` | **manter anon**; auditar que validam token ativo/não expirado e só devolvem a fazenda do token. `vision_relatorio_payload` já valida (`ativo` e `expira_em`) |

### Helpers de autorização → **manter** (as policies/views dependem)

`caller_has_fazenda_access`, `caller_is_peao`, `caller_mesmo_grupo_fazenda`, `current_user_has_access`, `current_usuario_id`, `is_admin_user`, `is_super_admin`, `os_fazenda_pertence`, `storage_os_object_access`, `get_peao_fazenda_id`, `user_has_fazenda_access`, `user_has_fazenda_access_with_papel`, `user_has_fazenda_role`, `user_has_os_access`, `user_has_programacao_access`, `vision_tem_acesso`. (Só retornam booleano/uuid do próprio chamador; `anon` recebe `false`.)

## Decisões que preciso de você antes da 5.1

1. **Funções "sem chamador"** (`fp_set_dia`, `fp_set_obs_semana`, `fp_set_status_semana`, `get_descendentes_individuo`, `atualizar_cotacao_dolar`, `update_quant_atual`, `atualizar_pesos_em_lote` e as outras de peso): confirma que não são usadas fora dos repos (SQL manual, outro app, automação)? Se houver dúvida, fico só com `REVOKE` de `anon` nessas.
2. **`autenticar_peao_app`** devolve a senha do peão a qualquer um que saiba o `acesso_id` (S5 aceito). Mantemos como está nesta fase, ou prefere que eu estude trocar o PWA para usar só `login-peao` (que devolve só a sessão)? Não mexo sem sua decisão.
3. **`calcular_peso_medio_lote` -> `SECURITY INVOKER`**: aprova?
4. **`ALTER DEFAULT PRIVILEGES`** (funções novas nascerem fechadas): aprova incluir ao final da 5.1?

## Plano de execução da 5.1 (após sua revisão)

Migration única `...fase5_1_rpcs_internas.sql` + rollback com os `GRANT` originais; teste em transação revertida na fazenda `d649c65e`: (a) cada função revogada negada para `anon`/`authenticated`; (b) fluxos que dependem delas continuam: INSERT em `registros_pastagens` (trigger `processar_movimentacao_pastagem`), `lote_categorias`/`formulacoes`/`registros_suplementacao` (triggers de recálculo), criação de fazenda (`fp_seed_*`), leitura de `v_lote_pasto_ocupacao_atual` como peão; (c) cron: executar manualmente `verificar_ocupacoes_acima_meta()`/`sample_system_health()` como `postgres`.
