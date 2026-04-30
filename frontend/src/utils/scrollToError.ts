/**
 * Função para rolar a tela até o primeiro campo com erro de validação
 * @param errors Lista de erros de validação com campo e mensagem
 */
export function scrollToFirstError(errors: { field: string; message: string }[]): void {
  if (!errors || errors.length === 0) return

  // Mapeamento de nomes de campos para IDs de elementos no DOM
  // Os campos geralmente têm IDs baseados no nome do campo
  const firstError = errors[0]
  const fieldName = firstError.field

  // Tentar encontrar o elemento pelo ID ou name
  let element = document.getElementById(fieldName)
  if (!element) {
    element = document.querySelector(`[name="${fieldName}"]`)
  }
  if (!element) {
    // Tentar encontrar por atributo data-field ou label
    element = document.querySelector(`[data-field="${fieldName}"]`)
  }

  if (element) {
    // Scroll suave até o elemento
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })

    // Opcional: adicionar foco ao elemento se for um input
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      setTimeout(() => element.focus(), 300)
    }
  }
}
