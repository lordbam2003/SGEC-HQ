/**
 * Vista de Matriz Resumen de Costos (MATRIZ RESUMEN)
 */
const MatrixView = {
  currentUPSS: '',
  searchQuery: '',

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 class="view-title">MATRIZ RESUMEN DE ESTRUCTURAS DE COSTOS</h2>
          <p class="view-subtitle">Consolidado general de costos directos, indirectos y totales por procedimiento y UPSS.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <a id="btn-export-matrix" href="/api/matrix/export-excel" class="btn btn-secondary" target="_blank">
            ${Icons.download} Exportar a Excel Oficial
          </a>
          <button class="btn btn-primary" onclick="App.navigate('studio')">
            ${Icons.plus} Nuevo Procedimiento
          </button>
        </div>
      </div>

      <!-- Filtros de Búsqueda -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; align-items: center;">
          <div class="search-input-wrap">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="matrix-search-input" class="form-control" placeholder="Buscar por código CPMS o denominación..." oninput="MatrixView.onSearch(this.value)">
          </div>
          <div>
            <select id="matrix-filter-upss" class="form-select" onchange="MatrixView.onFilterUPSS(this.value)">
              <option value="">Todas las UPSS / Servicios</option>
            </select>
          </div>
          <div style="text-align: right; color: var(--text-muted); font-size: 0.85rem;" id="matrix-count-label">
            Cargando registros...
          </div>
        </div>
      </div>

      <!-- Tabla Consolidada Matriz Resumen -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive" style="border: none;">
          <table class="data-table" id="matrix-table" style="font-size: 0.82rem;">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">N°</th>
                <th style="width: 100px;">CPMS</th>
                <th style="min-width: 260px;">Procedimiento Médico y Sanitario</th>
                <th>UPSS</th>
                <th>Costo RRHH</th>
                <th>Costo Equipos</th>
                <th>Costo Infraest.</th>
                <th>Costo Insumos</th>
                <th>Costo Serv.</th>
                <th style="background: #e2e8f0; color: var(--primary-dark);">Costo Directo</th>
                <th>Gtos Admin</th>
                <th>Gtos Grales</th>
                <th style="background: #e2e8f0; color: var(--secondary);">Costo Indirecto</th>
                <th style="background: var(--primary-light); color: var(--primary-dark);">Costo Total Estándar</th>
                <th style="width: 90px; text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody id="matrix-tbody">
              <tr><td colspan="15" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">Cargando Matriz Resumen...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadUPSSFilter();
    await this.loadMatrixData();
  },

  async loadUPSSFilter() {
    try {
      const infra = await API.getInfraestructura();
      const grouped = {};
      infra.forEach(i => {
        const ups = i.ups || 'GENERAL';
        if (!grouped[ups]) grouped[ups] = new Set();
        grouped[ups].add(i.servicio);
      });

      const select = document.getElementById('matrix-filter-upss');
      let html = `<option value="">-- SELECCIONE UPSS / SERVICIO --</option>`;
      for (const [upsName, servSet] of Object.entries(grouped)) {
        html += `<optgroup label="📂 ${upsName}">`;
        Array.from(servSet).sort().forEach(s => {
          html += `<option value="${s}">${s}</option>`;
        });
        html += `</optgroup>`;
      }
      select.innerHTML = html;
    } catch (e) {
      console.error(e);
    }
  },

  async loadMatrixData() {
    try {
      const list = await API.getMatrix(this.currentUPSS, this.searchQuery);
      const tbody = document.getElementById('matrix-tbody');
      document.getElementById('matrix-count-label').textContent = `${list.length} procedimientos costeados`;

      // Update export link
      const exportBtn = document.getElementById('btn-export-matrix');
      exportBtn.href = `/api/matrix/export-excel?upss=${encodeURIComponent(this.currentUPSS || '')}`;

      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="17" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No se encontraron procedimientos costeados con los filtros seleccionados.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map((item, idx) => `
        <tr>
          <td style="text-align: center; color: var(--text-muted);">${idx + 1}</td>
          <td><strong style="color: var(--primary);">${item.codigo_cpms}</strong></td>
          <td>
            <div style="font-weight: 600; max-width: 280px;" title="${item.nombre_procedimiento}">
              ${item.nombre_procedimiento}
            </div>
          </td>
          <td><span class="badge badge-slate" style="font-size: 0.72rem;">${item.upss_servicio || 'General'}</span></td>
          <td>S/. ${item.costo_rrhh.toFixed(3)}</td>
          <td>S/. ${item.costo_equipos.toFixed(3)}</td>
          <td>S/. ${item.costo_infraestructura.toFixed(3)}</td>
          <td>S/. ${item.costo_insumos.toFixed(3)}</td>
          <td>S/. ${item.costo_servicios.toFixed(3)}</td>
          <td style="background: #f8fafc;"><strong style="color: var(--primary-dark);">S/. ${item.costo_directo.toFixed(3)}</strong></td>
          <td>S/. ${item.gastos_admin.toFixed(3)}</td>
          <td>S/. ${item.gastos_generales.toFixed(3)}</td>
          <td style="background: #f8fafc;"><strong style="color: var(--secondary);">S/. ${item.costo_indirecto.toFixed(3)}</strong></td>
          <td style="background: #f0fdfa;"><strong style="color: var(--primary-dark); font-size: 0.88rem;">S/. ${item.costo_total_estandar.toFixed(3)}</strong></td>
          <td>
            <div style="display: flex; gap: 0.25rem; justify-content: center;">
              <button class="btn btn-secondary btn-sm btn-icon" onclick="App.editCosting(${item.id})" title="Editar Hoja de Costeo">
                ${Icons.edit}
              </button>
              <a href="/api/costing/${item.id}/export-excel" class="btn btn-secondary btn-sm btn-icon" title="Descargar Excel Oficial">
                ${Icons.download}
              </a>
              <button class="btn btn-danger btn-sm btn-icon" onclick="MatrixView.deleteProcedure(${item.id})" title="Eliminar">
                ${Icons.trash}
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
      Toast.error('No se pudo cargar la Matriz Resumen');
    }
  },

  onSearch(val) {
    this.searchQuery = val;
    this.loadMatrixData();
  },

  onFilterUPSS(val) {
    this.currentUPSS = val;
    this.loadMatrixData();
  },

  async deleteProcedure(id) {
    if (!confirm('¿Estás seguro de eliminar esta hoja de costeo? Esta acción no se puede deshacer.')) return;
    try {
      await API.deleteCosting(id);
      Toast.success('Procedimiento eliminado correctamente');
      this.loadMatrixData();
    } catch (e) {
      console.error(e);
      Toast.error('Error al eliminar procedimiento');
    }
  }
};
