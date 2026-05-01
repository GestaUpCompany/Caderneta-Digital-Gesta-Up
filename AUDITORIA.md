# Auditoria do App - Problemas e Soluções com Dependências

## Segurança (Alta Prioridade)

**Problema:** URLs do Google Sheets expostas no código (DATABASE_URL, DEVICE_SHEET_URL em constants.ts)  
**Solução:** Mover URLs sensíveis para variáveis de ambiente (.env)  
**Depende de:** Nada  
**Pré-requisito para:** Backend URL, Autenticação/autorização  
**Sprint:** 1  
**Status:** ✅ CONCLUÍDO  
**Impacto no Sistema:** Reduz risco de exposição de dados sensíveis em repositórios públicos. Permite configuração diferente por ambiente (dev/staging/prod). Melhora segurança geral da aplicação.

**Problema:** Backend URL em ambiente de desenvolvimento com fallback para localhost  
**Solução:** Remover fallback de localhost em produção, usar apenas variáveis de ambiente  
**Depende de:** Variáveis de ambiente  
**Pré-requisito para:** Autenticação/autorização, Validação no backend  
**Sprint:** 1  
**Status:** ✅ CONCLUÍDO  
**Impacto no Sistema:** Evita que app em produção tente conectar a localhost incorretamente. Garante que configurações de API estejam sempre corretas por ambiente. Reduz erros de conexão em produção.

**Problema:** Ausência de validação de entrada no backend  
**Solução:** Adicionar sanitização de dados antes de enviar para API e implementar validação no backend  
**Depende de:** Backend URL configurado  
**Pré-requisito para:** Nada  
**Sprint:** 2  
**Impacto no Sistema:** Previne injeção de dados maliciosos. Garante integridade dos dados nas planilhas Google Sheets. Reduz risco de corrupção de dados. Melhora confiabilidade do sistema.

**Problema:** Não há autenticação/autorização nas chamadas de API  
**Solução:** Implementar autenticação/autorização nas chamadas de API  
**Depende de:** Backend URL, Variáveis de ambiente  
**Pré-requisito para:** Nada  
**Sprint:** 1  
**Impacto no Sistema:** Impede acesso não autorizado às APIs e planilhas. Permite controle de acesso por usuário/fazenda. Protege dados sensíveis de acessos indevidos. Requer autenticação para todas as operações de sync.

---

## Código Duplicado (Média Prioridade)

**Problema:** Validação de categorias repetida em múltiplas páginas (validatePastagens, validateRodeio, validateSuplementacao, validateMovimentacao)  
**Solução:** Criar função helper validateCategorias para reutilização  
**Depende de:** Nada  
**Pré-requisito para:** Hook useCadernetaForm  
**Sprint:** 2  
**Status:** ✅ CONCLUÍDO  
**Impacto no Sistema:** Reduz duplicação de código. Facilita manutenção de validações de categorias. Garante consistência de validação entre diferentes cadernetas. Diminui tamanho do código em ~100 linhas.

**Problema:** Padrão de estado em páginas de cadernetas (form, errors, salvando, showSuccessModal) é repetido  
**Solução:** Criar hook customizado useCadernetaForm para encapsular lógica comum de formulários  
**Depende de:** Helper validateCategorias  
**Pré-requisito para:** Componente wrapper de cadernetas  
**Sprint:** 2  
**Status:** ✅ CONCLUÍDO  
**Impacto no Sistema:** Reduz significativamente código duplicado (~500 linhas). Padroniza comportamento de formulários em todas as cadernetas. Facilita adição de novas cadernetas. Melhora manutenibilidade e testabilidade.

**Problema:** Mapeamento de colunas em syncService.ts tem funções repetitivas para cada caderneta  
**Solução:** Transformar CADERNETA_COLUMNS em configuração baseada em dados  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 4  
**Status:** ✅ CONCLUÍDO  
**Impacto no Sistema:** Reduz complexidade do syncService. Facilita adicionar novas cadernetas sem modificar código. Permite configuração dinâmica de colunas. Diminui risco de bugs em mapeamento de dados.

**Problema:** Estrutura similar em todas as páginas de cadernetas  
**Solução:** Criar componente wrapper para páginas de cadernetas  
**Depende de:** Hook useCadernetaForm  
**Pré-requisito para:** Nada  
**Sprint:** 4  
**Status:** ✅ CONCLUÍDO  
**Impacto no Sistema:** Padroniza layout e comportamento de todas as cadernetas. Reduz código boilerplate (~300 linhas por página). Facilita mudanças globais em UI das cadernetas. Melhora consistência UX.

---

