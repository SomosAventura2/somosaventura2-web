import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { formatMoney, formatNumber } from '../utils/format'
import { ROUTES } from '../utils/constants'
import { fetchDashboard } from '../features/dashboard/api.js'
import { useAppStore } from '../store/useAppStore'

export function Dashboard() {
  const dashboardNonce = useAppStore((s) => s.dashboardNonce)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [d, setD] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const { error: errMsg, data } = await fetchDashboard()
      if (cancelled) return
      if (errMsg) {
        setError(errMsg)
        setD(null)
      } else {
        setD(data)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dashboardNonce])

  const rows = d?.rows ?? []

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold text-white">CashFlow USDT</h1>
          <Link
            className="text-xs text-emerald-400 underline-offset-2 hover:underline"
            to={ROUTES.operaciones}
          >
            Operaciones
          </Link>
        </div>
        <p className="text-sm text-zinc-500">
          Ganancia, caja estimada por movimientos, por cobrar y pendientes
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}. Revisa `.env`, RLS y el SQL en Supabase.
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          Cargando dashboard…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card title="Ganancia hoy">
              {d?.errorDia ? (
                <p className="text-xs text-amber-400">{d.errorDia}</p>
              ) : (
                <p className="text-2xl font-semibold text-emerald-400">
                  {formatMoney(d?.gananciaDia ?? 0, 'USD')}
                </p>
              )}
            </Card>
            <Card title="Ganancia (últimas 8 ops)">
              <p className="text-2xl font-semibold text-zinc-100">
                {formatMoney(d?.totGananciaUltimas ?? 0, 'USD')}
              </p>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Caja (por movimientos)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Card title="USD">
                <p className="text-xl font-semibold text-sky-300">
                  {formatMoney(d?.cajaUsd ?? 0, 'USD')}
                </p>
              </Card>
              <Card title="USDT">
                <p className="text-xl font-semibold text-sky-300">
                  {formatMoney(d?.cajaUsdt ?? 0, 'USDT')}
                </p>
              </Card>
              <Card title="Total caja (USD + USDT)">
                <p className="text-xl font-semibold text-sky-200">
                  {formatNumber(d?.cajaUsdUsdtNominal ?? 0)}
                </p>
              </Card>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card title="Total por cobrar (saldo &gt; 0)">
              {d?.errorCobrar ? (
                <p className="text-xs text-amber-400">{d.errorCobrar}</p>
              ) : (
                <p className="text-2xl font-semibold text-amber-300">
                  {formatNumber(d?.totalPorCobrar ?? 0)}
                </p>
              )}
            </Card>
            <Card title="Operaciones pendientes / parciales">
              {d?.errorOpsPend ? (
                <p className="text-xs text-amber-400">{d.errorOpsPend}</p>
              ) : (
                <p className="text-4xl font-bold text-zinc-100">{d?.opsPendientes ?? 0}</p>
              )}
            </Card>
          </div>

          <Card title="Últimas operaciones">
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No hay datos todavía.{' '}
                <Link className="text-emerald-400 underline" to={ROUTES.operar}>
                  Crear operación
                </Link>
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 border-b border-zinc-800/80 py-2 last:border-0"
                  >
                    <span className="capitalize text-zinc-300">{r.tipo}</span>
                    <span className="text-xs text-zinc-500">{r.estado}</span>
                    <span className="font-medium text-emerald-300">
                      {formatMoney(
                        r.ganancia,
                        r.modo_operacion === 'intermediacion' && r.comision_moneda
                          ? r.comision_moneda
                          : 'USD',
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to={ROUTES.operar}
              className="block rounded-xl bg-emerald-600 py-3 text-center text-sm font-medium text-white shadow hover:bg-emerald-500"
            >
              Nueva operación
            </Link>
            <Link
              to={ROUTES.deudas}
              className="block rounded-xl border border-zinc-700 py-3 text-center text-sm font-medium text-zinc-200 hover:bg-zinc-900"
            >
              Deudas y abonos
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
