import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ConfigState {
  fazenda: string
  fazendaId: string
  acessoId: string
  usuario: string
  planilhaUrl: string
  cadastroSheetUrl: string
  logoUrl: string
  configurado: boolean
}

const initialState: ConfigState = {
  fazenda: '',
  fazendaId: '',
  acessoId: '',
  usuario: '',
  planilhaUrl: '',
  cadastroSheetUrl: '',
  logoUrl: '',
  configurado: false,
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
