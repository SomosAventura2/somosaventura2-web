import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearOperacion, fetchClientes } from '../features/operaciones/api.js'
import {
  armarVistaPrevia,
  calcularUsdtNetoVentaUsd,
  calcularUsdEntradaDesdeUsdtNeto,
  calcularUsdNetoCompraUsdt,
  calcularUsdtEntradaDesdeUsdNetoCompra,
} from '../lib/calculations.js'
import { useAppStore } from '../store/useAppStore'
import {
  ROUTES,
  TIPOS_OPERACION,
  ESTADOS_OPERACION,
  MODOS_OPERACION,
  MONEDAS_COMISION,
  MONEDAS_CAMBIO,
} from '../utils/constants'
import { formatNumber } from '../utils/format.js'

const defaultForm = {
  cliente_id: '',
  modo_operacion: 'propio',
  comision_moneda: 'USD',
  tipo: 'venta',
  moneda_entrada: 'USD',
  moneda_salida: 'USDT',
  monto_entrada: '',
  monto_salida: '',
  tasa: '',
  comision_pct: '5',
  comision_fija: '0',
  estado: 'pendiente',
  observacion: '',
  /** Venta USD→USDT: fijar salida USDT; compra USDT→USD: fijar salida USD; en ambos casos comisión % “aparte” sobre nominal. */
  cambio_auto_fijo_salida: false,
}

const labelClass = 'block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1.5'
const inputClass =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/25'
const cardClass =
  'rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4'

