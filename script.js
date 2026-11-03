const taskInput = document.getElementById("taskInput");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const progress = document.getElementById("progress");
const todayDate = document.getElementById("todayDate");
const resetButton = document.getElementById("resetButton");
const undoButton = document.getElementById("undoButton");
const celebration = document.getElementById("celebration");
const themeSelect = document.getElementById("themeSelect");
const installButton = document.getElementById("installButton");

const defaultTaskInput = document.getElementById("defaultTaskInput");
const addDefaultButton = document.getElementById("addDefaultButton");
const defaultTaskList = document.getElementById("defaultTaskList");

let tasks = [];
let defaultTasks = [];
let draggedTaskId = null;
let draggedDefaultId = null;
let midnightTimer;
let lastDeletedState = null;
let deferredInstallPrompt = null;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

const defaultTaskTexts = [
  "Quiet Time",
  "Exercise",
  "News",
  "Updates (WhatsApp and Mail)",
  "Classes",
  "Cook",
  "Software development",
  "Study (Academics and Life)"
];

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeSelect.value = theme;
  localStorage.setItem("theme", theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  const theme = ["system", "light", "dark"].includes(savedTheme)
    ? savedTheme
    : "system";

  applyTheme(theme);
}

function createDefaultTask(text, index = 0) {
  return {
    id: `default-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    text
  };
}

function createDefaultTasks() {
  return defaultTasks.map(defaultTask => ({
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    defaultId: defaultTask.id,
    text: defaultTask.text,
    done: false
  }));
}

function moveTask(index, direction) {
  const newIndex = index + direction;

  if (newIndex < 0 || newIndex >= tasks.length) {
    return;
  }

  clearUndoState();
  [tasks[index], tasks[newIndex]] = [tasks[newIndex], tasks[index]];
  saveTasks();
  render();
}

function moveDefaultTask(index, direction) {
  const newIndex = index + direction;

  if (newIndex < 0 || newIndex >= defaultTasks.length) {
    return;
  }

  clearUndoState();
  [defaultTasks[index], defaultTasks[newIndex]] = [
    defaultTasks[newIndex],
    defaultTasks[index]
  ];
  saveDefaultTasks();
  syncDailyOrderWithDefaults();
  renderDefaultTasks();
}

function addTask() {
  const text = taskInput.value.trim();

  if (text === "") {
    return;
  }

  clearUndoState();
  tasks.push({
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    done: false
  });
  saveTasks();
  render();
  taskInput.value = "";
}

function addDefaultTask() {
  const text = defaultTaskInput.value.trim();

  if (text === "") {
    return;
  }

  const alreadyExists = defaultTasks.some(
    defaultTask => defaultTask.text.toLowerCase() === text.toLowerCase()
  );

  if (alreadyExists) {
    alert("That default task already exists.");
    return;
  }

  clearUndoState();
  const defaultTask = createDefaultTask(text, defaultTasks.length);
  defaultTasks.push(defaultTask);
  tasks.push({
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    defaultId: defaultTask.id,
    text,
    done: false
  });

  saveDefaultTasks();
  saveTasks();
  renderDefaultTasks();
  render();
  defaultTaskInput.value = "";
}

function formatTodayDate() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date());
}

function renderTodayDate() {
  todayDate.textContent = formatTodayDate();
}

function saveUndoState() {
  lastDeletedState = {
    tasks: tasks.map(task => ({ ...task })),
    defaultTasks: defaultTasks.map(task => ({ ...task }))
  };
  undoButton.hidden = false;
}

function clearUndoState() {
  lastDeletedState = null;
  undoButton.hidden = true;
}

function undoLastDelete() {
  if (!lastDeletedState) {
    return;
  }

  tasks = lastDeletedState.tasks;
  defaultTasks = lastDeletedState.defaultTasks;
  saveTasks();
  saveDefaultTasks();
  renderDefaultTasks();
  render();
  clearUndoState();
}

function resetToday() {
  const confirmed = window.confirm(
    "Reset today's tasks from your personal defaults? Your defaults will not change."
  );

  if (!confirmed) {
    return;
  }

  tasks = createDefaultTasks();
  saveTasks();
  render();
  clearUndoState();
}

function render() {
  taskList.innerHTML = "";

  tasks.forEach((task, index) => {
    const item = document.createElement("li");
    item.draggable = true;
    item.dataset.id = task.id;
    item.addEventListener("dragstart", () => {
      draggedTaskId = task.id;
    });
    item.addEventListener("dragover", event => {
      event.preventDefault();
    });
    item.addEventListener("drop", () => {
      const from = tasks.findIndex(item => item.id === draggedTaskId);
      const to = tasks.findIndex(item => item.id === task.id);

      if (from === -1 || to === -1 || from === to) {
        return;
      }

      const [movedTask] = tasks.splice(from, 1);
      clearUndoState();
      tasks.splice(from < to ? to - 1 : to, 0, movedTask);
      saveTasks();
      render();
    });

    const handle = document.createElement("span");
    handle.textContent = "☷";
    handle.className = "drag-handle";
    handle.setAttribute("aria-label", "Drag to reorder task");
    handle.setAttribute("title", "Drag to reorder task");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Mark ${task.text} as complete`);
    checkbox.addEventListener("change", () => {
      clearUndoState();
      task.done = checkbox.checked;
      saveTasks();
      render();
    });

    const text = document.createElement("span");
    text.textContent = task.text;

    const upButton = document.createElement("button");
    upButton.textContent = "▲";
    upButton.className = "move-button";
    upButton.title = "Move task up";
    upButton.setAttribute("aria-label", "Move task up");
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => moveTask(index, -1));

    const downButton = document.createElement("button");
    downButton.textContent = "▼";
    downButton.className = "move-button";
    downButton.title = "Move task down";
    downButton.setAttribute("aria-label", "Move task down");
    downButton.disabled = index === tasks.length - 1;
    downButton.addEventListener("click", () => moveTask(index, 1));

    const moveControls = document.createElement("span");
    moveControls.className = "move-controls";
    moveControls.append(upButton, downButton);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(`Delete "${task.text}" from today's tasks?`);

      if (!confirmed) {
        return;
      }

      saveUndoState();
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      render();
    });

    item.classList.toggle("completed", task.done);
    item.append(
      handle,
      checkbox,
      text,
      moveControls,
      deleteButton
    );
    taskList.appendChild(item);
  });

  const completed = tasks.filter(task => task.done).length;
  progress.textContent = `${completed} of ${tasks.length} done`;
  celebration.textContent =
    tasks.length > 0 && completed === tasks.length
      ? "All tasks complete. Great work!"
      : "";
}

