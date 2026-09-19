/* Full JS logic: login, admin, windows, nebulo, iframe apps, jumpscare */

let currentUser = null;
let unsaved = true;

const STORAGE_USERS = "nebulo_users";
const STORAGE_CURRENT = "nebulo_current";
const STORAGE_BANNED = "nebulo_banned";
const STORAGE_APPS = "nebulo_apps";
const STORAGE_WALLPAPER = "nebulo_wallpaper";

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* AUTH */
const authOverlay = document.getElementById("auth-overlay");
const authTabs = document.querySelectorAll(".auth-tab");
const authUsername = document.getElementById("auth-username");
const authPassword = document.getElementById("auth-password");
const authSubmit = document.getElementById("auth-submit");
const authCancel = document.getElementById("auth-cancel");
const authError = document.getElementById("auth-error");

let authMode = "login";

authTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    authTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    authMode = tab.dataset.mode;
  });
});

authSubmit.addEventListener("click", () => {
  const u = authUsername.value.trim();
  const p = authPassword.value;

  if (!u || !p) {
    authError.textContent = "Enter both fields.";
    return;
  }

  const banned = load(STORAGE_BANNED, []);
  if (banned.includes(u)) {
    authError.textContent = "You are banned.";
    return;
  }

  let users = load(STORAGE_USERS, []);

  if (authMode === "signup") {
    if (users.find(x => x.username === u)) {
      authError.textContent = "User exists.";
      return;
    }
    users.push({ username: u, password: p });
    save(STORAGE_USERS, users);
    currentUser = { username: u, password: p };
  } else {
    const user = users.find(x => x.username === u && x.password === p);
    if (!user) {
      authError.textContent = "Invalid login.";
      return;
    }
    currentUser = user;
  }

  save(STORAGE_CURRENT, currentUser);
  authOverlay.style.display = "none";
  updateUserUI();
});

authCancel.addEventListener("click", () => {
  currentUser = { username: "Guest", password: "" };
  save(STORAGE_CURRENT, currentUser);
  authOverlay.style.display = "none";
  updateUserUI();
});

/* USER UI */
function updateUserUI() {
  document.getElementById("topbar-user-label").textContent = currentUser.username;

  const adminItem = document.getElementById("settings-admin-item");
  adminItem.style.display = currentUser.username === "minh" ? "block" : "none";

  renderAdminUsers();
  renderDynamicApps();
}

/* WINDOWS */
function bringToFront(win) {
  let max = 10;
  document.querySelectorAll(".window").forEach(w => {
    const z = parseInt(w.style.zIndex || "10");
    if (z > max) max = z;
  });
  win.style.zIndex = max + 1;
}

function initWindow(win) {
  const header = win.querySelector(".window-header");
  let drag = false, ox = 0, oy = 0;

  header.addEventListener("mousedown", e => {
    drag = true;
    bringToFront(win);
    const r = win.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
  });

  window.addEventListener("mousemove", e => {
    if (!drag) return;
    win.style.left = e.clientX - ox + "px";
    win.style.top = e.clientY - oy + "px";
  });

  window.addEventListener("mouseup", () => drag = false);

  header.querySelectorAll(".win-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const a = btn.dataset.action;
      if (a === "close") win.classList.add("hidden");
      if (a === "minimize") win.classList.add("hidden");
      if (a === "fullscreen") win.classList.toggle("fullscreen");
    });
  });
}

document.querySelectorAll(".window").forEach(initWindow);

/* Dock */
document.querySelectorAll(".dock-icon").forEach(icon => {
  icon.addEventListener("click", () => {
    const id = icon.dataset.open;
    const win = document.getElementById(id);
    win.classList.remove("hidden");
    bringToFront(win);
  });
});

/* SETTINGS */
const wallpaperSelect = document.getElementById("settings-wallpaper-select");
const wallpaperDiv = document.getElementById("wallpaper");

