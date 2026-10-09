/**
 * Sistema de Notificaciones Toast Amigables
 */
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'success', duration = 3500) {
    this.init();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = Icons.check;
    if (type === 'error') icon = Icons.x;
    if (type === 'warning') icon = Icons.info;
    if (type === 'info') icon = Icons.info;

    toast.innerHTML = `
      <span style="color: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'}">
        ${icon}
      </span>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error', 4500); },
  info(msg) { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); }
};

/**
 * Gestor de Modales Dinámico
 */
const Modal = {
  backdrop: null,
  titleEl: null,
  bodyEl: null,
  footerEl: null,

  init() {
    if (!this.backdrop) {
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'modal-backdrop';
      this.backdrop.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Título del Modal</h3>
            <button class="modal-close-btn" id="modal-close-x">${Icons.x}</button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer" id="modal-footer"></div>
        </div>
      `;
      document.body.appendChild(this.backdrop);

      this.titleEl = document.getElementById('modal-title');
      this.bodyEl = document.getElementById('modal-body');
      this.footerEl = document.getElementById('modal-footer');

      document.getElementById('modal-close-x').addEventListener('click', () => this.close());
      this.backdrop.addEventListener('click', (e) => {
        if (e.target === this.backdrop) this.close();
      });
    }
  },

  open({ title, contentHtml, footerButtons = [], size = 'md' }) {
    this.init();
    this.titleEl.innerHTML = title;
    this.bodyEl.innerHTML = contentHtml;

    const contentBox = this.backdrop.querySelector('.modal-content');
    if (contentBox) {
      if (size === 'xl') {
        contentBox.style.maxWidth = '1050px';
      } else if (size === 'lg') {
        contentBox.style.maxWidth = '850px';
      } else {
        contentBox.style.maxWidth = '680px';
      }
    }

    this.footerEl.innerHTML = '';
    footerButtons.forEach(btnConfig => {
      const btn = document.createElement('button');
      btn.className = `btn ${btnConfig.class || 'btn-secondary'}`;
      btn.innerHTML = `${btnConfig.icon ? btnConfig.icon + ' ' : ''}${btnConfig.label}`;
      btn.addEventListener('click', (e) => {
        if (btnConfig.onClick) btnConfig.onClick(e, this);
      });
      this.footerEl.appendChild(btn);
    });

    this.backdrop.classList.add('active');
  },

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove('active');
    }
  }
};
