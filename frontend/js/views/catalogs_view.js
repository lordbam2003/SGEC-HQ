/**
 * Vista de Administración y Actualización Periódica de Catálogos
 */
const CatalogsView = {
  currentTab: 'cpms',
  searchQuery: '',
  insumoOrigenFilter: '',
  currentPage: 1,

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 class="view-title">ADMINISTRACIÓN Y ACTUALIZACIÓN DE CATÁLOGOS</h2>
          <p class="view-subtitle">Mantenimiento de bases maestras de CPMS, Insumos SIGA / Base, Equipamiento, RRHH e Infraestructura.</p>
        </div>
      </div>

      <!-- Zona de Actualización Periódica (Upload Excel) -->
      <div class="card" style="background: linear-gradient(180deg, #ffffff, #f8fafc); margin-bottom: 1.5rem;">
        <div class="card-header">
          <h3 class="card-title">${Icons.upload} Actualización Periódica Masiva vía Excel</h3>
          <span class="badge badge-info">Formatos .xlsx / .xls</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
          Arrastra o selecciona el archivo oficial de actualización. El sistema importará y fusionará los registros automáticamente:
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
          <!-- Dropzone CPMS -->
          <div class="upload-dropzone" id="dropzone-cpms" onclick="document.getElementById('file-input-cpms').click()">
            <div class="upload-icon">${Icons.hospital}</div>
            <strong style="font-size: 0.9rem; color: var(--primary-dark);">Catálogo CPMS</strong>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Sube <code>CPMS_SUSALUD.xlsx</code> con los 12,000+ procedimientos</p>
            <span class="btn btn-secondary btn-sm" style="pointer-events: none; font-size: 0.75rem;">Seleccionar</span>
            <input type="file" id="file-input-cpms" accept=".xlsx,.xls" style="display: none;" onchange="CatalogsView.uploadFile(this.files[0], 'cpms')">
          </div>

          <!-- Dropzone SIGA -->
          <div class="upload-dropzone" id="dropzone-siga" onclick="document.getElementById('file-input-siga').click()" style="border-color: #3b82f6;">
            <div class="upload-icon" style="color: #3b82f6;">${Icons.box}</div>
            <strong style="font-size: 0.9rem; color: #1d4ed8;">Insumos SIGA (Kardex)</strong>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Sube <code>siga.xlsx</code> con compras y costos ponderados</p>
            <span class="btn btn-primary btn-sm" style="pointer-events: none; font-size: 0.75rem; background: #2563eb;">Fusionar SIGA</span>
            <input type="file" id="file-input-siga" accept=".xlsx,.xls" style="display: none;" onchange="CatalogsView.uploadFile(this.files[0], 'siga')">
          </div>

          <!-- Dropzone Catálogos Generales -->
          <div class="upload-dropzone" id="dropzone-data" onclick="document.getElementById('file-input-data').click()">
            <div class="upload-icon">${Icons.database}</div>
            <strong style="font-size: 0.9rem; color: var(--secondary-hover);">Catálogos Base</strong>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Sube <code>data.xlsx</code> con Equipos, RRHH, Infraestructura</p>
            <span class="btn btn-secondary btn-sm" style="pointer-events: none; font-size: 0.75rem;">Seleccionar</span>
            <input type="file" id="file-input-data" accept=".xlsx,.xls" style="display: none;" onchange="CatalogsView.uploadFile(this.files[0], 'catalogs')">
          </div>
        </div>
      </div>

      <!-- Pestañas de Catálogos -->
      <div class="tabs-header">
        <button class="tab-btn active" id="tab-cpms" onclick="CatalogsView.switchTab('cpms')">${Icons.hospital} CPMS SUSALUD</button>
        <button class="tab-btn" id="tab-servicios" onclick="CatalogsView.switchTab('servicios')">${Icons.hospital} Servicios y UPSS</button>
        <button class="tab-btn" id="tab-insumos" onclick="CatalogsView.switchTab('insumos')">${Icons.box} Insumos y Materiales</button>
        <button class="tab-btn" id="tab-equipamiento" onclick="CatalogsView.switchTab('equipamiento')">${Icons.monitor} Equipamiento</button>
        <button class="tab-btn" id="tab-rrhh" onclick="CatalogsView.switchTab('rrhh')">${Icons.users} Recursos Humanos</button>
        <button class="tab-btn" id="tab-infraestructura" onclick="CatalogsView.switchTab('infraestructura')">${Icons.building} Infraestructura</button>
        <button class="tab-btn" id="tab-servicios-basicos" onclick="CatalogsView.switchTab('servicios-basicos')">${Icons.zap} Servicios Básicos</button>
        <button class="tab-btn" id="tab-costos-indirectos" onclick="CatalogsView.switchTab('costos-indirectos')">${Icons.layers} Costos Indirectos</button>
      </div>

      <!-- Barra de Búsqueda y Botón Nuevo -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1; max-width: 600px;">
            <div class="search-input-wrap" style="flex: 1;">
              <span class="search-icon">${Icons.search}</span>
              <input type="text" id="catalog-search-input" class="form-control" placeholder="Buscar en catálogo actual (nombre, código SIGA, código de costeo)..." oninput="CatalogsView.onSearch(this.value)">
            </div>
            <select id="insumo-origen-filter" class="form-select" style="display: none; width: 170px;" onchange="CatalogsView.onOrigenFilterChange(this.value)">
              <option value="">Origen: Todos</option>
              <option value="FUSIONADO">⚡ Fusionados (Base+SIGA)</option>
              <option value="SIGA">📦 Solo SIGA</option>
              <option value="BASE">🏛️ Solo Base</option>
            </select>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span style="font-size: 0.85rem; color: var(--text-muted);" id="catalog-count-label">Cargando...</span>
            <button class="btn btn-primary btn-sm" id="btn-add-item" onclick="CatalogsView.openAddItemModal()">
              ${Icons.plus} Nuevo Ítem
            </button>
          </div>
        </div>
      </div>

      <!-- Tabla de Datos del Catálogo -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive" style="border: none;">
          <table class="data-table" id="catalog-table">
            <thead id="catalog-thead"></thead>
            <tbody id="catalog-tbody">
              <tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">Cargando catálogo...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Paginador -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;" id="catalog-pagination">
        <span style="font-size: 0.85rem; color: var(--text-muted);" id="pagination-info">Página 1</span>
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn btn-secondary btn-sm" id="btn-prev-page" onclick="CatalogsView.changePage(-1)">Anterior</button>
          <button class="btn btn-secondary btn-sm" id="btn-next-page" onclick="CatalogsView.changePage(1)">Siguiente</button>
        </div>
      </div>
    `;

    this.setupDragAndDrop();
    await this.loadCurrentTab();
  },

  setupDragAndDrop() {
    ['dropzone-cpms', 'dropzone-siga', 'dropzone-data'].forEach(id => {
      const dropzone = document.getElementById(id);
      if (!dropzone) return;
      let type = 'catalogs';
      if (id.includes('cpms')) type = 'cpms';
      else if (id.includes('siga')) type = 'siga';

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.uploadFile(e.dataTransfer.files[0], type);
        }
      });
    });
  },

  async uploadFile(file, type) {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    Toast.info(`Subiendo y procesando ${file.name}...`);
    try {
      if (type === 'cpms') {
        const res = await API.uploadCPMSFile(formData);
        Toast.success(res.message);
      } else if (type === 'siga') {
        const res = await API.uploadSIGAFile(formData);
        Toast.success(res.message);
      } else {
        const res = await API.uploadCatalogsFile(formData);
        Toast.success(res.message);
      }
      this.loadCurrentTab();
    } catch (e) {
      console.error(e);
      Toast.error(`Error al procesar archivo: ${e.message}`);
    }
  },

  onOrigenFilterChange(val) {
    this.insumoOrigenFilter = val;
    this.currentPage = 1;
    this.loadCurrentTab();
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.currentPage = 1;
    this.searchQuery = '';
    document.getElementById('catalog-search-input').value = '';

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');

    const origenFilter = document.getElementById('insumo-origen-filter');
    if (origenFilter) {
      origenFilter.style.display = (tab === 'insumos') ? 'inline-block' : 'none';
    }

    const btnAdd = document.getElementById('btn-add-item');
    if (btnAdd) {
      btnAdd.style.display = 'inline-flex';
      const labels = {
        cpms: `${Icons.plus} Nuevo Procedimiento`,
        servicios: `${Icons.plus} Nuevo Servicio`,
        insumos: `${Icons.plus} Nuevo Insumo`,
        equipamiento: `${Icons.plus} Nuevo Equipo`,
        rrhh: `${Icons.plus} Nuevo Cargo RRHH`,
        infraestructura: `${Icons.plus} Nuevo Ambiente`,
        'servicios-basicos': `${Icons.plus} Nuevo Servicio Básico`,
        'costos-indirectos': `${Icons.plus} Nuevo Costo Indirecto`
      };
      btnAdd.innerHTML = labels[tab] || `${Icons.plus} Nuevo Ítem`;
    }

    this.loadCurrentTab();
  },

  async loadCurrentTab() {
    const thead = document.getElementById('catalog-thead');
    const tbody = document.getElementById('catalog-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">Cargando registros...</td></tr>`;

    try {
      if (this.currentTab === 'cpms') {
        thead.innerHTML = `
          <tr>
            <th style="width: 110px;">Código CPMS</th>
            <th>Denominación Oficial del Procedimiento</th>
            <th>Sección</th>
            <th>Subsección</th>
            <th style="width: 90px; text-align: center;">Estado</th>
            <th style="width: 80px; text-align: center;">Acciones</th>
          </tr>
        `;
        const res = await API.searchCPMS(this.searchQuery, this.currentPage, 25);
        this.renderPagination(res.total, 25);
        tbody.innerHTML = res.items.map(item => `
          <tr>
            <td><strong style="color: var(--primary);">${item.codigo}</strong></td>
            <td><strong>${item.denominacion}</strong></td>
            <td><span class="badge badge-slate">${item.seccion_nombre || '-'}</span></td>
            <td>${item.subseccion_nombre || '-'}</td>
            <td style="text-align: center;"><span class="badge badge-success">${item.situacion || 'ACTIVO'}</span></td>
            <td style="text-align: center;">
              <button class="btn btn-danger btn-sm btn-icon" onclick="CatalogsView.deleteCPMS('${item.codigo}')" title="Eliminar Procedimiento">${Icons.trash}</button>
            </td>
          </tr>
        `).join('');
      } else if (this.currentTab === 'servicios') {
        thead.innerHTML = `
          <tr>
            <th style="width: 80px;">Código</th>
            <th style="width: 180px;">UPS</th>
            <th>Servicio Hospitalario</th>
            <th>Infraestructura Asignada</th>
            <th>Costos Indirectos (UPSS)</th>
            <th>Centros de Costos Equipos</th>
            <th style="width: 130px; text-align: center;">Acciones</th>
          </tr>
        `;
        const res = await API.getServicios(this.searchQuery, '', this.currentPage, 50);
        this.renderPagination(res.total, 50);
        this._currentServicios = res.items || [];
        tbody.innerHTML = this._currentServicios.map((item, idx) => {
          let ccs = [];
          try {
            if (item.centros_costo_equipamiento) {
              ccs = JSON.parse(item.centros_costo_equipamiento);
            }
          } catch(e) {}

          const infraText = item.infraestructura ? `${item.infraestructura.codigo_costeo} (${item.infraestructura.area_m2} m² | S/. ${item.infraestructura.depreciacion_minuto.toFixed(3)}/min)` : '<span style="color: var(--text-light);">-</span>';
          const indText = item.costos_indirectos ? `${item.costos_indirectos.codigo_upss} (Admin: S/. ${item.costos_indirectos.costo_unit_admin.toFixed(3)} | Gral: S/. ${item.costos_indirectos.costo_unit_generales.toFixed(3)})` : '<span style="color: var(--text-light);">-</span>';
          const ccsBadges = ccs.length > 0 ? ccs.map(c => `<span class="badge badge-slate" style="font-size: 0.72rem; margin: 2px 2px;">${c}</span>`).join('') : '<span style="color: var(--text-light);">Todos</span>';

          return `
            <tr>
              <td><span class="badge badge-primary">${item.codigo || item.id}</span></td>
              <td><span class="badge badge-info" style="font-weight: 600;">${item.ups}</span></td>
              <td><strong>${item.nombre_servicio}</strong></td>
              <td><small>${infraText}</small></td>
              <td><small>${indText}</small></td>
              <td>${ccsBadges}</td>
              <td style="text-align: center;">
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                  <button class="btn btn-secondary btn-sm" onclick="CatalogsView.openEditServiceCCModal(${idx})" title="Gestionar Equipos">
                    ⚙️ Equipos
                  </button>
                  <button class="btn btn-danger btn-sm btn-icon" onclick="CatalogsView.deleteServicio(${item.id})" title="Eliminar Servicio">
                    ${Icons.trash}
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      } else if (this.currentTab === 'insumos') {
        thead.innerHTML = `
          <tr>
            <th style="width: 130px;">Código SIGA / Ref</th>
            <th>Descripción del Insumo / Material</th>
            <th style="width: 110px; text-align: center;">Origen</th>
            <th style="width: 100px;">U. Medida</th>
            <th style="width: 110px;">Costo Base</th>
            <th style="width: 120px;">Precio SIGA Real</th>
            <th style="width: 70px; text-align: center;">Acciones</th>
          </tr>
        `;
        const res = await API.getInsumos(this.searchQuery, '', this.insumoOrigenFilter, this.currentPage, 25);
        this.renderPagination(res.total, 25);
        tbody.innerHTML = res.items.map(item => {
          let origenBadge = '<span class="badge badge-slate">BASE</span>';
          if (item.origen === 'FUSIONADO') origenBadge = '<span class="badge badge-success" title="Coincide con compra real SIGA">⚡ FUSIONADO</span>';
          else if (item.origen === 'SIGA') origenBadge = '<span class="badge badge-primary" title="Importado de Kardex SIGA">📦 SIGA</span>';

          const sigaCodeBadge = item.codigo_siga ? `<span class="badge badge-primary" style="font-size: 0.72rem;">${item.codigo_siga}</span>` : `<span class="badge badge-slate" style="font-size: 0.72rem;">${item.codigo_costeo || item.codigo_usado || item.id}</span>`;
          const precioSigaText = (item.precio_siga && item.precio_siga > 0) ? `<strong style="color: #2563eb;">S/. ${item.precio_siga.toFixed(3)}</strong>` : '<span style="color: var(--text-light);">-</span>';

          return `
            <tr>
              <td>${sigaCodeBadge}</td>
              <td>
                <strong>${item.descripcion}</strong>
                ${item.codigo_usado && item.codigo_usado !== item.codigo_siga ? `<br><small style="color: var(--text-muted);">Cód. Ref: ${item.codigo_usado}</small>` : ''}
              </td>
              <td style="text-align: center;">${origenBadge}</td>
              <td><strong>${item.unidad_consumo || item.unidad_medida || 'UNIDAD'}</strong></td>
              <td><strong style="color: var(--primary);">S/. ${item.costo_unitario.toFixed(3)}</strong></td>
              <td>${precioSigaText}</td>
              <td style="text-align: center;">
                <button class="btn btn-danger btn-sm btn-icon" onclick="CatalogsView.deleteInsumo(${item.id})" title="Eliminar Insumo">${Icons.trash}</button>
              </td>
            </tr>
          `;
        }).join('');
      } else if (this.currentTab === 'equipamiento') {
        thead.innerHTML = `
          <tr>
            <th style="width: 90px;">Código</th>
            <th>Descripción del Activo Fijo</th>
            <th>Tipo</th>
            <th>Centro de Costos</th>
            <th>Vida Útil (min)</th>
            <th>Costo x Minuto</th>
            <th style="width: 80px; text-align: center;">Acciones</th>
          </tr>
        `;
        const res = await API.getEquipamiento(this.searchQuery, '', this.currentPage, 25);
        this.renderPagination(res.total, 25);
        tbody.innerHTML = res.items.map(item => `
          <tr>
            <td><span class="badge badge-slate">${item.codigo_costeo || item.id}</span></td>
            <td><strong>${item.descripcion}</strong></td>
            <td>${item.tipo_equipamiento || 'Equipo'}</td>
            <td>${item.centro_costos || '-'}</td>
            <td>${item.vida_util_minutos ? item.vida_util_minutos.toLocaleString() : '-'}</td>
            <td><strong style="color: var(--primary);">S/. ${item.costo_minuto.toFixed(3)}</strong></td>
            <td style="text-align: center;">
              <button class="btn btn-danger btn-sm btn-icon" onclick="CatalogsView.deleteEquipo(${item.id})" title="Eliminar Equipo">${Icons.trash}</button>
            </td>
          </tr>
        `).join('');
      } else if (this.currentTab === 'rrhh') {
        thead.innerHTML = `
          <tr>
            <th style="width: 90px;">Código</th>
            <th>Grupo Ocupacional / Cargo</th>
            <th>Sueldo Mensual</th>
            <th>Jornada (min)</th>
            <th>Costo Promedio x Minuto</th>
            <th style="width: 80px; text-align: center;">Acciones</th>
          </tr>
        `;
        const res = await API.getRRHH(this.searchQuery, this.currentPage, 50);
        this.renderPagination(res.total, 50);
        tbody.innerHTML = res.items.map(item => `
          <tr>
            <td><span class="badge badge-slate">${item.codigo_costeo || item.id}</span></td>
            <td><strong>${item.grupo_ocupacional}</strong></td>
            <td>S/. ${item.pago_mensual.toFixed(3)}</td>
            <td>${item.jornada_minutos} min</td>
            <td><strong style="color: var(--primary);">S/. ${item.costo_minuto.toFixed(3)}</strong></td>
            <td style="text-align: center;">
              <button class="btn btn-danger btn-sm btn-icon" onclick="CatalogsView.deleteRRHH(${item.id})" title="Eliminar Cargo">${Icons.trash}</button>
            </td>
          </tr>
        `).join('');
      } else if (this.currentTab === 'infraestructura') {
        thead.innerHTML = `
          <tr>
            <th style="width: 110px;">Código</th>
            <th style="width: 200px;">UPS (Agrupador)</th>
            <th>Servicio / Ambiente</th>
            <th style="width: 90px;">Área (m2)</th>
            <th>Valor Construcción</th>
            <th>Depreciación x Minuto</th>
            <th style="width: 80px; text-align: center;">Acciones</th>
          </tr>
        `;
        const list = await API.getInfraestructura();
        const sq = this.searchQuery ? this.searchQuery.toLowerCase() : '';
        const filtered = sq ? list.filter(i => 
          (i.servicio && i.servicio.toLowerCase().includes(sq)) || 
          (i.ups && i.ups.toLowerCase().includes(sq)) || 
          (i.codigo_costeo && i.codigo_costeo.toLowerCase().includes(sq))
        ) : list;
        this.renderPagination(filtered.length, filtered.length || 1);
        tbody.innerHTML = filtered.map(item => `
          <tr>
            <td><span class="badge badge-slate">${item.codigo_costeo || item.id}</span></td>
            <td><span class="badge badge-info" style="font-weight: 600;">${item.ups || '-'}</span></td>
            <td><strong>${item.servicio}</strong></td>
            <td>${item.area_m2} m²</td>
            <td>S/. ${item.valor_total_upss.toLocaleString()}</td>
            <td><strong style="color: var(--primary);">S/. ${item.depreciacion_minuto.toFixed(6)}</strong></td>
            <td style="text-align: center;">
              <button class="btn btn-danger btn-sm btn-icon" onclick="CatalogsView.deleteInfraestructura(${item.id})" title="Eliminar Ambiente">${Icons.trash}</button>
            </td>
          </tr>
        `).join('');
      } else if (this.currentTab === 'servicios-basicos') {
        thead.innerHTML = `
          <tr>
            <th style="width: 110px;">Código Costeo</th>
            <th style="width: 200px;">UPS</th>
            <th>Servicios Básicos (Servicio / Área)</th>
            <th style="width: 100px;">Área (m²)</th>
            <th>Costo Unitario Total PMS</th>
            <th style="width: 80px; text-align: center;">Acciones</th>
          </tr>
        `;
        const list = await API.getServiciosBasicos();
        const sq = this.searchQuery ? this.searchQuery.toLowerCase() : '';
        const filtered = sq ? list.filter(i => 
          (i.servicio && i.servicio.toLowerCase().includes(sq)) || 
          (i.ups && i.ups.toLowerCase().includes(sq)) || 
          (i.codigo_costeo && i.codigo_costeo.toLowerCase().includes(sq))
        ) : list;
        this.renderPagination(filtered.length, filtered.length || 1);
        tbody.innerHTML = filtered.map(item => `
          <tr>
            <td><span class="badge badge-slate">${item.codigo_costeo || item.id}</span></td>
            <td><span class="badge badge-info" style="font-weight: 600;">${item.ups || '-'}</span></td>
            <td><strong>${item.servicio}</strong></td>
            <td>${item.area_m2} m²</td>
            <td><strong style="color: var(--primary);">S/. ${item.costo_total_servicio.toFixed(4)}</strong></td>
            <td style="text-align: center;">
              <button class="btn btn-danger btn-sm btn-icon" onclick="CatalogsView.deleteServiciosBasicos(${item.id})" title="Eliminar Servicio Básico">${Icons.trash}</button>
            </td>
          </tr>
        `).join('');
      } else if (this.currentTab === 'costos-indirectos') {
        thead.innerHTML = `
          <tr>
            <th style="width: 110px;">UPSS / Cód.</th>
            <th style="width: 180px;">UPS</th>
            <th>Servicio / Centro de Costo</th>
            <th style="width: 90px;">Área (m²)</th>
            <th>Prod. Óptima Anual</th>
            <th>Costo Unit. Admin</th>
            <th>Costo Unit. Generales</th>
            <th>Costo Unit. Total PMS</th>
            <th style="width: 80px; text-align: center;">Acciones</th>
          </tr>
        `;
        const list = await API.getCostosIndirectos();
        const sq = this.searchQuery ? this.searchQuery.toLowerCase() : '';
        const filtered = sq ? list.filter(i => 
          (i.servicio && i.servicio.toLowerCase().includes(sq)) || 
          (i.ups && i.ups.toLowerCase().includes(sq)) || 
          (i.codigo_upss && i.codigo_upss.toLowerCase().includes(sq))
        ) : list;
        this.renderPagination(filtered.length, filtered.length || 1);
        tbody.innerHTML = filtered.map(item => `
          <tr>
            <td><span class="badge badge-slate">${item.codigo_upss || item.id}</span></td>
            <td><span class="badge badge-info" style="font-weight: 600;">${item.ups || '-'}</span></td>
            <td><strong>${item.servicio}</strong></td>
            <td>${item.area_m2} m²</td>
            <td>${item.produccion_optima_anual.toLocaleString()}</td>
            <td>S/. ${item.costo_unit_admin.toFixed(4)}</td>
            <td>S/. ${item.costo_unit_generales.toFixed(4)}</td>
            <td><strong style="color: var(--primary);">S/. ${item.costo_unit_total_pms.toFixed(4)}</strong></td>
            <td style="text-align: center;">
              <button class="btn btn-danger btn-sm btn-icon" onclick="CatalogsView.deleteCostosIndirectos(${item.id})" title="Eliminar Costo Indirecto">${Icons.trash}</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error(e);
      Toast.error('Error al cargar datos del catálogo');
    }
  },

  renderPagination(total, pageSize) {
    document.getElementById('catalog-count-label').textContent = `${total.toLocaleString()} registros totales`;
    const totalPages = Math.ceil(total / pageSize) || 1;
    document.getElementById('pagination-info').textContent = `Página ${this.currentPage} de ${totalPages} (${total.toLocaleString()} ítems)`;
    document.getElementById('btn-prev-page').disabled = this.currentPage <= 1;
    document.getElementById('btn-next-page').disabled = this.currentPage >= totalPages;
  },

  changePage(delta) {
    this.currentPage += delta;
    this.loadCurrentTab();
  },

  onSearch(val) {
    this.searchQuery = val;
    this.currentPage = 1;
    this.loadCurrentTab();
  },

  openAddItemModal() {
    if (this.currentTab === 'equipamiento') {
      this.openAddEquipamientoModal();
    } else if (this.currentTab === 'servicios') {
      this.openAddServicioModal();
    } else if (this.currentTab === 'insumos') {
      this.openAddInsumoModal();
    } else if (this.currentTab === 'rrhh') {
      this.openAddRRHHModal();
    } else if (this.currentTab === 'infraestructura') {
      this.openAddInfraestructuraModal();
    } else if (this.currentTab === 'servicios-basicos') {
      this.openAddServiciosBasicosModal();
    } else if (this.currentTab === 'costos-indirectos') {
      this.openAddCostosIndirectosModal();
    } else if (this.currentTab === 'cpms') {
      this.openAddCPMSModal();
    }
  },

  async openAddEquipamientoModal() {
    Toast.info('Cargando centros de costo...');
    let ccList = [];
    try {
      ccList = await API.getCentrosCostosEquipamiento();
    } catch (e) {
      console.error(e);
    }

    Modal.open({
      title: 'Registrar Nuevo Equipo o Mobiliario',
      contentHtml: `
        <div class="form-group">
          <label class="form-label">Descripción del Activo Fijo (*)</label>
          <input type="text" id="add-eq-desc" class="form-control" placeholder="Ej: ECOGRAFO DOPPLER COLOR 4D, MONITOR MULTIPARAMETRO...">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Código de Costeo / Patrimonial</label>
            <input type="text" id="add-eq-cod" class="form-control" placeholder="Ej: CDEM1730">
          </div>
          <div class="form-group">
            <label class="form-label">Código Margesí (Opcional)</label>
            <input type="text" id="add-eq-margesi" class="form-control" placeholder="Ej: 74089900012">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Tipo de Equipamiento</label>
            <select id="add-eq-tipo" class="form-select">
              <option value="Equipo biomédico" selected>Equipo Biomédico</option>
              <option value="Mobiliario clínico">Mobiliario Clínico</option>
              <option value="Instrumental quirúrgico">Instrumental Quirúrgico</option>
              <option value="Equipo electromecánico">Equipo Electromecánico</option>
              <option value="Equipo de cómputo">Equipo de Cómputo</option>
              <option value="Vehículo">Vehículo</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Centro de Costos (*)</label>
            <select id="add-eq-cc" class="form-select">
              <option value="">-- SELECCIONE CENTRO DE COSTOS --</option>
              ${ccList.map(c => {
                const name = c.nombre || c.centro_costos;
                const count = c.total_equipos || c.count || 0;
                return `<option value="${name}">${name} (${count} equipos)</option>`;
              }).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Valor Adquisición (S/.) (*)</label>
            <input type="number" id="add-eq-val" class="form-control" placeholder="0.00" min="0" step="10" oninput="CatalogsView.calcEquipCostMin()">
          </div>
          <div class="form-group">
            <label class="form-label">Vida Útil (Años)</label>
            <input type="number" id="add-eq-anios" class="form-control" value="10" min="1" step="1" oninput="CatalogsView.onEquipAniosChange(this.value)">
          </div>
          <div class="form-group">
            <label class="form-label">Vida Útil (Minutos) (*)</label>
            <input type="number" id="add-eq-min" class="form-control" value="2880000" min="1" step="1000" oninput="CatalogsView.calcEquipCostMin()">
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Costo por Minuto Calculado:</span>
          <strong id="add-eq-cost-min-badge" style="font-size: 1.05rem; color: var(--primary);">S/. 0.000 / min</strong>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Equipo',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const desc = document.getElementById('add-eq-desc').value.trim();
            const cod = document.getElementById('add-eq-cod').value.trim();
            const margesi = document.getElementById('add-eq-margesi').value.trim();
            const tipo = document.getElementById('add-eq-tipo').value;
            const cc = document.getElementById('add-eq-cc').value;
            const val = parseFloat(document.getElementById('add-eq-val').value) || 0;
            const min = parseFloat(document.getElementById('add-eq-min').value) || 0;

            if (!desc || val <= 0 || min <= 0) {
              Toast.warning('Ingresa descripción, valor de adquisición y vida útil válida');
              return;
            }

            const costMin = val / min;

            try {
              await API.saveEquipamiento({
                descripcion: desc,
                codigo_costeo: cod || null,
                codigo_margesi: margesi || null,
                tipo_equipamiento: tipo,
                centro_costos: cc || null,
                valor_adquisicion: val,
                vida_util_minutos: min,
                costo_minuto: costMin
              });
              Toast.success('Equipo registrado correctamente en el catálogo');
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error(`Error al registrar equipo: ${err.message}`);
            }
          }
        }
      ]
    });
  },

  onEquipAniosChange(aniosVal) {
    const anios = parseFloat(aniosVal) || 10;
    const totalMin = Math.round(anios * 288000);
    const minInput = document.getElementById('add-eq-min');
    if (minInput) minInput.value = totalMin;
    this.calcEquipCostMin();
  },

  calcEquipCostMin() {
    const val = parseFloat(document.getElementById('add-eq-val')?.value) || 0;
    const min = parseFloat(document.getElementById('add-eq-min')?.value) || 0;
    const badge = document.getElementById('add-eq-cost-min-badge');
    if (badge) {
      const rate = min > 0 ? (val / min) : 0;
      badge.textContent = `S/. ${rate.toFixed(4)} / min`;
    }
  },

  async openAddServicioModal() {
    Toast.info('Cargando relaciones de servicios...');
    let infraList = [], sbList = [], ciList = [], ccList = [];
    try {
      [infraList, sbList, ciList, ccList] = await Promise.all([
        API.getInfraestructura(),
        API.getServiciosBasicos(),
        API.getCostosIndirectos(),
        API.getCentrosCostosEquipamiento()
      ]);
    } catch (e) {
      console.error(e);
    }

    Modal.open({
      title: 'Registrar Nuevo Servicio Hospitalario / UPSS',
      contentHtml: `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Nombre del Servicio Hospitalario (*)</label>
            <input type="text" id="add-serv-name" class="form-control" placeholder="Ej: CONSULTORIO DE CARDIOLOGIA, SERVICIO DE NEONATOLOGIA...">
          </div>
          <div class="form-group">
            <label class="form-label">Código del Servicio</label>
            <input type="text" id="add-serv-cod" class="form-control" placeholder="Ej: SERV-85">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">UPS / Agrupador (*)</label>
          <input type="text" id="add-serv-ups" class="form-control" placeholder="Ej: CONSULTA EXTERNA, HOSPITALIZACION, EMERGENCIA, PATOLOGIA CLINICA...">
        </div>

        <div class="form-group">
          <label class="form-label">Infraestructura Asignada</label>
          <select id="add-serv-infra" class="form-select">
            <option value="">-- SELECCIONE INFRAESTRUCTURA --</option>
            ${infraList.map(i => `<option value="${i.id}">[${i.ups || ''}] ${i.servicio} (${i.area_m2} m² - S/. ${i.depreciacion_minuto.toFixed(3)}/min)</option>`).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Servicios Básicos Asignados</label>
            <select id="add-serv-sb" class="form-select">
              <option value="">-- SELECCIONE SERVICIOS BÁSICOS --</option>
              ${sbList.map(s => `<option value="${s.id}">${s.servicio} (S/. ${s.costo_total_servicio.toFixed(2)})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Costos Indirectos (UPSS)</label>
            <select id="add-serv-ci" class="form-select">
              <option value="">-- SELECCIONE COSTOS INDIRECTOS --</option>
              ${ciList.map(c => `<option value="${c.id}">${c.codigo_upss || ''} ${c.servicio} (Admin: S/. ${c.costo_unit_admin.toFixed(3)} | Gral: S/. ${c.costo_unit_generales.toFixed(3)})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Centros de Costos de Equipamiento (Sugeridos)</label>
          <select id="add-serv-cc" class="form-select">
            <option value="">-- SELECCIONE CENTRO DE COSTOS DE EQUIPOS --</option>
            ${ccList.map(c => `<option value="${c.nombre || c.centro_costos}">${c.nombre || c.centro_costos} (${c.total_equipos || c.count} equipos)</option>`).join('')}
          </select>
          <small style="color: var(--text-muted); font-size: 0.75rem;">Podrás asociar más centros de costo en cualquier momento desde el botón ⚙️ Equipos.</small>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Servicio',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const name = document.getElementById('add-serv-name').value.trim();
            const ups = document.getElementById('add-serv-ups').value.trim();
            const cod = document.getElementById('add-serv-cod').value.trim();
            const infraId = parseInt(document.getElementById('add-serv-infra').value) || null;
            const sbId = parseInt(document.getElementById('add-serv-sb').value) || null;
            const ciId = parseInt(document.getElementById('add-serv-ci').value) || null;
            const ccVal = document.getElementById('add-serv-cc').value;

            if (!name || !ups) {
              Toast.warning('Ingresa el nombre del servicio y la UPS agrupador');
              return;
            }

            const ccsJson = ccVal ? JSON.stringify([ccVal]) : JSON.stringify([]);

            try {
              await API.saveServicio({
                nombre_servicio: name,
                ups: ups,
                codigo: cod || null,
                infraestructura_id: infraId,
                servicios_basicos_id: sbId,
                costos_indirectos_id: ciId,
                centros_costo_equipamiento: ccsJson
              });
              Toast.success('Servicio hospitalario registrado correctamente');
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error(`Error al registrar servicio: ${err.message}`);
            }
          }
        }
      ]
    });
  },

  openAddInsumoModal() {
    Modal.open({
      title: 'Registrar Nuevo Insumo / Material',
      contentHtml: `
        <div class="form-group">
          <label class="form-label">Descripción del Insumo (*)</label>
          <input type="text" id="add-insumo-desc" class="form-control" placeholder="Ej: ALCOHOL EN GEL 1L, GUANTES DE NITRILO M...">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Código SIGA (11 Dígitos / MEF)</label>
            <input type="text" id="add-insumo-siga" class="form-control" placeholder="Ej: 351100020105">
          </div>
          <div class="form-group">
            <label class="form-label">Código de Costeo / Interno</label>
            <input type="text" id="add-insumo-cod" class="form-control" placeholder="Ej: CUI1500 o 00045">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Tipo de Insumo</label>
            <select id="add-insumo-tipo" class="form-select">
              <option value="FUNGIBLE" selected>Fungible (Material descartable/reactivo)</option>
              <option value="NO_FUNGIBLE">No Fungible (Uso por tiempo/minuto)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Unidad de Medida Consumo</label>
            <input type="text" id="add-insumo-um" class="form-control" placeholder="Ej: UNIDAD, ML, FRASCO, TEST" value="UNIDAD">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Costo Unitario Base (S/.) (*)</label>
            <input type="number" id="add-insumo-cost" class="form-control" placeholder="0.000" min="0" step="0.001">
          </div>
          <div class="form-group">
            <label class="form-label">Precio SIGA Real (S/.)</label>
            <input type="number" id="add-insumo-precio-siga" class="form-control" placeholder="0.000" min="0" step="0.001">
          </div>
          <div class="form-group">
            <label class="form-label">Costo por Minuto (S/./min)</label>
            <input type="number" id="add-insumo-cost-min" class="form-control" placeholder="0.000" min="0" step="0.000001">
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Insumo',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const desc = document.getElementById('add-insumo-desc').value.trim();
            const siga = document.getElementById('add-insumo-siga').value.trim();
            const cod = document.getElementById('add-insumo-cod').value.trim();
            const tipo = document.getElementById('add-insumo-tipo').value;
            const um = document.getElementById('add-insumo-um').value.trim();
            const cost = parseFloat(document.getElementById('add-insumo-cost').value) || 0;
            const precioSiga = parseFloat(document.getElementById('add-insumo-precio-siga').value) || 0;
            const costMin = parseFloat(document.getElementById('add-insumo-cost-min').value) || 0;

            if (!desc || cost <= 0) {
              Toast.warning('Ingresa descripción y un costo unitario válido');
              return;
            }

            const origen = siga ? (precioSiga > 0 ? 'FUSIONADO' : 'SIGA') : 'BASE';

            try {
              await API.saveInsumo({
                descripcion: desc,
                codigo_siga: siga || null,
                codigo_costeo: cod || null,
                codigo_usado: cod || siga || null,
                tipo: tipo,
                unidad_medida: um,
                unidad_consumo: um,
                costo_unitario: cost,
                precio_siga: precioSiga,
                costo_minuto: costMin,
                origen: origen
              });
              Toast.success('Insumo registrado correctamente');
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error(`Error al registrar insumo: ${err.message}`);
            }
          }
        }
      ]
    });
  },

  openAddRRHHModal() {
    Modal.open({
      title: 'Registrar Cargo / Grupo RRHH',
      contentHtml: `
        <div class="form-group">
          <label class="form-label">Grupo Ocupacional / Cargo (*)</label>
          <input type="text" id="add-rrhh-cargo" class="form-control" placeholder="Ej: MEDICO ESPECIALISTA EN CARDIOLOGIA, ENFERMERA ASISTENCIAL...">
        </div>
        <div class="form-group">
          <label class="form-label">Código de Costeo</label>
          <input type="text" id="add-rrhh-cod" class="form-control" placeholder="Ej: CRHM26">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Pago Mensual Promedio (S/.) (*)</label>
            <input type="number" id="add-rrhh-sueldo" class="form-control" placeholder="0.00" min="0" step="10" oninput="CatalogsView.calcRRHHCostMin()">
          </div>
          <div class="form-group">
            <label class="form-label">Jornada Mensual (minutos) (*)</label>
            <input type="number" id="add-rrhh-jornada" class="form-control" value="9000" min="1" step="100" oninput="CatalogsView.calcRRHHCostMin()">
          </div>
        </div>
        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Costo por Minuto Calculado:</span>
          <strong id="add-rrhh-cost-min-badge" style="font-size: 1.05rem; color: var(--primary);">S/. 0.000 / min</strong>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Cargo',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const cargo = document.getElementById('add-rrhh-cargo').value.trim();
            const cod = document.getElementById('add-rrhh-cod').value.trim();
            const sueldo = parseFloat(document.getElementById('add-rrhh-sueldo').value) || 0;
            const jornada = parseFloat(document.getElementById('add-rrhh-jornada').value) || 9000;

            if (!cargo || sueldo <= 0 || jornada <= 0) {
              Toast.warning('Ingresa cargo, pago mensual y jornada válida');
              return;
            }

            const costMin = sueldo / jornada;

            try {
              await API.saveRRHH({
                grupo_ocupacional: cargo,
                codigo_costeo: cod || null,
                pago_mensual: sueldo,
                jornada_minutos: jornada,
                costo_minuto: costMin
              });
              Toast.success('Cargo RRHH registrado correctamente');
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error(`Error al registrar RRHH: ${err.message}`);
            }
          }
        }
      ]
    });
  },

  calcRRHHCostMin() {
    const sueldo = parseFloat(document.getElementById('add-rrhh-sueldo')?.value) || 0;
    const jornada = parseFloat(document.getElementById('add-rrhh-jornada')?.value) || 9000;
    const badge = document.getElementById('add-rrhh-cost-min-badge');
    if (badge) {
      const rate = jornada > 0 ? (sueldo / jornada) : 0;
      badge.textContent = `S/. ${rate.toFixed(4)} / min`;
    }
  },

  openAddInfraestructuraModal() {
    Modal.open({
      title: 'Registrar Ambiente / Infraestructura',
      contentHtml: `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Servicio / Ambiente (*)</label>
            <input type="text" id="add-inf-servicio" class="form-control" placeholder="Ej: CONSULTORIO 101, SALA DE ECOGRAFIA...">
          </div>
          <div class="form-group">
            <label class="form-label">Código de Costeo</label>
            <input type="text" id="add-inf-cod" class="form-control" placeholder="Ej: INF-85">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">UPS (Agrupador) (*)</label>
          <input type="text" id="add-inf-ups" class="form-control" placeholder="Ej: CONSULTA EXTERNA, HOSPITALIZACION, AYUDA AL DIAGNOSTICO...">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Área (m²) (*)</label>
            <input type="number" id="add-inf-area" class="form-control" placeholder="0.00" min="0.1" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Valor Total Construcción (S/.) (*)</label>
            <input type="number" id="add-inf-val" class="form-control" placeholder="0.00" min="0" step="100" oninput="CatalogsView.calcInfraCostMin()">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Vida Útil (Años)</label>
            <input type="number" id="add-inf-anios" class="form-control" value="30" min="1" step="1" oninput="CatalogsView.onInfraAniosChange(this.value)">
          </div>
          <div class="form-group">
            <label class="form-label">Vida Útil (Minutos) (*)</label>
            <input type="number" id="add-inf-min" class="form-control" value="15768000" min="1" step="10000" oninput="CatalogsView.calcInfraCostMin()">
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 0.75rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Depreciación por Minuto Calculada:</span>
          <strong id="add-inf-cost-min-badge" style="font-size: 1.05rem; color: var(--primary);">S/. 0.000 / min</strong>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Ambiente',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const servicio = document.getElementById('add-inf-servicio').value.trim();
            const ups = document.getElementById('add-inf-ups').value.trim();
            const cod = document.getElementById('add-inf-cod').value.trim();
            const area = parseFloat(document.getElementById('add-inf-area').value) || 0;
            const val = parseFloat(document.getElementById('add-inf-val').value) || 0;
            const min = parseFloat(document.getElementById('add-inf-min').value) || 0;

            if (!servicio || !ups || area <= 0 || val <= 0 || min <= 0) {
              Toast.warning('Ingresa servicio, UPS, área, valor de construcción y vida útil válida');
              return;
            }

            const depMin = val / min;

            try {
              await API.saveInfraestructura({
                servicio: servicio,
                ups: ups,
                codigo_costeo: cod || null,
                area_m2: area,
                valor_total_upss: val,
                vida_util_minutos: min,
                depreciacion_minuto: depMin
              });
              Toast.success('Ambiente de infraestructura registrado');
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error(`Error al registrar infraestructura: ${err.message}`);
            }
          }
        }
      ]
    });
  },

  onInfraAniosChange(aniosVal) {
    const anios = parseFloat(aniosVal) || 30;
    const totalMin = Math.round(anios * 525600);
    const minInput = document.getElementById('add-inf-min');
    if (minInput) minInput.value = totalMin;
    this.calcInfraCostMin();
  },

  calcInfraCostMin() {
    const val = parseFloat(document.getElementById('add-inf-val')?.value) || 0;
    const min = parseFloat(document.getElementById('add-inf-min')?.value) || 0;
    const badge = document.getElementById('add-inf-cost-min-badge');
    if (badge) {
      const rate = min > 0 ? (val / min) : 0;
      badge.textContent = `S/. ${rate.toFixed(4)} / min`;
    }
  },

  openAddCPMSModal() {
    Modal.open({
      title: 'Registrar Procedimiento CPMS (SUSALUD)',
      contentHtml: `
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Código CPMS (*)</label>
            <input type="text" id="add-cpms-cod" class="form-control" placeholder="Ej: 99201">
          </div>
          <div class="form-group">
            <label class="form-label">Situación / Estado</label>
            <select id="add-cpms-sit" class="form-select">
              <option value="ACTIVO" selected>ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Denominación Oficial del Procedimiento (*)</label>
          <input type="text" id="add-cpms-name" class="form-control" placeholder="Ej: CONSULTA MEDICA DE EVALUACION Y MANEJO DE PACIENTE NUEVO...">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Sección</label>
            <input type="text" id="add-cpms-sec" class="form-control" placeholder="Ej: EVALUACION Y MANEJO">
          </div>
          <div class="form-group">
            <label class="form-label">Subsección</label>
            <input type="text" id="add-cpms-subsec" class="form-control" placeholder="Ej: CONSULTAS EN CONSULTORIO">
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Procedimiento',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const cod = document.getElementById('add-cpms-cod').value.trim();
            const name = document.getElementById('add-cpms-name').value.trim();
            const sec = document.getElementById('add-cpms-sec').value.trim();
            const subsec = document.getElementById('add-cpms-subsec').value.trim();
            const sit = document.getElementById('add-cpms-sit').value;

            if (!cod || !name) {
              Toast.warning('Ingresa código y denominación del procedimiento');
              return;
            }

            try {
              await API.saveCPMS({
                codigo: cod,
                denominacion: name,
                seccion_nombre: sec || null,
                subseccion_nombre: subsec || null,
                situacion: sit
              });
              Toast.success('Procedimiento CPMS registrado');
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error(`Error al registrar CPMS: ${err.message}`);
            }
          }
        }
      ]
    });
  },

  async deleteCPMS(codigo) {
    if (!confirm(`¿Eliminar el procedimiento CPMS ${codigo}?`)) return;
    try {
      await API.deleteCPMS(codigo);
      Toast.success('Procedimiento CPMS eliminado');
      this.loadCurrentTab();
    } catch (e) {
      Toast.error(`Error al eliminar CPMS: ${e.message}`);
    }
  },

  async deleteInsumo(id) {
    if (!confirm('¿Eliminar este insumo del catálogo?')) return;
    try {
      await API.deleteInsumo(id);
      Toast.success('Insumo eliminado');
      this.loadCurrentTab();
    } catch (e) {
      Toast.error('Error al eliminar insumo');
    }
  },

  async deleteEquipo(id) {
    if (!confirm('¿Eliminar este equipo del catálogo?')) return;
    try {
      await API.deleteEquipamiento(id);
      Toast.success('Equipo eliminado');
      this.loadCurrentTab();
    } catch (e) {
      Toast.error('Error al eliminar equipo');
    }
  },

  async deleteRRHH(id) {
    if (!confirm('¿Eliminar este cargo RRHH?')) return;
    try {
      await API.deleteRRHH(id);
      Toast.success('Registro RRHH eliminado');
      this.loadCurrentTab();
    } catch (e) {
      Toast.error('Error al eliminar RRHH');
    }
  },

  async deleteServicio(id) {
    if (!confirm('¿Eliminar este servicio hospitalario?')) return;
    try {
      await API.deleteServicio(id);
      Toast.success('Servicio eliminado');
      this.loadCurrentTab();
    } catch (e) {
      Toast.error(`Error al eliminar servicio: ${e.message}`);
    }
  },

  openAddServiciosBasicosModal() {
    Modal.open({
      title: 'Registrar Nuevo Servicio Básico',
      contentHtml: `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Servicio Básico (Nombre / Descripción) (*)</label>
            <input type="text" id="add-sb-servicio" class="form-control" placeholder="Ej: CONSULTORIO DE PEDIATRIA, TOPICO...">
          </div>
          <div class="form-group">
            <label class="form-label">Código de Costeo</label>
            <input type="text" id="add-sb-cod" class="form-control" placeholder="Ej: CSB-01">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">UPS (Agrupador) (*)</label>
          <input type="text" id="add-sb-ups" class="form-control" placeholder="Ej: CONSULTA EXTERNA, HOSPITALIZACION...">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Área (m²)</label>
            <input type="number" id="add-sb-area" class="form-control" placeholder="0.00" min="0" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Costo Unitario Total PMS (S/.) (*)</label>
            <input type="number" id="add-sb-costo" class="form-control" placeholder="0.0000" min="0" step="0.0001">
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Servicio Básico',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const servicio = document.getElementById('add-sb-servicio').value.trim();
            const ups = document.getElementById('add-sb-ups').value.trim();
            const cod = document.getElementById('add-sb-cod').value.trim();
            const area = parseFloat(document.getElementById('add-sb-area').value) || 0;
            const costo = parseFloat(document.getElementById('add-sb-costo').value) || 0;

            if (!servicio || !ups || costo <= 0) {
              Toast.warning('Ingresa servicio, UPS y costo unitario total PMS válido');
              return;
            }

            try {
              await API.saveServiciosBasicos({
                servicio: servicio,
                ups: ups,
                codigo_costeo: cod || null,
                area_m2: area,
                costo_total_servicio: costo
              });
              Toast.success('Servicio Básico registrado');
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error(`Error al registrar servicio básico: ${err.message}`);
            }
          }
        }
      ]
    });
  },

  openAddCostosIndirectosModal() {
    Modal.open({
      title: 'Registrar Costo Indirecto (UPSS)',
      contentHtml: `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Servicio / Centro de Costo (*)</label>
            <input type="text" id="add-ci-servicio" class="form-control" placeholder="Ej: CONSULTA EXTERNA...">
          </div>
          <div class="form-group">
            <label class="form-label">UPSS (Centro de Costos) / Código</label>
            <input type="text" id="add-ci-cod" class="form-control" placeholder="Ej: UPSS-CE">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">UPS (Agrupador) (*)</label>
          <input type="text" id="add-ci-ups" class="form-control" placeholder="Ej: CONSULTA EXTERNA, HOSPITALIZACION...">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Área (m²)</label>
            <input type="number" id="add-ci-area" class="form-control" placeholder="0.00" min="0" step="0.1">
          </div>
          <div class="form-group">
            <label class="form-label">Producción Óptima Anual (*)</label>
            <input type="number" id="add-ci-prod" class="form-control" placeholder="0" min="0" step="1">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Costo Unit. Admin (S/.)</label>
            <input type="number" id="add-ci-admin" class="form-control" placeholder="0.0000" min="0" step="0.0001" oninput="CatalogsView.calcCITotal()">
          </div>
          <div class="form-group">
            <label class="form-label">Costo Unit. Generales (S/.)</label>
            <input type="number" id="add-ci-gral" class="form-control" placeholder="0.0000" min="0" step="0.0001" oninput="CatalogsView.calcCITotal()">
          </div>
          <div class="form-group">
            <label class="form-label">Costo Unit. Total PMS (S/.) (*)</label>
            <input type="number" id="add-ci-total" class="form-control" placeholder="0.0000" min="0" step="0.0001">
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Costo Indirecto',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const servicio = document.getElementById('add-ci-servicio').value.trim();
            const ups = document.getElementById('add-ci-ups').value.trim();
            const cod = document.getElementById('add-ci-cod').value.trim();
            const area = parseFloat(document.getElementById('add-ci-area').value) || 0;
            const prod = parseFloat(document.getElementById('add-ci-prod').value) || 0;
            const admin = parseFloat(document.getElementById('add-ci-admin').value) || 0;
            const gral = parseFloat(document.getElementById('add-ci-gral').value) || 0;
            let total = parseFloat(document.getElementById('add-ci-total').value) || 0;

            if (!servicio || !ups) {
              Toast.warning('Ingresa servicio y UPS válidos');
              return;
            }
            if (total <= 0 && (admin > 0 || gral > 0)) {
              total = admin + gral;
            }

            try {
              await API.saveCostosIndirectos({
                servicio: servicio,
                ups: ups,
                codigo_upss: cod || null,
                area_m2: area,
                produccion_optima_anual: prod,
                costo_unit_admin: admin,
                costo_unit_generales: gral,
                costo_unit_total_pms: total
              });
              Toast.success('Costo Indirecto registrado');
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error(`Error al registrar costo indirecto: ${err.message}`);
            }
          }
        }
      ]
    });
  },

  calcCITotal() {
    const admin = parseFloat(document.getElementById('add-ci-admin')?.value) || 0;
    const gral = parseFloat(document.getElementById('add-ci-gral')?.value) || 0;
    const totalInput = document.getElementById('add-ci-total');
    if (totalInput && (admin > 0 || gral > 0)) {
      totalInput.value = (admin + gral).toFixed(4);
    }
  },

  async deleteServiciosBasicos(id) {
    if (!confirm('¿Eliminar este registro de servicios básicos?')) return;
    try {
      await API.deleteServiciosBasicos(id);
      Toast.success('Servicio básico eliminado');
      this.loadCurrentTab();
    } catch (e) {
      Toast.error(`Error al eliminar servicio básico: ${e.message}`);
    }
  },

  async deleteCostosIndirectos(id) {
    if (!confirm('¿Eliminar este registro de costos indirectos?')) return;
    try {
      await API.deleteCostosIndirectos(id);
      Toast.success('Costo indirecto eliminado');
      this.loadCurrentTab();
    } catch (e) {
      Toast.error(`Error al eliminar costo indirecto: ${e.message}`);
    }
  },

  async deleteInfraestructura(id) {
    if (!confirm('¿Eliminar este ambiente de infraestructura?')) return;
    try {
      await API.deleteInfraestructura(id);
      Toast.success('Ambiente de infraestructura eliminado');
      this.loadCurrentTab();
    } catch (e) {
      Toast.error(`Error al eliminar infraestructura: ${e.message}`);
    }
  },

  async openEditServiceCCModal(serviceIndex) {
    const item = this._currentServicios ? this._currentServicios[serviceIndex] : null;
    if (!item) return;

    Toast.info('Cargando centros de costo...');
    let allCCs = [];
    try {
      allCCs = await API.getCentrosCostosEquipamiento();
    } catch (e) {
      Toast.error('Error al cargar centros de costo');
      return;
    }

    let currentSelected = [];
    try {
      if (item.centros_costo_equipamiento) {
        currentSelected = JSON.parse(item.centros_costo_equipamiento);
      }
    } catch (e) {}

    const selectedSet = new Set(currentSelected);

    Modal.open({
      title: `Centros de Costo de Equipos: ${item.nombre_servicio}`,
      contentHtml: `
        <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 6px; border: 1px solid var(--border);">
          <div style="font-size: 0.85rem; color: var(--text-muted);">Servicio Seleccionado:</div>
          <strong style="font-size: 1rem; color: var(--primary);">${item.nombre_servicio}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">UPS: <span class="badge badge-info">${item.ups}</span></div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
            Los equipos asociados a los centros de costo seleccionados aparecerán automáticamente cuando el usuario cotice este servicio.
          </p>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
          <input type="text" id="cc-search-input" class="form-control form-control-sm" placeholder="🔍 Filtrar centros de costo..." oninput="CatalogsView.filterCCList(this.value)">
          <button type="button" class="btn btn-secondary btn-sm" onclick="CatalogsView.selectAllCC(true)" style="white-space: nowrap;">Todos</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="CatalogsView.selectAllCC(false)" style="white-space: nowrap;">Ninguno</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="CatalogsView.suggestAndApplyCC('${item.nombre_servicio.replace(/'/g, "\\'")}', '${item.ups.replace(/'/g, "\\'")}')" style="white-space: nowrap;" title="Calcular coincidencia por nombre">Sugerir</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
          <span id="cc-selection-count">${selectedSet.size} de ${allCCs.length} centros de costo seleccionados</span>
          <span style="font-style: italic;">Total: ${allCCs.reduce((acc, c) => acc + (c.total_equipos || c.count || 0), 0)} equipos en catálogo</span>
        </div>

        <div id="cc-items-container" style="max-height: 280px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem;">
          ${allCCs.map((cc) => {
            const ccName = cc.nombre || cc.centro_costos || '';
            const ccCount = cc.total_equipos || cc.count || 0;
            const isChecked = selectedSet.has(ccName);
            return `
              <label class="cc-item-row" data-name="${ccName.toLowerCase()}" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-bottom: 1px solid #f1f5f9; cursor: pointer; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                  <input type="checkbox" class="cc-checkbox" value="${ccName}" ${isChecked ? 'checked' : ''} onchange="CatalogsView.updateCCSelectionCounter()">
                  <span style="font-size: 0.85rem; font-weight: 500;">${ccName}</span>
                </div>
                <span class="badge badge-slate" style="font-size: 0.72rem; margin-left: 8px;">${ccCount} equipos</span>
              </label>
            `;
          }).join('')}
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Relación',
          class: 'btn-primary',
          icon: Icons.save,
          onClick: async (e, m) => {
            const checkedCheckboxes = document.querySelectorAll('.cc-checkbox:checked');
            const selectedList = Array.from(checkedCheckboxes).map(cb => cb.value);

            try {
              await API.updateServicioCentrosCostos(item.id, selectedList);
              Toast.success(`Relación de ${selectedList.length} centro(s) de costo guardada`);
              m.close();
              CatalogsView.loadCurrentTab();
            } catch (err) {
              console.error(err);
              Toast.error('Error al guardar centros de costo');
            }
          }
        }
      ]
    });
  },

  filterCCList(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.cc-item-row');
    rows.forEach(r => {
      const name = r.getAttribute('data-name') || '';
      r.style.display = name.includes(q) ? 'flex' : 'none';
    });
  },

  selectAllCC(selectAll) {
    const checkboxes = document.querySelectorAll('.cc-checkbox');
    checkboxes.forEach(cb => {
      const row = cb.closest('.cc-item-row');
      if (!row || row.style.display !== 'none') {
        cb.checked = selectAll;
      }
    });
    this.updateCCSelectionCounter();
  },

  updateCCSelectionCounter() {
    const total = document.querySelectorAll('.cc-checkbox').length;
    const checked = document.querySelectorAll('.cc-checkbox:checked').length;
    const label = document.getElementById('cc-selection-count');
    if (label) {
      label.textContent = `${checked} de ${total} centros de costo seleccionados`;
    }
  },

  suggestAndApplyCC(serviceName, upsName) {
    const normalize = (t) => (t || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9\s]/g, " ");
    const normS = normalize(serviceName);
    const normU = normalize(upsName);

    const checkboxes = document.querySelectorAll('.cc-checkbox');
    let matchedCount = 0;

    checkboxes.forEach(cb => {
      const normCC = normalize(cb.value);
      let match = false;

      if (normS.includes('REHABILITACION') && normCC.includes('REHABILITACION')) match = true;
      else if ((normS.includes('LABORATORIO') || normS.includes('BIOQUIMICA') || normS.includes('MICROBIOLOGIA') || normS.includes('HEMATOLOGIA') || normS.includes('PATOLOGIA') || normS.includes('INMUNOLOGIA')) && (normCC.includes('LABORATORIO') || normCC.includes('BANCO DE SANGRE'))) match = true;
      else if ((normS.includes('RAYOS') || normS.includes('RADIOLOGIA') || normS.includes('IMAGEN') || normS.includes('ECOGRAFIA') || normS.includes('TOMOGRAFIA')) && (normCC.includes('RAYOS') || normCC.includes('ECOGRAFIA') || normCC.includes('TOMOGRAFO') || normCC.includes('IMAGENOLOGIA'))) match = true;
      else if ((normS.includes('QUIRURG') || normS.includes('SALA DE OPERACIONES') || normS.includes('CIRUGIA') || normS.includes('ANESTESIA')) && (normCC.includes('QUIRURGICO') || normCC.includes('CIRUGIA'))) match = true;
      else if ((normS.includes('EMERGENCIA') || normS.includes('TRAUMASHOCK') || normS.includes('TOPICO')) && normCC.includes('EMERGENCIA')) match = true;
      else if ((normS.includes('HOSPITALIZACION') || normS.includes('MEDICINA INTERNA') || normS.includes('PEDIATRIA') || normS.includes('GINECO')) && (normCC.includes('MEDICINA') || normCC.includes('HOSPITALIZACION') || normCC.includes('GINECOLOGIA') || normCC.includes('PEDIATRIA'))) match = true;
      else if (normCC.includes(normS) || normS.includes(normCC)) match = true;
      else {
        const wordsS = normS.split(/\s+/).filter(w => w.length >= 4 && !['CONSULTORIO','SERVICIO','AREA','HOSPITAL','DEPARTAMENTO','UNIDAD','PARA'].includes(w));
        for (const w of wordsS) {
          if (normCC.includes(w)) {
            match = true;
            break;
          }
        }
      }

      cb.checked = match;
      if (match) matchedCount++;
    });

    this.updateCCSelectionCounter();
    Toast.info(`Sugerencia aplicada: ${matchedCount} centro(s) coincidente(s)`);
  }
};
