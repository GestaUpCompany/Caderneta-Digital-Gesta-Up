// Injetados no build (vite.config.ts). Em testes (vitest) as constantes podem não existir.
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
export const APP_BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 'dev'
export const APP_ENV = typeof __APP_ENV__ !== 'undefined' ? __APP_ENV__ : 'producao'
export const isStaging = APP_ENV === 'staging'

/** Ex.: "1.0.0 · 2026.10.08-222ba39" (produção) ou "... · STAGING" */
export function formatarVersaoCompleta(versao: string, build: string, env: string): string {
  return `${versao} · ${build}${env === 'staging' ? ' · STAGING' : ''}`
}

export const getVersaoCompleta = () => formatarVersaoCompleta(APP_VERSION, APP_BUILD, APP_ENV)
export const VERSION_CHECK_URL = '/api/version'
export const VERSION_CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 horas

export interface VersionInfo {
  version: string
  downloadUrl: string
  changelog: string[]
  mandatory: boolean
  releaseDate: string
}

export interface VersionResponse {
  success: boolean
  data?: VersionInfo
  error?: string
}
