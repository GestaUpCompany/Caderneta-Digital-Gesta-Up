export const APP_VERSION = '1.0.0'
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
