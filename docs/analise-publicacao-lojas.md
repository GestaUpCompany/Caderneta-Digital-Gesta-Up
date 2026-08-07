# Análise de publicação nas lojas (Play Store + Apple App Store)

Data: 07/08/2026
Autor: análise técnica automatizada
Base: estado do repo em 07/08/2026 (commit atual)

## Arquitetura atual

PWA React 18 + Vite, offline-first, com persistência em IndexedDB (biblioteca `idb`) e sincronização para Supabase. Estado global via Redux Toolkit + redux-persist, UI em Tailwind, Service Worker customizado (Workbox `injectManifest`) para cache de assets estáticos e Web Push (VAPID) para notificações. Backend Express separado para integração com Google Sheets, deployado na Vercel, sem middleware de autenticação (débito S9 no AGENTS.md).

Capacitor já integrado e ambos os projetos nativos já scaffoldados:
- `@capacitor/android` e `@capacitor/ios` no `frontend/package.json`
- Pastas `frontend/android` e `frontend/ios` com `MainActivity.java` e `AppDelegate.swift` prontos
- `frontend/capacitor.config.ts` define `appId: com.gestaup.cadernetas`

Nenhum plugin Capacitor é efetivamente chamado no `src` (grep por `capacitor|Capacitor` em `src` retorna zero hits). O app roda 100% sobre APIs web puras dentro do WebView.

## É possível manter o mesmo código nas duas plataformas?

Sim. Capacitor encapsula o mesmo bundle web (`dist/`) em um WebView nativo em cada plataforma, então lógica de negócio, componentes React, IndexedDB e sync com Supabase são idênticos. Existem três pontos de divergência que exigem código condicional, e é onde a complexidade do iOS cresce em relação ao Android.

### Divergência 1: `base` path do Vite (afeta Android e iOS igualmente)

- `vite.config.ts` tem `base: '/Caderneta-Digital-Gesta-Up/'`
- `BrowserRouter` tem `basename="/Caderneta-Digital-Gesta-Up"` (App.tsx:464)
- `serviceWorkerRegistration.ts` registra o SW em `/Caderneta-Digital-Gesta-Up/sw.js`

Configurado para deploy no GitHub Pages. Capacitor serve os assets de `https://localhost` (Android) ou `capacitor://localhost` (iOS), sem subpath, então com o `base` atual o app nativo quebra na primeira tela: assets 404, rotas não resolvem.

Correção: tornar o `base` condicional via env (`VITE_NATIVE_BUILD=true` vira `./`) e fazer o mesmo no `basename` e no registro do SW. Ajuste de algumas horas, vale para as duas plataformas.

### Divergência 2: Service Worker no iOS (só iOS)

Capacitor iOS usa o scheme customizado `capacitor://`, e Service Workers exigem `https` para registrar. Consequência: o `sw.ts` inteiro (precache, NetworkFirst, push handler) não funciona no iOS dentro do Capacitor. No Android funciona porque `androidScheme: 'https'` está setado no config.

Não derruba o app: assets estáticos já vêm empacotados no bundle nativo (não precisam de cache de SW) e IndexedDB funciona normalmente no WKWebView, então o offline-first de dados persiste. Precisa cercar `serviceWorkerRegistration.ts` e o hook `useServiceWorkerUpdate` com detecção de plataforma (`Capacitor.getPlatform() === 'ios'` pula o registro) para evitar erros silenciosos e o modal de "Atualizando app..." travar em estado inválido. No Android o SW pode continuar funcionando ou ser desativado também, já que é redundante dentro do Capacitor.

### Divergência 3: Web Push no iOS (só iOS, é o ponto mais caro)

`pushNotificationService.ts` usa a Web Push API nativa do navegador (`PushManager.subscribe`, `Notification.requestPermission`, VAPID). No Android dentro do WebView funciona. No iOS a Web Push só está disponível para PWAs instalados via "Adicionar à Tela de Início" (iOS 16.4+), não dentro de um WKWebView encapsulado por Capacitor.

Notificações push no iOS exigem trocar a implementação por um plugin nativo, tipicamente `@capacitor/push-notifications` + Firebase Cloud Messaging (que entrega para APNs no iOS). Implica:

- Adicionar FCM no projeto, configurar o projeto iOS com APNs key no Firebase
- Reescrever `pushNotificationService.ts` com branch por plataforma: web usa VAPID, nativo usa o plugin Capacitor
- A tabela `registrar_push_subscription` no Supabase recebe endpoints diferentes (FCM token vs endpoint Web Push), então o backend de envio de push precisa tratar os dois formatos

Único ponto em que o código de fato se bifurca de forma não trivial. Se push não for requisito para o MVP na loja, dá para publicar sem push no iOS e tratar depois.

## Esforço para publicar

### Play Store (Android)

