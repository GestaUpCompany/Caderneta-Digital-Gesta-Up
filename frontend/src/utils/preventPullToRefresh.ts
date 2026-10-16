// Prevenir pull-to-refresh em PWAs instalados

// O gesto de puxar para atualizar agora é do componente PullToRefresh, que também
// bloqueia o refresh nativo do navegador (preventDefault) enquanto o arrasto é dele.
// Aqui fica só o CSS que desliga o overscroll nativo em PWA instalado.
export function addPullToRefreshCSS() {
  const style = document.createElement('style')
  style.textContent = `
    /* Prevenir pull-to-refresh em PWAs */
    @media (display-mode: standalone), (display-mode: minimal-ui) {
      html, body {
        overscroll-behavior-y: none;
        -webkit-overflow-scrolling: touch;
      }
    }
  `
  document.head.appendChild(style)
}
