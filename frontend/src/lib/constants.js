// ═══════════════════════════════════════════════════════════════════════════
// Constantes compartidas del sistema RT-Audit
// Archivo centralizado para evitar valores hardcoded en las paginas.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Areas del almacen ───────────────────────────────────────────────────
// Codigos de area usados en la base de datos
export const AREA_CODES = ['A1', 'A2', 'A3', 'A4']

// Mapeo de areas con etiquetas para UI (contexto FFT)
export const AREAS_FFT = [
  { db: 'A1', label: 'Incoming' },
  { db: 'A2', label: 'Sorting' },
  { db: 'A3', label: 'FFT' },
  { db: 'A4', label: 'OpenCell' },
]

// Mapeo de areas con etiquetas para UI (contexto Produccion)
export const AREAS_PRODUCTION = [
  { code: 'P1', label: 'Sorting' },
  { code: 'P2', label: 'FFT' },
  { code: 'P3', label: 'Shipping' },
  { code: 'P4', label: 'OpenCell' },
]

// Opciones de area para selectores genericos
export const AREA_OPTIONS = [
  { value: 'TODAS', label: 'Todas las áreas' },
  { value: 'A1', label: 'Area A1' },
  { value: 'A2', label: 'Area A2' },
  { value: 'A3', label: 'Area A3' },
  { value: 'A4', label: 'Area A4' },
]

// ─── Subareas / Zonas ───────────────────────────────────────────────────
// Subareas por area (contexto FFT)
export const SUBAREAS_BY_AREA_FFT = {
  A1: ['Recepcion', 'Calidad', 'Staging'],
  A2: ['Clasificacion', 'Re-etiquetado', 'Rework'],
  A3: ['Accesorios', 'Picking', 'Empaque'],
  A4: ['OpenCell', 'Buffer', 'Auditoria'],
}

// Subareas por area (contexto Produccion)
export const SUBAREAS_BY_AREA_PRODUCTION = {
  P1: ['Sorting'],
  P2: ['Accesorios', 'Produccion', 'Paletizado'],
  P3: ['Shipping'],
  P4: ['OpenCell', 'Technical'],
}

// ─── Roles de usuario ────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERADOR: 'OPERADOR',
}

export const ROLE_LIST = [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR]

// Roles con permisos de administracion
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPERVISOR]

// ─── Estados de orden / tarea (workflow general) ─────────────────────────
export const STATUS = {
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN PROCESO',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
}

export const STATUS_LIST = ['TODAS', STATUS.PENDIENTE, STATUS.EN_PROCESO, STATUS.COMPLETADA, STATUS.CANCELADA]

// ─── Estados de recepcion (inbound workflow) ─────────────────────────────
export const INBOUND_STATUS = {
  ESPERADA: 'ESPERADA',
  EN_DESCARGA: 'EN_DESCARGA',
  EN_INSPECCION: 'EN_INSPECCION',
  RECIBIDA: 'RECIBIDA',
  ALMACENADA: 'ALMACENADA',
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN PROCESO',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
}

export const INBOUND_WORKFLOW_STEPS = ['ESPERADA', 'EN_DESCARGA', 'EN_INSPECCION', 'RECIBIDA', 'ALMACENADA']

export const INBOUND_WORKFLOW_LABELS = {
  ESPERADA: 'Esperada',
  EN_DESCARGA: 'En Descarga',
  EN_INSPECCION: 'En Inspeccion',
  RECIBIDA: 'Recibida',
  ALMACENADA: 'Almacenada',
}

export const INBOUND_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ESPERADA', label: 'Esperada' },
  { value: 'EN_DESCARGA', label: 'En Descarga' },
  { value: 'EN_INSPECCION', label: 'En Inspeccion' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'ALMACENADA', label: 'Almacenada' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN PROCESO', label: 'En Proceso' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

// ─── Estados de tarima (pallet) ──────────────────────────────────────────
export const PALLET_STATUS = {
  IN_STOCK: 'IN_STOCK',
  QUARANTINE: 'QUARANTINE',
  DAMAGED: 'DAMAGED',
  RETURNED: 'RETURNED',
  OUT: 'OUT',
}

// Mapeo de estado de tarima a etiqueta y color de MUI
export const PALLET_STATUS_MAP = {
  IN_STOCK:   { label: 'En Stock',   color: 'success' },
  QUARANTINE: { label: 'Cuarentena', color: 'warning' },
  DAMAGED:    { label: 'Dañada',     color: 'error'   },
  RETURNED:   { label: 'Devuelta',   color: 'info'    },
  OUT:        { label: 'Salida',     color: 'default' },
}

// Opciones de estado de tarima para selectores
export const PALLET_STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: 'En Stock' },
  { value: 'QUARANTINE', label: 'Cuarentena' },
  { value: 'DAMAGED', label: 'Dañado' },
]

