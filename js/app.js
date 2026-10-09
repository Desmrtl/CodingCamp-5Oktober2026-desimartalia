/* ============================================================
   LIFE DASHBOARD — app.js
   Vanilla JavaScript, No frameworks, LocalStorage persistence
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────
   1. CLOCK & GREETING
───────────────────────────────────────────── */
const clockEl    = document.getElementById('clock');
const dateEl     = document.getElementById('date');
const greetingEl = document.getElementById('greeting');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function updateClock() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const s    = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${h}:${m}:${s}`;

  const day  = DAYS[now.getDay()];
  const date = now.getDate();
  const mon  = MONTHS[now.getMonth()];
  const yr   = now.getFullYear();
  dateEl.textContent = `${day}, ${date} ${mon} ${yr}`;

  // Greeting based on hour
  const hour = now.getHours();
  let greet;
  if (hour < 12)      greet = '☀️ Good Morning!';
  else if (hour < 17) greet = '🌤 Good Afternoon!';
  else if (hour < 21) greet = '🌆 Good Evening!';
  else                greet = '🌙 Good Night!';
  greetingEl.textContent = greet;
}

updateClock();
setInterval(updateClock, 1000);


/* ─────────────────────────────────────────────
   2. TO-DO LIST
───────────────────────────────────────────── */
const TODO_KEY = 'lifedash_todos';

let todos = loadTodos();

// DOM refs
const todoInput    = document.getElementById('todo-input');
const todoAddBtn   = document.getElementById('todo-add-btn');
const todoListEl   = document.getElementById('todo-list');
const todoCountEl  = document.getElementById('todo-count');
const clearDoneBtn = document.getElementById('clear-done-btn');

// Modal DOM refs
const editModal     = document.getElementById('edit-modal');
const editInput     = document.getElementById('edit-input');
const editSaveBtn   = document.getElementById('edit-save-btn');
const editCancelBtn = document.getElementById('edit-cancel-btn');

let editingId = null;

/* ---- Persistence ---- */
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

/* ---- Generate unique ID ---- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---- Render ---- */
function renderTodos() {
  todoListEl.innerHTML = '';

  if (todos.length === 0) {
    todoListEl.innerHTML = '<li class="empty-state">No tasks yet. Add one above!</li>';
  } else {
    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item${todo.done ? ' done' : ''}`;
      li.dataset.id = todo.id;

      li.innerHTML = `
        <input type="checkbox" class="todo-checkbox"
               ${todo.done ? 'checked' : ''}
               aria-label="Mark task done" />
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <div class="todo-actions">
          <button class="btn btn-secondary btn-icon btn-edit"
                  aria-label="Edit task">✏️</button>
          <button class="btn btn-ghost btn-icon btn-delete"
                  aria-label="Delete task">🗑</button>
        </div>
      `;
      todoListEl.appendChild(li);
    });
  }

  // Footer count
  const total = todos.length;
  const done  = todos.filter(t => t.done).length;
  todoCountEl.textContent = total ? `${done}/${total} done` : '';
}

/* ---- Escape HTML to prevent XSS ---- */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---- Add ---- */
function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;

  todos.push({ id: uid(), text, done: false });
  saveTodos();
  renderTodos();
  todoInput.value = '';
  todoInput.focus();
}

todoAddBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

/* ---- Delegated events (toggle / edit / delete) ---- */
todoListEl.addEventListener('click', e => {
  const item = e.target.closest('.todo-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.matches('.todo-checkbox')) {
    const todo = todos.find(t => t.id === id);
    if (todo) { todo.done = !todo.done; saveTodos(); renderTodos(); }
    return;
  }

  if (e.target.matches('.btn-edit')) {
    openEditModal(id);
    return;
  }

  if (e.target.matches('.btn-delete')) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
    return;
  }
});

/* ---- Edit modal ---- */
function openEditModal(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  editingId = id;
  editInput.value = todo.text;
  editModal.classList.remove('hidden');
  editInput.focus();
  editInput.select();
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editingId = null;
}

editSaveBtn.addEventListener('click', () => {
  const text = editInput.value.trim();
  if (!text || !editingId) return;
  const todo = todos.find(t => t.id === editingId);
  if (todo) { todo.text = text; saveTodos(); renderTodos(); }
  closeEditModal();
});

editCancelBtn.addEventListener('click', closeEditModal);

editInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  editSaveBtn.click();
  if (e.key === 'Escape') closeEditModal();
});

// Close modal on backdrop click
editModal.addEventListener('click', e => {
  if (e.target === editModal) closeEditModal();
});

/* ---- Clear done ---- */
clearDoneBtn.addEventListener('click', () => {
  todos = todos.filter(t => !t.done);
  saveTodos();
  renderTodos();
});

// Initial render
renderTodos();


/* ─────────────────────────────────────────────
   3. FOCUS TIMER (Pomodoro 25-min)
───────────────────────────────────────────── */
const TIMER_DURATION = 25 * 60; // seconds
const CIRCUMFERENCE  = 2 * Math.PI * 52; // ≈ 326.7

