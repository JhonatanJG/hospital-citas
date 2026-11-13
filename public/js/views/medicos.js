import {
  getMedicos,
  createMedico,
  updateMedico,
  deleteMedico,
} from '../api.js';

import {
  renderSkeletonTable,
  renderEmptyState,
  renderPagination,
  showToast,
  showModal,
  closeModal,
  confirmDialog,
} from '../ui.js';

const ESPECIALIDADES_DISPONIBLES = [
  'Medicina General',
  'Cardiología',
  'Pediatría',
  'Ginecología',
  'Ortopedia',
  'Neurología',
  'Dermatología',
  'Oftalmología',
  'Psiquiatría',
  'Oncología',
];

export async function renderMedicos(container) {
  let allMedicos = [];
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
          <input type="text" class="search-input" id="medicos-search" placeholder="Buscar por médico o especialidad..." />
        </div>

        <button class="btn btn-primary" id="btn-nuevo-medico">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo Médico
        </button>
      </div>

      <div id="medicos-table-container">
        ${renderSkeletonTable(6, 5)}
      </div>

      <div id="medicos-pagination-container"></div>
    </div>
  `;

  async function loadData() {
    const tableContainer = container.querySelector('#medicos-table-container');
    tableContainer.innerHTML = renderSkeletonTable(6, 5);

    try {
      allMedicos = await getMedicos();
      renderPage();
    } catch (err) {
      tableContainer.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${err.message}</p></div>`;
    }
  }

  function renderPage() {
    const tableContainer = container.querySelector('#medicos-table-container');
    const paginationContainer = container.querySelector('#medicos-pagination-container');

    let filtered = allMedicos;
    if (searchTerm) {
      filtered = filtered.filter(m =>
        (m.nombre && m.nombre.toLowerCase().includes(searchTerm)) ||
        (m.especialidad && m.especialidad.toLowerCase().includes(searchTerm)) ||
        (m.documento && m.documento.includes(searchTerm))
      );
    }

    if (!filtered.length) {
      tableContainer.innerHTML = renderEmptyState({
        title: 'No hay médicos registrados',
        message: searchTerm ? 'No se encontraron médicos con ese criterio.' : 'Aún no se han registrado médicos en el sistema.',
        actionHtml: `<button class="btn btn-primary btn-sm" id="empty-add-medico">Registrar Médico</button>`
      });
      tableContainer.querySelector('#empty-add-medico')?.addEventListener('click', () => openFormModal());
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
              <th>Nombre del Profesional</th>
              <th>Especialidad</th>
              <th>Teléfono</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(m => `
              <tr>
                <td><strong>${m.documento}</strong></td>
                <td>${m.nombre}</td>
                <td><span class="badge" style="background: #E0F2FE; color: #0369A1;">${m.especialidad}</span></td>
                <td>${m.telefono || '-'}</td>
                <td style="text-align: right;">
                  <div class="table-actions" style="justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm btn-edit-m" data-id="${m.id}" title="Editar médico">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="btn btn-danger btn-sm btn-del-m" data-id="${m.id}" title="Eliminar médico">
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

    tableContainer.querySelectorAll('.btn-edit-m').forEach(btn => {
      btn.addEventListener('click', () => openFormModal(btn.dataset.id));
    });

    tableContainer.querySelectorAll('.btn-del-m').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Eliminar Médico',
          message: '¿Estás seguro de eliminar este médico? No podrá eliminarse si tiene cupos o citas asignadas.',
          confirmText: 'Sí, eliminar',
          isDanger: true,
        });
        if (!ok) return;
        try {
          await deleteMedico(btn.dataset.id);
          showToast('Médico eliminado exitosamente');
          loadData();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });
  }

  function openFormModal(id = null) {
    const isEdit = Boolean(id);
    const existing = isEdit ? allMedicos.find(m => m.id === id) : null;

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Editar Médico' : 'Nuevo Médico'}</h3>
        <button class="modal-close-btn" id="m-form-x">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Documento / Tarjeta Profesional *</label>
            <input type="text" class="form-control" id="mf-doc" value="${existing?.documento || ''}" ${isEdit ? 'readonly' : ''} />
          </div>
          <div class="form-group">
            <label class="form-label">Nombre Completo *</label>
            <input type="text" class="form-control" id="mf-nom" value="${existing?.nombre || ''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Especialidad Médica *</label>
            <select class="form-control" id="mf-esp">
              ${ESPECIALIDADES_DISPONIBLES.map(esp => `
                <option value="${esp}" ${existing?.especialidad === esp ? 'selected' : ''}>${esp}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono de Contacto</label>
            <input type="text" class="form-control" id="mf-tel" value="${existing?.telefono || ''}" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="mf-cancel-btn">Cancelar</button>
        <button class="btn btn-primary" id="mf-save-btn">${isEdit ? 'Guardar Cambios' : 'Registrar Médico'}</button>
      </div>
    `;

    showModal(html);

    document.getElementById('m-form-x')?.addEventListener('click', closeModal);
    document.getElementById('mf-cancel-btn')?.addEventListener('click', closeModal);

    document.getElementById('mf-save-btn')?.addEventListener('click', async () => {
      const documento = document.getElementById('mf-doc').value.trim();
      const nombre = document.getElementById('mf-nom').value.trim();
      const especialidad = document.getElementById('mf-esp').value;
      const telefono = document.getElementById('mf-tel').value.trim();

      if (!documento) return showToast('El documento es obligatorio', 'warning');
      if (!nombre) return showToast('El nombre es obligatorio', 'warning');
      if (!especialidad) return showToast('La especialidad es obligatoria', 'warning');

      const saveBtn = document.getElementById('mf-save-btn');
      saveBtn.classList.add('btn-loading');

      try {
        const payload = { documento, nombre, especialidad, telefono };
        if (isEdit) {
          await updateMedico(id, payload);
          showToast('Médico actualizado correctamente');
        } else {
          await createMedico(payload);
          showToast('Médico registrado correctamente');
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

  container.querySelector('#medicos-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderPage();
  });

  container.querySelector('#btn-nuevo-medico').addEventListener('click', () => openFormModal());

  loadData();
}
