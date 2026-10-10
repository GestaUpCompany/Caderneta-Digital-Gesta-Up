# CLAUDE.md — Caderneta Digital Gesta-Up

PWA offline-first (React 18 + TypeScript + Vite + Capacitor 8) para peões de fazenda registrarem dados de produção no campo sem sinal. Toda escrita vai ao IndexedDB com `syncStatus = 'pending'`, é enfileirada na `syncQueue` e drenada pelo hook `useSync` para o Supabase. Compartilha o mesmo banco (projeto `nrwljcvhwbezmoummxbl`) com o Painel Web de gestão, repo separado em `C:\Users\USER\Documents\GestaUp-Cadernetas-Gestao`.

@AGENTS.md

## Comandos

- Dev PWA: `cd frontend && npm run dev` (http://localhost:5173)
- Build PWA: `cd frontend && npm run build` (roda `tsc && vite build`, já inclui typecheck)
- Typecheck isolado: `cd frontend && npx tsc --noEmit`
- Scaffold de caderneta nova: `cd scripts && npm run create-caderneta` (gera `*Page` + `*ListaPage` + registro em `constants.ts`)
- Mobile: `cd frontend && npm run build && npx cap sync && npx cap open android`

## Pontos críticos

- **Fazenda de testes obrigatória**: `d649c65e-16ab-4b77-a84b-df937aa41cc3` ("Fazenda Gesta'Up"). Nunca testar em dados de fazendas reais.
- **Migrations estruturais NÃO vivem neste repo**. CREATE/ALTER TABLE, triggers, policies e functions são escritos no repo do Painel Web e aplicados lá com `supabase db push`. Aqui só se consome o resultado via `syncService.ts`. Migrations pontuais (dados operacionais) são aplicadas direto via MCP, sem arquivo. A pasta `supabase/migrations/` neste repo é histórica; não crie arquivos novos nela.
- **Commits**: mensagem em texto direto `-m "mensagem"`, sem heredoc. Deploy do PWA é automático no push para `master` via GitHub Pages.
- **Env**: `frontend/.env` precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- **Auth é por peão de fazenda** (email `peao.<acesso_id>@gestaup.internal`), não por pessoa. O vínculo em `usuarios` + `usuario_fazenda` é o que libera leitura via RLS.

## Convenções que não podem ser quebradas

- **Registros de caderneta nunca escrevem direto no Supabase.** O caminho obrigatório é `useSalvarRegistro(cadernetaId)` → IndexedDB (`syncStatus = 'pending'`) → `syncQueue` → `useSync`/`syncService`. Isso vale também para edição, que entra na fila como operação `update` (a fila só conhece `create`/`update`; não existe propagação de delete local para o Supabase). Um `supabase.from().insert()` em página de caderneta quebra o offline-first.
- **Cadastros de apoio** (pastos, lotes, categorias, raças, máquinas) são lidos do cache local via `cadastroCache.ts`/`useCadastroOptions.ts`, que se atualiza do Supabase quando online. As funções `create*/update*/delete*` de `supabaseService.ts` são exceções legadas para cadastros, não precedente para registros.
- **IndexedDB** (`cadernetas-digitais`) está na **versão 32**. Qualquer mudança de object store ou índice exige bump da versão e lógica no callback `upgrade` em `indexedDB.ts`, pois usuários em campo carregam dados antigos.
- **Service Worker é custom** (`frontend/src/sw.ts` via `injectManifest`), não gerado. Mudanças em caching precisam considerar que o peão depende do app funcionando 100% offline.
- **Lint e testes**: `cd frontend && npm run lint` (ESLint 8, 0 erros; `--max-warnings` é um teto, só pode diminuir) e `npm run test` (vitest, só funções puras por ora). Verificação padrão antes de entregar: `npx tsc --noEmit`, `npm run lint`, `npm run test` e `npm run build`.
- **`backend/` é legado** (Express na Vercel, só auth/version). Não está no caminho de dados das cadernetas; evite mexer sem motivo explícito.
- **Idioma**: código, UI e comentários em pt-BR.
- **Análise de impacto (dependency-cruiser)**: antes de alterar, remover ou renomear módulo, função exportada, hook, tipo ou contrato compartilhado, e sempre que for preciso saber o impacto real de uma mudança, rodar o grafo em foco no arquivo, dentro de `frontend`: `C:/Users/USER/Documents/GestaUp-Cadernetas-Gestao/node_modules/.bin/depcruise --no-config --exclude node_modules --focus "<regex do arquivo>" --output-type mermaid src` (use `--output-type json` para listar os dependentes). A ferramenta não está instalada neste repo; use o binário do monorepo do Painel ou instale como devDependency (peça o ok do usuário). Não use `npx depcruise` sem `--no-install`: ele resolve outro pacote (`depcruise@1.0.0`). O grafo é por módulo e não enxerga SQL, RPC, triggers, tabelas do Supabase nem `sw.ts` (sem importadores); arquivos centrais como `cadastroCache.ts` e `supabaseService.ts` têm dezenas de dependentes, então complemente com `Grep` pelo nome da função e com a seção "Impacto cruzado" abaixo.

## Impacto cruzado com o Painel Web (`../GestaUp-Cadernetas-Gestao`)

O banco é compartilhado; mudanças lá quebram aqui sem erro de compilação:

- **Schema ou coluna alterada no Painel** → conferir `frontend/src/types/supabase.ts` (tipos gerados, cópia local), `services/syncService.ts` (`CADERNETA_TO_SUPABASE_TABLE` e `registroToSupabase`) e `services/cadastroCache.ts`.
- **RLS/policy alterada** → o peão lê via `auth.uid()` + vínculo em `usuarios`/`usuario_fazenda`. Uma policy errada se manifesta como selects vazios no campo, sem erro visível.
- **Trigger em tabela de registro** → o PWA grava offline e sincroniza depois, então triggers que assumem ordem ou tempo real podem falhar em sync atrasado.
- **Novos campos de caderneta** → precisam de store IndexedDB (bump de versão), entrada na `syncQueue`, mapeamento no `syncService` e, em geral, tela de visualização no Painel.

## Onde procurar o quê

- Adicionar caderneta: par `*Page` + `*ListaPage` em `frontend/src/pages/cadernetas/`, entrada em `utils/constants.ts`, mapeamento de tabela em `services/syncService.ts` (`CADERNETA_TO_SUPABASE_TABLE` + `registroToSupabase`).
- Sync offline: `frontend/src/services/indexedDB.ts`, `syncService.ts`, `hooks/useSync.ts`, store `syncQueue`.
- Cadastros compartilhados (pastos, lotes, categorias, raças): `services/cadastroCache.ts` + `services/supabaseService.ts`.
- Edge Functions (`login-peao`, `lembrete-tratos-diario`): `supabase/functions/`, deploy via `supabase functions deploy`.
- Decisões de arquitetura já tomadas e débitos pendentes: `docs/HISTORICO.md` e `docs/BACKLOG.md` (consultar sob demanda, ver disparadores no AGENTS.md).