const timerDisplay      = document.getElementById('timer-display');
const timerStartBtn     = document.getElementById('timer-start-btn');
const timerStopBtn      = document.getElementById('timer-stop-btn');
const timerResetBtn     = document.getElementById('timer-reset-btn');
const timerRingFill     = document.getElementById('timer-ring-fill');
const timerSessionLabel = document.getElementById('timer-session-label');

let timerInterval   = null;
let timeRemaining   = TIMER_DURATION;
let timerRunning    = false;

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerRing() {
  const progress = timeRemaining / TIMER_DURATION;
  const offset   = CIRCUMFERENCE * (1 - progress);
  timerRingFill.style.strokeDashoffset = offset;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timeRemaining);
  updateTimerRing();

  if (timeRemaining === 0) {
    timerRingFill.classList.add('finished');
    timerSessionLabel.textContent = '✅ Session complete!';
  } else {
    timerRingFill.classList.remove('finished');
    timerSessionLabel.textContent = timerRunning ? 'Focus Session' : 'Ready';
  }
}

function startTimer() {
  if (timerRunning) return;
  if (timeRemaining === 0) return; // finished — must reset first

  timerRunning = true;
  timerStartBtn.disabled = true;
  timerStopBtn.disabled  = false;
  timerSessionLabel.textContent = 'Focus Session';

  timerInterval = setInterval(() => {
    timeRemaining--;
    renderTimer();

    if (timeRemaining === 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerStartBtn.disabled = false;
      timerStopBtn.disabled  = true;
      notifyTimerDone();
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerStartBtn.disabled = false;
  timerStopBtn.disabled  = true;
  timerSessionLabel.textContent = 'Paused';
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning    = false;
  timeRemaining   = TIMER_DURATION;
  timerStartBtn.disabled = false;
  timerStopBtn.disabled  = true;
  timerSessionLabel.textContent = 'Ready';
  timerRingFill.classList.remove('finished');
  renderTimer();
}

function notifyTimerDone() {
  // Browser notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus Timer', { body: '25-minute session complete! Take a break. 🎉' });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification('Focus Timer', { body: '25-minute session complete! Take a break. 🎉' });
      }
    });
  }
}

timerStartBtn.addEventListener('click', startTimer);
timerStopBtn.addEventListener('click',  stopTimer);
timerResetBtn.addEventListener('click', resetTimer);

// Initial render
renderTimer();


/* ─────────────────────────────────────────────
   4. QUICK LINKS
───────────────────────────────────────────── */
const LINKS_KEY = 'lifedash_links';

let links = loadLinks();

const linkNameInput = document.getElementById('link-name-input');
const linkUrlInput  = document.getElementById('link-url-input');
const linkAddBtn    = document.getElementById('link-add-btn');
const linksGrid     = document.getElementById('links-grid');

function loadLinks() {
  try {
    return JSON.parse(localStorage.getItem(LINKS_KEY)) || getDefaultLinks();
  } catch {
    return getDefaultLinks();
  }
}

function getDefaultLinks() {
  return [
    { id: uid(), name: 'Google',    url: 'https://www.google.com' },
    { id: uid(), name: 'YouTube',   url: 'https://www.youtube.com' },
    { id: uid(), name: 'GitHub',    url: 'https://www.github.com' },
    { id: uid(), name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  ];
}

function saveLinks() {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

function renderLinks() {
  linksGrid.innerHTML = '';

  if (links.length === 0) {
    linksGrid.innerHTML = '<p class="empty-state">No links yet. Add one above!</p>';
    return;
  }

  links.forEach(link => {
    const chip = document.createElement('div');
    chip.className = 'link-chip';
    chip.dataset.id = link.id;

    // Favicon
    let faviconUrl = '';
    try {
      const origin = new URL(link.url).origin;
      faviconUrl = `${origin}/favicon.ico`;
    } catch { /* ignore invalid URLs */ }

    chip.innerHTML = `
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"
         title="${escapeHtml(link.url)}">
        ${faviconUrl ? `<img src="${escapeHtml(faviconUrl)}" alt="" class="link-favicon"
             width="14" height="14"
             style="vertical-align:middle;margin-right:5px;border-radius:3px;"
             onerror="this.style.display='none'" />` : ''}${escapeHtml(link.name)}
      </a>
      <button class="btn-delete-link" aria-label="Delete link" title="Delete">✕</button>
    `;
    linksGrid.appendChild(chip);
  });
}

function addLink() {
  const name = linkNameInput.value.trim();
  const raw  = linkUrlInput.value.trim();
  if (!name || !raw) return;

  // Prepend https:// if no scheme provided
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  // Basic URL validation
  try { new URL(url); } catch {
    linkUrlInput.style.borderColor = 'var(--danger)';
    setTimeout(() => { linkUrlInput.style.borderColor = ''; }, 1500);
    return;
  }

  links.push({ id: uid(), name, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

linkAddBtn.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });
linkNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

// Delegated delete
linksGrid.addEventListener('click', e => {
  if (!e.target.matches('.btn-delete-link')) return;
  const chip = e.target.closest('.link-chip');
  if (!chip) return;
  links = links.filter(l => l.id !== chip.dataset.id);
  saveLinks();
  renderLinks();
});

// Initial render
renderLinks();
