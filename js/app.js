/* ============================================================
   LIFE DASHBOARD — app.js
   Vanilla JavaScript, No frameworks, LocalStorage persistence

   New features:
     1. Light / Dark mode toggle  (THEME_KEY)
     2. Custom name in greeting   (NAME_KEY)
     3. Custom Pomodoro duration  (TIMER_MINS_KEY)
   ============================================================ */

"use strict";

/* ─────────────────────────────────────────────
   STORAGE KEYS
───────────────────────────────────────────── */
const TODO_KEY = "lifedash_todos";
const LINKS_KEY = "lifedash_links";
const THEME_KEY = "lifedash_theme";
const NAME_KEY = "lifedash_name";
const TIMER_MINS_KEY = "lifedash_timer_mins";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ══════════════════════════════════════════════
   FEATURE 1 — LIGHT / DARK MODE
   Persisted in localStorage as "dark" | "light"
══════════════════════════════════════════════ */
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeLabel = document.getElementById("theme-label");
const htmlEl = document.documentElement;

function applyTheme(theme) {
  htmlEl.setAttribute("data-theme", theme);
  if (theme === "light") {
    themeIcon.textContent = "☀️";
    themeLabel.textContent = "Light";
  } else {
    themeIcon.textContent = "🌙";
    themeLabel.textContent = "Dark";
  }
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

// Init
applyTheme(loadTheme());

themeToggle.addEventListener("click", () => {
  const current = htmlEl.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  saveTheme(next);
});

/* ══════════════════════════════════════════════
   FEATURE 2 — CUSTOM NAME IN GREETING
   Stored in localStorage
══════════════════════════════════════════════ */
const nameDisplay = document.getElementById("name-display");
const nameEditBtn = document.getElementById("name-edit-btn");
const nameModal = document.getElementById("name-modal");
const nameInput = document.getElementById("name-input");
const nameSaveBtn = document.getElementById("name-save-btn");
const nameCancelBtn = document.getElementById("name-cancel-btn");

function loadName() {
  return localStorage.getItem(NAME_KEY) || "";
}

function saveName(name) {
  localStorage.setItem(NAME_KEY, name);
}

function renderName() {
  const name = loadName();
  nameDisplay.textContent = name ? `Hi, ${name}!` : "";
}

function openNameModal() {
  nameInput.value = loadName();
  nameModal.classList.remove("hidden");
  nameInput.focus();
  nameInput.select();
}

function closeNameModal() {
  nameModal.classList.add("hidden");
}

nameEditBtn.addEventListener("click", openNameModal);

nameSaveBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  saveName(name);
  renderName();
  closeNameModal();
});

nameCancelBtn.addEventListener("click", closeNameModal);

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") nameSaveBtn.click();
  if (e.key === "Escape") closeNameModal();
});

nameModal.addEventListener("click", (e) => {
  if (e.target === nameModal) closeNameModal();
});

// Init
renderName();

// If first visit, prompt for name after a short delay
if (!loadName()) {
  setTimeout(openNameModal, 600);
}

/* ─────────────────────────────────────────────
   CLOCK & GREETING
───────────────────────────────────────────── */
const clockEl = document.getElementById("clock");
const dateEl = document.getElementById("date");
const greetingEl = document.getElementById("greeting");

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  clockEl.textContent = `${h}:${m}:${s}`;

  const day = DAYS[now.getDay()];
  const d = now.getDate();
  const mon = MONTHS[now.getMonth()];
  const yr = now.getFullYear();
  dateEl.textContent = `${day}, ${d} ${mon} ${yr}`;

  // Greeting — uses custom name if set
  const hour = now.getHours();
  let timeGreet;
  if (hour < 12) timeGreet = "☀️ Good Morning";
  else if (hour < 17) timeGreet = "🌤 Good Afternoon";
  else if (hour < 21) timeGreet = "🌆 Good Evening";
  else timeGreet = "🌙 Good Night";

  const name = loadName();
  greetingEl.textContent = name ? `${timeGreet}, ${name}!` : `${timeGreet}!`;
}

updateClock();
setInterval(updateClock, 1000);

/* ─────────────────────────────────────────────
   TO-DO LIST
───────────────────────────────────────────── */
let todos = loadTodos();

const todoInput = document.getElementById("todo-input");
const todoAddBtn = document.getElementById("todo-add-btn");
const todoListEl = document.getElementById("todo-list");
const todoCountEl = document.getElementById("todo-count");
const clearDoneBtn = document.getElementById("clear-done-btn");

const editModal = document.getElementById("edit-modal");
const editInput = document.getElementById("edit-input");
const editSaveBtn = document.getElementById("edit-save-btn");
const editCancelBtn = document.getElementById("edit-cancel-btn");

let editingId = null;

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(TODO_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}