## Performance (Média Prioridade)

**Problema:** Excesso de requisições ao abrir app devido a loops individuais para pastos/lotes (N+M requisições)  
**Solução:** Criar endpoints batch que retornam pastos/lotes com detalhes em uma única requisição  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 4  
**Status:** ✅ CONCLUÍDO  
**Impacto no Sistema:** Reduz requisições ao abrir de 3+N+M para 3 (93% redução). Elimina erros 429 (rate limiting). Melhora tempo de carregamento de 3-30s para <5s. Suporta escala de 75 usuários simultâneos (25 fazendas x 3 usuários). Aumenta cache de 5 para 10 minutos para reduzir requisições adicionais. Implementado em backend (/pastos-completos, /lotes-completos) e frontend (cadastroCache.ts).

**Problema:** Delays artificiais em requisições (500ms, 200ms) para evitar rate limiting tornam o app mais lento  
**Solução:** Implementar retry com backoff exponencial em vez de delays fixos  
**Depende de:** Nada  
**Pré-requisito para:** Remover delays artificiais, Timeout em requisições  
**Sprint:** 3  
**Impacto no Sistema:** Melhora performance inicial do app (carregamento mais rápido). Reduz tempo de espera do usuário. Mantém proteção contra rate limiting de forma mais inteligente. Melhora UX geral.

**Problema:** Nenhuma memoização em componentes de lista  
**Solução:** Adicionar React.memo em componentes de lista  
**Depende de:** Nada  
**Pré-requisito para:** Virtualização  
**Sprint:** 3  
**Impacto no Sistema:** Reduz re-renders desnecessários em listas. Melhora performance ao navegar entre páginas. Diminui uso de CPU. Melhora responsividade da UI.

**Problema:** Listas grandes podem ter problemas de performance  
**Solução:** Implementar virtualização para listas grandes  
**Depende de:** Memoização em componentes  
**Pré-requisito para:** Nada  
**Sprint:** 7  
**Impacto no Sistema:** Permite renderizar listas com milhares de itens sem travar. Reduz uso de memória drasticamente. Melhora scroll suave em listas grandes. Habilita escalabilidade do app.

**Problema:** UX pode ser melhorada durante carregamento  
**Solução:** Adicionar loading skeleton  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 3  
**Impacto no Sistema:** Melhora percepção de performance do app. Reduz sensação de "carregamento lento". Fornece feedback visual ao usuário. Melhora UX durante carregamento de dados.

---

## Componentes UI (Média Prioridade)

**Problema:** Botão voltar do celular em modais causa perda de dados ao navegar para home  
**Solução:** Implementar interceptação do botão voltar em modais (popstate)  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 4  
**Status:** ✅ CONCLUÍDO  
**Impacto no Sistema:** Previne perda de dados ao usar botão voltar do celular em modais. Melhora UX em dispositivos móveis. Garante que modais fechem corretamente ao navegar para trás. Implementado em SuccessModal, PdfModal e SearchableModal.

**Problema:** Radio não tem suporte para ID e data-field  
**Solução:** Adicionar props id e dataField ao componente Radio  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 1  
**Impacto no Sistema:** Permite scrollToFirstError funcionar corretamente com campos Radio. Melhora acessibilidade e identificação de elementos. Facilita testes automatizados. Consolida padrão de componentes.

**Problema:** DatePicker não tem prop name  
**Solução:** Adicionar prop name ao componente DatePicker  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 1  
**Impacto no Sistema:** Melhora integração com formulários e validação. Facilita identificação do elemento em testes. Consolida padrão de componentes. Melhora compatibilidade com scrollToFirstError.

**Problema:** Button tem character encoding issue (â) no loading spinner  
**Solução:** Corrigir character encoding no loading spinner do Button  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 1  
**Impacto no Sistema:** Corrige visualização incorreta do loading spinner. Melhora profissionalismo da UI. Remove bug visual perceptível. Melhora UX durante estados de carregamento.

**Problema:** Alguns componentes não têm aria-label  
**Solução:** Adicionar aria-label em todos os componentes interativos  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 6  
**Impacto no Sistema:** Melhora acessibilidade para leitores de tela. Permite navegação por teclado mais eficiente. Aumenta conformidade com WCAG. Melhora UX para usuários com deficiência visual.

---

## Validação e Erros (Alta Prioridade)

**Problema:** Não há validação no backend  
**Solução:** Implementar validação também no backend  
**Depende de:** Backend URL configurado  
**Pré-requisito para:** Nada  
**Sprint:** 2  
**Impacto no Sistema:** Adiciona camada extra de segurança. Previne dados corrompidos chegarem às planilhas. Garante integridade dos dados mesmo se validação frontend for bypassada. Melhora confiabilidade do sistema.

