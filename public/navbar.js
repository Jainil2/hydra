// Fetch session and update navbar
async function updateNavbar() {
  try {
    const res = await fetch('/session');
    const j = await res.json();
    const info = document.getElementById('session_info');
    const logoutBtn = document.getElementById('logout_btn');
    if (j.loggedIn && j.claims) {
      info.innerText = j.claims.sub || j.claims.email || 'Signed in';
      logoutBtn.style.display = 'inline-block';
    } else {
      info.innerText = 'Not signed in';
      logoutBtn.style.display = 'none';
    }
    logoutBtn.addEventListener('click', async ()=>{
      // clear demo cookies on client, then call server logout endpoint if exists
      document.cookie = 'id_token=; Max-Age=0; path=/';
      document.cookie = 'access_token=; Max-Age=0; path=/';
      try { await fetch('/auth/logout', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) }); } catch(e){}
      window.location.href = '/';
    });
  } catch (e) {
    // ignore
  }
}
document.addEventListener('DOMContentLoaded', updateNavbar);
