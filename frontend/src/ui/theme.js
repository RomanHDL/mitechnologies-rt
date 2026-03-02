import { createTheme } from "@mui/material/styles";

export function makeTheme(mode = 'light') {
    const isDark = mode === 'dark'

    return createTheme({
        palette: {
            mode,
            primary: {
                main: isDark ? '#42A5F5' : '#1565C0',
                light: isDark ? '#64B5F6' : '#1976D2',
                dark: isDark ? '#1E88E5' : '#0D47A1',
                contrastText: '#FFFFFF',
            },
            secondary: {
                main: isDark ? '#4DD0E1' : '#0288D1',
                contrastText: '#FFFFFF',
            },
            background: {
                default: isDark ? '#0D1B2A' : '#EFF4FF',
                paper: isDark ? '#132337' : '#FFFFFF',
            },
            divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.12)',
            text: {
                primary: isDark ? '#E2EAF4' : '#0A2540',
                secondary: isDark ? 'rgba(226,234,244,.72)' : '#546E7A',
            },
            success: { main: '#2E7D32', light: '#43A047' },
            warning: { main: '#E65100', light: '#EF6C00' },
            error:   { main: '#C62828', light: '#E53935' },
            info:    { main: isDark ? '#42A5F5' : '#0288D1' },
        },

        shape: { borderRadius: 16 },

        typography: {
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
            h6: { fontWeight: 900, letterSpacing: -0.2 },
            subtitle1: { fontWeight: 800 },
            subtitle2: { fontWeight: 900 },
            button: { fontWeight: 900 },
        },

        components: {
            // Fondo global con suave radial azul
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundImage: isDark
                            ? 'radial-gradient(1200px 600px at 10% 0%, rgba(66,165,245,.18), transparent 55%), radial-gradient(900px 500px at 90% 10%, rgba(77,208,225,.12), transparent 55%)'
                            : 'radial-gradient(1400px 700px at 0% 0%, rgba(21,101,192,.09), transparent 55%), radial-gradient(1000px 600px at 100% 100%, rgba(2,136,209,.07), transparent 55%)',
                    },
                },
            },

            // Cards / Paper estilo enterprise
            MuiPaper: {
                styleOverrides: {
                    root: {
                        border: isDark
                            ? '1px solid rgba(255,255,255,0.07)'
                            : '1px solid rgba(21,101,192,0.10)',
                        backgroundImage: isDark
                            ? 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
                            : 'none',
                        boxShadow: isDark
                            ? '0 18px 45px rgba(0,0,0,0.40)'
                            : '0 4px 16px rgba(21,101,192,0.07)',
                        backdropFilter: isDark ? 'blur(8px)' : 'none',
                    },
                },
            },

            // AppBar – gradiente azul profundo siempre
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 60%, #0A3880 100%)',
                        boxShadow: '0 4px 20px rgba(13,71,161,0.35)',
                        borderBottom: 'none',
                    },
                },
            },

            // Botones enterprise
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontWeight: 900,
                        borderRadius: 12,
                        letterSpacing: 0.2,
                    },
                    contained: {
                        boxShadow: isDark
                            ? '0 8px 24px rgba(66,165,245,.28)'
                            : '0 6px 18px rgba(21,101,192,.22)',
                        '&:hover': {
                            boxShadow: isDark
                                ? '0 12px 32px rgba(66,165,245,.36)'
                                : '0 10px 26px rgba(21,101,192,.32)',
                        },
                    },
                    outlined: {
                        borderWidth: '1.5px',
                        '&:hover': { borderWidth: '1.5px' },
                    },
                },
            },

            // TextFields elegantes
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(13,27,42,.60)' : '#FFFFFF',
                        transition: 'box-shadow .15s ease, border-color .15s ease',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? 'rgba(66,165,245,.35)' : 'rgba(21,101,192,.40)',
                        },
                        '&.Mui-focused': {
                            boxShadow: isDark
                                ? '0 0 0 4px rgba(66,165,245,.18)'
                                : '0 0 0 4px rgba(21,101,192,.14)',
                        },
                    },
                    notchedOutline: {
                        borderColor: isDark ? 'rgba(255,255,255,.10)' : 'rgba(21,101,192,.22)',
                    },
                },
            },

            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        fontWeight: 700,
                        color: isDark ? 'rgba(226,234,244,0.7)' : '#546E7A',
                        '&.Mui-focused': {
                            color: isDark ? '#42A5F5' : '#1565C0',
                        },
                    },
                },
            },

            // Chips pro
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 999,
                        fontWeight: 900,
                    },
                    outlined: {
                        borderColor: isDark ? 'rgba(255,255,255,.18)' : 'rgba(21,101,192,.25)',
                    },
                    colorPrimary: {
                        backgroundColor: isDark ? 'rgba(66,165,245,.18)' : 'rgba(21,101,192,.10)',
                        color: isDark ? '#64B5F6' : '#1565C0',
                    },
                },
            },

            MuiDivider: {
                styleOverrides: {
                    root: {
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(21,101,192,0.12)',
                    },
                },
            },

            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        borderRadius: 10,
                        fontSize: 12,
                        padding: '8px 12px',
                        backgroundColor: isDark ? '#132337' : '#0A2540',
                        border: isDark ? '1px solid rgba(255,255,255,.08)' : 'none',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                    },
                },
            },

            // Tablas enterprise
            MuiTableHead: {
                styleOverrides: {
                    root: {
                        '& .MuiTableCell-head': {
                            backgroundColor: isDark
                                ? 'rgba(21,101,192,.12)'
                                : 'rgba(21,101,192,.06)',
                            color: isDark ? '#64B5F6' : '#1565C0',
                            fontWeight: 900,
                            fontSize: 12,
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                        },
                    },
                },
            },

            MuiTableRow: {
                styleOverrides: {
                    root: {
                        '&:hover': {
                            backgroundColor: isDark
                                ? 'rgba(66,165,245,.05)'
                                : 'rgba(21,101,192,.04)',
                        },
                    },
                },
            },

            MuiTableCell: {
                styleOverrides: {
                    root: {
                        borderBottom: isDark
                            ? '1px solid rgba(255,255,255,0.06)'
                            : '1px solid rgba(21,101,192,0.08)',
                    },
                },
            },

            // Dialogs con borde azul
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        backgroundImage: 'none',
                        border: isDark
                            ? '1px solid rgba(255,255,255,0.10)'
                            : '1px solid rgba(21,101,192,0.15)',
                        boxShadow: isDark
                            ? '0 25px 60px rgba(0,0,0,0.50)'
                            : '0 20px 50px rgba(21,101,192,0.15)',
                    },
                },
            },

            MuiSwitch: {
                styleOverrides: {
                    track: {
                        backgroundColor: isDark
                            ? 'rgba(255,255,255,.20)'
                            : 'rgba(21,101,192,.20)',
                    },
                },
            },

            MuiAlert: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        fontWeight: 700,
                    },
                },
            },
        },
    })
}
