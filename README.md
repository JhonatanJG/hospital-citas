# 🏥 MediCitas - Sistema Hospitalario de Gestión de Citas Médicas

> **Taller Final de Persistencia Políglota:** Aplicación web moderna y profesional con arquitectura en capas y soporte nativo para dos motores de persistencia: **Relacional (PostgreSQL)** y **No Relacional (Cloud Firestore)**, lista para desplegar en Render.

Desarrollado por **Jhonatan Stiven Camacho Galeano** · **UNICOC (Colegio Odontológico Colombiano / Institución Universitaria)**.

---

## 🚀 Características Principales

- **Arquitectura Limpia en Capas**: `Routes -> Controllers -> Services -> Repositories`.
- **Patrón Repository Dinámico**: La variable de entorno `DB_ENGINE=postgres|firestore` selecciona el motor al iniciar la aplicación sin alterar una sola línea de código en controladores, servicios ni frontend.
- **Transacciones ACID & Atómicas**:
  - En PostgreSQL: `BEGIN ... COMMIT` con bloqueos pesimistas `SELECT ... FOR UPDATE` y llaves foráneas con `ON DELETE RESTRICT / CASCADE`.
  - En Cloud Firestore: `db.runTransaction()` para reservas concurrentes y gestión de inventario en recetas médicas.
- **Frontend SPA Moderno (Vanilla JS)**: Enrutador por hash, componentes modulares en ES Modules, sin herramientas de compilación externas (cero build step), tipografía Inter y diseño visual pulido estilo dashboard hospitalario.
- **Control de Inventario Farmacéutico**: Al emitir una receta médica se valida el stock disponible y se descuenta transaccionalmente; al cancelar o eliminar la prescripción se restituye el stock al inventario.
- **Generador Inteligente de Cupos**: Crea cupos de atención médica en lotes de lunes a viernes, descartando colisiones de sala o médico.
- **Esquema Idempotente y Auto-Seed**: Al arrancar en entornos libres de terminal (como Render), la aplicación aplica automáticamente el esquema DDL y puebla la base con datos semilla colombianos realistas.

---

## 📁 Estructura del Proyecto

```text
hospital-citas/
├── db/
│   └── schema.sql                 # Esquema relacional PostgreSQL idempotente
├── docs/
│   └── diseno-persistencia.md     # Diagrama ER Mermaid, diccionario, justificación NoSQL y tabla comparativa
├── public/                        # Frontend SPA servido estáticamente por Express
│   ├── css/
│   │   └── styles.css             # Estilos completos, paleta temática, responsive y modales
│   ├── js/
│   │   ├── app.js                 # Punto de entrada de cliente y carga de badges
│   │   ├── router.js              # Enrutador por hash SPA
│   │   ├── api.js                 # Cliente REST centralizado para todos los endpoints
│   │   ├── ui.js                  # Utilidades UI (toasts, modales, skeletons, formateadores)
│   │   └── views/
│   │       ├── dashboard.js       # Métricas KPI, gráfico SVG nativo y próximas citas
│   │       ├── citas.js           # Tabla, filtros, asistente 4 pasos y prescripciones
│   │       ├── disponibilidad.js  # Calendario de cupos y generador en lote
│   │       ├── pacientes.js       # Directorio de pacientes con paginación
│   │       ├── medicos.js         # Especialistas y personal médico
│   │       ├── salas.js           # Consultorios y pisos
│   │       ├── horarios.js        # Franjas horarias configurables
│   │       └── medicamentos.js    # Farmacia con alertas de stock bajo
│   └── index.html                 # Shell HTML5 de la aplicación
├── scripts/
│   ├── init-db.js                 # Script ejecutable para aplicar schema.sql en PostgreSQL
│   └── seed.js                    # Semilla de datos colombianos compatible con ambos motores
├── src/
│   ├── app.js                     # Configuración de Express, middlewares y rutas
│   ├── server.js                  # Arranque del servidor HTTP, auto-migración y auto-seed
│   ├── config/
│   │   └── env.js                 # Validación y tipado de variables de entorno
│   ├── controllers/               # Controladores HTTP de la API REST
│   ├── middlewares/
│   │   ├── errorHandler.js        # Manejador central de errores y respuestas en español
│   │   └── validate.js            # Validadores de datos requeridos, emails y fechas
│   ├── repositories/
│   │   ├── index.js               # Fábrica abstracta del repositorio según DB_ENGINE
│   │   ├── postgres/              # Implementación relacional con paquete 'pg'
│   │   └── firestore/             # Implementación documental con 'firebase-admin'
│   ├── routes/                    # Definición de rutas Express (/api/...)
│   └── services/                  # Servicios de lógica de negocio
├── .env.example                   # Plantilla de variables de entorno requeridas
├── .gitignore                     # Exclusión de credenciales, .env y node_modules
├── package.json                   # Dependencias y scripts de Node.js
├── README.md                      # Manual integral de uso y despliegue
└── render.yaml                    # Manifiesto Blueprint de infraestructura para Render
```

