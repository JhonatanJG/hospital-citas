require('dotenv').config();
const {
  medicosRepo,
  pacientesRepo,
  salasRepo,
  horariosRepo,
  medicamentosRepo,
  disponibilidadRepo,
  reservasRepo,
} = require('../src/repositories');

// Formato de fecha YYYY-MM-DD
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Obtener fecha de inicio (mañana) y fecha de fin (14 días hábiles después)
function getBusinessDateRange(daysCount = 14) {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  let current = new Date(start);
  let businessDays = 0;
  while (businessDays < daysCount) {
    const dow = current.getDay();
    if (dow >= 1 && dow <= 5) {
      businessDays++;
    }
    if (businessDays < daysCount) {
      current.setDate(current.getDate() + 1);
    }
  }
  return {
    fechaInicio: formatDate(start),
    fechaFin: formatDate(current),
  };
}

async function seedAll() {
  console.log('🌱 ==========================================');
  console.log('   Iniciando carga de datos semilla (Seed)...');
  console.log('🌱 ==========================================');

  // 1. HORARIOS (8 franjas de 1 hora, con pausa de almuerzo 12:00-13:00)
  console.log('⏳ Creando 8 horarios...');
  const horariosData = [
    { horaInicio: '08:00', horaFin: '09:00' },
    { horaInicio: '09:00', horaFin: '10:00' },
    { horaInicio: '10:00', horaFin: '11:00' },
    { horaInicio: '11:00', horaFin: '12:00' },
    { horaInicio: '13:00', horaFin: '14:00' },
    { horaInicio: '14:00', horaFin: '15:00' },
    { horaInicio: '15:00', horaFin: '16:00' },
    { horaInicio: '16:00', horaFin: '17:00' },
  ];

  let createdHorarios = [];
  try {
    const existing = await horariosRepo.getAll();
    if (existing.length === 0) {
      for (const h of horariosData) {
        const item = await horariosRepo.create(h);
        createdHorarios.push(item);
      }
    } else {
      createdHorarios = existing;
    }
  } catch (err) {
    console.warn('   Aviso en horarios:', err.message);
    createdHorarios = await horariosRepo.getAll();
  }

  // 2. SALAS (4 salas)
  console.log('🏢 Creando 4 salas...');
  const salasData = [
    { nombre: 'Consultorio 101', piso: 1 },
    { nombre: 'Consultorio 202', piso: 2 },
    { nombre: 'Consultorio 303', piso: 3 },
    { nombre: 'Sala de Urgencias', piso: 1 },
  ];

  let createdSalas = [];
  try {
    const existing = await salasRepo.getAll();
    if (existing.length === 0) {
      for (const s of salasData) {
        const item = await salasRepo.create(s);
        createdSalas.push(item);
      }
    } else {
      createdSalas = existing;
    }
  } catch (err) {
    console.warn('   Aviso en salas:', err.message);
    createdSalas = await salasRepo.getAll();
  }

  // 3. MEDICOS (6 médicos, 5 especialidades colombianas)
  console.log('👨‍⚕️ Creando 6 médicos...');
  const medicosData = [
    { documento: '71234567', nombre: 'Dr. Carlos Andrés Mejía Restrepo', especialidad: 'Cardiología', telefono: '3101234567' },
    { documento: '52345678', nombre: 'Dra. María Fernanda Ospina López', especialidad: 'Pediatría', telefono: '3209876543' },
    { documento: '80345679', nombre: 'Dr. Juan Pablo Vargas Herrera', especialidad: 'Medicina General', telefono: '3156789012' },
    { documento: '43456780', nombre: 'Dra. Lucía Elena Rodríguez Gómez', especialidad: 'Ginecología', telefono: '3187654321' },
    { documento: '1017345678', nombre: 'Dr. Sebastián Felipe Moreno Castro', especialidad: 'Ortopedia', telefono: '3123456789' },
    { documento: '1020456789', nombre: 'Dra. Valentina Andrea Zuluaga Pinto', especialidad: 'Medicina General', telefono: '3145678901' },
  ];

  let createdMedicos = [];
  try {
    const existing = await medicosRepo.getAll();
    if (existing.length === 0) {
      for (const m of medicosData) {
        const item = await medicosRepo.create(m);
        createdMedicos.push(item);
      }
    } else {
      createdMedicos = existing;
    }
  } catch (err) {
    console.warn('   Aviso en médicos:', err.message);
    createdMedicos = await medicosRepo.getAll();
  }

  // 4. PACIENTES (15 pacientes con nombres colombianos)
  console.log('👥 Creando 15 pacientes...');
  const pacientesData = [
    { documento: '1012345678', nombre: 'Andrés Felipe Torres Mosquera', telefono: '3101111111', email: 'andres.torres@email.com', fechaNacimiento: '1990-03-15' },
    { documento: '1023456789', nombre: 'Sandra Milena Castro Ríos', telefono: '3202222222', email: 'sandra.castro@email.com', fechaNacimiento: '1985-07-22' },
    { documento: '1034567890', nombre: 'Ricardo José Peñaloza Uribe', telefono: '3153333333', email: 'ricardo.p@email.com', fechaNacimiento: '1978-11-08' },
    { documento: '1045678901', nombre: 'Diana Carolina Álvarez Soto', telefono: '3184444444', email: 'diana.alvarez@email.com', fechaNacimiento: '1995-05-30' },
    { documento: '1056789012', nombre: 'Camilo Ernesto Rincón Bermúdez', telefono: '3125555555', email: 'camilo.rincon@email.com', fechaNacimiento: '1988-09-12' },
    { documento: '1067890123', nombre: 'Paola Andrea Guerrero Fonseca', telefono: '3146666666', email: 'paola.g@email.com', fechaNacimiento: '1992-02-18' },
    { documento: '1078901234', nombre: 'Hernando José Salcedo Muñoz', telefono: '3107777777', email: 'hernando.s@email.com', fechaNacimiento: '1975-12-03' },
    { documento: '1089012345', nombre: 'Gloria Patricia Montoya Vélez', telefono: '3218888888', email: 'gloria.m@email.com', fechaNacimiento: '1983-04-25' },
    { documento: '1090123456', nombre: 'Felipe Alejandro Duque Arango', telefono: '3159999999', email: 'felipe.d@email.com', fechaNacimiento: '1997-08-14' },
    { documento: '1101234567', nombre: 'Natalia Cristina Cardona Higuita', telefono: '3180000000', email: 'natalia.c@email.com', fechaNacimiento: '1991-01-07' },
    { documento: '1112345678', nombre: 'Jorge Iván Betancur Acosta', telefono: '3121111111', email: 'jorge.b@email.com', fechaNacimiento: '1980-06-19' },
    { documento: '1123456789', nombre: 'Ángela María Giraldo Correa', telefono: '3142222222', email: 'angela.g@email.com', fechaNacimiento: '1993-10-28' },
    { documento: '1134567890', nombre: 'Mauricio Enrique Parra Suárez', telefono: '3103333333', email: 'mauricio.p@email.com', fechaNacimiento: '1987-03-05' },
    { documento: '1145678901', nombre: 'Isabel Alejandra Naranjo Cano', telefono: '3214444444', email: 'isabel.n@email.com', fechaNacimiento: '1996-07-21' },
    { documento: '1156789012', nombre: 'Alejandro Hernán Sepúlveda Ríos', telefono: '3155555555', email: 'alejandro.s@email.com', fechaNacimiento: '1982-11-16' },
  ];

  let createdPacientes = [];
  try {
    const existing = await pacientesRepo.getAll();
    if (existing.length === 0) {
      for (const p of pacientesData) {
        const item = await pacientesRepo.create(p);
        createdPacientes.push(item);
      }
    } else {
      createdPacientes = existing;
    }
  } catch (err) {
    console.warn('   Aviso en pacientes:', err.message);
    createdPacientes = await pacientesRepo.getAll();
  }

  // 5. MEDICAMENTOS (20 medicamentos, algunos con stock < 10)
  console.log('💊 Creando 20 medicamentos...');
  const medicamentosData = [
    { nombre: 'Ibuprofeno 400mg', stock: 150 },
    { nombre: 'Acetaminofén 500mg', stock: 200 },
    { nombre: 'Amoxicilina 500mg', stock: 80 },
    { nombre: 'Omeprazol 20mg', stock: 120 },
    { nombre: 'Metformina 850mg', stock: 90 },
    { nombre: 'Losartán 50mg', stock: 75 },
    { nombre: 'Atorvastatina 20mg', stock: 60 },
    { nombre: 'Salbutamol Inhalador 100mcg', stock: 40 },
    { nombre: 'Clonazepam 0.5mg', stock: 8 }, // stock bajo
    { nombre: 'Diclofenaco 75mg', stock: 100 },
    { nombre: 'Prednisona 5mg', stock: 45 },
    { nombre: 'Azitromicina 500mg', stock: 35 },
    { nombre: 'Metoprolol 50mg', stock: 55 },
    { nombre: 'Ciprofloxacino 500mg', stock: 70 },
    { nombre: 'Hidroclorotiazida 25mg', stock: 85 },
    { nombre: 'Warfarina 5mg', stock: 5 }, // stock bajo
    { nombre: 'Ranitidina 300mg', stock: 65 },
    { nombre: 'Paracetamol Jarabe 120mg/5ml', stock: 30 },
    { nombre: 'Vitamina D3 1000UI', stock: 110 },
    { nombre: 'Calcio + Vitamina D', stock: 7 }, // stock bajo
  ];

  let createdMedicamentos = [];
  try {
    const existing = await medicamentosRepo.getAll();
    if (existing.length === 0) {
      for (const m of medicamentosData) {
        const item = await medicamentosRepo.create(m);
        createdMedicamentos.push(item);
      }
    } else {
      createdMedicamentos = existing;
    }
  } catch (err) {
    console.warn('   Aviso en medicamentos:', err.message);
    createdMedicamentos = await medicamentosRepo.getAll();
  }

  // 6. GENERAR CUPOS PARA LOS PRÓXIMOS 14 DÍAS HÁBILES
  console.log('📅 Generando cupos para los próximos 14 días hábiles...');
  const { fechaInicio, fechaFin } = getBusinessDateRange(14);
  const horarioIds = createdHorarios.map(h => h.id);

  // Distribuir médicos en salas asignadas
  // Dr 0 -> Sala 0, Dr 1 -> Sala 1, Dr 2 -> Sala 2, Dr 3 -> Sala 3, etc.
  for (let i = 0; i < createdMedicos.length; i++) {
    const medico = createdMedicos[i];
    const sala = createdSalas[i % createdSalas.length];
    // Dividir horarios entre médicos si comparten sala para no colisionar
    // Médicos 0-3 tienen horarios matutinos/vespertinos, etc.
    const half = Math.floor(horarioIds.length / 2);
    const assignedHorarios = (i < 4)
      ? horarioIds
      : (i % 2 === 0 ? horarioIds.slice(0, half) : horarioIds.slice(half));

    try {
      const res = await disponibilidadRepo.generarCupos({
        medicoId: medico.id,
        salaId: sala.id,
        fechaInicio,
        fechaFin,
        horarioIds: assignedHorarios,
      });
      console.log(`   Médico ${medico.nombre}: ${res.creados} creados, ${res.omitidos} omitidos.`);
    } catch (err) {
      console.warn(`   Aviso generando cupos para ${medico.nombre}:`, err.message);
    }
  }

  // 7. CITAS DE EJEMPLO (8 citas en distintos estados: 4 programadas, 2 atendidas, 2 canceladas)
  console.log('📋 Agendando 8 citas de prueba con prescripciones...');
  try {
    const cuposLibres = await disponibilidadRepo.getAll({ estado: 'libre' });
    if (cuposLibres.length >= 8 && createdPacientes.length >= 8) {
      const motivos = [
        'Control preventivo de hipertensión arterial',
        'Fiebre recurrente y malestar general',
        'Consulta por dolor articular agudo en rodilla derecha',
        'Revisión ginecológica y ecografía pélvica',
        'Dolor de pecho leve tras esfuerzo físico',
        'Chequeo médico laboral de ingreso',
        'Evaluación de migrañas frecuentes',
        'Seguimiento posoperatorio de fractura',
      ];

      for (let i = 0; i < 8; i++) {
        const paciente = createdPacientes[i];
        const cupo = cuposLibres[i];
        try {
          const reserva = await reservasRepo.agendar({
            pacienteId: paciente.id,
            disponibilidadId: cupo.id,
            motivo: motivos[i],
          });

          // Estado 4 programadas (0,1,2,3), 2 atendidas (4,5), 2 canceladas (6,7)
          if (i === 4 || i === 5) {
            await reservasRepo.atender(reserva.id);
            // Agregar prescripciones a las citas atendidas
            if (createdMedicamentos.length >= 2) {
              const med1 = createdMedicamentos[i % createdMedicamentos.length];
              const med2 = createdMedicamentos[(i + 3) % createdMedicamentos.length];
              try {
                await reservasRepo.addPrescripcion(reserva.id, {
                  medicamentoId: med1.id,
                  cantidad: 2,
                  dosis: '1 tableta cada 8 horas',
                  indicaciones: 'Tomar después de las comidas principales por 7 días',
                });
                await reservasRepo.addPrescripcion(reserva.id, {
                  medicamentoId: med2.id,
                  cantidad: 1,
                  dosis: '1 cápsula en ayunas',
                  indicaciones: 'Tomar con abundante agua durante 14 días',
                });
              } catch (e) {
                console.warn('   Aviso en prescripción:', e.message);
              }
            }
          } else if (i === 6 || i === 7) {
            await reservasRepo.cancelar(reserva.id);
          }
        } catch (e) {
          console.warn(`   Aviso agendando cita ${i + 1}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.warn('   Aviso en creación de citas:', err.message);
  }

  console.log('✅ ==========================================');
  console.log('   Seed completado exitosamente.');
  console.log('✅ ==========================================');
}

if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('Proceso de seed finalizado.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error fatal durante el seed:', err);
      process.exit(1);
    });
}

module.exports = { seedAll };
