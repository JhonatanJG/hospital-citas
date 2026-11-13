const { query, pool } = require('./db');

function mapMedicamento(row) {
  return {
    id: String(row.id_medicamento),
    nombre: row.nombre,
    stock: Number(row.stock),
  };
}

async function getAll(filters = {}) {
  let text = 'SELECT * FROM medicamentos';
  const params = [];
  if (filters.nombre) {
    params.push(`%${filters.nombre}%`);
    text += ` WHERE nombre ILIKE $${params.length}`;
  }
  text += ' ORDER BY nombre ASC';
  const { rows } = await query(text, params);
  return rows.map(mapMedicamento);
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM medicamentos WHERE id_medicamento = $1', [id]);
  if (!rows.length) {
    const e = new Error('Medicamento no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapMedicamento(rows[0]);
}

async function create(data) {
  const { nombre, stock } = data;
  try {
    const { rows } = await query(
      'INSERT INTO medicamentos (nombre, stock) VALUES ($1, $2) RETURNING *',
      [nombre, stock ?? 0]
    );
    return mapMedicamento(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('Ya existe un medicamento con ese nombre');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
}

async function update(id, data) {
  const existing = await getById(id);
  const nombre = data.nombre ?? existing.nombre;
  const stock = data.stock !== undefined ? data.stock : existing.stock;

  const { rows } = await query(
    'UPDATE medicamentos SET nombre=$1, stock=$2 WHERE id_medicamento=$3 RETURNING *',
    [nombre, stock, id]
  );
  if (!rows.length) {
    const e = new Error('Medicamento no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapMedicamento(rows[0]);
}

async function deleteMedicamento(id) {
  // Check if medicamento has prescripciones
  const { rows: presc } = await query(
    'SELECT 1 FROM prescripciones WHERE id_medicamento = $1 LIMIT 1',
    [id]
  );
  if (presc.length) {
    const e = new Error('El medicamento tiene prescripciones registradas');
    e.statusCode = 409;
    throw e;
  }

  const { rowCount } = await query('DELETE FROM medicamentos WHERE id_medicamento = $1', [id]);
  if (!rowCount) {
    const e = new Error('Medicamento no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return { deleted: true };
}

/**
 * Adjust stock by delta (can be negative). Uses provided client for transaction support.
 * @param {number|string} id
 * @param {number} delta  - positive to add, negative to subtract
 * @param {object} client - pg client (from pool.connect()); if null uses pool query
 */
async function adjustStock(id, delta, client) {
  const executor = client || { query: (text, params) => query(text, params) };

  // First check current stock
  const { rows: current } = await executor.query(
    'SELECT stock FROM medicamentos WHERE id_medicamento = $1 FOR UPDATE',
    [id]
  );
  if (!current.length) {
    const e = new Error('Medicamento no encontrado');
    e.statusCode = 404;
    throw e;
  }
  const newStock = Number(current[0].stock) + delta;
  if (newStock < 0) {
    const e = new Error('Stock insuficiente');
    e.statusCode = 400;
    throw e;
  }

  const { rows } = await executor.query(
    'UPDATE medicamentos SET stock = $1 WHERE id_medicamento = $2 RETURNING *',
    [newStock, id]
  );
  return mapMedicamento(rows[0]);
}

module.exports = { getAll, getById, create, update, delete: deleteMedicamento, adjustStock };
