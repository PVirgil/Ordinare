const STORAGE_KEY = "everything-os-v1";
const THEME_KEY = "everything-os-theme";

const seed = {
  spaces: [
    { id: "personal", name: "Personal", color: "#7c3aed" },
    { id: "work", name: "Work", color: "#2563eb" },
    { id: "home", name: "Home", color: "#059669" },
    { id: "finance", name: "Finance", color: "#d97706" }
  ],
  items: [],
  people: []
};

let state = loadState();
let currentView = "today";
let selectedType = "task";

const els = {
  content: document.getElementById("content"),
  viewTitle: document.getElementById("viewTitle"),
  viewEyebrow: document.getElementById("viewEyebrow"),
  overlay: document.getElementById("overlay"),
  commandPanel: document.getElementById("commandPanel"),
  commandInput: document.getElementById("commandInput"),
  itemModal: document.getElementById("itemModal"),
  itemForm: document.getElementById("itemForm"),
  itemTitle: document.getElementById("itemTitle"),
  itemDetails: document.getElementById("itemDetails"),
  itemSpace: document.getElementById("itemSpace"),
  itemDate: document.getElementById("itemDate"),
  typeGrid: document.getElementById("typeGrid"),
  spacesList: document.getElementById("spacesList"),
  inboxCount: document.getElementById("inboxCount"),
  sidebar: document.getElementById("sidebar"),
  toast: document.getElementById("toast")
};

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const loaded = saved ? JSON.parse(saved) : structuredClone(seed);
    if (!Array.isArray(loaded.people)) loaded.people = [];
    return loaded;
  } catch {
    const fresh = structuredClone(seed);
    fresh.people = [];
    return fresh;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateNavCounts();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function spaceName(id) {
  return state.spaces.find(s => s.id === id)?.name || "Inbox";
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function renderSpaces() {
  els.spacesList.innerHTML = state.spaces.map(space => `
    <button class="nav-item" data-space="${space.id}">
      <span class="space-dot" style="--space-color:${space.color}"></span>
      <span>${escapeHtml(space.name)}</span>
    </button>
  `).join("");

  els.itemSpace.innerHTML = `
    <option value="">Inbox</option>
    ${state.spaces.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}
  `;

  document.querySelectorAll("[data-space]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      renderSpace(btn.dataset.space);
      closeSidebarAfterNavigation();
    });
  });
}

function updateNavCounts() {
  const count = state.items.filter(item => !item.space).length;
  els.inboxCount.textContent = count;
}

function setView(title, eyebrow = "ORGANIZE") {
  els.viewTitle.textContent = title;
  els.viewEyebrow.textContent = eyebrow;
  document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  });
  if (window.innerWidth <= 760) {
    els.sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
  }
}

function itemRow(item) {
  const isTask = item.type === "task";
  return `
    <div class="item-row" data-id="${item.id}">
      ${isTask
        ? `<button class="check ${item.done ? "done" : ""}" data-action="toggle" aria-label="Toggle task">${item.done ? "✓" : "•"}</button>`
        : `<span class="badge type-badge">${escapeHtml(item.type)}</span>`}
      <div class="item-copy">
        <strong style="${item.done ? "text-decoration:line-through;opacity:.55" : ""}">${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.details || "No extra details")}</p>
      </div>
      <div class="item-meta">
        ${item.date ? `<span class="badge">${formatDate(item.date)}</span>` : ""}
        ${item.space ? `<span class="badge">${escapeHtml(spaceName(item.space))}</span>` : ""}
        <button class="delete-btn" data-action="delete" aria-label="Delete">✕</button>
      </div>
    </div>
  `;
}

