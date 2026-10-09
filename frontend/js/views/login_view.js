/**
 * Vista de Autenticación / Login
 */
const LoginView = {
  render(container) {
    container.innerHTML = `
      <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
        <div style="width: 100%; max-width: 420px; background: white; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid var(--border-color); overflow: hidden;">
          
          <!-- Cabecera de la Tarjeta con Logo Oficial -->
          <div style="background: linear-gradient(135deg, #005063 0%, #006D87 50%, #00A8CC 100%); padding: 2.25rem 1.5rem 1.75rem; text-align: center; color: white;">
            <div style="background: #FFFFFF; padding: 6px 14px; border-radius: 0.75rem; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.85rem; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);">
              <img src="hospital-quillabamba-logo.png" alt="Hospital Quillabamba" style="height: 48px; max-width: 140px; object-fit: contain;">
            </div>
            <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.25rem; letter-spacing: -0.01em;">SGEC-HQ</h2>
            <p style="font-size: 0.83rem; opacity: 0.92; margin: 0; font-weight: 500;">Sistema de Gestión de Estructuras de Costo</p>
          </div>

          <!-- Formulario de Login -->
          <div style="padding: 2rem 1.75rem;">
            <div id="login-alert-box" style="display: none; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.82rem; margin-bottom: 1.25rem; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;">
            </div>

            <form id="login-form" onsubmit="LoginView.handleSubmit(event)">
              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label class="form-label" style="font-weight: 600; font-size: 0.85rem;">Usuario / Operador</label>
                <div class="search-input-wrap">
                  <span class="search-icon">${Icons.user}</span>
                  <input type="text" id="login-username" class="form-control" placeholder="Nombre de usuario" required autocomplete="username" autofocus style="padding-left: 2.5rem; font-size: 0.9rem;">
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 1.5rem;">
                <label class="form-label" style="font-weight: 600; font-size: 0.85rem;">Contraseña</label>
                <div class="search-input-wrap">
                  <span class="search-icon">${Icons.lock}</span>
                  <input type="password" id="login-password" class="form-control" placeholder="Contraseña de acceso" required autocomplete="current-password" style="padding-left: 2.5rem; font-size: 0.9rem;">
                </div>
              </div>

              <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.5rem;">
                <span>Ingresar al Sistema</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
              </button>
            </form>

            <div style="text-align: center; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem;">
              <span style="font-weight: 700; color: var(--color-primary);">Hospital Quillabamba</span>
              <br><span style="opacity: 0.8; font-style: italic; font-size: 0.75rem;">Un Compromiso Por La Vida</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async handleSubmit(e) {
    e.preventDefault();
    const alertBox = document.getElementById('login-alert-box');
    const submitBtn = document.getElementById('btn-login-submit');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) return;

    if (alertBox) alertBox.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Autenticando...</span>`;
    }

    try {
      const resp = await API.login(username, password);
      Toast.success(`¡Bienvenido, ${resp.user.nombre_completo}!`);
      App.onLoginSuccess(resp.user);
    } catch (err) {
      if (alertBox) {
        alertBox.textContent = err.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.';
        alertBox.style.display = 'block';
      }
      Toast.error(err.message || 'Error al iniciar sesión');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>Ingresar al Sistema</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
        `;
      }
    }
  }
};
