// Main application functionality

// Load the main application
function loadApp() {
  const appContainer = document.getElementById('app');
  appContainer.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <!-- Sidebar -->
        <div class="col-md-2 sidebar">
          <div class="sidebar-header">
            <h5>Sistema de Atividades</h5>
          </div>
          <ul class="nav flex-column">
            <li class="nav-item">
              <a class="nav-link active" href="#" data-page="dashboard">
                <i class="bi bi-speedometer2"></i> Dashboard
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" data-page="activities">
                <i class="bi bi-list-check"></i> Atividades
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" data-page="schedule">
                <i class="bi bi-calendar3"></i> Cronograma
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" data-page="reports">
                <i class="bi bi-file-earmark-bar-graph"></i> Relatórios
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" data-page="settings">
                <i class="bi bi-gear"></i> Configurações
              </a>
            </li>
            <li class="nav-item mt-5">
              <a class="nav-link" href="#" id="logout-link">
                <i class="bi bi-box-arrow-right"></i> Sair
              </a>
            </li>
          </ul>
        </div>
        
        <!-- Main Content -->
        <div class="col-md-10 p-4">
          <div id="content-area">
            <!-- Content will be loaded here -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Aplica visibilidade por papel no menu
  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
  if (currentUser && currentUser.role !== 'admin') {
    const settingsLink = document.querySelector('.nav-link[data-page="settings"]');
    if (settingsLink) settingsLink.parentElement.style.display = 'none';
  }

  // Add event listeners to navigation links
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('active');
      });
      
      // Add active class to clicked link
      e.target.classList.add('active');
      
      // Load the selected page
      const page = e.target.getAttribute('data-page');
      loadPage(page);
    });
  });
  
  // Add event listener to logout link
  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
  
  // Load dashboard by default
  loadPage('dashboard');
}

// Load specific page content
function loadPage(page) {
  const contentArea = document.getElementById('content-area');
  
  switch (page) {
    case 'dashboard':
      loadDashboard(contentArea);
      break;
    case 'activities':
      loadActivities(contentArea);
      break;
    case 'schedule':
      loadSchedule(contentArea);
      break;
    case 'reports':
      loadReports(contentArea);
      break;
    case 'import-export':
      loadImportExport(contentArea);
      break;
    case 'settings':
      loadSettings(contentArea);
      break;
    default:
      contentArea.innerHTML = '<h2>Página não encontrada</h2>';
  }
}

// Load dashboard page
function loadDashboard(container) {
  container.innerHTML = `
    <h2 class="mb-4">Dashboard</h2>
    
    <div class="row">
      <!-- KPI Cards -->
      <div class="col-md-4">
        <div class="dashboard-card d-flex align-items-center">
          <div class="card-icon bg-light text-primary">
            <i class="bi bi-list-check"></i>
          </div>
          <div>
            <div class="card-value" id="total-activities">0</div>
            <div class="card-title">Total de Atividades</div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="dashboard-card d-flex align-items-center">
          <div class="card-icon bg-light text-success">
            <i class="bi bi-check-circle"></i>
          </div>
          <div>
            <div class="card-value" id="completed-activities">0</div>
            <div class="card-title">Atividades Finalizadas</div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="dashboard-card d-flex align-items-center">
          <div class="card-icon bg-light text-info">
            <i class="bi bi-clock"></i>
          </div>
          <div>
            <div class="card-value" id="total-hours">0</div>
            <div class="card-title">Total de Horas</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row mt-4">
      <!-- Charts -->
      <div class="col-md-7">
        <div class="dashboard-card">
          <h5>Horas por Mês</h5>
          <canvas id="hours-chart" height="250"></canvas>
        </div>
      </div>
      
      <div class="col-md-5">
        <div class="dashboard-card">
          <h5>Atividades por Origem</h5>
          <canvas id="origin-chart" height="250"></canvas>
        </div>
      </div>
    </div>
  `;
  
  // Fetch dashboard data
  fetchDashboardData();
}