function renderToday() {
  currentView = "today";
  setView("Today", "YOUR DAY");

  const today = getToday();
  const activeTasks = state.items.filter(i => i.type === "task" && !i.done);
  const todayItems = state.items.filter(i => i.date === today);
  const events = state.items.filter(i => i.type === "event").slice(0, 4);
  const projects = state.items.filter(i => i.type === "project");
  const completed = state.items.filter(i => i.type === "task" && i.done).length;
  const totalTasks = state.items.filter(i => i.type === "task").length || 1;
  const score = Math.max(35, Math.round(100 - activeTasks.length * 7 + completed * 10));

  const now = new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const dateText = now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  els.content.innerHTML = `
    <div class="hero">
      <section class="hero-main">
        <p class="eyebrow">EVERYTHING, IN ONE PLACE</p>
        <h2>Good ${getDayPart()}. What matters most today?</h2>
        <p>Capture anything, connect it to the right part of your life, and keep your next actions visible without bouncing between apps.</p>
        <button class="hero-command" id="heroCommand">
          <span>✦</span>
          <span>What do you want to remember, organize, or do?</span>
          <kbd>⌘ K</kbd>
        </button>
      </section>

      <aside class="hero-side">
        <div class="date-block">
          <div class="weekday">${weekday}</div>
          <div class="date">${dateText}</div>
        </div>
        <div class="score">
          <div class="score-ring" style="--score:${score}%"><strong>${score}</strong></div>
          <div class="score-copy">
            <strong>Daily clarity</strong><br />
            <small>${activeTasks.length} active tasks · ${todayItems.length} due today</small>
          </div>
        </div>
      </aside>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><span class="stat-label">Open tasks</span><strong>${activeTasks.length}</strong><small>Across all spaces</small></div>
      <div class="stat-card"><span class="stat-label">Due today</span><strong>${todayItems.length}</strong><small>Tasks & events</small></div>
      <div class="stat-card"><span class="stat-label">Projects</span><strong>${projects.length}</strong><small>Currently tracked</small></div>
      <div class="stat-card"><span class="stat-label">Saved items</span><strong>${state.items.length}</strong><small>Your searchable library</small></div>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <div><h3>Priority queue</h3><p>Things that deserve attention soon</p></div>
          <button class="link-btn" data-jump="inbox">Open inbox</button>
        </div>
        <div class="item-list">
          ${(activeTasks.slice(0, 6).map(itemRow).join("")) || emptyState("No open tasks", "Add one and it will appear here.")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div><h3>Upcoming</h3><p>Events and dated items</p></div>
        </div>
        <div class="timeline">
          ${events.length ? events.map(e => `
            <div class="timeline-item">
              <div class="timeline-time">${formatDate(e.date) || "Soon"}</div>
              <div class="timeline-card">
                <strong>${escapeHtml(e.title)}</strong>
                <p>${escapeHtml(e.details || spaceName(e.space))}</p>
              </div>
            </div>
          `).join("") : emptyState("Nothing scheduled", "Add an event to your calendar.")}
        </div>
      </section>
    </div>
  `;

  document.getElementById("heroCommand")?.addEventListener("click",()=>{els.sidebar.classList.remove("open");document.body.classList.remove("sidebar-open");els.overlay.classList.add("hidden");openCommand();});
  bindItemActions();
  document.querySelector("[data-jump='inbox']")?.addEventListener("click", renderInbox);
}

function renderInbox() {
  currentView = "inbox";
  setView("Inbox", "CAPTURE FIRST");
  renderCollection(
    "Inbox",
    "Unsorted items live here until you connect them to a space.",
    state.items.filter(i => !i.space)
  );
}

function renderLibrary() {
  currentView = "library";
  setView("Library", "SEARCHABLE MEMORY");
  renderCollection(
    "Library",
    "Notes, bookmarks, and saved information in one searchable place.",
    state.items.filter(i => ["note", "bookmark"].includes(i.type))
  );
}

