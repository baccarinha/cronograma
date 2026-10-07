// Variáveis globais
let employees = [];
let schedules = [];
let sectors = [
    { name: 'Caixa', color: '#FF0000', icon: 'fas fa-cash-register', description: 'Operadores de caixa da frente de loja' },
    { name: 'Auto Atendimento', color: '#007bff', icon: 'fas fa-robot', description: 'Caixas de autoatendimento' },
    { name: 'Carrinhos', color: '#28a745', icon: 'fas fa-shopping-cart', description: 'Equipe de organização de carrinhos' },
    { name: 'Assistentes', color: '#ffc107', icon: 'fas fa-hands-helping', description: 'Assistentes de frente de caixa' },
    { name: 'Fiscal', color: '#17a2b8', icon: 'fas fa-user-shield', description: 'Fiscais de caixa e prevenção' }
];

let currentDate = new Date();
let selectedDate = null;
let pdfPreviewVisible = false;
let internetClockTimestamp = null;
let internetClockPerformance = null;
let internetClockSyncInProgress = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateStats();
    renderEmployees();
    renderDashboardEmployees();
    renderSchedules();
    renderSectors();
    generateCalendar();
    
    // Configurar data mínima para o calendário (hoje)
    selectedDate = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    startInternetClock();
});

// Relógio sincronizado pela internet (fuso horário de Brasília)
function startInternetClock() {
    updateInternetClockDisplay();
    syncInternetClock();
    window.setInterval(updateInternetClockDisplay, 1000);
    window.setInterval(syncInternetClock, 60000);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) syncInternetClock();
    });
}

async function syncInternetClock() {
    if (internetClockSyncInProgress) return;
    internetClockSyncInProgress = true;
    const requestStarted = performance.now();
    const requestController = new AbortController();
    const requestTimeout = window.setTimeout(() => requestController.abort(), 8000);

    try {
        const response = await fetch('https://time.now/developer/api/timezone/America/Sao_Paulo', {
            cache: 'no-store',
            signal: requestController.signal
        });
        if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);

        const data = await response.json();
        const responseReceived = performance.now();
        const apiTimestamp = Date.parse(data.datetime) || Number(data.unixtime) * 1000;
        if (!Number.isFinite(apiTimestamp)) throw new Error('A API retornou um horário inválido.');

        // Compensa aproximadamente metade do tempo de ida e volta da requisição.
        internetClockTimestamp = apiTimestamp + (responseReceived - requestStarted) / 2;
        internetClockPerformance = responseReceived;
        setInternetClockStatus('Horário de Brasília sincronizado pela internet', 'synced');
        updateInternetClockDisplay();
    } catch (error) {
        const message = internetClockTimestamp === null
            ? 'Sem conexão — usando o horário deste dispositivo'
            : 'Sem nova conexão — usando a última sincronização';
        setInternetClockStatus(message, 'offline');
        updateInternetClockDisplay();
    } finally {
        window.clearTimeout(requestTimeout);
        internetClockSyncInProgress = false;
    }
}

function updateInternetClockDisplay() {
    const timeElement = document.getElementById('currentDateTimeValue');
    if (!timeElement) return;

    const now = internetClockTimestamp === null
        ? new Date()
        : new Date(internetClockTimestamp + (performance.now() - internetClockPerformance));
    const dateText = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo'
    }).format(now);
    const timeText = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'America/Sao_Paulo'
    }).format(now);

    timeElement.textContent = `${dateText} • ${timeText}`;
    timeElement.dateTime = now.toISOString();
}

function setInternetClockStatus(message, state) {
    const statusElement = document.getElementById('clockSyncStatus');
    const dotElement = document.getElementById('clockSyncDot');
    if (statusElement) statusElement.textContent = message;
    if (dotElement) dotElement.className = `clock-sync-dot ${state}`;
}

