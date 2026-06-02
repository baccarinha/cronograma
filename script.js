
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
});

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
        sundayCycle,
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
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
        employees = employees.filter(emp => emp.id !== id);
        saveData();
        renderEmployees();
        renderDashboardEmployees();
        updateStats();
        showNotification('Funcionário excluído com sucesso!', 'success');
    }
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
                <button onclick="deleteEmployee(${employee.id})" style="margin-left: auto; background: none; border: none; color: #dc3545; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
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
                    Ciclo Domingo: ${employee.sundayCycle || 'C'}
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
            
            if (employee.sundayCycle === 'A') isOffDay = isCycleASunday;
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
        employees: employees.map(emp => {
            const dayOfWeek = scheduleDate.getDay();
            const dayNames = {
                0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'
            };
            
            let isOffDay = emp.offDay === dayNames[dayOfWeek];
            
            if (dayOfWeek === 0) {
                const referenceDate = new Date(2026, 0, 4);
                const diffTime = scheduleDate.getTime() - referenceDate.getTime();
                const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
                const isCycleASunday = Math.abs(diffWeeks) % 2 === 0;
                
                if (emp.sundayCycle === 'A') isOffDay = isCycleASunday;
                else if (emp.sundayCycle === 'B') isOffDay = !isCycleASunday;
                else isOffDay = false;
            }
            
            return { ...emp, status: isOffDay ? 'FOLGA' : 'Trabalhando' };
        }),
        createdAt: new Date().toISOString()
    };
    
    schedules.push(schedule);
    saveData();
    renderSchedules();
    updateStats();
    closeModal('createScheduleModal');
    showNotification('Cronograma criado!', 'success');
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

function generatePDFPreview() {
    const title = document.getElementById('viewScheduleTitle').textContent;
    const schedule = schedules.find(s => s.name === title);
    if (!schedule) return;

    const container = document.getElementById('pdfPreviewContainer');
    container.innerHTML = `
        <div class="pdf-header">
            <div class="pdf-logo"><i class="fas fa-store"></i> FORT ATACADISTA</div>
            <div class="pdf-title">ESCADA DE FRENTE DE CAIXA</div>
            <div class="pdf-subtitle">${schedule.dateText}</div>
        </div>
        <div class="pdf-section">
            <div class="pdf-section-title">${schedule.name}</div>
            <div class="pdf-employee-grid">
                ${schedule.employees.map(e => `
                    <div class="pdf-employee-item">
                        <div class="pdf-employee-name">${e.name}</div>
                        <div class="pdf-employee-details">${e.sector} • ${e.schedule}</div>
                        <div class="pdf-status-badge ${e.status === 'FOLGA' ? 'pdf-status-off' : 'pdf-status-working'}">${e.status}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function downloadSchedulePDF() {
    const title = document.getElementById('viewScheduleTitle').textContent;
    const schedule = schedules.find(s => s.name === title);
    if (!schedule) return;

    const capture = document.getElementById('pdfCaptureElement');
    capture.innerHTML = document.getElementById('pdfPreviewContainer').innerHTML;
    
    setTimeout(() => {
        html2canvas(capture, { scale: 2 }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
            doc.save(`escala_${schedule.name}.pdf`);
            showNotification('PDF gerado!', 'success');
        });
    }, 500);
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
    const days = { 'segunda': 'Segunda', 'terca': 'Terça', 'quarta': 'Quarta', 'quinta': 'Quinta', 'sexta': 'Sexta', 'sabado': 'Sábado', 'nenhum': 'Nenhum' };
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
document.getElementById('createScheduleForm').addEventListener('submit', createSchedule);
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
});
