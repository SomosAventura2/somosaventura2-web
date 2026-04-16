export function AbonoModal({
  open,
  onClose,
  onSubmit,
  deuda,
  kind,
  amount,
  setAmount,
  saving,
}) {
  if (!open) return null

  const titulo = kind === 'cobrar' ? 'Registrar cobro' : 'Registrar pago'
  const moneda = deuda?.moneda ?? '—'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="abono-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <h2 id="abono-title" className="text-lg font-semibold text-white">
          {titulo}
        </h2>
        {deuda ? (
          <p className="mt-2 text-sm text-zinc-400">
            Saldo pendiente:{' '}
            <span className="font-medium text-zinc-100">
              {Number(deuda.saldo ?? 0).toLocaleString('es-VE', { maximumFractionDigits: 4 })} {moneda}
            </span>
          </p>
        ) : null}

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Monto del abono ({moneda})
        </label>
        <input
          type="number"
          min="0"
          step="any"
          className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/25"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          disabled={saving}
        />

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            onClick={onSubmit}
            disabled={saving || !deuda}
          >
            {saving ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
