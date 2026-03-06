function settingsKey(userId){return 'kryphex_settings_' + userId;}

async function resolveSettingsIdentity(user){
  const profileStoreKey = 'kryphex_profile_' + user.id;
  let localProfile = {};
  try {
    const raw = localStorage.getItem(profileStoreKey);
    localProfile = raw ? JSON.parse(raw) : {};
  } catch {
    localProfile = {};
  }

  const remoteMeta = user.user_metadata || {};

  const name = (remoteMeta.name || localProfile.name || user.email || 'User').trim();
  const company = (remoteMeta.company || localProfile.company || 'Kryphex').trim();
  const baseRole = (remoteMeta.role || localProfile.role || 'Security Member').trim();

  let isAdmin = false;
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!error) {
      const role = (profile && profile.role ? String(profile.role) : '').trim().toLowerCase();
      isAdmin = role === 'admin';
    }
  } catch {
    isAdmin = false;
  }

  const role = isAdmin ? 'Founder/C.E.O' : baseRole;
  return { name, company, role };
}

async function setSettingsIdentity(user){
  const identity = await resolveSettingsIdentity(user);
  const name = identity.name;
  const initials = (name.match(/\b\w/g) || []).slice(0,2).join('').toUpperCase() || 'U';

  const av = document.getElementById('settingsAvatar');
  const nm = document.getElementById('settingsName');
  const meta = document.querySelector('.acct span');

  if(av) av.textContent = initials;
  if(nm) nm.textContent = name;
  if(meta) meta.textContent = identity.role + ' | ' + identity.company;
}

function setSettingsStatus(msg, isError){
  const el = document.getElementById('status');
  if(!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? '#b91c1c' : '#0f766e';
}

function downloadJson(name, payload){
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function requireSettingsUser(){
  await protectPage('/auth/login.html');
  const user = await getCurrentUser();
  if(!user) return null;
  await setSettingsIdentity(user);
  return user;
}
