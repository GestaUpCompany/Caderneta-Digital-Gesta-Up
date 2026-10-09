import { SyncError } from '../types/cadernetas'
import { isNetworkError, isTransientServerError } from './syncErrors'

/**
 * Tradução amigável de códigos de erro do Supabase/Postgres/rede
 * para mensagens que o peão consegue entender e agir.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Postgres/Supabase
  '23505': 'Registro duplicado. Já existe um registro com os mesmos dados no sistema.',
  '42501': 'Sem permissão. Seu usuário não tem acesso a esta operação. Contate o administrador.',
  '23502': 'Campo obrigatório não preenchido. Verifique todos os campos do formulário.',
  '23503': 'Referência inválida. O item mencionado não existe mais no cadastro.',
  '23514': 'Valor inválido. Verifique os dados informados (peso, cabeças, datas).',
  '42P01': 'Tabela não encontrada no banco. Contate o suporte técnico.',
  '42703': 'Campo não existe no banco. Contate o suporte técnico.',
  'P0001': 'Erro de regra de negócio no banco. Contate o suporte técnico.',
  // Rede
  network: 'Sem conexão com a internet. Verifique o sinal e tente novamente.',
  offline: 'Dispositivo offline. O registro será enviado quando a conexão voltar.',
  timeout: 'Tempo de conexão esgotado. Tente novamente em local com melhor sinal.',
  'ERR_INTERNET_DISCONNECTED': 'Sem conexão com a internet. Verifique o sinal e tente novamente.',
  'ERR_NETWORK': 'Sem conexão com a internet. Verifique o sinal e tente novamente.',
  'ERR_TIMED_OUT': 'Tempo de conexão esgotado. Tente novamente em local com melhor sinal.',
  // Servidor momentaneamente indisponível (o app já tentou várias vezes sozinho)
  transient: 'Servidor indisponível no momento. Tente reenviar em alguns minutos.',
  '408': 'Servidor indisponível no momento. Tente reenviar em alguns minutos.',
  '429': 'Servidor indisponível no momento. Tente reenviar em alguns minutos.',
  '502': 'Servidor indisponível no momento. Tente reenviar em alguns minutos.',
  '503': 'Servidor indisponível no momento. Tente reenviar em alguns minutos.',
  '504': 'Servidor indisponível no momento. Tente reenviar em alguns minutos.',
  '57014': 'O servidor demorou demais para responder. Tente reenviar em alguns minutos.',
  // Supabase Auth
  PGRST301: 'Sessão expirada. Saia do app e entre novamente.',
  '401': 'Sessão expirada. Saia do app e entre novamente.',
  '403': 'Sem permissão para esta operação. Contate o administrador.',
  // Trigger de categoria
  CATEGORIA_NOT_IN_LOTE: 'A categoria informada não existe no lote. Verifique o lote e a categoria selecionados.',
  // Genéricos
  unknown: 'Erro desconhecido ao sincronizar. Tente reenviar; se persistir, contate o suporte.',
}

/**
 * Mensagens específicas para violações de unicidade (23505), identificadas
 * pelo nome do índice/constraint presente na mensagem ou detalhes do erro.
 */
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  registros_leitura_cocho_curral_dia_uk: 'Já existe uma leitura de cocho para este curral nesta data.',
  registros_oferta_trato_dia_operacional_uk: 'Já existe um trato para este curral nesta data e ordem.',
  idx_individuos_fazenda_brinco_unico: 'Já existe um animal com este brinco nesta fazenda. Avise o administrador para corrigir o brinco da cria ou da mãe.',
  idx_individuos_fazenda_chip_unico: 'Já existe um animal com este chip nesta fazenda. Avise o administrador para corrigir o chip da cria ou da mãe.',
  idx_individuos_fazenda_manejo_unico: 'Já existe um animal com este ID de manejo nesta fazenda. Avise o administrador para corrigir o ID.',
}

/**
 * Retorna mensagem amigável para um SyncError.
 */
export function translateSyncError(error: SyncError | null | undefined): string {
  if (!error) return 'Erro desconhecido ao sincronizar.'
  const code = error.code?.trim()
  if (code === '23505') {
    const texto = `${error.message || ''} ${error.details || ''}`
    for (const [constraint, msg] of Object.entries(UNIQUE_CONSTRAINT_MESSAGES)) {
      if (texto.includes(constraint)) return msg
    }
    return ERROR_MESSAGES['23505']
  }
  if (code === 'P0001' && /tanque .* nao encontrado/i.test(error.message || '')) {
    return 'O tanque deste abastecimento foi removido do cadastro. Avise o administrador para conferir o registro.'
  }
  if (code && ERROR_MESSAGES[code]) {
    // Registros antigos de falha de rede foram gravados com code 'unknown'; a mensagem original revela a causa.
    if (code === 'unknown' && isNetworkError(error, true)) return ERROR_MESSAGES.network
    if (code === 'unknown' && isTransientServerError(error)) return ERROR_MESSAGES.transient
    return ERROR_MESSAGES[code]
  }
  // Fallback: se a mensagem original é legível, usa ela
  if (error.message && error.message.length < 120) return error.message
  return ERROR_MESSAGES.unknown
}

/**
 * Monta texto formatado para copiar/enviar ao suporte.
 */
export function formatSyncErrorForSupport(error: SyncError | null | undefined, caderneta: string, registroId: string): string {
  if (!error) return ''
  return [
    `Erro de sincronização - Caderneta: ${caderneta}`,
    `Registro: ${registroId}`,
    `Código: ${error.code || 'unknown'}`,
    `Operação: ${error.operation}`,
    `Tentativas: ${error.retryCount}`,
    `Data: ${error.failedAt}`,
    `Mensagem: ${error.message}`,
    error.details ? `Detalhes: ${error.details}` : '',
  ].filter(Boolean).join('\n')
}
