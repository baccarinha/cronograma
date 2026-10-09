// Variáveis globais
let employees = [];
let schedules = [];
let sectors = [
    { name: 'Caixa', color: '#FF0000', icon: 'fas fa-cash-register', description: 'Operadores de caixa da frente de loja' },
    { name: 'Auto Atendimento', color: '#007bff', icon: 'fas fa-robot', description: 'Caixas de autoatendimento' },
    { name: 'Carrinhos', color: '#28a745', icon: 'fas fa-shopping-cart', description: 'Equipe de organização de carrinhos' },
    { name: 'Assistentes', color: '#ffc107', icon: 'fas fa-hands-helping', description: 'Assistentes de frente de caixa' },
    { name: 'Fiscal', color: '#17a2b8', icon: 'fas fa-user-shield', description: 'Fiscais de caixa e prevenção' },
    { name: 'Operador de loja', color: '#6f42c1', icon: 'fas fa-store', description: 'Operadores da frente de caixa' }
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
    window.setInterval(() => {
        updateStats();
        renderDashboardEmployees();
    }, 60_000);
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
        updateStats();
        renderDashboardEmployees();
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

function getSundayCycleOptions(gender) {
    if (gender === 'homem') {
        return [
            { value: 'A', label: 'Domingo A (sequência contínua: 04/01, 25/01, 15/02, 08/03...)' },
            { value: 'B', label: 'Domingo B (sequência contínua: 11/01, 01/02, 22/02, 15/03...)' },
            { value: 'C', label: 'Domingo C (sequência contínua: 18/01, 08/02, 01/03, 22/03...)' },
            { value: 'D', label: 'Domingo D (trabalha todos os domingos)' },
            { value: 'E', label: 'Domingo E (folga todos os domingos)' }
        ];
    }

    return [
        { value: 'A', label: 'Domingo A (Folga: 04/01, 18/01, 01/02...)' },
        { value: 'B', label: 'Domingo B (Folga: 11/01, 25/01, 08/02...)' },
        { value: 'C', label: 'Domingo C (Trabalha todos os domingos)' },
        { value: 'D', label: 'Domingo D (Folga todos os domingos)' }
    ];
}

function populateSundayCycleOptions(selectElement, gender, selectedCycle, includePlaceholder = false) {
    const options = getSundayCycleOptions(gender);
    const placeholder = includePlaceholder ? '<option value="">Selecione o ciclo</option>' : '';
    selectElement.innerHTML = placeholder + options
        .map(option => `<option value="${option.value}">${option.label}</option>`)
        .join('');

    const defaultCycle = gender === 'homem' ? 'D' : 'C';
    selectElement.value = options.some(option => option.value === selectedCycle)
        ? selectedCycle
        : defaultCycle;
}

function getSundayCycleDescription(employee) {
    const isMan = employee.gender === 'homem';
    const cycle = employee.sundayCycle || (isMan ? 'D' : 'C');
    if (isMan) {
        const descriptions = {
            A: 'A (sequência contínua a partir de 04/01/2026)',
            B: 'B (sequência contínua a partir de 11/01/2026)',
            C: 'C (sequência contínua a partir de 18/01/2026)',
            D: 'D (trabalha todos os domingos)',
            E: 'E (folga todos os domingos)'
        };
        return descriptions[cycle] || cycle;
    }
    return cycle === 'D' ? 'D (folga todos os domingos)' : cycle;
}

function populateEmployeeSectorOptions(selectElement, selectedSector = '') {
    if (!selectElement) return;

    selectElement.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione um cargo';
    selectElement.appendChild(placeholder);

    const availableSectors = [...sectors];
    if (selectedSector && !availableSectors.some(sector => sector.name === selectedSector)) {
        availableSectors.push({ name: selectedSector });
    }

    availableSectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.name;
        option.textContent = sector.name;
        selectElement.appendChild(option);
    });
    selectElement.value = selectedSector;
}

