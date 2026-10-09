#!/usr/bin/env python3
"""
Script de Inicialización de Base de Datos para el Sistema de Costeo Hospitalario
Ejecuta la creación de esquema desde db.sql y opcionalmente importa catálogos base.

Uso:
    python init_db.py
    python init_db.py --seed
    python init_db.py --host 127.0.0.1 --user root --password secret --db costeo_hospitalario
"""

import os
import sys
import argparse
from pathlib import Path

# Añadir la raíz del proyecto al PYTHONPATH
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")

import pymysql

def parse_args():
    parser = argparse.ArgumentParser(description="Inicializador de Base de Datos Costeo Hospitalario")
    parser.add_argument("--host", default=os.getenv("DB_HOST", "127.0.0.1"), help="Host de MySQL")
    parser.add_argument("--port", type=int, default=int(os.getenv("DB_PORT", "3306")), help="Puerto de MySQL")
    parser.add_argument("--user", default=os.getenv("DB_USER", "root"), help="Usuario de MySQL")
    parser.add_argument("--password", default=os.getenv("DB_PASSWORD", ""), help="Contraseña de MySQL")
    parser.add_argument("--db", default=os.getenv("DB_NAME", "costeo_hospitalario"), help="Nombre de la Base de Datos")
    parser.add_argument("--seed", action="store_true", help="Importar catálogos base desde archivos Excel/CSV si las tablas están vacías")
    return parser.parse_args()

def execute_sql_file(cursor, sql_path):
    print(f"[*] Leyendo archivo SQL: {sql_path.name}...")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Dividir declaraciones SQL ignorando delimitadores y comentarios
    statements = []
    current_stmt = []
    
    for line in sql_content.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("--") or trimmed.startswith("/*"):
            continue
        current_stmt.append(line)
        if trimmed.endswith(";"):
            stmt = "\n".join(current_stmt).strip()
            if stmt:
                statements.append(stmt)
            current_stmt = []

    print(f"[*] Ejecutando {len(statements)} instrucciones SQL...")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    for idx, stmt in enumerate(statements, 1):
        try:
            cursor.execute(stmt)
        except Exception as e:
            # Ignorar errores de creación de BD si ya existe
            if "database exists" in str(e).lower() or "already exists" in str(e).lower():
                continue
            print(f"[!] Advertencia en instrucción #{idx}: {e}")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

def main():
    args = parse_args()

    print("===============================================================================")
    print("      INICIALIZADOR DE BASE DE DATOS - SISTEMA DE COSTEO HOSPITALARIO")
    print("===============================================================================")
    print(f"• Servidor:   {args.host}:{args.port}")
    print(f"• Usuario:    {args.user}")
    print(f"• Base Datos: {args.db}")
    print("-------------------------------------------------------------------------------")

    # 1. Conectar al servidor MySQL (sin especificar base de datos inicialmente)
    try:
        conn = pymysql.connect(
            host=args.host,
            port=args.port,
            user=args.user,
            password=args.password,
            charset="utf8mb4",
            autocommit=True
        )
        print("[+] Conexión exitosa al servidor MySQL / MariaDB.")
    except Exception as e:
        print(f"[ERROR] No se pudo conectar al servidor MySQL: {e}")
        sys.exit(1)

    with conn.cursor() as cursor:
        # 2. Crear base de datos si no existe
        print(f"[*] Creando base de datos `{args.db}` si no existe (utf8mb4)...")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{args.db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        cursor.execute(f"USE `{args.db}`;")

        # 3. Ejecutar esquema desde db.sql
        sql_path = BASE_DIR / "db.sql"
        if sql_path.exists():
            execute_sql_file(cursor, sql_path)
            print(f"[+] Esquema aplicado correctamente desde {sql_path.name}.")
        else:
            print(f"[!] Advertencia: No se encontró {sql_path}. Se usarán los modelos SQLAlchemy.")
            from backend.app.database import engine, Base
            import backend.app.models
            Base.metadata.create_all(bind=engine)
            print("[+] Tablas creadas mediante SQLAlchemy Base.metadata.")

    conn.close()

    # 4. Asegurar existencia de usuario inicial admin
    try:
        from backend.app.database import SessionLocal
        from backend.app.auth import seed_initial_admin
        db = SessionLocal()
        seed_initial_admin(db)
        db.close()
    except Exception as e:
        print(f"[!] Advertencia al verificar usuario admin: {e}")

    # 4. Si se solicitó semillero (--seed), importar catálogos base
    if args.seed:
        print("-------------------------------------------------------------------------------")
        print("[*] Verificando e importando catálogos iniciales...")
        try:
            from backend.app.database import SessionLocal
            from backend.app.services.data_importer import (
                import_cpms_from_excel,
                import_rrhh_from_excel,
                import_insumos_from_siga_excel,
                import_insumos_from_csv,
                import_catalogs_from_data_excel,
                create_sample_costing
            )
            from backend.app.models import CPMSCatalog, RRHHCatalog, InsumoCatalog

            db = SessionLocal()

            # CPMS
            cpms_path = BASE_DIR / "CPMS_SUSALUD.xlsx"
            if cpms_path.exists() and db.query(CPMSCatalog).count() == 0:
                print("  -> Importando Catálogo CPMS SUSALUD...")
                res = import_cpms_from_excel(str(cpms_path), db)
                print(f"     Insertados: {res.get('inserted', 0)}")

            # RRHH
            rrhh_path = BASE_DIR / "RRHH.xlsx"
            if rrhh_path.exists() and db.query(RRHHCatalog).count() == 0:
                print("  -> Importando Catálogo de RRHH...")
                res = import_rrhh_from_excel(str(rrhh_path), db)
                print(f"     Insertados: {res.get('inserted', 0)}")

            # SIGA / Insumos
            siga_path = BASE_DIR / "siga.xlsx"
            if siga_path.exists() and db.query(InsumoCatalog).count() == 0:
                print("  -> Importando Insumos desde SIGA...")
                res = import_insumos_from_siga_excel(str(siga_path), db)
                print(f"     Insertados: {res.get('inserted', 0)}")

            # data.xlsx (Infraestructura, Equipamiento, Servicios Básicos, Factores Indirectos)
            data_path = BASE_DIR / "data.xlsx"
            if data_path.exists():
                print("  -> Importando factores, infraestructura y servicios desde data.xlsx...")
                res = import_catalogs_from_data_excel(str(data_path), db)
                print(f"     Resultado: {res.get('status', 'completado')}")

            db.close()
            print("[+] Catálogos iniciales procesados exitosamente.")
        except Exception as e:
            print(f"[!] Error al sembrar catálogos: {e}")

    print("===============================================================================")
    print("  ¡INICIALIZACIÓN DE BASE DE DATOS COMPLETADA CON ÉXITO!")
    print("===============================================================================")

if __name__ == "__main__":
    main()
