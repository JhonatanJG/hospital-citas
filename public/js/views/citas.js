import {
  getReservas,
  getReservaById,
  agendarCita,
  cancelarCita,
  reprogramarCita,
  atenderCita,
  getMedicos,
  getDisponibilidad,
  getPacientes,
  searchPacientes,
  getMedicamentos,
  addPrescripcion,
  deletePrescripcion,
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

let medicosCache = [];

export async function renderCitas(container) {
  container.innerHTML = `
    <div class="card">
      <div class="toolbar-header">
        <div class="filter-bar">
          <div class="search-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="search-input" id="citas-search" placeholder="Buscar por paciente, médico o motivo..." />
          </div>

          <select class="filter-select" id="citas-filter-estado">
            <option value="">Todos los Estados</option>
            <option value="programada">Programadas</option>
            <option value="atendida">Atendidas</option>
            <option value="cancelada">Canceladas</option>
          </select>

          <input type="date" class="form-control" id="citas-filter-fecha" style="width: auto; padding: 0.45rem 0.75rem;" title="Filtrar por fecha" />

          <select class="filter-select" id="citas-filter-medico">
            <option value="">Todos los Médicos</option>
          </select>
        </div>

        <button class="btn btn-primary" id="btn-nueva-cita">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Agendar Cita
        </button>
      </div>

      <div id="citas-table-container">
        ${renderSkeletonTable(6, 7)}
      </div>
    </div>
  `;

  // Cargar lista de médicos para el filtro
  try {
    medicosCache = await getMedicos();
    const selectMedico = container.querySelector('#citas-filter-medico');
    medicosCache.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nombre} (${m.especialidad})`;
      selectMedico.appendChild(opt);
    });
  } catch (err) {
    console.error('Error cargando médicos para filtro:', err);
  }

  // Cargar tabla de reservas
  async function loadTable() {
    const tableContainer = container.querySelector('#citas-table-container');
    const estado = container.querySelector('#citas-filter-estado').value;
    const fecha = container.querySelector('#citas-filter-fecha').value;
    const medicoId = container.querySelector('#citas-filter-medico').value;
    const searchTerm = container.querySelector('#citas-search').value.toLowerCase().trim();

    tableContainer.innerHTML = renderSkeletonTable(5, 7);

    try {
      const filters = {};
      if (estado) filters.estado = estado;
      if (fecha) filters.fecha = fecha;
      if (medicoId) filters.medicoId = medicoId;

      let reservas = await getReservas(filters);

      if (searchTerm) {
        reservas = reservas.filter(r =>
          (r.pacienteNombre && r.pacienteNombre.toLowerCase().includes(searchTerm)) ||
          (r.medicoNombre && r.medicoNombre.toLowerCase().includes(searchTerm)) ||
          (r.motivo && r.motivo.toLowerCase().includes(searchTerm)) ||
          (r.pacienteDocumento && r.pacienteDocumento.includes(searchTerm))
        );
      }

      if (reservas.length === 0) {
        tableContainer.innerHTML = renderEmptyState({
          title: 'No se encontraron citas',
          message: 'No existen registros para los filtros seleccionados.',
          actionHtml: `<button class="btn btn-secondary btn-sm" id="btn-limpiar-filtros">Limpiar Filtros</button>`
        });
        tableContainer.querySelector('#btn-limpiar-filtros')?.addEventListener('click', () => {
          container.querySelector('#citas-search').value = '';
          container.querySelector('#citas-filter-estado').value = '';
          container.querySelector('#citas-filter-fecha').value = '';
          container.querySelector('#citas-filter-medico').value = '';
          loadTable();
        });
        return;
      }

      tableContainer.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Médico</th>
                <th>Sala</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${reservas.map(r => `
                <tr data-id="${r.id}">
                  <td><strong>${formatDate(r.fecha)}</strong></td>
                  <td>${formatTime(r.horaInicio)} - ${formatTime(r.horaFin)}</td>
                  <td>
                    <div><strong>${r.pacienteNombre}</strong></div>
                    <small style="color: var(--muted);">${r.pacienteDocumento || ''}</small>
                  </td>
                  <td>
                    <div>${r.medicoNombre}</div>
                    <small style="color: var(--muted);">${r.especialidad}</small>
                  </td>
                  <td>${r.salaNombre}</td>
                  <td style="max-width: 220px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${r.motivo}">${r.motivo}</td>
                  <td>${badgeHtml(r.estado)}</td>
                  <td style="text-align: right;">
                    <div class="table-actions" style="justify-content: flex-end;">
                      <button class="btn btn-secondary btn-sm btn-detalle" data-id="${r.id}" title="Ver detalle y prescripciones">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      ${r.estado === 'programada' ? `
                        <button class="btn btn-success btn-sm btn-atender" data-id="${r.id}" title="Marcar como atendida">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                        <button class="btn btn-secondary btn-sm btn-reprogramar" data-id="${r.id}" title="Reprogramar cita">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
                        </button>
                        <button class="btn btn-danger btn-sm btn-cancelar" data-id="${r.id}" title="Cancelar cita">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Event listeners para acciones de cada fila
      tableContainer.querySelectorAll('.btn-detalle').forEach(btn => {
        btn.addEventListener('click', () => openDetalleModal(btn.dataset.id));
      });

      tableContainer.querySelectorAll('.btn-atender').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await confirmDialog({
            title: 'Atender Cita Médica',
            message: '¿Deseas marcar esta cita como ATENDIDA? Podrás recetar medicamentos al paciente.',
            confirmText: 'Atender Cita',
            isDanger: false,
          });
          if (!ok) return;
          try {
            await atenderCita(btn.dataset.id);
            showToast('Cita marcada como atendida exitosamente');
            loadTable();
          } catch (e) {
            showToast(e.message, 'error');
          }
        });
      });

      tableContainer.querySelectorAll('.btn-cancelar').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await confirmDialog({
            title: 'Cancelar Cita',
            message: '¿Estás seguro de cancelar esta cita? El cupo quedará libre automáticamente para otros pacientes.',
            confirmText: 'Sí, cancelar cita',
            isDanger: true,
          });
          if (!ok) return;
          try {
            await cancelarCita(btn.dataset.id);
            showToast('Cita cancelada correctamente');
            loadTable();
          } catch (e) {
            showToast(e.message, 'error');
          }
        });
      });

      tableContainer.querySelectorAll('.btn-reprogramar').forEach(btn => {
        btn.addEventListener('click', () => openReprogramarModal(btn.dataset.id));
      });

    } catch (err) {
      tableContainer.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title" style="color: var(--danger);">Error al cargar citas</h3>
          <p class="empty-state-text">${err.message}</p>
          <button class="btn btn-secondary btn-sm" id="btn-reintentar">Reintentar</button>
        </div>
      `;
      tableContainer.querySelector('#btn-reintentar')?.addEventListener('click', loadTable);
    }
  }

  // Eventos de filtros
  container.querySelector('#citas-search').addEventListener('input', debounce(loadTable, 300));
  container.querySelector('#citas-filter-estado').addEventListener('change', loadTable);
  container.querySelector('#citas-filter-fecha').addEventListener('change', loadTable);
  container.querySelector('#citas-filter-medico').addEventListener('change', loadTable);

  // Botón agendar nueva cita
  container.querySelector('#btn-nueva-cita').addEventListener('click', () => openAgendarWizard(loadTable));

  // Carga inicial
  loadTable();
}