// Funções de navegação
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Funções de Modal
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    if (modalId === 'viewScheduleModal') {
        pdfPreviewVisible = false;
        const container = document.getElementById('pdfPreviewContainer');
        if (container) container.classList.remove('show');
        const toggleText = document.getElementById('pdfToggleText');
        if (toggleText) toggleText.textContent = 'Visualizar PDF';
    }
}

function showAddEmployeeModal() {
    showModal('addEmployeeModal');
}

function showCreateScheduleModal() {
    showModal('createScheduleModal');
    generateCalendar();
}

// Funções de Funcionários
function addEmployee(event) {
    event.preventDefault();
    
    const name = document.getElementById('employeeName').value.trim();
    const sector = document.getElementById('employeeSector').value;
    const schedule = document.getElementById('employeeSchedule').value;
    const offDay = document.getElementById('employeeOffDay').value;
    const sundayCycle = document.getElementById('employeeSundayCycle').value;
    
    if (!name || !sector || !schedule || !offDay) {
        showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }
    
    const employee = {
        id: Date.now(),
        name,
        sector,
        schedule,
        offDay,
        sundayCycle: sundayCycle || 'C',
        status: 'Trabalhando' // Status padrão
    };
    
    employees.push(employee);
    saveData();
    renderEmployees();
    renderDashboardEmployees();
    updateStats();
    closeModal('addEmployeeModal');
    document.getElementById('addEmployeeForm').reset();
    showNotification('Funcionário adicionado com sucesso!', 'success');
}

function deleteEmployee(id) {
    const employee = employees.find(emp => String(emp.id) === String(id));
    if (!employee) return;

    if (confirm(`Tem certeza que deseja excluir ${employee.name} do sistema?`)) {
        employees = employees.filter(emp => String(emp.id) !== String(id));
        saveData();
        renderEmployees();
        renderDashboardEmployees();
        renderSectors();
        updateStats();
        showNotification(`${employee.name} excluído com sucesso!`, 'success');
    }
}

function openEditEmployeeOffDays(id) {
    const employee = employees.find(emp => String(emp.id) === String(id));
    if (!employee) return;

    document.getElementById('editEmployeeId').value = employee.id;
    document.getElementById('editEmployeeName').value = employee.name;
    // Registros antigos com sábado de folga passam para a opção permitida mais próxima.
    document.getElementById('editEmployeeOffDay').value =
        ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'nenhum'].includes(employee.offDay)
            ? employee.offDay
            : 'nenhum';
    document.getElementById('editEmployeeSundayCycle').value = employee.sundayCycle || 'C';
    showModal('editEmployeeOffDaysModal');
}

function updateEmployeeOffDays(event) {
    event.preventDefault();

    const employee = employees.find(emp => String(emp.id) === String(document.getElementById('editEmployeeId').value));
    if (!employee) {
        showNotification('Funcionário não encontrado.', 'error');
        return;
    }

    const name = document.getElementById('editEmployeeName').value.trim();
    if (!name) {
        showNotification('Informe o nome do funcionário.', 'error');
        return;
    }

    employee.name = name;
    employee.offDay = document.getElementById('editEmployeeOffDay').value;
    employee.sundayCycle = document.getElementById('editEmployeeSundayCycle').value;

    saveData();
    renderEmployees();
    renderDashboardEmployees();
    updateStats();
    closeModal('editEmployeeOffDaysModal');
    showNotification('Funcionário atualizado!', 'success');
}

