const taskInput = document.getElementById("taskInput");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const progress = document.getElementById("progress");

const defaultTaskInput = document.getElementById("defaultTaskInput");
const addDefaultButton = document.getElementById("addDefaultButton");
const defaultTaskList = document.getElementById("defaultTaskList");

let tasks = [];
let draggedTaskId = null;
let draggedDefaultIndex = null;

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

let defaultTasks = [...defaultTaskTexts];

function getTodayKey() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function createDefaultTasks() {
  return defaultTasks.map((text, index) => ({
    id: Date.now() + index,
    text: text,
    done: false
  }));
}

function render() {
  taskList.innerHTML = "";
  tasks.forEach(task => {
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
        const [movedTask] = tasks.splice(from, 1);
        tasks.splice(to, 0, movedTask);
        saveTasks();
        render();
    });
    
    const handle = document.createElement("span");
    handle.textContent = "☷";
    handle.className = "drag-handle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    item.classList.toggle("completed", task.done);
    

    checkbox.addEventListener("change", function () {
      task.done = checkbox.checked;
      saveTasks();
      render();
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function () {
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      render();
    });

    item.append(handle, checkbox, task.text, deleteButton);
    taskList.appendChild(item);
  });

  const completed = tasks.filter(task => task.done).length;
  progress.textContent = `${completed} of ${tasks.length} done`;
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  localStorage.setItem("tasksDate", getTodayKey());
}

function saveDefaultTasks() {
  localStorage.setItem("defaultTasks", JSON.stringify(defaultTasks));
}

function loadDefaultTasks() {
  const savedDefaults = localStorage.getItem("defaultTasks");

  if (savedDefaults) {
    defaultTasks = JSON.parse(savedDefaults);
  }
}

function loadTasks() {
  const savedTasks = localStorage.getItem("tasks");
  const savedDate = localStorage.getItem("tasksDate");

  if (savedTasks && savedDate === getTodayKey()) {
    tasks = JSON.parse(savedTasks);
  } else {
    tasks = createDefaultTasks();
    saveTasks();
  }
}

function syncDailyOrderWithDefaults() {
  const order = new Map(
    defaultTasks.map((text, index) => [text, index])
  );

  tasks.sort((a, b) => {
    const aOrder = order.has(a.text) ? order.get(a.text) : Infinity;
    const bOrder = order.has(b.text) ? order.get(b.text) : Infinity;
    return aOrder - bOrder;
  });

  saveTasks();
  render();
}

function renderDefaultTasks() {
  defaultTaskList.innerHTML = "";

  defaultTasks.forEach((text, index) => {
    const item = document.createElement("li");
    item.draggable = true;

    const handle = document.createElement("span");
    handle.textContent = "☷";
    handle.className = "drag-handle";

    item.addEventListener("dragstart", () => {
      draggedDefaultIndex = index;
    });

    item.addEventListener("dragover", event => {
      event.preventDefault();
    });

    item.addEventListener("drop", () => {
      const [movedDefault] = defaultTasks.splice(draggedDefaultIndex, 1);
      const targetIndex =
        draggedDefaultIndex < index ? index - 1 : index;

      defaultTasks.splice(targetIndex, 0, movedDefault);
      saveDefaultTasks();
      syncDailyOrderWithDefaults();
      renderDefaultTasks();
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
  defaultTasks.splice(index, 1);
  tasks = tasks.filter(task => task.text !== text);
  saveDefaultTasks();
  saveTasks();
  renderDefaultTasks();
  render();
});

    item.append(handle, text, deleteButton);
    defaultTaskList.appendChild(item);
  });
}

addButton.addEventListener("click", function () {
    if (taskInput.value.trim() === "") {
        return;
    }
    const newTask = { id: Date.now(), text: taskInput.value, done: false };
    tasks.push(newTask);
    saveTasks();
    render();
    taskInput.value = "";
});

addDefaultButton.addEventListener("click", function () {
  const text = defaultTaskInput.value.trim();

  if (text === "") {
    return;
  }

  defaultTasks.push(text);
  tasks.push({
    id: Date.now(),
    text: text,
    done: false
  });

  saveDefaultTasks();
  saveTasks();
  renderDefaultTasks();
  render();
  defaultTaskInput.value = "";
});

loadDefaultTasks();
loadTasks();
renderDefaultTasks();
render();