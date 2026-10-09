# Guía de Despliegue e Inicialización en Servidor Linux (Apache2 + Subdominio)

Este documento detalla el procedimiento completo para desplegar el **Sistema de Costeo Hospitalario y Propuesta Tarifaria** en un servidor Linux (Ubuntu 20.04/22.04/24.04 LTS o Debian 11/12) utilizando **Apache2** como Proxy Inverso en un **subdominio** (por ejemplo: `costeo.hospital.gob.pe`).

---

## 🏗️ Arquitectura en Producción

- **Servidor Web Frontal**: Apache2 escuchando en puertos 80 (HTTP) y 443 (HTTPS) con `mod_proxy`, compresión `mod_deflate` y límite de subida de 50MB.
- **Servidor de Aplicación**: FastAPI + Uvicorn gestionado mediante **Systemd** (`costeo_hospitalario.service`) en `127.0.0.1:8050`.
- **Frontend**: Aplicación SPA servida de manera directa y optimizada.
- **Base de Datos**: MySQL 8.0+ o MariaDB 10.5+ con cotejamiento `utf8mb4_unicode_ci`.

---

## ⚡ Opción 1: Despliegue Automático en 1 Paso (Recomendado)

1. **Subir los archivos del proyecto al servidor** (por ejemplo, a `/var/www/costeo_hospitalario` o `/home/usuario/proyecto_lis`):
   ```bash
   # Ejemplo con git o scp / rsync
   sudo git clone <URL_DEL_REPOSITORIO> /var/www/costeo_hospitalario
   cd /var/www/costeo_hospitalario
   ```

2. **Ejecutar el script maestro con permisos sudo**:
   ```bash
   sudo bash deploy/deploy_linux.sh
   ```

3. El asistente interactivo solicitará:
   - El **subdominio** (ejemplo: `costeo.hospital.gob.pe`).
   - El **puerto local** (por defecto `8050`).
   - Las **credenciales de MySQL** (host, usuario, contraseña, base de datos).
   - Confirmación para **sembrar catálogos iniciales** (CPMS, SIGA, RRHH, Factores).
   - Opción para emitir certificado **SSL gratuito con Let's Encrypt / Certbot**.

---

## 🛠️ Opción 2: Despliegue Manual Paso a Paso

Si prefieres realizar la instalación paso a paso o tu servidor cuenta con restricciones de seguridad:

### 1. Instalar paquetes necesarios del sistema
```bash
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv python3-dev build-essential \
                       apache2 libapache2-mod-wsgi-py3 curl default-mysql-client \
                       certbot python3-certbot-apache
```

### 2. Habilitar módulos de Apache2
```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl deflate
sudo systemctl restart apache2
```

### 3. Preparar entorno Python virtual e instalar librerías
```bash
cd /var/www/costeo_hospitalario
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

### 4. Configurar variables de entorno `.env`
Crea el archivo `.env` en la raíz del proyecto:
```bash
cp deploy/.env.production.example .env
nano .env
```
Configura tus credenciales:
```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=costeo_user
DB_PASSWORD=TuPasswordSeguro123!
DB_NAME=costeo_hospitalario
APP_HOST=127.0.0.1
APP_PORT=8050
```
Protege los permisos del archivo:
```bash
chmod 600 .env
```

### 5. Inicializar la Base de Datos
Ejecuta el script de inicialización para crear la base de datos y aplicar el esquema `db.sql`:
```bash
./venv/bin/python deploy/init_db.py --seed
```

### 6. Configurar el Servicio Systemd
Copia la plantilla y ajústala si es necesario:
```bash
sudo cp deploy/costeo_hospitalario.service /etc/systemd/system/costeo_hospitalario.service
```

Ajusta permisos para el usuario `www-data`:
```bash
sudo chown -R www-data:www-data /var/www/costeo_hospitalario
sudo chmod -R 755 /var/www/costeo_hospitalario
```

Habilita e inicia el servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable costeo_hospitalario.service
sudo systemctl start costeo_hospitalario.service
```