**Problema:** Mensagens de erro estão hardcoded em português  
**Solução:** Extrair mensagens de erro para arquivo de configuração  
**Depende de:** Nada  
**Pré-requisito para:** i18n  
**Sprint:** 2  
**Impacto no Sistema:** Facilita manutenção de mensagens de erro. Prepara código para internacionalização. Centraliza textos do app. Reduz duplicação de strings no código.

**Problema:** Não há suporte para i18n  
**Solução:** Considerar implementar i18n para suporte multilíngue  
**Depende de:** Mensagens de erro extraídas  
**Pré-requisito para:** Nada  
**Sprint:** 7  
**Impacto no Sistema:** Permite expansão para outros mercados. Facilita uso por fazendas em outros países. Melhora escalabilidade do produto. Aumenta valor comercial do app.

**Problema:** Não há logging de erros para debugging  
**Solução:** Adicionar logging de erros para debugging  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 2  
**Impacto no Sistema:** Facilita identificação e correção de bugs. Permite monitoramento de erros em produção. Melhora suporte técnico. Reduz tempo de debugging.

---

## Estado Global (Média Prioridade)

**Problema:** Redux pode ser desnecessário para o uso atual  
**Solução:** Considerar migrar para Zustand (mais simples) se Redux não for necessário  
**Depende de:** Nada  
**Pré-requisito para:** Estado do cache, Hooks (useSync)  
**Sprint:** 5 (Opcional)  
**Impacto no Sistema:** Reduz complexidade do código (~500 linhas). Diminui bundle size (~50KB). Simplifica gerenciamento de estado. Facilita onboarding de novos desenvolvedores.

**Problema:** Redux DevTools está sempre ativo  
**Solução:** Adicionar Redux DevTools apenas em desenvolvimento  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 5  
**Impacto no Sistema:** Reduz bundle size em produção (~30KB). Melhora performance em produção. Remove ferramentas de debug do ambiente de produção. Melhora segurança.

---

## Hooks Personalizados (Média Prioridade)

**Problema:** useSync tem dependência circular potencial (runSync depende de updatePendingCount)  
**Solução:** Revisar dependências do useSync para evitar loops  
**Depende de:** Estado global (se migrar para Zustand)  
**Pré-requisito para:** Nada  
**Sprint:** 5  
**Impacto no Sistema:** Previne loops infinitos de renderização. Melhora performance do sync. Reduz risco de travamentos. Garante sincronização estável.

**Problema:** Hooks de analytics desativados mas código ainda presente  
**Solução:** Remover código comentado de analytics se não for mais necessário  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 4  
**Impacto no Sistema:** Reduz tamanho do código (~200 linhas). Remove código morto. Melhora legibilidade. Facilita manutenção.

**Problema:** Falta de useCallback em algumas funções  
**Solução:** Adicionar useCallback em mais funções para otimização  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 4  
**Impacto no Sistema:** Reduz re-renders desnecessários. Melhora performance geral. Otimiza memoização de componentes. Diminui uso de CPU.

---

## Serviços e Cache (Média Prioridade)

**Problema:** cadastroCache.ts usa variáveis globais (cacheData, lastCacheUpdate, pollingInterval)  
**Solução:** Mover estado do cache para Context ou Redux  
**Depende de:** Decisão sobre migração do Redux  
**Pré-requisito para:** Nada  
**Sprint:** 5  
**Impacto no Sistema:** Remove variáveis globais que causam problemas em testes. Melhora arquitetura do código. Facilita SSR se necessário no futuro. Melhora testabilidade.

**Problema:** indexedDB.ts não trata erros adequadamente em algumas funções  
**Solução:** Adicionar try-catch em todas as funções do indexedDB  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 3  
**Impacto no Sistema:** Previne crashes silenciosos. Facilita debugging de erros de banco de dados. Melhora robustez do sistema. Garante tratamento adequado de falhas.

**Problema:** syncService.ts não tem timeout nas requisições  
**Solução:** Implementar timeout em todas as requisições fetch  
**Depende de:** Retry com backoff exponencial  
**Pré-requisito para:** Nada  
**Sprint:** 3  
**Impacto no Sistema:** Previne requisições pendentes indefinidamente. Melhora UX com feedback de timeout. Reduz consumo de recursos. Garante falha rápida em problemas de conexão.

