import {
  getPacientes,
  createPaciente,
  updatePaciente,
  deletePaciente,
  getPacienteById,
} from '../api.js';

import {
  formatDate,
  renderSkeletonTable,
  renderEmptyState,
  renderPagination,
  showToast,
  showModal,
  closeModal,
  confirmDialog,
} from '../ui.js';

export async function renderPacientes(container) {
  let allPacientes = [];
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
          <input type="text" class="search-input" id="pacientes-search" placeholder="Buscar por nombre o documento..." />
        </div>

        <button class="btn btn-primary" id="btn-nuevo-paciente">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo Paciente
        </button>
      </div>

      <div id="pacientes-table-container">
        ${renderSkeletonTable(6, 6)}
      </div>

      <div id="pacientes-pagination-container"></div>
    </div>
  `;

  async function loadData() {
    const tableContainer = container.querySelector('#pacientes-table-container');
    const paginationContainer = container.querySelector('#pacientes-pagination-container');
    tableContainer.innerHTML = renderSkeletonTable(6, 6);

    try {
      allPacientes = await getPacientes();
      renderPage();
    } catch (err) {
      tableContainer.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${err.message}</p></div>`;
    }
  }

  function renderPage() {
    const tableContainer = container.querySelector('#pacientes-table-container');
    const paginationContainer = container.querySelector('#pacientes-pagination-container');

    let filtered = allPacientes;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(searchTerm)) ||
        (p.documento && p.documento.includes(searchTerm)) ||
        (p.email && p.email.toLowerCase().includes(searchTerm))
      );
    }

    if (!filtered.length) {
      tableContainer.innerHTML = renderEmptyState({
        title: 'No hay pacientes registrados',
        message: searchTerm ? 'No se encontraron pacientes que coincidan con la búsqueda.' : 'Aún no se han agregado pacientes.',
        actionHtml: `<button class="btn btn-primary btn-sm" id="empty-add-paciente">Registrar Paciente</button>`
      });
      tableContainer.querySelector('#empty-add-paciente')?.addEventListener('click', () => openFormModal());
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
              <th>Documento</th>
              <th>Nombre Completo</th>
              <th>Teléfono</th>
              <th>Correo Electrónico</th>
              <th>Fecha Nacimiento</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(p => `
              <tr>
                <td><strong>${p.documento}</strong></td>
                <td>${p.nombre}</td>
                <td>${p.telefono || '-'}</td>
                <td>${p.email || '-'}</td>
                <td>${formatDate(p.fechaNacimiento)}</td>
                <td style="text-align: right;">
                  <div class="table-actions" style="justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm btn-edit-p" data-id="${p.id}" title="Editar paciente">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="btn btn-danger btn-sm btn-del-p" data-id="${p.id}" title="Eliminar paciente">
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

    tableContainer.querySelectorAll('.btn-edit-p').forEach(btn => {
      btn.addEventListener('click', () => openFormModal(btn.dataset.id));
    });

    tableContainer.querySelectorAll('.btn-del-p').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Eliminar Paciente',
          message: '¿Estás seguro de eliminar este paciente? No podrá eliminarse si tiene citas asociadas.',
          confirmText: 'Sí, eliminar',
          isDanger: true,
        });
        if (!ok) return;
        try {
          await deletePaciente(btn.dataset.id);
          showToast('Paciente eliminado exitosamente');
          loadData();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });
  }

  function openFormModal(id = null) {
    const isEdit = Boolean(id);
    const existing = isEdit ? allPacientes.find(p => p.id === id) : null;

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Editar Paciente' : 'Nuevo Paciente'}</h3>
        <button class="modal-close-btn" id="p-form-x">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Documento de Identidad *</label>
            <input type="text" class="form-control" id="f-doc" value="${existing?.documento || ''}" ${isEdit ? 'readonly' : ''} />
          </div>
          <div class="form-group">
            <label class="form-label">Nombre Completo *</label>
            <input type="text" class="form-control" id="f-nom" value="${existing?.nombre || ''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Teléfono Móvil</label>
            <input type="text" class="form-control" id="f-tel" value="${existing?.telefono || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <input type="email" class="form-control" id="f-email" value="${existing?.email || ''}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Nacimiento</label>
          <input type="date" class="form-control" id="f-fnac" value="${existing?.fechaNacimiento ? String(existing.fechaNacimiento).slice(0, 10) : ''}" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="f-cancel-btn">Cancelar</button>
        <button class="btn btn-primary" id="f-save-btn">${isEdit ? 'Guardar Cambios' : 'Crear Paciente'}</button>
      </div>
    `;

    showModal(html);

    document.getElementById('p-form-x')?.addEventListener('click', closeModal);
    document.getElementById('f-cancel-btn')?.addEventListener('click', closeModal);

    document.getElementById('f-save-btn')?.addEventListener('click', async () => {
      const documento = document.getElementById('f-doc').value.trim();
      const nombre = document.getElementById('f-nom').value.trim();
      const telefono = document.getElementById('f-tel').value.trim();
      const email = document.getElementById('f-email').value.trim();
      const fechaNacimiento = document.getElementById('f-fnac').value || null;

      if (!documento) return showToast('El documento es obligatorio', 'warning');
      if (!nombre) return showToast('El nombre es obligatorio', 'warning');

      const saveBtn = document.getElementById('f-save-btn');
      saveBtn.classList.add('btn-loading');

      try {
        const payload = { documento, nombre, telefono, email, fechaNacimiento };
        if (isEdit) {
          await updatePaciente(id, payload);
          showToast('Paciente actualizado correctamente');
        } else {
          await createPaciente(payload);
          showToast('Paciente registrado correctamente');
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

  container.querySelector('#pacientes-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderPage();
  });

  container.querySelector('#btn-nuevo-paciente').addEventListener('click', () => openFormModal());

  loadData();
}
