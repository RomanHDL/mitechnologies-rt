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
          background: '#F8FAFC', padding: 24,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10, background: '#DC2626',
              display: 'grid', placeItems: 'center', margin: '0 auto 16px',
              color: 'white', fontWeight: 700, fontSize: 18,
            }}>!</div>
            <h2 style={{ color: '#0F172A', fontWeight: 700, margin: '0 0 8px', fontSize: 20 }}>
              Error inesperado
            </h2>
            <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
              Ocurrio un problema al cargar la aplicacion. Intenta recargar la pagina.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#1D4ED8', color: 'white', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontWeight: 600,
                fontSize: 14, cursor: 'pointer',
              }}
            >
              Recargar pagina
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
