import { useCallback, useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { createCliente, fetchClientes } from '../features/operaciones/api.js'

const emptyForm = {
  nombre: '',
  apellido: '',
  telefono: '',
  alias: '',
}

export function Clientes() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchClientes()
      setList(rows)
    } catch (e) {
      setError(e?.message ?? String(e))
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await createCliente({
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
        alias: form.alias,
      })
      setForm(emptyForm)
      await load()
    } catch (errSubmit) {
      setError(errSubmit?.message ?? String(errSubmit))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-semibold text-white">Clientes</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Alta y listado. El nombre completo se guarda en Supabase para usarlo en operaciones y deudas.
        </p>
      </header>

      <Card>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-zinc-400">Nuevo cliente</h2>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              autoComplete="given-name"
              className="gap-1.5"
            />
            <Input
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={(e) => updateField('apellido', e.target.value)}
              autoComplete="family-name"
              className="gap-1.5"
            />
          </div>
          <Input
            label="Teléfono (opcional)"
            name="telefono"
            type="tel"
            value={form.telefono}
            onChange={(e) => updateField('telefono', e.target.value)}
            autoComplete="tel"
            className="gap-1.5"
          />
          <Input
            label="Alias / apodo (opcional)"
            name="alias"
            value={form.alias}
            onChange={(e) => updateField('alias', e.target.value)}
            className="gap-1.5"
          />
          {error ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar cliente'}
          </button>
        </form>
      </Card>

      <Card title="Directorio">
        {loading ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no hay clientes. Crea el primero arriba.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 text-sm">
            {list.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5 py-3 first:pt-0">
                <span className="font-medium text-zinc-100">
                  {c.nombre || '—'}
                  {c.alias && c.alias !== c.nombre ? (
                    <span className="text-zinc-500"> · {c.alias}</span>
                  ) : null}
                </span>
                {c.telefono ? <span className="text-xs text-zinc-500">{c.telefono}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
