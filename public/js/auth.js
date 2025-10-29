// Authentication related functions

// Check if user is authenticated
function checkAuthStatus() {
  fetch('/api/auth/status')
    .then(response => response.json())
    .then(data => {
      if (data.isAuthenticated) {
        // User is authenticated
        try { localStorage.setItem('currentUser', JSON.stringify(data.user)); } catch (e) {}
        if (!data.user.passwordChanged) {
          // Password needs to be changed
          showChangePasswordForm();
        } else {
          // Load main application
          loadApp();
        }
      } else {
        // User is not authenticated, show login form
        showLoginForm();
      }
    })
    .catch(error => {
      console.error('Error checking auth status:', error);
      showLoginForm();
    });
}

// Show login form
function showLoginForm() {
  const appContainer = document.getElementById('app');
  appContainer.innerHTML = `
    <div class="login-container">
      <div class="login-logo">
        <i class="bi bi-shield-lock"></i>
      </div>
      <h2>Sistema de Atividades</h2>
      <p class="text-muted mb-4">Faça login para acessar o sistema</p>
      
      <div id="login-alert" class="alert alert-danger d-none" role="alert"></div>
      
      <form id="login-form">
        <div class="mb-3">
          <label for="username" class="form-label">Usuário ou Email</label>
          <input type="text" class="form-control" id="username" placeholder="Digite seu usuário ou email" required>
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">Senha</label>
          <input type="password" class="form-control" id="password" placeholder="Digite sua senha" required>
        </div>
        <button type="submit" class="btn btn-primary w-100">Entrar</button>
      </form>
    </div>
  `;

  // Add event listener to login form
  document.getElementById('login-form').addEventListener('submit', handleLogin);
}

// Handle login form submission
function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const alertElement = document.getElementById('login-alert');
  
  // Clear previous alerts
  alertElement.classList.add('d-none');
  
  fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
    .then(response => response.json())
    .then(data => {
      if (data.token) {
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        try { localStorage.setItem('currentUser', JSON.stringify(data.user)); } catch (e) {}
        
        if (!data.user.passwordChanged) {
          // Password needs to be changed
          showChangePasswordForm();
        } else {
          // Load main application
          loadApp();
        }
      } else {
        // Show error message
        alertElement.textContent = data.message || 'Erro ao fazer login';
        alertElement.classList.remove('d-none');
      }
    })
    .catch(error => {
      console.error('Login error:', error);
      alertElement.textContent = 'Erro ao conectar ao servidor';
      alertElement.classList.remove('d-none');
    });
}

// Show change password form
function showChangePasswordForm() {
  const appContainer = document.getElementById('app');
  appContainer.innerHTML = `
    <div class="login-container">
      <div class="login-logo">
        <i class="bi bi-key"></i>
      </div>
      <h2>Alterar Senha</h2>
      <p class="text-muted mb-4">É necessário alterar sua senha no primeiro acesso</p>
      
      <div id="password-alert" class="alert d-none" role="alert"></div>
      
      <form id="change-password-form">
        <div class="mb-3">
          <label for="current-password" class="form-label">Senha Atual</label>
          <input type="password" class="form-control" id="current-password" required>
        </div>
        <div class="mb-3">
          <label for="new-password" class="form-label">Nova Senha</label>
          <input type="password" class="form-control" id="new-password" required>
        </div>
        <div class="mb-3">
          <label for="confirm-password" class="form-label">Confirmar Nova Senha</label>
          <input type="password" class="form-control" id="confirm-password" required>
        </div>
        <button type="submit" class="btn btn-primary w-100">Alterar Senha</button>
      </form>
    </div>
  `;

  // Add event listener to change password form
  document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
}

// Handle change password form submission
function handleChangePassword(event) {
  event.preventDefault();
  
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const alertElement = document.getElementById('password-alert');
  
  // Clear previous alerts
  alertElement.classList.add('d-none');
  
  // Check if passwords match
  if (newPassword !== confirmPassword) {
    alertElement.textContent = 'As senhas não coincidem';
    alertElement.className = 'alert alert-danger';
    alertElement.classList.remove('d-none');
    return;
  }
  
  // Get user ID from session
  fetch('/api/auth/status')
    .then(response => response.json())
    .then(data => {
      if (data.isAuthenticated) {
        const userId = data.user.id;
        
        // Send change password request
        fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ currentPassword, newPassword, userId })
        })
          .then(response => response.json())
          .then(data => {
            if (data.message === 'Senha alterada com sucesso') {
              // Show success message
              alertElement.textContent = 'Senha alterada com sucesso. Redirecionando...';
              alertElement.className = 'alert alert-success';
              alertElement.classList.remove('d-none');
              
              // Redirect to main app after 2 seconds
              setTimeout(() => {
                loadApp();
              }, 2000);
            } else {
              // Show error message
              alertElement.textContent = data.message || 'Erro ao alterar senha';
              alertElement.className = 'alert alert-danger';
              alertElement.classList.remove('d-none');
            }
          })
          .catch(error => {
            console.error('Change password error:', error);
            alertElement.textContent = 'Erro ao conectar ao servidor';
            alertElement.className = 'alert alert-danger';
            alertElement.classList.remove('d-none');
          });
      }
    })
    .catch(error => {
      console.error('Error getting user info:', error);
      alertElement.textContent = 'Erro ao obter informações do usuário';
      alertElement.className = 'alert alert-danger';
      alertElement.classList.remove('d-none');
    });
}

// Logout function
function logout() {
  fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(() => {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      showLoginForm();
    })
    .catch(error => {
      console.error('Logout error:', error);
      // Force logout on error
      localStorage.removeItem('token');
      showLoginForm();
    });
}