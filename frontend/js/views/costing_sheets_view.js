/**
 * Vista de Gestión de Hojas de Costeo (Historial y Catálogo de Procedimientos Costeados)
 */
const CostingSheetsView = {
  currentFilterUPSS: '',
  currentFilterEstado: '',
  searchQuery: '',
  costingsList: [],

  async render(container) {
    const hasDraft = localStorage.getItem('costeo_studio_draft_state') !== null;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h2 class="view-title">Gestor de Hojas de Costeo</h2>
          <p class="view-subtitle">Historial y catálogo general de procedimientos costeados, control de estado y exportación oficial.</p>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${hasDraft ? `
            <button class="btn btn-secondary" onclick="App.navigate('studio')" style="border-color: #3b82f6; color: #1d4ed8; background: #eff6ff;">
              📌 Continuar Borrador Activo
            </button>
          ` : ''}
          <button class="btn btn-primary" onclick="CostingStudioView.clearDraft(false); App.navigate('studio');">
            ${Icons.plus} Nueva Hoja de Costeo
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid" style="margin-bottom: 1.25rem;">
        <div class="kpi-card" style="padding: 1rem;">
          <div class="kpi-icon-wrap kpi-icon-teal">${Icons.calculator}</div>
          <div class="kpi-data">
            <h4 style="font-size: 0.8rem;">Total Costeos</h4>
            <p id="kpi-sheets-total" style="font-size: 1.4rem;">0</p>
          </div>
        </div>
        <div class="kpi-card" style="padding: 1rem;">
          <div class="kpi-icon-wrap kpi-icon-amber" style="background: #fef3c7; color: #d97706;">${Icons.edit}</div>
          <div class="kpi-data">
            <h4 style="font-size: 0.8rem;">En Borrador</h4>
            <p id="kpi-sheets-draft" style="font-size: 1.4rem; color: #d97706;">0</p>
          </div>
        </div>
        <div class="kpi-card" style="padding: 1rem;">
          <div class="kpi-icon-wrap kpi-icon-blue" style="background: #dbeafe; color: #2563eb;">${Icons.info}</div>
          <div class="kpi-data">
            <h4 style="font-size: 0.8rem;">En Revisión</h4>
            <p id="kpi-sheets-review" style="font-size: 1.4rem; color: #2563eb;">0</p>
          </div>
        </div>
        <div class="kpi-card" style="padding: 1rem;">
          <div class="kpi-icon-wrap kpi-icon-green" style="background: #d1fae5; color: #059669;">${Icons.check}</div>
          <div class="kpi-data">
            <h4 style="font-size: 0.8rem;">Aprobados / Finales</h4>
            <p id="kpi-sheets-approved" style="font-size: 1.4rem; color: #059669;">0</p>
          </div>
        </div>
      </div>

      <!-- Filtros & Pestañas de Estado -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 0.75rem;">
          <!-- Tabs de Estado -->
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;" id="estado-filter-tabs">
            <button class="btn btn-sm ${this.currentFilterEstado === '' ? 'btn-primary' : 'btn-secondary'}" onclick="CostingSheetsView.setFilterEstado('')">
              Todos (<span id="tab-count-all">0</span>)
            </button>
            <button class="btn btn-sm ${this.currentFilterEstado === 'BORRADOR' ? 'btn-primary' : 'btn-secondary'}" onclick="CostingSheetsView.setFilterEstado('BORRADOR')">
              📝 Borradores (<span id="tab-count-draft">0</span>)
            </button>
            <button class="btn btn-sm ${this.currentFilterEstado === 'EN_REVISION' ? 'btn-primary' : 'btn-secondary'}" onclick="CostingSheetsView.setFilterEstado('EN_REVISION')">
              🔍 En Revisión (<span id="tab-count-review">0</span>)
            </button>
            <button class="btn btn-sm ${this.currentFilterEstado === 'APROBADO' ? 'btn-primary' : 'btn-secondary'}" onclick="CostingSheetsView.setFilterEstado('APROBADO')">
              ✅ Aprobados (<span id="tab-count-approved">0</span>)
            </button>
          </div>

          <div style="font-size: 0.82rem; color: var(--text-muted);" id="sheets-count-label">
            Cargando registros...
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; align-items: center;">
          <div class="search-input-wrap">
            <span class="search-icon">${Icons.search}</span>
            <input type="text" id="sheets-search-input" class="form-control" placeholder="Buscar por código CPMS, nombre o servicio..." value="${this.searchQuery}" oninput="CostingSheetsView.onSearch(this.value)">
          </div>
          <div>
            <select id="sheets-filter-upss" class="form-select" onchange="CostingSheetsView.onFilterUPSS(this.value)">
              <option value="">Todas las UPSS / Servicios</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabla de Hojas de Costeo -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive" style="border: none;">
          <table class="data-table" id="sheets-table" style="font-size: 0.82rem;">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">N°</th>
                <th style="width: 90px;">Código</th>
                <th style="min-width: 240px;">Procedimiento Médico</th>
                <th>UPSS / Servicio</th>
                ${API.isAdmin() ? '<th>Responsable</th>' : ''}
                <th style="text-align: center;">Actividades / Tiempo</th>
                <th>Costo Directo</th>
                <th>Costo Indirecto</th>
                <th style="background: var(--primary-light); color: var(--primary-dark);">Costo Total</th>
                <th>Tarifa No Asegurados</th>
                <th>Tarifa IAFAS</th>
                <th style="width: 130px; text-align: center;">Estado</th>
                <th style="width: 140px; text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody id="sheets-tbody">
              <tr><td colspan="${API.isAdmin() ? 13 : 12}" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">Cargando hojas de costeo...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadUPSSFilter();
    await this.loadSheets();
  },

  async loadUPSSFilter() {
    try {
      const servicios = await API.getAllServicios();
      const select = document.getElementById('sheets-filter-upss');
      if (!select) return;

      const grouped = {};
      servicios.forEach(s => {
        const ups = s.ups || 'GENERAL';
        if (!grouped[ups]) grouped[ups] = [];
        grouped[ups].push(s.nombre_servicio);
      });

      let html = `<option value="">-- TODAS LAS UPSS / SERVICIOS --</option>`;
      for (const [upsName, servList] of Object.entries(grouped)) {
        html += `<optgroup label="📂 ${upsName}">`;
        Array.from(new Set(servList)).sort().forEach(srv => {
          const isSel = srv === this.currentFilterUPSS;
          html += `<option value="${srv}" ${isSel ? 'selected' : ''}>${srv}</option>`;
        });
        html += `</optgroup>`;
      }
      select.innerHTML = html;
    } catch (e) {
      console.error(e);
    }
  },

  async loadSheets() {
    try {
      const list = await API.listCostings(this.searchQuery, this.currentFilterUPSS, this.currentFilterEstado);
      this.costingsList = list || [];

      // Update counters
      const allItems = await API.listCostings('', '', '');
      const totalCount = allItems.length;
      const draftCount = allItems.filter(c => c.estado === 'BORRADOR').length;
      const reviewCount = allItems.filter(c => c.estado === 'EN_REVISION').length;
      const approvedCount = allItems.filter(c => c.estado === 'APROBADO' || c.estado === 'FINALIZADO').length;

      const kpiTotal = document.getElementById('kpi-sheets-total');
      if (kpiTotal) kpiTotal.textContent = totalCount;
      const kpiDraft = document.getElementById('kpi-sheets-draft');
      if (kpiDraft) kpiDraft.textContent = draftCount;
      const kpiReview = document.getElementById('kpi-sheets-review');
      if (kpiReview) kpiReview.textContent = reviewCount;
      const kpiApproved = document.getElementById('kpi-sheets-approved');
      if (kpiApproved) kpiApproved.textContent = approvedCount;

      const tabAll = document.getElementById('tab-count-all');
      if (tabAll) tabAll.textContent = totalCount;
      const tabDraft = document.getElementById('tab-count-draft');
      if (tabDraft) tabDraft.textContent = draftCount;
      const tabReview = document.getElementById('tab-count-review');
      if (tabReview) tabReview.textContent = reviewCount;
      const tabApproved = document.getElementById('tab-count-approved');
      if (tabApproved) tabApproved.textContent = approvedCount;

      const countLabel = document.getElementById('sheets-count-label');
      if (countLabel) countLabel.textContent = `Mostrando ${this.costingsList.length} de ${totalCount} hojas`;

      const tbody = document.getElementById('sheets-tbody');
      if (!tbody) return;

      if (!this.costingsList || this.costingsList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📄</div>
              <p style="font-weight: 600; margin-bottom: 0.25rem;">No se encontraron hojas de costeo</p>
              <p style="font-size: 0.8rem; margin-bottom: 1rem;">No hay procedimientos que coincidan con los filtros seleccionados.</p>
              <button class="btn btn-primary btn-sm" onclick="App.navigate('studio')">
                ${Icons.plus} Crear Primer Costeo
              </button>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = this.costingsList.map((item, idx) => {
        const numFases = item.fases ? item.fases.length : 1;
        let estadoBadgeClass = 'badge-slate';
        let estadoLabel = item.estado || 'BORRADOR';
        if (item.estado === 'BORRADOR') estadoBadgeClass = 'badge-warning';
        else if (item.estado === 'EN_REVISION') estadoBadgeClass = 'badge-info';
        else if (item.estado === 'APROBADO' || item.estado === 'FINALIZADO') estadoBadgeClass = 'badge-success';

        return `
          <tr>
            <td style="text-align: center; color: var(--text-muted);">${idx + 1}</td>
            <td>
              <strong style="color: var(--primary); font-family: monospace; font-size: 0.88rem;">${item.codigo_cpms}</strong>
            </td>
            <td>
              <div style="font-weight: 600; max-width: 260px;" title="${item.nombre_procedimiento}">
                ${item.nombre_procedimiento}
              </div>
            </td>
            <td>
              <span class="badge badge-slate" style="font-size: 0.72rem;">${item.upss_servicio || 'General'}</span>
            </td>
            ${API.isAdmin() ? `
              <td>
                <span class="badge" style="background: #f1f5f9; color: #475569; font-size: 0.72rem; font-weight: 600;">
                  👤 ${item.usuario?.nombre_completo || 'Administrador'}
                </span>
              </td>
            ` : ''}
            <td style="text-align: center;">
              <span style="font-weight: 600;">${numFases} act.</span>
              <br><small style="color: var(--text-muted);">${item.tiempo_total_minutos} min</small>
            </td>
            <td>S/. ${item.costo_directo.toFixed(3)}</td>
            <td>S/. ${item.costo_indirecto.toFixed(3)}</td>
            <td style="background: #f0fdfa;">
              <strong style="color: var(--primary-dark); font-size: 0.88rem;">S/. ${item.costo_total_estandar.toFixed(3)}</strong>
            </td>
            <td>S/. ${item.tarifa_no_asegurados.toFixed(3)}</td>
            <td><strong style="color: var(--color-accent-hover);">S/. ${item.tarifa_privados.toFixed(3)}</strong></td>
            <td style="text-align: center;">
              <select class="form-select" style="font-size: 0.72rem; padding: 0.2rem 0.4rem; border-radius: var(--radius-sm); font-weight: 600;" onchange="CostingSheetsView.changeStatus(${item.id}, this.value)">
                <option value="BORRADOR" ${item.estado === 'BORRADOR' ? 'selected' : ''}>📝 Borrador</option>
                <option value="EN_REVISION" ${item.estado === 'EN_REVISION' ? 'selected' : ''}>🔍 En Revisión</option>
                <option value="APROBADO" ${item.estado === 'APROBADO' ? 'selected' : ''}>✅ Aprobado</option>
              </select>
            </td>
            <td>
              <div style="display: flex; gap: 0.3rem; justify-content: center;">
                <button class="btn btn-secondary btn-sm btn-icon" onclick="App.editCosting(${item.id})" title="Editar en Costing Studio">
                  ${Icons.edit}
                </button>
                <button class="btn btn-secondary btn-sm btn-icon" onclick="CostingSheetsView.openPreviewModal(${item.id})" title="Ficha Técnica / Resumen">
                  ${Icons.info}
                </button>
                <button class="btn btn-secondary btn-sm btn-icon" onclick="CostingSheetsView.cloneProcedure(${item.id})" title="Duplicar">
                  ${Icons.copy}
                </button>
                <a href="/api/costing/${item.id}/export-excel" class="btn btn-secondary btn-sm btn-icon" title="Descargar Excel Oficial">
                  ${Icons.download}
                </a>
                <button class="btn btn-danger btn-sm btn-icon" onclick="CostingSheetsView.deleteProcedure(${item.id})" title="Eliminar">
                  ${Icons.trash}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
      Toast.error('No se pudieron cargar las hojas de costeo');
    }
  },

  onSearch(val) {
    this.searchQuery = val;
    this.loadSheets();
  },

  onFilterUPSS(val) {
    this.currentFilterUPSS = val;
    this.loadSheets();
  },

  setFilterEstado(estado) {
    this.currentFilterEstado = estado;
    if (App.contentEl && App.currentView === 'sheets') {
      this.render(App.contentEl);
    }
  },

  async changeStatus(id, newStatus) {
    try {
      await API.updateCostingStatus(id, newStatus);
      Toast.success(`Estado actualizado a ${newStatus}`);
      this.loadSheets();
    } catch (e) {
      console.error(e);
      Toast.error('Error al actualizar estado');
    }
  },

  async cloneProcedure(id) {
    try {
      const cloned = await API.cloneCosting(id);
      Toast.success('Hoja de costeo duplicada con éxito');
      this.loadSheets();
    } catch (e) {
      console.error(e);
      Toast.error('Error al duplicar hoja de costeo');
    }
  },

  async deleteProcedure(id) {
    if (!confirm('¿Estás seguro de eliminar esta hoja de costeo? Esta acción es irreversible.')) return;
    try {
      await API.deleteCosting(id);
      Toast.success('Hoja de costeo eliminada correctamente');
      this.loadSheets();
    } catch (e) {
      console.error(e);
      Toast.error('Error al eliminar hoja de costeo');
    }
  },

  async openPreviewModal(id) {
    try {
      const data = await API.getCostingDetail(id);
      if (!data) return;

      const phasesHtml = (data.fases && data.fases.length > 0) ? data.fases.map((f, fIdx) => `
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 0.75rem; overflow: hidden;">
          <div style="background: #f8fafc; padding: 0.6rem 0.85rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
            <strong style="font-size: 0.85rem; color: var(--primary-dark);">Actividad ${f.orden || (fIdx + 1)}: ${f.nombre_fase} (${f.tiempo_minutos} min)</strong>
            <span class="badge badge-primary">Subtotal: S/. ${f.subtotal_fase.toFixed(3)}</span>
          </div>
          <div style="padding: 0.6rem 0.85rem; font-size: 0.78rem;">
            ${f.descripcion_actividad ? `<p style="color: var(--text-muted); margin-bottom: 0.4rem;"><em>${f.descripcion_actividad}</em></p>` : ''}
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; background: #fafbfc; padding: 0.4rem; border-radius: var(--radius-sm);">
              <div>RRHH: <strong>S/. ${f.subtotal_rrhh.toFixed(3)}</strong> (${f.rrhh_items?.length || 0} cargos)</div>
              <div>Insumos: <strong>S/. ${f.subtotal_insumos.toFixed(3)}</strong> (${f.insumo_items?.length || 0} ítems)</div>
              <div>Equipos: <strong>S/. ${f.subtotal_equipos.toFixed(3)}</strong> (${f.equipo_items?.length || 0} equipos)</div>
            </div>
          </div>
        </div>
      `).join('') : '<p style="color: var(--text-muted);">Sin actividades registradas.</p>';

      Modal.open({
        title: `Ficha Técnica: [${data.codigo_cpms}] ${data.nombre_procedimiento}`,
        contentHtml: `
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div style="background: #f8fafc; padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">UPSS / Servicio Asignado</span>
              <p style="font-weight: 600; font-size: 0.95rem; margin-top: 0.2rem; color: var(--text-main);">${data.upss_servicio || 'Servicio General'}</p>
              <div style="display: flex; gap: 1rem; margin-top: 0.4rem; font-size: 0.78rem; color: var(--text-muted);">
                <span>Tiempo Total: <strong>${data.tiempo_total_minutos} min</strong></span>
                <span>Estado: <strong class="badge badge-primary">${data.estado || 'BORRADOR'}</strong></span>
              </div>
            </div>
            <div style="background: var(--primary-light); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--primary); text-align: center;">
              <span style="font-size: 0.72rem; color: var(--primary-dark); text-transform: uppercase; font-weight: 700;">Costo Total Estándar</span>
              <p style="font-weight: 800; font-size: 1.4rem; color: var(--primary-dark); margin: 0.2rem 0;">S/. ${data.costo_total_estandar.toFixed(3)}</p>
              <small style="color: var(--primary-dark); font-size: 0.75rem;">Tarifa SIS: S/. ${data.tarifa_sis.toFixed(3)}</small>
            </div>
          </div>

          <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">
            Desglose por Actividades (${data.fases?.length || 0})
          </h4>
          <div style="max-height: 220px; overflow-y: auto; padding-right: 4px; margin-bottom: 0.75rem;">
            ${phasesHtml}
          </div>

          <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">
            Factores Directos e Indirectos de la UPSS
          </h4>
          <table class="data-table" style="font-size: 0.78rem; margin-bottom: 0.75rem;">
            <thead>
              <tr style="background: #f8fafc;">
                <th>Concepto / Factor</th>
                <th style="width: 90px; text-align: right;">Tiempo (min)</th>
                <th style="width: 140px; text-align: right;">Costo unitario</th>
                <th style="width: 110px; text-align: right;">Costo parcial</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Costo de la Infraestructura</strong> (Depreciación)</td>
                <td style="text-align: right; font-weight: 600;">${data.tiempo_total_minutos} min</td>
                <td style="text-align: right;">${data.tiempo_total_minutos > 0 ? `S/. ${(data.costo_infraestructura / data.tiempo_total_minutos).toFixed(6)} / min` : 'S/. 0.000 / min'}</td>
                <td style="text-align: right; font-weight: 700; color: var(--primary);">S/. ${data.costo_infraestructura.toFixed(3)}</td>
              </tr>
              <tr>
                <td><strong>Costo de servicios basicos</strong> (Total PMS)</td>
                <td style="text-align: right; color: var(--text-muted);">-</td>
                <td style="text-align: right;">S/. ${data.costo_servicios.toFixed(4)}</td>
                <td style="text-align: right; font-weight: 700; color: var(--primary);">S/. ${data.costo_servicios.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>

          <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">
            Factores Indirectos
          </h4>
          <table class="data-table" style="font-size: 0.78rem; margin-bottom: 0.75rem;">
            <thead>
              <tr style="background: #f8fafc;">
                <th>Concepto / Factor Indirecto</th>
                <th style="width: 140px; text-align: right;">Costo unitario</th>
                <th style="width: 110px; text-align: right;">Costo parcial</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Costo asignado de servicios administrativos</strong></td>
                <td style="text-align: right;">S/. ${data.gastos_admin.toFixed(4)}</td>
                <td style="text-align: right; font-weight: 700; color: var(--secondary);">S/. ${data.gastos_admin.toFixed(3)}</td>
              </tr>
              <tr>
                <td><strong>Costo asignado a servicios generales</strong></td>
                <td style="text-align: right;">S/. ${data.gastos_generales.toFixed(4)}</td>
                <td style="text-align: right; font-weight: 700; color: var(--secondary);">S/. ${data.gastos_generales.toFixed(3)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 700;">
                <td colspan="2" style="text-align: right; color: var(--text-main);">Total Costos Indirectos Asignados:</td>
                <td style="text-align: right; color: var(--secondary); font-size: 0.85rem;">S/. ${data.costo_indirecto.toFixed(3)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; font-size: 0.78rem; background: #f1f5f9; padding: 0.6rem; border-radius: var(--radius-md);">
            <div>Costos Directos: <strong>S/. ${data.costo_directo.toFixed(3)}</strong></div>
            <div>Costos Indirectos: <strong>S/. ${data.costo_indirecto.toFixed(3)}</strong></div>
            <div>Tarifa No Asegurados: <strong>S/. ${data.tarifa_no_asegurados.toFixed(3)}</strong></div>
            <div>Tarifa Privados (+${data.margen_privados_pct}%): <strong style="color: var(--color-accent-hover);">S/. ${data.tarifa_privados.toFixed(3)}</strong></div>
          </div>
        `,
        footerButtons: [
          { label: 'Cerrar', class: 'btn-secondary', onClick: (e, m) => m.close() },
          {
            label: 'Editar en Costing Studio',
            class: 'btn-primary',
            icon: Icons.edit,
            onClick: (e, m) => {
              m.close();
              App.editCosting(data.id);
            }
          }
        ]
      });
    } catch (e) {
      console.error(e);
      Toast.error('No se pudo abrir el resumen del procedimiento');
    }
  }
};
