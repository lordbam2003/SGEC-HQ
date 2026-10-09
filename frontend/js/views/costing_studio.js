/**
 * Costing Studio: Editor Interactivo de Hoja de Costeo por Actividades (MODELO_HOJA_COSTEO)
 */
const CostingStudioView = {
  currentCostingId: null,
  servicesCatalog: [],
  infraCatalogs: [],
  serviciosCatalogs: [],
  indirectosCatalogs: [],
  rrhhCatalog: [],
  filterEquipmentByService: true,
  debounceTimer: null,
  hasUnsavedDraft: false,
  lastSavedTime: null,

  state: {
    codigo_cpms: '',
    nombre_procedimiento: '',
    servicio_id: null,
    upss_servicio: '',
    infraestructura_id: null,
    servicios_basicos_id: null,
    costos_indirectos_id: null,
    margen_privados_pct: 20.0,
    estado: 'BORRADOR',
    notas: '',
    fases: [
      {
        nombre_fase: 'Actividad 1',
        descripcion_actividad: 'Atención, preparación y ejecución inicial',
        orden: 1,
        tiempo_minutos: 10.0,
        rrhh_items: [],
        insumo_items: [],
        equipo_items: []
      }
    ],
    medicamentos: [],
    mercado_referencias: []
  },

  liveCalculated: null,

  async render(container, costingId = null) {
    this.currentCostingId = costingId;
    await this.loadCatalogs();

    if (costingId) {
      this.hasUnsavedDraft = false;
      await this.loadCostingData(costingId);
    } else {
      const restored = this.checkAndLoadDraft(costingId);
      if (!restored) {
        this.resetState();
      }
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <h2 class="view-title" style="margin-bottom: 0;">${this.currentCostingId ? 'Editar Hoja de Costeo #' + this.currentCostingId : 'Constructor de Hoja de Costeo'}</h2>
            <div id="autosave-indicator"></div>
          </div>
          <p class="view-subtitle">Costeo por actividades (1 a N actividades), recursos humanos, insumos y propuesta tarifaria.</p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="CostingStudioView.clearDraft(true)" title="Limpiar y empezar nuevo procedimiento en blanco">
            ${Icons.plus} Nuevo en Blanco
          </button>
          ${this.currentCostingId ? `
            <a href="/api/costing/${this.currentCostingId}/export-excel" class="btn btn-secondary btn-sm" target="_blank">
              ${Icons.download} Exportar Excel
            </a>
            <button class="btn btn-secondary btn-sm" onclick="CostingStudioView.cloneCurrent()">
              ${Icons.copy} Duplicar
            </button>
          ` : ''}
          <button class="btn btn-primary" onclick="CostingStudioView.saveCosting()">
            ${Icons.save} Guardar Hoja de Costeo
          </button>
        </div>
      </div>

      ${this.hasUnsavedDraft ? `
        <div id="draft-resume-banner" style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #1e40af;">
            <span style="font-size: 1.1rem;">📌</span>
            <span>Has retomado tu <strong>borrador en progreso</strong> (${this.state.codigo_cpms ? `CPMS ${this.state.codigo_cpms} - ` : ''}${this.state.nombre_procedimiento || 'Sin denominación'}, ${this.state.fases.length} actividad(es)). Todos los cambios se guardan localmente mientras trabajas.</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 0.25rem 0.5rem;" onclick="CostingStudioView.clearDraft(true)">
              Descartar Borrador
            </button>
          </div>
        </div>
      ` : ''}

      <div class="costing-layout">
        <!-- Main Form Area -->
        <div class="studio-main-card">
          <!-- Card Cabecera del Procedimiento -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">${Icons.hospital} Identificación del Procedimiento y UPSS</h3>
              <span class="badge badge-primary" id="badge-estado">${this.state.estado}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 180px 1fr 280px; gap: 1rem; align-items: start;">
              <!-- CPMS Search with Autocomplete -->
              <div class="form-group autocomplete-container">
                <label class="form-label">Código CPMS (*)</label>
                <input type="text" id="input-cpms-code" class="form-control" placeholder="Buscar código..." value="${this.state.codigo_cpms}" autocomplete="off" oninput="CostingStudioView.onCpmsInput(this.value)">
                <div id="cpms-autocomplete-box" class="autocomplete-dropdown" style="display: none;"></div>
              </div>

              <div class="form-group">
                <label class="form-label">Denominación del Procedimiento (*)</label>
                <input type="text" id="input-proc-name" class="form-control" placeholder="Nombre completo del procedimiento..." value="${this.state.nombre_procedimiento}" oninput="CostingStudioView.state.nombre_procedimiento = this.value; CostingStudioView.persistDraft();">
              </div>

              <div class="form-group">
                <label class="form-label">UPS / Servicio Asignado (*)</label>
                <select id="select-upss" class="form-select" onchange="CostingStudioView.onUPSSChange(this.value)">
                  ${this.renderUPSSOptions()}
                </select>
              </div>
            </div>
          </div>

          <!-- Actividades del Procedimiento (1 a N) -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 0.5rem 0 1rem;">
            <div>
              <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.5rem;">
                ${Icons.calculator} Actividades del Procedimiento (<span id="actividades-count">${this.state.fases.length}</span>)
              </h3>
              <p style="font-size: 0.78rem; color: var(--text-muted);">Cada actividad detalla el tiempo, personal (RRHH), insumos y equipamiento necesario.</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="CostingStudioView.addActivity()">
              ${Icons.plus} Agregar Actividad
            </button>
          </div>

          <div id="fases-container">
            ${this.renderActivities()}
          </div>

          <!-- Botón grande para agregar otra actividad -->
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <button class="btn btn-secondary" style="width: 100%; border-style: dashed; padding: 0.85rem;" onclick="CostingStudioView.addActivity()">
              ${Icons.plus} Agregar Otra Actividad al Procedimiento
            </button>
          </div>

          <!-- Factores a Nivel Procedimiento: Infraestructura & Servicios de la UPSS -->
          <div class="card" style="background: #ffffff; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
            <div class="card-header" style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
              <div>
                <h3 class="card-title" style="font-size: 0.95rem;">${Icons.building} Factores Directos e Indirectos de la UPSS</h3>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
                  Depreciación de infraestructura calculada por tiempo total de actividades y costo unitario estándar de servicios básicos según la UPSS seleccionada.
                </p>
              </div>
              <span id="badge-ups-name" class="badge badge-info" style="font-weight: 600;">UPSS: Seleccionar</span>
            </div>

            <div class="table-responsive" style="border: none; padding: 0;">
              <table class="data-table" id="ups-factors-table" style="font-size: 0.85rem; margin-bottom: 0;">
                <thead>
                  <tr>
                    <th>Concepto / Factor</th>
                    <th>Detalle / Ambiente Asignado</th>
                    <th style="width: 120px; text-align: right;">Tiempo (min)</th>
                    <th style="width: 160px; text-align: right;">Costo unitario</th>
                    <th style="width: 140px; text-align: right;">Costo parcial</th>
                  </tr>
                </thead>
                <tbody id="ups-factors-tbody">
                  <tr id="row-factor-infra">
                    <td>
                      <strong style="color: var(--text-main);">Costo de la Infraestructura</strong>
                      <br><small style="color: var(--text-muted);">Depreciación expresada en minutos</small>
                    </td>
                    <td id="factor-infra-detail">
                      <span style="color: var(--text-muted);">Seleccione UPSS</span>
                    </td>
                    <td id="factor-infra-time" style="text-align: right; font-weight: 600;">0 min</td>
                    <td id="factor-infra-rate" style="text-align: right; font-family: monospace;">S/. 0.000000 / min</td>
                    <td id="factor-infra-parcial" style="text-align: right; font-weight: 700; color: var(--primary);">S/. 0.000</td>
                  </tr>
                  <tr id="row-factor-serv">
                    <td>
                      <strong style="color: var(--text-main);">Costo de servicios basicos</strong>
                      <br><small style="color: var(--text-muted);">Energía, Agua, Conectividad (Total PMS)</small>
                    </td>
                    <td id="factor-serv-detail">
                      <span style="color: var(--text-muted);">Seleccione UPSS</span>
                    </td>
                    <td id="factor-serv-time" style="text-align: right; color: var(--text-muted);">-</td>
                    <td id="factor-serv-rate" style="text-align: right; font-family: monospace;">S/. 0.0000</td>
                    <td id="factor-serv-parcial" style="text-align: right; font-weight: 700; color: var(--primary);">S/. 0.000</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; font-weight: 700;">
                    <td colspan="4" style="text-align: right; color: var(--text-main);">Subtotal Infraestructura y Servicios Básicos:</td>
                    <td id="factor-factors-subtotal" style="text-align: right; color: var(--primary-dark); font-size: 0.95rem;">S/. 0.000</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Factores Indirectos de la UPSS -->
          <div class="card" style="background: #ffffff; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
            <div class="card-header" style="background: #f8fafc; border-bottom: 1px solid var(--border-color);">
              <div>
                <h3 class="card-title" style="font-size: 0.95rem;">${Icons.layers} Factores Indirectos</h3>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">
                  Asignación de costos indirectos de administración y gastos generales prorrateados según la UPSS asignada.
                </p>
              </div>
            </div>

            <div class="table-responsive" style="border: none; padding: 0;">
              <table class="data-table" id="indirect-factors-table" style="font-size: 0.85rem; margin-bottom: 0;">
                <thead>
                  <tr>
                    <th>Concepto / Factor Indirecto</th>
                    <th>Detalle / Centro de Costo (UPSS)</th>
                    <th style="width: 160px; text-align: right;">Costo unitario</th>
                    <th style="width: 140px; text-align: right;">Costo parcial</th>
                  </tr>
                </thead>
                <tbody id="indirect-factors-tbody">
                  <tr id="row-factor-admin">
                    <td>
                      <strong style="color: var(--text-main);">Costo asignado de servicios administrativos</strong>
                      <br><small style="color: var(--text-muted);">Gastos de gestión administrativa y soporte</small>
                    </td>
                    <td id="factor-admin-detail"><span style="color: var(--text-muted);">Seleccione UPSS</span></td>
                    <td id="factor-admin-rate" style="text-align: right; font-family: monospace;">S/. 0.0000</td>
                    <td id="factor-admin-parcial" style="text-align: right; font-weight: 700; color: var(--secondary);">S/. 0.000</td>
                  </tr>
                  <tr id="row-factor-gral">
                    <td>
                      <strong style="color: var(--text-main);">Costo asignado a servicios generales</strong>
                      <br><small style="color: var(--text-muted);">Mantenimiento, limpieza, vigilancia y logística</small>
                    </td>
                    <td id="factor-gral-detail"><span style="color: var(--text-muted);">Seleccione UPSS</span></td>
                    <td id="factor-gral-rate" style="text-align: right; font-family: monospace;">S/. 0.0000</td>
                    <td id="factor-gral-parcial" style="text-align: right; font-weight: 700; color: var(--secondary);">S/. 0.000</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; font-weight: 700;">
                    <td colspan="3" style="text-align: right; color: var(--text-main);">Total Costos Indirectos Asignados:</td>
                    <td id="factor-indirect-total" style="text-align: right; color: var(--secondary); font-size: 0.95rem;">S/. 0.000</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <!-- Sticky Live Calculation Summary -->
        <div class="sticky-summary">
          <div class="summary-total-hero">
            <h3>Costo Total Estándar</h3>
            <div class="price" id="live-total-price">S/. 0.000</div>
            <small id="live-total-time">Tiempo Total: 0 minutos</small>
          </div>

          <div class="summary-breakdown-list">
            <div class="breakdown-row">
              <span style="color: var(--text-muted);">1. Personal (RRHH)</span>
              <strong id="live-subtotal-rrhh">S/. 0.000</strong>
            </div>
            <div class="breakdown-row">
              <span style="color: var(--text-muted);">2. Insumos y Materiales</span>
              <strong id="live-subtotal-insumos">S/. 0.000</strong>
            </div>
            <div class="breakdown-row">
              <span style="color: var(--text-muted);">3. Equipamiento</span>
              <strong id="live-subtotal-equipos">S/. 0.000</strong>
            </div>
            <div class="breakdown-row">
              <span style="color: var(--text-muted);">4. Infraestructura</span>
              <strong id="live-subtotal-infra">S/. 0.000</strong>
            </div>
            <div class="breakdown-row">
              <span style="color: var(--text-muted);">5. Servicios Básicos</span>
              <strong id="live-subtotal-serv">S/. 0.000</strong>
            </div>
            <div class="breakdown-row total-direct">
              <span style="color: var(--primary-dark);">TOTAL COSTO DIRECTO</span>
              <span id="live-total-direct" style="color: var(--primary-dark);">S/. 0.000</span>
            </div>
            <div class="breakdown-row" style="margin-top: 0.35rem;">
              <span style="color: var(--text-muted);">Gastos Administrativos</span>
              <span id="live-subtotal-admin">S/. 0.000</span>
            </div>
            <div class="breakdown-row">
              <span style="color: var(--text-muted);">Gastos Generales</span>
              <span id="live-subtotal-grales">S/. 0.000</span>
            </div>
            <div class="breakdown-row total-indirect">
              <span style="color: var(--secondary);">TOTAL COSTO INDIRECTO</span>
              <span id="live-total-indirect" style="color: var(--secondary);">S/. 0.000</span>
            </div>
          </div>

          <!-- Propuesta Tarifaria Box -->
          <div class="tariff-proposal-box">
            <h4>${Icons.tag} Propuesta Tarifaria</h4>
            <div class="tariff-item-row">
              <span>Tarifa Referencial (Tr):</span>
              <strong id="live-tarifa-tr">S/. 0.000</strong>
            </div>
            <div class="tariff-item-row">
              <span>No Asegurados (Tpu):</span>
              <strong id="live-tarifa-tpu" style="color: var(--primary);">S/. 0.000</strong>
            </div>
            <div class="tariff-item-row">
              <span>ESSALUD / FFAA / Policía:</span>
              <strong id="live-tarifa-sis">S/. 0.000</strong>
            </div>
            <div class="tariff-item-row" style="border-top: 1px dashed #d8b4fe; padding-top: 0.35rem; margin-top: 0.35rem;">
              <span>Privados / IAFAS (+<span id="label-margen-pct">20</span>%):</span>
              <strong id="live-tarifa-priv" style="color: var(--color-accent-hover);">S/. 0.000</strong>
            </div>

            <!-- Botón Comparador de Mercado Nacional -->
            <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 600; background: white; border: 1px solid #c084fc; color: var(--color-accent-hover);" onclick="CostingStudioView.openMarketComparisonModal()" title="Consultar tarifas nacionales en el Observatorio MINSA y extraer 3 precios superiores al costo local">
              🏛️ Comparar Mercado Nacional (3 Precios > Local)
            </button>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.78rem;">Margen Comercial IAFAS (%)</label>
            <input type="number" class="form-control" style="font-size: 0.85rem;" value="${this.state.margen_privados_pct}" min="0" max="300" step="0.1" oninput="CostingStudioView.onMarginInput(this.value)">
          </div>
        </div>
      </div>
    `;

    this.recalculateLive();
    this.updateUPSSDetails();
  },

  async loadCatalogs() {
    try {
      const [servicios, infra, serv, ind, rrhh] = await Promise.all([
        API.getAllServicios(),
        API.getInfraestructura(),
        API.getServiciosBasicos(),
        API.getCostosIndirectos(),
        API.getAllRRHH()
      ]);
      this.servicesCatalog = servicios || [];
      this.infraCatalogs = infra || [];
      this.serviciosCatalogs = serv || [];
      this.indirectosCatalogs = ind || [];
      this.rrhhCatalog = rrhh || [];
    } catch (e) {
      console.error('Error cargando catálogos:', e);
    }
  },

  resetState() {
    const defaultServ = this.servicesCatalog.find(s => s.ups.includes('PATOLOGIA') || s.nombre_servicio.includes('BIOQUIMICA') || s.nombre_servicio.includes('LABORATORIO')) || this.servicesCatalog[0];
    this.state = {
      codigo_cpms: '',
      nombre_procedimiento: '',
      servicio_id: defaultServ ? defaultServ.id : null,
      upss_servicio: defaultServ ? defaultServ.nombre_servicio : 'BIOQUIMICA',
      infraestructura_id: defaultServ ? defaultServ.infraestructura_id : null,
      servicios_basicos_id: defaultServ ? defaultServ.servicios_basicos_id : null,
      costos_indirectos_id: defaultServ ? defaultServ.costos_indirectos_id : null,
      margen_privados_pct: 20.0,
      estado: 'BORRADOR',
      notas: '',
      fases: [
        {
          nombre_fase: 'Actividad 1',
          descripcion_actividad: 'Atención, preparación y toma del procedimiento',
          orden: 1,
          tiempo_minutos: 10.0,
          rrhh_items: [],
          insumo_items: [],
          equipo_items: []
        }
      ],
      medicamentos: [],
      mercado_referencias: []
    };
  },

  async loadCostingData(id) {
    try {
      const data = await API.getCostingDetail(id);
      this.state = {
        codigo_cpms: data.codigo_cpms,
        nombre_procedimiento: data.nombre_procedimiento,
        servicio_id: data.servicio_id,
        upss_servicio: data.upss_servicio,
        infraestructura_id: data.infraestructura_id,
        servicios_basicos_id: data.servicios_basicos_id,
        costos_indirectos_id: data.costos_indirectos_id,
        margen_privados_pct: (data.margen_privados_pct !== undefined && data.margen_privados_pct !== null) ? data.margen_privados_pct : 20.0,
        estado: data.estado || 'BORRADOR',
        notas: data.notas || '',
        fases: (data.fases && data.fases.length > 0) ? data.fases.map((f, idx) => ({
          id: f.id,
          nombre_fase: f.nombre_fase || `Actividad ${idx + 1}`,
          descripcion_actividad: f.descripcion_actividad || '',
          orden: f.orden || (idx + 1),
          tiempo_minutos: f.tiempo_minutos,
          rrhh_items: f.rrhh_items || [],
          insumo_items: f.insumo_items || [],
          equipo_items: f.equipo_items || []
        })) : [
          {
            nombre_fase: 'Actividad 1',
            descripcion_actividad: 'Ejecución del procedimiento',
            orden: 1,
            tiempo_minutos: 10.0,
            rrhh_items: [],
            insumo_items: [],
            equipo_items: []
          }
        ],
        medicamentos: data.medicamentos || [],
        mercado_referencias: data.mercado_referencias || []
      };

      // Si no tiene servicio_id pero tiene upss_servicio o infraestructura_id, auto-vincularlo
      if (!this.state.servicio_id && this.servicesCatalog.length > 0) {
        const foundServ = this.servicesCatalog.find(s => s.infraestructura_id === this.state.infraestructura_id || s.nombre_servicio === this.state.upss_servicio);
        if (foundServ) {
          this.state.servicio_id = foundServ.id;
        }
      }
    } catch (e) {
      console.error(e);
      Toast.error('No se pudo cargar la hoja de costeo');
    }
  },

  renderUPSSOptions() {
    if (!this.servicesCatalog || this.servicesCatalog.length === 0) {
      return '<option value="">-- SELECCIONE SERVICIO / UPSS --</option>';
    }

    // Group services by UPS
    const grouped = {};
    this.servicesCatalog.forEach(item => {
      const upsGroup = item.ups || 'GENERAL';
      if (!grouped[upsGroup]) grouped[upsGroup] = [];
      grouped[upsGroup].push(item);
    });

    let html = '<option value="">-- SELECCIONE SERVICIO / UPSS --</option>';
    for (const [upsName, items] of Object.entries(grouped)) {
      html += `<optgroup label="📂 ${upsName}">`;
      items.forEach(item => {
        const isSelected = item.id === this.state.servicio_id || (item.infraestructura_id && item.infraestructura_id === this.state.infraestructura_id);
        html += `<option value="${item.id}" ${isSelected ? 'selected' : ''}>${item.nombre_servicio} (${item.codigo})</option>`;
      });
      html += `</optgroup>`;
    }
    return html;
  },

  onUPSSChange(serviceIdStr) {
    if (!serviceIdStr) {
      this.state.servicio_id = null;
      this.state.upss_servicio = '';
      this.state.infraestructura_id = null;
      this.state.servicios_basicos_id = null;
      this.state.costos_indirectos_id = null;
      this.updateUPSSDetails();
      this.recalculateLive();
      return;
    }
    const servId = parseInt(serviceIdStr);
    const serv = this.servicesCatalog.find(s => s.id === servId);
    if (!serv) return;

    this.state.servicio_id = serv.id;
    this.state.upss_servicio = serv.nombre_servicio;
    this.state.infraestructura_id = serv.infraestructura_id;
    this.state.servicios_basicos_id = serv.servicios_basicos_id;
    this.state.costos_indirectos_id = serv.costos_indirectos_id;

    this.updateUPSSDetails();
    this.recalculateLive();
  },

  updateUPSSDetails() {
    const currentServ = this.servicesCatalog.find(s => s.id === this.state.servicio_id) || null;
    const infra = currentServ && currentServ.infraestructura ? currentServ.infraestructura : this.infraCatalogs.find(i => i.id === this.state.infraestructura_id);
    const serv = currentServ && currentServ.servicios_basicos ? currentServ.servicios_basicos : this.serviciosCatalogs.find(s => s.id === this.state.servicios_basicos_id);

    // Badge UPSS
    const badgeUps = document.getElementById('badge-ups-name');
    if (badgeUps) {
      badgeUps.textContent = currentServ ? `UPSS: ${currentServ.nombre_servicio}` : 'UPSS: Sin Asignar';
    }

    // Infraestructura
    const infraDetailEl = document.getElementById('factor-infra-detail');
    const infraRateEl = document.getElementById('factor-infra-rate');
    if (infraDetailEl && infraRateEl) {
      if (infra) {
        infraDetailEl.innerHTML = `<strong>${infra.servicio}</strong> <small style="color: var(--text-muted);">(${infra.area_m2} m² - Cód: ${infra.codigo_costeo || infra.id})</small>`;
        infraRateEl.textContent = `S/. ${infra.depreciacion_minuto.toFixed(6)} / min`;
      } else {
        infraDetailEl.innerHTML = `<span style="color: var(--text-muted);">Seleccione UPSS o ambiente</span>`;
        infraRateEl.textContent = 'S/. 0.000000 / min';
      }
    }

    // Servicios Básicos
    const servDetailEl = document.getElementById('factor-serv-detail');
    const servRateEl = document.getElementById('factor-serv-rate');
    const servParcialEl = document.getElementById('factor-serv-parcial');
    if (servDetailEl && servRateEl && servParcialEl) {
      if (serv) {
        servDetailEl.innerHTML = `<strong>${serv.servicio}</strong> <small style="color: var(--text-muted);">(Cód: ${serv.codigo_costeo || serv.id})</small>`;
        servRateEl.textContent = `S/. ${serv.costo_total_servicio.toFixed(4)}`;
        servParcialEl.textContent = `S/. ${serv.costo_total_servicio.toFixed(3)}`;
      } else {
        servDetailEl.innerHTML = `<span style="color: var(--text-muted);">Seleccione UPSS</span>`;
        servRateEl.textContent = 'S/. 0.0000';
        servParcialEl.textContent = 'S/. 0.000';
      }
    }

    // Factores Indirectos
    const ind = currentServ && currentServ.costos_indirectos ? currentServ.costos_indirectos : this.indirectosCatalogs.find(c => c.id === this.state.costos_indirectos_id);
    const adminDetailEl = document.getElementById('factor-admin-detail');
    const adminRateEl = document.getElementById('factor-admin-rate');
    const adminParcialEl = document.getElementById('factor-admin-parcial');

    const gralDetailEl = document.getElementById('factor-gral-detail');
    const gralRateEl = document.getElementById('factor-gral-rate');
    const gralParcialEl = document.getElementById('factor-gral-parcial');

    const indirectTotalEl = document.getElementById('factor-indirect-total');

    if (ind) {
      const upssLabel = `<strong>${ind.servicio}</strong> <small style="color: var(--text-muted);">(UPSS: ${ind.codigo_upss || '-'})</small>`;
      if (adminDetailEl) adminDetailEl.innerHTML = upssLabel;
      if (adminRateEl) adminRateEl.textContent = `S/. ${ind.costo_unit_admin.toFixed(4)}`;
      if (adminParcialEl) adminParcialEl.textContent = `S/. ${ind.costo_unit_admin.toFixed(3)}`;

      if (gralDetailEl) gralDetailEl.innerHTML = upssLabel;
      if (gralRateEl) gralRateEl.textContent = `S/. ${ind.costo_unit_generales.toFixed(4)}`;
      if (gralParcialEl) gralParcialEl.textContent = `S/. ${ind.costo_unit_generales.toFixed(3)}`;

      if (indirectTotalEl) {
        const totalInd = ind.costo_unit_admin + ind.costo_unit_generales;
        indirectTotalEl.textContent = `S/. ${totalInd.toFixed(3)}`;
      }
    } else {
      if (adminDetailEl) adminDetailEl.innerHTML = `<span style="color: var(--text-muted);">Seleccione UPSS</span>`;
      if (adminRateEl) adminRateEl.textContent = 'S/. 0.0000';
      if (adminParcialEl) adminParcialEl.textContent = 'S/. 0.000';

      if (gralDetailEl) gralDetailEl.innerHTML = `<span style="color: var(--text-muted);">Seleccione UPSS</span>`;
      if (gralRateEl) gralRateEl.textContent = 'S/. 0.0000';
      if (gralParcialEl) gralParcialEl.textContent = 'S/. 0.000';

      if (indirectTotalEl) indirectTotalEl.textContent = 'S/. 0.000';
    }
  },

  async onCpmsInput(val) {
    this.state.codigo_cpms = val;
    const box = document.getElementById('cpms-autocomplete-box');
    if (!val || val.length < 2) {
      box.style.display = 'none';
      return;
    }

    try {
      const res = await API.searchCPMS(val, 1, 8);
      if (!res.items || res.items.length === 0) {
        box.style.display = 'none';
        return;
      }

      box.innerHTML = res.items.map(item => `
        <div class="autocomplete-item" onclick="CostingStudioView.selectCPMS('${item.codigo}', '${item.denominacion.replace(/'/g, "\\'")}', '${item.seccion_nombre || ''}')">
          <span class="code">${item.codigo}</span>
          <span class="name">${item.denominacion}</span>
          <span class="meta">${item.seccion_nombre || ''} - ${item.subseccion_nombre || ''}</span>
        </div>
      `).join('');
      box.style.display = 'block';
    } catch (e) {
      console.error(e);
    }
  },

  selectCPMS(codigo, denominacion, seccion) {
    this.state.codigo_cpms = codigo;
    this.state.nombre_procedimiento = denominacion;
    document.getElementById('input-cpms-code').value = codigo;
    document.getElementById('input-proc-name').value = denominacion;
    document.getElementById('cpms-autocomplete-box').style.display = 'none';

    // Auto-match Service based on CPMS Section
    let targetService = null;
    const sec = seccion.toLowerCase();
    if (sec.includes('laboratorio') || sec.includes('patolog')) {
      targetService = this.servicesCatalog.find(s => s.ups.toLowerCase().includes('patologia') || s.nombre_servicio.toLowerCase().includes('bioquimica') || s.nombre_servicio.toLowerCase().includes('laboratorio'));
    } else if (sec.includes('imág') || sec.includes('radio') || sec.includes('mamograf') || sec.includes('ecograf')) {
      targetService = this.servicesCatalog.find(s => s.ups.toLowerCase().includes('imagen') || s.nombre_servicio.toLowerCase().includes('radiologia') || s.nombre_servicio.toLowerCase().includes('ecografia'));
    } else if (sec.includes('cirug') || sec.includes('quirurg')) {
      targetService = this.servicesCatalog.find(s => s.ups.toLowerCase().includes('quirurg') || s.nombre_servicio.toLowerCase().includes('cirugia'));
    } else if (sec.includes('emergenc')) {
      targetService = this.servicesCatalog.find(s => s.ups.toLowerCase().includes('emergencia'));
    }

    if (targetService) {
      this.onUPSSChange(targetService.id);
      document.getElementById('select-upss').value = targetService.id;
    }
  },

  onMarginInput(val) {
    const margin = (val === '' || val === null) ? 0 : parseFloat(val);
    this.state.margen_privados_pct = isNaN(margin) ? 0 : margin;
    const labelEl = document.getElementById('label-margen-pct');
    if (labelEl) labelEl.textContent = this.state.margen_privados_pct;
    this.recalculateLive();
  },

  renderActivities() {
    return this.state.fases.map((fase, fIdx) => `
      <div class="fase-accordion" id="fase-acc-${fIdx}">
        <div class="fase-header">
          <div class="fase-title-group">
            <div class="fase-badge-order">${fIdx + 1}</div>
            <div class="fase-title-text">
              <h4>${fase.nombre_fase || `Actividad ${fIdx + 1}`}</h4>
              <p>${fase.descripcion_actividad || 'Descripción de la actividad'}</p>
            </div>
          </div>
          <div class="fase-subtotals-badge">
            <span class="badge badge-slate" id="fase-badge-time-${fIdx}">${fase.tiempo_minutos} min</span>
            <span class="badge badge-primary" id="fase-badge-subtotal-${fIdx}">S/. 0.00</span>
            <button class="btn btn-danger btn-sm btn-icon" onclick="CostingStudioView.removeActivity(${fIdx})" title="Eliminar Actividad">
              ${Icons.trash}
            </button>
          </div>
        </div>

        <div class="fase-body">
          <!-- Configuración de la Actividad -->
          <div style="display: grid; grid-template-columns: 2fr 3fr 130px; gap: 0.75rem; margin-bottom: 0.5rem;">
            <div>
              <label class="form-label" style="font-size: 0.75rem;">Nombre de la Actividad</label>
              <input type="text" class="form-control" style="font-size: 0.85rem; padding: 0.4rem 0.6rem;" value="${fase.nombre_fase || `Actividad ${fIdx + 1}`}" oninput="CostingStudioView.state.fases[${fIdx}].nombre_fase = this.value; CostingStudioView.persistDraft();">
            </div>
            <div>
              <label class="form-label" style="font-size: 0.75rem;">Descripción del Trabajo / Acción</label>
              <input type="text" class="form-control" style="font-size: 0.85rem; padding: 0.4rem 0.6rem;" placeholder="Ej: Toma de muestra, lectura de lámina, entrega..." value="${fase.descripcion_actividad || ''}" oninput="CostingStudioView.state.fases[${fIdx}].descripcion_actividad = this.value; CostingStudioView.persistDraft();">
            </div>
            <div>
              <label class="form-label" style="font-size: 0.75rem;">Tiempo (minutos)</label>
              <input type="number" class="form-control" style="font-size: 0.85rem; padding: 0.4rem 0.6rem;" value="${fase.tiempo_minutos}" min="0" step="0.5" oninput="CostingStudioView.onActivityTimeChange(${fIdx}, this.value)">
            </div>
          </div>

          <!-- Factor 1: RRHH -->
          <div class="factor-section">
            <div class="factor-header">
              <span class="factor-title">${Icons.users} Personal Asignado (RRHH)</span>
              <button class="btn btn-secondary btn-sm" onclick="CostingStudioView.openAddRRHHModal(${fIdx})">
                ${Icons.plus} Asignar Personal
              </button>
            </div>
            <div id="fase-${fIdx}-rrhh-list">
              ${this.renderRRHHList(fase.rrhh_items, fIdx)}
            </div>
          </div>

          <!-- Factor 2: Insumos Fungibles y No Fungibles -->
          <div class="factor-section">
            <div class="factor-header">
              <span class="factor-title">${Icons.box} Insumos y Materiales</span>
              <button class="btn btn-secondary btn-sm" onclick="CostingStudioView.openAddInsumoModal(${fIdx})">
                ${Icons.plus} Agregar Insumo
              </button>
            </div>
            <div id="fase-${fIdx}-insumos-list">
              ${this.renderInsumosList(fase.insumo_items, fIdx)}
            </div>
          </div>

          <!-- Factor 3: Equipamiento y Mobiliario -->
          <div class="factor-section">
            <div class="factor-header">
              <span class="factor-title">${Icons.monitor} Equipamiento y Mobiliario</span>
              <button class="btn btn-secondary btn-sm" onclick="CostingStudioView.openAddEquipoModal(${fIdx})">
                ${Icons.plus} Agregar Equipo
              </button>
            </div>
            <div id="fase-${fIdx}-equipos-list">
              ${this.renderEquiposList(fase.equipo_items, fIdx)}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  renderRRHHList(items, fIdx) {
    if (!items || items.length === 0) {
      return `<p style="font-size: 0.78rem; color: var(--text-light); padding: 0.25rem 0;">No hay personal asignado a esta actividad. Haz clic en "Asignar Personal".</p>`;
    }
    return `
      <table class="data-table" style="font-size: 0.8rem;">
        <thead>
          <tr>
            <th>Cargo / Grupo Ocupacional</th>
            <th style="width: 90px;">Tiempo (min)</th>
            <th style="width: 80px;">Cantidad</th>
            <th style="width: 110px;">Costo Minuto</th>
            <th style="width: 100px;">Costo Parcial</th>
            <th style="width: 40px;"></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((r, rIdx) => `
            <tr>
              <td><strong>${r.grupo_ocupacional}</strong></td>
              <td><input type="number" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" value="${r.tiempo_minutos}" min="0" step="0.5" oninput="CostingStudioView.updateRRHHItem(${fIdx}, ${rIdx}, 'tiempo_minutos', this.value)"></td>
              <td><input type="number" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" value="${r.cantidad}" min="1" oninput="CostingStudioView.updateRRHHItem(${fIdx}, ${rIdx}, 'cantidad', this.value)"></td>
              <td>S/. ${r.costo_unitario.toFixed(3)}</td>
              <td><strong style="color: var(--primary);">S/. ${(r.tiempo_minutos * r.cantidad * r.costo_unitario).toFixed(3)}</strong></td>
              <td>
                <button class="btn btn-danger btn-sm btn-icon" onclick="CostingStudioView.removeRRHHItem(${fIdx}, ${rIdx})" title="Quitar">${Icons.x}</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  renderInsumosList(items, fIdx) {
    if (!items || items.length === 0) {
      return `<p style="font-size: 0.78rem; color: var(--text-light); padding: 0.25rem 0;">No hay insumos agregados a esta actividad. Haz clic en "Agregar Insumo".</p>`;
    }
    return `
      <table class="data-table" style="font-size: 0.8rem;">
        <thead>
          <tr>
            <th>Descripción</th>
            <th style="width: 100px;">Tipo</th>
            <th style="width: 80px;">U. Medida</th>
            <th style="width: 80px;">Tiempo (min)</th>
            <th style="width: 80px;">Cantidad</th>
            <th style="width: 110px;">Costo Base</th>
            <th style="width: 100px;">Costo Parcial</th>
            <th style="width: 40px;"></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((ins, iIdx) => {
            const isNoFungible = ins.tipo_insumo === 'NO_FUNGIBLE' || (ins.costo_minuto && ins.costo_minuto > 0);
            const rate = (ins.costo_minuto && ins.costo_minuto > 0) ? ins.costo_minuto : ins.costo_unitario;
            const parcial = isNoFungible && ins.tiempo_minutos > 0 ? (ins.tiempo_minutos * ins.cantidad * rate) : (ins.cantidad * ins.costo_unitario);
            const uCons = ins.unidad_consumo || ins.unidad_medida || 'UNIDAD';
            return `
              <tr>
                <td>
                  ${ins.codigo_siga ? `<span class="badge badge-primary" style="font-size: 0.65rem; margin-right: 4px;">SIGA: ${ins.codigo_siga}</span>` : ''}
                  <strong>${ins.descripcion}</strong>
                </td>
                <td><span class="badge ${isNoFungible ? 'badge-warning' : 'badge-info'}" style="font-size: 0.7rem;">${ins.tipo_insumo || 'FUNGIBLE'}</span></td>
                <td><strong>${uCons}</strong></td>
                <td>
                  ${isNoFungible ? `
                    <input type="number" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" value="${ins.tiempo_minutos || 0}" min="0" step="0.5" oninput="CostingStudioView.updateInsumoItem(${fIdx}, ${iIdx}, 'tiempo_minutos', this.value)" title="Tiempo de uso en minutos">
                  ` : `<span style="color: var(--text-light);">-</span>`}
                </td>
                <td>
                  <input type="number" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" value="${ins.cantidad || 1}" min="0.001" step="0.001" oninput="CostingStudioView.updateInsumoItem(${fIdx}, ${iIdx}, 'cantidad', this.value)" title="Cantidad consumida">
                </td>
                <td>
                  ${(ins.costo_minuto && ins.costo_minuto > 0) ? `S/. ${ins.costo_minuto.toFixed(3)}/min` : `S/. ${ins.costo_unitario.toFixed(3)}/${uCons}`}
                </td>
                <td><strong style="color: var(--primary);">S/. ${parcial.toFixed(3)}</strong></td>
                <td>
                  <button class="btn btn-danger btn-sm btn-icon" onclick="CostingStudioView.removeInsumoItem(${fIdx}, ${iIdx})" title="Quitar">${Icons.x}</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  renderEquiposList(items, fIdx) {
    if (!items || items.length === 0) {
      return `<p style="font-size: 0.78rem; color: var(--text-light); padding: 0.25rem 0;">No hay equipamiento asignado a esta actividad. Haz clic en "Agregar Equipo".</p>`;
    }
    return `
      <table class="data-table" style="font-size: 0.8rem;">
        <thead>
          <tr>
            <th>Descripción del Equipo</th>
            <th style="width: 90px;">Tiempo (min)</th>
            <th style="width: 80px;">Cantidad</th>
            <th style="width: 110px;">Costo Minuto</th>
            <th style="width: 100px;">Costo Parcial</th>
            <th style="width: 40px;"></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((eq, eIdx) => `
            <tr>
              <td><strong>${eq.descripcion}</strong></td>
              <td><input type="number" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" value="${eq.tiempo_minutos}" min="0" step="0.5" oninput="CostingStudioView.updateEquipoItem(${fIdx}, ${eIdx}, 'tiempo_minutos', this.value)"></td>
              <td><input type="number" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" value="${eq.cantidad}" min="1" oninput="CostingStudioView.updateEquipoItem(${fIdx}, ${eIdx}, 'cantidad', this.value)"></td>
              <td>S/. ${eq.costo_unitario.toFixed(3)}</td>
              <td><strong style="color: var(--primary);">S/. ${(eq.tiempo_minutos * eq.cantidad * eq.costo_unitario).toFixed(3)}</strong></td>
              <td>
                <button class="btn btn-danger btn-sm btn-icon" onclick="CostingStudioView.removeEquipoItem(${fIdx}, ${eIdx})" title="Quitar">${Icons.x}</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  onActivityTimeChange(fIdx, val) {
    this.state.fases[fIdx].tiempo_minutos = parseFloat(val) || 0;
    this.recalculateLive();
  },

  updateRRHHItem(fIdx, rIdx, field, val) {
    this.state.fases[fIdx].rrhh_items[rIdx][field] = parseFloat(val) || 0;
    this.recalculateLive();
  },

  removeRRHHItem(fIdx, rIdx) {
    this.state.fases[fIdx].rrhh_items.splice(rIdx, 1);
    this.refreshFaseLists(fIdx);
    this.recalculateLive();
  },

  updateInsumoItem(fIdx, iIdx, field, val) {
    this.state.fases[fIdx].insumo_items[iIdx][field] = parseFloat(val) || 0;
    this.recalculateLive();
  },

  removeInsumoItem(fIdx, iIdx) {
    this.state.fases[fIdx].insumo_items.splice(iIdx, 1);
    this.refreshFaseLists(fIdx);
    this.recalculateLive();
  },

  updateEquipoItem(fIdx, eIdx, field, val) {
    this.state.fases[fIdx].equipo_items[eIdx][field] = parseFloat(val) || 0;
    this.recalculateLive();
  },

  removeEquipoItem(fIdx, eIdx) {
    this.state.fases[fIdx].equipo_items.splice(eIdx, 1);
    this.refreshFaseLists(fIdx);
    this.recalculateLive();
  },

  refreshFaseLists(fIdx) {
    const fase = this.state.fases[fIdx];
    document.getElementById(`fase-${fIdx}-rrhh-list`).innerHTML = this.renderRRHHList(fase.rrhh_items, fIdx);
    document.getElementById(`fase-${fIdx}-insumos-list`).innerHTML = this.renderInsumosList(fase.insumo_items, fIdx);
    document.getElementById(`fase-${fIdx}-equipos-list`).innerHTML = this.renderEquiposList(fase.equipo_items, fIdx);
  },

  addActivity() {
    const nextOrder = this.state.fases.length + 1;
    this.state.fases.push({
      nombre_fase: `Actividad ${nextOrder}`,
      descripcion_actividad: '',
      orden: nextOrder,
      tiempo_minutos: 5.0,
      rrhh_items: [],
      insumo_items: [],
      equipo_items: []
    });
    document.getElementById('fases-container').innerHTML = this.renderActivities();
    const countEl = document.getElementById('actividades-count');
    if (countEl) countEl.textContent = this.state.fases.length;
    this.recalculateLive();
  },

  removeActivity(fIdx) {
    if (this.state.fases.length <= 1) {
      Toast.warning('El procedimiento debe tener al menos una actividad');
      return;
    }
    this.state.fases.splice(fIdx, 1);
    document.getElementById('fases-container').innerHTML = this.renderActivities();
    const countEl = document.getElementById('actividades-count');
    if (countEl) countEl.textContent = this.state.fases.length;
    this.recalculateLive();
  },

  persistDraft() {
    try {
      localStorage.setItem('costeo_studio_draft_state', JSON.stringify(this.state));
      localStorage.setItem('costeo_studio_draft_id', this.currentCostingId ? String(this.currentCostingId) : '');
      this.lastSavedTime = new Date();
      this.updateAutoSaveIndicator();
    } catch (e) {
      console.warn('No se pudo guardar borrador en localStorage:', e);
    }
  },

  updateAutoSaveIndicator() {
    const el = document.getElementById('autosave-indicator');
    if (el) {
      const timeStr = this.lastSavedTime ? this.lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'reciente';
      el.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #047857; font-size: 0.75rem; background: #ecfdf5; padding: 0.2rem 0.6rem; border-radius: 9999px; border: 1px solid #a7f3d0;" title="Los cambios se guardan localmente para que nunca pierdas tu avance">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
          Auto-guardado (${timeStr})
        </span>
      `;
    }
  },

  checkAndLoadDraft(costingId) {
    if (costingId) return false;
    const rawDraft = localStorage.getItem('costeo_studio_draft_state');
    const rawId = localStorage.getItem('costeo_studio_draft_id');
    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft);
        if (parsed && (parsed.codigo_cpms || parsed.nombre_procedimiento || (parsed.fases && parsed.fases.length > 0 && (parsed.fases[0].rrhh_items?.length || parsed.fases[0].insumo_items?.length || parsed.fases[0].equipo_items?.length)))) {
          this.state = parsed;
          this.currentCostingId = rawId ? parseInt(rawId) : null;
          this.hasUnsavedDraft = true;
          return true;
        }
      } catch (e) {
        console.error('Error parseando borrador:', e);
      }
    }
    return false;
  },

  clearDraft(confirmPrompt = true) {
    if (confirmPrompt && !confirm('¿Deseas descartar los cambios no guardados y comenzar una nueva hoja de costeo en blanco?')) {
      return;
    }
    localStorage.removeItem('costeo_studio_draft_state');
    localStorage.removeItem('costeo_studio_draft_id');
    this.hasUnsavedDraft = false;
    this.currentCostingId = null;
    this.resetState();
    if (App.contentEl && App.currentView === 'studio') {
      this.render(App.contentEl, null);
    }
    Toast.info('Se inició una nueva hoja de costeo en blanco');
  },

  recalculateLive() {
    this.persistDraft();
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      try {
        const computed = await API.calculateCostingLive(this.state);
        this.liveCalculated = computed;

        document.getElementById('live-total-price').textContent = `S/. ${computed.costo_total_estandar.toFixed(3)}`;
        document.getElementById('live-total-time').textContent = `Tiempo Total: ${computed.tiempo_total_minutos} minutos`;

        document.getElementById('live-subtotal-rrhh').textContent = `S/. ${computed.costo_rrhh.toFixed(3)}`;
        document.getElementById('live-subtotal-insumos').textContent = `S/. ${computed.costo_insumos.toFixed(3)}`;
        document.getElementById('live-subtotal-equipos').textContent = `S/. ${computed.costo_equipos.toFixed(3)}`;
        document.getElementById('live-subtotal-infra').textContent = `S/. ${computed.costo_infraestructura.toFixed(3)}`;
        document.getElementById('live-subtotal-serv').textContent = `S/. ${computed.costo_servicios.toFixed(3)}`;
        document.getElementById('live-total-direct').textContent = `S/. ${computed.costo_directo.toFixed(3)}`;

        document.getElementById('live-subtotal-admin').textContent = `S/. ${computed.gastos_admin.toFixed(3)}`;
        document.getElementById('live-subtotal-grales').textContent = `S/. ${computed.gastos_generales.toFixed(3)}`;
        document.getElementById('live-total-indirect').textContent = `S/. ${computed.costo_indirecto.toFixed(3)}`;

        document.getElementById('live-tarifa-tr').textContent = `S/. ${computed.tarifa_referencial.toFixed(3)}`;
        document.getElementById('live-tarifa-tpu').textContent = `S/. ${computed.tarifa_no_asegurados.toFixed(3)}`;
        document.getElementById('live-tarifa-sis').textContent = `S/. ${computed.tarifa_sis.toFixed(3)}`;
        document.getElementById('live-tarifa-priv').textContent = `S/. ${computed.tarifa_privados.toFixed(3)}`;

        // Actualizar Tabla de Factores UPSS (Infraestructura y Servicios Básicos)
        const totalTime = computed.tiempo_total_minutos || 0;
        const infraTimeEl = document.getElementById('factor-infra-time');
        const infraParcialEl = document.getElementById('factor-infra-parcial');
        const factorsSubtotalEl = document.getElementById('factor-factors-subtotal');

        if (infraTimeEl) infraTimeEl.textContent = `${totalTime} min`;
        if (infraParcialEl) infraParcialEl.textContent = `S/. ${computed.costo_infraestructura.toFixed(3)}`;
        if (factorsSubtotalEl) {
          const subtotalFactors = computed.costo_infraestructura + computed.costo_servicios;
          factorsSubtotalEl.textContent = `S/. ${subtotalFactors.toFixed(3)}`;
        }

        // Actualizar Tabla de Factores Indirectos
        const adminParcialEl = document.getElementById('factor-admin-parcial');
        const gralParcialEl = document.getElementById('factor-gral-parcial');
        const indirectTotalEl = document.getElementById('factor-indirect-total');

        if (adminParcialEl) adminParcialEl.textContent = `S/. ${computed.gastos_admin.toFixed(3)}`;
        if (gralParcialEl) gralParcialEl.textContent = `S/. ${computed.gastos_generales.toFixed(3)}`;
        if (indirectTotalEl) indirectTotalEl.textContent = `S/. ${computed.costo_indirecto.toFixed(3)}`;

        computed.fases.forEach((f, idx) => {
          const badgeTime = document.getElementById(`fase-badge-time-${idx}`);
          const badgeSub = document.getElementById(`fase-badge-subtotal-${idx}`);
          if (badgeTime) badgeTime.textContent = `${f.tiempo_minutos} min`;
          if (badgeSub) badgeSub.textContent = `S/. ${f.subtotal_fase.toFixed(3)}`;
        });
      } catch (e) {
        console.error('Error calculando costos en vivo:', e);
      }
    }, 150);
  },

  // Modal de Personal (RRHH)
  openAddRRHHModal(fIdx) {
    const options = this.rrhhCatalog.map(r => `
      <option value="${r.id}" data-cost="${r.costo_minuto}" data-name="${r.grupo_ocupacional}">
        ${r.grupo_ocupacional} (${r.codigo_costeo || 'CRHM'}) — S/. ${r.costo_minuto.toFixed(3)} / min (Sueldo: S/. ${r.pago_mensual.toFixed(3)})
      </option>
    `).join('');

    Modal.open({
      title: `Asignar Personal a ${this.state.fases[fIdx].nombre_fase || 'Actividad'}`,
      contentHtml: `
        <div class="form-group">
          <label class="form-label">Filtrar / Buscar Cargo</label>
          <div class="search-input-wrap">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="filter-rrhh-input" class="form-control" placeholder="Escribe para filtrar (ej. Biólogo, Técnico, Médico...)" oninput="CostingStudioView.filterRRHHSelect(this.value)">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Seleccionar Grupo Ocupacional (*)</label>
          <select id="modal-select-rrhh" class="form-select" size="6" style="height: 160px;">
            <option value="" disabled>-- SELECCIONE UN CARGO --</option>
            ${options}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Tiempo de Participación (min)</label>
            <input type="number" id="modal-rrhh-time" class="form-control" value="${this.state.fases[fIdx].tiempo_minutos || 5}" min="0.1" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Cantidad de Personas</label>
            <input type="number" id="modal-rrhh-qty" class="form-control" value="1" min="1">
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Asignar Personal',
          class: 'btn-primary',
          icon: Icons.plus,
          onClick: (e, m) => {
            const select = document.getElementById('modal-select-rrhh');
            if (select.selectedIndex < 0 || !select.value) {
              Toast.warning('Por favor selecciona un cargo de la lista');
              return;
            }
            const opt = select.options[select.selectedIndex];
            const rrhhId = parseInt(select.value);
            const name = opt.getAttribute('data-name');
            const cost = parseFloat(opt.getAttribute('data-cost')) || 0;
            const time = parseFloat(document.getElementById('modal-rrhh-time').value) || 0;
            const qty = parseFloat(document.getElementById('modal-rrhh-qty').value) || 1;

            const rrhhObj = this.rrhhCatalog.find(r => r.id === rrhhId);

            this.state.fases[fIdx].rrhh_items.push({
              rrhh_id: rrhhId,
              codigo_costeo: rrhhObj ? rrhhObj.codigo_costeo : 'CRHM',
              grupo_ocupacional: name,
              tiempo_minutos: time,
              cantidad: qty,
              costo_unitario: cost,
              costo_parcial: time * qty * cost
            });

            this.refreshFaseLists(fIdx);
            this.recalculateLive();
            m.close();
            Toast.success(`Personal asignado a la actividad`);
          }
        }
      ]
    });
  },

  filterRRHHSelect(query) {
    const select = document.getElementById('modal-select-rrhh');
    if (!select) return;
    const q = query.toLowerCase();
    const filtered = this.rrhhCatalog.filter(r => r.grupo_ocupacional.toLowerCase().includes(q) || (r.codigo_costeo && r.codigo_costeo.toLowerCase().includes(q)));

    select.innerHTML = `<option value="" disabled>-- SELECCIONE UN CARGO --</option>` + filtered.map(r => `
      <option value="${r.id}" data-cost="${r.costo_minuto}" data-name="${r.grupo_ocupacional}">
        ${r.grupo_ocupacional} (${r.codigo_costeo || 'CRHM'}) — S/. ${r.costo_minuto.toFixed(3)} / min (Sueldo: S/. ${r.pago_mensual.toFixed(3)})
      </option>
    `).join('');
  },

  openAddInsumoModal(fIdx) {
    Modal.open({
      title: 'Agregar Insumo o Material',
      contentHtml: `
        <div class="form-group autocomplete-container">
          <label class="form-label">Buscar Insumo en Catálogo (3,180+ registros Base + SIGA MEF)</label>
          <div class="search-input-wrap">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="modal-insumo-search" class="form-control" placeholder="Escribe descripción, código SIGA (11 dígitos) o código costeo..." autocomplete="off" oninput="CostingStudioView.onInsumoSearch(this.value)">
          </div>
          <div id="modal-insumo-dropdown" class="autocomplete-dropdown" style="display: none;"></div>
        </div>

        <div id="modal-insumo-selected-box" style="display: none; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <strong id="modal-insumo-desc" style="color: var(--primary-dark); font-size: 0.9rem;"></strong>
            <span id="modal-insumo-origen-badge"></span>
          </div>
          <div style="display: flex; gap: 1rem; font-size: 0.78rem; margin-top: 0.35rem; color: var(--text-muted); flex-wrap: wrap;">
            <span>Cód. Ref: <strong id="modal-insumo-cod"></strong></span>
            <span id="modal-insumo-siga-wrap" style="display: none;">Cód. SIGA: <strong id="modal-insumo-siga-code" style="color: #2563eb;"></strong></span>
            <span>U. Consumo: <strong id="modal-insumo-um"></strong></span>
            <span>Costo Unitario: <strong id="modal-insumo-cost" style="color: var(--primary);"></strong></span>
            <span id="modal-insumo-siga-price-wrap" style="display: none;">Precio SIGA: <strong id="modal-insumo-siga-cost" style="color: #2563eb;"></strong></span>
            <span id="modal-insumo-cost-min-wrap" style="display: none;">Costo x Min: <strong id="modal-insumo-cost-min" style="color: var(--accent);"></strong></span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Tipo de Insumo</label>
            <select id="modal-insumo-tipo" class="form-select" onchange="CostingStudioView.toggleInsumoTipo(this.value)">
              <option value="FUNGIBLE" selected>Fungible</option>
              <option value="NO_FUNGIBLE">No Fungible</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Cantidad</label>
            <input type="number" id="modal-insumo-qty" class="form-control" value="1" min="0.001" step="0.001">
          </div>
          <div class="form-group" id="group-insumo-time" style="display: none;">
            <label class="form-label">Tiempo Uso (min)</label>
            <input type="number" id="modal-insumo-time" class="form-control" value="${this.state.fases[fIdx].tiempo_minutos || 5}" min="0.1" step="0.5">
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Agregar Insumo',
          class: 'btn-primary',
          icon: Icons.plus,
          onClick: (e, m) => {
            if (!this.selectedInsumoTemp) {
              Toast.warning('Por favor selecciona un insumo del buscador');
              return;
            }
            const item = this.selectedInsumoTemp;
            const tipo = document.getElementById('modal-insumo-tipo').value || item.tipo || 'FUNGIBLE';
            const qty = parseFloat(document.getElementById('modal-insumo-qty').value) || 1;
            const time = parseFloat(document.getElementById('modal-insumo-time').value) || 0;
            const isNoFung = tipo === 'NO_FUNGIBLE' || (item.costo_minuto && item.costo_minuto > 0);
            const rate = (item.costo_minuto && item.costo_minuto > 0) ? item.costo_minuto : item.costo_unitario;
            const parcial = isNoFung && time > 0 ? (time * qty * rate) : (qty * item.costo_unitario);

            this.state.fases[fIdx].insumo_items.push({
              insumo_id: item.id,
              codigo_costeo: item.codigo_costeo,
              codigo_usado: item.codigo_usado,
              codigo_siga: item.codigo_siga,
              descripcion: item.descripcion,
              tipo_insumo: tipo,
              unidad_medida: item.unidad_medida,
              unidad_consumo: item.unidad_consumo || item.unidad_medida || 'UNIDAD',
              tiempo_minutos: isNoFung ? time : 0,
              cantidad: qty,
              costo_unitario: item.costo_unitario,
              costo_minuto: item.costo_minuto || 0,
              costo_parcial: parcial
            });

            this.selectedInsumoTemp = null;
            this.refreshFaseLists(fIdx);
            this.recalculateLive();
            m.close();
            Toast.success('Insumo agregado a la actividad');
          }
        }
      ]
    });
  },

  selectedInsumoTemp: null,

  async onInsumoSearch(val) {
    const box = document.getElementById('modal-insumo-dropdown');
    if (!val || val.length < 2) {
      box.style.display = 'none';
      return;
    }

    try {
      const res = await API.getInsumos(val, '', '', 1, 20);
      if (!res.items || res.items.length === 0) {
        box.style.display = 'none';
        return;
      }

      this._insumosSearchResultMap = {};
      res.items.forEach(it => { this._insumosSearchResultMap[it.id] = it; });

      box.innerHTML = res.items.map(item => {
        const uCons = item.unidad_consumo || item.unidad_medida || 'UNIDAD';
        const costStr = (item.costo_minuto && item.costo_minuto > 0)
          ? `S/. ${item.costo_minuto.toFixed(3)}/min`
          : `S/. ${item.costo_unitario.toFixed(3)} / ${uCons}`;
        
        let origenBadge = '';
        if (item.origen === 'FUSIONADO') origenBadge = '<span class="badge badge-success" style="font-size: 0.68rem; margin-left: 4px;">⚡ SIGA</span>';
        else if (item.origen === 'SIGA') origenBadge = '<span class="badge badge-primary" style="font-size: 0.68rem; margin-left: 4px;">📦 SIGA</span>';

        const codeText = item.codigo_siga ? `SIGA: ${item.codigo_siga}` : (item.codigo_usado || item.codigo_costeo || 'CUI');

        return `
          <div class="autocomplete-item" onclick="CostingStudioView.selectInsumoModalById(${item.id})">
            <span class="code">${codeText}</span>
            <span class="name">${item.descripcion} ${origenBadge}</span>
            <span class="meta">${uCons} | ${costStr} ${item.precio_siga && item.precio_siga > 0 ? `| SIGA: S/. ${item.precio_siga.toFixed(3)}` : ''}</span>
          </div>
        `;
      }).join('');
      box.style.display = 'block';
    } catch (e) {
      console.error(e);
    }
  },

  selectInsumoModalById(itemId) {
    const item = this._insumosSearchResultMap ? this._insumosSearchResultMap[itemId] : null;
    if (!item) return;
    this.selectInsumoModal(item);
  },

  selectInsumoModal(item) {
    this.selectedInsumoTemp = item;
    document.getElementById('modal-insumo-dropdown').style.display = 'none';
    document.getElementById('modal-insumo-search').value = item.descripcion;

    const box = document.getElementById('modal-insumo-selected-box');
    box.style.display = 'block';
    document.getElementById('modal-insumo-desc').textContent = item.descripcion;
    document.getElementById('modal-insumo-cod').textContent = item.codigo_usado || item.codigo_costeo || 'CUI';
    
    const sigaWrap = document.getElementById('modal-insumo-siga-wrap');
    if (item.codigo_siga) {
      sigaWrap.style.display = 'inline';
      document.getElementById('modal-insumo-siga-code').textContent = item.codigo_siga;
    } else {
      sigaWrap.style.display = 'none';
    }

    const origenBadgeEl = document.getElementById('modal-insumo-origen-badge');
    if (item.origen === 'FUSIONADO') origenBadgeEl.innerHTML = '<span class="badge badge-success">⚡ Fusionado con SIGA</span>';
    else if (item.origen === 'SIGA') origenBadgeEl.innerHTML = '<span class="badge badge-primary">📦 Catálogo SIGA</span>';
    else origenBadgeEl.innerHTML = '<span class="badge badge-slate">Catálogo Base</span>';

    const uCons = item.unidad_consumo || item.unidad_medida || 'UNIDAD';
    document.getElementById('modal-insumo-um').textContent = uCons;
    document.getElementById('modal-insumo-cost').textContent = `S/. ${item.costo_unitario.toFixed(3)}`;

    const sigaPriceWrap = document.getElementById('modal-insumo-siga-price-wrap');
    if (item.precio_siga && item.precio_siga > 0) {
      sigaPriceWrap.style.display = 'inline';
      document.getElementById('modal-insumo-siga-cost').textContent = `S/. ${item.precio_siga.toFixed(3)}`;
    } else {
      sigaPriceWrap.style.display = 'none';
    }

    const costMinWrap = document.getElementById('modal-insumo-cost-min-wrap');
    const costMinEl = document.getElementById('modal-insumo-cost-min');
    const tipoSelect = document.getElementById('modal-insumo-tipo');

    if (item.costo_minuto && item.costo_minuto > 0) {
      costMinWrap.style.display = 'inline';
      costMinEl.textContent = `S/. ${item.costo_minuto.toFixed(3)} / min`;
      tipoSelect.value = item.tipo || 'NO_FUNGIBLE';
      document.getElementById('group-insumo-time').style.display = 'block';
    } else if (item.tipo === 'NO_FUNGIBLE' || uCons === 'MINUTO') {
      costMinWrap.style.display = 'none';
      tipoSelect.value = 'NO_FUNGIBLE';
      document.getElementById('group-insumo-time').style.display = 'block';
    } else {
      costMinWrap.style.display = 'none';
      tipoSelect.value = 'FUNGIBLE';
      document.getElementById('group-insumo-time').style.display = 'none';
    }
  },

  toggleInsumoTipo(tipo) {
    document.getElementById('group-insumo-time').style.display = tipo === 'NO_FUNGIBLE' ? 'block' : 'none';
  },

  openAddEquipoModal(fIdx) {
    const currentServ = this.servicesCatalog.find(s => s.id === this.state.servicio_id);
    const servName = currentServ ? `${currentServ.nombre_servicio} (${currentServ.ups})` : (this.state.upss_servicio || 'General');

    Modal.open({
      title: 'Agregar Equipamiento o Mobiliario',
      contentHtml: `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; background: var(--color-primary-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="font-size: 0.8rem; color: var(--color-primary);">
            <span>Área: <strong>${servName}</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <label style="font-size: 0.78rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; color: var(--color-primary-hover);">
              <input type="checkbox" id="modal-equipo-filter-check" ${this.filterEquipmentByService ? 'checked' : ''} onchange="CostingStudioView.toggleEquipmentFilter(this.checked)">
              Filtrar por este Servicio
            </label>
          </div>
        </div>

        <div class="form-group autocomplete-container">
          <label class="form-label">Buscar en Catálogo de Equipos y Mobiliario</label>
          <div class="search-input-wrap">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="modal-equipo-search" class="form-control" placeholder="Escribe nombre del equipo o activo..." autocomplete="off" oninput="CostingStudioView.onEquipoSearch(this.value)">
          </div>
          <div id="modal-equipo-dropdown" class="autocomplete-dropdown" style="display: none;"></div>
        </div>

        <div id="modal-equipo-selected-box" style="display: none; background: var(--color-accent-surface); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 1rem; border: 1px solid var(--color-accent);">
          <strong id="modal-equipo-desc" style="color: var(--color-accent-hover); font-size: 0.85rem;"></strong>
          <div style="display: flex; gap: 1rem; font-size: 0.78rem; margin-top: 0.2rem; color: var(--text-muted); flex-wrap: wrap;">
            <span>Código: <strong id="modal-equipo-cod"></strong></span>
            <span>Tipo: <strong id="modal-equipo-tipo"></strong></span>
            <span>Centro de Costos: <strong id="modal-equipo-cc"></strong></span>
            <span>Costo Minuto: <strong id="modal-equipo-cost" style="color: var(--color-primary);"></strong></span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Tiempo de Uso del Equipo (min)</label>
            <input type="number" id="modal-equipo-time" class="form-control" value="${this.state.fases[fIdx].tiempo_minutos || 5}" min="0.1" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Cantidad de Unidades</label>
            <input type="number" id="modal-equipo-qty" class="form-control" value="1" min="1">
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Agregar Equipo',
          class: 'btn-primary',
          icon: Icons.plus,
          onClick: (e, m) => {
            if (!this.selectedEquipoTemp) {
              Toast.warning('Por favor selecciona un equipo del buscador');
              return;
            }
            const time = parseFloat(document.getElementById('modal-equipo-time').value) || 0;
            const qty = parseFloat(document.getElementById('modal-equipo-qty').value) || 1;

            this.state.fases[fIdx].equipo_items.push({
              equipo_id: this.selectedEquipoTemp.id,
              codigo_costeo: this.selectedEquipoTemp.codigo_costeo,
              codigo_margesi: this.selectedEquipoTemp.codigo_margesi,
              descripcion: this.selectedEquipoTemp.descripcion,
              tipo_equipamiento: this.selectedEquipoTemp.tipo_equipamiento || 'Equipo',
              tiempo_minutos: time,
              cantidad: qty,
              costo_unitario: this.selectedEquipoTemp.costo_minuto,
              costo_parcial: time * qty * this.selectedEquipoTemp.costo_minuto
            });

            this.selectedEquipoTemp = null;
            this.refreshFaseLists(fIdx);
            this.recalculateLive();
            m.close();
            Toast.success('Equipo agregado a la actividad');
          }
        }
      ]
    });
  },

  toggleEquipmentFilter(checked) {
    this.filterEquipmentByService = !!checked;
    const input = document.getElementById('modal-equipo-search');
    if (input && input.value) {
      this.onEquipoSearch(input.value);
    }
  },

  selectedEquipoTemp: null,

  async onEquipoSearch(val) {
    const box = document.getElementById('modal-equipo-dropdown');
    if (!val || val.length < 2) {
      box.style.display = 'none';
      return;
    }

    try {
      const servId = this.filterEquipmentByService ? this.state.servicio_id : null;
      const res = await API.getEquipamiento(val, '', 1, 15, servId);
      if (!res.items || res.items.length === 0) {
        box.innerHTML = `<div style="padding: 0.75rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">No se encontraron equipos${servId ? ' en este servicio' : ''}. ${servId ? '<a href="javascript:void(0)" onclick="CostingStudioView.toggleEquipmentFilter(false); document.getElementById(\'modal-equipo-filter-check\').checked=false;">Buscar en todos los equipos</a>' : ''}</div>`;
        box.style.display = 'block';
        return;
      }

      box.innerHTML = res.items.map(item => `
        <div class="autocomplete-item" onclick='CostingStudioView.selectEquipoModal(${JSON.stringify(item)})'>
          <span class="code">${item.codigo_costeo || item.codigo_margesi || 'CDEM'}</span>
          <span class="name">${item.descripcion}</span>
          <span class="meta">${item.tipo_equipamiento || 'Equipo'} | ${item.centro_costos || 'Sin CC'} | S/. ${item.costo_minuto.toFixed(3)} / min</span>
        </div>
      `).join('');
      box.style.display = 'block';
    } catch (e) {
      console.error(e);
    }
  },

  selectEquipoModal(item) {
    this.selectedEquipoTemp = item;
    document.getElementById('modal-equipo-dropdown').style.display = 'none';
    document.getElementById('modal-equipo-search').value = item.descripcion;

    const box = document.getElementById('modal-equipo-selected-box');
    box.style.display = 'block';
    document.getElementById('modal-equipo-desc').textContent = item.descripcion;
    document.getElementById('modal-equipo-cod').textContent = item.codigo_costeo || item.codigo_margesi || 'CDEM';
    document.getElementById('modal-equipo-tipo').textContent = item.tipo_equipamiento || 'Equipo';
    const ccEl = document.getElementById('modal-equipo-cc');
    if (ccEl) ccEl.textContent = item.centro_costos || 'N/A';
    document.getElementById('modal-equipo-cost').textContent = `S/. ${item.costo_minuto.toFixed(3)} / min`;
  },

  async saveCosting() {
    if (!this.state.codigo_cpms || !this.state.nombre_procedimiento) {
      Toast.error('Por favor ingresa el Código CPMS y Nombre del Procedimiento');
      return;
    }

    try {
      const saved = await API.saveCosting(this.state, this.currentCostingId);
      this.currentCostingId = saved.id;
      this.hasUnsavedDraft = false;
      localStorage.removeItem('costeo_studio_draft_state');
      localStorage.removeItem('costeo_studio_draft_id');
      Toast.success('¡Hoja de Costeo guardada exitosamente en la base de datos!');
      App.navigate('sheets');
    } catch (e) {
      console.error(e);
      Toast.error(`Error al guardar: ${e.message}`);
    }
  },

  async cloneCurrent() {
    if (!this.currentCostingId) return;
    try {
      const cloned = await API.cloneCosting(this.currentCostingId);
      Toast.success('Procedimiento duplicado exitosamente');
      App.editCosting(cloned.id);
    } catch (e) {
      console.error(e);
      Toast.error('Error al duplicar procedimiento');
    }
  },

  _latestComparisonResult: null,

  async openMarketComparisonModal() {
    const cptCode = this.state.codigo_cpms ? this.state.codigo_cpms.trim() : '';
    const procName = this.state.nombre_procedimiento || 'Procedimiento sin título';
    
    if (!cptCode) {
      Toast.warning('Por favor ingresa primero el código CPMS del procedimiento para buscar en el Observatorio MINSA');
      return;
    }

    const localCost = this.liveCalculated?.costo_total_estandar || 0;

    const initialContentHtml = `
      <div id="market-comp-modal-content" style="min-height: 220px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 2rem 1rem; text-align: center;">
        <div style="font-size: 2rem; margin-bottom: 0.75rem;">⏳</div>
        <h4 style="color: var(--color-primary); margin-bottom: 0.35rem;">Consultando Observatorio Nacional MINSA...</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem; max-width: 480px;">
          Extrayendo tarifas oficiales publicadas para el CPMS <strong>${cptCode}</strong> y procesando con pandas para seleccionar 3 precios mayores a su costo local calculado (<strong>S/. ${localCost.toFixed(3)}</strong>).
        </p>
      </div>
    `;

    Modal.open({
      title: '🏛️ Estudio Comparativo de Mercado Nacional (MINSA)',
      contentHtml: initialContentHtml,
      size: 'lg',
      footerButtons: [
        { label: 'Cerrar', class: 'btn-secondary', onClick: (e, m) => m.close() }
      ]
    });

    try {
      const resp = await API.getMarketComparison(cptCode, localCost, 3);
      this._latestComparisonResult = resp;

      const container = document.getElementById('market-comp-modal-content');
      if (!container) return;

      if (!resp.success || !resp.precios_mayores || resp.precios_mayores.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">ℹ️</div>
            <h4 style="color: var(--text-main);">No se encontraron precios mayores al costo local</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.35rem;">
              ${resp.total_nacional > 0 
                ? `Se revisaron <strong>${resp.total_nacional}</strong> IPRESS con tarifas registradas (Máx nacional: S/. ${resp.stats_nacional.max?.toFixed(2) || '0.00'}), y su costo local calculado de <strong>S/. ${localCost.toFixed(3)}</strong> es superior a todas ellas o no hay suficientes establecimientos con tarifa mayor.`
                : `No se encontraron tarifas monetizadas publicadas en el Observatorio MINSA para el CPMS <strong>${cptCode}</strong>.`}
            </p>
          </div>
        `;
        return;
      }

      const items = resp.precios_mayores;
      const stats = resp.stats_nacional || {};

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; text-align: left; width: 100%;">
          <!-- Resumen de Costo Local vs Mercado -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem;">
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Procedimiento:</div>
              <strong style="font-size: 0.88rem; color: var(--text-main);">${procName}</strong>
              <div style="font-size: 0.75rem; color: var(--primary); font-weight: 700; margin-top: 0.15rem;">CPMS: ${cptCode}</div>
            </div>
            <div style="text-align: right; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 0.5rem 0.75rem;">
              <span style="font-size: 0.72rem; color: #166534; font-weight: 600; text-transform: uppercase;">Precio Local Calculado:</span><br>
              <strong style="color: #15803d; font-size: 1.2rem;">S/. ${localCost.toFixed(3)}</strong>
            </div>
          </div>

          <!-- 3 Precios Nacionales Superiores -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 0;">
                🎯 3 Precios Nacionales Seleccionados (> Costo Local)
              </h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Total mayores disponibles: <strong>${resp.total_mayores}</strong> IPRESS</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${items.map((it, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: white; border: 1px solid #e2e8f0; border-left: 4px solid var(--color-accent); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; box-shadow: var(--shadow-sm);">
                  <div style="flex: 1; min-width: 0; padding-right: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                      <span class="badge ${it.propiedad.includes('MINSA') ? 'badge-primary' : 'badge-slate'}" style="font-size: 0.68rem;">${it.propiedad}</span>
                      <strong style="font-size: 0.85rem; color: var(--text-main);">${it.ipress}</strong>
                    </div>
                    <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.2rem;">
                      ${it.tipo_tarifa || 'Tarifario'} ${it.resolucion && it.resolucion !== '-' ? `• <small>Res: ${it.resolucion}</small>` : ''}
                    </div>
                  </div>
                  <div style="text-align: right; white-space: nowrap;">
                    <div style="font-size: 1.05rem; font-weight: 700; color: var(--color-accent-hover);">
                      S/. ${it.tarifa.toFixed(2)}
                    </div>
                    <div style="font-size: 0.72rem; color: #15803d; font-weight: 600; margin-top: 0.1rem;">
                      +S/. ${it.diferencia_monto.toFixed(2)} (+${it.diferencia_pct.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Benchmarks Nacionales Generales -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; background: #f1f5f9; border-radius: var(--radius-md); padding: 0.6rem; text-align: center; font-size: 0.78rem;">
            <div>
              <span style="color: var(--text-muted);">Mínimo Nacional:</span><br>
              <strong style="color: var(--text-main);">S/. ${(stats.min || 0).toFixed(2)}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Promedio Nacional:</span><br>
              <strong style="color: #2563eb;">S/. ${(stats.promedio || 0).toFixed(2)}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Máximo Nacional:</span><br>
              <strong style="color: #e11d48;">S/. ${(stats.max || 0).toFixed(2)}</strong>
            </div>
          </div>
        </div>
      `;

      // Actualizar botones de footer en el modal
      const footer = Modal.backdrop.querySelector('.modal-footer');
      if (footer) {
        footer.innerHTML = `
          <button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>
          <button class="btn btn-primary" onclick="CostingStudioView.saveMarketComparisonRefs()">
            ${Icons.save} Guardar y Vincular los 3 Precios
          </button>
        `;
      }

    } catch (err) {
      console.error(err);
      const container = document.getElementById('market-comp-modal-content');
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--danger);">
            ❌ Error al consultar el Observatorio MINSA: ${err.message || 'Error de conexión'}
          </div>
        `;
      }
    }
  },

  async saveMarketComparisonRefs() {
    if (!this._latestComparisonResult || !this._latestComparisonResult.precios_mayores || this._latestComparisonResult.precios_mayores.length === 0) {
      Toast.warning('No hay precios seleccionados para guardar');
      return;
    }

    const itemsToSave = this._latestComparisonResult.precios_mayores.map(it => ({
      institucion: it.ipress,
      precio_referencia: it.tarifa,
      observacion: `Observatorio MINSA (${it.propiedad}) [Mayor +S/. ${it.diferencia_monto.toFixed(2)}]`
    }));

    try {
      if (this.currentCostingId) {
        // Procedimiento ya persistido en DB
        const saved = await API.importMinsaReferences(this.currentCostingId, itemsToSave);
        if (!this.state.mercado_referencias) this.state.mercado_referencias = [];
        this.state.mercado_referencias.push(...saved);
        this.persistDraft();
        Toast.success(`¡Se guardaron y vincularon ${itemsToSave.length} precios de referencia en la base de datos!`);
      } else {
        // Borrador en construcción
        if (!this.state.mercado_referencias) this.state.mercado_referencias = [];
        itemsToSave.forEach(it => {
          this.state.mercado_referencias.push({
            id: Date.now() + Math.random(),
            institucion: it.institucion,
            precio_referencia: it.precio_referencia,
            observacion: it.observacion
          });
        });
        this.persistDraft();
        Toast.success(`¡Se agregaron ${itemsToSave.length} precios de referencia al borrador en progreso!`);
      }

      Modal.close();
    } catch (e) {
      console.error(e);
      Toast.error('Error al guardar las referencias de mercado');
    }
  }
};

