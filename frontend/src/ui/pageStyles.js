/* ─────────────────────────────────────────────
   Shared page-level styles – Enterprise Slate
   Import: import { usePageStyles } from '../ui/pageStyles'
   Usage:  const ps = usePageStyles()
   ───────────────────────────────────────────── */

import { useTheme, alpha } from '@mui/material/styles'

export function usePageStyles() {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'

  // Reusable palette tokens
  const border = d ? 'rgba(255,255,255,0.06)' : theme.palette.divider
  const subtleBg = d ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'

  return {
    isDark: d,

    /* ── Page wrapper ── */
    page: {
      minHeight: 'calc(100vh - 120px)',
    },

    /* ── Page header ── */
    pageTitle: {
      fontWeight: 700,
      letterSpacing: -0.3,
      color: 'text.primary',
      fontSize: { xs: '1.25rem', sm: '1.5rem' },
    },

    pageSubtitle: {
      color: 'text.secondary',
      fontSize: 13,
      fontWeight: 500,
      mt: 0.25,
    },

    /* ── Card wrapper ── */
    card: {
      borderRadius: 2,
      overflow: 'hidden',
    },

    /* ── Card header (subtle top bar) ── */
    cardHeader: {
      px: 2,
      py: 1.25,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      background: d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
      borderBottom: `1px solid ${border}`,
    },

    cardHeaderTitle: {
      fontWeight: 600,
      color: 'text.primary',
      fontSize: '0.875rem',
    },

    cardHeaderSubtitle: {
      fontSize: 12,
      color: 'text.secondary',
    },

    /* ── Table header row ── */
    tableHeaderRow: {
      '& .MuiTableCell-head': {
        backgroundColor: d ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)',
        color: d ? 'rgba(148,163,184,1)' : 'rgba(71,85,105,1)',
        fontWeight: 600,
        fontSize: '0.6875rem',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      },
    },

    /* ── Table body row ── */
    tableRow: (idx) => ({
      transition: 'background .1s ease',
      '&:hover': {
        backgroundColor: d ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.015)',
      },
    }),

    /* ── Table cell text ── */
    cellText: {
      color: 'text.primary',
      fontSize: '0.8125rem',
    },

    cellTextSecondary: {
      color: 'text.secondary',
      fontSize: '0.8125rem',
    },

    /* ── Text input style ── */
    inputSx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: d ? 'rgba(255,255,255,.03)' : '#FFFFFF',
      },
    },

    /* ── Status chips ── */
    statusChip: (status) => {
      const map = {
        PENDIENTE:   { bg: d ? 'rgba(245,158,11,.10)' : '#FFFBEB', color: d ? '#FCD34D' : '#B45309', border: d ? 'rgba(245,158,11,.18)' : '#FDE68A' },
        'EN PROCESO':{ bg: d ? 'rgba(59,130,246,.10)' : '#EFF6FF', color: d ? '#93C5FD' : '#1D4ED8', border: d ? 'rgba(59,130,246,.18)' : '#BFDBFE' },
        COMPLETADA:  { bg: d ? 'rgba(34,197,94,.10)'  : '#F0FDF4', color: d ? '#86EFAC' : '#15803D', border: d ? 'rgba(34,197,94,.18)' : '#BBF7D0' },
        CANCELADA:   { bg: d ? 'rgba(239,68,68,.10)'  : '#FEF2F2', color: d ? '#FCA5A5' : '#B91C1C', border: d ? 'rgba(239,68,68,.18)' : '#FECACA' },
        PROCESADO:   { bg: d ? 'rgba(34,197,94,.10)'  : '#F0FDF4', color: d ? '#86EFAC' : '#15803D', border: d ? 'rgba(34,197,94,.18)' : '#BBF7D0' },
        DISPONIBLE:  { bg: d ? 'rgba(34,197,94,.08)'  : '#F0FDF4', color: d ? '#86EFAC' : '#15803D', border: d ? 'rgba(34,197,94,.15)' : '#BBF7D0' },
        BLOQUEADA:   { bg: d ? 'rgba(239,68,68,.08)'  : '#FEF2F2', color: d ? '#FCA5A5' : '#B91C1C', border: d ? 'rgba(239,68,68,.15)' : '#FECACA' },
        OCUPADA:     { bg: d ? 'rgba(59,130,246,.08)' : '#EFF6FF', color: d ? '#93C5FD' : '#1D4ED8', border: d ? 'rgba(59,130,246,.15)' : '#BFDBFE' },
      }
      const s = map[status] || map['PENDIENTE']
      return {
        bgcolor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontWeight: 600,
      }
    },

    /* ── Metric chip ── */
    metricChip: (tone = 'default') => {
      const tones = {
        default: { bg: d ? 'rgba(255,255,255,.05)' : '#F8FAFC', color: d ? '#E2E8F0' : '#334155', border: d ? 'rgba(255,255,255,.08)' : '#E2E8F0' },
        warn:    { bg: d ? 'rgba(245,158,11,.08)' : '#FFFBEB', color: d ? '#FCD34D' : '#B45309', border: d ? 'rgba(245,158,11,.15)' : '#FDE68A' },
        info:    { bg: d ? 'rgba(59,130,246,.08)' : '#EFF6FF', color: d ? '#93C5FD' : '#1D4ED8', border: d ? 'rgba(59,130,246,.15)' : '#BFDBFE' },
        ok:      { bg: d ? 'rgba(34,197,94,.08)' : '#F0FDF4', color: d ? '#86EFAC' : '#15803D', border: d ? 'rgba(34,197,94,.15)' : '#BBF7D0' },
        bad:     { bg: d ? 'rgba(239,68,68,.08)' : '#FEF2F2', color: d ? '#FCA5A5' : '#B91C1C', border: d ? 'rgba(239,68,68,.15)' : '#FECACA' },
      }
      const t = tones[tone] || tones.default
      return {
        fontWeight: 600,
        borderRadius: '6px',
        height: 28,
        bgcolor: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
      }
    },

    /* ── Action icon buttons ── */
    actionBtn: (color = 'primary') => {
      const colors = {
        primary: { c: d ? '#93C5FD' : '#1D4ED8', bg: d ? 'rgba(59,130,246,.08)' : 'rgba(29,78,216,.05)', border: d ? 'rgba(59,130,246,.15)' : 'rgba(29,78,216,.12)' },
        success: { c: d ? '#86EFAC' : '#15803D', bg: d ? 'rgba(34,197,94,.08)' : 'rgba(21,128,61,.05)', border: d ? 'rgba(34,197,94,.15)' : 'rgba(21,128,61,.12)' },
        error:   { c: d ? '#FCA5A5' : '#B91C1C', bg: d ? 'rgba(239,68,68,.08)' : 'rgba(185,28,28,.05)', border: d ? 'rgba(239,68,68,.15)' : 'rgba(185,28,28,.12)' },
        warning: { c: d ? '#FCD34D' : '#B45309', bg: d ? 'rgba(245,158,11,.08)' : 'rgba(180,83,9,.05)', border: d ? 'rgba(245,158,11,.15)' : 'rgba(180,83,9,.12)' },
      }
      const s = colors[color] || colors.primary
      return {
        color: s.c,
        borderRadius: 1.5,
        border: `1px solid ${s.border}`,
        bgcolor: s.bg,
        '&:hover': { bgcolor: alpha(s.c, 0.1) },
      }
    },

    /* ── Filter bar wrapper ── */
    filterBar: {
      px: 2,
      py: 1.25,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 1.25,
      alignItems: 'center',
      borderBottom: `1px solid ${border}`,
    },

    /* ── KPI card ── */
    kpiCard: (accent = 'blue') => {
      const accents = {
        blue:  { border: d ? 'rgba(59,130,246,.15)' : '#DBEAFE', shadow: 'transparent' },
        green: { border: d ? 'rgba(34,197,94,.15)' : '#D1FAE5', shadow: 'transparent' },
        red:   { border: d ? 'rgba(239,68,68,.15)' : '#FEE2E2', shadow: 'transparent' },
        amber: { border: d ? 'rgba(245,158,11,.15)' : '#FEF3C7', shadow: 'transparent' },
      }
      const a = accents[accent] || accents.blue
      return {
        p: 2,
        borderRadius: 2,
        height: '100%',
        border: `1px solid ${a.border}`,
        transition: 'border-color .15s ease',
        '&:hover': {
          borderColor: d ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)',
        },
      }
    },

    /* ── Progress bar ── */
    progressBar: {
      height: 6,
      borderRadius: 999,
      bgcolor: d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
      overflow: 'hidden',
    },

    progressFill: (pct, color = '#1D4ED8') => ({
      height: '100%',
      width: `${Math.max(0, Math.min(100, pct))}%`,
      borderRadius: 999,
      bgcolor: d ? '#60A5FA' : color,
      transition: 'width .4s ease',
    }),

    /* ── Empty state ── */
    emptyText: {
      color: 'text.secondary',
      textAlign: 'center',
      py: 4,
      fontSize: '0.875rem',
    },

    /* ── Auth pages (login, register, forgot) ── */
    authBackground: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      bgcolor: d ? '#020617' : '#F1F5F9',
    },

    authCard: {
      width: '100%',
      maxWidth: 420,
      p: { xs: 3, sm: 4 },
      borderRadius: 2.5,
      bgcolor: d ? 'rgba(15,23,42,.95)' : '#FFFFFF',
      border: `1px solid ${d ? 'rgba(255,255,255,.06)' : '#E2E8F0'}`,
      boxShadow: d
        ? '0 8px 32px rgba(0,0,0,.40)'
        : '0 4px 24px rgba(0,0,0,0.06)',
    },

    authInput: {
      '& .MuiInputBase-root': {
        background: d ? 'rgba(255,255,255,.03)' : '#FFFFFF',
      },
    },
  }
}
