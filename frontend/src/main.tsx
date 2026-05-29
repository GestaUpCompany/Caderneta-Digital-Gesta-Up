import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store/store'
import App from './App'
import { registerServiceWorker } from './serviceWorkerRegistration'
import { startTokenRefresh } from './services/supabaseClient'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
)

// Registrar Service Worker
registerServiceWorker()

// Iniciar refresh automático do token Supabase
startTokenRefresh()
