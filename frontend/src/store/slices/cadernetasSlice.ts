import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Registro } from '../../types/cadernetas'

interface CadernetasState {
  maternidade: Registro[]
  pastagens: Registro[]
  rodeio: Registro[]
  suplementacao: Registro[]
  bebedouros: Registro[]
  movimentacao: Registro[]
}

const initialState: CadernetasState = {
  maternidade: [],
  pastagens: [],
  rodeio: [],
  suplementacao: [],
  bebedouros: [],
  movimentacao: [],
}

const cadernetasSlice = createSlice({
  name: 'cadernetas',
  initialState,
  reducers: {
    addRegistro: (
      state,
      action: PayloadAction<{ caderneta: keyof CadernetasState; registro: Registro }>
    ) => {
      state[action.payload.caderneta].push(action.payload.registro)
    },
    updateRegistro: (
      state,
      action: PayloadAction<{ caderneta: keyof CadernetasState; registro: Registro }>
    ) => {
      const { caderneta, registro } = action.payload
      const index = state[caderneta].findIndex((r) => r.id === registro.id)
      if (index !== -1) {
        state[caderneta][index] = registro
      }
    },
    removeRegistro: (
      state,
      action: PayloadAction<{ caderneta: keyof CadernetasState; id: string }>
    ) => {
      const { caderneta, id } = action.payload
      state[caderneta] = state[caderneta].filter((r) => r.id !== id)
    },
    markAsSynced: (
      state,
      action: PayloadAction<{ caderneta: keyof CadernetasState; id: string; googleRowId: number }>
    ) => {
      const { caderneta, id, googleRowId } = action.payload
      const registro = state[caderneta].find((r) => r.id === id)
      if (registro) {
        registro.syncStatus = 'synced'
        registro.googleRowId = googleRowId
      }
    },
  },
})

export const { addRegistro, updateRegistro, removeRegistro, markAsSynced } = cadernetasSlice.actions
export default cadernetasSlice.reducer
