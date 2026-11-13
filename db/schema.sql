-- Hospital Citas - Esquema PostgreSQL idempotente

CREATE TABLE IF NOT EXISTS medicos (
  id_medico SERIAL PRIMARY KEY,
  documento VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  especialidad VARCHAR(80) NOT NULL,
  telefono VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS horarios (
  id_horario SERIAL PRIMARY KEY,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  CHECK(hora_fin > hora_inicio)
);

CREATE TABLE IF NOT EXISTS salas (
  id_sala SERIAL PRIMARY KEY,
  nombre VARCHAR(60) UNIQUE NOT NULL,
  piso INT NOT NULL
);

CREATE TABLE IF NOT EXISTS pacientes (
  id_paciente SERIAL PRIMARY KEY,
  documento VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(120),
  fecha_nacimiento DATE
);

CREATE TABLE IF NOT EXISTS disponibilidad (
  id_disponibilidad SERIAL PRIMARY KEY,
  id_medico INT NOT NULL REFERENCES medicos(id_medico) ON DELETE RESTRICT,
  id_horario INT NOT NULL REFERENCES horarios(id_horario) ON DELETE RESTRICT,
  id_sala INT NOT NULL REFERENCES salas(id_sala) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'libre' CHECK(estado IN ('libre','ocupada')),
  UNIQUE(id_medico, id_horario, fecha),
  UNIQUE(id_sala, id_horario, fecha)
);

CREATE TABLE IF NOT EXISTS reservas (
  id_reserva SERIAL PRIMARY KEY,
  id_paciente INT NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
  id_disponibilidad INT NOT NULL REFERENCES disponibilidad(id_disponibilidad) ON DELETE RESTRICT,
  motivo TEXT NOT NULL,
  estado VARCHAR(12) NOT NULL DEFAULT 'programada' CHECK(estado IN ('programada','atendida','cancelada')),
  creada_en TIMESTAMP DEFAULT NOW()
);

-- Vista alias para compatibilidad singular/plural
CREATE OR REPLACE VIEW reserva AS SELECT * FROM reservas;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reserva_disp_activa
  ON reservas(id_disponibilidad) WHERE estado <> 'cancelada';

CREATE TABLE IF NOT EXISTS medicamentos (
  id_medicamento SERIAL PRIMARY KEY,
  nombre VARCHAR(120) UNIQUE NOT NULL,
  stock INT NOT NULL DEFAULT 0 CHECK(stock >= 0)
);

CREATE TABLE IF NOT EXISTS prescripciones (
  id_prescripcion SERIAL PRIMARY KEY,
  id_reserva INT NOT NULL REFERENCES reservas(id_reserva) ON DELETE CASCADE,
  id_medicamento INT NOT NULL REFERENCES medicamentos(id_medicamento) ON DELETE RESTRICT,
  cantidad INT NOT NULL CHECK(cantidad > 0),
  dosis VARCHAR(120),
  indicaciones TEXT
);

-- Índices en FK y columnas frecuentemente consultadas
CREATE INDEX IF NOT EXISTS idx_disponibilidad_medico ON disponibilidad(id_medico);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_horario ON disponibilidad(id_horario);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_sala ON disponibilidad(id_sala);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_fecha_estado ON disponibilidad(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_reserva_paciente ON reservas(id_paciente);
CREATE INDEX IF NOT EXISTS idx_reserva_disponibilidad ON reservas(id_disponibilidad);
CREATE INDEX IF NOT EXISTS idx_reserva_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reserva_creada_en ON reservas(creada_en);
CREATE INDEX IF NOT EXISTS idx_prescripciones_reserva ON prescripciones(id_reserva);
CREATE INDEX IF NOT EXISTS idx_prescripciones_medicamento ON prescripciones(id_medicamento);
