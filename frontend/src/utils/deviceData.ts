export function getDeviceStaticData() {
  const userAgent = navigator.userAgent
  
  // Detectar OS
  let os = 'Unknown'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS'
  } else if (userAgent.includes('Android')) {
    os = 'Android'
  } else if (userAgent.includes('Windows')) {
    os = 'Windows'
  } else if (userAgent.includes('Mac')) {
    os = 'macOS'
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  }

  // Extrair versão do OS (simplificada)
  let osVersion = 'Unknown'
  if (os === 'iOS') {
    const match = userAgent.match(/OS (\d+[_\d]*)/)
    osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown'
  } else if (os === 'Android') {
    const match = userAgent.match(/Android (\d+[\.\d]*)/)
    osVersion = match ? match[1] : 'Unknown'
  }

  // Detectar modelo de dispositivo (simplificado)
  let deviceModel = 'Unknown'
  if (userAgent.includes('iPhone')) {
    const match = userAgent.match(/iPhone (\d+[\w]*)/)
    deviceModel = match ? `iPhone ${match[1]}` : 'iPhone'
  } else if (userAgent.includes('iPad')) {
    deviceModel = 'iPad'
  } else if (userAgent.includes('Samsung')) {
    const match = userAgent.match(/SM-([A-Z0-9]+)/)
    deviceModel = match ? `Samsung ${match[1]}` : 'Samsung'
  } else if (userAgent.includes('Pixel')) {
    const match = userAgent.match(/Pixel (\d+[\w]*)/)
    deviceModel = match ? `Pixel ${match[1]}` : 'Pixel'
  } else if (os === 'Windows') {
    deviceModel = 'Windows PC'
  } else if (os === 'macOS') {
    deviceModel = 'Mac'
  } else if (os === 'Linux') {
    deviceModel = 'Linux PC'
  }

  // Resolução da tela
  const screenResolution = `${window.screen.width}x${window.screen.height}`

  // Fuso horário
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'

  return {
    os,
    osVersion,
    deviceModel,
    screenResolution,
    timezone,
  }
}

export function getSessionData() {
  const sessionCount = parseInt(localStorage.getItem('sessionCount') || '0', 10) + 1
  localStorage.setItem('sessionCount', sessionCount.toString())
  
  const lastOpen = new Date().toLocaleString('pt-BR')
  
  return {
    sessionCount,
    lastOpen,
  }
}
