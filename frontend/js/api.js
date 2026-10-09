/**
 * Cliente HTTP API Centralizado
 */
const API = {
  baseUrl: '',

  getToken() {
    return localStorage.getItem('costeo_auth_token');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('costeo_auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem('costeo_auth_token', token);
    localStorage.setItem('costeo_auth_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('costeo_auth_token');
    localStorage.removeItem('costeo_auth_user');
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  isAdmin() {
    const u = this.getCurrentUser();
    return u && u.rol === 'admin';
  },

  async request(endpoint, options = {}) {
    try {
      const token = this.getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
      };

      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (res.status === 401) {
        this.clearSession();
        if (window.App && typeof App.onSessionExpired === 'function') {
          App.onSessionExpired();
        }
        let errData;
        try { errData = await res.json(); } catch { errData = { detail: 'Sesión expirada' }; }
        throw new Error(errData.detail || 'Sesión no válida o expirada');
      }

      if (!res.ok) {
        let errData;
        try {
          errData = await res.json();
        } catch {
          errData = { detail: res.statusText };
        }
        throw new Error(errData.detail || 'Error en la solicitud al servidor');
      }

      if (res.status === 204) return null;
      return await res.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  // Auth Methods
  async login(username, password) {
    const resp = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (resp && resp.access_token) {
      this.setSession(resp.access_token, resp.user);
    }
    return resp;
  },

  async getMe() {
    const u = await this.request('/api/auth/me');
    if (u) {
      localStorage.setItem('costeo_auth_user', JSON.stringify(u));
    }
    return u;
  },

  async changePassword(currentPassword, newPassword) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignorar error al cerrar
    }
    this.clearSession();
  },

  // Users Management (Admin)
  async getUsers() {
    return this.request('/api/users');
  },

  async createUser(userData) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUser(userId, userData) {
    return this.request(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  async deleteUser(userId) {
    return this.request(`/api/users/${userId}`, {
      method: 'DELETE'
    });
  },

  // Dashboard Stats
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  },

  // CPMS Catalog
  async searchCPMS(query = '', page = 1, pageSize = 25, seccion = '') {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (query) params.append('q', query);
    if (seccion) params.append('seccion', seccion);
    return this.request(`/api/cpms?${params.toString()}`);
  },

  async getCPMSSections() {
    return this.request('/api/cpms/sections');
  },

  async saveCPMS(data, codigo = null) {
    if (codigo) return this.request(`/api/cpms/${codigo}`, { method: 'PUT', body: JSON.stringify(data) });
    return this.request('/api/cpms', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteCPMS(codigo) {
    return this.request(`/api/cpms/${codigo}`, { method: 'DELETE' });
  },

  // Catalogs
  async getInsumos(query = '', tipo = '', origen = '', page = 1, pageSize = 25) {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (query) params.append('q', query);
    if (tipo) params.append('tipo', tipo);
    if (origen) params.append('origen', origen);
    return this.request(`/api/catalogs/insumos?${params.toString()}`);
  },

  async saveInsumo(data, id = null) {
    if (id) return this.request(`/api/catalogs/insumos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return this.request('/api/catalogs/insumos', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteInsumo(id) {
    return this.request(`/api/catalogs/insumos/${id}`, { method: 'DELETE' });
  },

  async getAllEquipamiento() {
    return this.request('/api/catalogs/equipamiento/all');
  },

  async getEquipamiento(query = '', tipo = '', page = 1, pageSize = 25, servicioId = null, centroCostos = '') {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (query) params.append('q', query);
    if (tipo) params.append('tipo', tipo);
    if (servicioId) params.append('servicio_id', servicioId);
    if (centroCostos) params.append('centro_costos', centroCostos);
    return this.request(`/api/catalogs/equipamiento?${params.toString()}`);
  },

  async saveEquipamiento(data, id = null) {
    if (id) return this.request(`/api/catalogs/equipamiento/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return this.request('/api/catalogs/equipamiento', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteEquipamiento(id) {
    return this.request(`/api/catalogs/equipamiento/${id}`, { method: 'DELETE' });
  },

  async getAllRRHH() {
    return this.request('/api/catalogs/rrhh/all');
  },

  async getRRHH(query = '', page = 1, pageSize = 50) {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (query) params.append('q', query);
    return this.request(`/api/catalogs/rrhh?${params.toString()}`);
  },

  async saveRRHH(data, id = null) {
    if (id) return this.request(`/api/catalogs/rrhh/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return this.request('/api/catalogs/rrhh', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteRRHH(id) {
    return this.request(`/api/catalogs/rrhh/${id}`, { method: 'DELETE' });
  },

  async getInfraestructura() {
    return this.request('/api/catalogs/infraestructura');
  },

  async saveInfraestructura(data, id = null) {
    if (id) return this.request(`/api/catalogs/infraestructura/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return this.request('/api/catalogs/infraestructura', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteInfraestructura(id) {
    return this.request(`/api/catalogs/infraestructura/${id}`, { method: 'DELETE' });
  },

  async getServiciosBasicos() {
    return this.request('/api/catalogs/servicios-basicos');
  },

  async saveServiciosBasicos(data, id = null) {
    if (id) return this.request(`/api/catalogs/servicios-basicos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return this.request('/api/catalogs/servicios-basicos', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteServiciosBasicos(id) {
    return this.request(`/api/catalogs/servicios-basicos/${id}`, { method: 'DELETE' });
  },

  async getCostosIndirectos() {
    return this.request('/api/catalogs/costos-indirectos');
  },

  async saveCostosIndirectos(data, id = null) {
    if (id) return this.request(`/api/catalogs/costos-indirectos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return this.request('/api/catalogs/costos-indirectos', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteCostosIndirectos(id) {
    return this.request(`/api/catalogs/costos-indirectos/${id}`, { method: 'DELETE' });
  },

  // Servicios Hospitalarios Consolidados
  async getAllServicios() {
    return this.request('/api/catalogs/servicios/all');
  },

  async getServicios(query = '', ups = '', page = 1, pageSize = 50) {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (query) params.append('q', query);
    if (ups) params.append('ups', ups);
    return this.request(`/api/catalogs/servicios?${params.toString()}`);
  },

  async getServicioById(id) {
    return this.request(`/api/catalogs/servicios/${id}`);
  },

  async saveServicio(data, id = null) {
    if (id) return this.request(`/api/catalogs/servicios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return this.request('/api/catalogs/servicios', { method: 'POST', body: JSON.stringify(data) });
  },

  async deleteServicio(id) {
    return this.request(`/api/catalogs/servicios/${id}`, { method: 'DELETE' });
  },

  async getCentrosCostosEquipamiento() {
    return this.request('/api/catalogs/centros-costos');
  },

  async updateServicioCentrosCostos(id, centrosCostoList) {
    return this.request(`/api/catalogs/servicios/${id}/centros-costos`, {
      method: 'PUT',
      body: JSON.stringify({ centros_costo: centrosCostoList })
    });
  },

  // Procedure Costing
  async calculateCostingLive(costingData) {
    return this.request('/api/costing/calculate', {
      method: 'POST',
      body: JSON.stringify(costingData)
    });
  },

  async listCostings(query = '', upss = '', estado = '') {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (upss) params.append('upss', upss);
    if (estado) params.append('estado', estado);
    return this.request(`/api/costing?${params.toString()}`);
  },

  async updateCostingStatus(id, newStatus) {
    return this.request(`/api/costing/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: newStatus })
    });
  },

  async getCostingDetail(id) {
    return this.request(`/api/costing/${id}`);
  },

  async saveCosting(costingData, id = null) {
    if (id) {
      return this.request(`/api/costing/${id}`, {
        method: 'PUT',
        body: JSON.stringify(costingData)
      });
    }
    return this.request('/api/costing', {
      method: 'POST',
      body: JSON.stringify(costingData)
    });
  },

  async cloneCosting(id) {
    return this.request(`/api/costing/${id}/clone`, { method: 'POST' });
  },

  async deleteCosting(id) {
    return this.request(`/api/costing/${id}`, { method: 'DELETE' });
  },

  // Matrix
  async getMatrix(upss = '', query = '') {
    const params = new URLSearchParams();
    if (upss) params.append('upss', upss);
    if (query) params.append('q', query);
    return this.request(`/api/matrix?${params.toString()}`);
  },

  // Tariffs & Market
  async getTariffProposals(upss = '') {
    const params = new URLSearchParams();
    if (upss) params.append('upss', upss);
    return this.request(`/api/tariffs/proposal?${params.toString()}`);
  },

  async updateTariffMargin(id, marginPct) {
    return this.request(`/api/tariffs/proposal/${id}/margin?margen_pct=${marginPct}`, {
      method: 'PUT'
    });
  },

  async getMarketStudy() {
    return this.request('/api/tariffs/market-study');
  },

  async addMarketReference(costeoId, data) {
    return this.request(`/api/tariffs/market-study/${costeoId}/reference`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteMarketReference(refId) {
    return this.request(`/api/tariffs/market-study/reference/${refId}`, {
      method: 'DELETE'
    });
  },

  async queryMinsaObservatory(cptCode, filters = {}) {
    const params = new URLSearchParams({ cpt_codigo: cptCode });
    if (filters.ipress_name) params.append('ipress_name', filters.ipress_name);
    if (filters.ups) params.append('ups', filters.ups);
    if (filters.tipo_tarifa) params.append('tipo_tarifa', filters.tipo_tarifa);
    if (filters.cmb_institucion) params.append('cmb_institucion', filters.cmb_institucion);
    if (filters.cmb_departamento) params.append('cmb_departamento', filters.cmb_departamento);
    if (filters.cmb_categoria) params.append('cmb_categoria', filters.cmb_categoria);
    return this.request(`/api/tariffs/minsa-observatory?${params.toString()}`);
  },

  async importMinsaReferences(costeoId, items) {
    return this.request(`/api/tariffs/market-study/${costeoId}/import-minsa`, {
      method: 'POST',
      body: JSON.stringify(items)
    });
  },

  async getMarketComparison(cptCode, precioLocal = 0.0, count = 3) {
    const params = new URLSearchParams({
      cpt_codigo: cptCode,
      precio_local: String(precioLocal),
      count: String(count)
    });
    return this.request(`/api/tariffs/market-comparison?${params.toString()}`);
  },

  // Upload Excel
  async uploadCPMSFile(formData) {
    const res = await fetch('/api/upload/cpms', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al procesar archivo CPMS');
    }
    return await res.json();
  },

  async uploadCatalogsFile(formData) {
    const res = await fetch('/api/upload/catalogs', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al procesar archivo de catálogos');
    }
    return await res.json();
  },

  async uploadSIGAFile(formData) {
    const res = await fetch('/api/upload/siga', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Error al procesar archivo SIGA');
    }
    return await res.json();
  }
};