// Fetch dashboard data and update UI
function fetchDashboardData() {
  // Fetch activities summary
  fetch('/api/activities/summary/dashboard', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(response => response.json())
    .then(data => {
      // Update KPI cards
      const totalActivitiesEl = document.getElementById('total-activities');
      const completedActivitiesEl = document.getElementById('completed-activities');
      const totalHoursEl = document.getElementById('total-hours');
      
      if (totalActivitiesEl) totalActivitiesEl.textContent = data.totalActivities || 0;
      if (completedActivitiesEl) completedActivitiesEl.textContent = data.completedActivities || 0;
      if (totalHoursEl) totalHoursEl.textContent = data.totalHours || 0;
      
      // Create hours chart
      createHoursChart(data.hoursByMonth || []);
      
      // Create origin chart
      createOriginChart(data.activitiesByOrigin || []);
    })
    .catch(error => {
      console.error('Error fetching dashboard data:', error);
    });
}

// Util helpers for safe date parsing/formatting
function parseDateSafe(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  // ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt) ? null : dt;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function formatDateBR(v) {
  const d = parseDateSafe(v);
  return d ? d.toLocaleDateString('pt-BR') : '-';
}

function isoOrYmdToYmd(v) {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = parseDateSafe(s);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Create hours by month chart
function createHoursChart(data) {
  // Destroy existing chart instance to avoid 'Canvas is already in use'
  if (window.__hoursChartInstance && typeof window.__hoursChartInstance.destroy === 'function') {
    try { window.__hoursChartInstance.destroy(); } catch (_) {}
    window.__hoursChartInstance = null;
  }
  const canvas = document.getElementById('hours-chart');
  if (!canvas) {
    console.warn('hours-chart canvas not found; skipping chart render');
    return;
  }
  const ctx = canvas.getContext('2d');
  
  // Usar apenas dados reais
  const chartData = {
    labels: data.length > 0 ? data.map(item => item.month) : [],
    datasets: [{
      label: 'Horas',
      data: data.length > 0 ? data.map(item => item.hours) : [],
      backgroundColor: 'rgba(118, 106, 192, 0.7)',
      borderColor: 'rgba(118, 106, 192, 1)',
      borderWidth: 1
    }]
  };
  
  window.__hoursChartInstance = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create activities by origin chart
function createOriginChart(data) {
  // Destroy existing chart instance to avoid reuse error
  if (window.__originChartInstance && typeof window.__originChartInstance.destroy === 'function') {
    try { window.__originChartInstance.destroy(); } catch (_) {}
    window.__originChartInstance = null;
  }
  const canvas = document.getElementById('origin-chart');
  if (!canvas) {
    console.warn('origin-chart canvas not found; skipping chart render');
    return;
  }
  const ctx = canvas.getContext('2d');
  
  // Usar apenas dados reais
  const chartData = {
    labels: data.length > 0 ? data.map(item => item.origin) : [],
    datasets: [{
      data: data.length > 0 ? data.map(item => item.count) : [],
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 99, 132, 0.7)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)'
      ],
      borderWidth: 1
    }]
  };
  
  window.__originChartInstance = new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

// Load activities page
function loadActivities(container) {
  container.innerHTML = `
    <h2 class="mb-4">Atividades</h2>
    
    <div class="row">
      <!-- New Activity Form -->
      <div class="col-md-12 mb-4">
        <div class="form-container">
          <h4 class="form-title">Nova Atividade</h4>
          
          <form id="activity-form" class="row g-3">
            <div class="col-md-6">
              <label for="origin" class="form-label">Origem <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="origin" required>
            </div>
            
            <div class="col-md-6">
              <label for="activity" class="form-label">Atividade <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="activity" required>
            </div>
            
            <div class="col-md-4">
              <label for="date" class="form-label">Data <span class="text-danger">*</span></label>
              <input type="date" class="form-control" id="date" required>
            </div>
            
            <div class="col-md-2">
              <label for="duration" class="form-label">Duração (HH:MM) <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="duration" placeholder="00:00" required>
            </div>
            
            <div class="col-md-3">
              <label for="status" class="form-label">Status <span class="text-danger">*</span></label>
              <select class="form-select" id="status" required>
                <option value="pendente">Pendente</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>

            <div class="col-md-3" id="due-date-wrapper" style="display:none;">
              <label for="due-date" class="form-label">Data para Finalização</label>
              <input type="date" class="form-control" id="due-date">
            </div>
            
            <div class="col-md-3">
              <label for="priority" class="form-label">Prioridade <span class="text-danger">*</span></label>
              <select class="form-select" id="priority" required>
                <option value="baixa">Baixa</option>
                <option value="media" selected>Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            
            <div class="col-md-6">
              <label for="responsible" class="form-label">Responsável</label>
              <div class="input-group">
                <select class="form-select" id="responsible">
                  <option value="">Selecione um responsável</option>
                  <!-- Will be populated from API -->
                </select>
                <button class="btn btn-outline-secondary" type="button" id="new-responsible-btn">
                  <i class="bi bi-plus"></i> Novo
                </button>
              </div>
            </div>
            
            <div class="col-12">
              <small class="text-muted"><span class="text-danger">*</span> Campos obrigatórios</small>
            </div>
            
            <!-- Modal para criar novo responsável -->
            <div class="modal fade" id="new-responsible-modal" tabindex="-1" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Novo Responsável</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="new-responsible-form">
                      <div class="mb-3">
                        <label for="new-responsible-name" class="form-label">Nome</label>
                        <input type="text" class="form-control" id="new-responsible-name" required>
                      </div>
                      <div class="mb-3">
                        <label for="new-responsible-email" class="form-label">Email</label>
                        <input type="email" class="form-control" id="new-responsible-email" required>
                      </div>
                      <div class="mb-3">
                        <label for="new-responsible-sector" class="form-label">Setor</label>
                        <input type="text" class="form-control" id="new-responsible-sector" list="sectors-list" required>
                        <datalist id="sectors-list">
                          <!-- Será preenchido com os setores existentes -->
                        </datalist>
                      </div>
                    </form>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="save-responsible-btn">Salvar</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6">
              <label for="observation" class="form-label">Observação</label>
              <textarea class="form-control" id="observation" rows="1"></textarea>
            </div>
            
            <div class="col-12 text-end">
              <button type="submit" class="btn btn-primary" id="add-activity-btn">
                <i class="bi bi-plus-circle"></i> Adicionar Atividade
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <div class="row">
      <!-- Filters -->
      <div class="col-md-3">
        <div class="filters-sidebar">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="filters-title mb-0">Filtros</h5>
            <button class="btn btn-sm btn-outline-secondary" id="clear-filters">Limpar</button>
          </div>
          
          <form id="filters-form">
            <div class="mb-3">
              <label for="filter-origin" class="form-label">Origem</label>
              <input type="text" class="form-control" id="filter-origin">
            </div>
            
            <div class="mb-3">
              <label for="filter-activity" class="form-label">Atividade</label>
              <input type="text" class="form-control" id="filter-activity">
            </div>
            
            <div class="mb-3">
              <label for="filter-start-date" class="form-label">Data Inicial</label>
              <input type="date" class="form-control" id="filter-start-date">
            </div>
            
            <div class="mb-3">
              <label for="filter-end-date" class="form-label">Data Final</label>
              <input type="date" class="form-control" id="filter-end-date">
            </div>
            
            <div class="mb-3">
              <label for="filter-status" class="form-label">Status</label>
              <select class="form-select" id="filter-status">
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
            
            <div class="mb-3">
              <label for="filter-priority" class="form-label">Prioridade</label>
              <select class="form-select" id="filter-priority">
                <option value="">Todas</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            
            <div class="mb-3">
              <label for="filter-responsible" class="form-label">Responsável</label>
              <select class="form-select" id="filter-responsible">
                <option value="">Todos</option>
                <!-- Will be populated from API -->
              </select>
            </div>
            
            <button type="submit" class="btn btn-primary w-100">Aplicar Filtros</button>
          </form>
        </div>
      </div>
      
      <!-- Activities List -->
      <div class="col-md-9">
        <div class="table-responsive">
          <table class="table table-hover activities-table">
            <thead>
              <tr>
                <th>Origem</th>
                <th>Atividade</th>
                <th>Finalizada em</th>
                <th>Finalizará em</th>
                <th>Criada em</th>
                <th>Atualizada em</th>
                <th>Duração</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Responsável</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="activities-list">
              <!-- Will be populated from API -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de confirmação de exclusão de atividade -->
    <div id="confirm-delete-activity-modal" class="modal" tabindex="-1" style="display:none;">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirmar exclusão</h5>
            <button type="button" class="btn-close" id="confirm-delete-activity-close"></button>
          </div>
          <div class="modal-body">
            <p>Tem certeza que deseja excluir esta atividade?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-delete-activity-btn">Cancelar</button>
            <button type="button" class="btn btn-danger" id="confirm-delete-activity-btn">Excluir</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Controle de UI por papel
  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
  const role = currentUser ? currentUser.role : 'view';
  // Visualizador pode criar atividades, mas somente para si; não ocultar o formulário

  // Add event listeners
  // Adicionando evento com setTimeout para garantir que o DOM esteja completamente carregado
  setTimeout(() => {
    const activityForm = document.getElementById('activity-form');
    if (activityForm) {
      console.log('Formulário de atividade encontrado, adicionando evento');
      activityForm.addEventListener('submit', handleAddActivity);

      // Mostrar/ocultar Data para Finalização conforme status
      const statusSelect = document.getElementById('status');
      const dueDateWrapper = document.getElementById('due-date-wrapper');
      const updateDueDateVisibility = () => {
        const val = statusSelect ? statusSelect.value : 'pendente';
        if (val === 'pendente' || val === 'em_execucao') {
          if (dueDateWrapper) dueDateWrapper.style.display = '';
        } else {
          if (dueDateWrapper) dueDateWrapper.style.display = 'none';
        }
      };
      if (statusSelect) {
        statusSelect.addEventListener('change', updateDueDateVisibility);
        updateDueDateVisibility();
      }
      
      // Adicionar evento diretamente ao botão também
      const addActivityBtn = document.getElementById('add-activity-btn');
      if (addActivityBtn) {
        addActivityBtn.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Botão de adicionar atividade clicado');
          handleAddActivity(new Event('submit'));
        });
      }
    } else {
      console.error('Formulário de atividade não encontrado!');
    }
  }, 100);
  
  const filtersFormEl = document.getElementById('filters-form');
  if (filtersFormEl) {
    filtersFormEl.addEventListener('submit', handleApplyFilters);
  } else {
    console.error('Elemento filters-form não encontrado');
  }
  const clearFiltersEl = document.getElementById('clear-filters');
  if (clearFiltersEl) {
    clearFiltersEl.addEventListener('click', handleClearFilters);
  } else {
    console.error('Elemento clear-filters não encontrado');
  }
  const newResponsibleBtnEl = document.getElementById('new-responsible-btn');
  if (newResponsibleBtnEl) {
    newResponsibleBtnEl.addEventListener('click', () => {
      const modalEl = document.getElementById('new-responsible-modal');
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      } else {
        console.error('Modal new-responsible-modal não encontrado');
      }
    });
  } else {
    console.error('Botão new-responsible-btn não encontrado');
  }
  // Ocultar botão de novo responsável para papel view
  if (role === 'view' && newResponsibleBtnEl) {
    newResponsibleBtnEl.style.display = 'none';
  }
  // Para visualizador, travar o responsável para o próprio usuário
  const responsibleSelectInit = document.getElementById('responsible');
  if (role === 'view' && responsibleSelectInit) {
    responsibleSelectInit.disabled = true;
    setTimeout(() => {
      try {
        const cu = JSON.parse(localStorage.getItem('currentUser'));
        if (cu && cu.id) {
          responsibleSelectInit.value = String(cu.id);
        }
      } catch (e) {}
    }, 500);
  }
  const saveResponsibleBtnEl = document.getElementById('save-responsible-btn');
  if (saveResponsibleBtnEl) {
    saveResponsibleBtnEl.addEventListener('click', handleAddResponsible);
  } else {
    console.error('Botão save-responsible-btn não encontrado');
  }
  
  // Load users for responsible dropdown
  loadUsers();
  
  // Load sectors for sector dropdown
  loadSectors();
  
  // Load activities list
  loadActivitiesList();

  // Listeners do modal de confirmação de exclusão de atividade
  const confirmDeleteModalEl = document.getElementById('confirm-delete-activity-modal');
  const confirmDeleteBtnEl = document.getElementById('confirm-delete-activity-btn');
  const cancelDeleteBtnEl = document.getElementById('cancel-delete-activity-btn');
  const closeDeleteBtnEl = document.getElementById('confirm-delete-activity-close');
  if (cancelDeleteBtnEl) cancelDeleteBtnEl.addEventListener('click', () => { if (confirmDeleteModalEl) confirmDeleteModalEl.style.display = 'none'; });
  if (closeDeleteBtnEl) closeDeleteBtnEl.addEventListener('click', () => { if (confirmDeleteModalEl) confirmDeleteModalEl.style.display = 'none'; });
  if (confirmDeleteBtnEl) {
    confirmDeleteBtnEl.addEventListener('click', () => {
      const id = confirmDeleteBtnEl.getAttribute('data-activity-id');
      if (id) {
        handleDeleteActivity(id);
      }
    });
  }
}

// Handle add activity form submission
function handleAddActivity(event) {
  event.preventDefault();
  console.log('Formulário de atividade enviado');
  
  // Processar o campo de duração para aceitar formatos simplificados
  let duration = document.getElementById('duration').value;
  if (duration) {
    // Se for apenas números, converter para formato HH:MM
    if (/^\d+$/.test(duration)) {
      const minutes = parseInt(duration);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      duration = `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
    }
  }
  
  // Verificar se todos os campos obrigatórios estão presentes
  const origin = document.getElementById('origin');
  const activity = document.getElementById('activity');
  const date = document.getElementById('date');
  const status = document.getElementById('status');
  const priority = document.getElementById('priority');
  const responsible = document.getElementById('responsible');
  const observation = document.getElementById('observation');
  const dueDate = document.getElementById('due-date');
  
  if (!origin || !activity || !date || !duration || !status || !priority) {
    console.error('Campos obrigatórios não encontrados no formulário');
    alert('Erro: Alguns campos obrigatórios não foram encontrados. Por favor, recarregue a página.');
    return;
  }
  
  const activityData = {
    origin: origin.value,
    activity: activity.value,
    date: date.value,
    duration: duration,
    status: status.value,
    priority: priority.value,
    responsible_id: responsible ? (responsible.value || null) : null,
    observation: observation ? observation.value : '',
    due_date: (status.value === 'pendente' || status.value === 'em_execucao') && dueDate ? (dueDate.value || null) : null
  };
  // Se papel for visualizador, garantir responsável como o próprio usuário
  try {
    const cu = JSON.parse(localStorage.getItem('currentUser'));
    if (cu && cu.role === 'view') {
      activityData.responsible_id = cu.id;
    }
  } catch (e) {}
  
  fetch('/api/activities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(activityData)
  })
    .then(response => response.json())
    .then(data => {
      if (data.id) {
        // Reset form
        document.getElementById('activity-form').reset();
        
        // Reload activities list
        loadActivitiesList();
        
        // Show success message (could add a toast/alert here)
        alert('Atividade adicionada com sucesso!');
      } else {
        // Show error message
        alert(data.message || 'Erro ao adicionar atividade');
      }
    })
    .catch(error => {
      console.error('Error adding activity:', error);
      alert('Erro ao conectar ao servidor');
    });
}

