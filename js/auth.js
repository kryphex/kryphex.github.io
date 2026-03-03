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
    const safeRole = escapeHtml(displayRole);
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

document.addEventListener("DOMContentLoaded", updateAuthArea);
