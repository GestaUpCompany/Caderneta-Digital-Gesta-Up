# Plano de Implementação - Sistema de Analytics

## Objetivo
Implementar sistema de analytics para rastrear uso do app a longo prazo, coletando dados seguros (sem violar LGPD/Play Store) para análise de retenção, engajamento e performance.

## Estrutura da Planilha
**URL:** https://docs.google.com/spreadsheets/d/1i5zNHrN56caDV7vqmk9i8p1hm94_X8nOk5DpgTmqzIQ/edit
**Página:** Registros

**Colunas:**
1. UUID
2. Data
3. Hora
4. OS
5. Versão OS
6. Modelo Dispositivo
7. Resolução da Tela
8. Fuso Horário
9. Última abertura
10. Número de sessões
11. Tempo de uso por sessão
12. Telas mais acessadas
13. Uso offline vs Online
14. Data de Configuração da Fazenda
15. Horário de pico de uso
16. Dia da semana mais ativo
17. Intervalo médio entre sessões

---

## Fase 1: Dados Estáticos (Prioridade: Alta)

### Objetivo
Capturar dados do dispositivo que não mudam, coletados uma vez no primeiro registro.

### Dados a Capturar
- **OS:** `navigator.platform` ou `navigator.userAgent`
- **Versão OS:** Extrair do `userAgent`
- **Modelo Dispositivo:** `navigator.userAgent` (iPhone, Samsung, etc.)
- **Resolução da Tela:** `${window.screen.width}x${window.screen.height}`
- **Fuso Horário:** `Intl.DateTimeFormat().resolvedOptions().timeZone` ou `new Date().getTimezoneOffset()`

### Implementação Frontend
- Criar função `getDeviceStaticData()` em `frontend/src/utils/deviceData.ts`
- Retornar objeto com dados estáticos
- Chamar junto com `getDeviceId()` no App.tsx

### Implementação Backend
- Modificar endpoint `/api/devices/register` para aceitar dados estáticos
- Atualizar schema de validação
- Salvar na planilha nas colunas correspondentes

### Impacto
- **Performance:** Nulo - capturados uma vez, <10ms
- **Internet:** ~500 bytes no registro inicial
- **Dispositivos antigos:** Sem impacto

---

## Fase 2: Dados de Sessão (Prioridade: Alta)

### Objetivo
Rastrear sessões do usuário para análise de retenção e engajamento.

### Dados a Rastrear
- **Última abertura:** Data/hora atual
- **Número de sessões:** Incrementar contador no localStorage

### Implementação Frontend
- Criar função `incrementSessionCount()` em `frontend/src/utils/deviceData.ts`
- Salvar contador no localStorage
- Enviar para backend ao abrir app

### Implementação Backend
- Criar endpoint `/api/devices/update` para atualizar dados de sessão
- Atualizar linha existente (encontrar por UUID)
- Atualizar colunas: Última abertura, Número de sessões

### Cálculos
- Número de sessões: `localStorage.getItem('sessionCount') || 0` + 1
- Última abertura: `new Date().toLocaleString('pt-BR')`

### Impacto
- **Performance:** Nulo - apenas contadores, <5ms
- **Internet:** ~200 bytes por atualização
- **Dispositivos antigos:** Sem impacto

---

## Fase 3: Dados de Uso (Prioridade: Média)

### Objetivo
Rastrear comportamento do usuário dentro do app.

### Dados a Rastrear
- **Tempo de uso por sessão:** Tempo total da sessão em minutos
- **Telas mais acessadas:** Contagem de visitas por tela
- **Uso offline vs Online:** Eventos `online`/`offline`

### Implementação Frontend
- Criar hook `useSessionTimer()` para rastrear tempo de uso
- Criar hook `useScreenTracking()` para rastrear telas
- Criar hook `useNetworkTracking()` para rastrear online/offline
- Salvar dados no localStorage/IndexedDB
- Enviar para backend em batch (a cada X minutos ou ao sair)

### Implementação Backend
- Modificar endpoint `/api/devices/update` para aceitar dados de uso
- Atualizar colunas: Tempo de uso, Telas, Uso offline/online

### Cálculos
- Tempo de uso: `sessionEnd - sessionStart` (em minutos)
- Telas mais acessadas: `screens.reduce((acc, screen) => { acc[screen] = (acc[screen] || 0) + 1; return acc }, {})`
- Uso offline/online: Contador de tempo em cada estado

### Impacto
- **Performance:** Médio - rastreamento contínuo pode adicionar 10-20ms por navegação
- **Internet:** ~100-500 bytes por atualização de batch
- **Dispositivos antigos:** Pode sentir leve delay

---

## Fase 4: Dados de Negócio (Prioridade: Média)

