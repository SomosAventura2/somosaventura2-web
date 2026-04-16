import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { BottomNav } from '../../components/BottomNav.jsx'
import { ROUTES } from '../../utils/constants.js'
import { useAppStore } from '../../store/useAppStore.js'

export function AppShell() {
  const { pathname } = useLocation()
  const session = useAppStore((s) => s.session)

  // MVP: si más adelante decides que el login es obligatorio,
  // puedes activar esta redirección.
  const isLoginRoute = pathname === ROUTES.login
  const shouldProtect = false

  if (shouldProtect && !session && !isLoginRoute) {
    return <Navigate to={ROUTES.login} replace />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-zinc-900 bg-zinc-950/90 px-4 pb-2 pt-3">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-zinc-100">
              CashFlow USDT
            </h1>
            <p className="text-[11px] text-zinc-500">
              Ganancia, caja, deudas y USDT en un solo lugar
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-32">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}