export function NuevaOperacion() {
  const navigate = useNavigate()
  const bumpDashboard = useAppStore((s) => s.bumpDashboard)
  const [form, setForm] = useState(defaultForm)
  const [clientes, setClientes] = useState([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const preview = useMemo(() => armarVistaPrevia(form), [form])

  const fijoAutoEntradaLabel = form.tipo === 'venta' ? 'USD' : 'USDT'
  const fijoAutoSalidaLabel = form.tipo === 'venta' ? 'USDT' : 'USD'

  const autoCambioUsdUsdt =
    ((form.tipo === 'venta' &&
      form.moneda_entrada === 'USD' &&
      form.moneda_salida === 'USDT') ||
      (form.tipo === 'compra' &&
        form.moneda_entrada === 'USDT' &&
        form.moneda_salida === 'USD')) &&
    (Number(form.comision_fija) === 0 || form.comision_fija === '')

  useEffect(() => {
    if (!autoCambioUsdUsdt || form.cambio_auto_fijo_salida) return
    if (form.tipo === 'venta') {
      const net = calcularUsdtNetoVentaUsd({
        montoUsd: form.monto_entrada,
        comisionPct: form.comision_pct,
        tasa: form.tasa,
      })
      const next = net == null ? '' : String(Math.round(net * 1e8) / 1e8)
      setForm((f) => (f.monto_salida === next ? f : { ...f, monto_salida: next }))
      return
    }
    const usd = calcularUsdNetoCompraUsdt({
      montoUsdt: form.monto_entrada,
      comisionPct: form.comision_pct,
      tasa: form.tasa,
    })
    const next = usd == null ? '' : String(Math.round(usd * 1e8) / 1e8)
    setForm((f) => (f.monto_salida === next ? f : { ...f, monto_salida: next }))
  }, [
    autoCambioUsdUsdt,
    form.cambio_auto_fijo_salida,
    form.monto_entrada,
    form.comision_pct,
    form.comision_fija,
    form.tasa,
    form.tipo,
    form.moneda_entrada,
    form.moneda_salida,
  ])

  useEffect(() => {
    if (!autoCambioUsdUsdt || !form.cambio_auto_fijo_salida) return
    if (form.tipo === 'venta') {
      const usd = calcularUsdEntradaDesdeUsdtNeto({
        montoUsdtNeto: form.monto_salida,
        comisionPct: form.comision_pct,
        tasa: form.tasa,
      })
      const next = usd == null ? '' : String(Math.round(usd * 1e8) / 1e8)
      setForm((f) => (f.monto_entrada === next ? f : { ...f, monto_entrada: next }))
      return
    }
    const usdt = calcularUsdtEntradaDesdeUsdNetoCompra({
      montoUsdNeto: form.monto_salida,
      comisionPct: form.comision_pct,
      tasa: form.tasa,
    })
    const next = usdt == null ? '' : String(Math.round(usdt * 1e8) / 1e8)
    setForm((f) => (f.monto_entrada === next ? f : { ...f, monto_entrada: next }))
  }, [
    autoCambioUsdUsdt,
    form.cambio_auto_fijo_salida,
    form.monto_salida,
    form.comision_pct,
    form.comision_fija,
    form.tasa,
    form.tipo,
    form.moneda_entrada,
    form.moneda_salida,
  ])

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

  function updateField(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'tipo') {
        if (value === 'compra') {
          next.moneda_entrada = 'USDT'
          next.moneda_salida = 'USD'
        } else if (value === 'venta') {
          next.moneda_entrada = 'USD'
          next.moneda_salida = 'USDT'
        }
        next.monto_entrada = ''
        next.monto_salida = ''
        next.cambio_auto_fijo_salida = false
      }
      const autoPar =
        ((next.tipo === 'venta' &&
          next.moneda_entrada === 'USD' &&
          next.moneda_salida === 'USDT') ||
          (next.tipo === 'compra' &&
            next.moneda_entrada === 'USDT' &&
            next.moneda_salida === 'USD')) &&
        !(Number(next.comision_fija) > 0)
      if (
        field === 'moneda_entrada' ||
        field === 'moneda_salida' ||
        field === 'comision_fija'
      ) {
        if (!autoPar) {
          next.monto_salida = ''
          next.monto_entrada = ''
          next.cambio_auto_fijo_salida = false
        }
      }
      return next
    })
  }

  function toggleCambioAutoFijoSalida() {
    setForm((f) => ({
      ...f,
      cambio_auto_fijo_salida: !f.cambio_auto_fijo_salida,
      monto_entrada: '',
      monto_salida: '',
    }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.cliente_id) {
      setError('Debes seleccionar un cliente para guardar la operación.')
      return
    }
    const mIn = form.monto_entrada === '' ? 0 : Number(form.monto_entrada)
    const mOut = form.monto_salida === '' ? 0 : Number(form.monto_salida)
    if (!(mIn > 0)) {
      setError('Indica un monto de entrada mayor que 0.')
      return
    }
    if (!(mOut > 0)) {
      setError('El monto de salida debe ser mayor que 0 (revisa el % o la tasa).')
      return
    }
    const pct = form.comision_pct === '' ? 0 : Number(form.comision_pct)
    const autoParForm =
      ((form.tipo === 'venta' &&
        form.moneda_entrada === 'USD' &&
        form.moneda_salida === 'USDT') ||
        (form.tipo === 'compra' &&
          form.moneda_entrada === 'USDT' &&
          form.moneda_salida === 'USD')) &&
      !(Number(form.comision_fija) > 0)
    if (autoParForm) {
      if (form.cambio_auto_fijo_salida) {
        if (!Number.isFinite(pct) || pct < 0) {
          setError('El % de comisión no es válido.')
          return
        }
      } else if (!(pct > 0 && pct < 100)) {
        setError(
          'Para el cálculo automático del segundo monto usa un % de comisión entre 0 y 100 (excl.).',
        )
        return
      }
    }
    setSaving(true)
    try {
      await crearOperacion({
        cliente_id: form.cliente_id,
        modo_operacion: form.modo_operacion,
        comision_moneda: form.comision_moneda,
        tipo: form.tipo,
        moneda_entrada: form.moneda_entrada,
        moneda_salida: form.moneda_salida,
        monto_entrada: mIn,
        monto_salida: mOut,
        tasa: form.tasa === '' ? null : Number(form.tasa),
        comision_pct: form.comision_pct === '' ? 0 : Number(form.comision_pct),
        comision_fija: form.comision_fija === '' ? 0 : Number(form.comision_fija),
        estado: form.estado,
        observacion: form.observacion,
        cambio_auto_fijo_salida: form.cambio_auto_fijo_salida,
      })
      setForm({ ...defaultForm })
      bumpDashboard()
      navigate(ROUTES.home, { replace: true })
    } catch (errSubmit) {
      setError(errSubmit?.message ?? String(errSubmit))
    } finally {
      setSaving(false)
    }
  }

  const pendienteOParcial = form.estado === 'pendiente' || form.estado === 'parcial'
  const esIntermediacion = form.modo_operacion === 'intermediacion'
  const puedeGuardar = Boolean(form.cliente_id) && clientes.length > 0

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-semibold text-white">Nueva operación</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cálculo en vivo, guardado en Supabase, caja automática y refresco del inicio al guardar.
        </p>
      </header>

      <section className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <form className={`${cardClass} flex-1 space-y-4`} onSubmit={onSubmit}>
          <div>
            <label className={labelClass}>Cliente</label>
            <select
              className={inputClass}
              value={form.cliente_id}
              onChange={(e) => updateField('cliente_id', e.target.value)}
              disabled={loadingClientes}
              required
            >
              <option value="" disabled>
                Selecciona un cliente (obligatorio)
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.nombre, c.alias].filter(Boolean).join(' · ') || c.id}
                </option>
              ))}
            </select>
            {esIntermediacion ? (
              <p className="mt-2 text-xs text-zinc-500">
                En intermediación no se generan cuentas por cobrar/pagar automáticas: el principal no
                pasa por tu caja.
              </p>
            ) : pendienteOParcial ? (
              <p className="mt-2 text-xs text-zinc-500">
                Con estado pendiente o parcial se registrará la deuda en cuentas por cobrar (venta) o
                por pagar (compra).
              </p>
            ) : null}
            {!loadingClientes && clientes.length === 0 ? (
              <p className="mt-2 text-xs text-amber-400">
                No hay clientes. Crea uno en la pestaña Clientes antes de operar.
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>Modo</label>
            <select
              className={inputClass}
              value={form.modo_operacion}
              onChange={(e) => updateField('modo_operacion', e.target.value)}
            >
              {MODOS_OPERACION.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {esIntermediacion ? (
            <div>
              <label className={labelClass}>Comisión entra en caja como</label>
              <select
                className={inputClass}
                value={form.comision_moneda}
                onChange={(e) => updateField('comision_moneda', e.target.value)}
              >
                {MONEDAS_COMISION.map((mon) => (
                  <option key={mon} value={mon}>
                    {mon}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className={labelClass}>Tipo</label>
            <select
              className={inputClass}
              value={form.tipo}
              onChange={(e) => updateField('tipo', e.target.value)}
            >
              {TIPOS_OPERACION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Moneda entrada</label>
              <select
                className={inputClass}
                value={form.moneda_entrada}
                onChange={(e) => updateField('moneda_entrada', e.target.value)}
                required
              >
                {MONEDAS_CAMBIO.map((mon) => (
                  <option key={mon} value={mon}>
                    {mon}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Moneda salida</label>
              <select
                className={inputClass}
                value={form.moneda_salida}
                onChange={(e) => updateField('moneda_salida', e.target.value)}
                required
              >
                {MONEDAS_CAMBIO.map((mon) => (
                  <option key={mon} value={mon}>
                    {mon}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Monto entrada{' '}
                {autoCambioUsdUsdt && form.cambio_auto_fijo_salida ? '(calculado)' : ''}
              </label>
              <input
                className={`${inputClass} ${autoCambioUsdUsdt && form.cambio_auto_fijo_salida ? 'cursor-not-allowed opacity-90' : ''}`}
                type="number"
                min="0"
                step="any"
                value={form.monto_entrada}
                onChange={(e) => updateField('monto_entrada', e.target.value)}
                placeholder="0"
                readOnly={autoCambioUsdUsdt && form.cambio_auto_fijo_salida}
                title={
                  autoCambioUsdUsdt && form.cambio_auto_fijo_salida
                    ? `Se calcula desde ${fijoAutoSalidaLabel} (salida) y % de comisión.`
                    : undefined
                }
              />
            </div>
            <div>
              <label className={labelClass}>
                Monto salida {autoCambioUsdUsdt && !form.cambio_auto_fijo_salida ? '(calculado)' : ''}
              </label>
              <input
                className={`${inputClass} ${autoCambioUsdUsdt && !form.cambio_auto_fijo_salida ? 'cursor-not-allowed opacity-90' : ''}`}
                type="number"
                min="0"
                step="any"
                value={form.monto_salida}
                onChange={(e) => updateField('monto_salida', e.target.value)}
                placeholder="0"
                readOnly={autoCambioUsdUsdt && !form.cambio_auto_fijo_salida}
                title={
                  autoCambioUsdUsdt && !form.cambio_auto_fijo_salida
                    ? `Se calcula desde ${fijoAutoEntradaLabel} de entrada y % de comisión.`
                    : undefined
                }
              />
            </div>
          </div>

          {((form.tipo === 'venta' &&
            form.moneda_entrada === 'USD' &&
            form.moneda_salida === 'USDT') ||
            (form.tipo === 'compra' &&
              form.moneda_entrada === 'USDT' &&
              form.moneda_salida === 'USD')) &&
          !autoCambioUsdUsdt ? (
            <p className="text-xs text-zinc-500">
              Si usas <span className="text-zinc-400">comisión fija</span> mayor que 0, indica el monto de
              salida a mano.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Comisión %</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="any"
                value={form.comision_pct}
                onChange={(e) => updateField('comision_pct', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Comisión fija</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="any"
                value={form.comision_fija}
                onChange={(e) => updateField('comision_fija', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: '0%', value: '0' },
              { label: '1%', value: '1' },
              { label: '4%', value: '4' },
              { label: '5%', value: '5' },
            ].map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => updateField('comision_pct', shortcut.value)}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600"
              >
                {shortcut.label}
              </button>
            ))}
            <button
              type="button"
              disabled={!autoCambioUsdUsdt}
              onClick={toggleCambioAutoFijoSalida}
              title={
                autoCambioUsdUsdt
                  ? form.cambio_auto_fijo_salida
                    ? `Pasas a fijar ${fijoAutoEntradaLabel} y calcular ${fijoAutoSalidaLabel}`
                    : form.tipo === 'venta'
                      ? `Fijas ${fijoAutoSalidaLabel} neto y se calcula el ${fijoAutoEntradaLabel} a cobrar (comisión % sobre nominal ${fijoAutoEntradaLabel} aparte)`
                      : `Fijas ${fijoAutoSalidaLabel} neto y se calcula el ${fijoAutoEntradaLabel} a recibir (comisión % sobre nominal USDT aparte)`
                  : 'Solo en venta USD → USDT o compra USDT → USD sin comisión fija'
              }
              className="rounded-2xl border border-sky-600/50 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⇄ Fijo:{' '}
              {form.cambio_auto_fijo_salida ? fijoAutoSalidaLabel : fijoAutoEntradaLabel}
            </button>
          </div>

          <div>
            <label className={labelClass}>Estado</label>
            <select
              className={inputClass}
              value={form.estado}
              onChange={(e) => updateField('estado', e.target.value)}
            >
              {ESTADOS_OPERACION.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Observación</label>
            <textarea
              className={`${inputClass} min-h-[96px] resize-none`}
              value={form.observacion}
              onChange={(e) => updateField('observacion', e.target.value)}
              placeholder="Cliente frecuente, pago parcial, tasa especial…"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={saving || !puedeGuardar}
            className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar operación'}
          </button>
        </form>

        <aside className="w-full shrink-0 space-y-4 lg:max-w-sm">
          <div className={`${cardClass} border-emerald-500/25 bg-emerald-500/5`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Vista previa
            </div>
            <div className="mt-2 text-lg font-semibold text-white">Resultado automático</div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-zinc-500">Monto salida</div>
                <div className="mt-1 font-semibold text-zinc-100">
                  {formatNumber(preview.montoSalida)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Monto entrada</div>
                <div className="mt-1 font-semibold text-zinc-100">
                  {formatNumber(preview.montoEntrada)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-zinc-500">Comisión neta (sobre el lado principal del tipo)</div>
                <div className="mt-1 font-semibold text-zinc-200">
                  {formatNumber(preview.comisionNeta)}
                </div>
              </div>
              {!esIntermediacion ? (
                <>
                  <div>
                    <div className="text-zinc-500">Costo real</div>
                    <div className="mt-1 font-semibold text-zinc-100">
                      {formatNumber(preview.costoReal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Ingreso real</div>
                    <div className="mt-1 font-semibold text-zinc-100">
                      {formatNumber(preview.ingresoReal)}
                    </div>
                  </div>
                </>
              ) : null}
              <div className="col-span-2">
                <div className="text-zinc-500">
                  {esIntermediacion ? 'Lo que entra a tu caja (solo comisión)' : 'Ganancia (MVP)'}
                </div>
                <div className="mt-1 text-lg font-semibold text-emerald-400">
                  {formatNumber(preview.ganancia)}
                  {esIntermediacion ? ` ${form.comision_moneda}` : ''}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
