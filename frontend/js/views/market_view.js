/**
 * Vista de Estudio de Mercado y Benchmarks
 * Integra consulta en tiempo real al Observatorio de Costos y Tarifas del MINSA
 */
const MarketView = {
  _minsaResults: [],
  _minsaStats: null,
  _currentCosteoId: null,
  _currentCptCode: '',
  _currentProcName: '',

  async render(container) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h2 class="view-title">ESTUDIO DE MERCADO Y TARIFAS DE REFERENCIA</h2>
          <p class="view-subtitle">Comparativa entre costos estándar calculados y tarifas del Observatorio Nacional MINSA e instituciones de referencia.</p>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn btn-primary btn-sm" onclick="MarketView.openMinsaObservatoryModal('', '', null)">
            🏛️ Explorador Observatorio MINSA
          </button>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 110px;">CPMS</th>
                <th>Procedimiento</th>
                <th>Costo Total Hospital</th>
                <th>Referencias de Mercado</th>
                <th style="width: 220px; text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody id="market-tbody">
              <tr><td colspan="5" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">Cargando estudio de mercado...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadMarketData();
  },

  async loadMarketData() {
    try {
      const list = await API.getMarketStudy();
      const tbody = document.getElementById('market-tbody');

      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No hay procedimientos registrados.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(item => `
        <tr>
          <td><strong style="color: var(--primary);">${item.codigo_cpms}</strong></td>
          <td>
            <strong style="font-size: 0.9rem;">${item.nombre_procedimiento}</strong>
            <br><small style="color: var(--text-muted);">${item.upss_servicio || 'General'}</small>
          </td>
          <td>
            <div style="background: #f0fdfa; padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); display: inline-block;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">Costo Estándar:</span><br>
              <strong style="color: var(--primary-dark); font-size: 1rem;">S/. ${item.costo_total_estandar.toFixed(3)}</strong>
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              ${(item.mercado_referencias && item.mercado_referencias.length > 0) ? item.mercado_referencias.map(ref => `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; font-size: 0.8rem;">
                  <div>
                    <span><strong>${ref.institucion}</strong></span>
                    ${ref.observacion ? `<br><small style="color: var(--text-muted); font-size: 0.72rem;">${ref.observacion}</small>` : ''}
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: 0.5rem;">
                    <strong style="color: var(--text-main); white-space: nowrap;">S/. ${ref.precio_referencia.toFixed(3)}</strong>
                    <button class="btn btn-danger btn-sm btn-icon" style="padding: 0.15rem;" title="Eliminar referencia" onclick="MarketView.deleteRef(${ref.id})">${Icons.x}</button>
                  </div>
                </div>
              `).join('') : `<span style="color: var(--text-light); font-size: 0.78rem;">Sin referencias agregadas</span>`}
            </div>
          </td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 0.35rem; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;" onclick="MarketView.openMinsaObservatoryModal('${item.codigo_cpms}', '${item.nombre_procedimiento.replace(/'/g, "\\'")}', ${item.id})" title="Consultar tarifas en el Observatorio Nacional MINSA">
                🏛️ MINSA
              </button>
              <button class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;" onclick="MarketView.openAddRefModal(${item.id})" title="Registrar referencia manual">
                ${Icons.plus} Manual
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
      Toast.error('No se pudo cargar el estudio de mercado');
    }
  },

  openAddRefModal(costeoId) {
    Modal.open({
      title: 'Agregar Tarifa de Referencia del Mercado',
      contentHtml: `
        <div class="form-group">
          <label class="form-label">Institución o Clínica de Referencia</label>
          <input type="text" id="modal-market-inst" class="form-control" placeholder="Ej: Clínica Pardo, Solidaridad, INEN, etc." list="instituciones-sugeridas">
          <datalist id="instituciones-sugeridas">
            <option value="HOSPITAL DE LA SOLIDARIDAD">
            <option value="CENTRO MEDICO FATIMA">
            <option value="CLINICA PARDO CUSCO">
            <option value="INSTITUTO REGIONAL DE ENFERMEDADES NEOPLASICAS">
            <option value="HOSPITAL NACIONAL REZOLA">
            <option value="HOSPITAL NACIONAL DE ENFERMEDADES NEOPLASICAS (INEN)">
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Precio o Tarifa Observada (S/.)</label>
          <input type="number" id="modal-market-price" class="form-control" placeholder="0.000" min="0" step="0.001">
        </div>
        <div class="form-group">
          <label class="form-label">Observación / Fuente (Opcional)</label>
          <input type="text" id="modal-market-obs" class="form-control" placeholder="Ej: Tarifario 2026 página web...">
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Referencia',
          class: 'btn-primary',
          icon: Icons.plus,
          onClick: async (e, m) => {
            const inst = document.getElementById('modal-market-inst').value.trim();
            const price = parseFloat(document.getElementById('modal-market-price').value) || 0;
            const obs = document.getElementById('modal-market-obs').value.trim();

            if (!inst || price <= 0) {
              Toast.warning('Por favor ingresa la institución y un precio válido');
              return;
            }

            try {
              await API.addMarketReference(costeoId, {
                institucion: inst,
                precio_referencia: price,
                observacion: obs
              });
              Toast.success('Referencia de mercado agregada');
              m.close();
              MarketView.loadMarketData();
            } catch (err) {
              console.error(err);
              Toast.error('Error al agregar referencia');
            }
          }
        }
      ]
    });
  },

  async deleteRef(refId) {
    try {
      await API.deleteMarketReference(refId);
      Toast.success('Referencia eliminada');
      this.loadMarketData();
    } catch (e) {
      console.error(e);
      Toast.error('Error al eliminar referencia');
    }
  },

  /**
   * Abre el Modal Interactivo del Observatorio de Costos y Tarifas MINSA
   */
  openMinsaObservatoryModal(cptCode = '', procName = '', costeoId = null) {
    this._currentCosteoId = costeoId;
    this._currentCptCode = cptCode || '87207';
    this._currentProcName = procName || '';
    this._minsaResults = [];
    this._minsaStats = null;

    const titleHtml = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>🏛️ Observatorio Nacional de Costos y Tarifas - MINSA</span>
      </div>
    `;

    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Banner informativo del procedimiento activo -->
        <div style="background: var(--color-primary-surface); border: 1px solid #bfdbfe; padding: 0.75rem 1rem; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Procedimiento / CPMS Objetivo:</div>
            <div style="font-size: 0.95rem; color: var(--color-primary-hover); font-weight: 700;">
              ${this._currentCptCode ? `<span class="badge badge-primary" style="margin-right: 6px;">CPMS: ${this._currentCptCode}</span>` : ''}
              ${this._currentProcName || 'Búsqueda libre por CPMS'}
            </div>
          </div>
          ${this._currentCosteoId ? `
            <span class="badge badge-success" style="font-size: 0.75rem;">Vinculación Activa a Hoja #${this._currentCosteoId}</span>
          ` : `
            <span class="badge badge-slate" style="font-size: 0.75rem;">Modo Consulta General</span>
          `}
        </div>

        <!-- Barra de Búsqueda y Filtros de Consulta -->
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem;">
          <div style="display: grid; grid-template-columns: 140px 1fr 180px auto; gap: 0.65rem; align-items: flex-end;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.78rem;">Código CPMS</label>
              <input type="text" id="minsa-search-cpt" class="form-control" value="${this._currentCptCode}" placeholder="Ej: 87207">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.78rem;">Filtrar IPRESS / Hospital</label>
              <input type="text" id="minsa-filter-ipress" class="form-control" placeholder="Escribe para filtrar resultados..." oninput="MarketView.filterMinsaTable()">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.78rem;">Institución / Propiedad</label>
              <select id="minsa-filter-inst" class="form-select" onchange="MarketView.filterMinsaTable()">
                <option value="">Todas las Instituciones</option>
                <option value="MINSA">MINSA</option>
                <option value="GOBIERNO REGIONAL">GOBIERNO REGIONAL</option>
                <option value="SIS">SIS</option>
                <option value="ESSALUD">ESSALUD</option>
                <option value="PRIVADO">PRIVADO / OTROS</option>
              </select>
            </div>
            <div>
              <button class="btn btn-primary" style="height: 38px; display: flex; align-items: center; gap: 0.35rem;" onclick="MarketView.executeMinsaQuery()">
                ${Icons.search} Consultar MINSA
              </button>
            </div>
          </div>
        </div>

        <!-- Indicador de Carga / Spinner -->
        <div id="minsa-loading" style="display: none; text-align: center; padding: 2rem; color: var(--primary);">
          <div style="display: inline-block; font-size: 1.5rem; margin-bottom: 0.5rem;">⏳</div>
          <div style="font-weight: 600;">Conectando con el Observatorio de Costos y Tarifas MINSA...</div>
          <small style="color: var(--text-muted);">Obteniendo sesión, validando CSRF y extrayendo tarifas oficiales publicadas.</small>
        </div>

        <!-- Panel de Estadísticas y Benchmarks -->
        <div id="minsa-stats-container" style="display: none;"></div>

        <!-- Tabla de Resultados IPRESS -->
        <div id="minsa-results-wrap" style="max-height: 320px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: white;">
          <table class="data-table" style="margin-bottom: 0;">
            <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10;">
              <tr>
                <th style="width: 36px; text-align: center;">
                  <input type="checkbox" id="minsa-select-all" onchange="MarketView.toggleSelectAllMinsa(this.checked)" title="Seleccionar todas">
                </th>
                <th>IPRESS / Establecimiento de Salud</th>
                <th style="width: 160px;">Institución</th>
                <th style="width: 140px;">Tipo Tarifa / Res.</th>
                <th style="width: 110px; text-align: right;">Tarifa Publicada</th>
                <th style="width: 110px; text-align: center;">Acción</th>
              </tr>
            </thead>
            <tbody id="minsa-results-tbody">
              <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                  Ingresa un código CPMS y presiona <strong>"Consultar MINSA"</strong> para explorar tarifas oficiales.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    Modal.open({
      title: titleHtml,
      contentHtml: contentHtml,
      size: 'xl',
      footerButtons: [
        { label: 'Cerrar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        ...(this._currentCosteoId ? [
          {
            label: 'Importar Promedio MINSA (S/.)',
            class: 'btn-secondary',
            icon: '📊',
            onClick: () => this.importSyntheticRef('PROMEDIO')
          },
          {
            label: 'Importar Seleccionadas',
            class: 'btn-primary',
            icon: Icons.plus,
            onClick: () => this.importSelectedMinsaRefs()
          }
        ] : [])
      ]
    });

    // Auto ejecutar búsqueda si tenemos código CPMS
    if (this._currentCptCode) {
      this.executeMinsaQuery();
    }
  },

  /**
   * Ejecuta la consulta HTTP al backend para raspar el Observatorio MINSA
   */
  async executeMinsaQuery() {
    const cptInput = document.getElementById('minsa-search-cpt');
    const cptCode = cptInput ? cptInput.value.trim() : this._currentCptCode;

    if (!cptCode) {
      Toast.warning('Por favor ingresa un código CPMS');
      return;
    }

    const loadingEl = document.getElementById('minsa-loading');
    const statsEl = document.getElementById('minsa-stats-container');
    const tbody = document.getElementById('minsa-results-tbody');

    if (loadingEl) loadingEl.style.display = 'block';
    if (statsEl) statsEl.style.display = 'none';
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Consultando Observatorio MINSA...</td></tr>`;

    try {
      const resp = await API.queryMinsaObservatory(cptCode);
      if (loadingEl) loadingEl.style.display = 'none';

      if (!resp.success || !resp.items || resp.items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              ⚠️ No se encontraron tarifas publicadas en el Observatorio MINSA para el código CPMS <strong>${cptCode}</strong>.
            </td>
          </tr>
        `;
        return;
      }

      this._minsaResults = resp.items;
      this._minsaStats = resp.stats;
      this.renderMinsaStats(resp.stats);
      this.filterMinsaTable();

      Toast.success(`Se encontraron ${resp.total_encontrados} registros en el Observatorio MINSA`);
    } catch (err) {
      console.error(err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--danger);">
              ❌ Error al consultar el Observatorio MINSA: ${err.message || 'Error de conexión'}
            </td>
          </tr>
        `;
      }
      Toast.error('No se pudo consultar el Observatorio MINSA');
    }
  },

  /**
   * Renderiza las tarjetas de estadísticas resumen
   */
  renderMinsaStats(stats) {
    const statsEl = document.getElementById('minsa-stats-container');
    if (!statsEl || !stats) return;

    statsEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 0.75rem; text-align: center;">
          <div style="font-size: 0.75rem; color: #166534; font-weight: 600; text-transform: uppercase;">Tarifa Mínima</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #15803d; margin-top: 0.2rem;">S/. ${stats.min.toFixed(2)}</div>
          <div style="font-size: 0.7rem; color: #166534; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${stats.min_ipress || ''}">${stats.min_ipress || 'N/A'}</div>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 0.75rem; text-align: center;">
          <div style="font-size: 0.75rem; color: #1e40af; font-weight: 600; text-transform: uppercase;">Promedio Nacional</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #2563eb; margin-top: 0.2rem;">S/. ${stats.promedio.toFixed(2)}</div>
          <div style="font-size: 0.7rem; color: #1e40af;">${stats.total_con_tarifa} IPRESS con tarifa</div>
        </div>

        <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: var(--radius-md); padding: 0.75rem; text-align: center;">
          <div style="font-size: 0.75rem; color: #6b21a8; font-weight: 600; text-transform: uppercase;">Mediana Estadística</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #7c3aed; margin-top: 0.2rem;">S/. ${stats.mediana.toFixed(2)}</div>
          <div style="font-size: 0.7rem; color: #6b21a8;">Punto medio tarifario</div>
        </div>

        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: var(--radius-md); padding: 0.75rem; text-align: center;">
          <div style="font-size: 0.75rem; color: #9f1239; font-weight: 600; text-transform: uppercase;">Tarifa Máxima</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #e11d48; margin-top: 0.2rem;">S/. ${stats.max.toFixed(2)}</div>
          <div style="font-size: 0.7rem; color: #9f1239; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${stats.max_ipress || ''}">${stats.max_ipress || 'N/A'}</div>
        </div>
      </div>
    `;
    statsEl.style.display = 'block';
  },

  /**
   * Filtra la tabla de resultados en memoria por texto de IPRESS e institución
   */
  filterMinsaTable() {
    const filterText = (document.getElementById('minsa-filter-ipress')?.value || '').toLowerCase().trim();
    const filterInst = (document.getElementById('minsa-filter-inst')?.value || '').toLowerCase().trim();
    const tbody = document.getElementById('minsa-results-tbody');
    if (!tbody) return;

    if (!this._minsaResults || this._minsaResults.length === 0) return;

    const filtered = this._minsaResults.filter(item => {
      const matchText = !filterText || (item.ipress && item.ipress.toLowerCase().includes(filterText)) || (item.procedimiento && item.procedimiento.toLowerCase().includes(filterText));
      const matchInst = !filterInst || (item.propiedad && item.propiedad.toLowerCase().includes(filterInst));
      return matchText && matchInst;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay resultados que coincidan con los filtros aplicados.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((item, idx) => {
      const originalIdx = this._minsaResults.indexOf(item);
      const hasTarifa = item.tarifa && item.tarifa > 0;
      const tarifaColor = hasTarifa ? 'var(--primary-dark)' : 'var(--text-muted)';
      const tarifaText = hasTarifa ? `S/. ${item.tarifa.toFixed(2)}` : '<span style="color: var(--text-light); font-size: 0.75rem;">Sin tarifa</span>';

      return `
        <tr>
          <td style="text-align: center;">
            <input type="checkbox" class="minsa-row-check" data-idx="${originalIdx}" ${hasTarifa ? '' : 'disabled'}>
          </td>
          <td>
            <strong style="font-size: 0.85rem; color: var(--text-main);">${item.ipress || 'Establecimiento de Salud'}</strong>
            ${item.procedimiento ? `<br><small style="color: var(--text-muted); font-size: 0.75rem;">${item.procedimiento}</small>` : ''}
          </td>
          <td>
            <span class="badge ${item.propiedad?.includes('MINSA') || item.propiedad?.includes('REGIONAL') ? 'badge-primary' : 'badge-slate'}" style="font-size: 0.72rem;">
              ${item.propiedad || 'MINSA'}
            </span>
          </td>
          <td>
            <div style="font-size: 0.78rem;">${item.tipo_tarifa || 'TARIFARIO'}</div>
            ${item.resolucion ? `<small style="color: var(--text-muted); font-size: 0.7rem;">Res: ${item.resolucion}</small>` : ''}
          </td>
          <td style="text-align: right;">
            <strong style="color: ${tarifaColor}; font-size: 0.95rem;">${tarifaText}</strong>
          </td>
          <td style="text-align: center;">
            ${(this._currentCosteoId && hasTarifa) ? `
              <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" onclick="MarketView.bindSingleMinsaRef(${originalIdx})" title="Vincular tarifa al procedimiento actual">
                ${Icons.plus} Vincular
              </button>
            ` : (hasTarifa ? `
              <button class="btn btn-secondary btn-sm btn-icon" style="padding: 0.2rem;" title="Copiar Tarifa" onclick="navigator.clipboard.writeText('${item.tarifa}'); Toast.info('Tarifa S/. ${item.tarifa} copiada al portapapeles');">
                ${Icons.copy}
              </button>
            ` : '-')}
          </td>
        </tr>
      `;
    }).join('');
  },

  toggleSelectAllMinsa(checked) {
    document.querySelectorAll('.minsa-row-check:not(:disabled)').forEach(cb => {
      cb.checked = checked;
    });
  },

  /**
   * Vincula una sola referencia del Observatorio a la hoja de costeo actual
   */
  async bindSingleMinsaRef(index) {
    if (!this._currentCosteoId) return;
    const item = this._minsaResults[index];
    if (!item || !item.tarifa) {
      Toast.warning('El registro seleccionado no cuenta con una tarifa numérica válida');
      return;
    }

    try {
      await API.addMarketReference(this._currentCosteoId, {
        institucion: item.ipress,
        precio_referencia: item.tarifa,
        observacion: `MINSA Observatorio (${item.propiedad || 'Oficial'}) - ${item.resolucion || item.tipo_tarifa || 'Tarifario'}`
      });
      Toast.success(`Tarifa de "${item.ipress}" vinculada exitosamente`);
      this.loadMarketData();
    } catch (err) {
      console.error(err);
      Toast.error('Error al vincular tarifa de referencia');
    }
  },

  /**
   * Importa en bloque todas las referencias de IPRESS seleccionadas con checkbox
   */
  async importSelectedMinsaRefs() {
    if (!this._currentCosteoId) return;

    const checkboxes = document.querySelectorAll('.minsa-row-check:checked');
    if (checkboxes.length === 0) {
      Toast.warning('Por favor selecciona al menos una IPRESS con la casilla de verificación');
      return;
    }

    const itemsToImport = [];
    checkboxes.forEach(cb => {
      const idx = parseInt(cb.getAttribute('data-idx'));
      const item = this._minsaResults[idx];
      if (item && item.tarifa && item.tarifa > 0) {
        itemsToImport.push({
          institucion: item.ipress,
          precio_referencia: item.tarifa,
          observacion: `MINSA Observatorio (${item.propiedad || 'Oficial'}) - ${item.resolucion || item.tipo_tarifa || ''}`
        });
      }
    });

    if (itemsToImport.length === 0) {
      Toast.warning('Ninguna de las IPRESS seleccionadas tiene una tarifa válida');
      return;
    }

    try {
      const res = await API.importMinsaReferences(this._currentCosteoId, itemsToImport);
      Toast.success(`¡Se importaron ${res.imported_count || itemsToImport.length} tarifas de referencia exitosamente!`);
      Modal.close();
      this.loadMarketData();
    } catch (err) {
      console.error(err);
      Toast.error('Error al importar tarifas seleccionadas');
    }
  },

  /**
   * Importa una referencia sintética de benchmark (Promedio o Mediana del Observatorio)
   */
  async importSyntheticRef(type) {
    if (!this._currentCosteoId || !this._minsaStats) {
      Toast.warning('No hay estadísticas calculadas disponibles');
      return;
    }

    const value = type === 'PROMEDIO' ? this._minsaStats.promedio : this._minsaStats.mediana;
    const label = type === 'PROMEDIO' ? 'PROMEDIO OBSERVATORIO MINSA' : 'MEDIANA OBSERVATORIO MINSA';

    if (!value || value <= 0) {
      Toast.warning('El valor estadístico es 0');
      return;
    }

    try {
      await API.addMarketReference(this._currentCosteoId, {
        institucion: label,
        precio_referencia: value,
        observacion: `Benchmark calculado sobre ${this._minsaStats.total_con_tarifa} IPRESS del Observatorio MINSA (Mín: S/. ${this._minsaStats.min.toFixed(2)}, Máx: S/. ${this._minsaStats.max.toFixed(2)})`
      });
      Toast.success(`Referencia "${label}" vinculada exitosamente (S/. ${value.toFixed(2)})`);
      Modal.close();
      this.loadMarketData();
    } catch (err) {
      console.error(err);
      Toast.error('Error al importar referencia de benchmark');
    }
  }
};

