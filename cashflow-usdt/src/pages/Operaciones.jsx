import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOperaciones } from '../features/operaciones/api.js'
import { Card } from '../components/Card'
import { formatMoney, formatDate } from '../utils/format'
import { ROUTES, TIPOS_OPERACION, ESTADOS_OPERACION } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50'

export function Operaciones() {
  const dashboardNonce = useAppStore((s) => s.dashboardNonce)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [estado, setEstado] = useState('todos')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchOperaciones({ q, tipo, estado, limit: 120 })
      setRows(data)
    } catch (e) {
      setError(e?.message ?? String(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [q, tipo, estado])

  useEffect(() => {
    load()
  }, [load, dashboardNonce])

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-white">Operaciones</h1>
          <p className="text-sm text-zinc-500">Búsqueda y filtros</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
          >
            Actualizar
          </button>
          <Link
            to={ROUTES.operar}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
          >
            + Nueva
          </Link>
        </div>
      </header>

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Buscar</label>
            <input
              className={inputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cliente, moneda, id…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Tipo</label>
            <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todos">Todos</option>
              {TIPOS_OPERACION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Estado</label>
            <select
              className={inputClass}
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="todos">Todos</option>
              {ESTADOS_OPERACION.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-amber-400">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin resultados.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 text-sm">
            {rows.map((r) => {
              const c = r.clientes
              const nombre = [c?.nombre, c?.alias].filter(Boolean).join(' · ') || '—'
              return (
                <li key={r.id} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2 font-medium capitalize text-zinc-200">
                      {r.tipo}
                      {r.modo_operacion === 'intermediacion' ? (
                        <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
                          Intermediación
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-zinc-500">{formatDate(r.created_at)}</span>
                  </div>
                  <div className="text-xs text-zinc-500">Cliente: {nombre}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span>
                      {r.moneda_entrada}: {formatMoney(r.monto_entrada, r.moneda_entrada)}
                    </span>
                    <span>
                      {r.moneda_salida}: {formatMoney(r.monto_salida, r.moneda_salida)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{r.estado}</span>
                    <span className="text-emerald-400">
                      Ganancia{' '}
                      {formatMoney(
                        r.ganancia,
                        r.modo_operacion === 'intermediacion' && r.comision_moneda
                          ? r.comision_moneda
                          : 'USD',
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