// Load activities list
function loadActivitiesList(filters = {}) {
  const activitiesList = document.getElementById('activities-list');
  // Determina o papel do usuário atual para renderizar ações corretamente
  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
  const role = currentUser && currentUser.role ? currentUser.role : 'view';
  
  // Build query string from filters
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      queryParams.append(key, value);
    }
  });
  
  fetch(`/api/activities?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(response => response.json())
    .then(data => {
      if (Array.isArray(data)) {
        // Clear current list
        activitiesList.innerHTML = '';
        
        if (data.length === 0) {
          activitiesList.innerHTML = `
            <tr>
              <td colspan="10" class="text-center">Nenhuma atividade encontrada</td>
            </tr>
          `;
          return;
        }
        
        // Add activities to list
        data.forEach(activity => {
          const row = document.createElement('tr');
          
          // Format dates safely
          // Finalizada em: usar data de atualização quando concluída; caso contrário, '-'
          const updatedAt = parseDateSafe(activity.updated_at);
          const finalizadaEm = activity.status === 'concluida' ? (updatedAt ? updatedAt.toLocaleDateString('pt-BR') : '-') : '-';
          const createdAt = parseDateSafe(activity.created_at);
          const formattedCreated = createdAt ? createdAt.toLocaleString('pt-BR') : '-';
          const formattedUpdated = updatedAt ? updatedAt.toLocaleString('pt-BR') : '-';

          // Finalizará em (due_date) e atraso
          const due = parseDateSafe(activity.due_date);
          const today = new Date();
          today.setHours(0,0,0,0);
          const dueStr = due ? due.toLocaleDateString('pt-BR') : '-';
          const isOverdue = !!(due && activity.status !== 'concluida' && due.getTime() < today.getTime());
          const dueClass = isOverdue ? 'text-danger fw-semibold' : '';

          // Renderizar botões de ação conforme papel
          let actionsHtml = '';
          if (role === 'admin' || role === 'editor') {
            actionsHtml += `
              <button class="btn btn-sm btn-outline-primary edit-activity" data-id="${activity.id}">
                <i class="bi bi-pencil"></i>
              </button>
            `;
          }
          if (role === 'admin') {
            actionsHtml += `
              <button class="btn btn-sm btn-outline-danger delete-activity" data-id="${activity.id}">
                <i class="bi bi-trash"></i>
              </button>
            `;
          }

          row.innerHTML = `
            <td>${activity.origin}</td>
            <td>${activity.activity}</td>
            <td>${finalizadaEm}</td>
            <td class="${dueClass}">${dueStr}</td>
            <td>${formattedCreated}</td>
            <td>${formattedUpdated}</td>
            <td>${activity.duration}</td>
            <td>
              <span class="status-badge ${activity.status === 'concluida' ? 'status-completed' : (activity.status === 'em_execucao' ? 'status-inprogress' : 'status-pending')}">
                ${activity.status === 'concluida' ? 'Concluída' : (activity.status === 'em_execucao' ? 'Em Execução' : 'Pendente')}
              </span>
            </td>
            <td>
              <span class="status-badge priority-${activity.priority}">
                ${activity.priority === 'alta' ? 'Alta' : activity.priority === 'media' ? 'Média' : 'Baixa'}
              </span>
            </td>
            <td>${activity.responsible_name || '-'}</td>
            <td>${actionsHtml}</td>
          `;
          
          activitiesList.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-activity').forEach(button => {
          button.addEventListener('click', () => handleEditActivity(button.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.delete-activity').forEach(button => {
          button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = button.getAttribute('data-id');
            const confirmDeleteBtnEl = document.getElementById('confirm-delete-activity-btn');
            const confirmModalEl = document.getElementById('confirm-delete-activity-modal');
            if (confirmDeleteBtnEl) confirmDeleteBtnEl.setAttribute('data-activity-id', id || '');
            if (confirmModalEl) confirmModalEl.style.display = 'block';
          });
        });
      } else {
        // Show error message
        activitiesList.innerHTML = `
          <tr>
            <td colspan="10" class="text-center text-danger">Erro ao carregar atividades</td>
          </tr>
        `;
      }
    })
    .catch(error => {
      console.error('Error loading activities:', error);
      activitiesList.innerHTML = `
        <tr>
          <td colspan="10" class="text-center text-danger">Erro ao conectar ao servidor</td>
        </tr>
      `;
    });
}

// Handle apply filters
function handleApplyFilters(event) {
  event.preventDefault();
  
  const filters = {
    origin: document.getElementById('filter-origin').value,
    activity: document.getElementById('filter-activity').value,
    start_date: document.getElementById('filter-start-date').value,
    end_date: document.getElementById('filter-end-date').value,
    status: document.getElementById('filter-status').value,
    priority: document.getElementById('filter-priority').value,
    responsible_id: document.getElementById('filter-responsible').value
  };
  
  loadActivitiesList(filters);
}

// Handle clear filters
function handleClearFilters() {
  document.getElementById('filters-form').reset();
  loadActivitiesList();
}

// Handle adding a new responsible
function handleAddResponsible() {
  const name = document.getElementById('new-responsible-name').value;
  const email = document.getElementById('new-responsible-email').value;
  const sector = document.getElementById('new-responsible-sector').value;
  
  if (!name || !email || !sector) {
    alert('Por favor, preencha todos os campos');
    return;
  }
  
  // Primeiro, verificar se o setor existe ou criar um novo
  fetch('/api/sectors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ name: sector })
  })
  .then(response => response.json())
  .then(sectorData => {
    const userData = {
      name,
      email,
      role: 'view',
      active: true,
      can_login: false,
      sector_id: sectorData.id
    };
    
    return fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(userData)
  })
    .then(response => response.json())
    .then(data => {
      if (data.id) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('new-responsible-modal'));
        modal.hide();
        
        // Reset form
        const form = document.getElementById('new-responsible-form');
        if (form) form.reset();
        
        // Reload users dropdown
        const responsibleSelect = document.getElementById('responsible');
        
        // Clear current options except the first one
        while (responsibleSelect.options.length > 1) {
          responsibleSelect.remove(1);
        }
        
        // Reload users
        loadUsers();
        
        // Select the new user
        setTimeout(() => {
          const options = Array.from(responsibleSelect.options);
          const newOption = options.find(option => option.textContent === name);
          if (newOption) {
            responsibleSelect.value = newOption.value;
          }
        }, 500);
        
        // Show success message
        alert('Responsável adicionado com sucesso!');
      } else {
        // Show error message
        alert(data.message || 'Erro ao adicionar responsável');
      }
    })
    .catch(error => {
      console.error('Error adding responsible:', error);
      alert('Erro ao conectar ao servidor');
    });
  })
  .catch(error => {
    console.error('Error creating sector:', error);
    alert('Erro ao criar setor');
  });
}

// Load sectors for sector dropdown
function loadSectors() {
  const sectorsList = document.getElementById('sectors-list');
  
  if (!sectorsList) {
    console.error('Elemento de lista de setores não encontrado');
    return;
  }
  
  // Limpar opções existentes
  sectorsList.innerHTML = '';
  
  fetch('/api/sectors', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Erro ao carregar setores: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('Setores carregados:', data);
      if (Array.isArray(data)) {
        // Add sectors to datalist
        data.forEach(sector => {
          const option = document.createElement('option');
          option.value = sector.name;
          sectorsList.appendChild(option);
        });
      }
    })
    .catch(error => {
      console.error('Error loading sectors:', error);
    });
}

// Load users for responsible dropdown
function loadUsers() {
  const responsibleSelect = document.getElementById('responsible');
  const filterResponsibleSelect = document.getElementById('filter-responsible');
  
  console.log('loadUsers() chamado');
  if (!responsibleSelect && !filterResponsibleSelect) {
    console.error('Nenhum select de responsáveis encontrado (responsible/filter-responsible)');
    return;
  }
  
  // Limpar opções existentes, mantendo apenas a primeira (placeholder)
  if (responsibleSelect) {
    while (responsibleSelect.options.length > 1) {
      responsibleSelect.remove(1);
    }
  }
  if (filterResponsibleSelect) {
    while (filterResponsibleSelect.options.length > 1) {
      filterResponsibleSelect.remove(1);
    }
  }
  
  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  fetch('/api/users', { headers })
    .then(response => {
      console.log('Resposta de /api/users status:', response.status);
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('Usuários carregados:', data);
      if (Array.isArray(data)) {
        data.forEach(user => {
          if (responsibleSelect) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            responsibleSelect.appendChild(option);
          }
          if (filterResponsibleSelect) {
            const option2 = document.createElement('option');
            option2.value = user.id;
            option2.textContent = user.name;
            filterResponsibleSelect.appendChild(option2);
          }
        });
      }
    })
    .catch(error => {
      console.error('Erro ao carregar usuários:', error);
    });
}

// Handle edit activity
function handleEditActivity(activityId) {
  // Fetch activity details and show edit modal with allowed fields
  fetch(`/api/activities/${activityId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(response => response.json())
    .then(activity => {
      // Create modal dynamically if not exists
      let modalEl = document.getElementById('edit-activity-modal');
      if (!modalEl) {
        const modalHtml = `
          <div class="modal fade" id="edit-activity-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Editar Atividade</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <form id="edit-activity-form">
                    <div class="mb-3">
                      <label class="form-label">Duração atual</label>
                      <input type="text" class="form-control" id="edit-duration-current" disabled>
                    </div>
                    <div class="mb-3">
                      <label class="form-label" for="edit-date">Data</label>
                      <input type="date" class="form-control" id="edit-date">
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Adicionar duração (HH:MM ou minutos)</label>
                      <input type="text" class="form-control" id="edit-duration-add" placeholder="00:30 ou 30">
                      <small class="form-text text-muted">Esse valor será somado à duração atual.</small>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Status</label>
                      <select class="form-select" id="edit-status">
                        <option value="pendente">Pendente</option>
                        <option value="em_execucao">Em Execução</option>
                        <option value="concluida">Concluída</option>
                      </select>
                    </div>
                    <div class="mb-3" id="edit-due-date-wrapper" style="display:none;">
                      <label class="form-label" for="edit-due-date">Data para Finalização</label>
                      <input type="date" class="form-control" id="edit-due-date">
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Prioridade</label>
                      <select class="form-select" id="edit-priority">
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    <div class="mb-3">
                      <label class="form-label" for="edit-responsible">Responsável</label>
                      <select class="form-select" id="edit-responsible">
                        <option value="">Selecione um responsável</option>
                      </select>
                    </div>
                  </form>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                  <button type="button" class="btn btn-primary" id="save-edit-activity">Salvar</button>
                </div>
              </div>
            </div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('edit-activity-modal');
      }

      // Populate fields
      document.getElementById('edit-duration-current').value = activity.duration || '00:00';
      const editDateInput = document.getElementById('edit-date');
      if (editDateInput) editDateInput.value = isoOrYmdToYmd(activity.date);
      document.getElementById('edit-status').value = activity.status || 'pendente';
      document.getElementById('edit-priority').value = activity.priority || 'media';
      const editDueDateInput = document.getElementById('edit-due-date');
      const editDueDateWrapper = document.getElementById('edit-due-date-wrapper');
      if (editDueDateInput) editDueDateInput.value = activity.due_date || '';
      const editStatusSelect = document.getElementById('edit-status');
      const updateEditDueVisibility = () => {
        const val = editStatusSelect ? editStatusSelect.value : 'pendente';
        if (val === 'pendente' || val === 'em_execucao') {
          if (editDueDateWrapper) editDueDateWrapper.style.display = '';
        } else {
          if (editDueDateWrapper) editDueDateWrapper.style.display = 'none';
        }
      };
      if (editStatusSelect) {
        editStatusSelect.addEventListener('change', updateEditDueVisibility);
        updateEditDueVisibility();
      }

      // Carregar responsáveis existentes para o select de edição
      const editRespSelect = document.getElementById('edit-responsible');
      if (editRespSelect) {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch('/api/users', { headers })
          .then(resp => resp.json())
          .then(users => {
            if (Array.isArray(users)) {
              // Limpar opções (mantendo placeholder)
              while (editRespSelect.options.length > 1) {
                editRespSelect.remove(1);
              }
              users.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.name;
                editRespSelect.appendChild(opt);
              });
              // Selecionar responsável atual
              if (activity.responsible_id) {
                editRespSelect.value = String(activity.responsible_id);
              }
            }
          })
          .catch(err => console.error('Erro ao carregar responsáveis (edição):', err));
      }

      // Bind save button
      const saveBtn = document.getElementById('save-edit-activity');
      saveBtn.onclick = () => handleSaveEditActivity(activity.id);

      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    })
    .catch(error => {
      console.error('Error fetching activity details:', error);
      alert('Erro ao carregar detalhes da atividade');
    });
}

function parseDurationToMinutes(value) {
  if (!value) return 0;
  const trimmed = String(value).trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number);
    return h * 60 + m;
  }
  return 0;
}

function handleSaveEditActivity(activityId) {
  const addDurationRaw = document.getElementById('edit-duration-add').value;
  const status = document.getElementById('edit-status').value;
  const priority = document.getElementById('edit-priority').value;
  const dueDateEl = document.getElementById('edit-due-date');
  const editRespSelect = document.getElementById('edit-responsible');
  const editDateEl = document.getElementById('edit-date');

  const duration_delta = parseDurationToMinutes(addDurationRaw);

  fetch(`/api/activities/${activityId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ 
      duration_delta, 
      status, 
      priority, 
      responsible_id: editRespSelect ? (editRespSelect.value || null) : undefined,
      date: editDateEl ? (editDateEl.value || undefined) : undefined,
      due_date: (status === 'pendente' || status === 'em_execucao') && dueDateEl ? (dueDateEl.value || null) : null 
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.id) {
        // Close modal
        const modalEl = document.getElementById('edit-activity-modal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        // Reload activities
        loadActivitiesList();
        alert('Atividade atualizada com sucesso');
      } else {
        alert(data.message || 'Erro ao atualizar atividade');
      }
    })
    .catch(err => {
      console.error('Erro ao salvar edição:', err);
      alert('Erro ao conectar ao servidor');
    });
}

// Handle delete activity (somente chamada após confirmação no modal)
function handleDeleteActivity(activityId) {
  fetch(`/api/activities/${activityId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = (data && data.message) ? data.message : 'Erro ao excluir atividade';
        throw new Error(msg);
      }
      return data;
    })
    .then(data => {
      const modalEl = document.getElementById('confirm-delete-activity-modal');
      if (modalEl) modalEl.style.display = 'none';
      loadActivitiesList();
      alert('Atividade excluída com sucesso!');
    })
    .catch(error => {
      console.error('Error deleting activity:', error);
      alert(error.message || 'Erro ao conectar ao servidor');
    });
}

// Settings page with tabs (Webhook and Users)
function loadSettings(container) {
  container.innerHTML = `
    <h2 class="mb-4">Configurações</h2>
    <ul class="nav nav-tabs" id="settings-tabs" role="tablist">
      <li class="nav-item" role="presentation">
        <a class="nav-link active" href="#" data-tab="webhook" role="tab">Webhook</a>
      </li>
      <li class="nav-item" role="presentation">
        <a class="nav-link" href="#" data-tab="users" role="tab">Usuários</a>
      </li>
      <li class="nav-item" role="presentation">
        <a class="nav-link" href="#" data-tab="responsaveis" role="tab">Responsáveis</a>
      </li>
    </ul>
    <div class="tab-content pt-3">
      <div id="tab-webhook" class="tab-pane active" role="tabpanel"></div>
      <div id="tab-users" class="tab-pane" role="tabpanel" style="display:none;"></div>
      <div id="tab-responsaveis" class="tab-pane" role="tabpanel" style="display:none;"></div>
    </div>
  `;

  const webhookPane = document.getElementById('tab-webhook');
  const usersPane = document.getElementById('tab-users');
  const responsaveisPane = document.getElementById('tab-responsaveis');
  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
  let isAdmin = !!(currentUser && currentUser.role === 'admin');
  // Confirmar papel via sessão se não encontrado no localStorage
  if (!isAdmin) {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(s => {
        if (s && s.isAuthenticated && s.user && s.user.role === 'admin') {
          isAdmin = true;
          const usersTabLink = document.querySelector('a.nav-link[data-tab="users"]');
          if (usersTabLink) usersTabLink.parentElement.style.display = '';
          const respTabLink = document.querySelector('a.nav-link[data-tab="responsaveis"]');
          if (respTabLink) respTabLink.parentElement.style.display = '';
        } else {
          const usersTabLink = document.querySelector('a.nav-link[data-tab="users"]');
          if (usersTabLink) usersTabLink.parentElement.style.display = 'none';
          const respTabLink = document.querySelector('a.nav-link[data-tab="responsaveis"]');
          if (respTabLink) respTabLink.parentElement.style.display = 'none';
        }
      })
      .catch(() => {
        const usersTabLink = document.querySelector('a.nav-link[data-tab="users"]');
        if (usersTabLink) usersTabLink.parentElement.style.display = 'none';
        const respTabLink = document.querySelector('a.nav-link[data-tab="responsaveis"]');
        if (respTabLink) respTabLink.parentElement.style.display = 'none';
      });
  } else {
    const usersTabLink = document.querySelector('a.nav-link[data-tab="users"]');
    if (usersTabLink) usersTabLink.parentElement.style.display = '';
    const respTabLink = document.querySelector('a.nav-link[data-tab="responsaveis"]');
    if (respTabLink) respTabLink.parentElement.style.display = '';
  }
  
  // Load default tab content
  loadWebhookConfig(webhookPane);

  // Tab switching
  document.querySelectorAll('#settings-tabs .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#settings-tabs .nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const target = link.getAttribute('data-tab');
      // hide all panes
      webhookPane.style.display = 'none';
      usersPane.style.display = 'none';
      responsaveisPane.style.display = 'none';
      // garantir conformidade com Bootstrap: remover classe active de panes
      webhookPane.classList.remove('active');
      usersPane.classList.remove('active');
      responsaveisPane.classList.remove('active');

      if (target === 'webhook') {
        webhookPane.style.display = '';
        webhookPane.classList.add('active');
        loadWebhookConfig(webhookPane);
      } else if (target === 'users') {
        if (isAdmin) {
          usersPane.style.display = '';
          usersPane.classList.add('active');
          loadUsersSettings(usersPane);
        } else {
          usersPane.style.display = '';
          usersPane.classList.add('active');
          usersPane.innerHTML = '<p class="text-muted">Sem permissão para acessar esta aba.</p>';
        }
      } else if (target === 'responsaveis') {
        if (isAdmin) {
          responsaveisPane.style.display = '';
          responsaveisPane.classList.add('active');
          loadResponsaveisSettings(responsaveisPane);
        } else {
          responsaveisPane.style.display = '';
          responsaveisPane.classList.add('active');
          responsaveisPane.innerHTML = '<p class="text-muted">Sem permissão para acessar esta aba.</p>';
        }
      }
    });
  });
}

// Load webhook configuration page
function loadWebhookConfig(container) {
  container.innerHTML = `
    <h2 class="mb-4">Configurações</h2>
    
    <div class="webhook-config">
      <h4 class="mb-3">Configuração de Webhook</h4>
      <p class="text-muted">Configure o webhook para enviar dados de atividades automaticamente ou manualmente.</p>
      
      <form id="webhook-form">
        <div class="mb-3">
          <label for="webhook-url" class="form-label">URL do Webhook</label>
          <input type="url" class="form-control" id="webhook-url" placeholder="https://exemplo.com/webhook" required>
        </div>
        
        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="webhook-active">
          <label class="form-check-label" for="webhook-active">Webhook Ativo</label>
        </div>
        
        <div class="mb-3 form-check form-switch">
          <input class="form-check-input" type="checkbox" id="auto-send">
          <label class="form-check-label" for="auto-send">Envio Automático</label>
          <small class="form-text text-muted d-block">Enviar automaticamente ao criar/editar atividade</small>
        </div>
        
        <h5 class="mt-4 mb-3">Campos a Enviar</h5>
        
        <div class="webhook-fields">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="field-origin" checked>
            <label class="form-check-label" for="field-origin">Origem</label>
          </div>
          
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="field-activity" checked>
            <label class="form-check-label" for="field-activity">Atividade</label>
          </div>
          
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="field-date" checked>
            <label class="form-check-label" for="field-date">Data</label>
          </div>
          
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="field-duration" checked>
            <label class="form-check-label" for="field-duration">Duração</label>
          </div>
          
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="field-status" checked>
            <label class="form-check-label" for="field-status">Status</label>
          </div>
          
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="field-priority" checked>
            <label class="form-check-label" for="field-priority">Prioridade</label>
          </div>
          
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="field-responsible" checked>
            <label class="form-check-label" for="field-responsible">Responsável</label>
          </div>
          
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="field-observation">
            <label class="form-check-label" for="field-observation">Observação</label>
          </div>
        </div>
        
        <div class="mt-4">
          <button type="submit" class="btn btn-primary me-2">Salvar Configurações</button>
          <button type="button" id="test-webhook" class="btn btn-outline-secondary">Testar Webhook</button>
        </div>
      </form>
    </div>
  `;
  
  // Add event listeners
  document.getElementById('webhook-form').addEventListener('submit', handleSaveWebhookConfig);
  document.getElementById('test-webhook').addEventListener('click', handleTestWebhook);
  
  // Load current webhook configuration
  loadWebhookConfigData();
}

// Load webhook configuration data
function loadWebhookConfigData() {
  fetch('/api/webhook/config', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.id) {
        // Populate form with current configuration
        document.getElementById('webhook-url').value = data.url || '';
        document.getElementById('webhook-active').checked = data.active || false;
        document.getElementById('auto-send').checked = data.auto_send || false;
        
        // Set fields checkboxes
        if (data.fields) {
          let fieldsObj = {};
          try {
            fieldsObj = typeof data.fields === 'string' ? JSON.parse(data.fields) : data.fields;
          } catch (e) {
            console.warn('Formato inesperado de webhook fields:', data.fields);
          }
          
          document.getElementById('field-origin').checked = !!fieldsObj.origin;
          document.getElementById('field-activity').checked = !!fieldsObj.activity;
          document.getElementById('field-date').checked = !!fieldsObj.date;
          document.getElementById('field-duration').checked = !!fieldsObj.duration;
          document.getElementById('field-status').checked = !!fieldsObj.status;
          document.getElementById('field-priority').checked = !!fieldsObj.priority;
          document.getElementById('field-responsible').checked = !!fieldsObj.responsible;
          document.getElementById('field-observation').checked = !!fieldsObj.observation;
        }
      }
    })
    .catch(error => {
      console.error('Error loading webhook configuration:', error);
    });
}

// Handle save webhook configuration
function handleSaveWebhookConfig(event) {
  event.preventDefault();
  
  const fields = {
    origin: document.getElementById('field-origin').checked,
    activity: document.getElementById('field-activity').checked,
    date: document.getElementById('field-date').checked,
    duration: document.getElementById('field-duration').checked,
    status: document.getElementById('field-status').checked,
    priority: document.getElementById('field-priority').checked,
    responsible: document.getElementById('field-responsible').checked,
    observation: document.getElementById('field-observation').checked
  };
  
  const configData = {
    url: document.getElementById('webhook-url').value,
    active: document.getElementById('webhook-active').checked,
    auto_send: document.getElementById('auto-send').checked,
    fields: JSON.stringify(fields)
  };
  
  fetch('/api/webhook/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(configData)
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Configuração de webhook salva com sucesso!');
      } else {
        alert(data.message || 'Erro ao salvar configuração de webhook');
      }
    })
    .catch(error => {
      console.error('Error saving webhook configuration:', error);
      alert('Erro ao conectar ao servidor');
    });
}

// Handle test webhook
function handleTestWebhook() {
  const url = document.getElementById('webhook-url').value;
  
  if (!url) {
    alert('Por favor, informe a URL do webhook');
    return;
  }
  
  fetch('/api/webhook/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ url })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Teste de webhook realizado com sucesso!');
      } else {
        alert(data.message || 'Erro ao testar webhook');
      }
    })
    .catch(error => {
      console.error('Error testing webhook:', error);
      alert('Erro ao conectar ao servidor');
    });
}

// Placeholder functions for other pages
function loadReports(container) {
  container.innerHTML = '<h2>Relatórios</h2><p>Funcionalidade em desenvolvimento</p>';
}

// Cronograma page (Calendário e Tabela)
function loadSchedule(container) {
  container.innerHTML = `
    <h2 class="mb-4">Cronograma</h2>
    <form id="schedule-filters" class="row g-2 align-items-end mb-3">
      <div class="col-md-2">
        <label class="form-label" for="sched-filter-origin">Origem</label>
        <input type="text" class="form-control" id="sched-filter-origin" placeholder="Ex.: Email">
      </div>
      <div class="col-md-2">
        <label class="form-label" for="sched-filter-activity">Atividade</label>
        <input type="text" class="form-control" id="sched-filter-activity" placeholder="Ex.: Revisar">
      </div>
      <div class="col-md-2">
        <label class="form-label" for="sched-filter-status">Status</label>
        <select class="form-select" id="sched-filter-status">
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="em_execucao">Em Execução</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label" for="sched-filter-priority">Prioridade</label>
        <select class="form-select" id="sched-filter-priority">
          <option value="">Todas</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label" for="sched-filter-responsible">Responsável</label>
        <select class="form-select" id="sched-filter-responsible">
          <option value="">Todos</option>
        </select>
      </div>
      <div class="col-md-1 d-grid">
        <button type="submit" class="btn btn-primary">Filtrar</button>
      </div>
    </form>
    <ul class="nav nav-tabs" id="schedule-tabs" role="tablist">
      <li class="nav-item" role="presentation">
        <a class="nav-link active" href="#" data-tab="calendar" role="tab">Calendário</a>
      </li>
      <li class="nav-item" role="presentation">
        <a class="nav-link" href="#" data-tab="table" role="tab">Tabela</a>
      </li>
    </ul>
    <div class="tab-content pt-3">
      <div id="tab-calendar" class="tab-pane active" role="tabpanel"></div>
      <div id="tab-table" class="tab-pane" role="tabpanel" style="display:none;"></div>
    </div>
  `;

  // Populate responsible options
  fetch('/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }})
    .then(r => r.json())
    .then(list => {
      const sel = document.getElementById('sched-filter-responsible');
      if (sel && Array.isArray(list)) {
        list.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = u.name;
          sel.appendChild(opt);
        });
      }
    })
    .catch(() => {});

  // Filters form submit
  const filtersForm = document.getElementById('schedule-filters');
  if (filtersForm) {
    filtersForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const activeTab = document.querySelector('#schedule-tabs .nav-link.active')?.getAttribute('data-tab') || 'calendar';
      if (activeTab === 'calendar') renderScheduleCalendar(); else renderScheduleTable();
    });
  }

  renderScheduleCalendar();
  document.querySelectorAll('#schedule-tabs .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#schedule-tabs .nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const target = link.getAttribute('data-tab');
      const cal = document.getElementById('tab-calendar');
      const tbl = document.getElementById('tab-table');
      cal.style.display = 'none';
      tbl.style.display = 'none';
      cal.classList.remove('active');
      tbl.classList.remove('active');
      if (target === 'calendar') {
        cal.style.display = '';
        cal.classList.add('active');
        renderScheduleCalendar();
      } else {
        tbl.style.display = '';
        tbl.classList.add('active');
        renderScheduleTable();
      }
    });
  });
}

function getScheduleFilters() {
  const origin = document.getElementById('sched-filter-origin')?.value || '';
  const activity = document.getElementById('sched-filter-activity')?.value || '';
  const status = document.getElementById('sched-filter-status')?.value || '';
  const priority = document.getElementById('sched-filter-priority')?.value || '';
  const responsible_id = document.getElementById('sched-filter-responsible')?.value || '';
  return { origin, activity, status, priority, responsible_id };
}

function renderScheduleCalendar(dateCtx) {
  const container = document.getElementById('tab-calendar');
  if (!container) return;
  const now = dateCtx instanceof Date ? dateCtx : new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <button class="btn btn-sm btn-outline-secondary" id="prev-month">Anterior</button>
      <h5 class="mb-0">${firstDay.toLocaleString('pt-BR', { month: 'long' })} / ${year}</h5>
      <button class="btn btn-sm btn-outline-secondary" id="next-month">Próximo</button>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Dom</th><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th>
          </tr>
        </thead>
        <tbody id="calendar-body"></tbody>
      </table>
    </div>
  `;

  const bodyEl = document.getElementById('calendar-body');
  let cu = null; try { cu = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
  const isAdmin = !!(cu && cu.role === 'admin');
  const baseUrl = '/api/activities';
  const url = isAdmin ? baseUrl : `${baseUrl}?responsible_id=${encodeURIComponent(cu && cu.id ? cu.id : '')}`;

  fetch(url, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  })
    .then(r => r.json())
    .then(list => {
      let activities = Array.isArray(list) ? list : [];
      // Apply filters (origin/activity case-insensitive)
      const f = getScheduleFilters();
      const oi = f.origin.trim().toLowerCase();
      const ai = f.activity.trim().toLowerCase();
      activities = activities.filter(a => {
        if (oi && !(String(a.origin || '').toLowerCase().includes(oi))) return false;
        if (ai && !(String(a.activity || '').toLowerCase().includes(ai))) return false;
        if (f.status && a.status !== f.status) return false;
        if (f.priority && a.priority !== f.priority) return false;
        if (f.responsible_id && String(a.responsible_id || '') !== String(f.responsible_id)) return false;
        return true;
      });
      const byDay = {};
      for (let d = 1; d <= daysInMonth; d++) {
        byDay[d] = [];
      }
      activities.forEach(a => {
        if (a.due_date) {
          const due = parseDateSafe(a.due_date);
          if (due && due.getFullYear() === year && due.getMonth() === month) {
            const dueDD = due.getDate();
            byDay[dueDD] = byDay[dueDD] || [];
            byDay[dueDD].push(a);
          }
        }
      });

      let html = '';
      let dayCounter = 1;
      for (let row = 0; row < 6; row++) {
        let rowHtml = '<tr>';
        for (let col = 0; col < 7; col++) {
          const cellIndex = row * 7 + col;
          const isLeadingEmpty = cellIndex < startWeekday;
          if (isLeadingEmpty || dayCounter > daysInMonth) {
            rowHtml += '<td class="bg-light"></td>';
          } else {
            const acts = byDay[dayCounter] || [];
            const items = acts.map(a => {
              const st = a.status === 'concluida' ? 'Concluída' : (a.status === 'em_execucao' ? 'Em Execução' : 'Pendente');
              const resp = a.responsible_name ? ` - ${a.responsible_name}` : '';
              const due = parseDateSafe(a.due_date);
              const today = new Date(); today.setHours(0,0,0,0);
              const isOverdue = !!(due && a.status !== 'concluida' && due.getTime() < today.getTime());
              const cls = isOverdue ? 'text-danger fw-semibold' : '';
              return `<div class="small ${cls}">${a.activity}${resp} <span class="badge bg-secondary">${st}</span></div>`;
            }).join('');
            rowHtml += `<td style="vertical-align: top;"><div class="fw-bold">${dayCounter}</div>${items}</td>`;
            dayCounter++;
          }
        }
        rowHtml += '</tr>';
        html += rowHtml;
      }
      bodyEl.innerHTML = html;

      document.getElementById('prev-month').onclick = () => {
        renderScheduleCalendar(new Date(year, month - 1, 1));
      };
      document.getElementById('next-month').onclick = () => {
        renderScheduleCalendar(new Date(year, month + 1, 1));
      };
    })
    .catch(err => {
      console.error('Erro ao carregar atividades para o calendário:', err);
      bodyEl.innerHTML = '<tr><td colspan="7" class="text-danger text-center">Erro ao carregar atividades</td></tr>';
    });
}

function renderScheduleTable() {
  const container = document.getElementById('tab-table');
  if (!container) return;
  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Origem</th>
            <th>Atividade</th>
            <th>Finalizará em</th>
            <th>Status</th>
            <th>Responsável</th>
          </tr>
        </thead>
        <tbody id="schedule-table-body"></tbody>
      </table>
    </div>
  `;

  const bodyEl = document.getElementById('schedule-table-body');
  let cu = null; try { cu = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
  const isAdmin = !!(cu && cu.role === 'admin');
  const baseUrl = '/api/activities';
  const url = isAdmin ? baseUrl : `${baseUrl}?responsible_id=${encodeURIComponent(cu && cu.id ? cu.id : '')}`;
  fetch(url, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  })
    .then(r => r.json())
    .then(list => {
      let activities = Array.isArray(list) ? list : [];
      // Apply filters (origin/activity case-insensitive)
      const f = getScheduleFilters();
      const oi = f.origin.trim().toLowerCase();
      const ai = f.activity.trim().toLowerCase();
      activities = activities.filter(a => {
        if (oi && !(String(a.origin || '').toLowerCase().includes(oi))) return false;
        if (ai && !(String(a.activity || '').toLowerCase().includes(ai))) return false;
        if (f.status && a.status !== f.status) return false;
        if (f.priority && a.priority !== f.priority) return false;
        if (f.responsible_id && String(a.responsible_id || '') !== String(f.responsible_id)) return false;
        return true;
      });
      if (activities.length === 0) {
        bodyEl.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma atividade encontrada</td></tr>';
        return;
      }
      bodyEl.innerHTML = activities.map(a => {
        const dd = a.due_date ? parseDateSafe(a.due_date) : null;
        const ddStr = dd ? dd.toLocaleDateString('pt-BR') : '-';
        const today = new Date(); today.setHours(0,0,0,0);
        const overdueCls = (dd && a.status !== 'concluida' && dd.getTime() < today.getTime()) ? 'text-danger fw-semibold' : '';
        const st = a.status === 'concluida' ? 'Concluída' : (a.status === 'em_execucao' ? 'Em Execução' : 'Pendente');
        return `
          <tr>
            <td>${a.origin}</td>
            <td>${a.activity}</td>
            <td class="${overdueCls}">${ddStr}</td>
            <td>${st}</td>
            <td>${a.responsible_name || '-'}</td>
          </tr>
        `;
      }).join('');
    })
    .catch(err => {
      console.error('Erro ao carregar atividades para a tabela:', err);
      bodyEl.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Erro ao carregar atividades</td></tr>';
    });
}

function loadUsersSettings(container) {
  if (!container) return;
  container.innerHTML = `
    <h4 class="mb-3">Usuários com acesso</h4>
    <div class="mb-3">
      <form id="new-access-user-form" class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Nome</label>
          <input type="text" class="form-control" id="access-name" required />
        </div>
        <div class="col-md-4">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="access-email" required />
        </div>
        <div class="col-md-4">
          <label class="form-label">Papel</label>
          <select class="form-select" id="access-role" required>
            <option value="view">Visualizador</option>
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div class="col-md-12 text-end">
          <button type="submit" class="btn btn-primary">Adicionar Usuário de Acesso</button>
        </div>
      </form>
    </div>

    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Papel</th>
            <th>Ativo</th>
            <th class="text-end">Ações</th>
          </tr>
        </thead>
        <tbody id="access-users-list"></tbody>
      </table>
    </div>
    
    <!-- Modal de edição de usuário -->
    <div id="edit-user-modal" class="modal" tabindex="-1" style="display:none;">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Usuário</h5>
            <button type="button" class="btn-close" id="edit-user-close"></button>
          </div>
          <div class="modal-body">
            <form id="edit-user-form" class="row g-3">
              <input type="hidden" id="edit-user-id" />
              <div class="col-md-6">
                <label class="form-label">Nome</label>
                <input type="text" id="edit-user-name" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input type="email" id="edit-user-email" class="form-control" required />
              </div>
              <div class="col-md-4">
                <label class="form-label">Papel</label>
                <select id="edit-user-role" class="form-select" required>
                  <option value="view">Visualizador</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Ativo</label>
                <select id="edit-user-active" class="form-select">
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Pode logar</label>
                <select id="edit-user-can-login" class="form-select">
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div class="col-12 d-flex justify-content-between mt-3">
                <button type="button" class="btn btn-outline-danger" id="delete-user-btn">Deletar Usuário</button>
                <div>
                  <button type="button" class="btn btn-warning me-2" id="reset-password-btn">Resetar Senha</button>
                  <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmação de exclusão -->
    <div id="confirm-delete-user-modal" class="modal" tabindex="-1" style="display:none;">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirmar exclusão</h5>
            <button type="button" class="btn-close" id="confirm-delete-close"></button>
          </div>
          <div class="modal-body">
            <p>Tem certeza que deseja deletar este usuário?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-delete-user-btn">Cancelar</button>
            <button type="button" class="btn btn-danger" id="confirm-delete-user-btn">Excluir</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Listar apenas usuários com can_login = true
  fetch('/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }})
    .then(r => r.json())
    .then(users => {
      const listEl = document.getElementById('access-users-list');
      listEl.innerHTML = '';
      const accessUsers = Array.isArray(users) ? users.filter(u => !!u.can_login && u.role !== 'admin') : [];
      if (accessUsers.length === 0) {
        listEl.innerHTML = `
          <tr>
            <td colspan="4" class="text-muted text-center">Nenhum usuário com acesso encontrado</td>
          </tr>
        `;
        return;
      }
      accessUsers.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
          <td>${u.active ? 'Sim' : 'Não'}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary edit-user-btn" data-id="${u.id}">
              <i class="bi bi-pencil"></i> Editar
            </button>
          </td>
        `;
        listEl.appendChild(tr);
      });
      // Abrir modal de edição
      document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const user = accessUsers.find(x => String(x.id) === String(id));
          if (!user) return;
          document.getElementById('edit-user-id').value = user.id;
          document.getElementById('edit-user-name').value = user.name || '';
          document.getElementById('edit-user-email').value = user.email || '';
          document.getElementById('edit-user-role').value = user.role || 'view';
          document.getElementById('edit-user-active').value = user.active ? 'true' : 'false';
          document.getElementById('edit-user-can-login').value = user.can_login ? 'true' : 'false';
          document.getElementById('edit-user-modal').style.display = 'block';
        });
      });
      const closeBtn = document.getElementById('edit-user-close');
      if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('edit-user-modal').style.display = 'none';
      });
      const editForm = document.getElementById('edit-user-form');
      if (editForm) editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id').value;
        const payload = {
          name: document.getElementById('edit-user-name').value,
          email: document.getElementById('edit-user-email').value,
          role: document.getElementById('edit-user-role').value,
          active: document.getElementById('edit-user-active').value === 'true',
          can_login: document.getElementById('edit-user-can-login').value === 'true'
        };
        fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        })
          .then(r => r.json())
          .then(resp => {
            if (resp && resp.id) {
              alert('Usuário atualizado com sucesso');
              document.getElementById('edit-user-modal').style.display = 'none';
              loadUsersSettings(container);
            } else {
              alert(resp.message || 'Erro ao atualizar usuário');
            }
          })
          .catch(err => {
            console.error('Erro ao atualizar usuário:', err);
            alert('Erro ao conectar ao servidor');
          });
      });
      const deleteBtn = document.getElementById('delete-user-btn');
      if (deleteBtn) deleteBtn.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-delete-user-modal');
        if (confirmModal) confirmModal.style.display = 'block';
      });
      const confirmDeleteBtn = document.getElementById('confirm-delete-user-btn');
      if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => {
        const id = document.getElementById('edit-user-id').value;
        if (!id) return;
        fetch(`/api/users/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
          .then(r => r.json())
          .then(resp => {
            if (resp && resp.success) {
              alert('Usuário excluído com sucesso');
              document.getElementById('edit-user-modal').style.display = 'none';
              document.getElementById('confirm-delete-user-modal').style.display = 'none';
              loadUsersSettings(container);
            } else {
              alert(resp.message || 'Erro ao excluir usuário');
            }
          })
          .catch(err => {
            console.error('Erro ao excluir usuário:', err);
            alert('Erro ao conectar ao servidor');
          });
      });
      const cancelDeleteBtn = document.getElementById('cancel-delete-user-btn');
      if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-delete-user-modal');
        if (confirmModal) confirmModal.style.display = 'none';
      });
      const confirmDeleteClose = document.getElementById('confirm-delete-close');
      if (confirmDeleteClose) confirmDeleteClose.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-delete-user-modal');
        if (confirmModal) confirmModal.style.display = 'none';
      });
      const resetBtn = document.getElementById('reset-password-btn');
      if (resetBtn) resetBtn.addEventListener('click', () => {
        const id = document.getElementById('edit-user-id').value;
        if (!id) return;
        fetch(`/api/users/${id}/reset-password`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
          .then(r => r.json())
          .then(resp => {
            if (resp && resp.success) {
              alert('Senha resetada para o padrão (nome do usuário).');
            } else {
              alert(resp.message || 'Erro ao resetar senha');
            }
          })
          .catch(err => {
            console.error('Erro ao resetar senha:', err);
            alert('Erro ao conectar ao servidor');
          });
      });
    })
    .catch(err => {
      const listEl = document.getElementById('access-users-list');
      if (listEl) {
        listEl.innerHTML = `
          <tr>
            <td colspan="4" class="text-danger text-center">Erro ao carregar usuários de acesso</td>
          </tr>
        `;
      }
      console.error('Erro ao carregar usuários de acesso:', err);
    });

  const formEl = document.getElementById('new-access-user-form');
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('access-name').value,
      email: document.getElementById('access-email').value,
      role: document.getElementById('access-role').value,
      active: true,
      can_login: true
    };
    fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(resp => {
        if (resp.id) {
          alert('Usuário de acesso criado');
          loadUsersSettings(container);
        } else {
          alert(resp.message || 'Erro ao criar usuário');
        }
      })
      .catch(err => {
        console.error('Erro ao criar usuário de acesso:', err);
        alert('Erro ao conectar ao servidor');
      });
  });
}

