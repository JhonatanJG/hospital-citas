import { getDashboard } from '../api.js';
import { badgeHtml, formatDate, formatTime, renderSkeletonTable, renderEmptyState } from '../ui.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="kpi-grid">
      ${Array.from({ length: 6 }).map(() => `
        <div class="kpi-card">
          <div class="skeleton" style="width: 46px; height: 46px; border-radius: 10px;"></div>
          <div style="flex: 1;">
            <div class="skeleton" style="width: 60%; height: 14px; margin-bottom: 8px;"></div>
            <div class="skeleton" style="width: 40%; height: 28px;"></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div class="skeleton" style="width: 30%; height: 24px; margin-bottom: 1.5rem;"></div>
      ${renderSkeletonTable(4, 5)}
    </div>
  `;

  try {
    const stats = await getDashboard();

    const {
      citasHoy = 0,
      programadas = 0,
      atendidas = 0,
      canceladas = 0,
      cuposLibres = 0,
      totalPacientes = 0,
      totalMedicos = 0,
      proximasCitas = [],
      citasPorEstado = [],
    } = stats;

    const totalCitas = Number(programadas) + Number(atendidas) + Number(canceladas);
    const pctProg = totalCitas > 0 ? Math.round((Number(programadas) / totalCitas) * 100) : 0;
    const pctAten = totalCitas > 0 ? Math.round((Number(atendidas) / totalCitas) * 100) : 0;
    const pctCanc = totalCitas > 0 ? Math.round((Number(canceladas) / totalCitas) * 100) : 0;

    let html = `
      <!-- Tarjetas KPI -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-card-blue">
          <div class="kpi-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Citas Hoy</span>
            <span class="kpi-value">${citasHoy}</span>
          </div>
        </div>

        <div class="kpi-card kpi-card-purple">
          <div class="kpi-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Programadas</span>
            <span class="kpi-value">${programadas}</span>
          </div>
        </div>

        <div class="kpi-card kpi-card-green">
          <div class="kpi-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Atendidas</span>
            <span class="kpi-value">${atendidas}</span>
          </div>
        </div>

        <div class="kpi-card kpi-card-red">
          <div class="kpi-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Canceladas</span>
            <span class="kpi-value">${canceladas}</span>
          </div>
        </div>

        <div class="kpi-card kpi-card-teal">
          <div class="kpi-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Cupos Libres</span>
            <span class="kpi-value">${cuposLibres}</span>
          </div>
        </div>

        <div class="kpi-card kpi-card-yellow">
          <div class="kpi-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="kpi-data">
            <span class="kpi-label">Pacientes / Médicos</span>
            <span class="kpi-value">${totalPacientes} / ${totalMedicos}</span>
          </div>
        </div>
      </div>

      <!-- Sección Central: Gráfico de Citas por Estado y Próximas Citas -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
        <!-- Tarjeta de Gráfico SVG de Estados -->
        <div class="card chart-card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Distribución de Citas por Estado</h2>
              <span class="card-subtitle">Total acumulado: ${totalCitas} citas gestionadas</span>
            </div>
          </div>
          <div class="custom-chart-container">
            <!-- Gráfico de Donut SVG nativo -->
            <div style="position: relative; width: 140px; height: 140px; flex-shrink: 0; margin: 0 auto;">
              <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E2E8F0" stroke-width="3.8"></circle>
                <!-- Atendidas (Verde) -->
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#16A34A" stroke-width="3.8"
                  stroke-dasharray="${pctAten} ${100 - pctAten}"
                  stroke-dashoffset="0"></circle>
                <!-- Programadas (Azul) -->
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563EB" stroke-width="3.8"
                  stroke-dasharray="${pctProg} ${100 - pctProg}"
                  stroke-dashoffset="-${pctAten}"></circle>
                <!-- Canceladas (Rojo) -->
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#DC2626" stroke-width="3.8"
                  stroke-dasharray="${pctCanc} ${100 - pctCanc}"
                  stroke-dashoffset="-${pctAten + pctProg}"></circle>
              </svg>
              <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <span style="font-size: 1.25rem; font-weight: 700; color: var(--text);">${totalCitas}</span>
                <span style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase;">Total</span>
              </div>
            </div>

            <!-- Barras lineales de desglose -->
            <div class="chart-bars-wrapper">
              <div class="chart-bar-item">
                <div class="chart-bar-header">
                  <span style="color: #2563EB; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background: #2563EB; display: inline-block;"></span>
                    Programadas
                  </span>
                  <span>${programadas} (${pctProg}%)</span>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill fill-programada" style="width: ${pctProg}%;"></div>
                </div>
              </div>

              <div class="chart-bar-item">
                <div class="chart-bar-header">
                  <span style="color: #16A34A; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background: #16A34A; display: inline-block;"></span>
                    Atendidas
                  </span>
                  <span>${atendidas} (${pctAten}%)</span>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill fill-atendida" style="width: ${pctAten}%;"></div>
                </div>
              </div>

              <div class="chart-bar-item">
                <div class="chart-bar-header">
                  <span style="color: #DC2626; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 10px; height: 10px; border-radius: 50%; background: #DC2626; display: inline-block;"></span>
                    Canceladas
                  </span>
                  <span>${canceladas} (${pctCanc}%)</span>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill fill-cancelada" style="width: ${pctCanc}%;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones rápidas y accesos directos -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div class="card-header">
            <div>
              <h2 class="card-title">Gestión Inmediata</h2>
              <span class="card-subtitle">Operaciones frecuentes del hospital</span>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.85rem; padding: 0.5rem 0;">
            <a href="#/citas" class="btn btn-primary" style="justify-content: flex-start; padding: 0.75rem 1rem;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Agendar Nueva Cita Médica
            </a>
            <a href="#/disponibilidad" class="btn btn-secondary" style="justify-content: flex-start; padding: 0.75rem 1rem;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Generar Cupos de Médicos
            </a>
            <a href="#/pacientes" class="btn btn-secondary" style="justify-content: flex-start; padding: 0.75rem 1rem;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              Registrar Nuevo Paciente
            </a>
          </div>
          <div style="font-size: 0.78rem; color: var(--muted); border-top: 1px solid var(--border); padding-top: 0.75rem; margin-top: 0.5rem;">
            💡 Todos los cambios se persisten de manera atómica con transacciones ACID / Firestore batches.
          </div>
        </div>
      </div>

      <!-- Tabla: Próximas Citas -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Próximas Citas Programadas</h2>
            <span class="card-subtitle">Citas más cercanas ordenadas cronológicamente</span>
          </div>
          <a href="#/citas" class="btn btn-secondary btn-sm">Ver todas</a>
        </div>

        ${proximasCitas.length === 0 ? renderEmptyState({
          title: 'Sin citas próximas',
          message: 'No hay citas activas pendientes para los próximos días.',
          actionHtml: `<a href="#/citas" class="btn btn-primary btn-sm">Agendar Cita</a>`
        }) : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Especialidad</th>
                  <th>Sala</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${proximasCitas.map(c => `
                  <tr>
                    <td><strong>${formatDate(c.fecha)}</strong></td>
                    <td>${formatTime(c.horaInicio)} - ${formatTime(c.horaFin)}</td>
                    <td>${c.pacienteNombre}</td>
                    <td>${c.medicoNombre}</td>
                    <td><span class="badge" style="background:#F1F5F9; color:#475569;">${c.especialidad}</span></td>
                    <td>${c.salaNombre}</td>
                    <td>${badgeHtml(c.estado)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <h3 class="empty-state-title" style="color: var(--danger);">Error al cargar Dashboard</h3>
          <p class="empty-state-text">${err.message}</p>
          <button class="btn btn-primary btn-sm" onclick="location.reload()">Reintentar</button>
        </div>
      </div>
    `;
  }
}
