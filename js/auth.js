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
  window.location.href = "index.html";
}

async function protectPage(redirectPath = "index.html") {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectPath;
  }
}

async function updateAuthArea() {
  const authArea = document.getElementById("authArea");
  if (!authArea) return;

  const user = await getCurrentUser();

  if (user) {
    authArea.innerHTML = `
      <a href="tools/console.html">Console</a>
      <a href="javascript:void(0)" id="logoutBtn">Logout</a>
    `;

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
      });
    }
    return;
  }

  authArea.innerHTML = `
    <a href="auth/login.html">Login</a>
    <a href="auth/signup.html" class="btn-nav">Sign Up</a>
  `;
}

document.addEventListener("DOMContentLoaded", updateAuthArea);
