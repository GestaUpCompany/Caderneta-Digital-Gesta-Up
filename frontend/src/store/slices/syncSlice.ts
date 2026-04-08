import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'conflict' | 'error'

interface SyncState {
  status: SyncStatus
  pendingCount: number
  lastSync: string | null
  syncProgress: number
  errorMessage: string | null
}

const initialState: SyncState = {
  status: 'offline',
  pendingCount: 0,
  lastSync: null,
  syncProgress: 0,
  errorMessage: null,
}

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<SyncStatus>) => {
      state.status = action.payload
    },
    setPendingCount: (state, action: PayloadAction<number>) => {
      state.pendingCount = action.payload
    },
    incrementPending: (state) => {
      state.pendingCount += 1
    },
    decrementPending: (state) => {
      state.pendingCount = Math.max(0, state.pendingCount - 1)
    },
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload
    },
    setSyncProgress: (state, action: PayloadAction<number>) => {
      state.syncProgress = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.errorMessage = action.payload
    },
  },
})

export const {
  setStatus,
  setPendingCount,
  incrementPending,
  decrementPending,
  setLastSync,
  setSyncProgress,
  setError,
} = syncSlice.actions

export default syncSlice.reducer
