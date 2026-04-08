# Cadernetas Digitais - Gestão Rural

Aplicativo PWA para peões de fazenda registrar dados de produção offline e sincronizar com Google Sheets.

## **Deploy**

### **Frontend (PWA)**
- **GitHub Pages**: Deploy automático via GitHub Actions
- **URL**: https://gestaupcompany.github.io/Caderneta-Digital-Gesta-Up/
- **PWA**: Instalável via banner no navegador

### **Backend**
- **Vercel Serverless**: Node.js + Express
- **URL**: https://cadernetas-backend.vercel.app
- **Deploy**: Automático quando há mudanças em `backend/`
- **Custo**: 100% gratuito (100k invocações/mês)

## **Setup Local**

### **Pré-requisitos**
- Node.js 18+
- npm

### **Frontend**
```bash
cd frontend
npm install
npm run dev
```

### **Backend**
```bash
cd backend
npm install
cp .env.example .env
# Configure GOOGLE_CREDENTIALS_PATH e outras variáveis
npm run dev
```

## **Configuração Google Sheets**

1. Criar Service Account no Google Cloud
2. Compartilhar planilha com o email do Service Account
3. Colocar chave JSON em `backend/config/google-credentials.json`
4. Colar link da planilha no app

## **Estrutura do Projeto**

```
caderneta-digital/
  frontend/          # PWA React
    src/
      pages/         # Telas das cadernetas
      components/    # Componentes UI
      store/         # Estado Redux
      services/      # API e IndexedDB
  backend/           # API Node.js
    src/
      controllers/   # Rotas da API
      services/      # Google Sheets
      middleware/    # Validação
```

## **Cadernetas Disponíveis**

1. **Maternidade** - Controle de nascimentos
2. **Troca de Pastos** - Rotação de pastagens  
3. **Rodeio Gado** - Controle geral do rebanho
4. **Suplementação** - Alimentação suplementar
5. **Bebedouros** - Controle de água
6. **Movimentação** - Transferência entre lotes

## **Tecnologias**

- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Backend**: Node.js, Express, Google Sheets API
- **PWA**: Workbox, Service Worker, IndexedDB
- **Deploy**: GitHub Pages, Railway
