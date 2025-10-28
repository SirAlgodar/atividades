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
              <a class="nav-link" href="#" data-page="reports">
                <i class="bi bi-file-earmark-bar-graph"></i> Relatórios
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" data-page="users">
                <i class="bi bi-people"></i> Usuários
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" data-page="webhook">
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
    case 'reports':
      loadReports(contentArea);
      break;
    case 'users':
      loadUsers(contentArea);
      break;
    case 'import-export':
      loadImportExport(contentArea);
      break;
    case 'webhook':
      loadWebhookConfig(contentArea);
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

// Create hours by month chart
function createHoursChart(data) {
  const ctx = document.getElementById('hours-chart').getContext('2d');
  
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
  
  new Chart(ctx, {
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
  const ctx = document.getElementById('origin-chart').getContext('2d');
  
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
  
  new Chart(ctx, {
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
                <option value="concluida">Concluída</option>
              </select>
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
                <th>Data</th>
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
  `;
  
  // Add event listeners
  // Adicionando evento com setTimeout para garantir que o DOM esteja completamente carregado
  setTimeout(() => {
    const activityForm = document.getElementById('activity-form');
    if (activityForm) {
      console.log('Formulário de atividade encontrado, adicionando evento');
      activityForm.addEventListener('submit', handleAddActivity);
      
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
  
  document.getElementById('filters-form').addEventListener('submit', handleApplyFilters);
  document.getElementById('clear-filters').addEventListener('click', handleClearFilters);
  document.getElementById('new-responsible-btn').addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('new-responsible-modal'));
    modal.show();
  });
  document.getElementById('save-responsible-btn').addEventListener('click', handleAddResponsible);
  
  // Load users for responsible dropdown
  loadUsers();
  
  // Load sectors for sector dropdown
  loadSectors();
  
  // Load activities list
  loadActivitiesList();
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
    observation: observation ? observation.value : ''
  };
  
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
          
          // Format date
          const date = new Date(activity.date);
          const formattedDate = date.toLocaleDateString('pt-BR');
          
          const createdAt = activity.created_at ? new Date(activity.created_at) : null;
          const updatedAt = activity.updated_at ? new Date(activity.updated_at) : null;
          const formattedCreated = createdAt ? createdAt.toLocaleString('pt-BR') : '-';
          const formattedUpdated = updatedAt ? updatedAt.toLocaleString('pt-BR') : '-';

          row.innerHTML = `
            <td>${activity.origin}</td>
            <td>${activity.activity}</td>
            <td>${formattedDate}</td>
            <td>${formattedCreated}</td>
            <td>${formattedUpdated}</td>
            <td>${activity.duration}</td>
            <td>
              <span class="status-badge ${activity.status === 'concluida' ? 'status-completed' : 'status-pending'}">
                ${activity.status === 'concluida' ? 'Concluída' : 'Pendente'}
              </span>
            </td>
            <td>
              <span class="status-badge priority-${activity.priority}">
                ${activity.priority === 'alta' ? 'Alta' : activity.priority === 'media' ? 'Média' : 'Baixa'}
              </span>
            </td>
            <td>${activity.responsible_name || '-'}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary edit-activity" data-id="${activity.id}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger delete-activity" data-id="${activity.id}">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          `;
          
          activitiesList.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-activity').forEach(button => {
          button.addEventListener('click', () => handleEditActivity(button.getAttribute('data-id')));
        });
        
        document.querySelectorAll('.delete-activity').forEach(button => {
          button.addEventListener('click', () => handleDeleteActivity(button.getAttribute('data-id')));
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
      role: 'user',
      active: true,
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
  
  if (!responsibleSelect || !filterResponsibleSelect) {
    console.error('Elementos de seleção de responsáveis não encontrados');
    return;
  }
  
  // Limpar opções existentes, mantendo apenas a primeira (placeholder)
  while (responsibleSelect.options.length > 1) {
    responsibleSelect.remove(1);
  }
  
  while (filterResponsibleSelect.options.length > 1) {
    filterResponsibleSelect.remove(1);
  }
  
  fetch('/api/users', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('Usuários carregados:', data);
      if (Array.isArray(data)) {
        // Add users to responsible dropdown
        data.forEach(user => {
          const option = document.createElement('option');
          option.value = user.id;
          option.textContent = user.name;
          
          responsibleSelect.appendChild(option.cloneNode(true));
          
          // Also add to filter dropdown
          filterResponsibleSelect.appendChild(option.cloneNode(true));
        });
      }
    })
    .catch(error => {
      console.error('Error loading users:', error);
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
                      <label class="form-label">Adicionar duração (HH:MM ou minutos)</label>
                      <input type="text" class="form-control" id="edit-duration-add" placeholder="00:30 ou 30">
                      <small class="form-text text-muted">Esse valor será somado à duração atual.</small>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Status</label>
                      <select class="form-select" id="edit-status">
                        <option value="pendente">Pendente</option>
                        <option value="concluida">Concluída</option>
                      </select>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Prioridade</label>
                      <select class="form-select" id="edit-priority">
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
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
      document.getElementById('edit-status').value = activity.status || 'pendente';
      document.getElementById('edit-priority').value = activity.priority || 'media';

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

  const duration_delta = parseDurationToMinutes(addDurationRaw);

  fetch(`/api/activities/${activityId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ duration_delta, status, priority })
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

// Handle delete activity
function handleDeleteActivity(activityId) {
  if (confirm('Tem certeza que deseja excluir esta atividade?')) {
    fetch(`/api/activities/${activityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Reload activities list
          loadActivitiesList();
          alert('Atividade excluída com sucesso!');
        } else {
          alert(data.message || 'Erro ao excluir atividade');
        }
      })
      .catch(error => {
        console.error('Error deleting activity:', error);
        alert('Erro ao conectar ao servidor');
      });
  }
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

function loadUsers(container) {
  if (container) {
    container.innerHTML = '<h2>Usuários</h2><p>Funcionalidade em desenvolvimento</p>';
  }
}

function loadImportExport(container) {
  container.innerHTML = '<h2>Importação/Exportação</h2><p>Funcionalidade em desenvolvimento</p>';
}