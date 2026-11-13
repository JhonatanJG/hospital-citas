/**
 * Punto de entrada principal del Frontend SPA de MediCitas.
 */

import { initRouter } from './router.js';
import { getInfo } from './api.js';

async function initApp() {
  console.log('🏥 Inicializando MediCitas SPA...');

  // Inicializar enrutador por hash
  initRouter();

  // Consultar motor de base de datos activo
  try {
    const info = await getInfo();
    const engineNameElem = document.getElementById('engine-name');
    if (engineNameElem && info.motor) {
      engineNameElem.textContent = info.motor;
      const indicator = document.querySelector('.engine-indicator');
      if (indicator) {
        if (info.motor === 'Firestore') {
          indicator.style.backgroundColor = '#F59E0B'; // Ámbar/Naranja para Firestore
        } else {
          indicator.style.backgroundColor = '#16A34A'; // Verde para PostgreSQL
        }
      }
    }
  } catch (err) {
    console.warn('No se pudo obtener información del motor:', err);
    const engineNameElem = document.getElementById('engine-name');
    if (engineNameElem) engineNameElem.textContent = 'Desconectado';
  }

  // Manejo de la barra lateral en dispositivos móviles
  const menuBtn = document.getElementById('menu-toggle-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
  }

  menuBtn?.addEventListener('click', openSidebar);
  closeBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
