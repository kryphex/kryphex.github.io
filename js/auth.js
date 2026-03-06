const supabaseClient = supabase.createClient(
  "https://xvtnnszvfbirixppbdtl.supabase.co",
  "sb_publishable_pQJ3E0t7j34sImItSqxn6Q_jLBGuasq"
);

async function getCurrentUser() {
  const { data } = await supabaseClient.auth.getUser();
  return data?.user || null;
}

async function login(email, password) {
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  return error ? { success: false, message: error.message } : { success: true };
}

async function signup(email, password) {
  const { error } = await supabaseClient.auth.signUp({ email, password });
  return error ? { success: false, message: error.message } : { success: true };
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

async function protectPage(redirectPath = "/index.html") {
  initPwa();
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectPath;
  }
}

function applyStoredUserSettings(user) {
  if (!user || !user.id) return;

  let settings = {};
  try {
    const raw = localStorage.getItem(`kryphex_settings_${user.id}`);
    settings = raw ? JSON.parse(raw) : {};
  } catch {
    settings = {};
  }

  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) return;

  if (settings.language) {
    root.setAttribute("lang", settings.language);
  }

  const theme = settings.themePreference || "system";
  body.classList.remove("user-theme-light", "user-theme-dark");
  if (theme === "light") body.classList.add("user-theme-light");
  if (theme === "dark") body.classList.add("user-theme-dark");

  body.classList.toggle("density-compact", settings.uiDensity === "compact");
  body.classList.toggle("reduce-motion", !!settings.reduceMotion);
  body.classList.toggle("high-contrast", !!settings.highContrast);

  let fontScale = "16px";
  if (settings.fontScale === "large") fontScale = "17px";
  if (settings.fontScale === "x-large") fontScale = "18px";
  root.style.setProperty("--user-font-scale", fontScale);
}
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function handleInstallAppClick(buttonEl) {
  if (!buttonEl) return;
  buttonEl.disabled = true;
  const original = buttonEl.textContent;
  buttonEl.textContent = "Opening installer...";

  try {
    if (typeof window.kryphexPromptInstall === "function") {
      const result = await window.kryphexPromptInstall();
      if (result.ok && result.outcome === "accepted") {
        buttonEl.textContent = "App Installed";
        return;
      }
      if (result.ok) {
        buttonEl.textContent = "Install Cancelled";
        setTimeout(() => {
          buttonEl.disabled = false;
          buttonEl.textContent = original;
        }, 1200);
        return;
      }
    }
    buttonEl.textContent = "Install Guide";
    if (typeof window.kryphexShowInstallGuide === "function") {
      window.kryphexShowInstallGuide();
    }
    setTimeout(() => {
      buttonEl.disabled = false;
      buttonEl.textContent = original;
    }, 1200);
  } catch {
    buttonEl.textContent = "Install Failed";
    setTimeout(() => {
      buttonEl.disabled = false;
      buttonEl.textContent = original;
    }, 2200);
  }
}

