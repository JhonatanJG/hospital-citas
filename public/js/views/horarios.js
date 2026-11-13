import {
  getHorarios,
  createHorario,
  updateHorario,
  deleteHorario,
} = '../api.js';

import {
  formatTime,
  renderSkeletonTable,
  renderEmptyState,
  renderPagination,
  showToast,
  showModal,
  closeModal,
  confirmDialog,
} from '../ui.js';

export async function renderHorarios(container) {
  let allHorarios = [];
  let currentPage = 1;
  const pageSize = 10;

  container.innerHTML = `
    <div class="card">
      <div class="toolbar-header">
        <div>
          <h2 class="card-title">Franjas Horarias Hospitalarias</h2>
          <span class="card-subtitle">Horarios definidos para la atención de consultas médicas</span>
        </div>

        <button class="btn btn-primary" id="btn-nuevo-horario">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Franja Horaria
        </button>
      </div>

      <div id="horarios-table-container">
        ${renderSkeletonTable(6, 4)}
      </div>

      <div id="horarios-pagination-container"></div>
    </div>
  `;

  function calcDuracion(inicio, fin) {
    if (!inicio || !fin) return '-';
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins <= 0) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} h ${m} min`;
    if (h > 0) return `${h} hora${h > 1 ? 's' : ''}`;
    return `${m} minutos`;
  }

  async function loadData() {
    const tableContainer = container.querySelector('#horarios-table-container');
    tableContainer.innerHTML = renderSkeletonTable(6, 4);
    try {
      allHorarios = await getHorarios();
      // Ordenar por hora inicio
      allHorarios.sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
      renderPage();
    } catch (err) {
      tableContainer.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${err.message}</p></div>`;
    }
  }

  function renderPage() {
    const tableContainer = container.querySelector('#horarios-table-container');
    const paginationContainer = container.querySelector('#horarios-pagination-container');

    if (!allHorarios.length) {
      tableContainer.innerHTML = renderEmptyState({
        title: 'No hay horarios definidos',
        message: 'Crea franjas horarias para comenzar a generar cupos.',
        actionHtml: `<button class="btn btn-primary btn-sm" id="empty-add-horario">Crear Franja</button>`
      });
      tableContainer.querySelector('#empty-add-horario')?.addEventListener('click', () => openFormModal());
      paginationContainer.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(allHorarios.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const pageItems = allHorarios.slice(startIdx, startIdx + pageSize);

    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Hora Inicio</th>
              <th>Hora Fin</th>
              <th>Duración Estimada</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(h => `
              <tr>
                <td><strong>${formatTime(h.horaInicio)}</strong></td>
                <td><strong>${formatTime(h.horaFin)}</strong></td>
                <td><span class="badge" style="background:#F1F5F9; color:#475569;">${calcDuracion(h.horaInicio, h.horaFin)}</span></td>
                <td style="text-align: right;">
                  <div class="table-actions" style="justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm btn-edit-h" data-id="${h.id}" title="Editar franja">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="btn btn-danger btn-sm btn-del-h" data-id="${h.id}" title="Eliminar franja">
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
      totalItems: allHorarios.length,
      onPageChange: (newPage) => {
        currentPage = newPage;
        renderPage();
      },
    });
    if (pgElem) paginationContainer.appendChild(pgElem);

    tableContainer.querySelectorAll('.btn-edit-h').forEach(btn => {
      btn.addEventListener('click', () => openFormModal(btn.dataset.id));
    });

    tableContainer.querySelectorAll('.btn-del-h').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Eliminar Horario',
          message: '¿Estás seguro de eliminar esta franja horaria? No podrá eliminarse si ya tiene cupos asociados.',
          confirmText: 'Sí, eliminar',
          isDanger: true,
        });
        if (!ok) return;
        try {
          await deleteHorario(btn.dataset.id);
          showToast('Franja horaria eliminada');
          loadData();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });
  }

  function openFormModal(id = null) {
    const isEdit = Boolean(id);
    const existing = isEdit ? allHorarios.find(h => h.id === id) : null;

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Editar Franja Horaria' : 'Nueva Franja Horaria'}</h3>
        <button class="modal-close-btn" id="h-form-x">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Hora Inicio *</label>
            <input type="time" class="form-control" id="hf-ini" value="${existing?.horaInicio ? formatTime(existing.horaInicio) : '08:00'}" />
          </div>
          <div class="form-group">
            <label class="form-label">Hora Fin *</label>
            <input type="time" class="form-control" id="hf-fin" value="${existing?.horaFin ? formatTime(existing.horaFin) : '09:00'}" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="hf-cancel-btn">Cancelar</button>
        <button class="btn btn-primary" id="hf-save-btn">${isEdit ? 'Guardar Cambios' : 'Crear Franja'}</button>
      </div>
    `;

    showModal(html);

    document.getElementById('h-form-x')?.addEventListener('click', closeModal);
    document.getElementById('hf-cancel-btn')?.addEventListener('click', closeModal);

    document.getElementById('hf-save-btn')?.addEventListener('click', async () => {
      const horaInicio = document.getElementById('hf-ini').value;
      const horaFin = document.getElementById('hf-fin').value;

      if (!horaInicio || !horaFin) return showToast('Ambas horas son requeridas', 'warning');
      if (horaFin <= horaInicio) return showToast('La hora fin debe ser posterior a la hora inicio', 'warning');

      const saveBtn = document.getElementById('hf-save-btn');
      saveBtn.classList.add('btn-loading');

      try {
        const payload = { horaInicio, horaFin };
        if (isEdit) {
          await updateHorario(id, payload);
          showToast('Franja horaria actualizada');
        } else {
          await createHorario(payload);
          showToast('Franja horaria registrada');
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

  container.querySelector('#btn-nuevo-horario').addEventListener('click', () => openFormModal());

  loadData();
}