**Problema:** Não há retry com backoff exponencial  
**Solução:** Implementar retry com backoff exponencial  
**Depende de:** Nada  
**Pré-requisito para:** Remover delays artificiais, Timeout em requisições  
**Sprint:** 3  
**Impacto no Sistema:** Melhora confiabilidade de sincronização. Reduz taxa de falhas temporárias. Adapta automaticamente a condições de rede. Melhora experiência offline-first.

---

## Estrutura do Projeto (Baixa Prioridade)

**Problema:** Componentes de cadernetas poderiam estar em subdiretório específico  
**Solução:** Considerar mover componentes de cadernetas para subdiretório específico  
**Depende de:** Nada  
**Pré-requisito para:** Barrel exports  
**Sprint:** 7  
**Impacto no Sistema:** Melhora organização do código. Facilita navegação entre arquivos. Reduz confusão em diretórios grandes. Melhora escalabilidade da estrutura.

**Problema:** Imports podem ser melhor organizados  
**Solução:** Adicionar barrel exports (index.ts) para melhor organização de imports  
**Depende de:** Estrutura reorganizada  
**Pré-requisito para:** Nada  
**Sprint:** 7  
**Impacto no Sistema:** Simplifica imports de componentes. Reduz linhas de código em imports. Facilita refatoração de estrutura. Melhora legibilidade do código.

---

## Acessibilidade (Média Prioridade)

**Problema:** Alguns componentes não têm aria-label  
**Solução:** Adicionar aria-label em todos os botões e inputs  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 6  
**Impacto no Sistema:** Melhora acessibilidade para leitores de tela. Permite navegação por teclado mais eficiente. Aumenta conformidade com WCAG. Melhora UX para usuários com deficiência visual.

**Problema:** Contraste de cores não verificado  
**Solução:** Verificar contraste de cores com ferramenta de acessibilidade  
**Depende de:** Nada  
**Pré-requisito para:** Nada  
**Sprint:** 6  
**Impacto no Sistema:** Garante leitura fácil em diferentes condições de luz. Melhora conformidade com WCAG AA. Melhora UX para usuários com deficiência visual. Aumenta profissionalismo da UI.

**Problema:** Falta suporte para navegação por teclado  
**Solução:** Adicionar suporte para navegação por teclado  
**Depende de:** Nada  
**Pré-requisito para:** Focus management  
**Sprint:** 6  
**Impacto no Sistema:** Permite uso completo sem mouse/mouse. Melhora acessibilidade geral. Facilita uso em dispositivos com teclado físico. Aumenta conformidade com WCAG.

**Problema:** Falta focus management em modais  
**Solução:** Implementar focus management em modais  
**Depende de:** Navegação por teclado  
**Pré-requisito para:** Nada  
**Sprint:** 6  
**Impacto no Sistema:** Melhora UX de navegação em modais. Previne perda de foco ao fechar modais. Facilita uso com teclado. Aumenta acessibilidade de formulários modais.

---

## Ordem Recomendada de Implementação (Sprints)

### Sprint 1 - Segurança Crítica
1. Variáveis de ambiente (Segurança)
2. Backend URL (Segurança)
3. Radio props (Componentes UI)
4. Button character encoding (Componentes UI)
5. Autenticação/autorização (Segurança)

### Sprint 2 - Validação
6. Helper validateCategorias (Código Duplicado)
7. Hook useCadernetaForm (Código Duplicado)
8. Validação no backend (Validação)
9. Mensagens de erro (Validação)
10. Logging de erros (Validação)

### Sprint 3 - Performance
11. Retry com backoff exponencial (Performance)
12. Remover delays artificiais (Performance)
13. Timeout em requisições (Serviços)
14. Try-catch em indexedDB (Serviços)
15. Memoização em componentes (Performance)
16. Loading skeleton (Performance)

### Sprint 4 - Código Duplicado
17. Mapeamento de colunas (Código Duplicado)
18. Componente wrapper (Código Duplicado)
19. Remover código comentado (Hooks)
20. Adicionar useCallback (Hooks)

### Sprint 5 - Estado Global (Opcional)
21. Decidir sobre Zustand vs Redux (Estado Global)
22. Se Zustand: migrar, adaptar hooks, mover cache
23. Se Redux: apenas DevTools em dev
24. Revisar dependências do useSync (Hooks)

### Sprint 6 - Acessibilidade
25. aria-label (Acessibilidade)
26. Contraste de cores (Acessibilidade)
27. Navegação por teclado (Acessibilidade)
28. Focus management (Acessibilidade)

### Sprint 7 - Opcionais
29. i18n (Validação)
30. Virtualização (Performance)
31. Reorganização de estrutura (Estrutura)
32. Barrel exports (Estrutura)