async function updateAuthArea() {
  const authArea = document.getElementById("authArea");
  if (!authArea) return;

  initPwa();
  const user = await getCurrentUser();

  if (user) {
    const profileStoreKey = `kryphex_profile_${user.id}`;
    let localProfile = {};
    try {
      const raw = localStorage.getItem(profileStoreKey);
      localProfile = raw ? JSON.parse(raw) : {};
    } catch {
      localProfile = {};
    }
    const remoteMeta = user.user_metadata || {};

    const displayName = (remoteMeta.name || localProfile.name || user.email || "User").trim();
    const baseRole = (remoteMeta.role || localProfile.role || "Security Member").trim();
    const displayCompany = (remoteMeta.company || localProfile.company || "Kryphex").trim();
    const safeName = escapeHtml(displayName);
    const safeCompany = escapeHtml(displayCompany);
    const initials = (displayName.match(/\b\w/g) || [])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

    let isAdmin = false;
    try {
      const { data: profile, error: roleError } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!roleError) {
        const role = (profile?.role || "").toString().trim().toLowerCase();
        isAdmin = role === "admin";
      }
    } catch {
      isAdmin = false;
    }
    const displayRole = isAdmin ? "Founder/C.E.O" : baseRole;
    const safeRole = escapeHtml(displayRole);

    authArea.innerHTML = `
      <div class="auth-profile-menu" id="authProfileMenu">
        <button class="auth-profile-trigger" id="authProfileTrigger" type="button" aria-label="Open profile menu" aria-expanded="false">
          <span class="auth-avatar">${initials}</span>
          <span class="auth-identity">
            <strong>${safeName}</strong>
            <small>${safeCompany}</small>
          </span>
        </button>
        <div class="auth-dropdown" id="authDropdown">
          <div class="auth-dropdown-head">
            <div class="auth-avatar large">${initials}</div>
            <div>
              <p class="auth-name">${safeName}</p>
              <p class="auth-sub">${safeRole} | ${safeCompany}</p>
            </div>
          </div>
          <a href="/profile.html" class="auth-action">View Profile</a>
          <a href="/settings/account.html" class="auth-action">Settings</a>
          <button class="auth-action" id="installAppBtn" type="button">Install App</button>
          ${isAdmin ? '<a href="/tools/console.html" class="auth-action">Console</a>' : ""}
          <button class="auth-action danger" id="logoutBtn" type="button">Log Out</button>
        </div>
      </div>
    `;

    const menu = document.getElementById("authProfileMenu");
    const trigger = document.getElementById("authProfileTrigger");
    const dropdown = document.getElementById("authDropdown");
    const installAppBtn = document.getElementById("installAppBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (trigger && dropdown) {
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = dropdown.classList.toggle("open");
        trigger.setAttribute("aria-expanded", String(isOpen));
      });
    }

    document.addEventListener("click", (event) => {
      if (!menu || !dropdown || !trigger) return;
      if (menu.contains(event.target)) return;
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "/index.html";
      });
    }

    if (installAppBtn) {
      installAppBtn.addEventListener("click", async () => {
        await handleInstallAppClick(installAppBtn);
      });
    }
    return;
  }

  authArea.innerHTML = `
    <a href="/auth/login.html">Login</a>
    <a href="/auth/signup.html" class="btn-nav">Sign Up</a>
  `;
}

