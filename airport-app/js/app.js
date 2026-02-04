/**
 * AIRPORT - Aplicación principal (SPA)
 * Inicializa tras login: auth, router, logout.
 */

import { getCurrentUser, logout } from './modules/auth.js';
import { init as routerInit, navigateTo, getCurrentRoute } from './router.js';
import { showToast } from './ui/toast.js';

export const App = {
  async init() {
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    this.updateUserDisplay(user);
    routerInit();

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
