import {
  getMedicamentos,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
} from '../api.js';

import {
  stockBadgeHtml,
  renderSkeletonTable,
  renderEmptyState,
  renderPagination,
  showToast,
  showModal,
  closeModal,
  confirmDialog,
} from '../ui.js';

export async function renderMedicamentos(container) {
  let allMedicamentos = [];
  let currentPage = 1;
  const pageSize = 10;
  let searchTerm = '';

  container.innerHTML = `
    <div class="card">
      <div class="toolbar-header">
        <div class="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="search-input" id="meds-search" placeholder="Buscar medicamento por nombre..." />
        </div>

        <button class="btn btn-primary" id="btn-nuevo-med">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo Medicamento
        </button>
      </div>

      <div id="meds-table-container">
        ${renderSkeletonTable(6, 4)}
      </div>

      <div id="meds-pagination-container"></div>
    </div>
  `;

  async function loadData() {
    const tableContainer = container.querySelector('#meds-table-container');
    tableContainer.innerHTML = renderSkeletonTable(6, 4);

    try {
      allMedicamentos = await getMedicamentos();
      renderPage();
    } catch (err) {
      tableContainer.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${err.message}</p></div>`;
    }
  }

  function renderPage() {
    const tableContainer = container.querySelector('#meds-table-container');
    const paginationContainer = container.querySelector('#meds-pagination-container');

    let filtered = allMedicamentos;
    if (searchTerm) {
      filtered = filtered.filter(m => m.nombre && m.nombre.toLowerCase().includes(searchTerm));
    }

    if (!filtered.length) {
      tableContainer.innerHTML = renderEmptyState({
        title: 'No hay medicamentos',
        message: searchTerm ? 'No se encontraron medicamentos coincidentes.' : 'Registra medicamentos para el inventario de la farmacia.',
        actionHtml: `<button class="btn btn-primary btn-sm" id="empty-add-med">Agregar Medicamento</button>`
      });
      tableContainer.querySelector('#empty-add-med')?.addEventListener('click', () => openFormModal());
      paginationContainer.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(filtered.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(startIdx, startIdx + pageSize);

    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre del Medicamento</th>
              <th>Stock Disponible</th>
              <th>Estado de Inventario</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(m => `
              <tr>
                <td><strong>${m.nombre}</strong></td>
                <td><span style="font-weight: 700; font-size: 1rem;">${m.stock}</span> unidades</td>
                <td>${stockBadgeHtml(m.stock)}</td>
                <td style="text-align: right;">
                  <div class="table-actions" style="justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm btn-edit-med" data-id="${m.id}" title="Editar stock/nombre">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="btn btn-danger btn-sm btn-del-med" data-id="${m.id}" title="Eliminar medicamento">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    paginationContainer.innerHTML = '';
    const pgElem = renderPagination({
      currentPage,
      totalPages,
      totalItems: filtered.length,
      onPageChange: (newPage) => {
        currentPage = newPage;
        renderPage();
      },
    });
    if (pgElem) paginationContainer.appendChild(pgElem);

    tableContainer.querySelectorAll('.btn-edit-med').forEach(btn => {
      btn.addEventListener('click', () => openFormModal(btn.dataset.id));
    });

    tableContainer.querySelectorAll('.btn-del-med').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Eliminar Medicamento',
          message: '¿Estás seguro de eliminar este medicamento? No podrá eliminarse si ya fue prescrito en alguna cita.',
          confirmText: 'Sí, eliminar',
          isDanger: true,
        });
        if (!ok) return;
        try {
          await deleteMedicamento(btn.dataset.id);
          showToast('Medicamento eliminado');
          loadData();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });
  }

  function openFormModal(id = null) {
    const isEdit = Boolean(id);
    const existing = isEdit ? allMedicamentos.find(m => m.id === id) : null;

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Editar Medicamento' : 'Nuevo Medicamento'}</h3>
        <button class="modal-close-btn" id="med-form-x">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre del Medicamento (con concentración) *</label>
          <input type="text" class="form-control" id="mf-nom" placeholder="Ej: Ibuprofeno 400mg" value="${existing?.nombre || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Unidades en Stock *</label>
          <input type="number" class="form-control" id="mf-stock" min="0" value="${existing?.stock !== undefined ? existing.stock : 50}" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="med-cancel-btn">Cancelar</button>
        <button class="btn btn-primary" id="med-save-btn">${isEdit ? 'Guardar Cambios' : 'Registrar'}</button>
      </div>
    `;

    showModal(html);

    document.getElementById('med-form-x')?.addEventListener('click', closeModal);
    document.getElementById('med-cancel-btn')?.addEventListener('click', closeModal);

    document.getElementById('med-save-btn')?.addEventListener('click', async () => {
      const nombre = document.getElementById('mf-nom').value.trim();
      const stock = parseInt(document.getElementById('mf-stock').value, 10);

      if (!nombre) return showToast('El nombre del medicamento es obligatorio', 'warning');
      if (isNaN(stock) || stock < 0) return showToast('El stock no puede ser negativo', 'warning');

      const saveBtn = document.getElementById('med-save-btn');
      saveBtn.classList.add('btn-loading');

      try {
        const payload = { nombre, stock };
        if (isEdit) {
          await updateMedicamento(id, payload);
          showToast('Medicamento actualizado');
        } else {
          await createMedicamento(payload);
          showToast('Medicamento registrado');
        }
        closeModal();
        loadData();
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        saveBtn.classList.remove('btn-loading');
      }
    });
  }

  container.querySelector('#meds-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderPage();
  });

  container.querySelector('#btn-nuevo-med').addEventListener('click', () => openFormModal());

  loadData();
}