function loadImportExport(container) {
  container.innerHTML = '<h2>Importação/Exportação</h2><p>Funcionalidade em desenvolvimento</p>';
}

// Aba de Responsáveis (sem acesso)
function loadResponsaveisSettings(container) {
  if (!container) return;
  container.innerHTML = `
    <h4 class="mb-3">Responsáveis (sem acesso)</h4>
    <div class="mb-3">
      <form id="new-resp-form" class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Nome</label>
          <input type="text" class="form-control" id="resp-name" required />
        </div>
        <div class="col-md-6">
          <label class="form-label">Email (opcional)</label>
          <input type="email" class="form-control" id="resp-email" />
        </div>
        <div class="col-12 text-end">
          <button type="submit" class="btn btn-primary">Adicionar Responsável</button>
        </div>
      </form>
    </div>

    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Ativo</th>
            <th class="text-end">Ações</th>
          </tr>
        </thead>
        <tbody id="responsaveis-list"></tbody>
      </table>
    </div>

    <!-- Modal de edição de responsável -->
    <div id="edit-resp-modal" class="modal" tabindex="-1" style="display:none;">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Responsável</h5>
            <button type="button" class="btn-close" id="edit-resp-close"></button>
          </div>
          <div class="modal-body">
            <form id="edit-resp-form" class="row g-3">
              <input type="hidden" id="edit-resp-id" />
              <input type="hidden" id="edit-resp-role" />
              <input type="hidden" id="edit-resp-can-login" />
              <div class="col-md-6">
                <label class="form-label">Nome</label>
                <input type="text" id="edit-resp-name" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Email (opcional)</label>
                <input type="email" id="edit-resp-email" class="form-control" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Ativo</label>
                <select id="edit-resp-active" class="form-select">
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div class="col-12 d-flex justify-content-between mt-3">
                <button type="button" class="btn btn-outline-danger" id="delete-resp-btn">Deletar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmação de exclusão -->
    <div id="confirm-delete-resp-modal" class="modal" tabindex="-1" style="display:none;">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirmar exclusão</h5>
            <button type="button" class="btn-close" id="confirm-delete-resp-close"></button>
          </div>
          <div class="modal-body">
            <p>Tem certeza que deseja deletar este responsável?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="cancel-delete-resp-btn">Cancelar</button>
            <button type="button" class="btn btn-danger" id="confirm-delete-resp-btn">Excluir</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Carregar lista de responsáveis (can_login = false)
  fetch('/api/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }})
    .then(r => r.json())
    .then(users => {
      const listEl = document.getElementById('responsaveis-list');
      listEl.innerHTML = '';
      const responsaveis = Array.isArray(users) ? users.filter(u => !u.can_login) : [];
      if (responsaveis.length === 0) {
        listEl.innerHTML = `
          <tr>
            <td colspan="4" class="text-muted text-center">Nenhum responsável cadastrado</td>
          </tr>
        `;
        return;
      }
      responsaveis.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.active ? 'Sim' : 'Não'}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary edit-resp-btn" data-id="${u.id}">Editar</button>
          </td>
        `;
        listEl.appendChild(tr);
      });

      // Abrir modal de edição
      document.querySelectorAll('.edit-resp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const u = responsaveis.find(x => String(x.id) === String(id));
          if (!u) return;
          document.getElementById('edit-resp-id').value = u.id;
          document.getElementById('edit-resp-name').value = u.name || '';
          document.getElementById('edit-resp-email').value = u.email || '';
          document.getElementById('edit-resp-active').value = u.active ? 'true' : 'false';
          document.getElementById('edit-resp-role').value = u.role || 'view';
          document.getElementById('edit-resp-can-login').value = u.can_login ? 'true' : 'false';
          document.getElementById('edit-resp-modal').style.display = 'block';
        });
      });

      const closeBtn = document.getElementById('edit-resp-close');
      if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('edit-resp-modal').style.display = 'none';
      });

      const editForm = document.getElementById('edit-resp-form');
      if (editForm) editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-resp-id').value;
        const payload = {
          name: document.getElementById('edit-resp-name').value,
          email: document.getElementById('edit-resp-email').value,
          role: document.getElementById('edit-resp-role').value || 'view',
          active: document.getElementById('edit-resp-active').value === 'true',
          can_login: (document.getElementById('edit-resp-can-login').value === 'true') && false // garante false
        };
        payload.can_login = false; // força permanecer sem acesso
        fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        })
          .then(r => r.json())
          .then(resp => {
            if (resp && resp.id) {
              alert('Responsável atualizado com sucesso');
              document.getElementById('edit-resp-modal').style.display = 'none';
              loadResponsaveisSettings(container);
            } else {
              alert(resp.message || 'Erro ao atualizar responsável');
            }
          })
          .catch(err => {
            console.error('Erro ao atualizar responsável:', err);
            alert('Erro ao conectar ao servidor');
          });
      });

      const deleteBtn = document.getElementById('delete-resp-btn');
      if (deleteBtn) deleteBtn.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-delete-resp-modal');
        if (confirmModal) confirmModal.style.display = 'block';
      });

      const confirmDeleteBtn = document.getElementById('confirm-delete-resp-btn');
      if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => {
        const id = document.getElementById('edit-resp-id').value;
        const canLoginVal = document.getElementById('edit-resp-can-login').value;
        const canLogin = String(canLoginVal).toLowerCase() === 'true';
        if (!id) return;
        if (canLogin) {
          alert('Não é permitido excluir usuários com acesso pela aba Responsáveis');
          return;
        }
        fetch(`/api/users/${id}?from=responsavel`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
          .then(async r => {
            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(data && data.message ? data.message : 'Erro ao excluir responsável');
            return data;
          })
          .then(resp => {
            if (resp && resp.success) {
              alert('Responsável excluído com sucesso');
              document.getElementById('edit-resp-modal').style.display = 'none';
              document.getElementById('confirm-delete-resp-modal').style.display = 'none';
              loadResponsaveisSettings(container);
            } else {
              alert((resp && resp.message) || 'Erro ao excluir responsável');
            }
          })
          .catch(err => {
            console.error('Erro ao excluir responsável:', err);
            alert(err.message || 'Erro ao conectar ao servidor');
          });
      });

      const cancelDeleteBtn = document.getElementById('cancel-delete-resp-btn');
      if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-delete-resp-modal');
        if (confirmModal) confirmModal.style.display = 'none';
      });
      const confirmDeleteClose = document.getElementById('confirm-delete-resp-close');
      if (confirmDeleteClose) confirmDeleteClose.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-delete-resp-modal');
        if (confirmModal) confirmModal.style.display = 'none';
      });
    })
    .catch(err => {
      const listEl = document.getElementById('responsaveis-list');
      if (listEl) {
        listEl.innerHTML = `
          <tr>
            <td colspan="4" class="text-danger text-center">Erro ao carregar responsáveis</td>
          </tr>
        `;
      }
      console.error('Erro ao carregar responsáveis:', err);
    });

  // Submit novo responsável
  const formEl = document.getElementById('new-resp-form');
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('resp-name').value,
      email: document.getElementById('resp-email').value,
      role: 'view',
      active: true,
      can_login: false
    };
    fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(resp => {
        if (resp.id) {
          alert('Responsável criado');
          loadResponsaveisSettings(container);
        } else {
          alert(resp.message || 'Erro ao criar responsável');
        }
      })
      .catch(err => {
        console.error('Erro ao criar responsável:', err);
        alert('Erro ao conectar ao servidor');
      });
  });
}