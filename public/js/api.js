/**
 * Cliente de comunicación con la API REST de MediCitas.
 * Todas las funciones devuelven promesas y extraen el payload 'data'
 * cuando 'ok' es verdadero, o lanzan un error con el mensaje retornado por el backend.
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(url, config);
    const result = await res.json();

    if (!res.ok || !result.ok) {
      const errorMsg = result.error || `Error en la solicitud: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      throw err;
    }

    return result.data;
  } catch (err) {
    console.error(`[API Error] ${options.method || 'GET'} ${url}:`, err.message);
    throw err;
  }
}

// ─── INFORMACIÓN Y SALUD DEL SERVIDOR ───────────────────────────────────────────
export async function getInfo() {
  return request('/info');
}

export async function getHealth() {
  return request('/health');
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────────
export async function getDashboard() {
  return request('/dashboard');
}

// ─── MÉDICOS ────────────────────────────────────────────────────────────────────
export async function getMedicos(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/medicos${params ? `?${params}` : ''}`);
}

export async function getMedicoById(id) {
  return request(`/medicos/${id}`);
}

export async function createMedico(data) {
  return request('/medicos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMedico(id, data) {
  return request(`/medicos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMedico(id) {
  return request(`/medicos/${id}`, {
    method: 'DELETE',
  });
}

// ─── PACIENTES ──────────────────────────────────────────────────────────────────
export async function getPacientes(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/pacientes${params ? `?${params}` : ''}`);
}

export async function searchPacientes(q) {
  return request(`/pacientes/buscar?q=${encodeURIComponent(q)}`);
}

export async function getPacienteById(id) {
  return request(`/pacientes/${id}`);
}

export async function createPaciente(data) {
  return request('/pacientes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePaciente(id, data) {
  return request(`/pacientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePaciente(id) {
  return request(`/pacientes/${id}`, {
    method: 'DELETE',
  });
}

// ─── SALAS ──────────────────────────────────────────────────────────────────────
export async function getSalas() {
  return request('/salas');
}

export async function getSalaById(id) {
  return request(`/salas/${id}`);
}

export async function createSala(data) {
  return request('/salas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSala(id, data) {
  return request(`/salas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSala(id) {
  return request(`/salas/${id}`, {
    method: 'DELETE',
  });
}

// ─── HORARIOS ───────────────────────────────────────────────────────────────────
export async function getHorarios() {
  return request('/horarios');
}

export async function getHorarioById(id) {
  return request(`/horarios/${id}`);
}

export async function createHorario(data) {
  return request('/horarios', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateHorario(id, data) {
  return request(`/horarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteHorario(id) {
  return request(`/horarios/${id}`, {
    method: 'DELETE',
  });
}

// ─── MEDICAMENTOS ───────────────────────────────────────────────────────────────
export async function getMedicamentos(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/medicamentos${params ? `?${params}` : ''}`);
}

export async function getMedicamentoById(id) {
  return request(`/medicamentos/${id}`);
}

export async function createMedicamento(data) {
  return request('/medicamentos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMedicamento(id, data) {
  return request(`/medicamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMedicamento(id) {
  return request(`/medicamentos/${id}`, {
    method: 'DELETE',
  });
}

// ─── DISPONIBILIDAD (CUPOS) ────────────────────────────────────────────────────
export async function getDisponibilidad(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/disponibilidad${params ? `?${params}` : ''}`);
}

export async function getDisponibilidadById(id) {
  return request(`/disponibilidad/${id}`);
}

export async function createDisponibilidad(data) {
  return request('/disponibilidad', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteDisponibilidad(id) {
  return request(`/disponibilidad/${id}`, {
    method: 'DELETE',
  });
}

export async function generarCupos(data) {
  return request('/disponibilidad/generar', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── RESERVAS (CITAS MÉDICAS) ───────────────────────────────────────────────────
export async function getReservas(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/reservas${params ? `?${params}` : ''}`);
}

export async function getReservaById(id) {
  return request(`/reservas/${id}`);
}

export async function agendarCita(data) {
  return request('/reservas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelarCita(id) {
  return request(`/reservas/${id}/cancelar`, {
    method: 'PATCH',
  });
}

export async function reprogramarCita(id, data) {
  return request(`/reservas/${id}/reprogramar`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function atenderCita(id) {
  return request(`/reservas/${id}/atender`, {
    method: 'PATCH',
  });
}

// ─── PRESCRIPCIONES ─────────────────────────────────────────────────────────────
export async function getPrescripciones(reservaId) {
  return request(`/reservas/${reservaId}/prescripciones`);
}

export async function addPrescripcion(reservaId, data) {
  return request(`/reservas/${reservaId}/prescripciones`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deletePrescripcion(reservaId, prescripcionId) {
  return request(`/reservas/${reservaId}/prescripciones/${prescripcionId}`, {
    method: 'DELETE',
  });
}
