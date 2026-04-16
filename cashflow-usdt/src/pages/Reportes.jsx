import { useCallback, useEffect, useState } from 'react'
import { fetchReportesResumen } from '../features/reportes/api.js'
import { Card } from '../components/Card'
import { formatNumber } from '../utils/format'
import { useAppStore } from '../store/useAppStore'

const labelClass = 'text-xs font-medium uppercase tracking-wide text-zinc-500'
const cellNum = 'text-right font-medium text-zinc-100 tabular-nums'

export function Reportes() {
  const dashboardNonce = useAppStore((s) => s.dashboardNonce)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [d, setD] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { error: err, data } = await fetchReportesResumen()
    if (err) {
      setError(err)
      setD(null)
    } else {
      setD(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load, dashboardNonce])

  return (
    <div className="space-y-4 pb-2">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-white">Reportes</h1>
          <p className="text-sm text-zinc-500">
            Cierres semanales y estadísticas de clientes y operaciones (datos históricos).
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
        >
          Actualizar
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          Cargando reportes…
        </div>
      ) : d ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card title="Operaciones (total cargado)">
              <p className="text-3xl font-bold text-zinc-100">{formatNumber(d.totalOperaciones)}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Incluye todas las filas de <span className="text-zinc-400">operaciones</span> (paginación
                interna).
              </p>
            </Card>
            <Card title="Ganancia acumulada (suma)">
              <p className="text-3xl font-bold text-emerald-400">{formatNumber(d.gananciaTotal)}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Suma del campo <span className="text-zinc-400">ganancia</span> (mezcla modos; referencia
                contable).
              </p>
            </Card>
          </div>

          <Card title="Clientes">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className={labelClass}>En sistema</div>
                <p className="mt-1 text-2xl font-semibold text-zinc-100">
                  {d.totalClientes != null ? formatNumber(d.totalClientes) : '—'}
                </p>
                {d.errorClientes ? (
                  <p className="mt-1 text-xs text-amber-400">{d.errorClientes}</p>
                ) : null}
              </div>
              <div>
                <div className={labelClass}>Con al menos una operación</div>
                <p className="mt-1 text-2xl font-semibold text-sky-300">
                  {formatNumber(d.clientesConOperacion)}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Operaciones — desglose">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className={labelClass}>Por tipo</div>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  <li className="flex justify-between gap-2">
                    <span>Venta</span>
                    <span className="tabular-nums text-zinc-100">{formatNumber(d.porTipo.venta)}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Compra</span>
                    <span className="tabular-nums text-zinc-100">{formatNumber(d.porTipo.compra)}</span>
                  </li>
                  {d.porTipo.otro > 0 ? (
                    <li className="flex justify-between gap-2">
                      <span>Otro</span>
                      <span className="tabular-nums text-zinc-100">{formatNumber(d.porTipo.otro)}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
              <div>
                <div className={labelClass}>Por estado</div>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  <li className="flex justify-between gap-2">
                    <span>Pendiente</span>
                    <span className="tabular-nums text-zinc-100">
                      {formatNumber(d.porEstado.pendiente)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Parcial</span>
                    <span className="tabular-nums text-zinc-100">
                      {formatNumber(d.porEstado.parcial)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Cerrada</span>
                    <span className="tabular-nums text-zinc-100">
                      {formatNumber(d.porEstado.cerrada)}
                    </span>
                  </li>
                  {d.porEstado.otro > 0 ? (
                    <li className="flex justify-between gap-2">
                      <span>Otro</span>
                      <span className="tabular-nums text-zinc-100">{formatNumber(d.porEstado.otro)}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
              <div>
                <div className={labelClass}>Por modo</div>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300">
                  <li className="flex justify-between gap-2">
                    <span>Propio</span>
                    <span className="tabular-nums text-zinc-100">{formatNumber(d.opsPropias)}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Intermediación</span>
                    <span className="tabular-nums text-zinc-100">{formatNumber(d.opsInter)}</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          <Card title="Cierres semanales (agrupado por semana calendario, lunes a domingo)">
            {d.semanas.length === 0 ? (
              <p className="text-sm text-zinc-500">Aún no hay operaciones para agrupar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                      <th className="pb-2 pr-2 font-medium">Semana</th>
                      <th className={`pb-2 pr-2 font-medium ${cellNum}`}>Ops</th>
                      <th className={`pb-2 pr-2 font-medium ${cellNum}`}>Ventas</th>
                      <th className={`pb-2 pr-2 font-medium ${cellNum}`}>Compras</th>
                      <th className={`pb-2 font-medium ${cellNum}`}>Σ ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {d.semanas.map((s) => (
                      <tr key={s.weekStart.getTime()} className="text-zinc-300">
                        <td className="py-2.5 pr-2 text-zinc-200">{s.etiqueta}</td>
                        <td className={`py-2.5 pr-2 ${cellNum}`}>{formatNumber(s.count)}</td>
                        <td className={`py-2.5 pr-2 ${cellNum}`}>{formatNumber(s.ventas)}</td>
                        <td className={`py-2.5 pr-2 ${cellNum}`}>{formatNumber(s.compras)}</td>
                        <td className={`py-2.5 ${cellNum} text-emerald-300`}>
                          {formatNumber(s.ganancia)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="Top clientes por ganancia (acumulado)">
              {d.topClientesGanancia.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin operaciones con cliente asignado.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {d.topClientesGanancia.map((c, i) => (
                    <li
                      key={c.cliente_id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-500">{i + 1}. </span>
                        <span className="font-medium text-zinc-200">{c.nombre}</span>
                        <span className="ml-2 text-xs text-zinc-500">({formatNumber(c.ops)} ops)</span>
                      </span>
                      <span className="shrink-0 font-semibold text-emerald-400 tabular-nums">
                        {formatNumber(c.ganancia)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <Card title="Top clientes por volumen (# operaciones)">
              {d.topClientesOps.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin operaciones con cliente asignado.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {d.topClientesOps.map((c, i) => (
                    <li
                      key={`${c.cliente_id}-ops`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-xs text-zinc-500">{i + 1}. </span>
                        <span className="font-medium text-zinc-200">{c.nombre}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-sky-300 tabular-nums">
                        {formatNumber(c.ops)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