// ─── ASISTENTE 4 PASOS (AGENDAR CITA) ──────────────────────────────────────────
async function openAgendarWizard(onSuccess) {
  let step = 1;
  let selectedEspecialidad = '';
  let selectedMedicoId = '';
  let selectedMedicoNombre = '';
  let selectedFecha = '';
  let selectedCupoId = '';
  let selectedPacienteId = '';
  let selectedPacienteNombre = '';

  const modalHtml = `
    <div class="modal-header">
      <h3 class="modal-title">Agendar Cita Médica</h3>
      <button class="modal-close-btn" id="modal-wizard-x">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Indicador de pasos -->
      <div class="wizard-steps">
        <div class="wizard-step active" id="step-ind-1">
          <div class="step-number">1</div>
          <span class="step-label">Médico</span>
        </div>
        <div class="wizard-step" id="step-ind-2">
          <div class="step-number">2</div>
          <span class="step-label">Fecha</span>
        </div>
        <div class="wizard-step" id="step-ind-3">
          <div class="step-number">3</div>
          <span class="step-label">Cupo</span>
        </div>
        <div class="wizard-step" id="step-ind-4">
          <div class="step-number">4</div>
          <span class="step-label">Paciente</span>
        </div>
      </div>

      <!-- Contenedor del paso activo -->
      <div id="wizard-step-content"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="wizard-prev-btn" style="display: none;">Anterior</button>
      <button class="btn btn-primary" id="wizard-next-btn">Siguiente</button>
    </div>
  `;

  showModal(modalHtml, true);

  const content = document.getElementById('wizard-step-content');
  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');
  document.getElementById('modal-wizard-x')?.addEventListener('click', closeModal);

  // Obtener especialidades únicas de los médicos
  if (!medicosCache.length) {
    medicosCache = await getMedicos();
  }
  const especialidades = [...new Set(medicosCache.map(m => m.especialidad))];

  function renderStep() {
    // Actualizar estilos de indicadores de pasos
    for (let i = 1; i <= 4; i++) {
      const ind = document.getElementById(`step-ind-${i}`);
      if (!ind) continue;
      ind.classList.remove('active', 'completed');
      if (i < step) ind.classList.add('completed');
      if (i === step) ind.classList.add('active');
    }

    prevBtn.style.display = step > 1 ? 'inline-flex' : 'none';
    nextBtn.textContent = step === 4 ? 'Confirmar Cita' : 'Siguiente';

    if (step === 1) {
      content.innerHTML = `
        <div class="form-group">
          <label class="form-label">1. Selecciona la Especialidad Médica *</label>
          <select class="form-control" id="w-esp-select">
            <option value="">-- Elige una especialidad --</option>
            ${especialidades.map(e => `<option value="${e}" ${e === selectedEspecialidad ? 'selected' : ''}>${e}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">2. Selecciona el Profesional Médico *</label>
          <select class="form-control" id="w-med-select" ${!selectedEspecialidad ? 'disabled' : ''}>
            <option value="">-- Elige un médico --</option>
          </select>
        </div>
      `;

      const espSelect = content.querySelector('#w-esp-select');
      const medSelect = content.querySelector('#w-med-select');

      function updateMedicosDropdown(esp) {
        medSelect.innerHTML = '<option value="">-- Elige un médico --</option>';
        if (!esp) {
          medSelect.disabled = true;
          return;
        }
        medSelect.disabled = false;
        const filtrados = medicosCache.filter(m => m.especialidad === esp);
        filtrados.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.nombre} (Tel: ${m.telefono || 'N/A'})`;
          if (m.id === selectedMedicoId) opt.selected = true;
          medSelect.appendChild(opt);
        });
      }

      if (selectedEspecialidad) updateMedicosDropdown(selectedEspecialidad);

      espSelect.addEventListener('change', (e) => {
        selectedEspecialidad = e.target.value;
        selectedMedicoId = '';
        selectedMedicoNombre = '';
        updateMedicosDropdown(selectedEspecialidad);
      });

      medSelect.addEventListener('change', (e) => {
        selectedMedicoId = e.target.value;
        const found = medicosCache.find(m => m.id === selectedMedicoId);
        selectedMedicoNombre = found ? found.nombre : '';
      });
    } else if (step === 2) {
      const todayStr = new Date().toISOString().slice(0, 10);
      content.innerHTML = `
        <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg); border-radius: var(--radius-md);">
          <strong>Médico seleccionado:</strong> ${selectedMedicoNombre} (${selectedEspecialidad})
        </div>
        <div class="form-group">
          <label class="form-label">Selecciona la Fecha de la Cita *</label>
          <input type="date" class="form-control" id="w-fecha-input" min="${todayStr}" value="${selectedFecha || todayStr}" />
          <small style="color: var(--muted); margin-top: 4px; display: block;">Solo se pueden agendar citas para hoy o fechas futuras.</small>
        </div>
      `;
      selectedFecha = content.querySelector('#w-fecha-input').value;
      content.querySelector('#w-fecha-input').addEventListener('change', (e) => {
        selectedFecha = e.target.value;
      });
    } else if (step === 3) {
      content.innerHTML = `
        <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg); border-radius: var(--radius-md);">
          <div><strong>Médico:</strong> ${selectedMedicoNombre}</div>
          <div><strong>Fecha:</strong> ${formatDate(selectedFecha)}</div>
        </div>
        <label class="form-label">Cupos Libres Disponibles *</label>
        <div id="w-cupos-container">
          <div class="skeleton" style="height: 120px;"></div>
        </div>
      `;

      loadCuposDisponibles(content.querySelector('#w-cupos-container'));
    } else if (step === 4) {
      content.innerHTML = `
        <div style="margin-bottom: 1.25rem; padding: 0.85rem; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: var(--radius-md); font-size: 0.85rem;">
          <div>✅ <strong>Cita con:</strong> ${selectedMedicoNombre} (${selectedEspecialidad})</div>
          <div>📅 <strong>Fecha:</strong> ${formatDate(selectedFecha)}</div>
        </div>

        <div class="form-group">
          <label class="form-label">Buscar Paciente por Documento o Nombre *</label>
          <div class="search-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="search-input" id="w-paciente-search" placeholder="Escribe el documento o nombre del paciente..." />
          </div>
          <div id="w-pacientes-list" style="max-height: 160px; overflow-y: auto; margin-top: 6px; border: 1px solid var(--border); border-radius: var(--radius-md); display: none;"></div>
          <div id="w-paciente-selected" style="margin-top: 8px; font-weight: 600; color: var(--primary);"></div>
        </div>

        <div class="form-group">
          <label class="form-label">Motivo de la Consulta *</label>
          <textarea class="form-control" id="w-motivo" rows="3" placeholder="Describe brevemente los síntomas o motivo de la cita médica..."></textarea>
        </div>
      `;

      const searchInput = content.querySelector('#w-paciente-search');
      const listContainer = content.querySelector('#w-pacientes-list');
      const selectedDiv = content.querySelector('#w-paciente-selected');

      searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          listContainer.style.display = 'none';
          return;
        }
        try {
          const results = await searchPacientes(query);
          if (!results.length) {
            listContainer.innerHTML = '<div style="padding: 0.5rem; color: var(--muted); font-size: 0.85rem;">No se encontraron pacientes</div>';
          } else {
            listContainer.innerHTML = results.map(p => `
              <div class="paciente-option" data-id="${p.id}" data-name="${p.nombre}" style="padding: 0.5rem 0.75rem; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
                <strong>${p.nombre}</strong> <span style="color: var(--muted);">· Doc: ${p.documento}</span>
              </div>
            `).join('');

            listContainer.querySelectorAll('.paciente-option').forEach(el => {
              el.addEventListener('click', () => {
                selectedPacienteId = el.dataset.id;
                selectedPacienteNombre = el.dataset.name;
                selectedDiv.textContent = `Paciente seleccionado: ${selectedPacienteNombre}`;
                listContainer.style.display = 'none';
                searchInput.value = selectedPacienteNombre;
              });
            });
          }
          listContainer.style.display = 'block';
        } catch (err) {
          console.error(err);
        }
      }, 250));
    }
  }

  async function loadCuposDisponibles(containerElem) {
    try {
      const cupos = await getDisponibilidad({
        medicoId: selectedMedicoId,
        fecha: selectedFecha,
        estado: 'libre',
      });

      if (!cupos.length) {
        containerElem.innerHTML = `
          <div class="empty-state" style="padding: 1.5rem 0;">
            <p style="color: var(--warning); font-weight: 600;">No hay cupos libres para este médico en la fecha elegida.</p>
            <p style="font-size: 0.85rem; color: var(--muted);">Intenta seleccionando otra fecha en el paso anterior o genera nuevos cupos en la sección de Disponibilidad.</p>
          </div>
        `;
        return;
      }

      containerElem.innerHTML = `
        <div class="chips-grid">
          ${cupos.map(c => `
            <div class="chip-option ${c.id === selectedCupoId ? 'selected' : ''}" data-id="${c.id}">
              <span class="chip-time">${formatTime(c.horaInicio)} - ${formatTime(c.horaFin)}</span>
              <span class="chip-room">${c.salaNombre}</span>
            </div>
          `).join('')}
        </div>
      `;

      containerElem.querySelectorAll('.chip-option').forEach(chip => {
        chip.addEventListener('click', () => {
          containerElem.querySelectorAll('.chip-option').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          selectedCupoId = chip.dataset.id;
        });
      });
    } catch (err) {
      containerElem.innerHTML = `<p style="color: var(--danger);">Error cargando cupos: ${err.message}</p>`;
    }
  }

  prevBtn.addEventListener('click', () => {
    if (step > 1) {
      step--;
      renderStep();
    }
  });

  nextBtn.addEventListener('click', async () => {
    if (step === 1) {
      if (!selectedEspecialidad || !selectedMedicoId) {
        showToast('Debes seleccionar una especialidad y un médico', 'warning');
        return;
      }
      step++;
      renderStep();
    } else if (step === 2) {
      if (!selectedFecha) {
        showToast('Debes elegir una fecha válida', 'warning');
        return;
      }
      step++;
      renderStep();
    } else if (step === 3) {
      if (!selectedCupoId) {
        showToast('Debes seleccionar un horario/cupo libre', 'warning');
        return;
      }
      step++;
      renderStep();
    } else if (step === 4) {
      const motivo = content.querySelector('#w-motivo').value.trim();
      if (!selectedPacienteId) {
        showToast('Debes buscar y seleccionar un paciente', 'warning');
        return;
      }
      if (!motivo) {
        showToast('Por favor describe el motivo de la consulta', 'warning');
        return;
      }

      nextBtn.classList.add('btn-loading');
      try {
        await agendarCita({
          pacienteId: selectedPacienteId,
          disponibilidadId: selectedCupoId,
          motivo,
        });
        closeModal();
        showToast('¡Cita médica agendada con éxito!');
        onSuccess();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        nextBtn.classList.remove('btn-loading');
      }
    }
  });

  renderStep();
}