function applyWallpaper(v) {
  const map = {
    default: "radial-gradient(circle at top, #1b1f3b, #05060a 60%, #000)",
    blue: "radial-gradient(circle at top, #1f3b6f, #05060a 60%, #000)",
    sunset: "linear-gradient(135deg, #ff9f0a, #ff375f, #0a84ff)",
    mono: "radial-gradient(circle at top, #333, #000)"
  };
  wallpaperDiv.style.background = map[v];
  save(STORAGE_WALLPAPER, v);
}

wallpaperSelect.addEventListener("change", e => applyWallpaper(e.target.value));

const savedWP = load(STORAGE_WALLPAPER, "default");
wallpaperSelect.value = savedWP;
applyWallpaper(savedWP);

/* Password change */
document.getElementById("settings-save-password").addEventListener("click", () => {
  if (currentUser.username === "Guest") return alert("Guest cannot change password.");
  const np = document.getElementById("settings-new-password").value;
  if (!np) return;
  let users = load(STORAGE_USERS, []);
  const idx = users.findIndex(x => x.username === currentUser.username);
  if (idx >= 0) {
    users[idx].password = np;
    save(STORAGE_USERS, users);
    currentUser.password = np;
    save(STORAGE_CURRENT, currentUser);
    alert("Password updated.");
  }
});

/* ADMIN PANEL */
function renderAdminUsers() {
  const container = document.getElementById("admin-users-list");
  if (!container) return;

  const users = load(STORAGE_USERS, []);
  const banned = load(STORAGE_BANNED, []);

  container.innerHTML = "";

  users.forEach(u => {
    const row = document.createElement("div");
    row.className = "admin-user-row";

    const left = document.createElement("span");
    left.textContent = u.username + (u.username === "minh" ? " (admin)" : "");

    const right = document.createElement("div");
    const banBtn = document.createElement("button");
    banBtn.textContent = banned.includes(u.username) ? "Unban" : "Ban";
    banBtn.classList.add("ban");

    banBtn.addEventListener("click", () => {
      if (currentUser.username !== "minh") return;
      let list = load(STORAGE_BANNED, []);
      if (list.includes(u.username)) {
        list = list.filter(x => x !== u.username);
      } else {
        list.push(u.username);
      }
      save(STORAGE_BANNED, list);
      renderAdminUsers();
    });

    right.appendChild(banBtn);
    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });
}

/* Jumpscare */
document.getElementById("admin-jumpscare-btn").addEventListener("click", () => {
  if (currentUser.username !== "minh") return;
  const overlay = document.getElementById("jumpscare-overlay");
  overlay.style.display = "flex";
  setTimeout(() => overlay.style.display = "none", 2500);
});

/* Create iframe apps */
document.getElementById("admin-create-app-btn").addEventListener("click", () => {
  if (currentUser.username !== "minh") return;

  const name = document.getElementById("admin-app-name").value.trim();
  const url = document.getElementById("admin-app-url").value.trim();
  if (!name || !url) return alert("Enter both fields.");

  const apps = load(STORAGE_APPS, []);
  apps.push({ id: "app-" + Date.now(), name, url });
  save(STORAGE_APPS, apps);

  renderDynamicApps();
});

/* Dynamic apps */
function renderDynamicApps() {
  const apps = load(STORAGE_APPS, []);
  const dock = document.getElementById("dock");
  const dynamicWindows = document.getElementById("dynamic-windows");

  dock.querySelectorAll(".dock-icon[data-app]").forEach(el => el.remove());
  dynamicWindows.innerHTML = "";

  apps.forEach(app => {
    const icon = document.createElement("div");
    icon.className = "dock-icon";
    icon.dataset.open = app.id;
    icon.dataset.app = app.id;
    icon.innerHTML = `<span>${app.name}</span>`;
    dock.appendChild(icon);

    const win = document.createElement("div");
    win.className = "window hidden";
    win.id = app.id;
    win.style.top = "140px";
    win.style.left = "220px";
    win.style.width = "640px";
    win.style.height = "420px";

    win.innerHTML = `
      <div class="window-header" data-win="${app.id}">
        <div class="window-controls">
          <div class="win-btn win-close" data-action="close"></div>
          <div class="win-btn win-min" data-action="minimize"></div>
          <div class="win-btn win-full" data-action="fullscreen"></div>
        </div>
        <div class="window-title">${app.name}</div>
      </div>
      <div class="window-body">
        <iframe src="${app.url}" style="width:100%;height:100%;border:none;border-radius:12px;"></iframe>
      </div>
    `;

    dynamicWindows.appendChild(win);
    initWindow(win);

    icon.addEventListener("click", () => {
      win.classList.remove("hidden");
      bringToFront(win);
    });
  });
}

