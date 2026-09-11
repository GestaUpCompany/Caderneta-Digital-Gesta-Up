import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ExpedienteDia {
  ativo: boolean
  inicio: string
  fim: string
}

export type ExpedienteDias = Record<number, ExpedienteDia>

interface ConfigState {
  fazenda: string
  fazendaId: string
  acessoId: string
  usuario: string
  logoUrl: string
  configurado: boolean
  controleAcessoHabilitado: boolean
  expedienteHabilitado: boolean
  expedienteTimezone: string
  expedienteDias: ExpedienteDias | null
  acessoConfinamento: boolean
  funcionarioId: string
  funcionarioNome: string
  funcionarioCadernetas: string[]
  testModeAtivo: boolean
}

const initialState: ConfigState = {
  fazenda: '',
  fazendaId: '',
  acessoId: '',
  usuario: '',
  logoUrl: '',
  configurado: false,
  controleAcessoHabilitado: false,
  expedienteHabilitado: false,
  expedienteTimezone: 'America/Cuiaba',
  expedienteDias: null,
  acessoConfinamento: false,
  funcionarioId: '',
  funcionarioNome: '',
  funcionarioCadernetas: [],
  testModeAtivo: false,
}

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<Partial<ConfigState>>) => {
      return { ...state, ...action.payload }
    },
    setConfigurado: (state, action: PayloadAction<boolean>) => {
      state.configurado = action.payload
    },
    setTestMode: (state, action: PayloadAction<boolean>) => {
      state.testModeAtivo = action.payload
    },
    resetConfig: () => initialState,
  },
})

export const { setConfig, setConfigurado, setTestMode, resetConfig } = configSlice.actions
export default configSlice.reducer
