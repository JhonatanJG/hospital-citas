import {
  getSalas,
  createSala,
  updateSala,
  deleteSala,
} = '../api.js';

import {
  renderSkeletonTable,
  renderEmptyState,
  renderPagination,
  showToast,
  showModal,
  closeModal,
  confirmDialog,
} from '../ui.js';

export async function renderSalas(container) {
  let allSalas = [];
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
          <input type="text" class="search-input" id="salas-search" placeholder="Buscar por nombre o piso..." />
        </div>

        <button class="btn btn-primary" id="btn-nueva-sala">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Sala / Consultorio
        </button>
      </div>

      <div id="salas-table-container">
        ${renderSkeletonTable(5, 3)}
      </div>

      <div id="salas-pagination-container"></div>
    </div>
  `;

  async function loadData() {
    const tableContainer = container.querySelector('#salas-table-container');
    tableContainer.innerHTML = renderSkeletonTable(5, 3);
    try {
      allSalas = await getSalas();
      renderPage();
    } catch (err) {
      tableContainer.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${err.message}</p></div>`;
    }
  }

  function renderPage() {
    const tableContainer = container.querySelector('#salas-table-container');
    const paginationContainer = container.querySelector('#salas-pagination-container');

    let filtered = allSalas;
    if (searchTerm) {
      filtered = filtered.filter(s =>
        (s.nombre && s.nombre.toLowerCase().includes(searchTerm)) ||
        (s.piso && String(s.piso).includes(searchTerm))
      );
    }

    if (!filtered.length) {
      tableContainer.innerHTML = renderEmptyState({
        title: 'No hay salas registradas',
        message: searchTerm ? 'No se encontraron salas coincidentes.' : 'Registra consultorios o salas para asignar cupos.',
        actionHtml: `<button class="btn btn-primary btn-sm" id="empty-add-sala">Crear Sala</button>`
      });
      tableContainer.querySelector('#empty-add-sala')?.addEventListener('click', () => openFormModal());
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
              <th>Nombre de la Sala / Consultorio</th>
              <th>Piso</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(s => `
              <tr>
                <td><strong>${s.nombre}</strong></td>
                <td>Piso ${s.piso}</td>
                <td style="text-align: right;">
                  <div class="table-actions" style="justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm btn-edit-s" data-id="${s.id}" title="Editar sala">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="btn btn-danger btn-sm btn-del-s" data-id="${s.id}" title="Eliminar sala">
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

    tableContainer.querySelectorAll('.btn-edit-s').forEach(btn => {
      btn.addEventListener('click', () => openFormModal(btn.dataset.id));
    });

    tableContainer.querySelectorAll('.btn-del-s').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Eliminar Consultorio',
          message: '¿Estás seguro de eliminar este consultorio? No podrá eliminarse si tiene cupos asignados.',
          confirmText: 'Sí, eliminar',
          isDanger: true,
        });
        if (!ok) return;
        try {
          await deleteSala(btn.dataset.id);
          showToast('Consultorio eliminado correctamente');
          loadData();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });
  }

  function openFormModal(id = null) {
    const isEdit = Boolean(id);
    const existing = isEdit ? allSalas.find(s => s.id === id) : null;

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Editar Sala' : 'Nueva Sala / Consultorio'}</h3>
        <button class="modal-close-btn" id="s-form-x">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre del Consultorio / Sala *</label>
          <input type="text" class="form-control" id="sf-nom" placeholder="Ej: Consultorio 101" value="${existing?.nombre || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Número de Piso *</label>
          <input type="number" class="form-control" id="sf-piso" min="1" max="20" value="${existing?.piso || 1}" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="sf-cancel-btn">Cancelar</button>
        <button class="btn btn-primary" id="sf-save-btn">${isEdit ? 'Guardar Cambios' : 'Crear Sala'}</button>
      </div>
    `;

    showModal(html);

    document.getElementById('s-form-x')?.addEventListener('click', closeModal);
    document.getElementById('sf-cancel-btn')?.addEventListener('click', closeModal);

    document.getElementById('sf-save-btn')?.addEventListener('click', async () => {
      const nombre = document.getElementById('sf-nom').value.trim();
      const piso = parseInt(document.getElementById('sf-piso').value, 10);

      if (!nombre) return showToast('El nombre de la sala es obligatorio', 'warning');
      if (isNaN(piso) || piso < 1) return showToast('El número de piso debe ser un entero positivo', 'warning');

      const saveBtn = document.getElementById('sf-save-btn');
      saveBtn.classList.add('btn-loading');

      try {
        const payload = { nombre, piso };
        if (isEdit) {
          await updateSala(id, payload);
          showToast('Sala actualizada correctamente');
        } else {
          await createSala(payload);
          showToast('Sala registrada correctamente');
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

  container.querySelector('#salas-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderPage();
  });

  container.querySelector('#btn-nueva-sala').addEventListener('click', () => openFormModal());

  loadData();
}
