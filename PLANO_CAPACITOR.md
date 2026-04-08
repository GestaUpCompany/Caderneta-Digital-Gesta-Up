# Plano de Implementação Capacitor - Cadernetas Digitais

## Objetivo
Transformar o PWA atual em aplicativos nativos para Android (APK/AAB) e iOS (IPA) usando Capacitor, permitindo distribuição direta e/ou publicação nas stores.

## Visão Geral
- **Mantenção do código atual**: 95% do código React permanece inalterado
- **Distribuição flexível**: APK direto, Play Store, App Store
- **Custo mínimo**: Zero para distribuição direta, $25 Play Store (opcional)
- **Experiência nativa**: Splash screens, ícones, performance aprimorada

---

## FASE 1: Setup Inicial do Capacitor

### 1.1 Instalação das Dependências
```bash
# No diretório frontend/
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npm install @capacitor/app @capacitor/haptics
npm install @capacitor/network @capacitor/preferences
npm install @capacitor/splash-screen
```

### 1.2 Inicialização do Projeto
```bash
# No diretório frontend/
npx cap init "Cadernetas Digitais" "com.gestaup.cadernetas"
```

### 1.3 Configuração Principal
- Criar `frontend/capacitor.config.ts`
- Configurar URL do servidor (backend Vercel)
- Definir nome do app e package name
- Configurar permissões necessárias

### 1.4 Adicionar Plataformas
```bash
npx cap add android
npx cap add ios  # Opcional, requer macOS
```

---

## FASE 2: Configuração Visual e Branding

### 2.1 Ícones do Aplicativo
- **Tamanhos necessários**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- **Fonte**: Usar `logo-gestaup-app-cadernetadigital.png`
- **Ferramenta**: `@capacitor/assets` para gerar automaticamente
- **Destino**: `frontend/resources/icon/`