Verifica que el servicio esté corriendo:
```bash
sudo systemctl status costeo_hospitalario.service
```

### 7. Configurar el VirtualHost de Apache2
Crea el archivo de configuración para tu subdominio:
```bash
sudo nano /etc/apache2/sites-available/costeo.hospital.gob.pe.conf
```

Pega el siguiente contenido (reemplazando `costeo.hospital.gob.pe` por tu subdominio real):
```apache
<VirtualHost *:80>
    ServerName costeo.hospital.gob.pe
    ServerAdmin admin@hospital.gob.pe

    ErrorLog ${APACHE_LOG_DIR}/costeo_error.log
    CustomLog ${APACHE_LOG_DIR}/costeo_access.log combined

    # Límite de 50MB para subida de archivos Excel y catálogos
    LimitRequestBody 52428800

    ProxyPreserveHost On
    ProxyRequests Off

    RequestHeader set X-Forwarded-Proto expr=%{REQUEST_SCHEME}
    RequestHeader set X-Forwarded-Port expr=%{SERVER_PORT}
    RequestHeader set X-Forwarded-For %{REMOTE_ADDR}e

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://127.0.0.1:8050/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]

    ProxyPass / http://127.0.0.1:8050/ timeout=300
    ProxyPassReverse / http://127.0.0.1:8050/

    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>
</VirtualHost>
```

Habilita el sitio y recarga Apache:
```bash
sudo a2ensite costeo.hospital.gob.pe.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

### 8. Habilitar SSL / HTTPS Gratuito con Certbot
```bash
sudo certbot --apache -d costeo.hospital.gob.pe
```

---

## 🔒 Configuración de Firewall (UFW)

Si el servidor tiene activo UFW (Uncomplicated Firewall):
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw reload
```

---

## 🔄 Comandos de Mantenimiento y Operación

### Ver estado y registros (Logs)
```bash
# Estado del servicio backend
sudo systemctl status costeo_hospitalario

# Logs en tiempo real del backend
sudo journalctl -u costeo_hospitalario -f

# Logs de Apache2
sudo tail -f /var/log/apache2/costeo_error.log
sudo tail -f /var/log/apache2/costeo_access.log
```

### Reiniciar el sistema
```bash
# Reiniciar backend
sudo systemctl restart costeo_hospitalario

# Recargar Apache2
sudo systemctl reload apache2
```

### Actualización de Código (Nuevas Versiones)
Para actualizar a una nueva versión del sistema:
```bash
cd /var/www/costeo_hospitalario
sudo git pull origin main
sudo ./venv/bin/pip install -r requirements.txt
sudo systemctl restart costeo_hospitalario
```

### Respaldo y Restauración de Base de Datos
```bash
# Crear respaldo
mysqldump -u root -p costeo_hospitalario > /home/usuario/backup_costeo_$(date +%Y%m%d).sql

# Restaurar respaldo
mysql -u root -p costeo_hospitalario < /home/usuario/backup_costeo_20261007.sql
```

---

## 🩺 Solución de Problemas Frecuentes

1. **Error 502 Bad Gateway**:
   - El servicio Uvicorn no está corriendo. Revisa con `sudo systemctl status costeo_hospitalario` o `sudo journalctl -u costeo_hospitalario -n 50`.
   - Verifica que el puerto en `.env` coincida con el `ProxyPass http://127.0.0.1:8050/`.

2. **Error al subir archivos Excel grandes (413 Payload Too Large)**:
   - Asegúrate de tener la directiva `LimitRequestBody 52428800` en tu archivo de VirtualHost de Apache2.

3. **Permisos denegados en archivos**:
   - Restaura la propiedad al usuario del servidor web: `sudo chown -R www-data:www-data /var/www/costeo_hospitalario`.
