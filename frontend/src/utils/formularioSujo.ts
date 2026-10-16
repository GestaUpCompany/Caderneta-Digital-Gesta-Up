// Detecta se o peão já digitou algo na tela atual, para o "puxar para atualizar"
// só remontar formulários intocados (remontar apagaria o que foi preenchido).

let sujo = false

export function formularioSujo(): boolean {
  return sujo
}

export function limparFormularioSujo() {
  sujo = false
}

/** Rotas de formulário de caderneta: /caderneta/<id> (as listas terminam em /lista). */
export function ehRotaFormulario(pathname: string): boolean {
  return /^\/caderneta\/[^/]+\/?$/.test(pathname)
}

export function observarDigitacao(): () => void {
  const marcar = (e: Event) => {
    const el = e.target
    if (el instanceof HTMLElement && el.closest('input, textarea, select')) sujo = true
  }
  // Toque em botão/opção do conteúdo (ex.: nota do cocho, seleção de animal) também é interação
  const marcarToque = (e: Event) => {
    const el = e.target
    if (el instanceof HTMLElement && el.closest('main button, main [role="button"], main label')) sujo = true
  }
  document.addEventListener('input', marcar, true)
  document.addEventListener('change', marcar, true)
  document.addEventListener('click', marcarToque, true)
  return () => {
    document.removeEventListener('input', marcar, true)
    document.removeEventListener('change', marcar, true)
    document.removeEventListener('click', marcarToque, true)
  }
}
