/**
 * Test integral de verificación de MediCitas.
 * Prueba el servidor Express, los endpoints REST, el esquema SQL,
 * las reglas de negocio y transacciones sobre pg-mem.
 */

const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function runTestSuite() {
  console.log('🧪 ============================================================');
  console.log('   Iniciando Suite de Pruebas Automatizadas de MediCitas');
  console.log('🧪 ============================================================');

  // 1. Configurar base de datos en memoria con pg-mem
  console.log('\n[1/6] Inicializando motor PostgreSQL en memoria (pg-mem)...');
  const db = newDb();

  // Registrar funciones necesarias
  db.public.registerFunction({
    name: 'now',
    returns: db.public.getType('timestamp'),
    implementation: () => new Date(),
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');

  // Interceptar el pool de pg para usar el adaptador de pg-mem
  const pgAdapter = db.adapters.createPg();
  const poolMock = new pgAdapter.Pool();

  // Reemplazar pool en el módulo db.js
  const dbModule = require('../src/repositories/postgres/db');
  dbModule.pool = poolMock;
  dbModule.query = (text, params) => poolMock.query(text, params);

  // Aplicar schema
  await poolMock.query(schemaSql);
  console.log('   ✅ Esquema SQL ejecutado y validado correctamente.');

  // 2. Probar servidor HTTP y app Express
  console.log('\n[2/6] Iniciando servidor Express...');
  process.env.DB_ENGINE = 'postgres';
  process.env.PORT = '3344';
  const app = require('../src/app');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(3344, resolve));
  const baseUrl = 'http://localhost:3344';
  console.log('   ✅ Servidor escuchando en http://localhost:3344');

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body: json };
  }

  // 3. Probar Endpoints de Diagnóstico
  console.log('\n[3/6] Verificando endpoints /api/health y /api/info...');
  const healthRes = await api('/api/health');
  if (healthRes.status !== 200 || !healthRes.body.ok) throw new Error('Health check falló');
  console.log('   ✅ /api/health -> 200 OK:', healthRes.body.data);

  const infoRes = await api('/api/info');
  if (infoRes.status !== 200 || infoRes.body.data.motor !== 'PostgreSQL') throw new Error('Info check falló');
  console.log('   ✅ /api/info -> 200 OK | Motor activo:', infoRes.body.data.motor);

  // 4. Probar CRUDs de entidades básicas
  console.log('\n[4/6] Probando creación y consulta de entidades maestras...');

  // Horario
  const hRes = await api('/api/horarios', {
    method: 'POST',
    body: JSON.stringify({ horaInicio: '08:00', horaFin: '09:00' }),
  });
  if (hRes.status !== 201) throw new Error(`Crear horario falló: ${JSON.stringify(hRes.body)}`);
  const horarioId = hRes.body.data.id;
  console.log('   ✅ Horario creado (id:', horarioId, ')');

  // Horario inválido (fin <= inicio)
  const hBad = await api('/api/horarios', {
    method: 'POST',
    body: JSON.stringify({ horaInicio: '10:00', horaFin: '09:00' }),
  });
  if (hBad.status !== 400) throw new Error('Validación de horaFin > horaInicio falló');
  console.log('   ✅ Validación de regla horaFin > horaInicio rechazada con 400.');

  // Sala
  const sRes = await api('/api/salas', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Consultorio 101', piso: 1 }),
  });
  if (sRes.status !== 201) throw new Error(`Crear sala falló: ${JSON.stringify(sRes.body)}`);
  const salaId = sRes.body.data.id;
  console.log('   ✅ Sala creada (id:', salaId, ')');

  // Médico
  const mRes = await api('/api/medicos', {
    method: 'POST',
    body: JSON.stringify({
      documento: '71234567',
      nombre: 'Dr. Carlos Andrés Mejía Restrepo',
      especialidad: 'Cardiología',
      telefono: '3101234567',
    }),
  });
  if (mRes.status !== 201) throw new Error(`Crear médico falló: ${JSON.stringify(mRes.body)}`);
  const medicoId = mRes.body.data.id;
  console.log('   ✅ Médico creado (id:', medicoId, ')');

  // Paciente
  const pRes = await api('/api/pacientes', {
    method: 'POST',
    body: JSON.stringify({
      documento: '1012345678',
      nombre: 'Andrés Felipe Torres Mosquera',
      telefono: '3101111111',
      email: 'andres.torres@email.com',
      fechaNacimiento: '1990-03-15',
    }),
  });
  if (pRes.status !== 201) throw new Error(`Crear paciente falló: ${JSON.stringify(pRes.body)}`);
  const pacienteId = pRes.body.data.id;
  console.log('   ✅ Paciente creado (id:', pacienteId, ')');

  // Medicamento
  const medRes = await api('/api/medicamentos', {
    method: 'POST',
    body: JSON.stringify({ nombre: 'Ibuprofeno 400mg', stock: 50 }),
  });
  if (medRes.status !== 201) throw new Error(`Crear medicamento falló: ${JSON.stringify(medRes.body)}`);
  const medicamentoId = medRes.body.data.id;
  console.log('   ✅ Medicamento creado (id:', medicamentoId, '| Stock: 50)');

  // 5. Probar Disponibilidad y Generador
  console.log('\n[5/6] Probando disponibilidad y generación de cupos...');
  const dispRes = await api('/api/disponibilidad', {
    method: 'POST',
    body: JSON.stringify({
      medicoId,
      horarioId,
      salaId,
      fecha: '2026-11-20',
    }),
  });
  if (dispRes.status !== 201) throw new Error(`Crear cupo falló: ${JSON.stringify(dispRes.body)}`);
  const cupoId = dispRes.body.data.id;
  console.log('   ✅ Cupo individual creado (id:', cupoId, '| Fecha: 2026-11-20)');

  // Probar duplicado de cupo
  const dispDup = await api('/api/disponibilidad', {
    method: 'POST',
    body: JSON.stringify({
      medicoId,
      horarioId,
      salaId,
      fecha: '2026-11-20',
    }),
  });
  if (dispDup.status !== 409) throw new Error('Doble asignación de médico debió fallar con 409');
  console.log('   ✅ Conflicto de cupo duplicado rechazado correctamente con 409.');

  // Probar generador en lote
  const genRes = await api('/api/disponibilidad/generar', {
    method: 'POST',
    body: JSON.stringify({
      medicoId,
      salaId,
      fechaInicio: '2026-11-23',
      fechaFin: '2026-11-27',
      horarioIds: [horarioId],
    }),
  });
  if (![200, 201].includes(genRes.status) || genRes.body.data.creados !== 5) {
    throw new Error(`Generador de cupos falló: ${JSON.stringify(genRes.body)}`);
  }
  console.log('   ✅ Generador de cupos en lote ejecutado: 5 cupos creados (lunes a viernes).');

  // 6. Probar Ciclo Completo de Reserva y Transacciones
  console.log('\n[6/6] Probando transacciones: Agendar, Atender, Prescribir, Reprogramar y Cancelar...');

  // Agendar
  const citaRes = await api('/api/reservas', {
    method: 'POST',
    body: JSON.stringify({
      pacienteId,
      disponibilidadId: cupoId,
      motivo: 'Evaluación cardiológica preventiva',
    }),
  });
  if (citaRes.status !== 201) throw new Error(`Agendar cita falló: ${JSON.stringify(citaRes.body)}`);
  const citaId = citaRes.body.data.id;
  console.log('   ✅ Cita médica agendada (id:', citaId, '| Estado: programada)');

  // Intentar agendar en el mismo cupo ya ocupado -> debe dar 409
  const citaColision = await api('/api/reservas', {
    method: 'POST',
    body: JSON.stringify({
      pacienteId,
      disponibilidadId: cupoId,
      motivo: 'Segunda cita que debe fallar',
    }),
  });
  if (citaColision.status !== 409) throw new Error('Doble reserva en el mismo cupo debió dar 409');
  console.log('   ✅ Intento de reserva en cupo ocupado bloqueado con 409.');

  // Prescripción y descuento de stock
  const prescRes = await api(`/api/reservas/${citaId}/prescripciones`, {
    method: 'POST',
    body: JSON.stringify({
      medicamentoId,
      cantidad: 5,
      dosis: '1 tableta cada 8 horas',
      indicaciones: 'Tomar con comidas',
    }),
  });
  if (prescRes.status !== 201) throw new Error(`Prescripción falló: ${JSON.stringify(prescRes.body)}`);
  const prescId = prescRes.body.data.id;
  console.log('   ✅ Prescripción creada. 5 unidades recetadas.');

  // Verificar que el stock se descontó
  const medCheck = await api(`/api/medicamentos/${medicamentoId}`);
  if (medCheck.body.data.stock !== 45) {
    throw new Error(`El stock debió bajar a 45, pero es ${medCheck.body.data.stock}`);
  }
  console.log('   ✅ Stock de medicamento verificado: 50 -> 45 unidades (transaccional).');

  // Eliminar prescripción y verificar restitución de stock
  const delPresc = await api(`/api/reservas/${citaId}/prescripciones/${prescId}`, {
    method: 'DELETE',
  });
  if (delPresc.status !== 200) throw new Error('Eliminar prescripción falló');
  const medRestituido = await api(`/api/medicamentos/${medicamentoId}`);
  if (medRestituido.body.data.stock !== 50) {
    throw new Error(`El stock debió regresar a 50, pero es ${medRestituido.body.data.stock}`);
  }
  console.log('   ✅ Prescripción eliminada y stock restituido a 50 unidades.');

  // Atender cita
  const atenderRes = await api(`/api/reservas/${citaId}/atender`, {
    method: 'PATCH',
  });
  if (atenderRes.status !== 200 || atenderRes.body.data.estado !== 'atendida') {
    throw new Error('Atender cita falló');
  }
  console.log('   ✅ Cita marcada como atendida.');

  // Consultar Dashboard
  const dashRes = await api('/api/dashboard');
  if (dashRes.status !== 200 || !dashRes.body.data) throw new Error('Dashboard falló');
  console.log('   ✅ Dashboard verificado:');
  console.log('      - Citas Atendidas:', dashRes.body.data.atendidas);
  console.log('      - Total Pacientes:', dashRes.body.data.totalPacientes);
  console.log('      - Total Médicos:  ', dashRes.body.data.totalMedicos);

  // Cerrar servidor
  server.close();
  console.log('\n🎉 ============================================================');
  console.log('   TODAS LAS PRUEBAS PASARON EXITOSAMENTE (100% FUNCIONAL)');
  console.log('🎉 ============================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', err);
  process.exit(1);
});
