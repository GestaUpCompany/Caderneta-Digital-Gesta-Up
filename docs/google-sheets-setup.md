# Configuração Google Sheets + Service Account

## **Passo 1: Criar Service Account no Google Cloud**

### **1.1 Acessar Google Cloud Console**
1. Vá para: https://console.cloud.google.com/
2. Crie um novo projeto ou use um existente
3. Nome sugerido: `Cadernetas Digitais API`

### **1.2 Habilitar Google Sheets API**
1. Menu: APIs & Services > Library
2. Busque: "Google Sheets API"
3. Clique em "Enable"

### **1.3 Criar Service Account**
1. Menu: IAM & Admin > Service Accounts
2. Clique em "Create Service Account"
3. **Detalhes**:
   - Name: `cadernetas-api`
   - Description: `API para cadernetas digitais`
4. Clique "Create and Continue"

### **1.4 Criar Chave JSON**
1. Após criar o Service Account
2. Clique no email criado
3. Vá para "Keys"
4. "Add Key" > "Create new key"
5. Selecione "JSON"
6. Clique "Create"
7. **Baixe o arquivo JSON** - guarde-o!

### **1.5 Copiar Email do Service Account**
- Anote o email: `cadernetas-api@xxxx.iam.gserviceaccount.com`
- Será usado para compartilhar a planilha

---

## **Passo 2: Criar Planilha Google Sheets**

### **2.1 Criar Planilha**
1. Vá para: https://sheets.google.com
2. "Create" > "Blank spreadsheet"
3. Nome: `Cadernetas Digitais - [Nome da Fazenda]`

### **2.2 Criar Abas**
Crie 6 abas com os nomes exatos:
1. `Maternidade Cria`
2. `Troca de Pastos`
3. `Rodeio Gado`
4. `Suplementação`
5. `Bebedouros`
6. `Movimentação`

### **2.3 Configurar Cabeçalhos**

#### **Maternidade Cria**
```
A1: Data
B1: Pasto
C1: Peso Cria (kg)
D1: Número Cria
E1: Tratamento
F1: Tipo Parto
G1: Sexo
H1: Raça
I1: Número Mãe
J1: Categoria Mãe
K1: Data Registro
L1: Usuário
M1: ID Dispositivo
N1: Sincronizado
```

#### **Troca de Pastos**
```
A1: Data
B1: Manejador
C1: Número Lote
D1: Pasto Saída
E1: Avaliação Saída (1-5)
F1: Pasto Entrada
G1: Avaliação Entrada (1-5)
H1: Vaca
I1: Touro
J1: Bezerro
K1: Boi Magro
L1: Garrote
M1: Novilha
N1: Total Animais
```

#### **Rodeio Gado**
```
A1: Data
B1: Pasto
C1: Número Lote
D1: Vaca
E1: Touro
F1: Bezerro
G1: Boi
H1: Garrote
I1: Novilha
J1: Total Cabeças
K1: Escore Gado Ideal
L1: Água Boa Bebedouro
M1: Pastagem Adequada
N1: Animais Doentes
O1: Cercas Cochos
P1: Carrapatos Moscas
Q1: Animais Entrevados
R1: Animal Morto
S1: Animais Tratados
T1: Escore Fezes
U1: Equipe
V1: Procedimentos
```

#### **Suplementação**
```
A1: Data
B1: Tratador
C1: Pasto
D1: Número Lote
E1: Produto
F1: Gado
G1: Categorias
H1: Leitura
I1: Sacos
J1: KG
K1: Creep
```

#### **Bebedouros**
```
A1: Data
B1: Responsável
C1: Pasto
D1: Número Lote
E1: Gado
F1: Categoria
G1: Leitura Bebedouro
H1: Número Bebedouro
I1: Observação
```

#### **Movimentação**
```
A1: Data
B1: Lote Origem
C1: Lote Destino
D1: Número Cabeças
E1: Peso Médio (kg)
F1: Vaca
G1: Touro
H1: Boi Gordo
I1: Boi Magro
J1: Garrote
K1: Bezerro
L1: Novilha
M1: Tropa
N1: Outros
O1: Motivo Movimentação
P1: Brinco/Chip
Q1: Causa Observação
```

---

## **Passo 3: Compartilhar Planilha com Service Account**

### **3.1 Compartilhar Planilha**
1. Clique em "Share" (canto superior direito)
2. Adicione o email do Service Account: `cadernetas-api@xxxx.iam.gserviceaccount.com`
3. Dê permissão: **Editor**
4. Clique "Send"

### **3.2 Obter ID da Planilha**
1. Na URL do Google Sheets:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
2. Copie o `SPREADSHEET_ID` (longo código alfanumérico)
3. Exemplo: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

---

## **Passo 4: Configurar Backend**

### **4.1 Adicionar Chave JSON no Backend**
1. Coloque o arquivo JSON baixado em:
   ```
   backend/config/google-credentials.json
   ```

### **4.2 Adicionar ID da Planilha**
No backend, configure o SPREADSHEET_ID:
```typescript
// backend/src/services/googleSheetsService.ts
const SPREADSHEET_ID = 'SEU_SPREADSHEET_ID_AQUI'
```

### **4.3 Fazer Deploy**
1. Commit as mudanças
2. Push para GitHub
3. Vercel vai fazer deploy automático

---

## **Passo 5: Testar**

### **5.1 Testar API**
```bash
curl https://cadernetas-backend.vercel.app/api/health
```

### **5.2 Testar Frontend**
1. Abra o PWA
2. Configure link da planilha nas configurações
3. Adicione um registro
4. Verifique se aparece no Google Sheets

---

## **Troubleshooting**

### **Erro: "Insufficient permissions"**
- Verifique se o Service Account tem permissão de Editor
- Confirme se a planilha foi compartilhada corretamente

### **Erro: "Spreadsheet not found"**
- Verifique se o SPREADSHEET_ID está correto
- Confirme se a planilha existe

### **Erro: "Invalid credentials"**
- Verifique se o arquivo JSON está no local correto
- Confirme se a chave JSON é válida

---

## **Links Úteis**
- Google Cloud Console: https://console.cloud.google.com/
- Google Sheets: https://sheets.google.com
- Google Sheets API: https://developers.google.com/sheets/api
