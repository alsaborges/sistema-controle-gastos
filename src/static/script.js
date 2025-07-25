// Variáveis globais
let gastos = [];
let gastosFiltrados = [];
let editingId = null;
let graficoEntradasSaidas = null;
let graficoEvolucaoMensal = null;
let currentUser = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
});

// Verificar autenticação
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/check-session', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.logged_in) {
            window.location.href = '/login.html';
            return;
        }
        
        currentUser = data.user;
        document.getElementById('username-display').textContent = currentUser.username;
        
        // Inicializar aplicação
        initializeApp();
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/login.html';
    }
}

// Inicializar aplicação
function initializeApp() {
    loadGastos();
    loadSummary();
    loadPessoas();
    loadUsuarios();
    
    // Definir data atual como padrão
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data').value = today;
    
    // Event listeners
    document.getElementById('gasto-form').addEventListener('submit', handleSubmit);
    document.getElementById('novo-usuario-form').addEventListener('submit', handleNovoUsuario);
    document.getElementById('edit-form').addEventListener('submit', function(e) {
        e.preventDefault();
        updateGasto();
    });
    
    // Tab change listeners
    document.getElementById('analises-tab').addEventListener('shown.bs.tab', function() {
        loadPessoas(); // Recarregar pessoas para filtros
    });
    
    document.getElementById('usuarios-tab').addEventListener('shown.bs.tab', function() {
        loadUsuarios(); // Recarregar usuários
    });
}

// Logout
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        window.location.href = '/login.html';
    }
}

// Carregar gastos
async function loadGastos() {
    try {
        const response = await fetch('/api/gastos', {
            credentials: 'include'
        });
        gastos = await response.json();
        renderGastosTable();
    } catch (error) {
        console.error('Erro ao carregar gastos:', error);
        showAlert('Erro ao carregar dados', 'danger');
    }
}

// Carregar resumo
async function loadSummary() {
    try {
        const response = await fetch('/api/gastos/summary', {
            credentials: 'include'
        });
        const summary = await response.json();
        updateDashboard(summary);
        renderResumoPersonas(summary.por_pessoa);
    } catch (error) {
        console.error('Erro ao carregar resumo:', error);
    }
}

// Carregar pessoas para filtro
async function loadPessoas() {
    try {
        const response = await fetch('/api/gastos/pessoas', {
            credentials: 'include'
        });
        const pessoas = await response.json();
        const select = document.getElementById('filtro-pessoa');
        
        // Limpar opções existentes (exceto a primeira)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        pessoas.forEach(pessoa => {
            const option = document.createElement('option');
            option.value = pessoa;
            option.textContent = pessoa;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar pessoas:', error);
    }
}

