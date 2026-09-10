import { SyncError } from '../types/cadernetas'

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
  // Supabase Auth
  '401': 'Sessão expirada. Saia do app e entre novamente.',
  '403': 'Sem permissão para esta operação. Contate o administrador.',
  // Trigger de categoria
  CATEGORIA_NOT_IN_LOTE: 'A categoria informada não existe no lote. Verifique o lote e a categoria selecionados.',
  // Genéricos
  unknown: 'Erro desconhecido ao sincronizar. Tente reenviar; se persistir, contate o suporte.',
}

/**
 * Retorna mensagem amigável para um SyncError.
 */
export function translateSyncError(error: SyncError | null | undefined): string {
  if (!error) return 'Erro desconhecido ao sincronizar.'
  const code = error.code?.trim()
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
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
