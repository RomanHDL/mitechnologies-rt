import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './state/auth'
import { UiProvider, useUi } from './state/ui'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import GlobalStyles from '@mui/material/GlobalStyles'
import { makeTheme } from './ui/theme'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'

/* ── ErrorBoundary: catches render crashes ── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif',
          background: '#F4F7FC', padding: 24,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, background: '#C62828',
              display: 'grid', placeItems: 'center', margin: '0 auto 16px',
              color: 'white', fontWeight: 800, fontSize: 20,
            }}>!</div>
            <h2 style={{ color: '#0A2540', fontWeight: 800, margin: '0 0 8px' }}>
              Error inesperado
            </h2>
            <p style={{ color: '#546E7A', fontSize: 14, margin: '0 0 20px' }}>
              Ocurrió un problema al cargar la aplicación.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#1565C0', color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 28px', fontWeight: 700,
                fontSize: 14, cursor: 'pointer',
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ThemedApp() {
  const { mode } = useUi()
  const theme = makeTheme(mode)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{
        body: { background: theme.palette.background.default },
        a: { color: 'inherit' }
      }} />
      <App />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <UiProvider>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </UiProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
