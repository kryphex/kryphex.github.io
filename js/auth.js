const supabaseClient = supabase.createClient(
  "https://xvtnnszvfbirixppbdtl.supabase.co",
  "YOUR_PUBLIC_KEY"
);

/* =========================
   SESSION HANDLER
========================= */

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  return data?.user || null;
}

/* =========================
   LOGIN
========================= */

async function login(email, password) {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

/* =========================
   SIGNUP
========================= */

async function signup(email, password) {
  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

/* =========================
   LOGOUT
========================= */

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

/* =========================
   ROUTE PROTECTION
========================= */

async function protectPage() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "/index.html";
  }
}