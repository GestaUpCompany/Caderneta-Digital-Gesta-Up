import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'
import configReducer from './slices/configSlice'
import syncReducer from './slices/syncSlice'
import cadernetasReducer from './slices/cadernetasSlice'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['config', 'cadernetas'],
}

const rootReducer = combineReducers({
  config: configReducer,
  sync: syncReducer,
  cadernetas: cadernetasReducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