function renderProjects() {
  currentView = "projects";
  setView("Projects", "OUTCOMES");
  const projects = state.items.filter(i => i.type === "project");
  els.content.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div><h3>Projects</h3><p>Multi-step outcomes you are actively moving forward.</p></div>
        <button class="primary-btn" id="addProjectBtn">＋ Add project</button>
      </div>
      <div class="view-grid">
        ${projects.length ? projects.map(p => `
          <article class="collection-card">
            <span class="badge">${escapeHtml(spaceName(p.space))}</span>
            <h3>${escapeHtml(p.title)}</h3>
            <p>${escapeHtml(p.details || "No project notes yet.")}</p>
            <div class="progress"><span style="width:${Math.min(100, p.progress || 20)}%"></span></div>
            <p style="margin-top:8px">${p.progress || 20}% organized</p>
          </article>
        `).join("") : emptyState("No projects yet", "Create a project to group related work.")}
      </div>
    </section>
  `;
  document.getElementById("addProjectBtn")?.addEventListener("click", () => openItemModal("project"));
}

function renderCalendar() {
  currentView = "calendar";
  setView("Calendar", "TIME");
  const dated = state.items.filter(i => i.date).sort((a,b) => a.date.localeCompare(b.date));
  renderCollection("Calendar", "Everything with a date, in one chronological view.", dated);
}

function renderPeople() {
  currentView = "people";
  setView("People", "RELATIONSHIPS");

  const people = state.people || [];
  els.content.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>People</h3>
          <p>Keep names, contact information, relationships, and notes together.</p>
        </div>
        <button class="primary-btn" id="addPersonBtn">＋ Add person</button>
      </div>

      <div class="people-grid">
        ${people.length ? people.map(person => `
          <article class="person-card" data-person-id="${person.id}">
            <div class="person-top">
              <div class="person-avatar">${escapeHtml(getInitials(person.name))}</div>
              <div class="person-heading">
                <h3>${escapeHtml(person.name)}</h3>
                <span class="badge type-badge">${escapeHtml(person.relationship || "Contact")}</span>
              </div>
              <button class="delete-btn person-delete" data-person-action="delete" aria-label="Delete person">✕</button>
            </div>
            <div class="person-details">
              ${person.phone ? `<div><span>Phone</span><a href="tel:${escapeHtml(person.phone)}">${escapeHtml(person.phone)}</a></div>` : ""}
              ${person.email ? `<div><span>Email</span><a href="mailto:${escapeHtml(person.email)}">${escapeHtml(person.email)}</a></div>` : ""}
              ${person.notes ? `<div class="person-notes"><span>Notes</span><p>${escapeHtml(person.notes)}</p></div>` : ""}
            </div>
          </article>
        `).join("") : `
          <div class="empty-state people-empty">
            <strong>No people added yet</strong>
            Add family, friends, coworkers, clients, or anyone else you want to remember.
          </div>
        `}
      </div>
    </section>

    <div class="inline-person-form hidden" id="personFormWrap">
      <form id="personForm">
        <div class="modal-head">
          <div>
            <p class="eyebrow">NEW CONTACT</p>
            <h2>Add a person</h2>
          </div>
          <button type="button" class="icon-btn" id="closePersonForm" aria-label="Close">×</button>
        </div>

        <label>
          Name
          <input id="personName" required placeholder="e.g. Jordan Smith" />
        </label>

        <div class="form-row">
          <label>
            Phone
            <input id="personPhone" type="tel" placeholder="(555) 123-4567" />
          </label>
          <label>
            Email
            <input id="personEmail" type="email" placeholder="jordan@example.com" />
          </label>
        </div>

        <label>
          Relationship
          <input id="personRelationship" placeholder="Friend, sibling, coworker, client..." />
        </label>

        <label>
          Notes
          <textarea id="personNotes" rows="3" placeholder="Birthday, how you met, things to remember..."></textarea>
        </label>

        <div class="modal-actions">
          <button type="button" class="secondary-btn" id="cancelPerson">Cancel</button>
          <button type="submit" class="primary-btn">Save person</button>
        </div>
      </form>
    </div>
  `;

  const wrap = document.getElementById("personFormWrap");
  const openForm = () => {
    wrap.classList.remove("hidden");
    setTimeout(() => document.getElementById("personName")?.focus(), 30);
  };
  const closeForm = () => wrap.classList.add("hidden");

  document.getElementById("addPersonBtn")?.addEventListener("click", openForm);
  document.getElementById("closePersonForm")?.addEventListener("click", closeForm);
  document.getElementById("cancelPerson")?.addEventListener("click", closeForm);

  document.getElementById("personForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("personName").value.trim();
    if (!name) return;

    state.people.unshift({
      id: crypto.randomUUID(),
      name,
      phone: document.getElementById("personPhone").value.trim(),
      email: document.getElementById("personEmail").value.trim(),
      relationship: document.getElementById("personRelationship").value.trim(),
      notes: document.getElementById("personNotes").value.trim(),
      createdAt: Date.now()
    });

    saveState();
    renderPeople();
    showToast("Person added");
  });

  document.querySelectorAll("[data-person-action='delete']").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest("[data-person-id]");
      if (!card) return;
      state.people = state.people.filter(person => person.id !== card.dataset.personId);
      saveState();
      renderPeople();
      showToast("Person removed");
    });
  });
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0] || "")
    .join("")
    .toUpperCase() || "?";
}

function renderGoals() {
  currentView = "goals";
  setView("Goals", "DIRECTION");
  const goals = state.items.filter(i => i.type === "goal");
  renderCollection("Goals", "Long-term outcomes connected to the work that advances them.", goals);
}

function renderCollection(title, subtitle, items) {
  els.content.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div>
        <button class="primary-btn" id="collectionAddBtn">＋ Add</button>
      </div>
      <div class="item-list">
        ${items.length ? items.map(itemRow).join("") : emptyState(`No ${title.toLowerCase()} items`, "Use New item to add something.")}
      </div>
    </section>
  `;
  bindItemActions();
  document.getElementById("collectionAddBtn")?.addEventListener("click", () => openItemModal());
}

function renderSpace(spaceId) {
  const space = state.spaces.find(s => s.id === spaceId);
  if (!space) return;
  currentView = `space:${spaceId}`;
  els.viewTitle.textContent = space.name;
  els.viewEyebrow.textContent = "SPACE";
  document.querySelectorAll(".nav-item[data-view]").forEach(btn => btn.classList.remove("active"));
  renderCollection(space.name, `Everything connected to your ${space.name.toLowerCase()} space.`, state.items.filter(i => i.space === spaceId));
  if (window.innerWidth <= 760) {
    els.sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
  }
}

function emptyState(title, text) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div>`;
}

