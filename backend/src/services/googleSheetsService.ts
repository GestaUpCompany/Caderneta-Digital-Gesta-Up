import { google } from 'googleapis'
import { logger } from '../utils/logger'
import path from 'path'
import fs from 'fs'

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './config/google-credentials.json'

function getAuth() {
  const credentialsPath = path.resolve(CREDENTIALS_PATH)

  if (!fs.existsSync(credentialsPath)) {
    throw new Error('Arquivo de credenciais não encontrado: ' + credentialsPath)
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!match) throw new Error('Link da planilha inválido')
  return match[1]
}

export async function appendRow(
  spreadsheetUrl: string,
  sheetName: string,
  values: (string | number | null)[]
): Promise<number> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })

  const updatedRange = response.data.updates?.updatedRange || ''
  const rowMatch = updatedRange.match(/:.*?(\d+)$/)
  const rowNumber = rowMatch ? parseInt(rowMatch[1]) : -1

  logger.info(`Linha adicionada na aba ${sheetName}, linha ${rowNumber}`)
  return rowNumber
}

export async function updateRow(
  spreadsheetUrl: string,
  sheetName: string,
  rowNumber: number,
  values: (string | number | null)[]
): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })

  logger.info(`Linha ${rowNumber} atualizada na aba ${sheetName}`)
}

export async function getRows(
  spreadsheetUrl: string,
  sheetName: string
): Promise<(string | number | null)[][]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:Z`,
  })

  return (response.data.values || []) as (string | number | null)[][]
}

export async function validateConnection(spreadsheetUrl: string): Promise<boolean> {
  try {
    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)

    await sheets.spreadsheets.get({ spreadsheetId })
    return true
  } catch (error) {
    logger.error('Erro ao validar conexão com planilha: ' + error)
    return false
  }
}
