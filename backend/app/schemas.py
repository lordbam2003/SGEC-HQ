from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# ==================== CPMS Schemas ====================
class CPMSBase(BaseModel):
    codigo: str
    denominacion: str
    grupo_codigo: Optional[str] = None
    grupo_nombre: Optional[str] = None
    seccion_codigo: Optional[str] = None
    seccion_nombre: Optional[str] = None
    subseccion_codigo: Optional[str] = None
    subseccion_nombre: Optional[str] = None
    situacion: Optional[str] = "ACTIVO"

class CPMSOut(CPMSBase):
    model_config = {"from_attributes": True}

# ==================== Insumo Schemas ====================
class InsumoBase(BaseModel):
    codigo_costeo: Optional[str] = None
    codigo_usado: Optional[str] = None
    descripcion: str
    unidad_medida: Optional[str] = None
    unidad_adquisicion: Optional[str] = None
    precio_promedio: float = 0.0
    cantidad_presentacion: float = 1.0
    unidad_consumo: Optional[str] = None
    costo_unitario: float = 0.0
    costo_minuto: float = 0.0
    tipo: str = "FUNGIBLE"
    codigo_siga: Optional[str] = None
    precio_siga: Optional[float] = 0.0
    origen: Optional[str] = "BASE"

class InsumoOut(InsumoBase):
    id: int
    model_config = {"from_attributes": True}

# ==================== Equipamiento Schemas ====================
class EquipamientoBase(BaseModel):
    codigo_costeo: Optional[str] = None
    codigo_margesi: Optional[str] = None
    descripcion: str
    tipo_equipamiento: Optional[str] = "Equipo"
    centro_costos: Optional[str] = None
    valor_adquisicion: float = 0.0
    vida_util_minutos: float = 0.0
    costo_minuto: float = 0.0

class EquipamientoOut(EquipamientoBase):
    id: int
    model_config = {"from_attributes": True}

# ==================== RRHH Schemas ====================
class RRHHBase(BaseModel):
    codigo_costeo: Optional[str] = None
    grupo_ocupacional: str
    pago_mensual: float = 0.0
    jornada_minutos: float = 9000.0
    costo_minuto: float = 0.0

class RRHHOut(RRHHBase):
    id: int
    model_config = {"from_attributes": True}

# ==================== Infraestructura Schemas ====================
class InfraestructuraBase(BaseModel):
    codigo_costeo: Optional[str] = None
    ups: Optional[str] = None
    servicio: str
    num_ambiente: int = 1
    area_m2: float = 0.0
    valor_construccion_m2: float = 0.0
    valor_total_upss: float = 0.0
    vida_util_minutos: float = 26280000.0
    depreciacion_minuto: float = 0.0
    referencia_normativa: Optional[str] = None

class InfraestructuraOut(InfraestructuraBase):
    id: int
    model_config = {"from_attributes": True}

# ==================== Servicios Basicos Schemas ====================
class ServiciosBasicosBase(BaseModel):
    codigo_costeo: Optional[str] = None
    ups: Optional[str] = None
    servicio: str
    area_m2: float = 0.0
    costo_total_servicio: float = 0.0

class ServiciosBasicosOut(ServiciosBasicosBase):
    id: int
    model_config = {"from_attributes": True}

# ==================== Costos Indirectos Schemas ====================
class CostosIndirectosBase(BaseModel):
    codigo_upss: Optional[str] = None
    ups: Optional[str] = None
    servicio: str
    area_m2: float = 0.0
    asignacion_admin: float = 0.0
    asignacion_generales: float = 0.0
    produccion_optima_anual: float = 0.0
    costo_unit_admin: float = 0.0
    costo_unit_generales: float = 0.0
    costo_unit_total_pms: float = 0.0

class CostosIndirectosOut(CostosIndirectosBase):
    id: int
    model_config = {"from_attributes": True}

# ==================== Servicios Hospitalarios Schemas ====================
class ServicioBase(BaseModel):
    codigo: Optional[str] = None
    ups: str
    nombre_servicio: str
    centros_costo_equipamiento: Optional[str] = None
    infraestructura_id: Optional[int] = None
    servicios_basicos_id: Optional[int] = None
    costos_indirectos_id: Optional[int] = None

class ServicioOut(ServicioBase):
    id: int
    model_config = {"from_attributes": True}

class ServicioDetailedOut(ServicioOut):
    infraestructura: Optional[InfraestructuraOut] = None
    servicios_basicos: Optional[ServiciosBasicosOut] = None
    costos_indirectos: Optional[CostosIndirectosOut] = None
    model_config = {"from_attributes": True}

class CentroCostoInfo(BaseModel):
    nombre: str
    total_equipos: int

class ServicioCentrosCostoUpdate(BaseModel):
    centros_costo: List[str]

# ==================== Costeo Items Schemas ====================
class CosteoRRHHItemIn(BaseModel):
    rrhh_id: Optional[int] = None
    codigo_costeo: Optional[str] = None
    grupo_ocupacional: str
    tiempo_minutos: float = 0.0
    cantidad: float = 1.0
    costo_unitario: float = 0.0

class CosteoRRHHItemOut(CosteoRRHHItemIn):
    id: int
    costo_parcial: float
    model_config = {"from_attributes": True}

