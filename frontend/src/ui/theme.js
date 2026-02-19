import { createTheme } from "@mui/material/styles";


export function makeTheme(mode = 'light') {
    return createTheme({
        palette: {
            mode,
            primary: { main: '#1E5BB8' },
            secondary: { main: '#0F766E' },
            background: {
                default: mode === 'light' ? '#F3F6FB' : '#0B1020',
                paper: mode === 'light' ? '#FFFFFF' : '#111A33'
            }
        },
        shape: { borderRadius: 14 },
        typography: {
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
            h6: { fontWeight: 900 },
            subtitle1: { fontWeight: 800 }
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        border: mode === 'light' ? '1px solid rgba(15, 23, 42, 0.06)' : '1px solid rgba(148,163,184,0.12)'
                    }
                }
            },
            MuiAppBar: {
                styleOverrides: {
                    root: { backgroundImage: 'linear-gradient(90deg, #1E5BB8 0%, #164A94 45%, #0B2F6E 100%)' }
                }
            },
            MuiButton: {
                styleOverrides: { root: { textTransform: 'none', fontWeight: 800 } }
            }
        }
    })
}