function renderDefaultTasks() {
  defaultTaskList.innerHTML = "";

  defaultTasks.forEach((defaultTask, index) => {
    const item = document.createElement("li");
    item.draggable = true;
    item.dataset.id = defaultTask.id;
    item.addEventListener("dragstart", () => {
      draggedDefaultId = defaultTask.id;
    });
    item.addEventListener("dragover", event => {
      event.preventDefault();
    });
    item.addEventListener("drop", () => {
      const from = defaultTasks.findIndex(
        task => task.id === draggedDefaultId
      );
      const to = defaultTasks.findIndex(task => task.id === defaultTask.id);

      if (from === -1 || to === -1 || from === to) {
        return;
      }

      const [movedDefault] = defaultTasks.splice(from, 1);
      clearUndoState();
      defaultTasks.splice(from < to ? to - 1 : to, 0, movedDefault);
      saveDefaultTasks();
      syncDailyOrderWithDefaults();
      renderDefaultTasks();
    });

    const handle = document.createElement("span");
    handle.textContent = "☷";
    handle.className = "drag-handle";
    handle.setAttribute("aria-label", "Drag to reorder default task");
    handle.setAttribute("title", "Drag to reorder default task");

    const text = document.createElement("span");
    text.textContent = defaultTask.text;

    const upButton = document.createElement("button");
    upButton.textContent = "▲";
    upButton.className = "move-button";
    upButton.title = "Move default task up";
    upButton.setAttribute("aria-label", "Move default task up");
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => moveDefaultTask(index, -1));

    const downButton = document.createElement("button");
    downButton.textContent = "▼";
    downButton.className = "move-button";
    downButton.title = "Move default task down";
    downButton.setAttribute("aria-label", "Move default task down");
    downButton.disabled = index === defaultTasks.length - 1;
    downButton.addEventListener("click", () => moveDefaultTask(index, 1));

    const moveControls = document.createElement("span");
    moveControls.className = "move-controls";
    moveControls.append(upButton, downButton);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(
        `Delete "${defaultTask.text}" from your defaults and today's tasks?`
      );

      if (!confirmed) {
        return;
      }

      saveUndoState();
      defaultTasks = defaultTasks.filter(
        task => task.id !== defaultTask.id
      );
      tasks = tasks.filter(task => task.defaultId !== defaultTask.id);
      saveDefaultTasks();
      saveTasks();
      renderDefaultTasks();
      render();
    });

    item.append(
      handle,
      text,
      moveControls,
      deleteButton
    );
    defaultTaskList.appendChild(item);
  });
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  localStorage.setItem("tasksDate", getTodayKey());
}

