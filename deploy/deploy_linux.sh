#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE E INICIALIZACIÓN EN LINUX (UBUNTU / DEBIAN)
# Sistema de Costeo Hospitalario y Propuesta Tarifaria
# Web Server: Apache2 (Reverse Proxy) + Subdominio + Systemd + Uvicorn
# ==============================================================================

set -e

# Colores para salida de terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}===============================================================================${NC}"
echo -e "${GREEN}     DESPLIEGUE AUTOMATIZADO - SISTEMA DE COSTEO HOSPITALARIO (LINUX/APACHE2)   ${NC}"
echo -e "${CYAN}===============================================================================${NC}"
echo ""

# 1. Verificar privilegios de superusuario (root)
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Por favor ejecuta este script con permisos de superusuario:${NC}"
  echo -e "        sudo bash $0"
  exit 1
fi

# Directorio raíz del proyecto (detecta automáticamente la ubicación del script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BLUE}[1/8] Verificando entorno y directorio de trabajo...${NC}"
echo -e "      Directorio del proyecto: ${YELLOW}${APP_DIR}${NC}"

# 2. Parámetros de configuración interactiva
echo ""
echo -e "${CYAN}--- CONFIGURACIÓN DEL DESPLIEGUE ---${NC}"

read -p "Subdominio a configurar en Apache2 (ej: costeo.hospital.gob.pe): " SUBDOMAIN
if [ -z "$SUBDOMAIN" ]; then
  SUBDOMAIN="costeo.local"
  echo -e "${YELLOW}  -> Se usará subdominio por defecto: ${SUBDOMAIN}${NC}"
fi

read -p "Puerto local de Uvicorn [8050]: " APP_PORT
APP_PORT=${APP_PORT:-8050}

read -p "Host de MySQL / MariaDB [127.0.0.1]: " DB_HOST
DB_HOST=${DB_HOST:-127.0.0.1}

read -p "Puerto de MySQL [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Usuario de MySQL [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -s -p "Contraseña de MySQL (dejar vacío si no tiene): " DB_PASSWORD
echo ""

read -p "Nombre de Base de Datos [costeo_hospitalario]: " DB_NAME
DB_NAME=${DB_NAME:-costeo_hospitalario}

read -p "¿Deseas sembrar los catálogos iniciales (CPMS, RRHH, SIGA, Infraestructura)? [S/n]: " SEED_DB
SEED_DB=${SEED_DB:-S}

read -p "¿Deseas configurar SSL / HTTPS gratuito con Let's Encrypt Certbot? [s/N]: " ENABLE_SSL
ENABLE_SSL=${ENABLE_SSL:-N}

echo ""
echo -e "${BLUE}[2/8] Actualizando repositorios e instalando paquetes del sistema...${NC}"
if command -v apt-get &> /dev/null; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y python3 python3-pip python3-venv python3-dev build-essential \
                       apache2 libapache2-mod-wsgi-py3 curl default-mysql-client \
                       certbot python3-certbot-apache
elif command -v dnf &> /dev/null; then
    dnf install -y python3 python3-pip python3-devel gcc httpd mariadb curl certbot python3-certbot-apache
else
    echo -e "${YELLOW}[!] Gestor de paquetes no reconocido. Asegúrate de tener Python 3, Apache2 y MariaDB client instalados.${NC}"
fi

echo ""
echo -e "${BLUE}[3/8] Habilitando módulos requeridos de Apache2...${NC}"
if command -v a2enmod &> /dev/null; then
    a2enmod proxy
    a2enmod proxy_http
    a2enmod proxy_wstunnel
    a2enmod rewrite
    a2enmod headers
    a2enmod ssl
    a2enmod deflate
fi

echo ""
echo -e "${BLUE}[4/8] Creando entorno virtual de Python e instalando dependencias...${NC}"
cd "$APP_DIR"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}[+] Entorno virtual creado en ${APP_DIR}/venv${NC}"
fi

# Actualizar pip e instalar requirements
"${APP_DIR}/venv/bin/pip" install --upgrade pip
"${APP_DIR}/venv/bin/pip" install -r "${APP_DIR}/requirements.txt"
echo -e "${GREEN}[+] Dependencias instaladas correctamente.${NC}"

echo ""
echo -e "${BLUE}[5/8] Configurando archivo .env para producción...${NC}"
cat <<EOF > "${APP_DIR}/.env"
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
APP_HOST=127.0.0.1
APP_PORT=${APP_PORT}
EOF
chmod 600 "${APP_DIR}/.env"
echo -e "${GREEN}[+] Archivo .env generado y protegido.${NC}"

echo ""
echo -e "${BLUE}[6/8] Inicializando Base de Datos MySQL...${NC}"
SEED_FLAG=""
if [[ "$SEED_DB" =~ ^[Ss]$ ]]; then
    SEED_FLAG="--seed"
fi

"${APP_DIR}/venv/bin/python" "${APP_DIR}/deploy/init_db.py" \
    --host "$DB_HOST" \
    --port "$DB_PORT" \
    --user "$DB_USER" \
    --password "$DB_PASSWORD" \
    --db "$DB_NAME" \
    $SEED_FLAG

echo ""
echo -e "${BLUE}[7/8] Creando y configurando servicio Systemd...${NC}"

