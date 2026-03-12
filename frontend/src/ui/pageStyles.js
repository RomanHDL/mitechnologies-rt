/* ─────────────────────────────────────────────
   Shared page-level styles – Enterprise Blue/White
   Import: import { usePageStyles } from '../ui/pageStyles'
   Usage:  const ps = usePageStyles()
   ───────────────────────────────────────────── */

import { useTheme } from '@mui/material/styles'

export function usePageStyles() {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'

  return {
    isDark: d,

    /* ── Page wrapper ── */
    page: {
      minHeight: 'calc(100vh - 140px)',
    },

    /* ── Page header ── */
    pageTitle: {
      fontWeight: 800,
      letterSpacing: -0.3,
      color: 'text.primary',
    },

    pageSubtitle: {
      color: 'text.secondary',
      fontSize: 13,
      fontWeight: 600,
    },

    /* ── Card wrapper ── */
    card: {
      borderRadius: 3,
      overflow: 'hidden',
    },

    /* ── Card header (colored bar) ── */
    cardHeader: {
      px: 2.5,
      py: 1.5,
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      background: d
        ? 'linear-gradient(90deg, rgba(66,165,245,.10), rgba(66,165,245,.03))'
        : `linear-gradient(90deg, rgba(21,101,192,.06), rgba(21,101,192,.02))`,
      borderBottom: d
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid rgba(13,59,102,0.06)',
    },

    cardHeaderTitle: {
      fontWeight: 800,
      color: 'text.primary',
    },

    cardHeaderSubtitle: {
      fontSize: 12,
      color: 'text.secondary',
    },

    /* ── Table header row ── */
    tableHeaderRow: {
      '& .MuiTableCell-head': {
        backgroundColor: d ? 'rgba(17,34,64,.65)' : 'rgba(21,101,192,.05)',
        color: d ? '#90CAF9' : '#0D47A1',
        fontWeight: 800,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      },
    },

    /* ── Table body row ── */
    tableRow: (idx) => ({
      transition: 'background .12s ease',
      backgroundColor: idx % 2 === 0
        ? 'transparent'
        : (d ? 'rgba(255,255,255,.02)' : 'rgba(13,59,102,.02)'),
      '&:hover': {
        backgroundColor: d ? 'rgba(66,165,245,.06)' : 'rgba(21,101,192,.04)',
      },
    }),

    /* ── Table cell text ── */
    cellText: {
      color: 'text.primary',
    },

    cellTextSecondary: {
      color: 'text.secondary',
    },

    /* ── Text input style (for forms inside cards) ── */
    inputSx: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: d ? 'rgba(11,25,41,.50)' : '#FFFFFF',
      },
    },

    /* ── Status chips ── */
    statusChip: (status) => {
      const map = {
        PENDIENTE:   { bg: d ? 'rgba(245,158,11,.15)' : '#FFF8E1', color: d ? '#FCD34D' : '#E65100', border: d ? 'rgba(245,158,11,.25)' : 'rgba(245,158,11,.30)' },
        'EN PROCESO':{ bg: d ? 'rgba(66,165,245,.15)' : '#E3F2FD', color: d ? '#64B5F6' : '#1565C0', border: d ? 'rgba(66,165,245,.25)' : 'rgba(21,101,192,.25)' },
        COMPLETADA:  { bg: d ? 'rgba(34,197,94,.15)'  : '#E8F5E9', color: d ? '#86EFAC' : '#2E7D32', border: d ? 'rgba(34,197,94,.25)' : 'rgba(46,125,50,.25)' },
        CANCELADA:   { bg: d ? 'rgba(239,68,68,.15)'  : '#FFEBEE', color: d ? '#FCA5A5' : '#C62828', border: d ? 'rgba(239,68,68,.25)' : 'rgba(198,40,40,.25)' },
        PROCESADO:   { bg: d ? 'rgba(34,197,94,.15)'  : '#E8F5E9', color: d ? '#86EFAC' : '#2E7D32', border: d ? 'rgba(34,197,94,.25)' : 'rgba(46,125,50,.25)' },
        DISPONIBLE:  { bg: d ? 'rgba(34,197,94,.12)'  : '#E8F5E9', color: d ? '#86EFAC' : '#2E7D32', border: d ? 'rgba(34,197,94,.20)' : 'rgba(46,125,50,.20)' },
        BLOQUEADA:   { bg: d ? 'rgba(239,68,68,.12)'  : '#FFEBEE', color: d ? '#FCA5A5' : '#C62828', border: d ? 'rgba(239,68,68,.20)' : 'rgba(198,40,40,.20)' },
        OCUPADA:     { bg: d ? 'rgba(66,165,245,.12)' : '#E3F2FD', color: d ? '#64B5F6' : '#1565C0', border: d ? 'rgba(66,165,245,.20)' : 'rgba(21,101,192,.20)' },
      }
      const s = map[status] || map['PENDIENTE']
      return {
        bgcolor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontWeight: 700,
      }
    },

    /* ── Metric chip (counters in summaries) ── */
    metricChip: (tone = 'default') => {
      const tones = {
        default: { bg: d ? 'rgba(255,255,255,.06)' : 'rgba(13,59,102,.05)', color: d ? '#E8EDF4' : '#0A2540', border: d ? 'rgba(255,255,255,.10)' : 'rgba(13,59,102,.12)' },
        warn:    { bg: d ? 'rgba(245,158,11,.12)' : '#FFF8E1', color: d ? '#FCD34D' : '#E65100', border: d ? 'rgba(245,158,11,.20)' : 'rgba(245,158,11,.25)' },
        info:    { bg: d ? 'rgba(66,165,245,.12)' : '#E3F2FD', color: d ? '#64B5F6' : '#1565C0', border: d ? 'rgba(66,165,245,.20)' : 'rgba(21,101,192,.20)' },
        ok:      { bg: d ? 'rgba(34,197,94,.12)' : '#E8F5E9', color: d ? '#86EFAC' : '#2E7D32', border: d ? 'rgba(34,197,94,.20)' : 'rgba(46,125,50,.20)' },
        bad:     { bg: d ? 'rgba(239,68,68,.12)' : '#FFEBEE', color: d ? '#FCA5A5' : '#C62828', border: d ? 'rgba(239,68,68,.20)' : 'rgba(198,40,40,.20)' },
      }
      const t = tones[tone] || tones.default
      return {
        fontWeight: 700,
        borderRadius: '8px',
        height: 32,
        bgcolor: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
      }
    },

    /* ── Action icon buttons ── */
    actionBtn: (color = 'primary') => {
      const colors = {
        primary: { c: d ? '#64B5F6' : '#1565C0', bg: d ? 'rgba(66,165,245,.10)' : 'rgba(21,101,192,.08)', border: d ? 'rgba(66,165,245,.20)' : 'rgba(21,101,192,.18)' },
        success: { c: d ? '#86EFAC' : '#2E7D32', bg: d ? 'rgba(34,197,94,.10)' : 'rgba(46,125,50,.08)', border: d ? 'rgba(34,197,94,.20)' : 'rgba(46,125,50,.18)' },
        error:   { c: d ? '#FCA5A5' : '#C62828', bg: d ? 'rgba(239,68,68,.10)' : 'rgba(198,40,40,.08)', border: d ? 'rgba(239,68,68,.20)' : 'rgba(198,40,40,.18)' },
        warning: { c: d ? '#FCD34D' : '#E65100', bg: d ? 'rgba(245,158,11,.10)' : 'rgba(245,158,11,.08)', border: d ? 'rgba(245,158,11,.20)' : 'rgba(245,158,11,.18)' },
      }
      const s = colors[color] || colors.primary
      return {
        color: s.c,
        borderRadius: 2,
        border: `1px solid ${s.border}`,
        bgcolor: s.bg,
        '&:hover': { bgcolor: d ? `${s.bg.replace('.10', '.18')}` : `${s.bg.replace('.08', '.14')}` },
      }
    },

    /* ── Filter bar wrapper ── */
    filterBar: {
      px: 2.5,
      py: 1.5,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 1.5,
      alignItems: 'center',
      borderBottom: d
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid rgba(13,59,102,0.06)',
    },

    /* ── KPI card ── */
    kpiCard: (accent = 'blue') => {
      const accents = {
        blue:  { border: d ? 'rgba(66,165,245,.20)' : 'rgba(21,101,192,.15)', shadow: d ? 'rgba(66,165,245,.08)' : 'rgba(21,101,192,.08)' },
        green: { border: d ? 'rgba(34,197,94,.20)' : 'rgba(46,125,50,.15)', shadow: d ? 'rgba(34,197,94,.08)' : 'rgba(46,125,50,.08)' },
        red:   { border: d ? 'rgba(239,68,68,.20)' : 'rgba(198,40,40,.15)', shadow: d ? 'rgba(239,68,68,.08)' : 'rgba(198,40,40,.08)' },
        amber: { border: d ? 'rgba(245,158,11,.20)' : 'rgba(245,158,11,.15)', shadow: d ? 'rgba(245,158,11,.08)' : 'rgba(245,158,11,.08)' },
      }
      const a = accents[accent] || accents.blue
      return {
        p: 2.5,
        borderRadius: 3,
        height: '100%',
        border: `1px solid ${a.border}`,
        boxShadow: `0 4px 20px ${a.shadow}`,
        transition: 'transform .15s ease, box-shadow .15s ease',
        cursor: 'pointer',
        '&:hover': { transform: 'translateY(-2px)' },
      }
    },

    /* ── Progress bar ── */
    progressBar: {
      height: 8,
      borderRadius: 999,
      bgcolor: d ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)',
      overflow: 'hidden',
    },

    progressFill: (pct, color = 'rgba(21,101,192,.65)') => ({
      height: '100%',
      width: `${Math.max(0, Math.min(100, pct))}%`,
      borderRadius: 999,
      bgcolor: d ? 'rgba(66,165,245,.65)' : color,
      transition: 'width .4s ease',
    }),

    /* ── Empty state ── */
    emptyText: {
      color: 'text.secondary',
      textAlign: 'center',
      py: 4,
    },

    /* ── Auth pages (login, register, forgot) ── */
    authBackground: {
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      px: 2,
      backgroundImage: d
        ? `radial-gradient(ellipse 1200px 500px at 15% 20%, rgba(66,165,245,.20), transparent 60%),
           radial-gradient(ellipse 900px 420px at 85% 15%, rgba(21,101,192,.15), transparent 60%),
           linear-gradient(180deg, #0B1929, #112240)`
        : `radial-gradient(ellipse 1200px 500px at 15% 20%, rgba(21,101,192,.25), transparent 60%),
           radial-gradient(ellipse 900px 420px at 85% 15%, rgba(2,136,209,.18), transparent 60%),
           linear-gradient(135deg, rgba(244,247,252,1), rgba(227,242,253,1))`,
    },

    authCard: {
      width: 'min(480px, 100%)',
      p: { xs: 3, sm: 4 },
      borderRadius: 3,
      bgcolor: d ? 'rgba(17,34,64,.90)' : 'rgba(255,255,255,.95)',
      backdropFilter: 'blur(12px)',
      border: d
        ? '1px solid rgba(255,255,255,.08)'
        : '1px solid rgba(13,59,102,.10)',
      boxShadow: d
        ? '0 20px 60px rgba(0,0,0,.40)'
        : '0 12px 40px rgba(13,59,102,.10)',
    },

    authInput: {
      '& .MuiInputBase-root': {
        background: d ? 'rgba(11,25,41,.60)' : '#FFFFFF',
      },
    },
  }
}