/* Nebulo links */
const nebuloLinks = [
  "https://class.matheusarruda.com/",
  "https://english.matheusarruda.com/",
  "https://robotics.robohub.ro/",
  "https://stem.robohub.ro/",
  "https://hat.senegocia.cl/",
  "https://tool.doriswel.com/",
  "https://bull.yarnowl.com/",
  "https://fivefour.samirajoshi.com.np/",
  "https://job.joseulloa.cl/",
  "https://stan.confiarriendo.cl/",
  "https://ring.carluciocruzfotografia.com.br/",
  "https://bang.7dejunio.com.ar/",
  "https://student-7314.lllogan.website/",
  "https://learning-7707.lllogan.website/",
  "https://bio.pyroelectric.net/",
  "https://cat.pyroelectric.net/",
  "https://cord.pyroelectric.net/",
  "https://jobs.pyroelectric.net/",
  "https://notes.pyroelectric.net/",
  "https://pray.bck.gr/",
  "https://batch.doriswel.com/",
  "https://books.letlink.hk/",
  "https://edu.letlink.hk/",
  "https://2whm.whm.whm.5032qkkiiupdate.cfggndghtm.casacam.net/",
  "http://2whm.whm.whm.dev.qkkiiupdate.cfggndghtm.casacam.net/",
  "https://kidsthesedaysbro.arxeiokin.gr/",
  "https://nomorefortnige.bisblick.org/",
  "https://weneedmorefhangbisbfo.camberleycricket.com/",
  "https://chasingrurdreamsisgoodmn.chasingsimplicity.co.uk/",
  "https://meisangeymad.pnlbraila.ro/",
  "https://ladiesladiesladiescalmdownbrochaho.revitcity.com/",
  "https://getajoberlol.pcrage2000.com/",
  "https://ineedthistobesecurelyplsbro.greatgiftlists.com/",
  "https://oknomoreonalittlebit.pyesetz.net/",
  "https://lockinchatlockin.bienaldeescuch.a/",
  "https://sites.google.com/view/advancedcalculator2/home",
  "https://nebulo-17133372.codehs.me/index.html",
  "https://testinga.mooo.com",
  "https://testing.farted.net",
  "http://booger.riteshp.com.np/",
  "https://pjschool.hana.web.id/",
  "https://historyabc.markscully.com/",
  "https://worldwar.pal-wars.com/",
  "https://terabyte.pixel.notcrawcraw.net/",
  "https://graphics.rendering.ptanatidae.com/",
  "https://animation.database.iuzhen.com/",
  "https://sync.repository.satusatumedia.com/",
  "https://documentation.tutorial.stevesien.com/"
];

function renderNebuloLinks() {
  const list = document.getElementById("nebulo-list");
  list.innerHTML = "";

  nebuloLinks.forEach((url, i) => {
    const row = document.createElement("div");
    row.className = "nebulo-link-row";
    row.textContent = `${i + 1}. ${url}`;
    row.addEventListener("click", () => {
      document.getElementById("nebulo-iframe").src = url;
      document.getElementById("nebulo-current-url").textContent = url;
      unsaved = true;
      document.getElementById("unsaved-banner").style.display = "block";
    });
    list.appendChild(row);
  });
}

/* Clock */
function updateClock() {
  const el = document.getElementById("taskbar-clock");
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

/* Unsaved work warning */
window.addEventListener("beforeunload", e => {
  if (!unsaved) return;
  e.preventDefault();
  e.returnValue = "You have unsaved work.";
});

/* INIT */
function init() {
  const savedUser = load(STORAGE_CURRENT, null);
  if (savedUser) {
    currentUser = savedUser;
    authOverlay.style.display = "none";
  }
  updateUserUI();
  renderNebuloLinks();
  renderDynamicApps();
}

init();