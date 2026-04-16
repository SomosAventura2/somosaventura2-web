import { useCallback, useEffect, useMemo, useState } from 'react'
import { crearDeudaManual, fetchDeudas, registrarAbono } from '../features/deudas/api.js'
import { fetchClientes } from '../features/operaciones/api.js'
import { Card } from '../components/Card'
import { AbonoModal } from '../components/AbonoModal'
import { formatMoney, formatNumber, formatDate } from '../utils/format'
import { MONEDAS_CAMBIO } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50'

function n(v) {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export function Deudas() {
  const bumpDashboard = useAppStore((s) => s.bumpDashboard)
  const dashboardNonce = useAppStore((s) => s.dashboardNonce)

  const [kind, setKind] = useState('cobrar')
  const [estado, setEstado] = useState('todo')
  const [q, setQ] = useState('')
  const [deudas, setDeudas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [abonoOpen, setAbonoOpen] = useState(false)
  const [deudaActiva, setDeudaActiva] = useState(null)
  const [abonoMonto, setAbonoMonto] = useState('')
  const [savingAbono, setSavingAbono] = useState(false)

  const [clientes, setClientes] = useState([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [manualClienteId, setManualClienteId] = useState('')
  const [manualMoneda, setManualMoneda] = useState('USD')
  const [manualMonto, setManualMonto] = useState('')
  const [savingManual, setSavingManual] = useState(false)

  const loadDeudas = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await fetchDeudas(kind, { estado, q })
      setDeudas(rows)
    } catch (e) {
      setError(e?.message ?? String(e))
      setDeudas([])
    } finally {
      setLoading(false)
    }
  }, [kind, estado, q])

  useEffect(() => {
    loadDeudas()
  }, [loadDeudas, dashboardNonce])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingClientes(true)
      try {
        const list = await fetchClientes()
        if (!cancelled) setClientes(list)
      } catch {
        if (!cancelled) setClientes([])
      } finally {
        if (!cancelled) setLoadingClientes(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function openAbono(deuda) {
    setMessage('')
    setError('')
    setDeudaActiva(deuda)
    setAbonoMonto('')
    setAbonoOpen(true)
  }

  async function submitManualDeuda(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSavingManual(true)
    try {
      await crearDeudaManual({
        kind,
        cliente_id: manualClienteId,
        monto_total: manualMonto,
        moneda: manualMoneda,
      })
      setMessage(
        kind === 'cobrar'
          ? 'Cuenta por cobrar registrada (manual).'
          : 'Cuenta por pagar registrada (manual).',
      )
      setManualMonto('')
      setManualClienteId('')
      bumpDashboard()
      await loadDeudas()
    } catch (err) {
      setError(err?.message ?? 'No se pudo guardar la cuenta.')
    } finally {
      setSavingManual(false)
    }
  }

  async function submitAbono() {
    if (!deudaActiva) return
    try {
      setSavingAbono(true)
      setError('')
      setMessage('')
      await registrarAbono({
        kind,
        deuda: deudaActiva,
        montoAbono: abonoMonto,
      })
      setMessage('Abono registrado correctamente.')
      setAbonoOpen(false)
      setDeudaActiva(null)
      setAbonoMonto('')
      bumpDashboard()
      await loadDeudas()
    } catch (err) {
      setError(err?.message ?? 'No se pudo registrar el abono.')
    } finally {
      setSavingAbono(false)
    }
  }

  const totalVisible = useMemo(
    () => deudas.reduce((acc, item) => acc + n(item.saldo), 0),
    [deudas],
  )

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-white">Deudas</h1>
        <p className="text-sm text-zinc-500">Cuentas por cobrar / pagar y abonos a caja</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKind('cobrar')}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            kind === 'cobrar'
              ? 'bg-sky-600 text-white'
              : 'border border-zinc-800 bg-zinc-950 text-zinc-400'
          }`}
        >
          Por cobrar
        </button>
        <button
          type="button"
          onClick={() => setKind('pagar')}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            kind === 'pagar'
              ? 'bg-orange-600 text-white'
              : 'border border-zinc-800 bg-zinc-950 text-zinc-400'
          }`}
        >
          Por pagar
        </button>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-zinc-100">
          Agregar {kind === 'cobrar' ? 'cuenta por cobrar' : 'cuenta por pagar'} (manual)
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Sin operación: queda en libros con saldo pendiente hasta que registres abonos.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submitManualDeuda}>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-zinc-500">Cliente</label>
            <select
              className={inputClass}
              value={manualClienteId}
              onChange={(e) => setManualClienteId(e.target.value)}
              required
              disabled={loadingClientes}
            >
              <option value="" disabled>
                {loadingClientes ? 'Cargando…' : 'Selecciona cliente'}
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.nombre, c.alias].filter(Boolean).join(' · ') || c.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Moneda</label>
            <select
              className={inputClass}
              value={manualMoneda}
              onChange={(e) => setManualMoneda(e.target.value)}
            >
              {MONEDAS_CAMBIO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Monto total</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="any"
              value={manualMonto}
              onChange={(e) => setManualMonto(e.target.value)}
              placeholder="0"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingManual || !manualClienteId || loadingClientes || clientes.length === 0}
              className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
            >
              {savingManual ? 'Guardando…' : 'Guardar cuenta'}
            </button>
          </div>
        </form>
      </Card>

      <div className={`rounded-2xl border p-4 ${kind === 'cobrar' ? 'border-sky-500/30 bg-sky-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Resumen listado visible
        </div>
        <div className="mt-1 text-3xl font-bold text-zinc-100">{formatNumber(totalVisible)}</div>
        <div className="mt-2 text-sm text-zinc-400">
          Vista: {kind === 'cobrar' ? 'cuentas por cobrar' : 'cuentas por pagar'} (suma nominal de
          saldos filtrados)
        </div>
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Buscar cliente</label>
            <input
              className={inputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre, alias…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Estado</label>
            <select className={inputClass} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="todo">Todos</option>
              <option value="pendiente">pendiente</option>
              <option value="parcial">parcial</option>
              <option value="cerrada">cerrada</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : deudas.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin registros.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 text-sm">
            {deudas.map((row) => {
              const c = row.clientes
              const nombre = [c?.nombre, c?.alias].filter(Boolean).join(' · ') || '—'
              const mon = row.moneda ?? ''
              return (
                <li key={row.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-zinc-200">{nombre}</div>
                    <div className="text-xs text-zinc-500">
                      {formatDate(row.created_at)} · {row.estado}
                      {!row.operacion_id ? (
                        <span className="ml-2 rounded-md border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                          Manual
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Total {formatMoney(row.monto_total, mon)} · Pagado {formatMoney(row.monto_pagado, mon)} ·{' '}
                      <span className="text-amber-300">Saldo {formatMoney(row.saldo, mon)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={n(row.saldo) <= 0 || row.estado === 'cerrada'}
                    onClick={() => openAbono(row)}
                    className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Abonar
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <AbonoModal
        open={abonoOpen}
        onClose={() => {
          setAbonoOpen(false)
          setDeudaActiva(null)
        }}
        onSubmit={submitAbono}
        deuda={deudaActiva}
        kind={kind}
        amount={abonoMonto}
        setAmount={setAbonoMonto}
        saving={savingAbono}
      />
    </div>
  )
}
