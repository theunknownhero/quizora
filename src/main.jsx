import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './state/AppState.jsx'
import { SocialProvider } from './state/SocialState.jsx'
import './index.css'
import { loadConfig } from './lib/siteConfig.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

loadConfig().finally(() =>
  ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary label="QuizBit">
    <BrowserRouter>
      <AppProvider>
        <SocialProvider>
          <App />
        </SocialProvider>
      </AppProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
)