function saveDefaultTasks() {
  localStorage.setItem("defaultTasks", JSON.stringify(defaultTasks));
}

function parseStoredValue(key) {
  const storedValue = localStorage.getItem(key);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Could not read saved ${key} data.`, error);
    localStorage.removeItem(key);
    return null;
  }
}

function loadDefaultTasks() {
  const savedDefaults = parseStoredValue("defaultTasks");

  if (
    Array.isArray(savedDefaults) &&
    savedDefaults.every(
      task =>
        typeof task === "string" ||
        (task &&
          (typeof task.id === "string" || typeof task.id === "number") &&
          typeof task.text === "string")
    )
  ) {
    defaultTasks = savedDefaults.map((task, index) => {
      if (typeof task === "string") {
        return createDefaultTask(task, index);
      }

      return {
        id: String(task.id),
        text: task.text
      };
    });
    saveDefaultTasks();
    return;
  }

  defaultTasks = defaultTaskTexts.map((text, index) =>
    createDefaultTask(text, index)
  );
  saveDefaultTasks();
}

function loadTasks() {
  const savedDate = localStorage.getItem("tasksDate");
  const savedTasks = parseStoredValue("tasks");

  if (
    savedDate === getTodayKey() &&
    Array.isArray(savedTasks) &&
    savedTasks.every(
      task =>
        task &&
        (typeof task.id === "string" || typeof task.id === "number") &&
        typeof task.text === "string" &&
        typeof task.done === "boolean"
    )
  ) {
    tasks = savedTasks.map(task => ({
      ...task,
      id: String(task.id),
      defaultId: task.defaultId
        ? String(task.defaultId)
        : task.defaultId
    }));
    const defaultByText = new Map(
      defaultTasks.map(defaultTask => [defaultTask.text, defaultTask])
    );

    tasks.forEach(task => {
      if (!task.defaultId && defaultByText.has(task.text)) {
        task.defaultId = defaultByText.get(task.text).id;
      }
    });
    saveTasks();
    return;
  }

  tasks = createDefaultTasks();
  saveTasks();
}

function syncDailyOrderWithDefaults() {
  const order = new Map(
    defaultTasks.map((defaultTask, index) => [defaultTask.id, index])
  );

  tasks.sort((a, b) => {
    const aOrder = a.defaultId && order.has(a.defaultId)
      ? order.get(a.defaultId)
      : Infinity;
    const bOrder = b.defaultId && order.has(b.defaultId)
      ? order.get(b.defaultId)
      : Infinity;
    return aOrder - bOrder;
  });

  saveTasks();
  render();
}

function scheduleMidnightReset() {
  clearTimeout(midnightTimer);

  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  midnightTimer = setTimeout(() => {
    tasks = createDefaultTasks();
    saveTasks();
    render();
    renderTodayDate();
    clearUndoState();
    scheduleMidnightReset();
  }, nextMidnight.getTime() - now.getTime());
}

function refreshForCurrentDay() {
  if (localStorage.getItem("tasksDate") === getTodayKey()) {
    return;
  }

  tasks = createDefaultTasks();
  saveTasks();
  render();
  renderTodayDate();
  clearUndoState();
}

addButton.addEventListener("click", addTask);
taskInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    addTask();
  }
});

addDefaultButton.addEventListener("click", addDefaultTask);
defaultTaskInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    addDefaultTask();
  }
});

resetButton.addEventListener("click", resetToday);
undoButton.addEventListener("click", undoLastDelete);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshForCurrentDay();
  }
});
themeSelect.addEventListener("change", () => {
  applyTheme(themeSelect.value);
});
systemTheme.addEventListener("change", () => {
  if (themeSelect.value === "system") {
    applyTheme("system");
  }
});

loadTheme();
loadDefaultTasks();
loadTasks();
renderDefaultTasks();
render();
renderTodayDate();
scheduleMidnightReset();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(registration => {
        console.info("Offline support is ready.", registration.scope);
      })
      .catch(error => {
        console.error("Offline support could not be enabled.", error);
      });
  });
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
});
