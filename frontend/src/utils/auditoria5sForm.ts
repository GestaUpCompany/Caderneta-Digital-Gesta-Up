// Auxiliares da tela de Auditoria 5S (preenchimento): quais itens ainda faltam responder.
// Só do PWA; as regras de resultado e de pendência ficam em auditoria5sItens.ts e pendencias5s.ts (espelhados no Painel).

import { CHAVES_ITENS_5S, type Secao5S } from './auditoria5sItens'

/**
 * Chaves dos itens ainda sem resposta, na ordem da auditoria. `ignorar` são os itens decididos por outra
 * pergunta (pendências anteriores); `secao` limita a um pilar.
 */
export function chavesSemResposta5S(
  itens: Record<string, string | undefined | null>,
  ignorar: readonly string[] = [],
  secao?: Secao5S
): string[] {
  const universo = secao ? secao.itens.map((i) => i.chave) : CHAVES_ITENS_5S
  return universo.filter((chave) => !itens[chave] && !ignorar.includes(chave))
}

/** Marca como conforme (C) os itens do pilar que ainda não têm resposta; nunca altera uma resposta existente. */
export function marcarRestantesConformes5S(
  itens: Record<string, string>,
  secao: Secao5S,
  ignorar: readonly string[] = []
): Record<string, string> {
  const alvo = chavesSemResposta5S(itens, ignorar, secao)
  if (alvo.length === 0) return itens
  return { ...itens, ...Object.fromEntries(alvo.map((chave) => [chave, 'C'])) }
}