class CosteoInsumoItemIn(BaseModel):
    insumo_id: Optional[int] = None
    codigo_costeo: Optional[str] = None
    codigo_usado: Optional[str] = None
    descripcion: str
    tipo_insumo: str = "FUNGIBLE" # FUNGIBLE o NO_FUNGIBLE
    unidad_medida: Optional[str] = None
    unidad_consumo: Optional[str] = None
    tiempo_minutos: float = 0.0
    cantidad: float = 1.0
    costo_unitario: float = 0.0
    costo_minuto: float = 0.0

class CosteoInsumoItemOut(CosteoInsumoItemIn):
    id: int
    costo_parcial: float
    model_config = {"from_attributes": True}

class CosteoEquipoItemIn(BaseModel):
    equipo_id: Optional[int] = None
    codigo_costeo: Optional[str] = None
    codigo_margesi: Optional[str] = None
    descripcion: str
    tipo_equipamiento: str = "Equipo"
    tiempo_minutos: float = 0.0
    cantidad: float = 1.0
    costo_unitario: float = 0.0

class CosteoEquipoItemOut(CosteoEquipoItemIn):
    id: int
    costo_parcial: float
    model_config = {"from_attributes": True}

class CosteoFaseIn(BaseModel):
    nombre_fase: str
    descripcion_actividad: Optional[str] = None
    orden: int = 1
    tiempo_minutos: float = 0.0
    rrhh_items: List[CosteoRRHHItemIn] = []
    insumo_items: List[CosteoInsumoItemIn] = []
    equipo_items: List[CosteoEquipoItemIn] = []

class CosteoFaseOut(BaseModel):
    id: int
    nombre_fase: str
    descripcion_actividad: Optional[str] = None
    orden: int
    tiempo_minutos: float
    subtotal_rrhh: float
    subtotal_insumos: float
    subtotal_equipos: float
    subtotal_fase: float
    rrhh_items: List[CosteoRRHHItemOut] = []
    insumo_items: List[CosteoInsumoItemOut] = []
    equipo_items: List[CosteoEquipoItemOut] = []
    model_config = {"from_attributes": True}

class CosteoMedicamentoIn(BaseModel):
    insumo_id: Optional[int] = None
    codigo_costeo: Optional[str] = None
    descripcion: str
    unidad_medida: Optional[str] = None
    cantidad: float = 1.0
    costo_unitario: float = 0.0

class CosteoMedicamentoOut(CosteoMedicamentoIn):
    id: int
    costo_parcial: float
    model_config = {"from_attributes": True}

class MercadoReferenciaIn(BaseModel):
    institucion: str
    precio_referencia: float = 0.0
    observacion: Optional[str] = None

class MercadoReferenciaOut(MercadoReferenciaIn):
    id: int
    model_config = {"from_attributes": True}

# ==================== Costeo Procedimiento Schemas ====================
class CosteoProcedimientoIn(BaseModel):
    codigo_cpms: str
    nombre_procedimiento: str
    upss_servicio: Optional[str] = None
    servicio_id: Optional[int] = None
    infraestructura_id: Optional[int] = None
    servicios_basicos_id: Optional[int] = None
    costos_indirectos_id: Optional[int] = None
    margen_privados_pct: float = 20.0
    notas: Optional[str] = None
    estado: str = "BORRADOR"
    fases: List[CosteoFaseIn] = []
    medicamentos: List[CosteoMedicamentoIn] = []
    mercado_referencias: List[MercadoReferenciaIn] = []

# ==================== Usuario & Auth Schemas ====================
class UsuarioBase(BaseModel):
    username: str
    nombre_completo: str
    email: Optional[str] = None
    rol: str = "usuario" # "admin" o "usuario"
    activo: int = 1

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[int] = None
    password: Optional[str] = None

class UsuarioSimpleOut(BaseModel):
    id: int
    username: str
    nombre_completo: str
    rol: str
    model_config = {"from_attributes": True}

class UsuarioOut(UsuarioBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    total_costeos: Optional[int] = 0
    model_config = {"from_attributes": True}

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UsuarioOut

class CosteoProcedimientoOut(BaseModel):
    id: int
    codigo_cpms: str
    nombre_procedimiento: str
    upss_servicio: Optional[str] = None
    servicio_id: Optional[int] = None
    usuario_id: Optional[int] = None
    usuario: Optional[UsuarioSimpleOut] = None
    infraestructura_id: Optional[int] = None
    servicios_basicos_id: Optional[int] = None
    costos_indirectos_id: Optional[int] = None
    tiempo_total_minutos: float
    costo_rrhh: float
    costo_insumos: float
    costo_equipos: float
    costo_infraestructura: float
    costo_servicios: float
    costo_directo: float
    gastos_admin: float
    gastos_generales: float
    costo_indirecto: float
    costo_total_estandar: float
    costo_medicamentos: float
    costo_total_final: float
    tarifa_referencial: float
    tarifa_no_asegurados: float
    tarifa_sis: float
    tarifa_essalud: float
    tarifa_privados: float
    margen_privados_pct: float
    notas: Optional[str] = None
    estado: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    fases: List[CosteoFaseOut] = []
    medicamentos: List[CosteoMedicamentoOut] = []
    mercado_referencias: List[MercadoReferenciaOut] = []

    model_config = {"from_attributes": True}

class PagedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]

