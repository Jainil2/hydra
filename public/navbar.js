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
      // Let the server initiate Hydra's logout (which will also clear cookies)
      window.location.href = '/auth/logout';
    });
  } catch (e) {
    // ignore
  }
}
document.addEventListener('DOMContentLoaded', updateNavbar);
