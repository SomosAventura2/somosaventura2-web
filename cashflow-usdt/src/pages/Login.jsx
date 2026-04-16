import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { ROUTES } from '../utils/constants'
import { useAppStore } from '../store/useAppStore'

export function Login() {
  const navigate = useNavigate()
  const setSession = useAppStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    setSession(data.session)
    navigate(ROUTES.home, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center space-y-4 px-4">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-white">Entrar</h1>
        <p className="text-sm text-zinc-500">Supabase Auth (opcional en el MVP)</p>
      </header>
      <Card>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Continuar'}
          </button>
        </form>
      </Card>
      <p className="text-center text-xs text-zinc-600">
        Si aún no usas auth, puedes ir al inicio y trabajar con RLS según tu proyecto.
      </p>
    </div>
  )
}
