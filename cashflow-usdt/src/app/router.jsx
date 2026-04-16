import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './layout/AppShell.jsx'
import { ROUTES } from '../utils/constants.js'

// Páginas existentes reutilizadas en el nuevo router
import { Dashboard } from '../pages/Dashboard.jsx'
import { NuevaOperacion } from '../pages/NuevaOperacion.jsx'
import { Operaciones } from '../pages/Operaciones.jsx'
import { Clientes } from '../pages/Clientes.jsx'
import { Deudas } from '../pages/Deudas.jsx'
import { Caja } from '../pages/Caja.jsx'
import { Reportes } from '../pages/Reportes.jsx'
import { Login } from '../pages/Login.jsx'

export const router = createBrowserRouter([
  {
    path: ROUTES.login,
    element: <Login />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: ROUTES.operar.slice(1), element: <NuevaOperacion /> },
      { path: ROUTES.operaciones.slice(1), element: <Operaciones /> },
      { path: ROUTES.clientes.slice(1), element: <Clientes /> },
      { path: ROUTES.deudas.slice(1), element: <Deudas /> },
      { path: ROUTES.caja.slice(1), element: <Caja /> },
      { path: ROUTES.reportes.slice(1), element: <Reportes /> },
    ],
  },
])