function injectAutoFooter() {
  const body = document.body;
  if (!body) return;
  const isElite = body.classList.contains("elite-ui");
  if (!isElite) return;
  const isAuthPage =
    body.classList.contains("page-auth-login") ||
    body.classList.contains("page-auth-signup") ||
    body.classList.contains("page-auth-console");
  if (isAuthPage) return;
  if (document.querySelector("footer")) return;

  const footer = document.createElement("footer");
  footer.className = "auto-footer";
  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-column">
        <h4>Kryphex</h4>
        <p>Enterprise-focused cybersecurity consultancy delivering structured risk mitigation and zero-trust architecture.</p>
      </div>
      <div class="footer-column">
        <h4>Contact</h4>
        <p>Email: contact.kryphex@gmail.com</p>
        <p>Business Inquiries: +91 8866553925</p>
      </div>
      <div class="footer-column">
        <h4>Quick Links</h4>
        <p><a href="/services.html">Services</a></p>
        <p><a href="/tools/">Tools</a></p>
        <p><a href="/consultation.html">Consultation</a></p>
      </div>
    </div>
    <div class="footer-bottom">© 2026 Kryphex. Enterprise Cybersecurity Solutions.</div>
  `;
  document.body.appendChild(footer);
}


function injectToolBackButton() {
  const path = (window.location.pathname || "").toLowerCase();
  if (!path.includes("/tools/")) return;
  if (path.endsWith("/tools/") || path.endsWith("/tools/index.html")) return;
  if (document.getElementById("toolExitBar")) return;

  const bar = document.createElement("section");
  bar.id = "toolExitBar";
  bar.className = "tool-exit-bar";
  bar.innerHTML = `
    <div class="container">
      <a class="btn-outline tool-exit-btn" href="index.html">Back to Tools</a>
    </div>
  `;

  const header = document.querySelector("header");
  if (header && header.parentNode) {
    header.insertAdjacentElement("afterend", bar);
  } else {
    document.body.prepend(bar);
  }
}


function initPwa() {
  if (!window.__kryphexPwaInit) {
    window.__kryphexPwaInit = true;
    let deferredInstallPrompt = null;
    let swRegistration = null;
    let didReloadFromControllerChange = false;

    window.kryphexCanInstall = function () {
      return !!deferredInstallPrompt;
    };

    window.kryphexPromptInstall = async function () {
      if (!deferredInstallPrompt) return { ok: false, reason: "unavailable" };
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      return { ok: true, outcome: choice && choice.outcome ? choice.outcome : "unknown" };
    };

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
    });

    function ensurePwaUi() {
      if (document.getElementById("kryphexPwaUiStyle")) return;
      const style = document.createElement("style");
      style.id = "kryphexPwaUiStyle";
      style.textContent = `
      .kryphex-install-modal {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 23, 0.55);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 5000;
        padding: 16px;
      }
      .kryphex-install-modal.open { display: flex; }
      .kryphex-install-card {
        width: min(560px, 100%);
        border: 1px solid #d7e3f6;
        border-radius: 18px;
        background: #f8fbff;
        box-shadow: 0 30px 60px rgba(15, 23, 42, 0.24);
        padding: 18px;
        color: #11295a;
      }
      .kryphex-install-card h3 { margin: 0 0 8px; font-size: 22px; }
      .kryphex-install-card p { margin: 0 0 12px; color: #405b84; }
      .kryphex-install-card ol { margin: 0; padding-left: 20px; line-height: 1.65; color: #1f3965; }
      .kryphex-install-card .actions { margin-top: 14px; display: flex; justify-content: flex-end; }
      .kryphex-update-banner {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        z-index: 4500;
        display: none;
        align-items: center;
        gap: 10px;
        background: #0f2a57;
        color: #dbeafe;
        border: 1px solid rgba(191, 219, 254, 0.32);
        border-radius: 14px;
        padding: 10px 12px;
        box-shadow: 0 16px 36px rgba(2, 6, 23, 0.28);
      }
      .kryphex-update-banner.open { display: flex; }
      .kryphex-update-banner button {
        border: 1px solid #93c5fd;
        background: #1d4ed8;
        color: #fff;
        border-radius: 10px;
        padding: 6px 10px;
        font-weight: 700;
        cursor: pointer;
      }`;
      document.head.appendChild(style);

      const modal = document.createElement("div");
      modal.id = "kryphexInstallModal";
      modal.className = "kryphex-install-modal";
      modal.innerHTML = `
        <div class="kryphex-install-card">
          <h3>Install Kryphex App</h3>
          <p>Use your browser install menu when direct prompt is unavailable.</p>
          <ol>
            <li>Edge: open <strong>...</strong> menu.</li>
            <li>Select <strong>Apps</strong>.</li>
            <li>Click <strong>Install this site as an app</strong>.</li>
          </ol>
          <div class="actions">
            <button id="kryphexInstallClose" class="btn-outline" type="button">Close</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("open");
      });
      const closeBtn = document.getElementById("kryphexInstallClose");
      if (closeBtn) closeBtn.addEventListener("click", () => modal.classList.remove("open"));

      const updateBar = document.createElement("div");
      updateBar.id = "kryphexUpdateBanner";
      updateBar.className = "kryphex-update-banner";
      updateBar.innerHTML = `
        <span>New app version available.</span>
        <button id="kryphexUpdateNow" type="button">Refresh</button>
      `;
      document.body.appendChild(updateBar);
      const updateBtn = document.getElementById("kryphexUpdateNow");
      if (updateBtn) {
        updateBtn.addEventListener("click", () => {
          if (swRegistration && swRegistration.waiting) {
            swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          window.location.reload();
        });
      }
    }

    window.kryphexShowInstallGuide = function () {
      ensurePwaUi();
      const modal = document.getElementById("kryphexInstallModal");
      if (modal) modal.classList.add("open");
    };

    function showUpdateBanner() {
      ensurePwaUi();
      const bar = document.getElementById("kryphexUpdateBanner");
      if (bar) bar.classList.add("open");
    }

    function hookServiceWorkerUpdates(reg) {
      if (!reg) return;
      swRegistration = reg;
      if (reg.waiting) showUpdateBanner();
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (didReloadFromControllerChange) return;
        didReloadFromControllerChange = true;
        window.location.reload();
      });
    }

    window.addEventListener("load", () => ensurePwaUi(), { once: true });
  }

  const head = document.head || document.getElementsByTagName("head")[0];
  if (!head) return;

  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/manifest.webmanifest";
    head.appendChild(manifest);
  }

  if (!document.querySelector('meta[name="theme-color"]')) {
    const theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.content = "#1d4ed8";
    head.appendChild(theme);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener(
      "load",
      async () => {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js");
          swRegistration = reg;
          if (typeof hookServiceWorkerUpdates === "function") {
            hookServiceWorkerUpdates(reg);
          }
        } catch (_) {}
      },
      { once: true }
    );
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initPwa();
  const user = await getCurrentUser();
  if (user) applyStoredUserSettings(user);
  updateAuthArea();
  injectToolBackButton();
  injectAutoFooter();
});







