import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FoundationScreen } from './app/screens/FoundationScreen'
import { MinigameLabScreen } from './app/screens/MinigameLabScreen'
import './style.css'
const rootElement = document.getElementById('root')
if (rootElement === null)
  throw new Error('Unable to find the application root.')
createRoot(rootElement).render(
  <StrictMode>
    {window.location.pathname === '/dev/minigames' ? (
      <MinigameLabScreen />
    ) : (
      <FoundationScreen />
    )}
  </StrictMode>,
)