// ─── MODAL DETALLE DE CITA Y PRESCRIPCIONES ────────────────────────────────────
async function openDetalleModal(reservaId) {
  showModal(`<div style="padding: 2rem;">${renderSkeletonTable(4, 3)}</div>`, true);

  try {
    const reserva = await getReservaById(reservaId);
    let medicamentosList = [];
    try {
      medicamentosList = await getMedicamentos();
    } catch (e) {
      console.warn(e);
    }

    function renderDetalleContent() {
      const prescripciones = reserva.prescripciones || [];

      const html = `
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Detalle de la Cita Médica</h3>
            <span style="font-size: 0.8rem; color: var(--muted);">ID Cita: #${reserva.id}</span>
          </div>
          <button class="modal-close-btn" id="detalle-close-x">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; background: var(--bg); padding: 1.25rem; border-radius: var(--radius-lg);">
            <div>
              <span style="font-size: 0.75rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Paciente</span>
              <p style="font-weight: 700; color: var(--text);">${reserva.pacienteNombre}</p>
              <small style="color: var(--muted);">Doc: ${reserva.pacienteDocumento || 'N/A'}</small>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Médico Especialista</span>
              <p style="font-weight: 700; color: var(--text);">${reserva.medicoNombre}</p>
              <small style="color: var(--primary); font-weight: 600;">${reserva.especialidad}</small>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Horario y Sala</span>
              <p style="font-weight: 700; color: var(--text);">${formatDate(reserva.fecha)}</p>
              <small>${formatTime(reserva.horaInicio)} - ${formatTime(reserva.horaFin)} | ${reserva.salaNombre}</small>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Estado de la Cita</span>
              <div style="margin-top: 4px;">${badgeHtml(reserva.estado)}</div>
            </div>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <span style="font-size: 0.75rem; color: var(--muted); text-transform: uppercase; font-weight: 600;">Motivo de la Cita:</span>
            <p style="margin-top: 4px; padding: 0.75rem; background: #FFFFFF; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.9rem;">${reserva.motivo}</p>
          </div>

          <!-- SECCIÓN PRESCRIPCIONES MÉDICAS -->
          <div style="border-top: 1px solid var(--border); padding-top: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path>
                </svg>
                Prescripciones Médicas (${prescripciones.length})
              </h4>
              ${reserva.estado !== 'cancelada' ? `
                <button class="btn btn-secondary btn-sm" id="btn-toggle-nueva-presc">
                  + Recetar Medicamento
                </button>
              ` : ''}
            </div>

            <!-- Formulario desplegable para nueva prescripción -->
            <div id="form-nueva-prescripcion" style="display: none; background: #F8FAFC; border: 1px solid var(--border); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Medicamento *</label>
                  <select class="form-control" id="p-med-select">
                    <option value="">-- Seleccionar --</option>
                    ${medicamentosList.map(m => `
                      <option value="${m.id}" data-stock="${m.stock}">${m.nombre} (Stock: ${m.stock})</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Cantidad a Recetar *</label>
                  <input type="number" class="form-control" id="p-cantidad" min="1" value="1" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Dosis (ej: 1 cada 8 horas) *</label>
                  <input type="text" class="form-control" id="p-dosis" placeholder="1 tableta cada 8 horas" />
                </div>
                <div class="form-group">
                  <label class="form-label">Indicaciones de uso</label>
                  <input type="text" class="form-control" id="p-indicaciones" placeholder="Tomar después de las comidas" />
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn btn-secondary btn-sm" id="p-cancelar-btn">Cancelar</button>
                <button class="btn btn-primary btn-sm" id="p-guardar-btn">Guardar Prescripción</button>
              </div>
            </div>

            <!-- Lista de prescripciones -->
            ${prescripciones.length === 0 ? `
              <p style="font-size: 0.85rem; color: var(--muted); text-align: center; padding: 1rem;">No se han emitido recetas ni prescripciones para esta cita.</p>
            ` : `
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Medicamento</th>
                      <th>Cantidad</th>
                      <th>Dosis</th>
                      <th>Indicaciones</th>
                      ${reserva.estado !== 'cancelada' ? '<th style="text-align: right;">Acciones</th>' : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${prescripciones.map(p => `
                      <tr>
                        <td><strong>${p.medicamentoNombre}</strong></td>
                        <td>${p.cantidad} uds.</td>
                        <td>${p.dosis || '-'}</td>
                        <td>${p.indicaciones || '-'}</td>
                        ${reserva.estado !== 'cancelada' ? `
                          <td style="text-align: right;">
                            <button class="btn btn-danger btn-sm btn-delete-presc" data-pid="${p.id}" title="Eliminar prescripción y devolver stock">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </td>
                        ` : ''}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="detalle-close-btn">Cerrar</button>
        </div>
      `;

      const dialogContent = document.getElementById('modal-content');
      dialogContent.innerHTML = html;

      document.getElementById('detalle-close-x')?.addEventListener('click', closeModal);
      document.getElementById('detalle-close-btn')?.addEventListener('click', closeModal);

      const formPresc = document.getElementById('form-nueva-prescripcion');
      document.getElementById('btn-toggle-nueva-presc')?.addEventListener('click', () => {
        formPresc.style.display = formPresc.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('p-cancelar-btn')?.addEventListener('click', () => {
        formPresc.style.display = 'none';
      });

      document.getElementById('p-guardar-btn')?.addEventListener('click', async () => {
        const medId = document.getElementById('p-med-select').value;
        const cant = parseInt(document.getElementById('p-cantidad').value, 10);
        const dosis = document.getElementById('p-dosis').value.trim();
        const indicaciones = document.getElementById('p-indicaciones').value.trim();

        if (!medId) return showToast('Selecciona un medicamento', 'warning');
        if (!cant || cant <= 0) return showToast('Ingresa una cantidad válida mayor a 0', 'warning');
        if (!dosis) return showToast('Ingresa la dosis prescrita', 'warning');

        try {
          const nuevaPresc = await addPrescripcion(reserva.id, {
            medicamentoId: medId,
            cantidad: cant,
            dosis,
            indicaciones,
          });
          reserva.prescripciones.push(nuevaPresc);
          showToast('Medicamento recetado y descontado del stock');
          renderDetalleContent();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });

      dialogContent.querySelectorAll('.btn-delete-presc').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await confirmDialog({
            title: 'Eliminar Prescripción',
            message: '¿Deseas remover este medicamento? El stock será devuelto automáticamente al inventario.',
            confirmText: 'Sí, remover',
            isDanger: true,
          });
          if (!ok) return;

          try {
            await deletePrescripcion(reserva.id, btn.dataset.pid);
            reserva.prescripciones = reserva.prescripciones.filter(p => p.id !== btn.dataset.pid);
            showToast('Prescripción eliminada y stock restituido');
            renderDetalleContent();
          } catch (e) {
            showToast(e.message, 'error');
          }
        });
      });
    }

    renderDetalleContent();
  } catch (err) {
    showToast(err.message, 'error');
    closeModal();
  }
}

// ─── MODAL REPROGRAMAR CITA ───────────────────────────────────────────────────
async function openReprogramarModal(reservaId) {
  showModal(`<div style="padding: 2rem;">${renderSkeletonTable(3, 2)}</div>`);
  try {
    const reserva = await getReservaById(reservaId);
    const todayStr = new Date().toISOString().slice(0, 10);

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">Reprogramar Cita Médica</h3>
        <button class="modal-close-btn" id="reprog-x">&times;</button>
      </div>
      <div class="modal-body">
        <div style="background: var(--bg); padding: 0.85rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <div><strong>Paciente:</strong> ${reserva.pacienteNombre}</div>
          <div><strong>Médico:</strong> ${reserva.medicoNombre} (${reserva.especialidad})</div>
          <div><strong>Horario actual:</strong> ${formatDate(reserva.fecha)} · ${formatTime(reserva.horaInicio)} - ${formatTime(reserva.horaFin)}</div>
        </div>

        <div class="form-group">
          <label class="form-label">Nueva Fecha Deseada *</label>
          <input type="date" class="form-control" id="reprog-fecha" min="${todayStr}" value="${todayStr}" />
        </div>

        <div class="form-group">
          <label class="form-label">Selecciona el Nuevo Cupo Libre *</label>
          <div id="reprog-cupos-container">
            <div class="skeleton" style="height: 100px;"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="reprog-cancel-btn">Cancelar</button>
        <button class="btn btn-primary" id="reprog-save-btn" disabled>Confirmar Reprogramación</button>
      </div>
    `;

    showModal(html);

    let selectedNuevoCupoId = '';
    const fechaInput = document.getElementById('reprog-fecha');
    const cuposContainer = document.getElementById('reprog-cupos-container');
    const saveBtn = document.getElementById('reprog-save-btn');

    document.getElementById('reprog-x')?.addEventListener('click', closeModal);
    document.getElementById('reprog-cancel-btn')?.addEventListener('click', closeModal);

    async function cargarNuevosCupos() {
      selectedNuevoCupoId = '';
      saveBtn.disabled = true;
      cuposContainer.innerHTML = '<div class="skeleton" style="height: 80px;"></div>';

      try {
        const cupos = await getDisponibilidad({
          medicoId: reserva.medicoId,
          fecha: fechaInput.value,
          estado: 'libre',
        });

        if (!cupos.length) {
          cuposContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--warning); padding: 0.5rem 0;">No hay cupos disponibles para este médico en la fecha elegida.</p>`;
          return;
        }

        cuposContainer.innerHTML = `
          <div class="chips-grid">
            ${cupos.map(c => `
              <div class="chip-option chip-reprog" data-id="${c.id}">
                <span class="chip-time">${formatTime(c.horaInicio)} - ${formatTime(c.horaFin)}</span>
                <span class="chip-room">${c.salaNombre}</span>
              </div>
            `).join('')}
          </div>
        `;

        cuposContainer.querySelectorAll('.chip-reprog').forEach(chip => {
          chip.addEventListener('click', () => {
            cuposContainer.querySelectorAll('.chip-reprog').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedNuevoCupoId = chip.dataset.id;
            saveBtn.disabled = false;
          });
        });
      } catch (err) {
        cuposContainer.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem;">${err.message}</p>`;
      }
    }

    fechaInput.addEventListener('change', cargarNuevosCupos);
    cargarNuevosCupos();

    saveBtn.addEventListener('click', async () => {
      if (!selectedNuevoCupoId) return;
      saveBtn.classList.add('btn-loading');
      try {
        await reprogramarCita(reservaId, { nuevaDisponibilidadId: selectedNuevoCupoId });
        closeModal();
        showToast('Cita reprogramada exitosamente');
        location.reload();
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        saveBtn.classList.remove('btn-loading');
      }
    });
  } catch (e) {
    showToast(e.message, 'error');
    closeModal();
  }
}

// Utilidad debounce para búsquedas
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
