/**
 * Função para rolar a tela até o primeiro campo com erro de validação
 * @param errors Lista de erros de validação com campo e mensagem
 */
export function scrollToFirstError(errors: { field: string; message: string }[]): void {
  if (!errors || errors.length === 0) return

  // Mapeamento de nomes de campos para IDs de elementos no DOM
  // Os campos geralmente têm IDs baseados no nome do campo
  let element: Element | null = null
  for (const error of errors) {
    const fieldName = error.field
    element =
      document.getElementById(fieldName) ||
      document.querySelector(`[name="${fieldName}"]`) ||
      document.querySelector(`[data-field="${fieldName}"]`)
    if (element) break
  }

  if (!element) {
    // Campo sem elemento no DOM (ex.: campo derivado como 'pasto'):
    // rolar até o banner de validação, ou ao topo como último recurso.
    element = document.querySelector('[data-validation-banner]')
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
    return
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}
