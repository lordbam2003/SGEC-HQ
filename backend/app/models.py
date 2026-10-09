from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, ForeignKey, DateTime, Index
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class CPMSCatalog(Base):
    __tablename__ = "cat_cpms"

    codigo = Column(String(50), primary_key=True, index=True)
    denominacion = Column(Text, nullable=False)
    grupo_codigo = Column(String(50), nullable=True)
    grupo_nombre = Column(String(255), nullable=True)
    seccion_codigo = Column(String(50), nullable=True)
    seccion_nombre = Column(String(255), nullable=True, index=True)
    subseccion_codigo = Column(String(50), nullable=True)
    subseccion_nombre = Column(String(255), nullable=True)
    situacion = Column(String(50), default="ACTIVO")

class InsumoCatalog(Base):
    __tablename__ = "cat_insumos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo_costeo = Column(String(50), nullable=True, index=True)
    codigo_usado = Column(String(50), nullable=True, index=True)
    descripcion = Column(Text, nullable=False)
    unidad_medida = Column(String(100), nullable=True)
    unidad_adquisicion = Column(String(100), nullable=True)
    precio_promedio = Column(Float, default=0.0)
    cantidad_presentacion = Column(Float, default=1.0)
    unidad_consumo = Column(String(100), nullable=True)
    costo_unitario = Column(Float, default=0.0)
    costo_minuto = Column(Float, default=0.0)
    tipo = Column(String(50), default="FUNGIBLE") # FUNGIBLE o NO_FUNGIBLE
    codigo_siga = Column(String(50), nullable=True, index=True)
    precio_siga = Column(Float, nullable=True, default=0.0)
    origen = Column(String(20), default="BASE", index=True) # BASE, SIGA, FUSIONADO

class EquipamientoCatalog(Base):
    __tablename__ = "cat_equipamiento"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo_costeo = Column(String(50), nullable=True, index=True)
    codigo_margesi = Column(String(50), nullable=True, index=True)
    descripcion = Column(Text, nullable=False)
    tipo_equipamiento = Column(String(255), nullable=True) # Equipo, Mobiliario, etc.
    centro_costos = Column(String(255), nullable=True)
    valor_adquisicion = Column(Float, default=0.0)
    vida_util_minutos = Column(Float, default=0.0)
    costo_minuto = Column(Float, default=0.0)

class RRHHCatalog(Base):
    __tablename__ = "cat_rrhh"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo_costeo = Column(String(50), nullable=True, index=True)
    grupo_ocupacional = Column(String(255), nullable=False, index=True)
    pago_mensual = Column(Float, default=0.0)
    jornada_minutos = Column(Float, default=9000.0)
    costo_minuto = Column(Float, default=0.0)

class InfraestructuraCatalog(Base):
    __tablename__ = "cat_infraestructura"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo_costeo = Column(String(50), nullable=True, index=True)
    ups = Column(String(255), nullable=True)
    servicio = Column(String(255), nullable=False, index=True)
    num_ambiente = Column(Integer, default=1)
    area_m2 = Column(Float, default=0.0)
    valor_construccion_m2 = Column(Float, default=0.0)
    valor_total_upss = Column(Float, default=0.0)
    vida_util_minutos = Column(Float, default=26280000.0)
    depreciacion_minuto = Column(Float, default=0.0)
    referencia_normativa = Column(Text, nullable=True)

class ServiciosBasicosCatalog(Base):
    __tablename__ = "cat_servicios_basicos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo_costeo = Column(String(50), nullable=True, index=True)
    ups = Column(String(255), nullable=True)
    servicio = Column(String(255), nullable=False, index=True)
    area_m2 = Column(Float, default=0.0)
    costo_total_servicio = Column(Float, default=0.0)

class CostosIndirectosCatalog(Base):
    __tablename__ = "cat_costos_indirectos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo_upss = Column(String(50), nullable=True, index=True)
    ups = Column(String(255), nullable=True)
    servicio = Column(String(255), nullable=False, index=True)
    area_m2 = Column(Float, default=0.0)
    asignacion_admin = Column(Float, default=0.0)
    asignacion_generales = Column(Float, default=0.0)
    produccion_optima_anual = Column(Float, default=0.0)
    costo_unit_admin = Column(Float, default=0.0)
    costo_unit_generales = Column(Float, default=0.0)
    costo_unit_total_pms = Column(Float, default=0.0)

