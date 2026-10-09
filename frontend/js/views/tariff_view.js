/**
 * Vista de Propuesta Tarifaria Oficial
 */
const TariffView = {
  currentUPSS: '',

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 class="view-title">PROPUESTA TARIFARIA INSTITUCIONAL</h2>
          <p class="view-subtitle">Estructura tarifaria normada para población no asegurada, SIS, ESSALUD, FFAA y convenios privados/IAFAS.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <a id="btn-export-tariff" href="/api/tariffs/proposal/export-excel" class="btn btn-secondary" target="_blank">
            ${Icons.download} Exportar Propuesta Tarifaria Excel
          </a>
          <button class="btn btn-primary" onclick="App.navigate('studio')">
            ${Icons.plus} Nuevo Procedimiento
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <label class="form-label" style="margin-bottom: 0;">Filtrar por Servicio:</label>
            <select id="tariff-filter-upss" class="form-select" style="width: 280px;" onchange="TariffView.onFilterUPSS(this.value)">
              <option value="">-- SELECCIONE SERVICIO / UPSS --</option>
            </select>
          </div>
          <span style="font-size: 0.85rem; color: var(--text-muted);" id="tariff-count-label">Cargando propuestas...</span>
        </div>
      </div>

      <!-- Tabla Formato Oficial Propuesta Tarifaria -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive" style="border: none;">
          <table class="data-table" style="font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color);">
                <th rowspan="3" style="width: 45px; text-align: center; vertical-align: middle;">N°</th>
                <th rowspan="3" style="width: 110px; text-align: center; vertical-align: middle;">Código CPMS</th>
                <th rowspan="3" style="min-width: 320px; vertical-align: middle;">Procedimiento Médico y Sanitario</th>
                <th rowspan="3" style="background: #e2e8f0; color: var(--text-main); text-align: right; vertical-align: middle;">
                  Tarifa Referencial (Tr)<br><small>S/.</small>
                </th>
                <th colspan="3" style="background: var(--primary-light); color: var(--primary-dark); text-align: center;">
                  TARIFAS ESPECÍFICAS PROPUESTAS (S/.)
                </th>
                <th rowspan="3" style="width: 140px; text-align: center; vertical-align: middle;">Margen Privado</th>
              </tr>
              <tr>
                <th rowspan="2" style="background: #f8fafc; text-align: right; vertical-align: middle;">
                  Población no Asegurada<br><small>(Tpu)</small>
                </th>
                <th colspan="2" style="background: var(--color-accent-surface); color: var(--color-accent-hover); text-align: center;">
                  Venta de Servicios - IAFAS y Otras Entidades
                </th>
              </tr>
              <tr>
                <th style="background: #f8fafc; text-align: right;">ESSALUD / FFAA / Policía</th>
                <th style="background: #f8fafc; text-align: right;">Privados (IAFAS)</th>
              </tr>
            </thead>
            <tbody id="tariff-tbody">
              <tr><td colspan="8" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">Cargando propuesta tarifaria...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadUPSSFilter();
    await this.loadTariffData();
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

      const select = document.getElementById('tariff-filter-upss');
      let html = `<option value="">-- SELECCIONE SERVICIO / UPSS --</option>`;
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

  async loadTariffData() {
    try {
      const list = await API.getTariffProposals(this.currentUPSS);
      const tbody = document.getElementById('tariff-tbody');
      document.getElementById('tariff-count-label').textContent = `${list.length} procedimientos listados`;

      const exportBtn = document.getElementById('btn-export-tariff');
      exportBtn.href = `/api/tariffs/proposal/export-excel?upss=${encodeURIComponent(this.currentUPSS || '')}`;

      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No hay procedimientos registrados en este servicio.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map((item, idx) => `
        <tr>
          <td style="text-align: center; color: var(--text-muted);">${idx + 1}</td>
          <td><strong style="color: var(--primary);">${item.codigo_cpms}</strong></td>
          <td>
            <div style="font-weight: 600;" title="${item.nombre_procedimiento}">
              ${item.nombre_procedimiento}
            </div>
            <small style="color: var(--text-muted);">${item.upss_servicio || 'Servicio General'}</small>
          </td>
          <td style="text-align: right; background: #f8fafc;">
            <strong style="color: var(--text-main);">S/. ${(item.tarifa_referencial || item.costo_total_estandar).toFixed(3)}</strong>
          </td>
          <td style="text-align: right;">
            <strong style="color: var(--primary-dark);">S/. ${item.tarifa_no_asegurados.toFixed(3)}</strong>
          </td>
          <td style="text-align: right;">S/. ${item.tarifa_essalud.toFixed(3)}</td>
          <td style="text-align: right; background: #f0fdf4;">
            <strong style="color: var(--success); font-size: 0.9rem;">S/. ${item.tarifa_privados.toFixed(3)}</strong>
          </td>
          <td style="text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
              <input type="number" class="form-control" style="width: 65px; padding: 0.25rem 0.4rem; font-size: 0.8rem; text-align: center;" value="${(item.margen_privados_pct !== undefined && item.margen_privados_pct !== null) ? item.margen_privados_pct : 20}" min="0" max="300" onchange="TariffView.updateMargin(${item.id}, this.value)">
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">%</span>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
      Toast.error('No se pudo cargar la Propuesta Tarifaria');
    }
  },

  onFilterUPSS(val) {
    this.currentUPSS = val;
    this.loadTariffData();
  },

  async updateMargin(costeoId, val) {
    const margin = (val === '' || val === null) ? 0 : parseFloat(val);
    const finalMargin = isNaN(margin) ? 0 : margin;
    try {
      await API.updateTariffMargin(costeoId, finalMargin);
      Toast.success('Margen comercial actualizado');
      this.loadTariffData();
    } catch (e) {
      console.error(e);
      Toast.error('Error al actualizar margen');
    }
  }
};
