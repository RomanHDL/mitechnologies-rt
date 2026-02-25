import { createTheme } from "@mui/material/styles";

export function makeTheme(mode = 'light') {
    const isDark = mode === 'dark'

    return createTheme({
        palette: {
            mode,
            primary: { main: '#1E5BB8' },
            secondary: { main: '#0F766E' },
            background: {
                default: isDark ? '#0B1020' : '#F3F6FB',
                paper: isDark ? '#0F172A' : '#FFFFFF',
            },
            divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.08)',
            text: {
                primary: isDark ? '#E5E7EB' : '#0F172A',
                secondary: isDark ? 'rgba(229,231,235,.72)' : 'rgba(15,23,42,.72)',
            }
        },

        shape: { borderRadius: 16 },

        typography: {
            fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
            h6: { fontWeight: 900, letterSpacing: -0.2 },
            subtitle1: { fontWeight: 800 },
            subtitle2: { fontWeight: 900 },
            button: { fontWeight: 900 }
        },

        components: {
            // ✅ Fondo general
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundImage: isDark ?
                            'radial-gradient(1200px 600px at 10% 0%, rgba(30,91,184,.25), transparent 55%), radial-gradient(900px 500px at 90% 10%, rgba(15,118,110,.18), transparent 55%)' : 'none',
                    }
                }
            },

            // ✅ Paper estilo "glass enterprise"
            MuiPaper: {
                styleOverrides: {
                    root: {
                        border: isDark ?
                            '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15, 23, 42, 0.06)',
                        backgroundImage: isDark ?
                            'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : 'none',
                        boxShadow: isDark ?
                            '0 18px 45px rgba(0,0,0,0.35)' : '0 12px 30px rgba(15,23,42,0.06)',
                        backdropFilter: isDark ? 'blur(8px)' : 'none'
                    }
                }
            },

            // ✅ AppBar como ya lo tenías, un poco más pro
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'linear-gradient(90deg, #1E5BB8 0%, #164A94 45%, #0B2F6E 100%)',
                        borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.06)',
                    }
                }
            },

            // ✅ Botones enterprise
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontWeight: 900,
                        borderRadius: 12
                    },
                    contained: {
                        boxShadow: isDark ? '0 14px 30px rgba(30,91,184,.25)' : '0 10px 22px rgba(30,91,184,.18)',
                    }
                }
            },

            // ✅ Inputs oscuros bonitos (TextField)
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(0,0,0,.18)' : '#fff',
                        transition: 'box-shadow .15s ease, border-color .15s ease',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? 'rgba(255,255,255,.16)' : 'rgba(15,23,42,.16)',
                        },
                        '&.Mui-focused': {
                            boxShadow: isDark ? '0 0 0 4px rgba(30,91,184,.20)' : '0 0 0 4px rgba(30,91,184,.15)',
                        }
                    },
                    notchedOutline: {
                        borderColor: isDark ? 'rgba(255,255,255,.10)' : 'rgba(15,23,42,.12)',
                    }
                }
            },

            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        fontWeight: 800,
                        opacity: 0.9
                    }
                }
            },

            // ✅ Chips más pro
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 999,
                        fontWeight: 900
                    }
                }
            },

            // ✅ Divider suave
            MuiDivider: {
                styleOverrides: {
                    root: {
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
                    }
                }
            },

            // ✅ Tooltip más elegante
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        borderRadius: 12,
                        fontSize: 12,
                        padding: '10px 12px',
                        backgroundColor: isDark ? 'rgba(15,23,42,.92)' : 'rgba(15,23,42,.92)',
                        border: '1px solid rgba(255,255,255,.08)'
                    }
                }
            }
        }
    })
}