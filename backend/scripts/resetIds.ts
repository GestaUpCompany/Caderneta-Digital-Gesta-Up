import { google } from 'googleapis'
import { extractSpreadsheetId } from '../src/services/googleSheetsService'
import path from 'path'
import fs from 'fs'

// Configurações
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './config/google-credentials.json'
const INSUMOS_SHEET_URL = process.env.INSUMOS_SHEET_URL || ''

function getAuth() {
  const credentialsEnv = process.env.GOOGLE_CREDENTIALS_FILE
  
  if (credentialsEnv) {
    const credentials = JSON.parse(credentialsEnv)
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  }

  const credentialsPath = path.resolve(CREDENTIALS_PATH)

  if (!fs.existsSync(credentialsPath)) {
    throw new Error('Arquivo de credenciais não encontrado: ' + credentialsPath + ' e GOOGLE_CREDENTIALS_FILE não definido')
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

async function clearIds(spreadsheetUrl: string, sheetName: string): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)

  // Ler todas as linhas
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:A`,
  })

  const values = response.data.values || []
  
  if (values.length === 0) {
    console.log(`Nenhum ID encontrado na aba "${sheetName}"`)
    return
  }

  // Limpar a coluna A (IDs)
  const batchSize = 100
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize)
    const startRow = i + 2 // Começa na linha 2
    const endRow = startRow + batch.length - 1
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${startRow}:A${endRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: batch.map(() => ['']),
      },
    })
    
    console.log(`Cleared ${batch.length} IDs from rows ${startRow} to ${endRow} in "${sheetName}"`)
  }

  console.log(`Total de ${values.length} IDs limpos na aba "${sheetName}"`)
}

async function main(): Promise<void> {
  if (!INSUMOS_SHEET_URL) {
    console.error('ERRO: INSUMOS_SHEET_URL não definido')
    console.error('Use: INSUMOS_SHEET_URL="https://docs.google.com/spreadsheets/d/..." npm run reset-ids')
    process.exit(1)
  }

  try {
    console.log('Iniciando reset de IDs...')
    console.log(`Planilha: ${INSUMOS_SHEET_URL}`)
    
    await clearIds(INSUMOS_SHEET_URL, 'Entrada')
    await clearIds(INSUMOS_SHEET_URL, 'Saída')
    
    console.log('Reset de IDs concluído com sucesso!')
  } catch (error) {
    console.error('Erro ao resetar IDs:', error)
    process.exit(1)
  }
}

main()
