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

async function updateAuthArea() {
  const authArea = document.getElementById("authArea");
  if (!authArea) return;

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
          ${isAdmin ? '<a href="/tools/console.html" class="auth-action">Console</a>' : ""}
          <button class="auth-action danger" id="logoutBtn" type="button">Log Out</button>
        </div>
      </div>
    `;

    const menu = document.getElementById("authProfileMenu");
    const trigger = document.getElementById("authProfileTrigger");
    const dropdown = document.getElementById("authDropdown");
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

document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();
  if (user) applyStoredUserSettings(user);
  updateAuthArea();
  injectToolBackButton();
  injectAutoFooter();
});






