/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App'
import { Toaster } from 'solid-toast'

const root = document.getElementById('root')

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  )
}

render(() => (
  <>
    <App />
    <Toaster 
      position="bottom-right"
      containerClassName="toast-container"
      toastOptions={{
        className: 'toast-custom',
        duration: 4000,
        style: {
          background: 'var(--toast-bg)',
          color: 'var(--toast-text)',
          border: '1px solid var(--toast-border)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
        }
      }}
    />
  </>
), root!)