// ─── Tipos de movimiento ─────────────────────────────────────────────────
export const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
  TRANSFER: 'TRANSFER',
  ADJUST: 'ADJUST',
}

// Etiquetas en español para tipos de movimiento
export const MOVEMENT_TYPE_LABELS = {
  IN: 'Entrada',
  OUT: 'Salida',
  TRANSFER: 'Transferencia',
  ADJUST: 'Ajuste',
}

// Colores para graficas de tipos de movimiento
export const MOVEMENT_TYPE_COLORS = {
  IN:       { fill: '#43A047', label: 'Entradas' },
  OUT:      { fill: '#E53935', label: 'Salidas' },
  TRANSFER: { fill: '#1E88E5', label: 'Transferencias' },
  ADJUST:   { fill: '#FB8C00', label: 'Ajustes' },
}

// ─── Niveles de prioridad ────────────────────────────────────────────────
export const PRIORITY = {
  URGENTE: 'URGENTE',
  ALTA: 'ALTA',
  NORMAL: 'NORMAL',
  BAJA: 'BAJA',
}

export const PRIORITY_COLORS = {
  URGENTE: { bg: '#FFEBEE', color: '#C62828', darkBg: 'rgba(239,68,68,.18)', darkColor: '#FCA5A5' },
  ALTA:    { bg: '#FFF3E0', color: '#E65100', darkBg: 'rgba(245,158,11,.18)', darkColor: '#FCD34D' },
  NORMAL:  { bg: '#E3F2FD', color: '#1565C0', darkBg: 'rgba(66,165,245,.18)', darkColor: '#64B5F6' },
  BAJA:    { bg: '#F3E5F5', color: '#6A1B9A', darkBg: 'rgba(156,39,176,.18)', darkColor: '#CE93D8' },
}

// ─── Racks ───────────────────────────────────────────────────────────────
// Codigos de rack: F001 a F125
export const RACK_COUNT = 125
export const ALL_RACKS = Array.from({ length: RACK_COUNT }, (_, i) => `F${String(i + 1).padStart(3, '0')}`)

// Niveles y posiciones dentro de un rack
export const RACK_LEVELS = ['A', 'B', 'C']
export const RACK_POSITIONS = Array.from({ length: 12 }, (_, i) => i + 1)

// Derivar area a partir de codigo de rack
// F001-F031 -> A1, F032-F062 -> A2, F063-F093 -> A3, F094-F125 -> A4
export function rackToArea(code) {
  const num = parseInt(code.replace('F', ''), 10)
  if (num <= 31) return 'A1'
  if (num <= 62) return 'A2'
  if (num <= 93) return 'A3'
  return 'A4'
}

// ─── Tipos de ubicacion ──────────────────────────────────────────────────
export const LOCATION_TYPES = ['RACK', 'FLOOR', 'QUARANTINE', 'RETURNS']

// ─── Tipos de tarea ──────────────────────────────────────────────────────
export const TASK_TYPES = {
  PUTAWAY: 'PUTAWAY',
  PICK: 'PICK',
  TRANSFER: 'TRANSFER',
  COUNT: 'COUNT',
  INSPECT: 'INSPECT',
  CUSTOM: 'CUSTOM',
}

// Mapeo de estado de tarea (backend -> frontend)
export const TASK_STATUS_MAP = {
  PENDING: 'PENDIENTE',
  ASSIGNED: 'PENDIENTE',
  IN_PROGRESS: 'EN PROCESO',
  COMPLETED: 'COMPLETADA',
  CANCELLED: 'CANCELADA',
}

// ─── Regex para codigos de ubicacion ─────────────────────────────────────
// Patron para validar/parsear codigos como A1-F059-012
export const LOCATION_CODE_REGEX = /^(A1|A2|A3|A4|B2|C3)-(F\d{3})-(\d{3})$/
export const AREA_CODE_REGEX = /^(A1|A2|A3|A4|B2|C3)$/

// ─── Helpers reutilizables ───────────────────────────────────────────────

/** Obtener etiqueta legible de estado de tarima */
export function palletStatusLabel(s) {
  return PALLET_STATUS_MAP[s]?.label || s || '—'
}

/** Obtener etiqueta legible de tipo de movimiento */
export function movementTypeLabel(t) {
  return MOVEMENT_TYPE_LABELS[t] || t || '—'
}
