# Cadernetas Digitais - Gesta'Up

Aplicativo PWA offline-first para peões de fazenda registrarem dados de produção no campo (sem sinal) e sincronizarem com Supabase quando voltam à rede. Compartilha o mesmo banco Supabase com o Painel Web de gestão/admin (repo `GestaUp-Cadernetas-Gestao`).

## Arquitetura

O PWA é a ponta de campo. Toda escrita vai primeiro ao IndexedDB (`cadernetas-digitais`, v22) com `syncStatus = 'pending'` e é enfileirada na store `syncQueue`. O hook `useSync` drena a fila a cada 30s chamando `syncToSupabase` por item, que faz INSERT ou UPDATE conforme a operação e o `supabaseId` já gravado. Falhas são logadas em `logs_sync_errors` no Supabase para auditoria no Painel Web.

A autenticação é por **peão da fazenda**, não por pessoa: o usuário digita o `acesso_id` da fazenda, o app busca o peão em `peoes` (email `peao.<acesso_id>@gestaup.internal`) e faz `signInWithPassword` no Supabase Auth. O token JWT vai ao `localStorage`. A RLS do banco verifica `usuarios.auth_id = auth.uid()` com `usuario_fazenda.ativo = true`, então o vínculo do peão nessas duas tabelas é obrigatório para ler cadastros protegidos (pastos, lotes, categorias, raças, etc.).

## Deploy

### Frontend (PWA)
- **GitHub Pages**: deploy automático via GitHub Actions em push para `master` (`.github/workflows/deploy.yml`)
- **URL**: https://gestaupcompany.github.io/Caderneta-Digital-Gesta-Up/
- **Instalável** como PWA via banner do navegador, e empacotado com Capacitor 8 para Android/iOS (`appId: com.gestaup.cadernetas`)

### Backend (legado)
- Node.js + Express na Vercel (serverless), usado apenas para auth/version legacy
- O fluxo principal de sync é direto PWA ↔ Supabase; o backend não participa do caminho de dados de cadernetas

## Setup local

### Pré-requisitos
- Node.js 18+
- npm

### Frontend (PWA)
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc && vite build -> dist/
npm run typecheck    # npx tsc --noEmit
```

Variáveis de ambiente (`.env` na pasta `frontend`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (projeto `nrwljcvhwbezmoummxbl`)
- `VITE_BACKEND_URL` (opcional, só para endpoints legacy)

### Backend (opcional)
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Mobile (Capacitor)
```bash
cd frontend
npm run build
npx cap sync
npx cap open android   # ou ios
```

## Cadernetas disponíveis

20 cadernetas em produção, agrupadas em 5 módulos (definidas em `frontend/src/utils/constants.ts`):

**Gado & Pastagens**
1. Maternidade — nascimentos
2. Rodeio Gado — controle geral do rebinho
3. Movimentação — transferência entre lotes
4. Enfermaria — animais doentes/tratados
5. Morte — óbitos
6. Manejo Pastagens — rotação de pastos

**Nutrição**
7. Suplementação — alimentação suplementar
8. Bebedouros — controle de água
9. Leitura de Cocho — leitura de cocho
10. Trato Confinamento — oferta de trato

**Máquinas & Combustível**
11. Operações de Máquinas
12. Manutenção de Máquinas
13. Abastecimento

**Insumos & Estoque**
14. Almoxarifado
15. Entrada de Insumos
16. Produção Fábrica (Saída Insumos)

**Infraestrutura & Geral**
17. Clima
18. Alimentação (Cantina)
19. Limpeza
20. Problemas

Cada caderneta tem um par `*Page` (formulário) + `*ListaPage` (listagem), lazy-loaded em `App.tsx`. O mapeamento store ↔ tabela Supabase está em `syncService.ts` (`CADERNETA_TO_SUPABASE_TABLE`), e a conversão campo-a-campo em `registroToSupabase`.

## Estrutura do projeto

```
Caderneta-Digital-Gesta-Up/
  frontend/                # PWA React + Vite
    src/
      pages/               # Telas (Home, Configuracoes, cadernetas/, estoque-insumos/)
      components/          # UI (cards, modais, SyncStatusBar, LoteDetalhesCard, etc.)
      services/            # syncService, indexedDB, supabaseService, authService, cadastroCache
      hooks/               # useSync, useConflicts, useFarmStatus, useFormValidation, etc.
      store/               # Redux Toolkit + redux-persist (config, sync)
      types/               # cadernetas.ts, supabase.ts
      utils/               # constants, validation, formatDate, metrics, deviceId, auditContext
    capacitor.config.ts    # Android/iOS
    vite.config.ts         # VitePWA (injectManifest, sw.ts custom)
  backend/                 # Express legacy (auth/version)
  supabase/
    functions/             # Edge Functions (login-peao, lembrete-tratos-diario)
  .github/workflows/       # deploy.yml (GitHub Pages)
  AGENTS.md                # Documentação técnica e débitos (autoritativo)
```

## Tecnologias

- **Frontend**: React 18, TypeScript, TailwindCSS, Vite 5, Redux Toolkit + redux-persist, React Router 6, Headless UI, lucide-react, idb (IndexedDB), jspdf
- **PWA**: vite-plugin-pwa com `injectManifest` (Service Worker custom em `src/sw.ts`), Workbox
- **Mobile**: Capacitor 8 (Android, iOS, Network, Preferences, SplashScreen)
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage + Edge Functions), Node.js/Express legacy na Vercel
- **Deploy**: GitHub Pages (PWA), Vercel (backend legacy)

## Documentação técnica

O `AGENTS.md` na raiz é o documento autoritativo sobre débitos técnicos, auditoria de código (87 falhas em 4 frentes), matriz de impacto cruzado PWA ↔ Painel Web e ordem recomendada de aplicação de correções. Consulte-o antes de mudar RLS, schema de tabelas compartilhadas ou o fluxo de sync.