function getDayPart() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function bindItemActions() {
  document.querySelectorAll(".item-row").forEach(row => {
    row.querySelector("[data-action='toggle']")?.addEventListener("click", () => {
      const item = state.items.find(i => i.id === row.dataset.id);
      if (!item) return;
      item.done = !item.done;
      saveState();
      renderCurrent();
    });
    row.querySelector("[data-action='delete']")?.addEventListener("click", () => {
      state.items = state.items.filter(i => i.id !== row.dataset.id);
      saveState();
      renderCurrent();
      showToast("Item deleted");
    });
  });
}


function closeSidebarAfterNavigation() {
  els.sidebar.classList.remove("open");
  document.body.classList.remove("sidebar-open");

  if (
    els.commandPanel.classList.contains("hidden") &&
    els.itemModal.classList.contains("hidden")
  ) {
    els.overlay.classList.add("hidden");
  }
}

function renderCurrent() {
  if (currentView.startsWith("space:")) return renderSpace(currentView.split(":")[1]);
  ({
    today: renderToday,
    inbox: renderInbox,
    projects: renderProjects,
    calendar: renderCalendar,
    library: renderLibrary,
    people: renderPeople,
    goals: renderGoals
  }[currentView] || renderToday)();
}

function openCommand() {
  els.overlay.classList.remove("hidden");
  els.commandPanel.classList.remove("hidden");
  els.commandInput.value = "";
  setTimeout(() => els.commandInput.focus(), 30);
}

function closeCommand() {
  els.commandPanel.classList.add("hidden");
  if (els.itemModal.classList.contains("hidden")) els.overlay.classList.add("hidden");
}

function interpretCommand(raw) {
  const text = raw.trim();
  if (!text) return;
  const lower = text.toLowerCase();

  let type = "task";
  let title = text;

  if (lower.startsWith("add project:")) {
    type = "project";
    title = text.split(":").slice(1).join(":").trim();
  } else if (lower.startsWith("save note:")) {
    type = "note";
    title = text.split(":").slice(1).join(":").trim();
  } else if (lower.includes("remind me")) {
    type = "task";
    title = text.replace(/remind me to/i, "").trim();
  } else if (lower.startsWith("goal:")) {
    type = "goal";
    title = text.split(":").slice(1).join(":").trim();
  }

  let date = "";
  if (lower.includes("today")) date = getToday();
  if (lower.includes("tomorrow")) date = addDays(1);
  if (lower.includes("friday")) {
    const d = new Date();
    const delta = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + delta);
    date = d.toISOString().slice(0,10);
  }

  state.items.unshift({
    id: crypto.randomUUID(),
    type,
    title: title || "Untitled",
    details: "Captured with the command bar.",
    space: "",
    date,
    done: false,
    progress: type === "project" ? 10 : undefined,
    createdAt: Date.now()
  });

  saveState();
  closeCommand();
  renderInbox();
  showToast(`${type[0].toUpperCase() + type.slice(1)} added`);
}



function syncDateWidthToSpace() {
  const space = document.getElementById("itemSpace");
  const date = document.getElementById("itemDate");
  if (!space || !date) return;

  if (window.matchMedia("(max-width: 1300px)").matches) {
    const spaceWidth = space.getBoundingClientRect().width;
    if (spaceWidth > 0) {
      date.style.width = `${spaceWidth}px`;
      date.style.maxWidth = `${spaceWidth}px`;
      date.style.minWidth = `${spaceWidth}px`;
    }
  } else {
    date.style.width = "";
    date.style.maxWidth = "";
    date.style.minWidth = "";
  }
}

function syncSpaceHeightToDate() {
  const space = document.getElementById("itemSpace");
  const date = document.getElementById("itemDate");
  if (!space || !date) return;

  if (window.matchMedia("(max-width: 1300px)").matches) {
    const dateHeight = date.getBoundingClientRect().height;
    if (dateHeight > 0) {
      space.style.height = `${dateHeight}px`;
      space.style.minHeight = `${dateHeight}px`;
    }
  } else {
    space.style.height = "";
    space.style.minHeight = "";
  }
}

