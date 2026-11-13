const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');

async function testSeed() {
  console.log('🌱 Probando ejecución de seed.js en entorno simulado...');
  const db = newDb();

  db.public.registerFunction({
    name: 'now',
    returns: db.public.getType('timestamp'),
    implementation: () => new Date(),
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  const pgAdapter = db.adapters.createPg();
  const poolMock = new pgAdapter.Pool();

  const dbModule = require('../src/repositories/postgres/db');
  dbModule.pool = poolMock;
  dbModule.query = (text, params) => poolMock.query(text, params);

  await poolMock.query(schemaSql);

  process.env.DB_ENGINE = 'postgres';
  const { seedAll } = require('../scripts/seed');
  await seedAll();

  // Verificar recuentos
  const { rows: rMed } = await poolMock.query('SELECT COUNT(*) FROM medicos');
  const { rows: rPac } = await poolMock.query('SELECT COUNT(*) FROM pacientes');
  const { rows: rSal } = await poolMock.query('SELECT COUNT(*) FROM salas');
  const { rows: rHor } = await poolMock.query('SELECT COUNT(*) FROM horarios');
  const { rows: rMdc } = await poolMock.query('SELECT COUNT(*) FROM medicamentos');
  const { rows: rDsp } = await poolMock.query('SELECT COUNT(*) FROM disponibilidad');
  const { rows: rRes } = await poolMock.query('SELECT COUNT(*) FROM reservas');
  const { rows: rPrs } = await poolMock.query('SELECT COUNT(*) FROM prescripciones');

  console.log('📊 Verificación de datos sembrados:');
  console.log(`   - Médicos:         ${rMed[0].count} (esperado: 6)`);
  console.log(`   - Pacientes:       ${rPac[0].count} (esperado: 15)`);
  console.log(`   - Salas:           ${rSal[0].count} (esperado: 4)`);
  console.log(`   - Horarios:        ${rHor[0].count} (esperado: 8)`);
  console.log(`   - Medicamentos:    ${rMdc[0].count} (esperado: 20)`);
  console.log(`   - Cupos generados: ${rDsp[0].count} (múltiples días hábiles)`);
  console.log(`   - Reservas:        ${rRes[0].count} (esperado: 8)`);
  console.log(`   - Prescripciones:  ${rPrs[0].count} (al menos 4 prescripciones)`);

  if (Number(rMed[0].count) !== 6 || Number(rPac[0].count) !== 15 || Number(rRes[0].count) !== 8) {
    throw new Error('Los conteos de seed no coinciden con los requerimientos');
  }

  console.log('✅ SEED VERIFICADO EXITOSAMENTE');
}

testSeed().catch(err => {
  console.error('❌ Error en test de seed:', err);
  process.exit(1);
});
