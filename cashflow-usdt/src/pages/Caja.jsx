import { useCallback, useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { formatMoney } from '../utils/format'
import { MONEDAS_CAMBIO } from '../utils/constants'
import { fetchMovimientosCaja, registrarMovimientoManual } from '../features/caja/api.js'
import { useAppStore } from '../store/useAppStore'

const inputClass =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/25'

const emptyManual = {
  tipo_movimiento: 'ingreso',
  moneda: 'USD',
  monto: '',
  nota: '',
}

export function Caja() {
  const bumpDashboard = useAppStore((s) => s.bumpDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [manual, setManual] = useState(emptyManual)
  const [saving, setSaving] = useState(false)
  const [manualError, setManualError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMovimientosCaja({ limit: 60 })
      setRows(data)
    } catch (e) {
      setError(e?.message ?? String(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function updateManual(field, value) {
    setManual((m) => ({ ...m, [field]: value }))
  }

  async function onSubmitManual(e) {
    e.preventDefault()
    setManualError(null)
    setSaving(true)
    try {
      await registrarMovimientoManual({
        tipo: manual.tipo_movimiento,
        moneda: manual.moneda,
        monto: manual.monto === '' ? 0 : Number(manual.monto),
        nota: manual.nota,
      })
      setManual({ ...emptyManual })
      bumpDashboard()
      await load()
    } catch (err) {
      setManualError(err?.message ?? String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-semibold text-white">Caja</h1>
        <p className="text-sm text-zinc-500">
          Movimientos por operación y ajustes manuales (capital, gastos, retiros).
        </p>
      </header>

      <Card>
        <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-400">Ajuste manual</h2>
        <form className="space-y-3" onSubmit={onSubmitManual}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tipo
            </label>
            <select
              className={inputClass}
              value={manual.tipo_movimiento}
              onChange={(e) => updateManual('tipo_movimiento', e.target.value)}
            >
              <option value="ingreso">Ingreso (entra dinero a caja)</option>
              <option value="egreso">Egreso (sale dinero de caja)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Moneda
              </label>
              <select
                className={inputClass}
                value={manual.moneda}
                onChange={(e) => updateManual('moneda', e.target.value)}
              >
                {MONEDAS_CAMBIO.map((mon) => (
                  <option key={mon} value={mon}>
                    {mon}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Monto"
              type="number"
              min="0"
              step="any"
              value={manual.monto}
              onChange={(e) => updateManual('monto', e.target.value)}
              placeholder="0"
              className="gap-1.5"
            />
          </div>
          <Input
            label="Concepto (opcional)"
            value={manual.nota}
            onChange={(e) => updateManual('nota', e.target.value)}
            placeholder="Ej.: gasto oficina, capital aportado, retiro personal…"
            className="gap-1.5"
          />
          {manualError ? (
            <p className="text-sm text-red-400">{manualError}</p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Registrar movimiento'}
          </button>
        </form>
      </Card>

      <Card title="Últimos movimientos">
        {loading ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-amber-400">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin movimientos aún.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 text-sm">
            {rows.map((m) => {
              const esManual = m.operacion_id == null
              const colorClass =
                m.tipo === 'egreso'
                  ? 'text-red-300'
                  : m.tipo === 'ajuste'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="capitalize text-zinc-300">{m.tipo}</span>
                      <span className="text-zinc-500">{m.moneda}</span>
                      {esManual ? (
                        <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                          Manual
                        </span>
                      ) : null}
                    </div>
                    {m.nota ? <p className="mt-1 truncate text-xs text-zinc-600">{m.nota}</p> : null}
                  </div>
                  <span className={`shrink-0 font-medium ${colorClass}`}>
                    {formatMoney(m.monto, m.moneda)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