function renderTodos() {
  todoListEl.innerHTML = "";

  if (todos.length === 0) {
    todoListEl.innerHTML =
      '<li class="empty-state">No tasks yet. Add one above!</li>';
  } else {
    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.className = `todo-item${todo.done ? " done" : ""}`;
      li.dataset.id = todo.id;
      li.innerHTML = `
        <input type="checkbox" class="todo-checkbox"
               ${todo.done ? "checked" : ""} aria-label="Mark task done" />
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <div class="todo-actions">
          <button class="btn btn-secondary btn-icon btn-edit" aria-label="Edit task">✏️</button>
          <button class="btn btn-ghost btn-icon btn-delete" aria-label="Delete task">🗑</button>
        </div>`;
      todoListEl.appendChild(li);
    });
  }

  const total = todos.length;
  const done = todos.filter((t) => t.done).length;
  todoCountEl.textContent = total ? `${done}/${total} done` : "";
}

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  todos.push({ id: uid(), text, done: false });
  saveTodos();
  renderTodos();
  todoInput.value = "";
  todoInput.focus();
}

todoAddBtn.addEventListener("click", addTodo);
todoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTodo();
});

todoListEl.addEventListener("click", (e) => {
  const item = e.target.closest(".todo-item");
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.matches(".todo-checkbox")) {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.done = !todo.done;
      saveTodos();
      renderTodos();
    }
    return;
  }
  if (e.target.matches(".btn-edit")) {
    openEditModal(id);
    return;
  }
  if (e.target.matches(".btn-delete")) {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    renderTodos();
  }
});

function openEditModal(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  editingId = id;
  editInput.value = todo.text;
  editModal.classList.remove("hidden");
  editInput.focus();
  editInput.select();
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editingId = null;
}

editSaveBtn.addEventListener("click", () => {
  const text = editInput.value.trim();
  if (!text || !editingId) return;
  const todo = todos.find((t) => t.id === editingId);
  if (todo) {
    todo.text = text;
    saveTodos();
    renderTodos();
  }
  closeEditModal();
});

editCancelBtn.addEventListener("click", closeEditModal);
editInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") editSaveBtn.click();
  if (e.key === "Escape") closeEditModal();
});
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

clearDoneBtn.addEventListener("click", () => {
  todos = todos.filter((t) => !t.done);
  saveTodos();
  renderTodos();
});

renderTodos();

/* ══════════════════════════════════════════════
   FEATURE 3 — CUSTOM POMODORO DURATION
   Stored in localStorage (minutes as integer)
   Timer recalculates its DURATION from this value.
══════════════════════════════════════════════ */
const CIRCUMFERENCE = 2 * Math.PI * 52; // ≈ 326.7

const timerDisplay = document.getElementById("timer-display");
const timerStartBtn = document.getElementById("timer-start-btn");
const timerStopBtn = document.getElementById("timer-stop-btn");
const timerResetBtn = document.getElementById("timer-reset-btn");
const timerRingFill = document.getElementById("timer-ring-fill");
const timerSessionLabel = document.getElementById("timer-session-label");
const timerDurationInput = document.getElementById("timer-duration-input");
const timerSetBtn = document.getElementById("timer-set-btn");

function loadTimerMins() {
  const stored = parseInt(localStorage.getItem(TIMER_MINS_KEY), 10);
  return stored && stored >= 1 && stored <= 120 ? stored : 25;
}

function saveTimerMins(mins) {
  localStorage.setItem(TIMER_MINS_KEY, String(mins));
}

// Mutable duration — can be changed by the user
let timerDurationSecs = loadTimerMins() * 60;
let timeRemaining = timerDurationSecs;
let timerRunning = false;
let timerInterval = null;

// Sync input field with saved value
timerDurationInput.value = timerDurationSecs / 60;

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function updateTimerRing() {
  const progress =
    timerDurationSecs > 0 ? timeRemaining / timerDurationSecs : 0;
  timerRingFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timeRemaining);
  updateTimerRing();

  if (timeRemaining === 0) {
    timerRingFill.classList.add("finished");
    timerSessionLabel.textContent = "✅ Session complete!";
  } else {
    timerRingFill.classList.remove("finished");
    timerSessionLabel.textContent = timerRunning ? "Focus Session" : "Ready";
  }
}

function setTimerDuration() {
  if (timerRunning) return; // don't change while running

  let mins = parseInt(timerDurationInput.value, 10);
  if (isNaN(mins) || mins < 1) mins = 1;
  if (mins > 120) mins = 120;

  timerDurationInput.value = mins;
  timerDurationSecs = mins * 60;
  timeRemaining = timerDurationSecs;

  saveTimerMins(mins);
  timerRingFill.classList.remove("finished");
  renderTimer();
  timerSessionLabel.textContent = `Set to ${mins} min`;
  setTimeout(() => {
    if (!timerRunning) timerSessionLabel.textContent = "Ready";
  }, 1500);
}

