/**
 * AIRPORT - Notificaciones toast temporales
 */

const TOAST_DURATION_MS = 4000;
const TOAST_CONTAINER_ID = 'toast-container';

const types = {
  success: { bg: '#10b981', icon: '✓' },
  error: { bg: '#ef4444', icon: '!' },
  warning: { bg: '#f59e0b', icon: '!' },
  info: { bg: '#4f46e5', icon: 'i' },
};

/**
 * Muestra un toast y lo elimina tras unos segundos.
 * @param {string} message - Mensaje a mostrar
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Tipo de toast
 * @param {number} [duration] - Duración en ms (por defecto 4000)
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION_MS) {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const config = types[type] || types.info;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.style.setProperty('--toast-bg', config.bg);
  toast.innerHTML = `<span class="toast-icon">${config.icon}</span><span class="toast-message">${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  const timeout = setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);

  toast.addEventListener('click', () => {
    clearTimeout(timeout);
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
