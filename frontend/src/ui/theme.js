import { createTheme } from "@mui/material/styles";

/* ─────────────────────────────────────────────
   MyTechnologies – Enterprise Blue & White Theme
   Responsive, consistent, professional.
   ───────────────────────────────────────────── */

// Brand palette
const BLUE = {
  900: '#0A2540',
  800: '#0D3B66',
  700: '#0D47A1',
  600: '#1565C0',
  500: '#1976D2',
  400: '#42A5F5',
  300: '#64B5F6',
  200: '#90CAF9',
  100: '#BBDEFB',
  50:  '#E3F2FD',
}

export function makeTheme(mode = 'light') {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary: {
        main:  isDark ? BLUE[400] : BLUE[600],
        light: isDark ? BLUE[300] : BLUE[500],
        dark:  isDark ? BLUE[500] : BLUE[700],
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#4DD0E1' : '#0288D1',
        contrastText: '#FFFFFF',
      },
      background: {
        default: isDark ? '#0B1929' : '#F4F7FC',
        paper:   isDark ? '#112240' : '#FFFFFF',
      },
      divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,59,102,0.10)',
      text: {
        primary:   isDark ? '#E8EDF4' : BLUE[900],
        secondary: isDark ? 'rgba(232,237,244,0.70)' : '#546E7A',
      },
      success: { main: '#2E7D32', light: '#43A047' },
      warning: { main: '#E65100', light: '#EF6C00' },
      error:   { main: '#C62828', light: '#E53935' },
      info:    { main: isDark ? BLUE[400] : '#0288D1' },
    },

    shape: { borderRadius: 12 },

    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      h4: { fontWeight: 800, letterSpacing: -0.5 },
      h5: { fontWeight: 800, letterSpacing: -0.3 },
      h6: { fontWeight: 800, letterSpacing: -0.2 },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 800 },
      button: { fontWeight: 700, textTransform: 'none' },
      body2: { fontSize: '0.8125rem' },
    },

    components: {
      /* ── Global baseline ── */
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? 'radial-gradient(ellipse 1200px 600px at 10% 0%, rgba(66,165,245,.12), transparent 55%)'
              : 'radial-gradient(ellipse 1400px 700px at 0% 0%, rgba(21,101,192,.06), transparent 55%)',
          },
        },
      },

      /* ── Paper / Cards ── */
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(13,59,102,0.08)',
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.30)'
              : '0 1px 4px rgba(13,59,102,0.06), 0 4px 16px rgba(13,59,102,0.04)',
          },
        },
      },

      /* ── AppBar ── */
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? `linear-gradient(135deg, ${BLUE[900]} 0%, #0B1929 100%)`
              : `linear-gradient(135deg, ${BLUE[600]} 0%, ${BLUE[700]} 60%, ${BLUE[900]} 100%)`,
            boxShadow: isDark
              ? '0 2px 12px rgba(0,0,0,0.40)'
              : '0 2px 16px rgba(13,59,102,0.20)',
            borderBottom: 'none',
          },
        },
      },

      /* ── Buttons ── */
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 10,
            letterSpacing: 0.2,
            padding: '8px 20px',
          },
          contained: {
            boxShadow: isDark
              ? '0 4px 16px rgba(66,165,245,.20)'
              : '0 2px 8px rgba(21,101,192,.18)',
            '&:hover': {
              boxShadow: isDark
                ? '0 6px 20px rgba(66,165,245,.28)'
                : '0 4px 14px rgba(21,101,192,.25)',
            },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': { borderWidth: '1.5px' },
          },
        },
      },

      /* ── Inputs ── */
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: isDark ? 'rgba(11,25,41,.60)' : '#FFFFFF',
            transition: 'box-shadow .15s ease, border-color .15s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(66,165,245,.35)' : BLUE[400],
            },
            '&.Mui-focused': {
              boxShadow: isDark
                ? `0 0 0 3px rgba(66,165,245,.15)`
                : `0 0 0 3px rgba(21,101,192,.10)`,
            },
          },
          notchedOutline: {
            borderColor: isDark ? 'rgba(255,255,255,.10)' : 'rgba(13,59,102,0.18)',
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            color: isDark ? 'rgba(232,237,244,0.65)' : '#546E7A',
            '&.Mui-focused': {
              color: isDark ? BLUE[400] : BLUE[600],
            },
          },
        },
      },

      /* ── Chips ── */
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.75rem',
          },
          colorPrimary: {
            backgroundColor: isDark ? 'rgba(66,165,245,.15)' : BLUE[50],
            color: isDark ? BLUE[300] : BLUE[600],
          },
        },
      },

      /* ── Divider ── */
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(13,59,102,0.08)',
          },
        },
      },

      /* ── Tooltip ── */
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: 12,
            padding: '6px 12px',
            backgroundColor: isDark ? '#112240' : BLUE[900],
            boxShadow: '0 4px 14px rgba(0,0,0,0.20)',
          },
        },
      },

      /* ── Tables ── */
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? 'rgba(17,34,64,.80)' : BLUE[50],
              color: isDark ? BLUE[200] : BLUE[700],
              fontWeight: 800,
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              borderBottom: isDark
                ? '1px solid rgba(255,255,255,0.06)'
                : `2px solid ${BLUE[100]}`,
            },
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:nth-of-type(even)': {
              backgroundColor: isDark ? 'rgba(255,255,255,.02)' : 'rgba(13,59,102,.02)',
            },
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(66,165,245,.06)'
                : 'rgba(21,101,192,.04)',
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: isDark
              ? '1px solid rgba(255,255,255,0.05)'
              : '1px solid rgba(13,59,102,0.06)',
            fontSize: '0.8125rem',
          },
        },
      },

      /* ── Dialog ── */
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            border: isDark
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(13,59,102,0.10)',
            boxShadow: isDark
              ? '0 20px 50px rgba(0,0,0,0.45)'
              : '0 16px 48px rgba(13,59,102,0.12)',
          },
        },
      },

      /* ── Switch ── */
      MuiSwitch: {
        styleOverrides: {
          track: {
            backgroundColor: isDark
              ? 'rgba(255,255,255,.18)'
              : 'rgba(13,59,102,.18)',
          },
        },
      },

      /* ── Alert ── */
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
          },
        },
      },

      /* ── Drawer for mobile nav ── */
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: isDark
              ? `linear-gradient(180deg, ${BLUE[900]}, #0B1929)`
              : `linear-gradient(180deg, ${BLUE[600]}, ${BLUE[800]})`,
            color: '#FFFFFF',
            borderRight: 'none',
          },
        },
      },
    },
  })
}
