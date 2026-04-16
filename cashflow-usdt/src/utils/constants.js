export const ROUTES = {
  home: '/',
  login: '/login',
  operar: '/operar',
  operaciones: '/operaciones',
  clientes: '/clientes',
  deudas: '/deudas',
  caja: '/caja',
  reportes: '/reportes',
}

export const ESTADOS_OPERACION = ['pendiente', 'parcial', 'cerrada']

export const TIPOS_OPERACION = ['compra', 'venta']

/** propio: principal en caja. intermediacion: solo comisión en caja (opción A). */
export const MODOS_OPERACION = [
  { value: 'propio', label: 'Con mi capital' },
  { value: 'intermediacion', label: 'Intermediación (solo comisión)' },
]

/** Solo USD y USDT en operaciones y comisión. */
export const MONEDAS_CAMBIO = ['USD', 'USDT']

export const MONEDAS_COMISION = MONEDAS_CAMBIO
