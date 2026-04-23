import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ConfigState {
  fazenda: string
  fazendaId: string
  usuario: string
  planilhaUrl: string
  configurado: boolean
}

const initialState: ConfigState = {
  fazenda: '',
  fazendaId: '',
  usuario: '',
  planilhaUrl: '',
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