function openItemModal(type = "task") {
  selectedType = type;
  els.overlay.classList.remove("hidden");
  els.itemModal.classList.remove("hidden");
  els.itemForm.reset();
  els.itemDate.value = "";
  updateTypeChips();
  requestAnimationFrame(() => { syncSpaceHeightToDate(); syncDateWidthToSpace(); });
  setTimeout(() => {
    syncSpaceHeightToDate();
    syncDateWidthToSpace();
    els.itemTitle.focus();
  }, 30);
}

function closeItemModal() {
  els.itemModal.classList.add("hidden");
  if (els.commandPanel.classList.contains("hidden")) els.overlay.classList.add("hidden");
}

function updateTypeChips() {
  els.typeGrid.querySelectorAll("[data-type]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === selectedType);
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add("hidden"), 2200);
}

document.querySelectorAll(".nav-item[data-view], .brand").forEach(btn => {
  btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    const view = btn.dataset.view || "today";
    const fn = {
      today: renderToday,
      inbox: renderInbox,
      projects: renderProjects,
      calendar: renderCalendar,
      library: renderLibrary,
      people: renderPeople,
      goals: renderGoals
    }[view];

    if (fn) {
      fn();
      closeSidebarAfterNavigation();
    }
  });
});

document.getElementById("newItemBtn").addEventListener("click", () => {
  els.sidebar.classList.remove("open");
  document.body.classList.remove("sidebar-open");
  els.overlay.classList.add("hidden");
  openItemModal();
});
document.getElementById("searchBtn").addEventListener("click", () => {
  els.sidebar.classList.remove("open");
  document.body.classList.remove("sidebar-open");
  els.overlay.classList.add("hidden");
  openCommand();
});
document.getElementById("closeCommand").addEventListener("click", closeCommand);
document.getElementById("closeItemModal").addEventListener("click", closeItemModal);
document.getElementById("cancelItem").addEventListener("click", closeItemModal);

els.overlay.addEventListener("click", () => {
  closeCommand();
  closeItemModal();
  closeSidebarAfterNavigation();
});

els.typeGrid.querySelectorAll("[data-type]").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedType = btn.dataset.type;
    updateTypeChips();
  });
});

els.itemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.items.unshift({
    id: crypto.randomUUID(),
    type: selectedType,
    title: els.itemTitle.value.trim(),
    details: els.itemDetails.value.trim(),
    space: els.itemSpace.value,
    date: els.itemDate.value,
    done: false,
    progress: selectedType === "project" ? 10 : undefined,
    createdAt: Date.now()
  });
  saveState();
  closeItemModal();
  renderCurrent();
  showToast("Saved to Everything OS");
});

els.commandInput.addEventListener("keydown", e => {
  if (e.key === "Enter") interpretCommand(els.commandInput.value);
});

document.querySelectorAll("[data-suggestion]").forEach(btn => {
  btn.addEventListener("click", () => {
    els.commandInput.value = btn.dataset.suggestion;
    interpretCommand(btn.dataset.suggestion);
  });
});

document.getElementById("menuBtn").addEventListener("click", () => {
  els.sidebar.classList.add("open");
  document.body.classList.add("sidebar-open");
  els.overlay.classList.remove("hidden");
});

document.getElementById("closeSidebar").addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  closeSidebarAfterNavigation();
});

document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
});

document.getElementById("addSpaceBtn").addEventListener("click", () => {
  const name = prompt("Name this space:");
  if (!name?.trim()) return;
  const id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2,5);
  const palette = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#db2777", "#0891b2"];
  state.spaces.push({ id, name: name.trim(), color: palette[state.spaces.length % palette.length] });
  saveState();
  renderSpaces();
  showToast("Space created");
});

document.getElementById("settingsBtn").addEventListener("click", () => {
  const ok = confirm("Reset this local demo back to its starter data?");
  if (!ok) return;
  state = structuredClone(seed);
  saveState();
  renderSpaces();
  renderToday();
  showToast("Demo reset");
});

document.addEventListener("keydown", e => {
  const target = e.target;
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openCommand();
  } else if (!typing && e.key === "/") {
    e.preventDefault();
    openCommand();
  } else if (!typing && e.key.toLowerCase() === "n") {
    openItemModal();
  } else if (e.key === "Escape") {
    closeCommand();
    closeItemModal();
    els.sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
  }
});

if (localStorage.getItem(THEME_KEY) === "dark") {
  document.body.classList.add("dark");
}

renderSpaces();
updateNavCounts();
renderToday();

window.addEventListener("resize", syncSpaceHeightToDate);

window.addEventListener("resize", syncDateWidthToSpace);