---

## 🛠️ Requisitos Previos

- **Node.js**: Versión 18.0.0 o superior instalada.
- **NPM**: Gestor de paquetes incluido en Node.js.
- **Base de Datos** (según el motor a probar):
  - **PostgreSQL**: Instancia local o remota (Neon, Supabase, Render PostgreSQL).
  - **Google Cloud Firestore**: Proyecto en Firebase con credenciales Service Account.

---

## ⚙️ Configuración de Variables de Entorno

Copia el archivo `.env.example` y renómbralo como `.env`:

```bash
cp .env.example .env
```

| Variable | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `PORT` | Número | Puerto de escucha del servidor web Express | `3000` |
| `NODE_ENV` | Texto | Entorno de ejecución (`development` o `production`) | `development` |
| `DB_ENGINE` | Texto | **Motor de persistencia activo**: `postgres` o `firestore` | `postgres` |
| `DATABASE_URL` | Texto | Cadena de conexión PostgreSQL (requerido si `DB_ENGINE=postgres`) | `postgresql://usuario:clave@localhost:5432/hospital_citas` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON | Llave privada de Firebase en una sola línea (requerido si `DB_ENGINE=firestore`) | `{"type":"service_account","project_id":"..."}` |
| `AUTO_SEED` | Booleano | Si es `true`, poblará datos iniciales si la base está vacía | `true` |

---

## 🐘 Ejecución Local con PostgreSQL

1. **Instalar dependencias**:
   ```bash
   npm install
   ```
2. **Configurar `.env`**:
   ```env
   PORT=3000
   NODE_ENV=development
   DB_ENGINE=postgres
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hospital_citas
   AUTO_SEED=true
   ```
3. **Iniciar la aplicación**:
   ```bash
   npm start
   ```
   > El servidor aplicará automáticamente el archivo `db/schema.sql` y cargará los datos de prueba mediante `scripts/seed.js` si la tabla de médicos se encuentra vacía.
