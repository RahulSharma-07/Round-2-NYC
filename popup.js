document.addEventListener("DOMContentLoaded", () => {
  const addTaskToggleBtn = document.getElementById("add-task-toggle-btn");
  const addTaskPanel = document.getElementById("add-task-panel");
  const addTaskForm = document.getElementById("add-task-form");
  const taskInput = document.getElementById("task-input");
  const previewChip = document.getElementById("preview-chip");
  const previewText = document.getElementById("preview-text");
  const taskList = document.getElementById("task-list");
  const emptyState = document.getElementById("empty-state");
  const removeTasksBtn = document.getElementById("remove-tasks-btn");


  const defaultTargets = [
    { id: "task_1", text: "Solve 2 DSA PROBLEM", formattedTime: "10:30", completed: false, timestamp: null },
    { id: "task_2", text: "Complete Python notes", formattedTime: "6:30", completed: true, timestamp: null },
    { id: "task_3", text: "Make a server in DC", formattedTime: "12:00", completed: false, timestamp: null },
    { id: "task_4", text: "Draft an email for leave", formattedTime: "7:30", completed: true, timestamp: null }
  ];

  
  initStorage();

  function initStorage() {
    chrome.storage.local.get({ tasks: null }, (data) => {
      if (data.tasks === null) {
        chrome.storage.local.set({ tasks: defaultTargets }, () => {
          renderTasks(defaultTargets);
        });
      } else {
        renderTasks(data.tasks);
      }
    });
  }

  
  addTaskToggleBtn.addEventListener("click", () => {
    const isCollapsed = addTaskPanel.classList.contains("collapsed");
    if (isCollapsed) {
      addTaskPanel.classList.remove("collapsed");
      addTaskPanel.classList.add("expanded");
      taskInput.focus();
    } else {
      collapseAddPanel();
    }
  });

  function collapseAddPanel() {
    addTaskPanel.classList.remove("expanded");
    addTaskPanel.classList.add("collapsed");
    taskInput.value = "";
    previewChip.classList.add("hidden");
  }

  
  taskInput.addEventListener("input", () => {
    const val = taskInput.value.trim();
    if (!val) {
      previewChip.classList.add("hidden");
      return;
    }

    if (window.TimeParser) {
      const parsed = TimeParser.parseTaskInput(val);
      if (parsed.hasTime && parsed.previewText) {
        previewText.textContent = parsed.previewText;
        previewChip.classList.remove("hidden");
      } else {
        previewChip.classList.add("hidden");
      }
    }
  });

  
  addTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const rawValue = taskInput.value.trim();
    if (!rawValue) return;

    let parsed = { title: rawValue, timestamp: null, formattedTime: "10:30", hasTime: false };
    if (window.TimeParser) {
      parsed = TimeParser.parseTaskInput(rawValue);
    }

    const newTask = {
      id: "task_" + Date.now(),
      text: parsed.title || rawValue,
      formattedTime: parsed.formattedTime || "10:30",
      completed: false,
      timestamp: parsed.timestamp
    };

    chrome.storage.local.get({ tasks: [] }, (data) => {
      const updatedTasks = [newTask, ...data.tasks];
      chrome.storage.local.set({ tasks: updatedTasks }, () => {
        

        if (newTask.timestamp && newTask.timestamp > Date.now()) {
          chrome.alarms.create(newTask.id, { when: newTask.timestamp });
        }
        collapseAddPanel();
        renderTasks(updatedTasks);
      });
    });
  });

  
  function renderTasks(tasks) {
    taskList.innerHTML = "";

    if (!tasks || tasks.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    } else {
      emptyState.classList.add("hidden");
    }

    tasks.forEach((task) => {
      const row = document.createElement("div");
      row.className = `task-row ${task.completed ? "completed" : ""}`;
      row.dataset.id = task.id;

      // Task Pill (Text | Deadline)
      const pill = document.createElement("div");
      pill.className = "task-pill";

      const titleSpan = document.createElement("span");
      titleSpan.className = "task-text";
      titleSpan.textContent = task.text;

      const divider = document.createElement("div");
      divider.className = "task-divider";

      const timeSpan = document.createElement("span");
      timeSpan.className = "task-time";
      timeSpan.textContent = task.formattedTime || "10:30";

      pill.appendChild(titleSpan);
      pill.appendChild(divider);
      pill.appendChild(timeSpan);

      
      const checkbox = document.createElement("div");
      checkbox.className = `checkbox ${task.completed ? "checked" : ""}`;
      checkbox.setAttribute("title", task.completed ? "Mark incomplete" : "Mark done");

      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTaskStatus(task.id);
      });

     
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.innerHTML = "&times;";
      deleteBtn.setAttribute("title", "Delete task");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSingleTask(task.id);
      });

      row.appendChild(pill);
      row.appendChild(checkbox);
      row.appendChild(deleteBtn);

      taskList.appendChild(row);
    });
  }

  
  function toggleTaskStatus(taskId) {
    chrome.storage.local.get({ tasks: [] }, (data) => {
      const tasks = data.tasks.map((task) => {
        if (task.id === taskId) {
          const newStatus = !task.completed;
          if (newStatus) {
            chrome.alarms.clear(taskId);
          }
          return { ...task, completed: newStatus };
        }
        return task;
      });

      chrome.storage.local.set({ tasks }, () => {
        renderTasks(tasks);
      });
    });
  }


  function deleteSingleTask(taskId) {
    chrome.storage.local.get({ tasks: [] }, (data) => {
      const tasks = data.tasks.filter((t) => t.id !== taskId);
      chrome.storage.local.set({ tasks }, () => {
        chrome.alarms.clear(taskId);
        renderTasks(tasks);
      });
    });
  }


  removeTasksBtn.addEventListener("click", () => {
    chrome.storage.local.get({ tasks: [] }, (data) => {
      const remainingTasks = data.tasks.filter((t) => !t.completed);
      const removedTasks = data.tasks.filter((t) => t.completed);

      removedTasks.forEach((t) => chrome.alarms.clear(t.id));

      
      if (remainingTasks.length === data.tasks.length && data.tasks.length > 0) {
        if (confirm("Remove all tasks?")) {
          data.tasks.forEach((t) => chrome.alarms.clear(t.id));
          chrome.storage.local.set({ tasks: [] }, () => {
            renderTasks([]);
          });
          return;
        }
      }

      chrome.storage.local.set({ tasks: remainingTasks }, () => {
        renderTasks(remainingTasks);
      });
    });
  });
});