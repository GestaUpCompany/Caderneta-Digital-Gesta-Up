import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ConfigState {
  fazenda: string
  fazendaId: string
  acessoId: string
  usuario: string
  logoUrl: string
  configurado: boolean
  controleAcessoHabilitado: boolean
  funcionarioId: string
  funcionarioNome: string
  funcionarioCadernetas: string[]
}

const initialState: ConfigState = {
  fazenda: '',
  fazendaId: '',
  acessoId: '',
  usuario: '',
  logoUrl: '',
  configurado: false,
  controleAcessoHabilitado: false,
  funcionarioId: '',
  funcionarioNome: '',
  funcionarioCadernetas: [],
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
    resetConfig: () => initialState,
  },
})

export const { setConfig, setConfigurado, resetConfig } = configSlice.actions
export default configSlice.reducer