4. **Abrir en el navegador**: [http://localhost:3000](http://localhost:3000)

---

## 🔥 Ejecución Local con Cloud Firestore

### ¿Cómo crear el proyecto y obtener la clave de servicio de Firebase?

1. Ingresa a la consola de Firebase: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Crea un nuevo proyecto (por ejemplo: `hospital-citas-persistencia`).
3. En el menú lateral, dirígete a **Compilación** -> **Firestore Database** y haz clic en **Crear base de datos**.
4. Selecciona el modo **Producción** o **Prueba** y elige una ubicación geográfica cercana (ej. `us-central1`).
5. Ve a la configuración del proyecto (icono de engranaje ⚙️ junto a *Información general* -> **Configuración del proyecto**).
6. Entra en la pestaña **Cuentas de servicio** (Service accounts).
7. Haz clic en **Generar nueva clave privada** y confirma la descarga del archivo `.json`.
8. Abre el archivo JSON descargado, elimina los saltos de línea para que quede en una sola línea de texto, y asígnalo a `FIREBASE_SERVICE_ACCOUNT` en tu archivo `.env`.

### Configuración en `.env`:
```env
PORT=3000
NODE_ENV=development
DB_ENGINE=firestore
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"hospital-citas-xxx","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxx@hospital-citas-xxx.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
AUTO_SEED=true
```

Inicia la aplicación:
```bash
npm start
```

---

## 🌐 Despliegue en Render (Paso a Paso)

El repositorio incluye el archivo de infraestructura como código `render.yaml` (Render Blueprint), el cual provisiona automáticamente:
1. Una base de datos gestionada **PostgreSQL** (`hospital-db`).
2. El servicio web **hospital-citas-postgres** configurado contra la base relacional.
3. El servicio web **hospital-citas-firestore** listo para recibir la credencial de Google Cloud.

### Pasos para desplegar:

1. **Subir el código a GitHub**:
   ```bash
   git add .
   git commit -m "feat: persistencia poliglotas lista para despliegue"
   git push origin main
   ```
2. **Iniciar sesión en Render**:
   - Ingresa a [https://render.com/](https://render.com/).
3. **Crear desde Blueprint**:
   - Haz clic en **New +** en la esquina superior derecha y selecciona **Blueprint**.
   - Conecta tu repositorio de GitHub `hospital-citas`.
   - Render leerá el archivo `render.yaml` y te mostrará los 3 recursos que creará automáticamente.
4. **Configurar Firestore en el servicio no relacional**:
   - Para el servicio `hospital-citas-postgres`, la variable `DATABASE_URL` se conecta sola a `hospital-db`.
   - Para el servicio `hospital-citas-firestore`, ingresa a **Environment** en el panel de Render y pega tu JSON minificado en la variable `FIREBASE_SERVICE_ACCOUNT`.
5. **Completar Despliegue**:
   - Haz clic en **Apply**. Render compilará ambas instancias con `npm install` y las iniciará con `npm start`.
   - Ambas instancias ejecutarán el auto-seed en el primer arranque sin necesidad de acceder a la consola.

---

## 📡 Referencia de la API REST

Todos los endpoints responden con formato estándar `{ ok: true, data }` o `{ ok: false, error: "mensaje" }`:

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio y marca temporal |
| `GET` | `/api/info` | Retorna el motor de persistencia activo (`PostgreSQL` o `Firestore`) |
| `GET` | `/api/dashboard` | Métricas generales, citas hoy, distribución de estados y próximas citas |
| `GET` | `/api/medicos` | Listar médicos (admite filtro `?especialidad=`) |
| `POST` | `/api/medicos` | Crear nuevo médico |
| `PUT` | `/api/medicos/:id` | Actualizar datos del médico |
| `DELETE`| `/api/medicos/:id` | Eliminar médico (restringido si tiene cupos asignados) |
| `GET` | `/api/pacientes` | Listar pacientes (admite búsqueda por nombre/documento) |
| `POST` | `/api/pacientes` | Registrar paciente |
| `PUT` | `/api/pacientes/:id` | Modificar datos del paciente |
| `DELETE`| `/api/pacientes/:id` | Eliminar paciente (restringido si tiene citas registradas) |
| `GET` | `/api/salas` | Listar salas y consultorios |
| `POST` | `/api/salas` | Registrar nueva sala |
| `GET` | `/api/horarios` | Listar franjas horarias |
| `POST` | `/api/horarios` | Crear franja horaria (`horaFin > horaInicio`) |
| `GET` | `/api/medicamentos` | Consultar inventario farmacéutico |
| `POST` | `/api/medicamentos` | Ingresar medicamento con stock inicial |
| `GET` | `/api/disponibilidad` | Listar cupos (filtros: `medicoId`, `especialidad`, `fecha`, `estado`) |
| `POST` | `/api/disponibilidad` | Crear cupo individual |
| `DELETE`| `/api/disponibilidad/:id`| Eliminar cupo (únicamente si se encuentra en estado `libre`) |
| `POST` | `/api/disponibilidad/generar` | Generación automática en lote para días hábiles |
| `GET` | `/api/reservas` | Consultar citas médicas (filtros: `estado`, `fecha`, `medicoId`, `pacienteId`) |
| `GET` | `/api/reservas/:id` | Obtener detalle de cita con su listado de prescripciones |
| `POST` | `/api/reservas` | Agendar cita médica (transaccional, previene doble reserva de cupo y paciente) |
| `PATCH`| `/api/reservas/:id/cancelar` | Cancelar cita y liberar el cupo inmediatamente |
| `PATCH`| `/api/reservas/:id/reprogramar`| Mover cita a un nuevo cupo libre en una sola transacción |
| `PATCH`| `/api/reservas/:id/atender` | Cambiar estado de cita a `atendida` |
| `POST` | `/api/reservas/:id/prescripciones` | Recetar medicamento y descontar stock transaccionalmente |
| `DELETE`| `/api/reservas/:id/prescripciones/:pid`| Eliminar receta y restituir unidades al stock de farmacia |

---

## 👨‍💻 Autor

- **Jhonatan Stiven Camacho Galeano**
- Estudiante de Ingeniería de Sistemas
- **UNICOC** (Institución Universitaria Colegios de Colombia)
