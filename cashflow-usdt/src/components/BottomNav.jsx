import { NavLink } from 'react-router-dom'
import {
  ArrowLeftRight,
  BarChart3,
  HandCoins,
  Home,
  Users,
  Wallet,
} from 'lucide-react'
import { ROUTES } from '../utils/constants'

const items = [
  { to: ROUTES.home, end: true, label: 'Inicio', Icon: Home },
  { to: ROUTES.operar, label: 'Operar', Icon: ArrowLeftRight },
  { to: ROUTES.clientes, label: 'Clientes', Icon: Users },
  { to: ROUTES.deudas, label: 'Deudas', Icon: HandCoins },
  { to: ROUTES.caja, label: 'Caja', Icon: Wallet },
  { to: ROUTES.reportes, label: 'Reportes', Icon: BarChart3 },
]

const linkClass = ({ isActive }) =>
  `flex min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-0.5 py-3 text-[11px] font-medium leading-tight sm:min-w-[4rem] sm:py-3.5 sm:text-xs ${
    isActive ? 'text-emerald-400' : 'text-zinc-500'
  }`

const iconWrap = (isActive) =>
  isActive ? 'text-emerald-400' : 'text-zinc-500'

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="mx-auto flex max-w-lg justify-between gap-0.5 overflow-x-auto px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1">
        {items.map(({ to, end, label, Icon }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-6 w-6 shrink-0 sm:h-7 sm:w-7 ${iconWrap(isActive)}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