function showAddEmployeeModal(gender = 'mulher') {
    const selectedGender = gender === 'homem' ? 'homem' : 'mulher';
    document.getElementById('employeeGender').value = selectedGender;
    populateEmployeeSectorOptions(document.getElementById('employeeSector'));
    document.getElementById('addEmployeeModalTitle').textContent =
        `Adicionar Funcionário ${selectedGender === 'homem' ? 'Homem' : 'Mulher'}`;
    populateSundayCycleOptions(
        document.getElementById('employeeSundayCycle'),
        selectedGender,
        selectedGender === 'homem' ? 'D' : 'C',
        true
    );
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
    const gender = document.getElementById('employeeGender').value === 'homem' ? 'homem' : 'mulher';
    
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
        gender,
        sundayCycle: sundayCycle || (gender === 'homem' ? 'D' : 'C'),
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
    populateEmployeeSectorOptions(document.getElementById('editEmployeeSector'), employee.sector || '');
    document.getElementById('editEmployeeSchedule').value = employee.schedule || '';
    // Registros antigos com sábado de folga passam para a opção permitida mais próxima.
    document.getElementById('editEmployeeOffDay').value =
        ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'nenhum'].includes(employee.offDay)
            ? employee.offDay
            : 'nenhum';
    const gender = employee.gender === 'homem' ? 'homem' : 'mulher';
    const defaultCycle = gender === 'homem' ? 'D' : 'C';
    populateSundayCycleOptions(
        document.getElementById('editEmployeeSundayCycle'),
        gender,
        employee.sundayCycle || defaultCycle
    );
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
    const sector = document.getElementById('editEmployeeSector').value;
    const schedule = document.getElementById('editEmployeeSchedule').value;
    if (!name || !sector || !schedule) {
        showNotification('Informe o nome, o cargo/setor e o horário do funcionário.', 'error');
        return;
    }

    employee.name = name;
    employee.sector = sector;
    employee.schedule = schedule;
    employee.offDay = document.getElementById('editEmployeeOffDay').value;
    employee.sundayCycle = document.getElementById('editEmployeeSundayCycle').value;

    saveData();
    renderSectors();
    renderEmployees();
    renderDashboardEmployees();
    updateStats();
    closeModal('editEmployeeOffDaysModal');
    showNotification('Funcionário atualizado!', 'success');
}

function getFilteredEmployees(inputId) {
    const searchInput = document.getElementById(inputId);
    const query = String(searchInput ? searchInput.value : '').trim().toLocaleLowerCase('pt-BR');
    const filteredEmployees = query
        ? employees.filter(employee => String(employee.name || '').toLocaleLowerCase('pt-BR').includes(query))
        : employees;
    return { filteredEmployees, query };
}

function filterEmployees(inputId = 'employeeSearch') {
    if (inputId === 'dashboardSearch') renderDashboardEmployees();
    else renderEmployees();
}