timerSetBtn.addEventListener("click", setTimerDuration);
timerDurationInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") setTimerDuration();
});

function startTimer() {
  if (timerRunning || timeRemaining === 0) return;
  timerRunning = true;
  timerStartBtn.disabled = true;
  timerStopBtn.disabled = false;
  timerDurationInput.disabled = true;
  timerSetBtn.disabled = true;
  timerSessionLabel.textContent = "Focus Session";

  timerInterval = setInterval(() => {
    timeRemaining--;
    renderTimer();
    if (timeRemaining === 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerStartBtn.disabled = false;
      timerStopBtn.disabled = true;
      timerDurationInput.disabled = false;
      timerSetBtn.disabled = false;
      notifyTimerDone();
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerStartBtn.disabled = false;
  timerStopBtn.disabled = true;
  timerDurationInput.disabled = false;
  timerSetBtn.disabled = false;
  timerSessionLabel.textContent = "Paused";
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timeRemaining = timerDurationSecs;
  timerStartBtn.disabled = false;
  timerStopBtn.disabled = true;
  timerDurationInput.disabled = false;
  timerSetBtn.disabled = false;
  timerRingFill.classList.remove("finished");
  renderTimer();
  timerSessionLabel.textContent = "Ready";
}

function notifyTimerDone() {
  const mins = timerDurationSecs / 60;
  const body = `${mins}-minute session complete! Take a break. 🎉`;
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Focus Timer", { body });
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") new Notification("Focus Timer", { body });
    });
  }
}

timerStartBtn.addEventListener("click", startTimer);
timerStopBtn.addEventListener("click", stopTimer);
timerResetBtn.addEventListener("click", resetTimer);

renderTimer();

/* ─────────────────────────────────────────────
   QUICK LINKS
───────────────────────────────────────────── */
let links = loadLinks();

const linkNameInput = document.getElementById("link-name-input");
const linkUrlInput = document.getElementById("link-url-input");
const linkAddBtn = document.getElementById("link-add-btn");
const linksGrid = document.getElementById("links-grid");

function loadLinks() {
  try {
    return JSON.parse(localStorage.getItem(LINKS_KEY)) || getDefaultLinks();
  } catch {
    return getDefaultLinks();
  }
}

function getDefaultLinks() {
  return [
    { id: uid(), name: "Google", url: "https://www.google.com" },
    { id: uid(), name: "YouTube", url: "https://www.youtube.com" },
    { id: uid(), name: "GitHub", url: "https://www.github.com" },
    { id: uid(), name: "Wikipedia", url: "https://www.wikipedia.org" },
  ];
}

function saveLinks() {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

function renderLinks() {
  linksGrid.innerHTML = "";
  if (links.length === 0) {
    linksGrid.innerHTML =
      '<p class="empty-state">No links yet. Add one above!</p>';
    return;
  }

  links.forEach((link) => {
    const chip = document.createElement("div");
    chip.className = "link-chip";
    chip.dataset.id = link.id;

    let faviconUrl = "";
    try {
      faviconUrl = `${new URL(link.url).origin}/favicon.ico`;
    } catch {
      /* ignore */
    }

    chip.innerHTML = `
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"
         title="${escapeHtml(link.url)}">
        ${
          faviconUrl
            ? `<img src="${escapeHtml(faviconUrl)}" alt="" width="14" height="14"
               style="vertical-align:middle;margin-right:5px;border-radius:3px;"
               onerror="this.style.display='none'" />`
            : ""
        }${escapeHtml(link.name)}
      </a>
      <button class="btn-delete-link" aria-label="Delete link" title="Delete">✕</button>`;
    linksGrid.appendChild(chip);
  });
}

function addLink() {
  const name = linkNameInput.value.trim();
  const raw = linkUrlInput.value.trim();
  if (!name || !raw) return;

  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    new URL(url);
  } catch {
    linkUrlInput.style.borderColor = "var(--danger)";
    setTimeout(() => {
      linkUrlInput.style.borderColor = "";
    }, 1500);
    return;
  }

  links.push({ id: uid(), name, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = "";
  linkUrlInput.value = "";
  linkNameInput.focus();
}

linkAddBtn.addEventListener("click", addLink);
linkUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addLink();
});
linkNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addLink();
});

linksGrid.addEventListener("click", (e) => {
  if (!e.target.matches(".btn-delete-link")) return;
  const chip = e.target.closest(".link-chip");
  if (!chip) return;
  links = links.filter((l) => l.id !== chip.dataset.id);
  saveLinks();
  renderLinks();
});

renderLinks();
