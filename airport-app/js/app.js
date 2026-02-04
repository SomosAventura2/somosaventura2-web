/**
 * AIRPORT - Aplicación principal (SPA)
 * Inicializa tras login: auth, router, logout. PWA: registra service worker.
 */

import { getCurrentUser, logout } from './modules/auth.js';
import { init as routerInit, navigateTo } from './router.js';
import { showToast } from './ui/toast.js';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

export const App = {
  async init() {
    registerServiceWorker();
    const contentInner = document.getElementById('app-content-inner');
    const showError = (msg) => {
      if (contentInner) contentInner.innerHTML = '<p class="page-placeholder--error">' + (msg || 'Error al cargar la app.') + '</p><a href="login.html" class="btn btn--primary">Volver al login</a>';
    };
    let user;
    try {
      user = await getCurrentUser();
      if (!user) {
        await new Promise((r) => setTimeout(r, 500));
        user = await getCurrentUser();
      }
    } catch (e) {
      console.error('Error getCurrentUser:', e);
      showError('Error de sesión. Vuelve a iniciar sesión.');
      return;
    }
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    this.updateUserDisplay(user);
    try {
      routerInit();
    } catch (e) {
      console.error('Error router:', e);
      showError('Error al cargar la navegación.');
      return;
    }

    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#dashboard';
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const result = await logout();
        if (result?.success !== false) {
          window.location.href = 'login.html';
        } else {
          showToast(result?.error || 'Error al cerrar sesión', 'error');
        }
      });
    }

    this.setupNavListeners();
  },

  updateUserDisplay(user) {
    const el = document.getElementById('app-user-name');
    if (el) {
      const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario';
      el.textContent = name;
    }
  },

  setupNavListeners() {
    const nav = document.getElementById('app-bottom-nav');
    if (!nav) return;
    nav.querySelectorAll('[data-route]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        if (route) navigateTo(route);
      });
    });
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      sidebar.querySelectorAll('[data-route]').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const route = link.getAttribute('data-route');
          if (route) navigateTo(route);
        });
      });
    }
  },
};
