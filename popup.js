document.addEventListener('DOMContentLoaded', () => {

  
  const addTaskToggleBtn = document.getElementById('add-task-toggle-btn');
  const addTaskPanel     = document.getElementById('add-task-panel');
  const addTaskForm      = document.getElementById('add-task-form');
  const taskInput        = document.getElementById('task-input');
  const previewChip      = document.getElementById('preview-chip');
  const previewText      = document.getElementById('preview-text');
  const taskListEl       = document.getElementById('task-list');
  const emptyStateEl     = document.getElementById('empty-state');
  const removeTasksBtn   = document.getElementById('remove-tasks-btn');
  const testNotifBtn     = document.getElementById('test-notif-btn');

  
  let panelOpen = false;

  function openPanel() {
    panelOpen = true;
    addTaskPanel.style.display = 'flex';
    addTaskToggleBtn.textContent = '✕ Cancel';
    addTaskToggleBtn.setAttribute('aria-expanded', 'true');
    setTimeout(() => taskInput.focus(), 50);
  }

  function closePanel() {
    panelOpen = false;
    addTaskPanel.style.display = 'none';
    addTaskToggleBtn.textContent = '+ Add Task';
    addTaskToggleBtn.setAttribute('aria-expanded', 'false');
    taskInput.value = '';
    previewChip.style.display = 'none';
    previewText.textContent   = '';
  }

  closePanel(); 

  
  addTaskToggleBtn.addEventListener('click', () => {
    panelOpen ? closePanel() : openPanel();
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  
  taskInput.addEventListener('input', () => {
    const val = taskInput.value.trim();
    if (!val || !window.TimeParser) { previewChip.style.display = 'none'; return; }
    const parsed = TimeParser.parseTaskInput(val);
    if (parsed.hasTime && parsed.previewText) {
      previewText.textContent   = parsed.previewText;
      previewChip.style.display = 'flex';
    } else {
      previewChip.style.display = 'none';
    }
  });

  
  addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const rawValue = taskInput.value.trim();
    if (!rawValue) { showToast('Please type a task first.'); return; }

    let parsed = { title: rawValue, timestamp: null, formattedTime: '--:--', hasTime: false };
    if (window.TimeParser) {
      try { parsed = TimeParser.parseTaskInput(rawValue); }
      catch (err) { console.error('[RITT] parse error:', err); }
    }

    const newTask = {
      id:            'task_' + Date.now(),
      text:          (parsed.title && parsed.title.trim()) ? parsed.title.trim() : rawValue,
      formattedTime: parsed.formattedTime || '--:--',
      completed:     false,
      timestamp:     parsed.timestamp || null,
      snoozed:       false,
    };

    
    getTasks((currentTasks) => {
      const updated = [newTask, ...currentTasks];
      saveTasks(updated, () => {
        if (newTask.timestamp && newTask.timestamp > Date.now()) {
          chrome.alarms.create(newTask.id, { when: newTask.timestamp });
        }
        closePanel();
        renderTasks(updated);
        showToast('Task added' + (newTask.timestamp ? ' with reminder!' : '!'));
      });
    });
  });

  

  function getTasks(callback) {
    chrome.storage.local.get('tasks', (result) => {
      if (chrome.runtime.lastError) {
        console.error('[RITT] getTasks error:', chrome.runtime.lastError.message);
        callback([]);
        return;
      }
      
      const tasks = Array.isArray(result.tasks) ? result.tasks : [];
      callback(tasks);
    });
  }

  function saveTasks(tasks, callback) {
    chrome.storage.local.set({ tasks }, () => {
      if (chrome.runtime.lastError) {
        console.error('[RITT] saveTasks error:', chrome.runtime.lastError.message);
        showToast('Could not save — try again.');
        return;
      }
      if (callback) callback();
    });
  }

  

  function renderTasks(tasks) {
    taskListEl.innerHTML = '';

    if (!tasks || tasks.length === 0) {
      emptyStateEl.style.display = 'block';
      return;
    }
    emptyStateEl.style.display = 'none';

    tasks.forEach((task) => taskListEl.appendChild(buildTaskRow(task)));
  }

  function buildTaskRow(task) {
    const isSnoozed = !!(task.snoozed && !task.completed);

    const row = document.createElement('div');
    row.className = 'task-row' +
      (task.completed ? ' completed' : '') +
      (isSnoozed      ? ' snoozed'   : '');
    row.dataset.id = task.id;
    row.setAttribute('role', 'listitem');

    
    const pill = document.createElement('div');
    pill.className = 'task-pill';

    const titleSpan = document.createElement('span');
    titleSpan.className   = 'task-text';
    titleSpan.textContent = task.text;
    titleSpan.title       = task.text;

    const divider = document.createElement('div');
    divider.className = 'task-divider';

    const timeSpan = document.createElement('span');
    timeSpan.className   = 'task-time';
    timeSpan.textContent = isSnoozed
      ? '\u23F0 ' + (task.formattedTime || '--:--')
      : (task.formattedTime || '--:--');
    if (isSnoozed) timeSpan.title = 'Snoozed — fires at ' + task.formattedTime;

    pill.appendChild(titleSpan);
    pill.appendChild(divider);
    pill.appendChild(timeSpan);

    
    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox' + (task.completed ? ' checked' : '');
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-checked', String(task.completed));
    checkbox.setAttribute('tabindex', '0');
    checkbox.title = task.completed ? 'Mark incomplete' : 'Mark as done';

    const toggleFn = (e) => {
      e.stopPropagation();
      checkbox.classList.add('pop');
      setTimeout(() => checkbox.classList.remove('pop'), 260);
      toggleTask(task.id);
    };
    checkbox.addEventListener('click', toggleFn);
    checkbox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFn(e); }
    });

    
    const deleteBtn = document.createElement('button');
    deleteBtn.className   = 'delete-btn';
    deleteBtn.textContent = '\u00D7';
    deleteBtn.title       = 'Delete task';
    deleteBtn.setAttribute('aria-label', 'Delete: ' + task.text);
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id, row);
    });

    row.appendChild(pill);
    row.appendChild(checkbox);
    row.appendChild(deleteBtn);
    return row;
  }

  
  function toggleTask(taskId) {
    getTasks((tasks) => {
      const updated = tasks.map((t) => {
        if (t.id !== taskId) return t;
        const nowDone = !t.completed;
        if (nowDone) {
          chrome.alarms.clear(t.id);
        } else if (t.timestamp && t.timestamp > Date.now()) {
          chrome.alarms.create(t.id, { when: t.timestamp });
        }
        return { ...t, completed: nowDone, snoozed: nowDone ? false : t.snoozed };
      });
      saveTasks(updated, () => renderTasks(updated));
    });
  }

  
  function deleteTask(taskId, rowEl) {
    rowEl.style.transition = 'opacity 0.18s, transform 0.18s';
    rowEl.style.opacity    = '0';
    rowEl.style.transform  = 'translateX(14px)';
    setTimeout(() => {
      getTasks((tasks) => {
        const updated = tasks.filter((t) => t.id !== taskId);
        saveTasks(updated, () => {
          chrome.alarms.clear(taskId);
          renderTasks(updated);
        });
      });
    }, 200);
  }

  
  removeTasksBtn.addEventListener('click', () => {
    getTasks((tasks) => {
      const done      = tasks.filter((t) => t.completed);
      const remaining = tasks.filter((t) => !t.completed);

      if (done.length > 0) {
        done.forEach((t) => chrome.alarms.clear(t.id));
        saveTasks(remaining, () => {
          renderTasks(remaining);
          showToast(done.length + ' completed task(s) removed.');
        });
      } else if (tasks.length > 0) {
        showConfirm('Remove ALL tasks? This cannot be undone.', () => {
          tasks.forEach((t) => chrome.alarms.clear(t.id));
          saveTasks([], () => {
            renderTasks([]);
            showToast('All tasks removed.');
          });
        });
      } else {
        showToast('No tasks to remove.');
      }
    });
  });

  
  if (testNotifBtn) {
    testNotifBtn.addEventListener('click', () => {
      chrome.notifications.create('test_' + Date.now(), {
        type: 'basic', iconUrl: 'R.png',
        title: 'Right Info, Right Time',
        message: 'Notifications are working!',
        priority: 2, requireInteraction: false,
      }, () => {
        if (chrome.runtime.lastError) {
          showToast('Notification failed — check Chrome settings.');
        } else {
          showToast('Test notification sent!');
        }
      });
    });
  }

  
  function showToast(message) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className   = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    void toast.offsetWidth;
    toast.classList.add('toast-visible');
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 320);
    }, 2400);
  }

  function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    const box = document.createElement('div');
    box.className = 'confirm-box';
    const p = document.createElement('p');
    p.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'confirm-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => overlay.remove());
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-confirm-del';
    confirmBtn.textContent = 'Remove All';
    confirmBtn.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    box.appendChild(p);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  const DEFAULT_TASKS = [
    { id: 'task_1', text: 'Solve 2 DSA PROBLEM',      formattedTime: '10:30 AM', completed: false, timestamp: null, snoozed: false },
    { id: 'task_2', text: 'Complete Python notes',    formattedTime: '6:30 PM',  completed: true,  timestamp: null, snoozed: false },
    { id: 'task_3', text: 'Make a server in DC',      formattedTime: '12:00 PM', completed: false, timestamp: null, snoozed: false },
    { id: 'task_4', text: 'Draft an email for leave', formattedTime: '7:30 AM',  completed: true,  timestamp: null, snoozed: false },
  ];

  getTasks((tasks) => {
    if (tasks.length === 0) {
      
      saveTasks(DEFAULT_TASKS, () => renderTasks(DEFAULT_TASKS));
    } else {
      renderTasks(tasks);
    }
  });

});
