import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './ui/styles/global.css'
import { usePersistentStore } from './state/persistentStore'
import { useDungeonStore } from './state/dungeonStore'
import { useUiStore } from './state/uiStore'

// Exposes the game's state stores for local debugging / QA scripting. This
// is an offline single-player prototype with no auth or remote data, so
// there's no security concern in always attaching this.
declare global {
  interface Window {
    __thoth?: {
      usePersistentStore: typeof usePersistentStore
      useDungeonStore: typeof useDungeonStore
      useUiStore: typeof useUiStore
    }
  }
}
window.__thoth = { usePersistentStore, useDungeonStore, useUiStore }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
