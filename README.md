# SGEC-HQ: Sistema de Gestión de Estructuras de Costo
### Hospital Quillabamba &mdash; *Un Compromiso Por La Vida*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+%20%2F%20MariaDB-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com)
[![JavaScript](https://img.shields.io/badge/Frontend-Vanilla%20JS%20Modular-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org)
[![License](https://img.shields.io/badge/License-Institucional-006D87?style=flat)](LICENSE)

**SGEC-HQ** es una plataforma integral desarrollada para el **Hospital Quillabamba** orientada a la determinación, estandarización y análisis de costos unitarios directos e indirectos de procedimientos médicos y sanitarios (CPMS / MINSA), así como a la formulación técnica de propuestas tarifarias institucionales.

---

## 🏥 Módulos Principales

1. **📊 Panel General (Dashboard)**:
   - Indicadores clave de rendimiento (KPIs) en tiempo real.
   - Acceso rápido a procedimientos recientes y catálogos institucionales.

2. **📋 Gestor de Hojas de Costeo**:
   - Listado, búsqueda, filtrado por UPSS y gestión de estados (Borrador, Revisión, Aprobado).
   - Aislamiento de costeos por usuario operador con visibilidad completa para administradores.
   - Acciones directas: Ver resumen, duplicar estructura, exportar a Excel y eliminar.

3. **🛠️ Costing Studio (Editor Interactivo)**:
   - Formulación modular por **Fases / Actividades**.
   - Asignación de **Recursos Humanos (RRHH)** con cálculo de costo por minuto.
   - Asignación de **Insumos y Materiales Médicos** (con soporte de catálogos SIGA / Catálogo Base).
   - Asignación de **Equipamiento y Mobiliario** con cálculo de depreciación por minuto.
   - Incorporación automática de **Factores de la UPSS**: Infraestructura, Servicios Básicos, Gastos de Administración y Generales.
   - Cálculo automático de Costo Directo, Costo Indirecto y Costo Total Estándar.
   - Generador dinámico de **Propuesta Tarifaria** con soporte de márgenes porcentuales (incluyendo margen 0%).

4. **📑 Matriz Resumen de Costos**:
   - Consolidado estructurado de todos los procedimientos costeados.
   - Búsqueda en vivo y exportación oficial a Excel con formato institucional.

5. **🏷️ Propuesta Tarifaria**:
   - Tabla de tarifas institucionales diferenciadas:
     - Tarifa Referencial ($T_r$).
     - Población no adscrita ($T_{pu}$).
     - IAFAS Públicas (EsSalud / FFAA / Policía).
     - IAFAS Privadas (con margen comercial configurable).
   - Exportación a Excel lista para presentación oficial.

6. **📈 Estudio de Mercado**:
   - Registro de referencias comparativas de precios de instituciones públicas y privadas.
   - Consulta integrada de precios referenciales MINSA.

7. **📚 Gestión de Catálogos**:
   - Mantenimiento y actualización de catálogos de CPMS (SUSALUD), Insumos/Medicamentos, Equipamiento, RRHH, Infraestructura, Servicios Básicos y Factores UPSS.
   - Soporte de importación masiva desde archivos estructurados Excel.

8. **👥 Control y Administración de Usuarios**:
   - Autenticación segura mediante contraseñas cifradas con PBKDF2-HMAC-SHA256 y tokens de sesión firmados.
   - Roles de acceso: **Administrador** (CRUD de usuarios y supervisión global) y **Operador** (gestión de costeos propios).

---

## 🏛️ Arquitectura del Sistema

```
proyecto_lis/
├── backend/                  # Servidor Backend FastAPI
│   └── app/
│       ├── routes/           # Endpoints API REST (auth, users, costing, matrix, tariff, catalogs, cpms)
│       ├── services/         # Generador de Excel, importadores de datos
│       ├── auth.py           # Seguridad, hashing de contraseñas, validación de JWT
│       ├── config.py         # Carga de variables de entorno (.env)
│       ├── database.py       # Conexión SQLAlchemy y gestión de sesiones
│       ├── main.py           # Punto de entrada de FastAPI y rutas estáticas
│       └── models.py         # Modelos ORM relacionales
├── frontend/                 # Aplicación Web SPA (Vanilla JS + CSS Modular)
│   ├── css/                  # main.css, components.css (Paleta Institucional Deep Teal & Cyan)
│   ├── js/
│   │   ├── components/       # Iconografía SVG (icons.js), notificaciones (toast.js)
│   │   ├── views/            # Vistas SPA (login, dashboard, sheets, studio, matrix, tariff, market, catalogs, users)
│   │   ├── api.js            # Cliente HTTP con manejo de tokens Bearer
│   │   └── app.js            # Router principal SPA
│   ├── hospital-quillabamba-logo.png # Logo institucional oficial
│   └── index.html            # Contenedor principal de la aplicación
├── deploy/                   # Suite de Despliegue en Producción (Linux / Apache2)
│   ├── apache_subdomain.conf # Configuración VirtualHost Apache2 como Proxy Inverso
│   ├── costeo_hospitalario.service # Servicio Systemd para Gunicorn/Uvicorn
│   ├── deploy_linux.sh       # Script automatizado de despliegue
│   ├── init_db.py            # Inicializador y validador de Base de Datos MySQL
│   ├── README_DEPLOY.md      # Guía paso a paso para despliegue en servidor Linux
│   └── .env.production.example # Plantilla de configuración para producción
├── db.sql                    # Esquema DDL ordenado para MySQL / MariaDB
├── requirements.txt          # Dependencias de Python
└── README.md                 # Documentación principal del proyecto
```

---

## 🚀 Requisitos Previos

- **Python**: Versión 3.10 o superior.
- **Base de Datos**: MySQL 8.0+ o MariaDB 10.5+ con soporte `utf8mb4`.
- **Navegador Web**: Chrome, Firefox, Edge o Safari moderno.

---

## ⚙️ Instalación y Puesta en Marcha Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/SGEC-HQ.git
cd SGEC-HQ
```

### 2. Configurar el Entorno Virtual de Python
```bash
# En Windows:
python -m venv venv
venv\Scripts\activate

# En Linux / macOS:
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar Dependencias
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configurar Variables de Entorno
Copia la plantilla `.env.example` como `.env` y configura tus credenciales locales de MySQL:
```bash
cp .env.example .env
```
Edita `.env`:
```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=costeo_hospitalario
SECRET_KEY=clave_secreta_jwt_muy_segura_hospital_quillabamba_2026
TOKEN_EXPIRE_HOURS=24
```

### 5. Inicializar la Base de Datos
Ejecuta el script de inicialización para crear la base de datos, aplicar el esquema DDL y generar el usuario administrador inicial:
```bash
python deploy/init_db.py
```

> **Credenciales por defecto**:
> - **Usuario**: `admin`
> - **Contraseña**: `$tudio92`
> *(Se recomienda cambiar la contraseña inmediatamente desde el módulo de Gestión de Usuarios)*.

### 6. Iniciar el Servidor de Desarrollo
```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Abre tu navegador en: [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## 🌐 Despliegue en Servidor Linux (Apache2 + Systemd)

El proyecto incluye una suite completa de despliegue en la carpeta `deploy/`:
1. Consulta la guía detallada en [`deploy/README_DEPLOY.md`](deploy/README_DEPLOY.md).
2. Ejecuta el script automatizado:
   ```bash
   sudo bash deploy/deploy_linux.sh
   ```

---

## 🔒 Seguridad
- Autenticación mediante tokens JWT firmados con HMAC-SHA256.
- Almacenamiento seguro de contraseñas con algoritmo PBKDF2-HMAC-SHA256 y salt criptográfico único por usuario.
- Aislamiento multiusuario de registros y protección de rutas administrativas a nivel de middleware y endpoints.

---

## 📄 Créditos y Licencia
Desarrollado para el **Hospital Quillabamba**.  
*Un Compromiso Por La Vida.*
