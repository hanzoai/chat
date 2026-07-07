import '@hanzogui/core/reset.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GuiProvider } from '@hanzo/gui'
import config from '../gui.config'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('root element missing')

// Dark by default — a chat surface reads best on a dark ground, and it matches
// the index.html background so there is no first-paint flash.
createRoot(root).render(
  <StrictMode>
    <GuiProvider config={config} defaultTheme="dark">
      <App />
    </GuiProvider>
  </StrictMode>,
)