| Item | Esforço |
|---|---|
| Corrigir `base` path condicional | 2-4h |
| Gerar keystore de release e configurar `signingConfigs` no `build.gradle` | 1-2h |
| `npx cap sync android` + `npx cap open android` + build assinado no Android Studio | 1h |
| Ícones e splash em todas as densidades (já existem, validar 512x512 para Play) | 1h |
| Cadastro de conta Google Play Console ($25 único), criar app, preencher ficha, política de privacidade, classificação de conteúdo | 4-8h de trabalho + até 3 dias de revisão |
| Teste em dispositivo físico | 2h |

Android é o caminho mais curto porque o scheme `https` já compatibiliza o SW e a Web Push funciona no WebView. Conta de desenvolvedor é barata e a revisão costuma ser mais leve que a da Apple.

### Apple App Store (iOS)

| Item | Esforço |
|---|---|
| Tudo do Android (base path, ícones, splash) | compartilhado |
| Cercar SW e `useServiceWorkerUpdate` com detecção de plataforma | 2-3h |
| Decidir sobre push: desativar no iOS ou migrar para `@capacitor/push-notifications` + FCM/APNs | 0h (desativar) ou 1-2 dias (migrar) |
| Exigir Mac físico + Xcode para build e upload | bloqueador se não houver Mac |
| Conta Apple Developer Program ($99/ano), App Store Connect, App ID, provisioning profiles, certificados de distribuição | 4-8h na primeira vez |
| Configurar `Info.plist`: permissões, `NSAppTransportSecurity` se o backend Express não tiver TLS válido, ícone 1024x1024, launch screen | 2h |
| Preencher ficha da App Store, screenshots por tamanho de tela, política de privacidade, TestFlight | 4-8h + até 7 dias de revisão |
| Teste em dispositivo físico iOS | 2h |

Apple é significativamente mais cara em tempo de setup na primeira vez, exige hardware Mac, e a revisão é mais rigorosa. Pontos que costumam derrubar apps de campo na revisão: tela em branco se o SW falhar (daí a importância da divergência 2), falta de política de privacidade, uso de login sem "Sign in with Apple" se oferecer login social (não é o caso, usa Supabase Auth com email/senha, então passa), e requisitos de permissão justificada. O app só pede `INTERNET` no AndroidManifest, o que é bom.

### Riscos do código atual que pesam na revisão

A auditoria do AGENTS.md lista 87 falhas. As que mais importam para aprovação nas lojas são as de runtime (R1-R24) que podem causar telas brancas ou crashes, porque a Apple rejeita apps instáveis e o Android auto-relata crashes. As falhas de RLS (S1-S8) são problemas de segurança backend, não bloqueiam publicação, mas viram risco reputacional se houver vazamento depois. Recomenda-se rodar um ciclo de QA em dispositivo físico real (não só emulador) antes de submeter, focando nos fluxos offline: criar registro sem rede, sincronizar com rede instável, matar e reabrir o app.

## Recomendação

Manter o código único via Capacitor: a arquitetura já está montada para isso e 95% do código é compartilhado. Ir em duas fases.

**Fase 1**: publicar primeiro na Play Store, porque o esforço é menor, o SW e o Web Push funcionam no WebView Android, e valida o fluxo de build/release e a ficha de loja com atrito baixo.

**Fase 2**: atacar o iOS depois, com o `base` path já corrigido na fase 1; decidir entre publicar sem push no iOS (mais rápido) ou migrar para `@capacitor/push-notifications` com FCM (mais correto, ~2 dias a mais). O bloqueador prático para o iOS não é código, é precisar de um Mac e da conta Apple de $99/ano; se já houver acesso a Mac, o iOS é questão de uma a duas semanas de trabalho incluindo revisão, se não, o Android sai primeiro sem depender disso.

## Pré-requisitos comuns às duas lojas (checklist)

- [ ] Tornar `base` do Vite condicional via env (`VITE_NATIVE_BUILD`)
- [ ] Tornar `basename` do BrowserRouter condicional
- [ ] Tornar registro do SW condicional (ou desativar no nativo)
- [ ] `npx cap sync` após cada build
- [ ] Política de privacidade hospedada em URL pública
- [ ] Ícone 512x512 (Play) e 1024x1024 (App Store)
- [ ] Screenshots por tamanho de tela
- [ ] Teste em dispositivo físico: fluxo offline, sync instável, reload

## Referências no código

- `frontend/vite.config.ts:7` — `base: '/Caderneta-Digital-Gesta-Up/'`
- `frontend/src/App.tsx:464` — `<Router basename="/Caderneta-Digital-Gesta-Up">`
- `frontend/src/serviceWorkerRegistration.ts:6` — registro do SW com path fixo
- `frontend/src/sw.ts` — Service Worker customizado (Workbox injectManifest)
- `frontend/capacitor.config.ts` — config do Capacitor, `appId: com.gestaup.cadernetas`
- `frontend/src/services/pushNotificationService.ts` — Web Push via VAPID, não funciona no iOS dentro do Capacitor
- `frontend/android/app/src/main/AndroidManifest.xml` — só pede `INTERNET`
- `frontend/ios/App/App/Info.plist` — sem permissões extras configuradas
- `frontend/ios/App/App/AppDelegate.swift` — boilerplate Capacitor padrão
