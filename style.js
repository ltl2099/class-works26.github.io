document.addEventListener('DOMContentLoaded', () => {
    // --- START: Application State & Data ---
    const state = {
        tasks: JSON.parse(localStorage.getItem('tasks')) || [],
        logs: JSON.parse(localStorage.getItem('logs')) || [],
        points: JSON.parse(localStorage.getItem('points')) || [],
        password: localStorage.getItem('password') || null,
        currentEditingId: null,
    };

    const saveData = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
        renderAll(); // Centralized re-render after any data change
    };

    const savePassword = (password) => {
        localStorage.setItem('password', password);
        state.password = password;
    };
    // --- END: Application State & Data ---


    // --- START: DOM Element Selectors ---
    const DOMElements = {
        nav: {
            kanban: document.getElementById('nav-kanban'),
            log: document.getElementById('nav-log'),
            settings: document.getElementById('nav-settings'),
        },
        sections: {
            kanban: document.getElementById('kanban-section'),
            log: document.getElementById('log-section'),
            settings: document.getElementById('settings-section'),
        },
        log: {
            addBtn: document.getElementById('add-log-btn'),
            tableBody: document.querySelector('#log-table tbody'),
        },
        settings: {
            passwordGate: document.getElementById('password-gate'),
            passwordInput: document.getElementById('password-input'),
            passwordSubmit: document.getElementById('password-submit'),
            passwordFeedback: document.getElementById('password-feedback'),
            settingsContent: document.getElementById('settings-content'),
            newPassword: document.getElementById('new-password'),
            confirmPassword: document.getElementById('confirm-password'),
            savePasswordBtn: document.getElementById('save-password-btn'),
            passwordSetFeedback: document.getElementById('password-set-feedback'),
            addPointBtn: document.getElementById('add-point-btn'),
            pointsTableBody: document.querySelector('#points-table tbody'),
            totalPointsDisplay: document.getElementById('total-points-display'),
        },
        modal: {
            container: document.getElementById('modal-container'),
            body: document.getElementById('modal-body'),
            closeBtn: document.querySelector('.close-btn'),
        }
    };
    // --- END: DOM Element Selectors ---


    // --- START: Rendering Functions ---
    const renderTasks = () => {
        document.querySelectorAll('.tasks').forEach(col => col.innerHTML = '');
        state.tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = `task-card priority-${task.priority}`;
            taskCard.id = task.id;
            taskCard.draggable = true;

            let actionsHtml = '';
            // LINKAGE FEATURE: Add buttons only if task is done
            if (task.status === 'done') {
                actionsHtml = `
                    <div class="task-actions">
                        <button class="link-btn" onclick="app.linkTaskToPoints('${task.id}')"><i class="fa-solid fa-star"></i> 记录积分</button>
                        <button class="link-btn" onclick="app.linkTaskToLog('${task.id}')"><i class="fa-solid fa-book"></i> 生成日志</button>
                    </div>
                `;
            }

            taskCard.innerHTML = `
                <div class="task-content" onclick="app.openTaskModal('${task.id}')">
                    <p><strong>${task.title}</strong></p>
                    <p>负责人: ${task.assignee}</p>
                    <p>截止日期: ${task.dueDate}</p>
                </div>
                ${actionsHtml}
            `;
            taskCard.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', e.target.id));
            document.getElementById(`${task.status}-tasks`).appendChild(taskCard);
        });
    };

    const renderLogs = () => {
        DOMElements.log.tableBody.innerHTML = '';
        state.logs.forEach(log => {
            const row = DOMElements.log.tableBody.insertRow();
            row.innerHTML = `
                <td>${log.date}</td>
                <td>${log.assignee}</td>
                <td>${log.category}</td>
                <td>${log.description}</td>
                <td><a href="${log.link}" target="_blank">${log.link ? '查看' : ''}</a></td>
                <td>${log.status}</td>
                <td>${log.notes}</td>
                <td>
                    <!-- LINKAGE FEATURE: Add points from log -->
                    <button class="action-btn link-points-btn" onclick="app.linkLogToPoints('${log.id}')" title="为此项加分"><i class="fa-solid fa-star"></i></button>
                    <button class="action-btn edit-btn" onclick="app.openLogModal('${log.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" onclick="app.deleteLog('${log.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
        });
    };
    
    const renderPoints = () => {
        DOMElements.settings.pointsTableBody.innerHTML = '';
        const totalPoints = state.points.reduce((sum, p) => sum + Number(p.change), 0);
        state.points.forEach(point => {
            const row = DOMElements.settings.pointsTableBody.insertRow();
            row.innerHTML = `
                <td>${point.date}</td>
                <td>${point.name}</td>
                <td>${point.event}</td>
                <td>${point.change > 0 ? '+' : ''}${point.change}</td>
                <td>${point.reason}</td>
                <td>${point.confirmedBy}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="app.openPointModal('${point.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" onclick="app.deletePoint('${point.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
        });
        DOMElements.settings.totalPointsDisplay.textContent = totalPoints;
    };
    
    const renderAll = () => {
        renderTasks();
        renderLogs();
        renderPoints();
    };
    // --- END: Rendering Functions ---

    
    // --- START: Modal & Form Handling ---
    const openModal = (content) => {
        DOMElements.modal.body.innerHTML = content;
        DOMElements.modal.container.style.display = 'block';
    };
    const closeModal = () => {
        DOMElements.modal.container.style.display = 'none';
        DOMElements.modal.body.innerHTML = '';
        state.currentEditingId = null;
    };
    
    const openTaskModal = (id = null) => {
        state.currentEditingId = id;
        const task = state.tasks.find(t => t.id === id) || {};
        const isCancelled = task.status === 'cancelled';
        const modalContent = `
            <form id="task-form" class="modal-form">
                <h2>${id ? '编辑任务' : '添加新任务'}</h2>
                <label for="title">任务标题</label>
                <input type="text" id="title" value="${task.title || ''}" required>
                <label for="description">详情描述</label>
                <textarea id="description">${task.description || ''}</textarea>
                <label for="assignee">负责人</label>
                <input type="text" id="assignee" value="${task.assignee || ''}" required>
                <label for="dueDate">截止日期</label>
                <input type="date" id="dueDate" value="${task.dueDate || ''}" required>
                <label for="priority">优先级</label>
                <select id="priority">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>低</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>中</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>高</option>
                </select>
                <label for="status">状态</label>
                <select id="status">
                    <option value="todo" ${task.status === 'todo' || !task.status ? 'selected' : ''}>待办</option>
                    <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>进行中</option>
                    <option value="done" ${task.status === 'done' ? 'selected' : ''}>已完成</option>
                    <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>已取消/搁置</option>
                </select>
                <div id="cancel-reason-container" style="display:${isCancelled ? 'block' : 'none'}">
                    <label for="cancelReason">取消/搁置原因</label>
                    <textarea id="cancelReason">${task.cancelReason || ''}</textarea>
                </div>
                <label for="attachments">关联资料/图片链接</label>
                <input type="text" id="attachments" value="${task.attachments || ''}">
                <button type="submit">保存</button>
                ${id ? `<button type="button" class="delete-btn" onclick="app.deleteTask('${id}')" style="background-color: #e57373; margin-top: 10px;">删除任务</button>` : ''}
            </form>
        `;
        openModal(modalContent);
        document.getElementById('status').addEventListener('change', (e) => {
            document.getElementById('cancel-reason-container').style.display = e.target.value === 'cancelled' ? 'block' : 'none';
        });
    };

    const openLogModal = (id = null, prefill = {}) => {
        state.currentEditingId = id;
        const log = state.logs.find(l => l.id === id) || {};
        const modalContent = `
            <form id="log-form" class="modal-form">
                <h2>${id ? '编辑日志' : '添加日志'}</h2>
                <label for="log-date">日期</label>
                <input type="date" id="log-date" value="${log.date || prefill.date || new Date().toISOString().slice(0, 10)}" required>
                <label for="log-assignee">负责人</label>
                <input type="text" id="log-assignee" value="${log.assignee || prefill.assignee || ''}" required>
                <label for="log-category">事项类别</label>
                <input type="text" id="log-category" value="${log.category || prefill.category || ''}" required>
                <label for="log-description">内容简述</label>
                <textarea id="log-description" required>${log.description || prefill.description || ''}</textarea>
                <label for="log-link">关键链接/截图</label>
                <input type="url" id="log-link" value="${log.link || ''}">
                <label for="log-status">状态</label>
                <input type="text" id="log-status" value="${log.status || '已完成'}">
                <label for="log-notes">备注</label>
                <textarea id="log-notes">${log.notes || ''}</textarea>
                <button type="submit">保存</button>
            </form>
        `;
        openModal(modalContent);
    };

    const openPointModal = (id = null, prefill = {}) => {
        state.currentEditingId = id;
        const point = state.points.find(p => p.id === id) || {};
        const modalContent = `
            <form id="point-form" class="modal-form">
                <h2>${id ? '编辑积分' : '添加积分'}</h2>
                <label for="point-date">日期</label>
                <input type="date" id="point-date" value="${point.date || prefill.date || new Date().toISOString().slice(0, 10)}" required>
                <label for="point-name">姓名</label>
                <input type="text" id="point-name" value="${point.name || prefill.name || ''}" required>
                <label for="point-event">事项</label>
                <input type="text" id="point-event" value="${point.event || prefill.event || ''}" required>
                <label for="point-change">积分变动 (如: 4, -2)</label>
                <input type="number" id="point-change" value="${point.change || ''}" placeholder="例如：3" required>
                <label for="point-reason">事由</label>
                <textarea id="point-reason" required>${point.reason || prefill.reason || ''}</textarea>
                <label for="point-confirmedBy">班委确认</label>
                <input type="text" id="point-confirmedBy" value="${point.confirmedBy || ''}" required>
                <button type="submit">保存</button>
            </form>
        `;
        openModal(modalContent);
    };

    // --- END: Modal & Form Handling ---


    // --- START: Core Logic & Event Handlers ---
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const formId = e.target.id;
        
        if (formId === 'task-form') {
            const taskData = {
                id: state.currentEditingId || `task-${Date.now()}`,
                title: e.target.querySelector('#title').value,
                description: e.target.querySelector('#description').value,
                assignee: e.target.querySelector('#assignee').value,
                dueDate: e.target.querySelector('#dueDate').value,
                priority: e.target.querySelector('#priority').value,
                status: e.target.querySelector('#status').value,
                cancelReason: e.target.querySelector('#cancelReason').value,
                attachments: e.target.querySelector('#attachments').value,
            };
            if (state.currentEditingId) {
                const index = state.tasks.findIndex(t => t.id === state.currentEditingId);
                state.tasks[index] = taskData;
            } else {
                state.tasks.push(taskData);
            }
            saveData('tasks', state.tasks);
        }
        else if (formId === 'log-form') {
            const logData = {
                id: state.currentEditingId || `log-${Date.now()}`,
                date: e.target.querySelector('#log-date').value,
                assignee: e.target.querySelector('#log-assignee').value,
                category: e.target.querySelector('#log-category').value,
                description: e.target.querySelector('#log-description').value,
                link: e.target.querySelector('#log-link').value,
                status: e.target.querySelector('#log-status').value,
                notes: e.target.querySelector('#log-notes').value,
            };
            if (state.currentEditingId) {
                const index = state.logs.findIndex(l => l.id === state.currentEditingId);
                state.logs[index] = logData;
            } else {
                state.logs.push(logData);
            }
            saveData('logs', state.logs);
        }
        else if (formId === 'point-form') {
            const pointData = {
                id: state.currentEditingId || `point-${Date.now()}`,
                date: e.target.querySelector('#point-date').value,
                name: e.target.querySelector('#point-name').value,
                event: e.target.querySelector('#point-event').value,
                change: e.target.querySelector('#point-change').value,
                reason: e.target.querySelector('#point-reason').value,
                confirmedBy: e.target.querySelector('#point-confirmedBy').value,
            };
            if (state.currentEditingId) {
                const index = state.points.findIndex(p => p.id === state.currentEditingId);
                state.points[index] = pointData;
            } else {
                state.points.push(pointData);
            }
            saveData('points', state.points);
        }

        closeModal();
    };

    const deleteTask = (id) => {
        if (confirm('确定要删除此任务吗？')) {
            state.tasks = state.tasks.filter(t => t.id !== id);
            saveData('tasks', state.tasks);
            closeModal();
        }
    };

    const deleteLog = (id) => {
        if (confirm('确定要删除此条日志吗？')) {
            state.logs = state.logs.filter(l => l.id !== id);
            saveData('logs', state.logs);
        }
    };

    const deletePoint = (id) => {
        if (confirm('确定要删除此条积分记录吗？')) {
            state.points = state.points.filter(p => p.id !== id);
            saveData('points', state.points);
        }
    };
    // --- END: Core Logic & Event Handlers ---


    // --- START: Linkage Functions ---
    const linkTaskToPoints = (taskId) => {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            openPointModal(null, { 
                name: task.assignee, 
                event: `完成任务: ${task.title}`, 
                reason: `完成任务: ${task.title}` 
            });
        }
    };

    const linkTaskToLog = (taskId) => {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            openLogModal(null, {
                assignee: task.assignee,
                category: "班级事务",
                description: `完成看板任务: ${task.title}`
            });
        }
    };
    
    const linkLogToPoints = (logId) => {
        const log = state.logs.find(l => l.id === logId);
        if (log) {
            openPointModal(null, {
                name: log.assignee,
                event: `工作日志: ${log.category}`,
                reason: log.description
            });
        }
    };
    // --- END: Linkage Functions ---


    // --- START: Setup & Initialization ---
    const app = {
        // Drag & Drop
        drop: (e) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = e.target.closest('.kanban-column').id;
            const task = state.tasks.find(t => t.id === taskId);
            if (task && task.status !== newStatus) {
                task.status = newStatus;
                saveData('tasks', state.tasks);
            }
        },
        
        // Expose functions to global scope for inline event handlers
        openTaskModal, deleteTask,
        openLogModal, deleteLog,
        openPointModal, deletePoint,
        linkTaskToPoints, linkTaskToLog, linkLogToPoints,
    };
    window.app = app;

    const bindEventListeners = () => {
        // Navigation
        DOMElements.nav.kanban.addEventListener('click', () => switchView('kanban-section'));
        DOMElements.nav.log.addEventListener('click', () => switchView('log-section'));
        DOMElements.nav.settings.addEventListener('click', () => switchView('settings-section'));
        
        // Modal
        DOMElements.modal.closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            if (e.target === DOMElements.modal.container) closeModal();
        });
        DOMElements.modal.container.addEventListener('submit', handleFormSubmit);

        // Add Buttons
        DOMElements.log.addBtn.addEventListener('click', () => openLogModal());
        DOMElements.settings.addPointBtn.addEventListener('click', () => openPointModal());

        // Settings
        DOMElements.settings.passwordSubmit.addEventListener('click', handlePasswordSubmit);
        DOMElements.settings.savePasswordBtn.addEventListener('click', handleSavePassword);
    };
    
    const switchView = (targetId) => {
        Object.values(DOMElements.sections).forEach(section => section.classList.remove('active'));
        document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(targetId).classList.add('active');
        document.querySelector(`nav button[id="nav-${targetId.split('-')[0]}"]`).classList.add('active');

        if (targetId === 'settings-section') {
            if (state.password) {
                DOMElements.settings.passwordGate.style.display = 'block';
                DOMElements.settings.settingsContent.style.display = 'none';
                DOMElements.settings.passwordInput.value = '';
            } else {
                DOMElements.settings.passwordGate.style.display = 'none';
                DOMElements.settings.settingsContent.style.display = 'block';
            }
        }
    };
    
    const handlePasswordSubmit = () => {
        if (DOMElements.settings.passwordInput.value === state.password) {
            DOMElements.settings.passwordGate.style.display = 'none';
            DOMElements.settings.settingsContent.style.display = 'block';
            DOMElements.settings.passwordFeedback.textContent = '';
        } else {
            DOMElements.settings.passwordFeedback.textContent = '密码错误，请重试。';
            DOMElements.settings.passwordFeedback.className = 'feedback error';
        }
    };

    const handleSavePassword = () => {
        const newPass = DOMElements.settings.newPassword.value;
        const confirmPass = DOMElements.settings.confirmPassword.value;
        const feedbackEl = DOMElements.settings.passwordSetFeedback;

        if (!newPass || !confirmPass) {
            feedbackEl.textContent = '密码不能为空！';
            feedbackEl.className = 'feedback error';
            return;
        }
        if (newPass !== confirmPass) {
            feedbackEl.textContent = '两次输入的密码不一致！';
            feedbackEl.className = 'feedback error';
            return;
        }
        savePassword(newPass);
        feedbackEl.textContent = '密码设置成功！';
        feedbackEl.className = 'feedback success';
        setTimeout(() => feedbackEl.textContent = '', 3000);
        DOMElements.settings.newPassword.value = '';
        DOMElements.settings.confirmPassword.value = '';
    };

    const init = () => {
        bindEventListeners();
        renderAll();
        if (!state.password) {
             DOMElements.nav.settings.innerHTML += ' <span style="color: #f39c12; font-size: 0.8em;">(请先设置密码)</span>';
        }
    };

    init();
    // --- END: Setup & Initialization ---
});