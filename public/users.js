async function listUsers(){
  try {
    const res = await fetch('/auth/users');
    const j = await res.json();
    document.getElementById('users_output').innerText = JSON.stringify(j, null, 2);
  } catch (e) { showToast('Failed to load users'); }
}
document.getElementById('reload_users').addEventListener('click', listUsers);
document.getElementById('create_user').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const f = new FormData(e.target);
  const body = { username: f.get('username'), password: f.get('password') };
  try {
    const res = await fetch('/auth/seed-user', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) { showToast('Create failed: ' + (j.error || res.status)); return; }
    showToast('User created');
    listUsers();
  } catch (err) { showToast('Create failed'); }
});
// initial load
listUsers();