function renderEmployees() {
    const container = document.getElementById('employeesList');
    if (!container) return;

    const { filteredEmployees, query } = getFilteredEmployees('employeeSearch');
    if (filteredEmployees.length === 0) {
        if (query) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum funcionário encontrado</h3>
                    <p>Confira o nome e os acentos e tente novamente.</p>
                </div>
            `;
            return;
        }
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-plus"></i>
                <h3>Nenhum funcionário cadastrado</h3>
                <p>Adicione funcionários para começar a gerenciar a escala de trabalho.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredEmployees.map(employee => `
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
                    Ciclo Domingo: ${getSundayCycleDescription(employee)}
                </div>
            </div>
        </div>
    `).join('');
}

function renderDashboardEmployees() {
    const container = document.getElementById('dashboardEmployees');
    if (!container) return;

    const { filteredEmployees, query } = getFilteredEmployees('dashboardSearch');
    if (filteredEmployees.length === 0) {
        if (query) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum funcionário encontrado</h3>
                    <p>Confira o nome e os acentos e tente novamente.</p>
                </div>
            `;
            return;
        }
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Nenhum funcionário cadastrado</h3>
                <p>Comece adicionando funcionários ao sistema.</p>
            </div>
        `;
        return;
    }
    
    const today = getCurrentSaoPauloDate();
    container.innerHTML = filteredEmployees.map(employee => {
        const isOffDay = getEmployeeStatusForDate(employee, today) === 'FOLGA';
        
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
        isOffDay = isEmployeeOffOnSunday(employee, scheduleDate);
    }

    return isOffDay ? 'FOLGA' : 'Trabalhando';
}

function getCurrentSaoPauloDate() {
    const now = internetClockTimestamp === null
        ? new Date()
        : new Date(internetClockTimestamp + (performance.now() - internetClockPerformance));
    const dateParts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(now)
            .map(({ type, value }) => [type, value])
    );
    return new Date(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day), 12);
}

function getEmployeesWorkingOnDate(date = getCurrentSaoPauloDate()) {
    return employees.filter(employee => getEmployeeStatusForDate(employee, date) !== 'FOLGA');
}

function showWorkingTodayDetails() {
    const today = getCurrentSaoPauloDate();
    const workingEmployees = getEmployeesWorkingOnDate(today);
    const title = document.getElementById('workingTodayTitle');
    const container = document.getElementById('workingTodayList');
    if (!title || !container) return;

    title.textContent = `Funcionários trabalhando hoje — ${today.toLocaleDateString('pt-BR')}`;
    container.replaceChildren();

    if (!workingEmployees.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'Nenhum funcionário escalado para trabalhar hoje.';
        container.appendChild(emptyState);
    } else {
        workingEmployees.forEach(employee => {
            const card = document.createElement('div');
            card.className = 'employee-card';

            const name = document.createElement('div');
            name.className = 'employee-name';
            const personIcon = document.createElement('i');
            personIcon.className = 'fas fa-user';
            name.append(personIcon, document.createTextNode(` ${employee.name || 'Nome não informado'}`));

            const details = document.createElement('div');
            details.className = 'employee-details';
            [
                ['fa-building', employee.sector || 'Setor não informado'],
                ['fa-clock', employee.schedule || 'Horário não informado']
            ].forEach(([iconName, value]) => {
                const detail = document.createElement('div');
                detail.className = 'employee-detail';
                const icon = document.createElement('i');
                icon.className = `fas ${iconName}`;
                detail.append(icon, document.createTextNode(` ${value}`));
                details.appendChild(detail);
            });

            card.append(name, details);
            container.appendChild(card);
        });
    }

    showModal('workingTodayModal');
}

function isEmployeeOffOnSunday(employee, sundayDate) {
    const isMan = employee.gender === 'homem';
    const cycle = employee.sundayCycle || (isMan ? 'D' : 'C');

    if (isMan) {
        if (cycle === 'D') return false;
        if (cycle === 'E') return true;

        // Ciclo contínuo iniciado no primeiro domingo de janeiro de 2026:
        // A, B, C se repetem a cada três domingos, sem reiniciar no mês seguinte.
        const referenceDate = new Date(2026, 0, 4);
        const diffWeeks = Math.floor((sundayDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const cyclePosition = ((diffWeeks % 3) + 3) % 3;
        const cyclePositionByLetter = { A: 0, B: 1, C: 2 }[cycle];
        return cyclePositionByLetter === cyclePosition;
    }

    if (cycle === 'D') return true;
    if (cycle === 'A' || cycle === 'B') {
        const referenceDate = new Date(2026, 0, 4);
        const diffWeeks = Math.floor((sundayDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const isCycleASunday = Math.abs(diffWeeks) % 2 === 0;
        return cycle === 'A' ? isCycleASunday : !isCycleASunday;
    }

    return false;
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

    return Array.from(shiftGroups, ([workHours, workers]) => ({ workHours, workers })).sort((a, b) => {
        const aUnknown = a.workHours === 'Horário não informado';
        const bUnknown = b.workHours === 'Horário não informado';
        if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
        return a.workHours.localeCompare(b.workHours, 'pt-BR', { numeric: true });
    });
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

function createSchedulePDFPage(capture, schedule) {
    const scheduleDay = [schedule.dateText, schedule.dayText].filter(Boolean).join(' • ');
    const page = document.createElement('div');
    page.className = 'pdf-page';

    const header = document.createElement('div');
    header.className = 'pdf-header';
    const subtitle = document.createElement('div');
    subtitle.className = 'pdf-subtitle';
    subtitle.textContent = scheduleDay;
    header.append(subtitle);

    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'pdf-page-columns';
    const columns = [0, 1, 2].map(() => {
        const column = document.createElement('div');
        column.className = 'pdf-page-column';
        columnsContainer.appendChild(column);
        return column;
    });

    page.append(header, columnsContainer);
    capture.appendChild(page);
    void page.offsetHeight;

    if (!columns[0].clientHeight) {
        throw new Error('Não foi possível calcular a área imprimível do PDF.');
    }

    return { element: page, columns };
}

function buildSchedulePDFPages(schedule, capture) {
    capture.replaceChildren();
    Object.assign(capture.style, {
        width: '800px',
        height: 'auto',
        padding: '0',
        boxSizing: 'border-box',
        background: 'transparent',
        display: 'block'
    });

    const scheduleEmployees = (schedule.employees || []).map(scheduleEmployee => {
        const currentEmployee = scheduleEmployee.id == null
            ? null
            : employees.find(employee => String(employee.id) === String(scheduleEmployee.id));
        return {
            ...scheduleEmployee,
            pdfSector: currentEmployee?.sector || scheduleEmployee.sector || 'Sem setor'
        };
    });
    const sectorGroups = groupScheduleEmployeesBySector(scheduleEmployees);

    let currentPage = createSchedulePDFPage(capture, schedule);
    let currentColumnIndex = 0;
    let currentColumn = currentPage.columns[currentColumnIndex];
    let currentSectorBlock = null;
    let context = { sector: null, workHours: null, subgroup: null };

    const advanceColumn = () => {
        if (currentColumnIndex < currentPage.columns.length - 1) {
            currentColumnIndex += 1;
        } else {
            currentPage = createSchedulePDFPage(capture, schedule);
            currentColumnIndex = 0;
        }
        currentColumn = currentPage.columns[currentColumnIndex];
        currentSectorBlock = null;
        context = { sector: null, workHours: null, subgroup: null };
    };

    const appendEmployee = (sectorName, workHours, subgroupKey, subgroupLabel, subgroupCount, employee) => {
        let placed = false;

        while (!placed) {
            const columnWasEmpty = currentColumn.childElementCount === 0;
            const previousContext = { ...context };
            const previousSectorBlock = currentSectorBlock;
            const addedHeadings = [];
            let createdSectorBlock = false;

            if (context.sector !== sectorName) {
                currentSectorBlock = document.createElement('section');
                currentSectorBlock.className = 'pdf-sector-block';
                currentColumn.appendChild(currentSectorBlock);
                createdSectorBlock = true;
                const sectorHeading = document.createElement('h3');
                sectorHeading.className = 'pdf-special-group-title';
                sectorHeading.textContent = `Setor ${sectorName}`;
                currentSectorBlock.appendChild(sectorHeading);
                addedHeadings.push(sectorHeading);
                context.sector = sectorName;
                context.workHours = null;
                context.subgroup = null;
            }

            if (context.workHours !== workHours) {
                const shiftHeading = document.createElement('h4');
                shiftHeading.className = 'pdf-shift-subtitle';
                shiftHeading.textContent = `Horário de trabalho: ${workHours}`;
                currentSectorBlock.appendChild(shiftHeading);
                addedHeadings.push(shiftHeading);
                context.workHours = workHours;
                context.subgroup = null;
            }

            if (context.subgroup !== subgroupKey) {
                const subgroupHeading = document.createElement('h5');
                subgroupHeading.className = `pdf-status-subtitle ${subgroupKey === 'off' ? 'pdf-status-off-subtitle' : 'pdf-status-working-subtitle'}`;
                subgroupHeading.textContent = `${subgroupLabel} — ${subgroupCount} ${subgroupCount === 1 ? 'funcionário' : 'funcionários'}`;
                currentSectorBlock.appendChild(subgroupHeading);
                addedHeadings.push(subgroupHeading);
                context.subgroup = subgroupKey;
            }

            const employeeName = document.createElement('div');
            employeeName.className = `pdf-worker-name ${subgroupKey === 'off' ? 'pdf-worker-off' : ''}`;
            employeeName.textContent = employee.name || 'Nome não informado';
            currentSectorBlock.appendChild(employeeName);

            if (columnWasEmpty || currentColumn.scrollHeight <= currentColumn.clientHeight) {
                placed = true;
                continue;
            }

            employeeName.remove();
            addedHeadings.reverse().forEach(heading => heading.remove());
            if (createdSectorBlock) {
                currentSectorBlock.remove();
                currentSectorBlock = previousSectorBlock;
            }
            context = previousContext;
            advanceColumn();
        }
    };

    const isEmployeeOff = employee => String(employee.status || '').trim().toUpperCase().startsWith('FOLGA');
    const compareEmployeesAlphabetically = (first, second) =>
        String(first.name || '').localeCompare(String(second.name || ''), 'pt-BR', { sensitivity: 'base' });

    sectorGroups.forEach(group => {
        groupScheduleEmployeesByShift(group.employees).forEach(shift => {
            const alphabeticalWorkers = [...shift.workers].sort(compareEmployeesAlphabetically);
            const workingEmployees = alphabeticalWorkers.filter(employee => !isEmployeeOff(employee));
            const offEmployees = alphabeticalWorkers.filter(isEmployeeOff);

            workingEmployees.forEach(employee => appendEmployee(
                group.name, shift.workHours, 'working', 'Trabalhando', workingEmployees.length, employee
            ));
            offEmployees.forEach(employee => appendEmployee(
                group.name, shift.workHours, 'off', 'Folga', offEmployees.length, employee
            ));
        });
    });

    if (!scheduleEmployees.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'pdf-empty-state';
        emptyState.textContent = 'Nenhum funcionário nesta escala.';
        currentColumn.appendChild(emptyState);
    }

    return Array.from(capture.querySelectorAll('.pdf-page'));
}

function generatePDFPreview() {
    const title = document.getElementById('viewScheduleTitle').textContent;
    const schedule = schedules.find(item => item.name === title);
    if (!schedule) return;

    const capture = document.getElementById('pdfCaptureElement');
    const preview = document.getElementById('pdfPreviewContainer');
    try {
        const pages = buildSchedulePDFPages(schedule, capture);
        preview.replaceChildren(...pages.map(page => page.cloneNode(true)));
    } finally {
        capture.replaceChildren();
    }
}

async function downloadSchedulePDF() {
    const title = document.getElementById('viewScheduleTitle').textContent;
    const schedule = schedules.find(item => item.name === title);
    if (!schedule) return;

    const capture = document.getElementById('pdfCaptureElement');
    try {
        const pages = buildSchedulePDFPages(schedule, capture);
        await new Promise(resolve => window.setTimeout(resolve, 100));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        for (let index = 0; index < pages.length; index++) {
            const canvas = await html2canvas(pages[index], {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            if (index > 0) doc.addPage();
            const imageData = canvas.toDataURL('image/jpeg', 0.94);
            doc.addImage(imageData, 'JPEG', 0, 0, 210, 297);
        }

        doc.save(`escala_${schedule.name.replace(/\s+/g, '_')}.pdf`);
        showNotification('PDF da escala gerado!', 'success');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        showNotification('Não foi possível gerar o PDF. Tente novamente.', 'error');
    } finally {
        capture.replaceChildren();
    }
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

    const workingToday = document.getElementById('workingToday');
    if (workingToday) workingToday.textContent = getEmployeesWorkingOnDate().length;
    
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
    if (sec) {
        sectors = JSON.parse(sec).map(sector => sector.name === 'Operador(a) de loja'
            ? { ...sector, name: 'Operador de loja' }
            : sector);
        if (!sectors.some(sector => sector.name === 'Operador de loja')) {
            sectors.push({
                name: 'Operador de loja',
                color: '#6f42c1',
                icon: 'fas fa-store',
                description: 'Operadores da frente de caixa'
            });
        }
    }
    employees = employees.map(employee => employee.sector === 'Operador(a) de loja'
        ? { ...employee, sector: 'Operador de loja' }
        : employee);
}

// Event Listeners
document.getElementById('addEmployeeForm').addEventListener('submit', addEmployee);
document.getElementById('editEmployeeOffDaysForm').addEventListener('submit', updateEmployeeOffDays);
document.getElementById('createScheduleForm').addEventListener('submit', createSchedule);
document.getElementById('editScheduleForm').addEventListener('submit', updateSchedule);
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
});
