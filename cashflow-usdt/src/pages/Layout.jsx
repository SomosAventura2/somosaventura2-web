import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { ROUTES } from '../utils/constants'

export function Layout() {
  const { pathname } = useLocation()
  const hideNav = pathname === ROUTES.login

  return (
    <div className="flex min-h-dvh flex-col">
      <main
        className={`mx-auto w-full max-w-lg flex-1 px-4 pt-4 ${hideNav ? 'pb-6' : 'pb-24'}`}
      >
        <Outlet />
      </main>
      {!hideNav ? <BottomNav /> : null}
    </div>
  )
}
