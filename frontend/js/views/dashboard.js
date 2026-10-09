/**
 * Vista de Dashboard / Panel Principal
 */
const DashboardView = {
  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <h2 class="view-title">Panel de Control &mdash; SGEC-HQ</h2>
          <p class="view-subtitle">Hospital Quillabamba | Gestión integral de costos estándar por procedimientos, análisis de tarifas y matrices CPMS.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-primary" onclick="App.navigate('studio')">
            ${Icons.plus} Nuevo Costeo
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('catalogs')">
            ${Icons.upload} Actualizar Catálogos
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" style="cursor: pointer;" onclick="App.navigate('sheets')" title="Ir al Gestor de Hojas de Costeo">
          <div class="kpi-icon-wrap kpi-icon-teal">${Icons.calculator}</div>
          <div class="kpi-data">
            <h4>Procedimientos Costeados</h4>
            <p id="kpi-costeos">0</p>
          </div>
        </div>
        <div class="kpi-card" style="cursor: pointer;" onclick="App.navigate('catalogs')" title="Ver Catálogo CPMS">
          <div class="kpi-icon-wrap kpi-icon-blue">${Icons.hospital}</div>
          <div class="kpi-data">
            <h4>Catálogo CPMS (SUSALUD)</h4>
            <p id="kpi-cpms">0</p>
          </div>
        </div>
        <div class="kpi-card" style="cursor: pointer;" onclick="App.navigate('catalogs')" title="Ver Catálogo de Insumos">
          <div class="kpi-icon-wrap kpi-icon-indigo">${Icons.box}</div>
          <div class="kpi-data">
            <h4>Insumos Registrados</h4>
            <p id="kpi-insumos">0</p>
          </div>
        </div>
        <div class="kpi-card" style="cursor: pointer;" onclick="App.navigate('catalogs')" title="Ver Catálogo de RRHH">
          <div class="kpi-icon-wrap kpi-icon-amber">${Icons.users}</div>
          <div class="kpi-data">
            <h4>Grupos RRHH</h4>
            <p id="kpi-rrhh">0</p>
          </div>
        </div>
      </div>

      <!-- Accesos Rápidos & Procedimientos Recientes -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
        <!-- Lista Reciente -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${Icons.calculator} Hojas de Costeo Recientes</h3>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('sheets')">
                Gestor de Hojas 📄
              </button>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('matrix')">
                Matriz ${Icons.table}
              </button>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Código CPMS</th>
                  <th>Procedimiento</th>
                  <th>UPSS / Servicio</th>
                  <th>Tiempo</th>
                  <th>Costo Total</th>
                  <th>Tarifa Sugerida</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="recent-costings-tbody">
                <tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">Cargando procedimientos...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tarjeta Informativa de Metodología -->
        <div class="card" style="background: linear-gradient(180deg, #ffffff, #f8fafc);">
          <div class="card-header">
            <h3 class="card-title">${Icons.info} Formatos Oficiales</h3>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            El sistema genera en tiempo real los cuatro formatos normados por la metodología de costeo en salud:
          </p>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="padding: 0.75rem; background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="App.navigate('studio')">
              <div>
                <strong style="font-size: 0.85rem; color: var(--primary);">1. MODELO_HOJA_COSTEO</strong>
                <p style="font-size: 0.75rem; color: var(--text-muted);">Desglose detallado por fases y factores</p>
              </div>
              <span class="badge badge-primary">Editor</span>
            </div>
            <div style="padding: 0.75rem; background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="App.navigate('matrix')">
              <div>
                <strong style="font-size: 0.85rem; color: var(--secondary);">2. MATRIZ RESUMEN</strong>
                <p style="font-size: 0.75rem; color: var(--text-muted);">Consolidado institucional por UPSS</p>
              </div>
              <span class="badge badge-info">Matriz</span>
            </div>
            <div style="padding: 0.75rem; background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="App.navigate('tariffs')">
              <div>
                <strong style="font-size: 0.85rem; color: var(--accent);">3. Propuesta Tarifaria</strong>
                <p style="font-size: 0.75rem; color: var(--text-muted);">Tr, Tpu, SIS, IAFAS</p>
              </div>
              <span class="badge badge-success">Tarifario</span>
            </div>
            <div style="padding: 0.75rem; background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="App.navigate('market')">
              <div>
                <strong style="font-size: 0.85rem; color: #b45309;">4. ESTUDIO DE MERCADO</strong>
                <p style="font-size: 0.75rem; color: var(--text-muted);">Comparativa de centros de referencia</p>
              </div>
              <span class="badge badge-warning">Mercado</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.loadStats();
  },

  async loadStats() {
    try {
      const stats = await API.getDashboardStats();
      document.getElementById('kpi-costeos').textContent = stats.total_costeos;
      document.getElementById('kpi-cpms').textContent = stats.total_cpms.toLocaleString();
      document.getElementById('kpi-insumos').textContent = stats.total_insumos.toLocaleString();
      document.getElementById('kpi-rrhh').textContent = stats.total_rrhh;

      const tbody = document.getElementById('recent-costings-tbody');
      if (!stats.recent_costings || stats.recent_costings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No hay procedimientos creados aún. Haz clic en "Nuevo Costeo" para comenzar.</td></tr>`;
        return;
      }

      tbody.innerHTML = stats.recent_costings.map(c => `
        <tr>
          <td><strong style="color: var(--primary);">${c.codigo_cpms}</strong></td>
          <td>
            <div style="font-weight: 600; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.nombre_procedimiento}">
              ${c.nombre_procedimiento}
            </div>
          </td>
          <td><span class="badge badge-slate">${c.upss_servicio || 'General'}</span></td>
          <td>${c.tiempo_total_minutos} min</td>
          <td><strong>S/. ${c.costo_total_estandar.toFixed(3)}</strong></td>
          <td><strong style="color: var(--primary-dark);">S/. ${c.tarifa_referencial.toFixed(3)}</strong></td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.editCosting(${c.id})" title="Editar Hoja de Costeo">
                ${Icons.edit}
              </button>
              <a href="/api/costing/${c.id}/export-excel" class="btn btn-secondary btn-sm" title="Descargar Excel">
                ${Icons.download}
              </a>
            </div>
          </td>
        </tr>
      `).join('');

    } catch (e) {
      console.error(e);
      Toast.error('No se pudieron cargar las estadísticas del panel');
    }
  }
};
