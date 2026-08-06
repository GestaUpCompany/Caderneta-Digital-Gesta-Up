import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ConfigState {
  fazenda: string
  fazendaId: string
  acessoId: string
  usuario: string
  logoUrl: string
  configurado: boolean
  controleAcessoHabilitado: boolean
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
