import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './state/AppState.jsx'
import { SocialProvider } from './state/SocialState.jsx'
import './index.css'
import { loadConfig } from './lib/siteConfig.js'

loadConfig().finally(() =>
  ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <SocialProvider>
          <App />
        </SocialProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)
)
