/**
 * AIRPORT - Router SPA (hash-based)
 * Rutas: #dashboard, #orders, #expenses, #categories, #profile
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
 * Obtiene la ruta actual desde el hash (sin #).
 * @returns {string} - 'dashboard' | 'orders' | 'expenses' | 'categories' | 'profile'
 */
export function getCurrentRoute() {
  const hash = (window.location.hash || '#dashboard').slice(1).toLowerCase();
  return routes[hash] ? hash : 'dashboard';
}

/**
 * Navega a una ruta (cambia hash y carga el módulo).
 * @param {string} routeName - Nombre de la ruta
 */
export async function navigateTo(routeName) {
  const route = routes[routeName];
  if (!route) {
    window.location.hash = '#dashboard';
    return;
  }
  window.location.hash = route.hash;
  await loadRoute(routeName);
}

/**
 * Carga el módulo correspondiente a la ruta actual.
 * @param {string} [routeName] - Si no se pasa, se usa getCurrentRoute()
 */
export async function loadRoute(routeName = getCurrentRoute()) {
  const route = routes[routeName];
  if (!route) return;

  currentRoute = routeName;
  const container = document.getElementById('app-content-inner') || document.getElementById('app-content');
  if (!container) return;

  try {
    if (currentModule?.destroy instanceof Function) {
      currentModule.destroy();
    }
    currentModule = null;

    const modulePath = `./modules/${route.module}.js`;
    const mod = await import(modulePath);
    const Module = mod.default || mod[route.module] || mod.DashboardModule || mod.OrdersModule || mod.ExpensesModule || mod.CategoriesModule || mod.ProfileModule;
    if (Module?.init) {
      currentModule = Module;
      await Module.init(container);
    } else {
      container.innerHTML = `<p class="page-placeholder">${route.label} — Módulo en desarrollo.</p>`;
    }
  } catch (err) {
    console.error('Error loading route:', err);
    container.innerHTML = `<p class="page-placeholder page-placeholder--error">No se pudo cargar ${route.label}.</p>`;
  }
}

/**
 * Inicializa el router: escucha hashchange y carga la ruta inicial.
 */
export function init() {
  const handleHash = () => loadRoute(getCurrentRoute());
  window.addEventListener('hashchange', handleHash);
  if (!window.location.hash || !routes[window.location.hash.slice(1).toLowerCase()]) {
    window.location.hash = '#dashboard';
  } else {
    handleHash();
  }
}

export { routes };