class ServicioCatalog(Base):
    __tablename__ = "cat_servicios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50), nullable=True, index=True)
    ups = Column(String(255), nullable=False, index=True)
    nombre_servicio = Column(String(255), nullable=False, index=True)
    centros_costo_equipamiento = Column(Text, nullable=True) # Lista o JSON de centros de costo para equipos

    infraestructura_id = Column(Integer, ForeignKey("cat_infraestructura.id", ondelete="SET NULL"), nullable=True)
    servicios_basicos_id = Column(Integer, ForeignKey("cat_servicios_basicos.id", ondelete="SET NULL"), nullable=True)
    costos_indirectos_id = Column(Integer, ForeignKey("cat_costos_indirectos.id", ondelete="SET NULL"), nullable=True)

    infraestructura = relationship("InfraestructuraCatalog")
    servicios_basicos = relationship("ServiciosBasicosCatalog")
    costos_indirectos = relationship("CostosIndirectosCatalog")

class CosteoProcedimiento(Base):
    __tablename__ = "costeo_procedimientos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo_cpms = Column(String(50), nullable=False, index=True)
    nombre_procedimiento = Column(String(500), nullable=False)
    upss_servicio = Column(String(255), nullable=True, index=True)
    
    servicio_id = Column(Integer, ForeignKey("cat_servicios.id", ondelete="SET NULL"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    infraestructura_id = Column(Integer, ForeignKey("cat_infraestructura.id", ondelete="SET NULL"), nullable=True)
    servicios_basicos_id = Column(Integer, ForeignKey("cat_servicios_basicos.id", ondelete="SET NULL"), nullable=True)
    costos_indirectos_id = Column(Integer, ForeignKey("cat_costos_indirectos.id", ondelete="SET NULL"), nullable=True)

    tiempo_total_minutos = Column(Float, default=0.0)
    
    # Costos Directos
    costo_rrhh = Column(Float, default=0.0)
    costo_insumos = Column(Float, default=0.0)
    costo_equipos = Column(Float, default=0.0)
    costo_infraestructura = Column(Float, default=0.0)
    costo_servicios = Column(Float, default=0.0)
    costo_directo = Column(Float, default=0.0)

    # Costos Indirectos
    gastos_admin = Column(Float, default=0.0)
    gastos_generales = Column(Float, default=0.0)
    costo_indirecto = Column(Float, default=0.0)

    # Totales
    costo_total_estandar = Column(Float, default=0.0)
    costo_medicamentos = Column(Float, default=0.0)
    costo_total_final = Column(Float, default=0.0)

    # Propuesta Tarifaria
    tarifa_referencial = Column(Float, default=0.0)
    tarifa_no_asegurados = Column(Float, default=0.0)
    tarifa_sis = Column(Float, default=0.0)
    tarifa_essalud = Column(Float, default=0.0)
    tarifa_privados = Column(Float, default=0.0)
    margen_privados_pct = Column(Float, default=20.0)

    notas = Column(Text, nullable=True)
    estado = Column(String(50), default="BORRADOR") # BORRADOR, APROBADO, ARCHIVADO
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    usuario = relationship("Usuario", back_populates="costeos")
    servicio = relationship("ServicioCatalog")
    fases = relationship("CosteoFase", back_populates="procedimiento", cascade="all, delete-orphan", order_by="CosteoFase.orden")
    medicamentos = relationship("CosteoMedicamento", back_populates="procedimiento", cascade="all, delete-orphan")
    mercado_referencias = relationship("EstudioMercadoReferencia", back_populates="procedimiento", cascade="all, delete-orphan")

class CosteoFase(Base):
    __tablename__ = "costeo_fases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    costeo_id = Column(Integer, ForeignKey("costeo_procedimientos.id", ondelete="CASCADE"), nullable=False)
    nombre_fase = Column(String(150), nullable=False) # e.g. FASE PRE ANALITICA
    descripcion_actividad = Column(String(500), nullable=True) # e.g. Registro, orientación y toma
    orden = Column(Integer, default=1)
    tiempo_minutos = Column(Float, default=0.0)

    subtotal_rrhh = Column(Float, default=0.0)
    subtotal_insumos = Column(Float, default=0.0)
    subtotal_equipos = Column(Float, default=0.0)
    subtotal_fase = Column(Float, default=0.0)

    procedimiento = relationship("CosteoProcedimiento", back_populates="fases")
    rrhh_items = relationship("CosteoFaseRRHH", back_populates="fase", cascade="all, delete-orphan")
    insumo_items = relationship("CosteoFaseInsumo", back_populates="fase", cascade="all, delete-orphan")
    equipo_items = relationship("CosteoFaseEquipo", back_populates="fase", cascade="all, delete-orphan")

class CosteoFaseRRHH(Base):
    __tablename__ = "costeo_fase_rrhh"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fase_id = Column(Integer, ForeignKey("costeo_fases.id", ondelete="CASCADE"), nullable=False)
    rrhh_id = Column(Integer, ForeignKey("cat_rrhh.id", ondelete="SET NULL"), nullable=True)
    codigo_costeo = Column(String(50), nullable=True)
    grupo_ocupacional = Column(String(255), nullable=False)
    tiempo_minutos = Column(Float, default=0.0)
    cantidad = Column(Float, default=1.0)
    costo_unitario = Column(Float, default=0.0)
    costo_parcial = Column(Float, default=0.0)

    fase = relationship("CosteoFase", back_populates="rrhh_items")

class CosteoFaseInsumo(Base):
    __tablename__ = "costeo_fase_insumos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fase_id = Column(Integer, ForeignKey("costeo_fases.id", ondelete="CASCADE"), nullable=False)
    insumo_id = Column(Integer, ForeignKey("cat_insumos.id", ondelete="SET NULL"), nullable=True)
    codigo_costeo = Column(String(50), nullable=True)
    codigo_usado = Column(String(50), nullable=True)
    descripcion = Column(String(500), nullable=False)
    tipo_insumo = Column(String(50), default="FUNGIBLE") # FUNGIBLE o NO_FUNGIBLE
    unidad_medida = Column(String(100), nullable=True)
    unidad_consumo = Column(String(100), nullable=True)
    tiempo_minutos = Column(Float, default=0.0) # para no fungibles o con costo_minuto
    cantidad = Column(Float, default=1.0)
    costo_unitario = Column(Float, default=0.0)
    costo_minuto = Column(Float, default=0.0)
    costo_parcial = Column(Float, default=0.0)

    fase = relationship("CosteoFase", back_populates="insumo_items")

class CosteoFaseEquipo(Base):
    __tablename__ = "costeo_fase_equipos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fase_id = Column(Integer, ForeignKey("costeo_fases.id", ondelete="CASCADE"), nullable=False)
    equipo_id = Column(Integer, ForeignKey("cat_equipamiento.id", ondelete="SET NULL"), nullable=True)
    codigo_costeo = Column(String(50), nullable=True)
    codigo_margesi = Column(String(50), nullable=True)
    descripcion = Column(String(500), nullable=False)
    tipo_equipamiento = Column(String(100), default="Equipo") # Equipo o Mobiliario
    tiempo_minutos = Column(Float, default=0.0)
    cantidad = Column(Float, default=1.0)
    costo_unitario = Column(Float, default=0.0)
    costo_parcial = Column(Float, default=0.0)

    fase = relationship("CosteoFase", back_populates="equipo_items")

class CosteoMedicamento(Base):
    __tablename__ = "costeo_medicamentos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    costeo_id = Column(Integer, ForeignKey("costeo_procedimientos.id", ondelete="CASCADE"), nullable=False)
    insumo_id = Column(Integer, ForeignKey("cat_insumos.id", ondelete="SET NULL"), nullable=True)
    codigo_costeo = Column(String(50), nullable=True)
    descripcion = Column(String(500), nullable=False)
    unidad_medida = Column(String(100), nullable=True)
    cantidad = Column(Float, default=1.0)
    costo_unitario = Column(Float, default=0.0)
    costo_parcial = Column(Float, default=0.0)

    procedimiento = relationship("CosteoProcedimiento", back_populates="medicamentos")

class EstudioMercadoReferencia(Base):
    __tablename__ = "estudio_mercado_referencias"

    id = Column(Integer, primary_key=True, autoincrement=True)
    costeo_id = Column(Integer, ForeignKey("costeo_procedimientos.id", ondelete="CASCADE"), nullable=False)
    institucion = Column(String(255), nullable=False)
    precio_referencia = Column(Float, default=0.0)
    procedimiento = relationship("CosteoProcedimiento", back_populates="mercado_referencias")

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    nombre_completo = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    rol = Column(String(50), default="usuario", nullable=False) # 'admin' o 'usuario'
    activo = Column(Integer, default=1, nullable=False) # 1 = Activo, 0 = Inactivo
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relación con hojas de costeo
    costeos = relationship("CosteoProcedimiento", back_populates="usuario")
