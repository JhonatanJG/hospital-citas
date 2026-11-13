/**
 * Utilidades de Interfaz de Usuario (UI Helpers).
 * Manejo de toasts, modales, skeletons, formateadores y estados vacíos.
 */

// ─── TOASTS ────────────────────────────────────────────────────────────────────
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  };

  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 4000);
}

// ─── MODALES ───────────────────────────────────────────────────────────────────
export function showModal(contentHtml, isLarge = false) {
  const backdrop = document.getElementById('modal-backdrop');
  const dialog = document.getElementById('modal-dialog');
  const content = document.getElementById('modal-content');

  if (!backdrop || !dialog || !content) return;

  if (isLarge) {
    dialog.classList.add('modal-dialog-lg');
  } else {
    dialog.classList.remove('modal-dialog-lg');
  }

  content.innerHTML = contentHtml;
  backdrop.classList.add('active');

  // Cerrar con Escape
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      window.removeEventListener('keydown', onKeyDown);
    }
  };
  window.addEventListener('keydown', onKeyDown);
}

export function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}

// Inicializar listener de cierre al hacer click en el backdrop
document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
});

// ─── DIÁLOGO DE CONFIRMACIÓN ──────────────────────────────────────────────────
export function confirmDialog({ title = '¿Estás seguro?', message = 'Esta acción no se puede deshacer.', confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = true }) {
  return new Promise((resolve) => {
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close-btn" id="confirm-cancel-x">&times;</button>
      </div>
      <div class="modal-body">
        <p style="color: #475569; font-size: 0.95rem;">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="confirm-cancel-btn">${cancelText}</button>
        <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="confirm-accept-btn">${confirmText}</button>
      </div>
    `;

    showModal(html);

    const cleanup = () => {
      closeModal();
    };

    document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    document.getElementById('confirm-cancel-x')?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    document.getElementById('confirm-accept-btn')?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}

// ─── SKELETON LOADERS ──────────────────────────────────────────────────────────
export function renderSkeletonTable(rows = 5, cols = 4) {
  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            ${Array.from({ length: cols }).map(() => `<th><div class="skeleton skeleton-cell" style="width: 70%;"></div></th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;
  for (let r = 0; r < rows; r++) {
    html += `
      <tr>
        ${Array.from({ length: cols }).map(() => `<td><div class="skeleton skeleton-cell" style="width: ${Math.floor(Math.random() * 40 + 50)}%;"></div></td>`).join('')}
      </tr>
    `;
  }
  html += `
        </tbody>
      </table>
    </div>
  `;
  return html;
}

// ─── ESTADO VACÍO (EMPTY STATE) ────────────────────────────────────────────────
export function renderEmptyState({ title = 'No hay registros', message = 'No se encontraron datos para mostrar.', actionHtml = '' }) {
  return `
    <div class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h3 class="empty-state-title">${title}</h3>
      <p class="empty-state-text">${message}</p>
      ${actionHtml}
    </div>
  `;
}

// ─── BADGES ────────────────────────────────────────────────────────────────────
export function badgeHtml(estado) {
  const norm = String(estado || '').toLowerCase();
  const labels = {
    programada: 'Programada',
    atendida: 'Atendida',
    cancelada: 'Cancelada',
    libre: 'Libre',
    ocupada: 'Ocupada',
  };
  const label = labels[norm] || estado;
  return `<span class="badge badge-${norm}">${label}</span>`;
}

export function stockBadgeHtml(stock) {
  const count = Number(stock || 0);
  if (count < 10) {
    return `<span class="badge badge-stock-bajo">Stock Bajo (${count})</span>`;
  }
  return `<span class="badge badge-stock-ok">${count} unidades</span>`;
}

// ─── FORMATEADORES ─────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  // Si viene en formato ISO con hora o YYYY-MM-DD
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatTime(timeStr) {
  if (!timeStr) return '-';
  return String(timeStr).slice(0, 5);
}

// ─── PAGINACIÓN ────────────────────────────────────────────────────────────────
export function renderPagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) return '';

  const wrapper = document.createElement('div');
  wrapper.className = 'pagination-wrapper';
  wrapper.innerHTML = `
    <span>Mostrando página <strong>${currentPage}</strong> de <strong>${totalPages}</strong> (${totalItems} registros)</span>
    <div class="pagination-buttons">
      <button class="btn btn-secondary btn-sm" id="pg-prev" ${currentPage <= 1 ? 'disabled' : ''}>Anterior</button>
      <button class="btn btn-secondary btn-sm" id="pg-next" ${currentPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
    </div>
  `;

  wrapper.querySelector('#pg-prev')?.addEventListener('click', () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  });
  wrapper.querySelector('#pg-next')?.addEventListener('click', () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  });

  return wrapper;
}
