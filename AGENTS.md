# AGENTS.md — Caderneta Digital Gesta-Up

## Sistemas que compartilham o mesmo banco Supabase

- **PWA (este repo)**: `C:\Users\USER\Documents\Caderneta-Digital-Gesta-Up` — React PWA offline-first com sync IndexedDB
- **Painel Web (outro repo)**: `C:\Users\USER\Documents\GestaUp-Cadernetas-Gestao` — React + TanStack Query, online, gestão/admin

Projeto Supabase: `nrwljcvhwbezmoummxbl` ("Cadernetas Digitais")

## Fazenda de testes

`d649c65e-16ab-4b77-a84b-df937aa41cc3` ("Fazenda Gesta'Up") — usar sempre esta fazenda para testes que envolvam dados no Supabase. Não pertence a nenhum grupo (`grupo_id = null`), então funcionalidades que dependem de grupo (ex: Transferência entre fazendas) não são funcionais nela.

## Comandos

- Build PWA: `cd frontend && npm run build`
- Typecheck PWA: `cd frontend && npx tsc --noEmit`
- Dev PWA: `cd frontend && npm run dev`

## Fluxo de migrations estruturais (obrigatório)

Migrations estruturais (CREATE/ALTER TABLE, triggers, policies, índices, functions) devem seguir este fluxo rigorosamente:

1. Escrever o arquivo local em `supabase/migrations/<timestamp>_<nome>.sql` no repo do Painel Web (`GestaUp-Cadernetas-Gestao`), que é o repo responsável pelo schema.
2. Rodar `supabase db push` no Painel Web para aplicar e registrar em `schema_migrations`.
3. Commitar e pushar o arquivo no Painel Web.

NÃO usar `apply_migration` do MCP para migrations estruturais. O MCP aplica o SQL no banco mas registra com timestamp de execução (não o do nome do arquivo), criando divergência entre local e remoto que quebra o `db push` em execuções futuras. Se `db push` falhar com "Remote migration versions not found in local migrations directory", criar placeholder local com o version remoto e rodar `supabase migration repair --status applied <version>` para os que já estão no banco.

Migrations pontuais (dados operacionais: resets, backfills, deletes por fazenda) continuam sendo aplicadas via MCP sem arquivo local, conforme regra existente.

O PWA (`Caderneta-Digital-Gesta-Up`) não cria nem aplica migrations diretamente. Mudanças de schema que afetam o PWA (novas colunas, novas tabelas, triggers) são feitas no Painel Web e o PWA apenas consome o resultado via `syncService.ts` e queries Supabase.

**Disparador**: antes de criar ou aplicar qualquer migration estrutural, ler esta seção.

## Regras operacionais

- SEMPRE QUE FOR TESTAR ALGO NO PWA OU PAINEL WEB, USAR A FAZENDA DE TESTES (`d649c65e-16ab-4b77-a84b-df937aa41cc3`).
- Não use heredoc para escrever mensagens de commit. Escreva a mensagem em texto direto `-m "mensagem"`.
- Migrações ESTRUTURAIS (schema: CREATE/ALTER TABLE, triggers, policies, índices) devem ser escritas em arquivo local em `supabase/migrations/`, aplicadas via `supabase db push`, e depois commitadas e pushadas. Isso mantém versionamento e tracking no Supabase.
- Migrações PONTUAIS (dados operacionais: resets, backfills, deletes por fazenda) NÃO geram arquivo nem passam por `db push`. Aplique diretamente via MCP. Critérios para identificar uma migração pontual: (1) não é idempotente, rodar duas vezes não faz sentido; (2) falharia em banco novo vazio, pois depende de dados existentes; (3) poluiria a linha do tempo do histórico de schema com operações de dados.

## Documentação de continuidade

O histórico de mudanças já aplicadas e o backlog de trabalho pendente estão separados para manter este arquivo enxuto. Consulte quando relevante:

- **`docs/HISTORICO.md`** — mudanças já aplicadas (RESOLVIDO/IMPLEMENTADO). Consulte quando a pergunta for sobre "por que isso foi feito assim" ou para entender o estado anterior de uma parte do código. Disparadores específicos que apontam para decisões de arquitetura já tomadas (notificações de morte com coordenadas, transferência entre fazendas, time tracking por sessões, mãe adotiva para guacho, mapas KML) estão documentados lá.
- **`docs/BACKLOG.md`** — débitos técnicos pendentes, specs aprovadas não implementadas, e a auditoria completa de julho/2026 (87 falhas em 4 frentes com matriz de impacto cruzado PWA ↔ Painel Web). Consulte no início de um chat novo para saber o que ainda falta fazer.

## Manutenção da documentação de continuidade (obrigatório)

Este arquivo é o ponto de entrada do contexto do projeto, não um diário de bordo. Para que ele continue enxuto e útil entre chats, siga estas regras ao trabalhar no projeto:

1. **Ao resolver um item do `docs/BACKLOG.md`**: mova a entrada correspondente para `docs/HISTORICO.md` com a data e o resumo do que foi feito. Não deixe o BACKLOG acumular coisas já resolvidas; um chat novo lê o BACKLOG para saber o que falta, e itens resolvidos lá são ruído que custa tokens e confunde.
2. **Ao aplicar uma mudança nova no sistema**: adicione ao `docs/HISTORICO.md`, não ao `AGENTS.md`. O `AGENTS.md` só muda se o contexto estável do sistema mudar (novo comando, nova fazenda de testes, novo fluxo de migrations, nova regra operacional). Mudanças pontuais de código, correções de bug, novas funcionalidades vão para o HISTORICO.

## Disparadores para consulta seletiva

Quando mencionar qualquer um destes tópicos, ler a seção correspondente em `docs/HISTORICO.md` ou `docs/BACKLOG.md`:

- "notificação de morte", "Ver no Mapa sem coordenadas", trigger de notificação de morte → `docs/HISTORICO.md` (Notificações de morte exigem coordenadas)
- "sync de insumos da Fábrica Confinamento", `registros_fabrica_confinamento` → `docs/HISTORICO.md` (Sync de insumos da Fábrica Confinamento)
- "peão sem vínculo", "cards de lote zerados", `createFazendaWithController` → `docs/HISTORICO.md` (Peão sem vínculo)
- "transferência entre fazendas", `transferir_lote_entre_fazendas`, motivo Saída/Transferência → `docs/HISTORICO.md` (Transferência de lote entre fazendas)
- "cronômetro de atividade", "sessões de atividade", "imprevisto em atividade", "tempo produtivo vs bruto" → `docs/HISTORICO.md` (Time tracking de atividades)
- "mapa KML", "georreferenciamento", "pastos no mapa", "GPS no PWA", "MapLibre", "PostGIS" → `docs/HISTORICO.md` (Mapas KML)
- "guacho", "mãe adotiva", "bezerro abandonado", `mae_adotiva_id` → `docs/HISTORICO.md` (Mãe adotiva para guacho)
- "idempotência", `local_id`, duplicata no sync → `docs/BACKLOG.md` (Idempotência via local_id)
- "erros de sync", `/admin/erros-sync`, `logs_sync_errors` → `docs/BACKLOG.md` (Tela de auditoria de erros de sync)
- "CATEGORIA_NOT_IN_LOTE", trigger de desconto de cabeças, `update_quant_atual_*` → `docs/BACKLOG.md` (Validação de categoria em triggers)
- "syncError", "REENVIAR", retries automáticos, `processQueue` catch → `docs/BACKLOG.md` (Log de erro visível + eliminação de retries)
- "RLS", "policy qual=true", "auditoria", S1-S11, N1-N30, R1-R24, C1-C14 → `docs/BACKLOG.md` (Auditoria de código)