# Determinar usuario de ejecución de Apache (www-data en debian/ubuntu, apache en rhel)
APACHE_USER="www-data"
if ! id "$APACHE_USER" &>/dev/null; then
    APACHE_USER="apache"
fi

SERVICE_FILE="/etc/systemd/system/costeo_hospitalario.service"
cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Sistema de Costeo Hospitalario y Propuesta Tarifaria (FastAPI + Uvicorn)
After=network.target mysql.service mariadb.service
Wants=network.target

[Service]
Type=simple
User=${APACHE_USER}
Group=${APACHE_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port ${APP_PORT} --workers 2 --proxy-headers --forwarded-allow-ips='*'
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=costeo_hospitalario
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# Ajustar permisos de la aplicación para el usuario del servidor web
chown -R "${APACHE_USER}:${APACHE_USER}" "$APP_DIR"
chmod -R 755 "$APP_DIR"

systemctl daemon-reload
systemctl enable costeo_hospitalario.service
systemctl restart costeo_hospitalario.service
echo -e "${GREEN}[+] Servicio Systemd 'costeo_hospitalario' iniciado y habilitado en el arranque.${NC}"

echo ""
echo -e "${BLUE}[8/8] Configurando VirtualHost de Apache2...${NC}"
VHOST_CONF="/etc/apache2/sites-available/${SUBDOMAIN}.conf"

cat <<EOF > "$VHOST_CONF"
<VirtualHost *:80>
    ServerName ${SUBDOMAIN}
    ServerAdmin admin@${SUBDOMAIN}

    ErrorLog \${APACHE_LOG_DIR}/costeo_${SUBDOMAIN}_error.log
    CustomLog \${APACHE_LOG_DIR}/costeo_${SUBDOMAIN}_access.log combined

    LimitRequestBody 52428800

    ProxyPreserveHost On
    ProxyRequests Off

    RequestHeader set X-Forwarded-Proto expr=%{REQUEST_SCHEME}
    RequestHeader set X-Forwarded-Port expr=%{SERVER_PORT}
    RequestHeader set X-Forwarded-For %{REMOTE_ADDR}e

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://127.0.0.1:${APP_PORT}/\$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]

    ProxyPass / http://127.0.0.1:${APP_PORT}/ timeout=300
    ProxyPassReverse / http://127.0.0.1:${APP_PORT}/

    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>
</VirtualHost>
EOF

if command -v a2ensite &> /dev/null; then
    a2ensite "${SUBDOMAIN}.conf"
fi

# Validar sintaxis de Apache y reiniciar
if apache2ctl configtest &> /dev/null; then
    systemctl reload apache2 || systemctl restart apache2
    echo -e "${GREEN}[+] Sitio Apache2 activado y servidor recargado.${NC}"
else
    echo -e "${RED}[!] Error en la sintaxis de configuración de Apache2. Revisa con 'apache2ctl configtest'${NC}"
fi

# Configuración opcional de SSL con Certbot
if [[ "$ENABLE_SSL" =~ ^[Ss]$ ]]; then
    echo ""
    echo -e "${CYAN}[*] Configurando SSL con Let's Encrypt Certbot para ${SUBDOMAIN}...${NC}"
    certbot --apache -d "$SUBDOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
        echo -e "${YELLOW}[!] No se pudo generar el certificado automático. Puedes ejecutar 'certbot --apache -d ${SUBDOMAIN}' manualmente.${NC}"
    }
fi

# Verificación de Salud
echo ""
echo -e "${BLUE}===============================================================================${NC}"
echo -e "${CYAN}                    VERIFICACIÓN DE ESTADO DEL SERVICIO                         ${NC}"
echo -e "${BLUE}===============================================================================${NC}"
sleep 2

HEALTH_CHECK=$(curl -s "http://127.0.0.1:${APP_PORT}/api/health" || echo "FAIL")
if [[ "$HEALTH_CHECK" =~ "ok" ]]; then
    echo -e "${GREEN}✔ Backend API Uvicorn respondiendo correctamente en http://127.0.0.1:${APP_PORT}/api/health${NC}"
    echo -e "${GREEN}✔ Sistema desplegado exitosamente.${NC}"
else
    echo -e "${YELLOW}⚠ El backend está arrancando o reportó: ${HEALTH_CHECK}${NC}"
    echo -e "  Revisa los logs con: ${CYAN}journalctl -u costeo_hospitalario -n 30 --no-pager${NC}"
fi

echo ""
echo -e "${GREEN}===============================================================================${NC}"
echo -e "${GREEN}                     ¡DESPLIEGUE FINALIZADO EXITOSAMENTE!                      ${NC}"
echo -e "${GREEN}===============================================================================${NC}"
echo -e "• URL del Sistema:    ${CYAN}http://${SUBDOMAIN}${NC}"
echo -e "• Puerto Interno:     ${YELLOW}127.0.0.1:${APP_PORT}${NC}"
echo -e "• Estado Servicio:    ${CYAN}systemctl status costeo_hospitalario${NC}"
echo -e "• Ver Logs en Vivo:   ${CYAN}journalctl -u costeo_hospitalario -f${NC}"
echo -e "• Reiniciar Servicio: ${CYAN}systemctl restart costeo_hospitalario${NC}"
echo -e "• Reiniciar Apache:   ${CYAN}systemctl reload apache2${NC}"
echo -e "==============================================================================="
