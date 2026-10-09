/**
 * Vista de Gestión de Usuarios (Exclusiva para Administradores)
 */
const UsersView = {
  usersList: [],
  searchQuery: '',

  async render(container) {
    if (!API.isAdmin()) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
          <h3 style="color: var(--text-main);">Acceso Restringido</h3>
          <p style="color: var(--text-muted); max-width: 420px; margin: 0.5rem auto 1.5rem;">
            Esta sección es exclusiva para usuarios con privilegios de Administrador.
          </p>
          <button class="btn btn-primary" onclick="App.navigate('dashboard')">Volver al Panel Principal</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h2 class="view-title">Gestión de Usuarios & Operadores</h2>
          <p class="view-subtitle">Administración de cuentas, asignación de roles y control de acceso al sistema de costeo.</p>
        </div>
        <button class="btn btn-primary" onclick="UsersView.openCreateUserModal()">
          ${Icons.plus} Nuevo Usuario
        </button>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid" style="margin-bottom: 1.25rem;">
        <div class="kpi-card" style="padding: 1rem;">
          <div class="kpi-icon-wrap kpi-icon-teal">${Icons.user}</div>
          <div class="kpi-data">
            <h4 style="font-size: 0.8rem;">Total Usuarios</h4>
            <p id="kpi-users-total" style="font-size: 1.4rem;">0</p>
          </div>
        </div>
        <div class="kpi-card" style="padding: 1rem;">
          <div class="kpi-icon-wrap kpi-icon-indigo" style="background: #e0e7ff; color: #4338ca;">👑</div>
          <div class="kpi-data">
            <h4 style="font-size: 0.8rem;">Administradores</h4>
            <p id="kpi-users-admins" style="font-size: 1.4rem; color: #4338ca;">0</p>
          </div>
        </div>
        <div class="kpi-card" style="padding: 1rem;">
          <div class="kpi-icon-wrap kpi-icon-blue" style="background: #dbeafe; color: #2563eb;">👤</div>
          <div class="kpi-data">
            <h4 style="font-size: 0.8rem;">Operadores</h4>
            <p id="kpi-users-operators" style="font-size: 1.4rem; color: #2563eb;">0</p>
          </div>
        </div>
        <div class="kpi-card" style="padding: 1rem;">
          <div class="kpi-icon-wrap kpi-icon-green" style="background: #d1fae5; color: #059669;">${Icons.check}</div>
          <div class="kpi-data">
            <h4 style="font-size: 0.8rem;">Cuentas Activas</h4>
            <p id="kpi-users-active" style="font-size: 1.4rem; color: #059669;">0</p>
          </div>
        </div>
      </div>

      <!-- Buscador y Tabla -->
      <div class="card" style="padding: 1rem; margin-bottom: 1.25rem;">
        <div class="search-input-wrap" style="max-width: 400px;">
          <span class="search-icon">${Icons.search}</span>
          <input type="text" class="form-control" placeholder="Buscar por usuario o nombre completo..." oninput="UsersView.onSearch(this.value)">
        </div>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-responsive" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">N°</th>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th style="text-align: center;">Hojas Creadas</th>
                <th>Estado</th>
                <th>Fecha Creación</th>
                <th style="text-align: center; width: 140px;">Acciones</th>
              </tr>
            </thead>
            <tbody id="users-tbody">
              <tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">Cargando lista de usuarios...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.loadUsers();
  },

  async loadUsers() {
    try {
      this.usersList = await API.getUsers() || [];
      this.renderTable();
      this.updateKPIs();
    } catch (err) {
      console.error(err);
      Toast.error('No se pudo cargar la lista de usuarios');
    }
  },

  updateKPIs() {
    const total = this.usersList.length;
    const admins = this.usersList.filter(u => u.rol === 'admin').length;
    const operators = this.usersList.filter(u => u.rol === 'usuario').length;
    const active = this.usersList.filter(u => u.activo === 1).length;

    const elTotal = document.getElementById('kpi-users-total');
    const elAdmins = document.getElementById('kpi-users-admins');
    const elOps = document.getElementById('kpi-users-operators');
    const elAct = document.getElementById('kpi-users-active');

    if (elTotal) elTotal.textContent = total;
    if (elAdmins) elAdmins.textContent = admins;
    if (elOps) elOps.textContent = operators;
    if (elAct) elAct.textContent = active;
  },

  onSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    let filtered = this.usersList;
    if (this.searchQuery) {
      filtered = filtered.filter(u => 
        u.username.toLowerCase().includes(this.searchQuery) ||
        u.nombre_completo.toLowerCase().includes(this.searchQuery) ||
        (u.email && u.email.toLowerCase().includes(this.searchQuery))
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">No se encontraron usuarios registrados.</td></tr>`;
      return;
    }

    const currentUserId = API.getCurrentUser()?.id;

    tbody.innerHTML = filtered.map((u, idx) => {
      const isSelf = u.id === currentUserId;
      const roleBadge = u.rol === 'admin' 
        ? `<span class="badge" style="background: #e0e7ff; color: #4338ca; font-weight: 700;">👑 Administrador</span>`
        : `<span class="badge" style="background: #f1f5f9; color: #475569;">👤 Operador</span>`;
      
      const statusBadge = u.activo === 1
        ? `<span class="badge badge-success">Activo</span>`
        : `<span class="badge badge-danger">Inactivo</span>`;

      const dateFormatted = u.created_at ? new Date(u.created_at).toLocaleDateString() : '-';

      return `
        <tr style="${u.activo === 0 ? 'opacity: 0.6; background: #fafafa;' : ''}">
          <td style="text-align: center; color: var(--text-muted);">${idx + 1}</td>
          <td>
            <strong style="color: var(--primary);">${u.username}</strong>
            ${isSelf ? '<span class="badge badge-teal" style="font-size: 0.65rem; margin-left: 0.3rem;">(Tú)</span>' : ''}
          </td>
          <td><strong>${u.nombre_completo}</strong></td>
          <td style="color: var(--text-muted); font-size: 0.82rem;">${u.email || '<span style="opacity:0.5;">Sin correo</span>'}</td>
          <td>${roleBadge}</td>
          <td style="text-align: center;">
            <span class="badge badge-slate" style="font-size: 0.8rem; font-weight: 700;">${u.total_costeos || 0}</span>
          </td>
          <td>${statusBadge}</td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">${dateFormatted}</td>
          <td>
            <div style="display: flex; gap: 0.25rem; justify-content: center;">
              <button class="btn btn-secondary btn-sm btn-icon" onclick='UsersView.openEditUserModal(${JSON.stringify(u)})' title="Editar Usuario">
                ${Icons.edit}
              </button>
              <button class="btn btn-secondary btn-sm btn-icon" onclick='UsersView.openPasswordModal(${JSON.stringify(u)})' title="Cambiar Contraseña">
                🔑
              </button>
              ${!isSelf ? `
                <button class="btn ${u.activo === 1 ? 'btn-danger' : 'btn-secondary'} btn-sm btn-icon" onclick="UsersView.toggleStatus(${u.id}, '${u.username}', ${u.activo})" title="${u.activo === 1 ? 'Desactivar Cuenta' : 'Activar Cuenta'}">
                  ${u.activo === 1 ? '🚫' : '✔'}
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openCreateUserModal() {
    Modal.open({
      title: '👤 Crear Nuevo Usuario / Operador',
      contentHtml: `
        <div class="form-group">
          <label class="form-label">Nombre Completo <span style="color:red;">*</span></label>
          <input type="text" id="modal-user-fullname" class="form-control" placeholder="Ej: Dr. Juan Pérez" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Usuario de Login <span style="color:red;">*</span></label>
            <input type="text" id="modal-user-username" class="form-control" placeholder="Ej: jperez" required autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña <span style="color:red;">*</span></label>
            <input type="password" id="modal-user-pwd" class="form-control" placeholder="Mínimo 4 caracteres" required autocomplete="new-password">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Correo Electrónico (Opcional)</label>
            <input type="email" id="modal-user-email" class="form-control" placeholder="usuario@minsa.gob.pe">
          </div>
          <div class="form-group">
            <label class="form-label">Rol en el Sistema <span style="color:red;">*</span></label>
            <select id="modal-user-role" class="form-select">
              <option value="usuario">👤 Operador (Gestiona sus propios costeos)</option>
              <option value="admin">👑 Administrador (Acceso total & Catálogos)</option>
            </select>
          </div>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Crear Usuario',
          class: 'btn-primary',
          icon: Icons.plus,
          onClick: async (e, m) => {
            const nombre = document.getElementById('modal-user-fullname')?.value.trim();
            const username = document.getElementById('modal-user-username')?.value.trim();
            const password = document.getElementById('modal-user-pwd')?.value;
            const email = document.getElementById('modal-user-email')?.value.trim();
            const rol = document.getElementById('modal-user-role')?.value || 'usuario';

            if (!nombre || !username || !password) {
              Toast.warning('Por favor completa todos los campos requeridos');
              return;
            }

            if (password.length < 4) {
              Toast.warning('La contraseña debe tener al menos 4 caracteres');
              return;
            }

            try {
              await API.createUser({
                nombre_completo: nombre,
                username: username,
                password: password,
                email: email || null,
                rol: rol,
                activo: 1
              });
              Toast.success(`Usuario '${username}' creado exitosamente`);
              m.close();
              UsersView.loadUsers();
            } catch (err) {
              Toast.error(err.message || 'Error al crear usuario');
            }
          }
        }
      ]
    });
  },

  openEditUserModal(user) {
    Modal.open({
      title: `✏️ Editar Usuario: ${user.username}`,
      contentHtml: `
        <div class="form-group">
          <label class="form-label">Nombre Completo <span style="color:red;">*</span></label>
          <input type="text" id="modal-edit-fullname" class="form-control" value="${user.nombre_completo}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <input type="email" id="modal-edit-email" class="form-control" value="${user.email || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Rol en el Sistema</label>
            <select id="modal-edit-role" class="form-select">
              <option value="usuario" ${user.rol === 'usuario' ? 'selected' : ''}>👤 Operador</option>
              <option value="admin" ${user.rol === 'admin' ? 'selected' : ''}>👑 Administrador</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Estado de la Cuenta</label>
          <select id="modal-edit-active" class="form-select">
            <option value="1" ${user.activo === 1 ? 'selected' : ''}>✔ Activo (Permite acceso)</option>
            <option value="0" ${user.activo === 0 ? 'selected' : ''}>🚫 Inactivo (Bloquea acceso)</option>
          </select>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Guardar Cambios',
          class: 'btn-primary',
          icon: Icons.check,
          onClick: async (e, m) => {
            const nombre = document.getElementById('modal-edit-fullname')?.value.trim();
            const email = document.getElementById('modal-edit-email')?.value.trim();
            const rol = document.getElementById('modal-edit-role')?.value;
            const activo = parseInt(document.getElementById('modal-edit-active')?.value || '1');

            if (!nombre) {
              Toast.warning('El nombre completo es obligatorio');
              return;
            }

            try {
              await API.updateUser(user.id, {
                nombre_completo: nombre,
                email: email || null,
                rol: rol,
                activo: activo
              });
              Toast.success('Usuario actualizado correctamente');
              m.close();
              UsersView.loadUsers();
            } catch (err) {
              Toast.error(err.message || 'Error al actualizar usuario');
            }
          }
        }
      ]
    });
  },

  openPasswordModal(user) {
    Modal.open({
      title: `🔑 Cambiar Contraseña para: ${user.username}`,
      contentHtml: `
        <div class="form-group">
          <label class="form-label">Nueva Contraseña <span style="color:red;">*</span></label>
          <input type="password" id="modal-pwd-new" class="form-control" placeholder="Mínimo 4 caracteres" required autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="form-label">Confirmar Nueva Contraseña <span style="color:red;">*</span></label>
          <input type="password" id="modal-pwd-confirm" class="form-control" placeholder="Repite la contraseña" required>
        </div>
      `,
      footerButtons: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (e, m) => m.close() },
        {
          label: 'Actualizar Contraseña',
          class: 'btn-primary',
          icon: Icons.check,
          onClick: async (e, m) => {
            const p1 = document.getElementById('modal-pwd-new')?.value;
            const p2 = document.getElementById('modal-pwd-confirm')?.value;

            if (!p1 || !p2) {
              Toast.warning('Por favor completa ambos campos');
              return;
            }
            if (p1 !== p2) {
              Toast.warning('Las contraseñas ingresadas no coinciden');
              return;
            }
            if (p1.length < 4) {
              Toast.warning('La contraseña debe tener al menos 4 caracteres');
              return;
            }

            try {
              await API.updateUser(user.id, { password: p1 });
              Toast.success(`Contraseña actualizada para el usuario ${user.username}`);
              m.close();
            } catch (err) {
              Toast.error(err.message || 'Error al actualizar contraseña');
            }
          }
        }
      ]
    });
  },

  async toggleStatus(userId, username, currentStatus) {
    const actionText = currentStatus === 1 ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que deseas ${actionText} la cuenta del usuario '${username}'?`)) {
      return;
    }

    try {
      await API.deleteUser(userId);
      Toast.success(`Estado del usuario '${username}' actualizado`);
      UsersView.loadUsers();
    } catch (err) {
      Toast.error(err.message || 'Error al modificar estado');
    }
  }
};
