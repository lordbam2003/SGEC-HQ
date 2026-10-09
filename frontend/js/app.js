/**
 * Aplicación Principal / Router SPA (Vanilla JS)
 */
const App = {
  currentView: 'dashboard',
  contentEl: null,

  async init() {
    this.contentEl = document.getElementById('content-container');
    this.setupNavigation();
    this.restoreSidebarState();

    // Validar autenticación
    if (!API.isLoggedIn()) {
      this.navigate('login');
    } else {
      // Refrescar perfil del usuario en segundo plano
      try {
        await API.getMe();
      } catch (e) {
        console.warn('No se pudo refrescar perfil:', e);
      }
      this.renderUserProfile();
      this.updateNavigationPermissions();

      const initialRoute = window.location.hash.replace('#/', '') || 'dashboard';
      if (initialRoute === 'login') {
        this.navigate('dashboard');
      } else {
        this.navigate(initialRoute);
      }
    }

    window.addEventListener('hashchange', () => {
      const route = window.location.hash.replace('#/', '') || 'dashboard';
      if (!API.isLoggedIn()) {
        if (route !== 'login') this.navigate('login');
      } else {
        this.navigate(route, false);
      }
    });
  },

  renderUserProfile() {
    const user = API.getCurrentUser();
    const profileContainer = document.getElementById('header-user-profile');
    if (!profileContainer) return;

    if (!user) {
      profileContainer.innerHTML = '';
      return;
    }

    const initials = user.nombre_completo
      ? user.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
      : 'U';

    const isAdmin = user.rol === 'admin';
    const roleBadge = isAdmin
      ? `<span class="badge" style="background: #e0e7ff; color: #4338ca; font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.4rem;">ADMIN</span>`
      : `<span class="badge" style="background: #f1f5f9; color: #475569; font-size: 0.65rem; font-weight: 600; padding: 0.15rem 0.4rem;">OPERADOR</span>`;

    profileContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;" title="${user.nombre_completo} (${user.username})">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isAdmin ? '#0f766e' : '#3b82f6'}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          ${initials}
        </div>
        <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.15;">
          <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-main); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${user.nombre_completo.split(' ')[0]}
          </span>
          <div>${roleBadge}</div>
        </div>
      </div>

      <button class="btn btn-secondary btn-sm" onclick="App.logout()" title="Cerrar Sesión" style="padding: 0.35rem 0.6rem; margin-left: 0.25rem; color: #dc2626; border-color: #fecaca; background: #fff5f5;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
      </button>
    `;
  },

  updateNavigationPermissions() {
    const usersNavItem = document.getElementById('nav-item-users');
    if (usersNavItem) {
      usersNavItem.style.display = API.isAdmin() ? 'flex' : 'none';
    }
  },

  onLoginSuccess(user) {
    this.renderUserProfile();
    this.updateNavigationPermissions();
    this.navigate('dashboard');
  },

  onSessionExpired() {
    Toast.warning('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
    this.navigate('login');
  },

  async logout() {
    if (!confirm('¿Deseas cerrar tu sesión actual?')) return;
    await API.logout();
    this.renderUserProfile();
    this.updateNavigationPermissions();
    Toast.info('Has cerrado sesión correctamente');
    this.navigate('login');
  },

  restoreSidebarState() {
    const isCollapsed = localStorage.getItem('costeo_sidebar_collapsed') === 'true';
    const appLayout = document.getElementById('app-layout');
    if (appLayout) {
      if (isCollapsed) {
        appLayout.classList.add('sidebar-collapsed');
      } else {
        appLayout.classList.remove('sidebar-collapsed');
      }
    }
  },

  toggleSidebar() {
    const appLayout = document.getElementById('app-layout');
    if (appLayout) {
      appLayout.classList.toggle('sidebar-collapsed');
      const isCollapsed = appLayout.classList.contains('sidebar-collapsed');
      localStorage.setItem('costeo_sidebar_collapsed', isCollapsed);
    }
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        if (view) {
          this.navigate(view);
        }
      });
    });
  },

  navigate(viewName, updateHash = true) {
    // Si no está autenticado, redirigir obligatoriamente a login
    if (!API.isLoggedIn() && viewName !== 'login') {
      viewName = 'login';
    }

    this.currentView = viewName;
    if (updateHash) {
      window.location.hash = `#/${viewName}`;
    }

    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    const headerActions = document.getElementById('header-actions-area');
    const badgeEl = document.getElementById('header-view-badge');

    if (viewName === 'login') {
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      this.contentEl.innerHTML = '';
      LoginView.render(this.contentEl);
      return;
    } else {
      if (sidebar) sidebar.style.display = 'flex';
      if (header) header.style.display = 'flex';
      if (headerActions) headerActions.style.display = 'flex';
      this.renderUserProfile();
      this.updateNavigationPermissions();
    }

    // Actualizar clase activa en sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      const v = item.getAttribute('data-view');
      if (v === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Actualizar badge en header
    const titles = {
      dashboard: 'Panel General',
      sheets: 'Gestor de Hojas de Costeo',
      studio: 'Costing Studio (Editor)',
      matrix: 'Matriz Resumen de Costos',
      tariffs: 'Propuesta Tarifaria',
      market: 'Estudio de Mercado',
      catalogs: 'Catálogos & Actualización',
      users: 'Gestión de Usuarios'
    };
    if (badgeEl) badgeEl.textContent = titles[viewName] || 'SGEC-HQ';

    // Renderizar vista
    this.contentEl.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);">Cargando vista...</div>';

    switch (viewName) {
      case 'dashboard':
        DashboardView.render(this.contentEl);
        break;
      case 'sheets':
        CostingSheetsView.render(this.contentEl);
        break;
      case 'studio':
        CostingStudioView.render(this.contentEl);
        break;
      case 'matrix':
        MatrixView.render(this.contentEl);
        break;
      case 'tariffs':
        TariffView.render(this.contentEl);
        break;
      case 'market':
        MarketView.render(this.contentEl);
        break;
      case 'catalogs':
        CatalogsView.render(this.contentEl);
        break;
      case 'users':
        UsersView.render(this.contentEl);
        break;
      default:
        DashboardView.render(this.contentEl);
    }
  },

  editCosting(costeoId) {
    this.currentView = 'studio';
    window.location.hash = `#/studio`;
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === 'studio') item.classList.add('active');
      else item.classList.remove('active');
    });
    CostingStudioView.render(this.contentEl, costeoId);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

