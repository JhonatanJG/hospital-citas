import {
  getDisponibilidad,
  deleteDisponibilidad,
  generarCupos,
  getMedicos,
  getSalas,
  getHorarios,
} = '../api.js';

import {
  badgeHtml,
  formatDate,
  formatTime,
  renderSkeletonTable,
  renderEmptyState,
  showToast,
  showModal,
  closeModal,
  confirmDialog,
} from '../ui.js';

export async function renderDisponibilidad(container) {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar-header">
        <div class="filter-bar">
          <select class="filter-select" id="disp-filter-medico">
            <option value="">Todos los Médicos</option>
          </select>

          <input type="date" class="form-control" id="disp-filter-fecha" style="width: auto; padding: 0.45rem 0.75rem;" title="Filtrar por fecha" />

          <select class="filter-select" id="disp-filter-estado">
            <option value="">Todos los Estados</option>
            <option value="libre">Solo Libres</option>
            <option value="ocupada">Ocupados</option>
          </select>
        </div>

        <button class="btn btn-primary" id="btn-generar-cupos">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Generar Cupos en Lote
        </button>
      </div>

      <div id="disp-table-container">
        ${renderSkeletonTable(6, 6)}
      </div>
    </div>
  `;

  // Cargar médicos para el filtro
  try {
    const medicos = await getMedicos();
    const selectMed = container.querySelector('#disp-filter-medico');
    medicos.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nombre} (${m.especialidad})`;
      selectMed.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
  }

  async function loadTable() {
    const tableContainer = container.querySelector('#disp-table-container');
    const medicoId = container.querySelector('#disp-filter-medico').value;
    const fecha = container.querySelector('#disp-filter-fecha').value;
    const estado = container.querySelector('#disp-filter-estado').value;

    tableContainer.innerHTML = renderSkeletonTable(6, 6);

    try {
      const filters = {};
      if (medicoId) filters.medicoId = medicoId;
      if (fecha) filters.fecha = fecha;
      if (estado) filters.estado = estado;

      const cupos = await getDisponibilidad(filters);

      if (!cupos.length) {
        tableContainer.innerHTML = renderEmptyState({
          title: 'No hay cupos disponibles',
          message: 'No se encontraron horarios para los filtros aplicados.',
          actionHtml: `<button class="btn btn-primary btn-sm" id="empty-generar-btn">Generar Cupos Ahora</button>`
        });
        tableContainer.querySelector('#empty-generar-btn')?.addEventListener('click', () => openGenerarModal(loadTable));
        return;
      }

      tableContainer.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Médico</th>
                <th>Especialidad</th>
                <th>Sala / Consultorio</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${cupos.map(c => `
                <tr>
                  <td><strong>${formatDate(c.fecha)}</strong></td>
                  <td>${formatTime(c.horaInicio)} - ${formatTime(c.horaFin)}</td>
                  <td>${c.medicoNombre}</td>
                  <td><span class="badge" style="background:#F1F5F9; color:#475569;">${c.especialidad}</span></td>
                  <td>${c.salaNombre} (Piso ${c.piso || 1})</td>
                  <td>${badgeHtml(c.estado)}</td>
                  <td style="text-align: right;">
                    ${c.estado === 'libre' ? `
                      <button class="btn btn-danger btn-sm btn-delete-cupo" data-id="${c.id}" title="Eliminar cupo libre">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    ` : '<span style="font-size: 0.75rem; color: var(--muted);">Ocupado</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      tableContainer.querySelectorAll('.btn-delete-cupo').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await confirmDialog({
            title: 'Eliminar Cupo',
            message: '¿Deseas eliminar este cupo libre?',
            confirmText: 'Sí, eliminar',
            isDanger: true,
          });
          if (!ok) return;
          try {
            await deleteDisponibilidad(btn.dataset.id);
            showToast('Cupo eliminado correctamente');
            loadTable();
          } catch (e) {
            showToast(e.message, 'error');
          }
        });
      });
    } catch (err) {
      tableContainer.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${err.message}</p></div>`;
    }
  }

  container.querySelector('#disp-filter-medico').addEventListener('change', loadTable);
  container.querySelector('#disp-filter-fecha').addEventListener('change', loadTable);
  container.querySelector('#disp-filter-estado').addEventListener('change', loadTable);
  container.querySelector('#btn-generar-cupos').addEventListener('click', () => openGenerarModal(loadTable));

  loadTable();
}

async function openGenerarModal(onSuccess) {
  showModal(`<div style="padding: 2rem;">${renderSkeletonTable(3, 2)}</div>`);

  try {
    const [medicos, salas, horarios] = await Promise.all([
      getMedicos(),
      getSalas(),
      getHorarios(),
    ]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    const endStr = inTwoWeeks.toISOString().slice(0, 10);

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">Generador Automático de Cupos</h3>
        <button class="modal-close-btn" id="gen-close-x">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1.25rem;">
          Esta herramienta genera cupos de atención médica de lunes a viernes en el rango seleccionado, omitiendo automáticamente colisiones de horario o sala.
        </p>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Médico Especialista *</label>
            <select class="form-control" id="gen-medico">
              <option value="">-- Seleccionar --</option>
              ${medicos.map(m => `<option value="${m.id}">${m.nombre} (${m.especialidad})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Consultorio / Sala *</label>
            <select class="form-control" id="gen-sala">
              <option value="">-- Seleccionar --</option>
              ${salas.map(s => `<option value="${s.id}">${s.nombre} (Piso ${s.piso})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Fecha Inicio *</label>
            <input type="date" class="form-control" id="gen-fecha-inicio" min="${todayStr}" value="${todayStr}" />
          </div>
          <div class="form-group">
            <label class="form-label">Fecha Fin *</label>
            <input type="date" class="form-control" id="gen-fecha-fin" min="${todayStr}" value="${endStr}" />
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <label class="form-label" style="margin-bottom: 0;">Franjas Horarias a Generar *</label>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-select-all-horarios" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">Marcar Todos</button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem; max-height: 180px; overflow-y: auto; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
            ${horarios.map(h => `
              <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" class="horario-check" value="${h.id}" checked />
                <span>${formatTime(h.horaInicio)} - ${formatTime(h.horaFin)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="gen-cancel-btn">Cancelar</button>
        <button class="btn btn-primary" id="gen-submit-btn">Generar Cupos</button>
      </div>
    `;

    showModal(html);

    document.getElementById('gen-close-x')?.addEventListener('click', closeModal);
    document.getElementById('gen-cancel-btn')?.addEventListener('click', closeModal);

    document.getElementById('btn-select-all-horarios')?.addEventListener('click', () => {
      const checks = document.querySelectorAll('.horario-check');
      const allChecked = Array.from(checks).every(c => c.checked);
      checks.forEach(c => c.checked = !allChecked);
    });

    document.getElementById('gen-submit-btn')?.addEventListener('click', async () => {
      const medicoId = document.getElementById('gen-medico').value;
      const salaId = document.getElementById('gen-sala').value;
      const fechaInicio = document.getElementById('gen-fecha-inicio').value;
      const fechaFin = document.getElementById('gen-fecha-fin').value;
      const horarioIds = Array.from(document.querySelectorAll('.horario-check:checked')).map(c => c.value);

      if (!medicoId || !salaId) return showToast('Selecciona médico y consultorio', 'warning');
      if (!fechaInicio || !fechaFin) return showToast('Selecciona fechas válidas', 'warning');
      if (fechaFin < fechaInicio) return showToast('La fecha fin no puede ser anterior a la fecha inicio', 'warning');
      if (!horarioIds.length) return showToast('Selecciona al menos una franja horaria', 'warning');

      const submitBtn = document.getElementById('gen-submit-btn');
      submitBtn.classList.add('btn-loading');

      try {
        const result = await generarCupos({
          medicoId,
          salaId,
          fechaInicio,
          fechaFin,
          horarioIds,
        });

        closeModal();
        showToast(`Operación exitosa: ${result.creados} cupos creados, ${result.omitidos} omitidos por conflicto.`);
        onSuccess();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.classList.remove('btn-loading');
      }
    });
  } catch (err) {
    showToast(err.message, 'error');
    closeModal();
  }
}