### 2.2 Splash Screens
- **Tamanhos**: Android (various), iOS (various)
- **Design**: Logo centralizado com fundo temático (#1a3a2a)
- **Configuração**: Tempo de exibição, animação
- **Destino**: `frontend/resources/splash/`

### 2.3 Configurações de App
- **Nome**: "Cadernetas Digitais"
- **Package Name**: `com.gestaup.cadernetas`
- **Versão**: 1.0.0
- **Cores**: Tema verde (#1a3a2a), branco, preto

---

## FASE 3: Integração com Código Existente

### 3.1 Detecção de Plataforma
```typescript
import { Capacitor } from '@capacitor/core';

// Verificar se está rodando como app nativo
const isNative = Capacitor.isNativePlatform();
const isAndroid = Capacitor.getPlatform() === 'android';
const isIOS = Capacitor.getPlatform() === 'ios';
```

### 3.2 Plugins Necessários
- **@capacitor/network**: Detectar status de conexão
- **@capacitor/preferences**: Storage local (substituir localStorage)
- **@capacitor/haptics**: Feedback tátil em ações importantes
- **@capacitor/splash-screen**: Controle da splash screen
- **@capacitor/app**: Eventos de ciclo de vida do app

### 3.3 Ajustes Comportamentais
- **Back button Android**: Implementar navegação correta
- **Status bar**: Configurar cores e visibilidade
- **Safe areas**: Ajustar layout para notches e barras
- **Deep linking**: Configurar links diretos para cadernetas

### 3.4 Migração de Storage
```typescript
// Substituir localStorage por Preferences
import { Preferences } from '@capacitor/preferences';

// Antes: localStorage.setItem('key', 'value')
// Depois: await Preferences.set({ key: 'key', value: 'value' });
```

---

## FASE 4: Build e Testes

### 4.1 Build do Aplicativo
```bash
# Build do web app
npm run build

# Sincronizar com plataformas
npx cap sync android
npx cap sync ios  # Opcional
```

### 4.2 Android Studio Setup
- **Requisitos**: Android Studio, Java JDK 17
- **Abrir projeto**: `frontend/android/` no Android Studio
- **Configurar**: SDK target, Gradle settings
- **Testar**: Emulador ou dispositivo físico

### 4.3 Geração de APK/AAB
```bash
# Debug APK (para testes)
npx cap run android

# Release APK/AAB (para distribuição)
# Via Android Studio: Build > Generate Signed Bundle / APK
```

### 4.4 Testes Essenciais
- **Funcionalidades básicas**: Todas as cadernetas funcionando
- **Sincronização**: Google Sheets integration
- **Offline**: Funcionamento sem internet
- **Performance**: Tempo de carregamento e responsividade
- **UI/UX**: Layout em diferentes tamanhos de tela

---

## FASE 5: Distribuição

### 5.1 Distribuição Direta (APK)
- **Vantagens**: Zero custo, controle total, imediata
- **Processo**: Gerar APK assinado, distribuir via WhatsApp/email
- **Instruções**: Usuário precisa permitir "Fontes desconhecidas"
- **Atualizações**: Notificar usuários sobre novas versões

### 5.2 Play Store (Opcional)
- **Custo**: $25 (única vez)
- **Requisitos**: Conta desenvolvedor Google Play
- **Processo**: 
  1. Criar conta desenvolvedor
  2. Preparar screenshots e descrição
  3. Submeter AAB para revisão
  4. Aguardar aprovação (2-7 dias)
- **Benefícios**: Descoberta, confiança, atualizações automáticas

### 5.3 App Store (Opcional)
- **Custo**: $99/ano
- **Requisitos**: macOS, Xcode, conta desenvolvedor Apple
- **Processo**: Similar ao Android, mas mais rigoroso
- **Consideração**: Apenas se tiver mercado iOS significativo

---

## FASE 6: Manutenção e Atualizações

### 6.1 Ciclo de Atualização
1. **Desenvolvimento**: Alterações no código React
2. **Build**: `npm run build && npx cap sync`
3. **Teste**: Verificar funcionalidades
4. **Distribuição**: Gerar novo APK/AAB
5. **Publicação**: Enviar para usuários ou stores

### 6.2 Versionamento
- **SemVer**: Major.Minor.Patch (ex: 1.0.0, 1.0.1, 1.1.0)
- **Changelog**: Manter registro de mudanças
- **Compatibilidade**: Testar versões antigas do Android/iOS

### 6.3 Monitoramento
- **Crash reports**: Implementar coleta de erros
- **Analytics**: Uso das funcionalidades
- **Feedback**: Canal para sugestões e bugs

---

## Cronograma Estimado

| Fase | Duração | Dependências |
|------|---------|--------------|
| FASE 1 - Setup | 1-2 dias | Node.js, Android Studio |
| FASE 2 - Branding | 1 dia | Logo e design definidos |
| FASE 3 - Integração | 2-3 dias | Testes em dispositivo |
| FASE 4 - Build | 1-2 dias | Ambiente configurado |
| FASE 5 - Distribuição | 1-3 dias | APK pronto |
| FASE 6 - Manutenção | Contínuo | App publicado |

**Total estimado**: 6-11 dias para APK distribuído

---

## Recursos Necessários

### Hardware
- **PC/Mac** para desenvolvimento
- **Dispositivo Android** para testes (recomendado)
- **PC com 8GB+ RAM** para Android Studio

### Software
- **Node.js 18+** (já possui)
- **Android Studio** (gratuito)
- **Java JDK 17** (gratuito)
- **Git** (já possui)

### Contas
- **Google Play Console** ($25 - opcional)
- **Apple Developer** ($99/ano - opcional)

---

## Riscos e Mitigações

### Riscos Técnicos
- **Performance**: PWA pode ser mais lento que nativo
  - *Mitigação*: Otimizar imagens, lazy loading, cache
- **Compatibilidade**: Versões antigas do Android
  - *Mitigação*: Definir minimum SDK 21 (Android 5.0)
- **Permissões**: Rejeição de permissões necessárias
  - *Mitigação*: Solicitar apenas quando necessário

### Riscos de Negócio
- **Adoção**: Usuários podem preferir PWA
  - *Mitigação*: Manter PWA funcionando, oferecer APK como alternativa
- **Manutenção**: Overhead de manter duas versões
  - *Mitigação*: Automatizar build, usar mesmo código base

---

## Decisões e Próximos Passos

### Para Começar Imediatamente
1. **Instalar dependências Capacitor**
2. **Configurar projeto básico**
3. **Gerar ícones e splash**
4. **Build primeiro APK de teste**

### Decisões a Tomar
- **Distribuição**: APK direto vs Play Store?
- **iOS**: Vale a pena desenvolver para iOS?
- **Monetização**: Será app pago ou gratuito?
- **Frequência**: Cada quanto tempo atualizar?

---

## Contato e Suporte

- **Documentação Capacitor**: https://capacitorjs.com/docs
- **Community**: Discord oficial Capacitor
- **Issues**: GitHub do projeto
- **Testing**: Dispositivos físicos recomendados

---

**Status**: Planejamento completo, pronto para execução
**Próxima ação**: Iniciar FASE 1 - Setup Inicial
**Responsável**: Victor Hugo Gesta Up