// Carregar usuários
async function loadUsuarios() {
    try {
        const response = await fetch('/api/auth/users', {
            credentials: 'include'
        });
        const usuarios = await response.json();
        renderUsuariosTable(usuarios);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

// Renderizar tabela de usuários
function renderUsuariosTable(usuarios) {
    const tbody = document.getElementById('usuarios-table');
    tbody.innerHTML = '';
    
    usuarios.forEach(usuario => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${usuario.id}</td>
            <td>${usuario.username}</td>
            <td>${formatDate(usuario.created_at)}</td>
            <td>
                <span class="badge ${usuario.is_active ? 'bg-success' : 'bg-danger'}">
                    ${usuario.is_active ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                ${usuario.id !== currentUser.id ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUsuario(${usuario.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : '<span class="text-muted">Usuário atual</span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Criar novo usuário
async function handleNovoUsuario(e) {
    e.preventDefault();
    
    const username = document.getElementById('novo-username').value;
    const password = document.getElementById('novo-password').value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Usuário criado com sucesso!', 'success');
            document.getElementById('novo-usuario-form').reset();
            loadUsuarios();
        } else {
            showAlert(data.error || 'Erro ao criar usuário', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro ao criar usuário', 'danger');
    }
}

// Deletar usuário
async function deleteUsuario(userId) {
    if (!confirm('Tem certeza que deseja desativar este usuário?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/auth/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showAlert('Usuário desativado com sucesso!', 'success');
            loadUsuarios();
        } else {
            const data = await response.json();
            showAlert(data.error || 'Erro ao desativar usuário', 'danger');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro ao desativar usuário', 'danger');
    }
}

// Aplicar filtros
async function aplicarFiltros() {
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const pessoa = document.getElementById('filtro-pessoa').value;
    const tipo = document.getElementById('filtro-tipo').value;
    
    const params = new URLSearchParams();
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    if (pessoa) params.append('pessoa', pessoa);
    if (tipo) params.append('tipo', tipo);
    
    try {
        const response = await fetch(`/api/gastos/filter?${params}`, {
            credentials: 'include'
        });
        gastosFiltrados = await response.json();
        renderGastosFiltradosTable();
        
        // Mostrar status do filtro
        const statusElement = document.getElementById('filtro-status');
        statusElement.style.display = 'inline';
        statusElement.textContent = `${gastosFiltrados.length} registros filtrados`;
        
        showAlert('Filtros aplicados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        showAlert('Erro ao aplicar filtros', 'danger');
    }
}

// Renderizar tabela de gastos filtrados
function renderGastosFiltradosTable() {
    const tbody = document.getElementById('gastos-filtrados-table');
    tbody.innerHTML = '';
    
    if (gastosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-search me-2"></i>
                    Nenhuma transação encontrada com os filtros aplicados
                </td>
            </tr>
        `;
        return;
    }
    
    gastosFiltrados.forEach(gasto => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(gasto.data)}</td>
            <td>${gasto.para_quem}</td>
            <td>${gasto.do_que}</td>
            <td>${gasto.com_o_que}</td>
            <td>${gasto.obs || '-'}</td>
            <td>
                <span class="badge ${gasto.cred_deb === 'Crédito' ? 'bg-success' : 'bg-danger'}">
                    ${gasto.cred_deb === 'Crédito' ? 'Entrada' : 'Saída'}
                </span>
            </td>
            <td class="${gasto.cred_deb === 'Crédito' ? 'valor-positivo' : 'valor-negativo'}">
                ${formatCurrency(gasto.valor)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-pessoa').value = '';
    document.getElementById('filtro-tipo').value = '';
    
    // Ocultar status do filtro
    document.getElementById('filtro-status').style.display = 'none';
    
    // Limpar tabela filtrada
    const tbody = document.getElementById('gastos-filtrados-table');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted">
                <i class="fas fa-info-circle me-2"></i>
                Use os filtros acima para visualizar transações específicas
            </td>
        </tr>
    `;
    
    showAlert('Filtros removidos', 'info');
}

// Gerar análises
async function gerarAnalises() {
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    
    const params = new URLSearchParams();
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    
    try {
        const response = await fetch(`/api/gastos/analytics?${params}`, {
            credentials: 'include'
        });
        const analytics = await response.json();
        
        renderGraficos(analytics);
        renderTabelasDinamicas(analytics);
        
        // Mostrar seções de gráficos e tabelas
        document.getElementById('graficos-section').style.display = 'flex';
        document.getElementById('tabelas-section').style.display = 'flex';
        
        showAlert('Análises geradas com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar análises:', error);
        showAlert('Erro ao gerar análises', 'danger');
    }
}

// Renderizar gráficos
function renderGraficos(analytics) {
    // Gráfico de Entradas vs Saídas
    const ctxEntradasSaidas = document.getElementById('grafico-entradas-saidas').getContext('2d');
    
    if (graficoEntradasSaidas) {
        graficoEntradasSaidas.destroy();
    }
    
    graficoEntradasSaidas = new Chart(ctxEntradasSaidas, {
        type: 'doughnut',
        data: {
            labels: ['Entradas', 'Saídas'],
            datasets: [{
                data: [analytics.resumo_geral.entradas, analytics.resumo_geral.saidas],
                backgroundColor: ['#28a745', '#dc3545'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Gráfico de Evolução Mensal
    const ctxEvolucaoMensal = document.getElementById('grafico-evolucao-mensal').getContext('2d');
    
    if (graficoEvolucaoMensal) {
        graficoEvolucaoMensal.destroy();
    }
    
    const meses = analytics.por_mes.map(item => {
        const [ano, mes] = item.mes.split('-');
        return `${mes}/${ano}`;
    });
    
    graficoEvolucaoMensal = new Chart(ctxEvolucaoMensal, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Entradas',
                    data: analytics.por_mes.map(item => item.entradas),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Saídas',
                    data: analytics.por_mes.map(item => item.saidas),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Saldo',
                    data: analytics.por_mes.map(item => item.saldo),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Renderizar tabelas dinâmicas
function renderTabelasDinamicas(analytics) {
    // Tabela por pessoa
    const tabelaPorPessoa = document.getElementById('tabela-por-pessoa');
    tabelaPorPessoa.innerHTML = '';
    
    Object.entries(analytics.por_pessoa).forEach(([pessoa, dados]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pessoa}</td>
            <td class="text-success">${formatCurrency(dados.entradas)}</td>
            <td class="text-danger">${formatCurrency(dados.saidas)}</td>
            <td class="${dados.total >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(dados.total)}</td>
        `;
        tabelaPorPessoa.appendChild(row);
    });
    
    // Tabela por categoria
    const tabelaPorCategoria = document.getElementById('tabela-por-categoria');
    tabelaPorCategoria.innerHTML = '';
    
    Object.entries(analytics.por_categoria).forEach(([categoria, dados]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${categoria}</td>
            <td class="text-success">${formatCurrency(dados.entradas)}</td>
            <td class="text-danger">${formatCurrency(dados.saidas)}</td>
            <td class="${dados.total >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(dados.total)}</td>
        `;
        tabelaPorCategoria.appendChild(row);
    });
}

// Atualizar dashboard
function updateDashboard(summary) {
    document.getElementById('total-geral').textContent = formatCurrency(summary.total);
    document.getElementById('total-registros').textContent = summary.total_registros;
    document.getElementById('total-pessoas').textContent = Object.keys(summary.por_pessoa).length;
}

// Renderizar tabela de gastos
function renderGastosTable() {
    const tbody = document.getElementById('gastos-table');
    tbody.innerHTML = '';
    
    gastos.forEach(gasto => {
        const row = document.createElement('tr');
        row.className = 'fade-in';
        row.innerHTML = `
            <td>${formatDate(gasto.data)}</td>
            <td>${gasto.para_quem}</td>
            <td>${gasto.do_que}</td>
            <td>${gasto.com_o_que}</td>
            <td>${gasto.obs || '-'}</td>
            <td>
                <span class="badge ${gasto.cred_deb === 'Crédito' ? 'bg-success' : 'bg-danger'}">
                    ${gasto.cred_deb === 'Crédito' ? 'Entrada' : 'Saída'}
                </span>
            </td>
            <td class="${gasto.cred_deb === 'Crédito' ? 'valor-positivo' : 'valor-negativo'}">
                ${formatCurrency(gasto.valor)}
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editGasto(${gasto.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteGasto(${gasto.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Renderizar resumo por pessoa
function renderResumoPersonas(porPessoa) {
    const container = document.getElementById('resumo-pessoas');
    container.innerHTML = '';
    
    Object.entries(porPessoa).forEach(([pessoa, valor]) => {
        const col = document.createElement('div');
        col.className = 'col-md-3 mb-3';
        col.innerHTML = `
            <div class="pessoa-card fade-in">
                <h6>${pessoa}</h6>
                <h4 class="${valor >= 0 ? 'text-success' : 'text-danger'}">
                    ${formatCurrency(valor)}
                </h4>
            </div>
        `;
        container.appendChild(col);
    });
}

// Manipular envio do formulário
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = {
        data: document.getElementById('data').value,
        para_quem: document.getElementById('para_quem').value,
        do_que: document.getElementById('do_que').value,
        com_o_que: document.getElementById('com_o_que').value,
        obs: document.getElementById('obs').value,
        cred_deb: document.getElementById('cred_deb').value,
        valor: parseFloat(document.getElementById('valor').value)
    };
    
    try {
        const response = await fetch('/api/gastos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showAlert('Transação adicionada com sucesso!', 'success');
            document.getElementById('gasto-form').reset();
            // Resetar data para hoje
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('data').value = today;
            loadGastos();
            loadSummary();
            loadPessoas();
        } else {
            throw new Error('Erro ao salvar transação');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro ao salvar transação', 'danger');
    }
}

// Editar gasto
function editGasto(id) {
    const gasto = gastos.find(g => g.id === id);
    if (!gasto) return;
    
    editingId = id;
    
    document.getElementById('edit-id').value = gasto.id;
    document.getElementById('edit-data').value = gasto.data;
    document.getElementById('edit-para_quem').value = gasto.para_quem;
    document.getElementById('edit-do_que').value = gasto.do_que;
    document.getElementById('edit-com_o_que').value = gasto.com_o_que;
    document.getElementById('edit-obs').value = gasto.obs || '';
    document.getElementById('edit-cred_deb').value = gasto.cred_deb;
    document.getElementById('edit-valor').value = gasto.valor;
    
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Atualizar gasto
async function updateGasto() {
    const formData = {
        data: document.getElementById('edit-data').value,
        para_quem: document.getElementById('edit-para_quem').value,
        do_que: document.getElementById('edit-do_que').value,
        com_o_que: document.getElementById('edit-com_o_que').value,
        obs: document.getElementById('edit-obs').value,
        cred_deb: document.getElementById('edit-cred_deb').value,
        valor: parseFloat(document.getElementById('edit-valor').value)
    };
    
    try {
        const response = await fetch(`/api/gastos/${editingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showAlert('Transação atualizada com sucesso!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            modal.hide();
            loadGastos();
            loadSummary();
            loadPessoas();
        } else {
            throw new Error('Erro ao atualizar transação');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro ao atualizar transação', 'danger');
    }
}

// Deletar gasto
async function deleteGasto(id) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/gastos/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showAlert('Transação excluída com sucesso!', 'success');
            loadGastos();
            loadSummary();
            loadPessoas();
        } else {
            throw new Error('Erro ao excluir transação');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro ao excluir transação', 'danger');
    }
}

// Formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Formatar data
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

// Mostrar alerta
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

