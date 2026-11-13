const { getDb } = require('./firebase');

function makeError(msg, code) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

function mapDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    nombre: data.nombre,
    stock: data.stock,
  };
}

async function getAll(filters = {}) {
  const db = getDb();
  const snap = await db.collection('medicamentos').get();
  let results = snap.docs.map(mapDoc);
  if (filters.nombre) {
    const q = filters.nombre.toLowerCase();
    results = results.filter(m => m.nombre.toLowerCase().includes(q));
  }
  return results;
}

async function getById(id) {
  const db = getDb();
  const snap = await db.collection('medicamentos').doc(id).get();
  if (!snap.exists) throw makeError('Medicamento no encontrado', 404);
  return mapDoc(snap);
}

async function create({ nombre, stock }) {
  const db = getDb();
  const existing = await db.collection('medicamentos').where('nombre', '==', nombre).limit(1).get();
  if (!existing.empty) throw makeError('Ya existe un medicamento con ese nombre', 409);
  const ref = await db.collection('medicamentos').add({ nombre, stock: Number(stock) });
  const snap = await ref.get();
  return mapDoc(snap);
}

async function update(id, data) {
  const db = getDb();
  const docRef = db.collection('medicamentos').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Medicamento no encontrado', 404);
  if (data.stock !== undefined) data.stock = Number(data.stock);
  await docRef.update(data);
  const updated = await docRef.get();
  return mapDoc(updated);
}

async function deleteMedicamento(id) {
  const db = getDb();
  // Check prescripciones collectionGroup for any usage of this medicamento
  const prescSnap = await db.collectionGroup('prescripciones').where('medicamentoId', '==', id).limit(1).get();
  if (!prescSnap.empty) throw makeError('El medicamento tiene prescripciones registradas', 409);
  const docRef = db.collection('medicamentos').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Medicamento no encontrado', 404);
  await docRef.delete();
  return { deleted: true };
}

async function adjustStock(id, delta, transaction) {
  const db = getDb();
  const docRef = db.collection('medicamentos').doc(id);
  if (transaction) {
    const snap = await transaction.get(docRef);
    if (!snap.exists) throw makeError('Medicamento no encontrado', 404);
    const current = snap.data().stock;
    if (current + delta < 0) throw makeError('Stock insuficiente', 400);
    transaction.update(docRef, { stock: current + delta });
    return { id, stock: current + delta };
  } else {
    const snap = await docRef.get();
    if (!snap.exists) throw makeError('Medicamento no encontrado', 404);
    const current = snap.data().stock;
    if (current + delta < 0) throw makeError('Stock insuficiente', 400);
    await docRef.update({ stock: current + delta });
    return { id, stock: current + delta };
  }
}

module.exports = { getAll, getById, create, update, delete: deleteMedicamento, adjustStock };
