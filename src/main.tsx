import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FoundationScreen } from './app/screens/FoundationScreen'
import './style.css'
const rootElement = document.getElementById('root')
if (rootElement === null)
  throw new Error('Unable to find the application root.')
createRoot(rootElement).render(
  <StrictMode>
    <FoundationScreen />
  </StrictMode>,
)
