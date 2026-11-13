/**
 * Router SPA por Hash para MediCitas.
 * Soporta navegación fluida sin recargas, gestión de estado activo en sidebar
 * y sincronización de títulos de página.
 */

import { renderDashboard } from './views/dashboard.js';
import { renderCitas } from './views/citas.js';
import { renderDisponibilidad } from './views/disponibilidad.js';
import { renderPacientes } from './views/pacientes.js';
import { renderMedicos } from './views/medicos.js';
import { renderSalas } from './views/salas.js';
import { renderHorarios } from './views/horarios.js';
import { renderMedicamentos } from './views/medicamentos.js';

const routes = {
  '': {
    title: 'Dashboard',
    subtitle: 'Resumen general y métricas hospitalarias',
    render: renderDashboard,
  },
  'citas': {
    title: 'Citas Médicas',
    subtitle: 'Programación, atención y recetas de pacientes',
    render: renderCitas,
  },
  'disponibilidad': {
    title: 'Disponibilidad de Médicos',
    subtitle: 'Gestión y generación de cupos de atención',
    render: renderDisponibilidad,
  },
  'pacientes': {
    title: 'Gestión de Pacientes',
    subtitle: 'Directorio clínico de pacientes registrados',
    render: renderPacientes,
  },
  'medicos': {
    title: 'Cuerpo Médico',
    subtitle: 'Especialistas y personal de la salud',
    render: renderMedicos,
  },
  'salas': {
    title: 'Salas y Consultorios',
    subtitle: 'Infraestructura física y pisos de atención',
    render: renderSalas,
  },
  'horarios': {
    title: 'Franjas Horarias',
    subtitle: 'Definición de turnos de consulta médica',
    render: renderHorarios,
  },
  'medicamentos': {
    title: 'Farmacia e Inventario',
    subtitle: 'Control de existencias y medicamentos recetables',
    render: renderMedicamentos,
  },
};

export function navigate(path) {
  window.location.hash = path ? `#/${path}` : '#/';
}

export function handleRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  const route = routes[hash] || routes[''];

  // Actualizar títulos en topbar
  const titleElem = document.getElementById('view-title');
  const subtitleElem = document.getElementById('view-subtitle');
  if (titleElem) titleElem.textContent = route.title;
  if (subtitleElem) subtitleElem.textContent = route.subtitle;

  // Actualizar enlace activo en sidebar
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    const itemRoute = item.getAttribute('data-route');
    if (itemRoute === hash || (hash === '' && itemRoute === '')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Cerrar sidebar móvil en navegación
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  // Renderizar contenido
  const container = document.getElementById('app-content');
  if (container) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    route.render(container);
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
