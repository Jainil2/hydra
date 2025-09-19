// Shared UI helpers: toast and clipboard
function showToast(msg, timeout = 2500) {
  let t = document.getElementById('global_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'global_toast';
    t.style.position = 'fixed';
    t.style.bottom = '20px';
    t.style.right = '20px';
    t.style.background = '#333';
    t.style.color = '#fff';
    t.style.padding = '8px 12px';
    t.style.borderRadius = '6px';
    t.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
    document.body.appendChild(t);
  }
  t.innerText = msg;
  t.style.display = 'block';
  clearTimeout(t._hideTimeout);
  t._hideTimeout = setTimeout(() => t.style.display = 'none', timeout);
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard')).catch(() => showToast('Copy failed'));
}

async function fetchJson(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}

// session helper
async function getSession() {
  try { return await fetchJson('/session'); } catch(e) { return { loggedIn: false }; }
}
