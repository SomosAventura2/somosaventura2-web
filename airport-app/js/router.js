/**
 * AIRPORT - Router SPA (hash-based)
 * Rutas: #dashboard, #orders, #orders/new, #orders/:id, #expenses, #categories, #profile
 */

const routes = {
  dashboard: { hash: '#dashboard', module: 'dashboard', label: 'Dashboard' },
  orders: { hash: '#orders', module: 'orders', label: 'Pedidos' },
  expenses: { hash: '#expenses', module: 'expenses', label: 'Gastos' },
  categories: { hash: '#categories', module: 'categories', label: 'Categorías' },
  profile: { hash: '#profile', module: 'profile', label: 'Perfil' },
};

let currentModule = null;
let currentRoute = null;

/**
 * Parsea el hash y devuelve { routeName, subRoute, param }.
 * Ej: #orders/new → { routeName: 'orders', subRoute: 'new' }
 *     #orders/abc-123 → { routeName: 'orders', subRoute: 'detail', param: 'abc-123' }
 */
export function parseHash() {
  const hash = (window.location.hash || '#dashboard').slice(1).toLowerCase();
  const parts = hash.split('/').filter(Boolean);
  const routeName = parts[0] && routes[parts[0]] ? parts[0] : 'dashboard';
  const subRoute = parts[1] || null; // 'new' o uuid
  const param =
    subRoute && subRoute !== 'new' && subRoute.length > 10 ? subRoute : null;
  return {
    routeName,
    subRoute: subRoute === 'new' ? 'new' : param ? 'detail' : null,
    param: param || null,
  };
}

/**
 * Obtiene la ruta actual (nombre base para navegación).
 */
export function getCurrentRoute() {
  return parseHash().routeName;
}

/**
 * Navega a una ruta (cambia hash y carga el módulo).
 * @param {string} routeName - Nombre de la ruta
 * @param {string} [subRoute] - 'new' o id para detalle
 */
export async function navigateTo(routeName, subRoute) {
  let hash = routes[routeName]?.hash || '#dashboard';
  if (subRoute) hash += '/' + subRoute;
  window.location.hash = hash;
  await loadRouteFromHash();
}

/**
 * Carga el módulo según el hash actual (incluye subrutas).
 */
export async function loadRouteFromHash() {
  const { routeName, subRoute, param } = parseHash();
  const route = routes[routeName];
  if (!route) return;

  currentRoute = routeName;
  const container =
    document.getElementById('app-content-inner') || document.getElementById('app-content');
  if (!container) return;

  const routeOptions = { subRoute, param };

  try {
    if (currentModule?.destroy instanceof Function) {
      currentModule.destroy();
    }
    currentModule = null;

    const modulePath = `./modules/${route.module}.js`;
    const mod = await import(modulePath);
    const Module =
      mod.default ||
      mod[route.module] ||
      mod.DashboardModule ||
      mod.OrdersModule ||
      mod.ExpensesModule ||
      mod.CategoriesModule ||
      mod.ProfileModule;
    if (Module?.init) {
      currentModule = Module;
      await Module.init(container, routeOptions);
    } else {
      container.innerHTML = `<p class="page-placeholder">${route.label} — Módulo en desarrollo.</p>`;
    }
  } catch (err) {
    console.error('Error loading route:', err);
    container.innerHTML = `<p class="page-placeholder page-placeholder--error">No se pudo cargar ${route.label}.</p>`;
  }
}

/**
 * Carga el módulo correspondiente a la ruta actual (compatibilidad).
 * @param {string} [routeName] - Si no se pasa, se usa parseHash()
 */
export async function loadRoute(routeName) {
  if (routeName) {
    const route = routes[routeName];
    if (route) window.location.hash = route.hash;
  }
  await loadRouteFromHash();
}

/**
 * Inicializa el router: escucha hashchange y carga la ruta inicial.
 */
export function init() {
  const handleHash = () => loadRouteFromHash();
  window.addEventListener('hashchange', handleHash);
  const { routeName } = parseHash();
  if (!routeName || !routes[routeName]) {
    window.location.hash = '#dashboard';
  } else {
    handleHash();
  }
}

export { routes };
