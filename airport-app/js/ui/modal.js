/**
 * AIRPORT - Modal reutilizable
 */

const MODAL_ID = 'app-modal';
const BACKDROP_ID = 'app-modal-backdrop';

/**
 * Abre un modal con el contenido indicado.
 * @param {string|HTMLElement} content - HTML en string o nodo
 * @param {object} [options] - { title, onClose, closeOnBackdrop }
 */
export function openModal(content, options = {}) {
  const { title = '', onClose, closeOnBackdrop = true } = options;

  let backdrop = document.getElementById(BACKDROP_ID);
  let modal = document.getElementById(MODAL_ID);
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);
  }
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
  }

  const body = typeof content === 'string' ? content : (content?.outerHTML ?? '');
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        ${title ? `<h2 class="modal-title">${escapeHtml(title)}</h2>` : ''}
        <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="modal-body">${body}</div>
    </div>
  `;

  const close = () => {
    modal.classList.remove('modal--open');
    backdrop.classList.remove('modal-backdrop--open');
    if (typeof onClose === 'function') onClose();
  };

  modal.querySelector('.modal-close').addEventListener('click', close);
  if (closeOnBackdrop) backdrop.addEventListener('click', close);
  modal.classList.add('modal--open');
  backdrop.classList.add('modal-backdrop--open');
}

/**
 * Cierra el modal actual.
 */
export function closeModal() {
  const modal = document.getElementById(MODAL_ID);
  const backdrop = document.getElementById(BACKDROP_ID);
  if (modal) modal.classList.remove('modal--open');
  if (backdrop) backdrop.classList.remove('modal-backdrop--open');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