### Objetivo
Rastrear marcos importantes na jornada do usuário.

### Dados a Rastrear
- **Data de Configuração da Fazenda:** Salvar quando usuário configura fazenda

### Implementação Frontend
- Modificar `Configuracoes.tsx` para salvar data de configuração
- Salvar no localStorage
- Enviar para backend ao configurar

### Implementação Backend
- Modificar endpoint `/api/devices/update` para aceitar data de configuração
- Atualizar coluna: Data de Configuração da Fazenda

### Cálculos
- Data de configuração: `new Date().toLocaleDateString('pt-BR')`

### Impacto
- **Performance:** Nulo
- **Internet:** ~50 bytes
- **Dispositivos antigos:** Sem impacto

---

## Fase 5: Cálculos de Analytics (Prioridade: Baixa)

### Objetivo
Calcular métricas agregadas para análise de padrões de uso.

### Dados a Calcular
- **Horário de pico de uso:** Agregar sessões por hora, encontrar moda
- **Dia da semana mais ativo:** Agregar sessões por dia da semana, encontrar moda
- **Intervalo médio entre sessões:** Diferença entre sessões consecutivas, média

### Implementação Backend
- Criar endpoint `/api/devices/analytics` para calcular métricas
- Ler todas as linhas da planilha
- Calcular métricas agregadas
- Retornar dados calculados

### Cálculos
- Horário pico: `sessions.groupBy(hour).max()`
- Dia ativo: `sessions.groupBy(dayOfWeek).max()`
- Intervalo médio: `sum(sessionIntervals) / count(intervals)`

### Impacto
- **Performance:** Backend - pode demorar 1-2 segundos com muitos dados
- **Internet:** ~1KB por requisição de analytics
- **Mitigação:** Cache de resultados, cálculos assíncronos

---

## Estrutura de Endpoints

### POST /api/devices/register
**Payload:**
```json
{
  "deviceSheetUrl": "https://...",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "os": "iOS",
  "osVersion": "15.4",
  "deviceModel": "iPhone 13",
  "screenResolution": "390x844",
  "timezone": "America/Sao_Paulo"
}
```

### POST /api/devices/update
**Payload:**
```json
{
  "deviceSheetUrl": "https://...",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "lastOpen": "23/04/2026 10:30",
  "sessionCount": 5,
  "sessionTime": 15,
  "screens": "Home:10,Configuracoes:2",
  "offlineTime": 2,
  "onlineTime": 13,
  "farmConfigDate": "20/04/2026",
  "modules": "Cadernetas:8,Insumos:2",
  "firstEntry": "Maternidade:20/04/2026,Insumos:22/04/2026"
}
```

### GET /api/devices/analytics
**Query Params:** `uuid=550e8400-e29b-41d4-a716-446655440000`

**Response:**
```json
{
  "peakHour": "14:00",
  "mostActiveDay": "Quarta-feira",
  "avgSessionInterval": 24
}
```

---

## Ordem de Implementação

1. **Fase 1** (Dados Estáticos) - Alta prioridade, baixo risco
2. **Fase 2** (Dados de Sessão) - Alta prioridade, baixo risco
3. **Fase 4** (Dados de Negócio) - Média prioridade, baixo risco
4. **Fase 3** (Dados de Uso) - Média prioridade, médio risco (performance)
5. **Fase 5** (Cálculos) - Baixa prioridade, backend-only

---

## Considerações de Performance

### Dispositivos Antigos
- Fases 1, 2, 4: Sem impacto
- Fase 3: Pode sentir leve delay em navegações
- Mitigação: Debounce, batch updates

### Consumo de Internet
- Fase 1: ~500 bytes (único)
- Fase 2: ~200 bytes por sessão
- Fase 3: ~100-500 bytes por batch
- Total por sessão: <5KB (negligenciável)

### Bateria
- Rastreamento contínuo: Impacto baixo
- Timer de sessão: Impacto nulo
- Mitigação: Pausar rastreamento em background

### Armazenamento Local
- localStorage: ~2-5KB
- IndexedDB: ~10-20KB
- Impacto: Negligenciável

---

## Testes

### Fase 1
- Verificar se dados estáticos são capturados corretamente
- Testar em diferentes dispositivos (iOS, Android, Desktop)

### Fase 2
- Verificar se contador de sessões incrementa corretamente
- Verificar se última abertura é atualizada

### Fase 3
- Verificar se tempo de uso é calculado corretamente
- Verificar se telas são rastreadas
- Verificar se online/offline é detectado
- Testar performance em dispositivos antigos

### Fase 4
- Verificar se data de configuração é salva

### Fase 5
- Verificar se cálculos agregados estão corretos
- Testar com muitos dados (performance)
