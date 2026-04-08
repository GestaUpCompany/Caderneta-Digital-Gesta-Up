// Utilitário para debug do PWA
export function checkPWARequirements() {
  const checks = {
    serviceWorker: false,
    manifest: false,
    https: false,
    standalone: false
  }

  // 1. Verificar Service Worker
  if ('serviceWorker' in navigator) {
    checks.serviceWorker = true
    console.log('Service Worker suportado')
  } else {
    console.error('Service Worker não suportado')
  }

  // 2. Verificar HTTPS
  if (location.protocol === 'https:' || location.hostname === 'localhost') {
    checks.https = true
    console.log('HTTPS funcionando')
  } else {
    console.error('HTTPS não detectado')
  }

  // 3. Verificar se está em modo standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    checks.standalone = true
    console.log('App já está instalado')
  }

  // 4. Verificar Manifest
  const manifestLink = document.querySelector('link[rel="manifest"]')
  if (manifestLink) {
    checks.manifest = true
    console.log('Manifest link encontrado')
  } else {
    console.error('Manifest não encontrado')
  }

  console.log('PWA Requirements:', checks)
  return checks
}

// Verificar se o beforeinstallprompt está disponível
export function listenInstallPrompt() {
  let deferredPrompt: any = null

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt evento disparado!')
    e.preventDefault()
    deferredPrompt = e
    return deferredPrompt
  })

  return deferredPrompt
}

// Forçar verificação do PWA
export function debugPWA() {
  console.log('=== PWA DEBUG ===')
  
  // Verificar Service Worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('Service Workers registrados:', registrations)
      registrations.forEach(registration => {
        console.log('SW state:', registration.active?.state)
        console.log('SW scope:', registration.scope)
      })
    })
  }

  // Verificar Manifest
  fetch('/manifest.webmanifest')
    .then(response => response.json())
    .then(manifest => {
      console.log('Manifest carregado:', manifest)
    })
    .catch(error => {
      console.error('Erro ao carregar manifest:', error)
    })

  // Verificar display mode
  console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser')
  console.log('=== FIM PWA DEBUG ===')
}
