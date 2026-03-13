import { createTheme } from "@mui/material/styles";

/* ─────────────────────────────────────────────
   MiTechnologies WMS — Enterprise Slate Theme
   Neutral tones + blue accent. Clean, flat, scannable.
   Optimized for daily warehouse operations.
   ───────────────────────────────────────────── */

// Brand blue (accent)
const BLUE = {
  900: '#0F172A',
  800: '#1E293B',
  700: '#0D47A1',
  600: '#1565C0',
  500: '#1976D2',
  400: '#42A5F5',
  300: '#64B5F6',
  200: '#90CAF9',
  100: '#BBDEFB',
  50:  '#EFF6FF',
}

// Neutral slate (structure & text)
const SLATE = {
  950: '#020617',
  900: '#0F172A',
  800: '#1E293B',
  700: '#334155',
  600: '#475569',
  500: '#64748B',
  400: '#94A3B8',
  300: '#CBD5E1',
  200: '#E2E8F0',
  100: '#F1F5F9',
  50:  '#F8FAFC',
}

export function makeTheme(mode = 'light') {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary: {
        main:  isDark ? BLUE[400] : BLUE[600],
        light: isDark ? BLUE[300] : BLUE[400],
        dark:  isDark ? BLUE[500] : BLUE[700],
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#4DD0E1' : '#0288D1',
        contrastText: '#FFFFFF',
      },
      background: {
        default: isDark ? SLATE[950] : SLATE[50],
        paper:   isDark ? SLATE[900] : '#FFFFFF',
      },
      divider: isDark ? 'rgba(255,255,255,0.06)' : SLATE[200],
      text: {
        primary:   isDark ? SLATE[100] : SLATE[900],
        secondary: isDark ? SLATE[400] : SLATE[500],
      },
      success: { main: '#16A34A', light: '#22C55E' },
      warning: { main: '#D97706', light: '#F59E0B' },
      error:   { main: '#DC2626', light: '#EF4444' },
      info:    { main: isDark ? BLUE[400] : BLUE[500] },
    },

    shape: { borderRadius: 8 },

    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      h4: { fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.2 },
      h5: { fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.3 },
      h6: { fontWeight: 700, letterSpacing: -0.1, lineHeight: 1.3 },
      subtitle1: { fontWeight: 600, lineHeight: 1.4 },
      subtitle2: { fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.4 },
      body1: { fontSize: '0.875rem', lineHeight: 1.5 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0.1 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4, color: isDark ? SLATE[400] : SLATE[500] },
    },

    components: {
      /* ── Global baseline ── */
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? SLATE[950] : SLATE[50],
          },
          '::-webkit-scrollbar': { width: 6 },
          '::-webkit-scrollbar-track': { background: 'transparent' },
          '::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)',
            borderRadius: 3,
          },
        },
      },

      /* ── Paper / Cards ── */
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : SLATE[200]}`,
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.30)'
              : '0 1px 2px rgba(0,0,0,0.04), 0 1px 5px rgba(0,0,0,0.02)',
          },
        },
      },

      /* ── AppBar ── */
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none',
          },
        },
      },

      /* ── Buttons ── */
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            letterSpacing: 0.1,
            padding: '7px 16px',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: isDark
                ? '0 2px 8px rgba(66,165,245,.20)'
                : '0 1px 4px rgba(21,101,192,.15)',
            },
          },
          outlined: {
            borderWidth: '1px',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : SLATE[300],
            '&:hover': {
              borderWidth: '1px',
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : SLATE[50],
            },
          },
          sizeSmall: {
            padding: '4px 12px',
            fontSize: '0.8125rem',
          },
          sizeLarge: {
            padding: '10px 24px',
            fontSize: '0.9375rem',
          },
        },
      },

      /* ── Inputs ── */
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,.03)' : '#FFFFFF',
            transition: 'box-shadow .15s ease, border-color .15s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(66,165,245,.30)' : SLATE[400],
            },
            '&.Mui-focused': {
              boxShadow: isDark
                ? '0 0 0 2px rgba(66,165,245,.12)'
                : '0 0 0 2px rgba(21,101,192,.08)',
            },
          },
          notchedOutline: {
            borderColor: isDark ? 'rgba(255,255,255,.10)' : SLATE[300],
          },
          input: {
            fontSize: '0.875rem',
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            fontSize: '0.875rem',
            color: isDark ? SLATE[400] : SLATE[500],
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
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.75rem',
            height: 24,
          },
          colorPrimary: {
            backgroundColor: isDark ? 'rgba(66,165,245,.12)' : BLUE[50],
            color: isDark ? BLUE[300] : BLUE[600],
          },
          sizeSmall: {
            height: 22,
            fontSize: '0.6875rem',
          },
        },
      },

      /* ── Divider ── */
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : SLATE[200],
          },
        },
      },

      /* ── Tooltip ── */
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            padding: '5px 10px',
            backgroundColor: isDark ? SLATE[800] : SLATE[800],
            color: SLATE[100],
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : SLATE[700]}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          arrow: {
            color: SLATE[800],
          },
        },
      },

      /* ── Tables ── */
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? 'rgba(255,255,255,.03)' : SLATE[50],
              color: isDark ? SLATE[400] : SLATE[600],
              fontWeight: 600,
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : SLATE[200]}`,
              padding: '10px 16px',
            },
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(255,255,255,.02)'
                : 'rgba(0,0,0,.015)',
            },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : SLATE[100]}`,
            fontSize: '0.8125rem',
            padding: '10px 16px',
          },
        },
      },

      /* ── Dialog ── */
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : SLATE[200]}`,
            boxShadow: isDark
              ? '0 16px 48px rgba(0,0,0,0.50)'
              : '0 12px 36px rgba(0,0,0,0.10)',
          },
        },
      },

      /* ── Switch ── */
      MuiSwitch: {
        styleOverrides: {
          track: {
            backgroundColor: isDark ? SLATE[700] : SLATE[300],
          },
        },
      },

      /* ── Alert ── */
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            fontSize: '0.8125rem',
            border: '1px solid',
          },
          standardError: {
            borderColor: isDark ? 'rgba(239,68,68,.20)' : 'rgba(239,68,68,.15)',
          },
          standardSuccess: {
            borderColor: isDark ? 'rgba(34,197,94,.20)' : 'rgba(34,197,94,.15)',
          },
          standardWarning: {
            borderColor: isDark ? 'rgba(245,158,11,.20)' : 'rgba(245,158,11,.15)',
          },
          standardInfo: {
            borderColor: isDark ? 'rgba(59,130,246,.20)' : 'rgba(59,130,246,.15)',
          },
        },
      },

      /* ── Drawer for mobile nav ── */
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? SLATE[900] : SLATE[900],
            color: '#FFFFFF',
            borderRight: 'none',
          },
        },
      },

      /* ── Tabs ── */
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            minHeight: 40,
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 2,
            borderRadius: 1,
          },
        },
      },

      /* ── Select ── */
      MuiSelect: {
        styleOverrides: {
          select: {
            fontSize: '0.875rem',
          },
        },
      },

      /* ── Linear Progress ── */
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 6,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : SLATE[100],
          },
        },
      },
    },
  })
}