function renderEmployees() {
    const container = document.getElementById('employeesList');
    if (!container) return;
    
    if (employees.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-plus"></i>
                <h3>Nenhum funcionário cadastrado</h3>
                <p>Adicione funcionários para começar a gerenciar a escala de trabalho.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = employees.map(employee => `
        <div class="employee-card">
            <div class="employee-name">
                <i class="fas fa-user"></i>
                ${employee.name}
                <div class="employee-card-actions">
                    <button class="employee-card-action" type="button" aria-label="Editar funcionário ${employee.name}" title="Editar funcionário" onclick="openEditEmployeeOffDays(decodeURIComponent('${encodeURIComponent(String(employee.id))}'))">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                    <button class="employee-card-action delete employee-delete-button" type="button" aria-label="Excluir ${employee.name}" title="Excluir funcionário" onclick="deleteEmployee(decodeURIComponent('${encodeURIComponent(String(employee.id))}'))">
                        <i class="fas fa-trash"></i>
                        <span>Excluir</span>
                    </button>
                </div>
            </div>
            <div class="employee-details">
                <div class="employee-detail">
                    <i class="fas fa-building"></i>
                    ${employee.sector}
                </div>
                <div class="employee-detail">
                    <i class="fas fa-clock"></i>
                    ${employee.schedule}
                </div>
                <div class="employee-detail">
                    <i class="fas fa-calendar-times"></i>
                    Folga: ${getOffDayName(employee.offDay)}
                </div>
                <div class="employee-detail">
                    <i class="fas fa-sun"></i>
                    Ciclo Domingo: ${employee.sundayCycle === 'D' ? 'D (folga todos os domingos)' : (employee.sundayCycle || 'C')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderDashboardEmployees() {
    const container = document.getElementById('dashboardEmployees');
    if (!container) return;
    
    if (employees.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Nenhum funcionário cadastrado</h3>
                <p>Comece adicionando funcionários ao sistema.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = employees.map(employee => {
        // Lógica simplificada para o dashboard (quem trabalha hoje)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const dayNames = {
            0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'
        };
        
        let isOffDay = employee.offDay === dayNames[dayOfWeek];
        
        if (dayOfWeek === 0) {
            const referenceDate = new Date(2026, 0, 4);
            const diffTime = today.getTime() - referenceDate.getTime();
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            const isCycleASunday = Math.abs(diffWeeks) % 2 === 0;
            
            if (employee.sundayCycle === 'D') isOffDay = true;
            else if (employee.sundayCycle === 'A') isOffDay = isCycleASunday;
            else if (employee.sundayCycle === 'B') isOffDay = !isCycleASunday;
            else isOffDay = false;
        }
        
        const status = isOffDay ? 'FOLGA' : 'Trabalhando';
        
        return `
            <div class="employee-card">
                <div class="employee-name">
                    <i class="fas fa-user"></i>
                    ${employee.name}
                </div>
                <div class="employee-details">
                    <div class="employee-detail">
                        <i class="fas fa-building"></i>
                        ${employee.sector}
                    </div>
                    <div class="employee-detail">
                        <i class="fas fa-clock"></i>
                        ${employee.schedule}
                    </div>
                </div>
                <div class="status-badge ${status === 'Trabalhando' ? 'status-working' : 'status-off'}">
                    <i class="fas ${status === 'Trabalhando' ? 'fa-check' : 'fa-times'}"></i>
                    ${status}
                </div>
            </div>
        `;
    }).join('');
}

// Funções de setores
function renderSectors() {
    const container = document.getElementById('sectorsList');
    if (!container) return;
    
    container.innerHTML = sectors.map((sector, index) => {
        const employeeCount = employees.filter(emp => emp.sector === sector.name).length;
        
        return `
            <div class="sector-card" style="border-top: 4px solid ${sector.color};">
                <button onclick="openEditSectorModal(${index})" style="float: right; background: none; border: none; color: #6c757d; cursor: pointer;">
                    <i class="fas fa-edit"></i>
                </button>
                <div class="sector-header">
                    <div class="sector-icon" style="background: ${sector.color};">
                        <i class="${sector.icon}"></i>
                    </div>
                    <div class="sector-info">
                        <h3>${sector.name}</h3>
                        <div class="sector-count">${employeeCount} funcionários</div>
                    </div>
                </div>
                <div class="sector-description" style="color: #666; font-size: 0.9em;">${sector.description}</div>
            </div>
        `;
    }).join('');
}

function openEditSectorModal(index) {
    const sector = sectors[index];
    document.getElementById('editSectorIndex').value = index;
    document.getElementById('editSectorName').value = sector.name;
    document.getElementById('editSectorColor').value = sector.color;
    document.getElementById('editSectorIcon').value = sector.icon;
    document.getElementById('editSectorDescription').value = sector.description;
    showModal('editSectorModal');
}

document.getElementById('editSectorForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const index = document.getElementById('editSectorIndex').value;
    const oldName = sectors[index].name;
    const newName = document.getElementById('editSectorName').value.trim();
    
    // Atualizar funcionários se o nome do setor mudou
    if (oldName !== newName) {
        employees.forEach(emp => {
            if (emp.sector === oldName) emp.sector = newName;
        });
    }

    sectors[index] = {
        name: newName,
        color: document.getElementById('editSectorColor').value,
        icon: document.getElementById('editSectorIcon').value.trim(),
        description: document.getElementById('editSectorDescription').value.trim()
    };

    saveData();
    renderSectors();
    renderEmployees();
    renderDashboardEmployees();
    updateStats();
    closeModal('editSectorModal');
    showNotification('Setor atualizado!', 'success');
});

// Funções de cronograma
function getEmployeeStatusForDate(employee, date) {
    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);
    const dayOfWeek = scheduleDate.getDay();
    const dayNames = {
        0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'
    };

    let isOffDay = employee.offDay === dayNames[dayOfWeek];
    if (dayOfWeek === 0) {
        const referenceDate = new Date(2026, 0, 4);
        const diffWeeks = Math.floor((scheduleDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const isCycleASunday = Math.abs(diffWeeks) % 2 === 0;

        if (employee.sundayCycle === 'D') isOffDay = true;
        else if (employee.sundayCycle === 'A') isOffDay = isCycleASunday;
        else if (employee.sundayCycle === 'B') isOffDay = !isCycleASunday;
        else isOffDay = false;
    }

    return isOffDay ? 'FOLGA' : 'Trabalhando';
}

function buildScheduleEmployeesForDate(scheduleDate) {
    return employees.map(employee => ({
        ...employee,
        status: getEmployeeStatusForDate(employee, scheduleDate)
    }));
}

function createSchedule(event) {
    event.preventDefault();
    
    const name = document.getElementById('scheduleName').value.trim();
    if (!name || !selectedDate) {
        showNotification('Preencha o nome e selecione uma data.', 'error');
        return;
    }
    
    const scheduleDate = new Date(selectedDate);
    
    const schedule = {
        id: Date.now(),
        name,
        date: scheduleDate.toISOString(),
        dateText: scheduleDate.toLocaleDateString('pt-BR'),
        dayText: scheduleDate.toLocaleDateString('pt-BR', { weekday: 'long' }),
        employees: buildScheduleEmployeesForDate(scheduleDate),
        createdAt: new Date().toISOString()
    };
    
    schedules.push(schedule);
    saveData();
    renderSchedules();
    updateStats();
    closeModal('createScheduleModal');
    showNotification('Cronograma criado!', 'success');
}

function openEditScheduleModal(id) {
    const schedule = schedules.find(item => String(item.id) === String(id));
    if (!schedule) {
        showNotification('Cronograma não encontrado.', 'error');
        return;
    }

    const date = new Date(schedule.date);
    const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    document.getElementById('editScheduleId').value = schedule.id;
    document.getElementById('editScheduleName').value = schedule.name;
    document.getElementById('editScheduleDate').value = dateValue;
    showModal('editScheduleModal');
}

function updateSchedule(event) {
    event.preventDefault();

    const schedule = schedules.find(item => String(item.id) === String(document.getElementById('editScheduleId').value));
    if (!schedule) {
        showNotification('Cronograma não encontrado.', 'error');
        return;
    }

    const name = document.getElementById('editScheduleName').value.trim();
    const dateValue = document.getElementById('editScheduleDate').value;
    const scheduleDate = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date(NaN);
    if (!name || Number.isNaN(scheduleDate.getTime())) {
        showNotification('Informe o nome e a data do cronograma.', 'error');
        return;
    }

    schedule.name = name;
    schedule.date = scheduleDate.toISOString();
    schedule.dateText = scheduleDate.toLocaleDateString('pt-BR');
    schedule.dayText = scheduleDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    schedule.employees = buildScheduleEmployeesForDate(scheduleDate);
    schedule.updatedAt = new Date().toISOString();

    saveData();
    renderSchedules();
    updateStats();
    closeModal('editScheduleModal');
    showNotification('Cronograma atualizado!', 'success');
}

function deleteSchedule(id) {
    if (confirm('Excluir este cronograma?')) {
        schedules = schedules.filter(s => s.id !== id);
        saveData();
        renderSchedules();
        updateStats();
        showNotification('Cronograma excluído!', 'success');
    }
}

function viewSchedule(id) {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;
    
    document.getElementById('viewScheduleTitle').textContent = schedule.name;
    
    const scheduleDate = new Date(schedule.date);
    const displayDate = scheduleDate.toLocaleDateString('pt-BR');
    const displayDay = scheduleDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    
    const detailsContainer = document.getElementById('scheduleDetails');
    detailsContainer.innerHTML = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4><i class="fas fa-calendar"></i> ${displayDate} - ${displayDay}</h4>
        </div>
        ${renderScheduleEmployees(schedule.employees)}
    `;
    
    showModal('viewScheduleModal');
}

function renderScheduleEmployees(employeesList) {
    const organized = {};
    sectors.forEach(s => organized[s.name] = employeesList.filter(e => e.sector === s.name));
    
    return Object.keys(organized).map(sectorName => {
        const sectorEmployees = organized[sectorName];
        if (sectorEmployees.length === 0) return '';
        
        return `
            <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${getSectorColor(sectorName)}; background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <h5 style="margin-bottom: 10px;">${sectorName}</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                    ${sectorEmployees.map(e => `
                        <div style="font-size: 0.9em; padding: 5px; border-radius: 4px; background: ${e.status === 'FOLGA' ? '#fff1f0' : '#f6ffed'}; border: 1px solid ${e.status === 'FOLGA' ? '#ffa39e' : '#b7eb8f'};">
                            <strong>${e.name}</strong><br>
                            ${e.schedule} - ${e.status}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderSchedules() {
    const container = document.getElementById('schedulesList');
    if (!container) return;
    
    if (schedules.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <h3>Nenhum cronograma criado</h3>
            </div>
        `;
        return;
    }
    
    container.innerHTML = schedules.map(s => `
        <div class="schedule-card">
            <div class="schedule-header">
                <div>
                    <div class="schedule-title">${s.name}</div>
                    <div class="schedule-date"><i class="fas fa-calendar"></i> ${s.dateText}</div>
                </div>
            </div>
            <div class="schedule-actions">
                <button class="btn btn-sm btn-info" onclick="viewSchedule(${s.id})">Visualizar</button>
                <button class="btn btn-sm btn-secondary" aria-label="Editar cronograma ${s.name}" onclick="openEditScheduleModal(decodeURIComponent('${encodeURIComponent(String(s.id))}'))">Editar</button>
                <button class="btn btn-sm btn-secondary" onclick="deleteSchedule(${s.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Funções de calendário
function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const title = document.getElementById('calendarTitle');
    if (title) title.textContent = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.textContent = d;
        grid.appendChild(h);
    });
    
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - firstDay.getDay());
    
    for (let i = 0; i < 42; i++) {
        const day = new Date(start);
        const el = document.createElement('div');
        el.className = 'calendar-day';
        el.textContent = day.getDate();
        
        if (day.getMonth() !== month) el.classList.add('other-month');
        if (day.toDateString() === new Date().toDateString()) el.classList.add('today');
        if (selectedDate && day.toDateString() === selectedDate.toDateString()) el.classList.add('selected');
        
        el.onclick = () => {
            selectedDate = new Date(day);
            generateCalendar();
        };
        
        grid.appendChild(el);
        start.setDate(start.getDate() + 1);
    }
}

function changeMonth(dir) {
    currentDate.setMonth(currentDate.getMonth() + dir);
    generateCalendar();
}

// PDF e Notificações
function togglePDFPreview() {
    const container = document.getElementById('pdfPreviewContainer');
    const toggleText = document.getElementById('pdfToggleText');
    
    if (!pdfPreviewVisible) {
        generatePDFPreview();
        container.classList.add('show');
        toggleText.textContent = 'Ocultar PDF';
        pdfPreviewVisible = true;
    } else {
        container.classList.remove('show');
        toggleText.textContent = 'Visualizar PDF';
        pdfPreviewVisible = false;
    }
}

function groupScheduleEmployeesByShift(employeeList) {
    const shiftGroups = new Map();

    employeeList.forEach(employee => {
        const workHours = employee.schedule || 'Horário não informado';
        if (!shiftGroups.has(workHours)) shiftGroups.set(workHours, []);
        shiftGroups.get(workHours).push(employee);
    });

    return Array.from(shiftGroups, ([workHours, workers]) => ({ workHours, workers }));
}

function groupScheduleEmployeesBySector(employeeList) {
    const sectorGroups = new Map();

    employeeList.forEach(employee => {
        const sectorName = employee.pdfSector || employee.sector || 'Sem setor';
        if (!sectorGroups.has(sectorName)) sectorGroups.set(sectorName, []);
        sectorGroups.get(sectorName).push(employee);
    });

    const configuredSectors = sectors.map(sector => sector.name).filter(name => sectorGroups.has(name));
    const otherSectors = Array.from(sectorGroups.keys()).filter(name => !sectors.some(sector => sector.name === name));
    return [...configuredSectors, ...otherSectors].map(name => ({ name, employees: sectorGroups.get(name) }));
}

function renderPDFScheduleTable(employeeList) {
    if (!employeeList.length) return '';

    const shiftGroups = groupScheduleEmployeesByShift(employeeList);
    const employeeRows = shiftGroups.map(shift => shift.workers.map((worker, index) => `
            <tr>
                <td class="pdf-worker-name">${worker.name}</td>
                ${index === 0 ? `<td class="pdf-shift-time" rowspan="${shift.workers.length}">${shift.workHours}</td>` : ''}
            </tr>
        `).join('')).join('');

    return `
        <table class="pdf-shift-table">
            <thead><tr><th>Funcionário</th><th>Horário de trabalho</th></tr></thead>
            <tbody>${employeeRows}</tbody>
        </table>
    `;
}

function renderPDFSectorSections(employeeList, getTitle) {
    return groupScheduleEmployeesBySector(employeeList).map(group => `
        <section class="pdf-special-group">
            <h3 class="pdf-special-group-title">${getTitle(group.name)}</h3>
            ${renderPDFScheduleTable(group.employees)}
        </section>
    `).join('');
}

function buildSchedulePDFMarkup(schedule) {
    const scheduleEmployees = (schedule.employees || []).map(scheduleEmployee => {
        const currentEmployee = scheduleEmployee.id == null
            ? null
            : employees.find(employee => String(employee.id) === String(scheduleEmployee.id));
        return {
            ...scheduleEmployee,
            pdfSector: currentEmployee?.sector || scheduleEmployee.sector || 'Sem setor'
        };
    });
    const scheduleDay = [schedule.dayText, schedule.dateText].filter(Boolean).join(' • ');
    const sectorSections = renderPDFSectorSections(scheduleEmployees, sectorName => `Setor ${sectorName}`);

    return `
        <div class="pdf-document">
            <div class="pdf-header">
                <div class="pdf-logo"><i class="fas fa-store"></i> FORT ATACADISTA</div>
                <div class="pdf-title">CRONOGRAMA DE ESCALA</div>
                <div class="pdf-subtitle">${schedule.name} • ${scheduleDay}</div>
            </div>
            ${sectorSections}
        </div>
    `;
}

function generatePDFPreview() {
    const title = document.getElementById('viewScheduleTitle').textContent;
    const schedule = schedules.find(s => s.name === title);
    if (!schedule) return;

    document.getElementById('pdfPreviewContainer').innerHTML = buildSchedulePDFMarkup(schedule);
}

function downloadSchedulePDF() {
    const title = document.getElementById('viewScheduleTitle').textContent;
    const schedule = schedules.find(item => item.name === title);
    if (!schedule) return;

    const capture = document.getElementById('pdfCaptureElement');
    capture.innerHTML = buildSchedulePDFMarkup(schedule);

    window.setTimeout(() => {
        html2canvas(capture, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const imageData = canvas.toDataURL('image/png');
            const pageWidth = 210;
            const pageHeight = 297;
            const imageHeight = (canvas.height * pageWidth) / canvas.width;
            let remainingHeight = imageHeight;
            let position = 0;

            doc.addImage(imageData, 'PNG', 0, position, pageWidth, imageHeight);
            remainingHeight -= pageHeight;

            while (remainingHeight > 0) {
                position = remainingHeight - imageHeight;
                doc.addPage();
                doc.addImage(imageData, 'PNG', 0, position, pageWidth, imageHeight);
                remainingHeight -= pageHeight;
            }

            doc.save(`escala_${schedule.name.replace(/\s+/g, '_')}.pdf`);
            showNotification('PDF da escala gerado!', 'success');
        }).catch(error => {
            console.error('Erro ao gerar PDF:', error);
            showNotification('Não foi possível gerar o PDF. Tente novamente.', 'error');
        }).finally(() => {
            capture.innerHTML = '';
        });
    }, 100);
}

function showNotification(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// Auxiliares
function getOffDayName(day) {
    const days = { 'segunda': 'Segunda-feira', 'terca': 'Terça-feira', 'quarta': 'Quarta-feira', 'quinta': 'Quinta-feira', 'sexta': 'Sexta-feira', 'sabado': 'Sábado', 'nenhum': 'Nenhum dia de semana' };
    return days[day] || day;
}

function getSectorColor(name) {
    const s = sectors.find(sec => sec.name === name);
    return s ? s.color : '#6c757d';
}

function updateStats() {
    const total = document.getElementById('totalEmployees');
    if (total) total.textContent = employees.length;
    
    const activeSectors = document.getElementById('activeSectorsCount');
    if (activeSectors) activeSectors.textContent = sectors.length;
    
    const totalSchedules = document.getElementById('totalSchedules');
    if (totalSchedules) totalSchedules.textContent = schedules.length;
}

function saveData() {
    localStorage.setItem('fortEmployees', JSON.stringify(employees));
    localStorage.setItem('fortSchedules', JSON.stringify(schedules));
    localStorage.setItem('fortSectors', JSON.stringify(sectors));
}

function loadData() {
    const e = localStorage.getItem('fortEmployees');
    const s = localStorage.getItem('fortSchedules');
    const sec = localStorage.getItem('fortSectors');
    if (e) employees = JSON.parse(e);
    if (s) schedules = JSON.parse(s);
    if (sec) sectors = JSON.parse(sec);
}

// Event Listeners
document.getElementById('addEmployeeForm').addEventListener('submit', addEmployee);
document.getElementById('editEmployeeOffDaysForm').addEventListener('submit', updateEmployeeOffDays);
document.getElementById('createScheduleForm').addEventListener('submit', createSchedule);
document.getElementById('editScheduleForm').addEventListener('submit', updateSchedule);
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
});
