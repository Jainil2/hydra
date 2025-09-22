async function fetchJson(path, opts) {
  const res = await fetch(path, opts);
  const txt = await res.text();
  try {
    const data = JSON.parse(txt);
    if (!res.ok) throw { status: res.status, data };
    return data;
  } catch (err) {
    if (!res.ok) throw { status: res.status, data: txt };
    try { return JSON.parse(txt); } catch (_){ return txt; }
  }
}

// generate a sufficiently long random string for state and nonce
function randomString(len = 24) {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(n => (n % 36).toString(36))
    .join('');
}

document.getElementById('start_auth').addEventListener('click', () => {
  const client = encodeURIComponent(document.getElementById('client_id').value);
  const redirect = encodeURIComponent(document.getElementById('redirect_uri').value);
  const scope = encodeURIComponent(document.getElementById('scope').value);
  const state = randomString(24);
  const nonce = randomString(24);
  const url = `${window.location.origin.replace(':3000', ':4444')}/oauth2/auth?response_type=code&scope=${scope}&client_id=${client}&redirect_uri=${redirect}&state=${encodeURIComponent(state)}&nonce=${encodeURIComponent(nonce)}`;
  window.open(url, '_blank');
});

document.getElementById('generate_pkce').addEventListener('click', async () => {
  try {
    const r = await fetchJson('/demo/pkce');
  // prefer PKCE-specific inputs if present, otherwise fall back to general fields
  const clientVal = document.getElementById('pkce_client_id') && document.getElementById('pkce_client_id').value
    ? document.getElementById('pkce_client_id').value
    : document.getElementById('client_id').value;
  const client = encodeURIComponent(clientVal);
  const redirectVal = document.getElementById('pkce_redirect_uri') && document.getElementById('pkce_redirect_uri').value
    ? document.getElementById('pkce_redirect_uri').value
    : document.getElementById('redirect_uri').value;
  const redirect = encodeURIComponent(redirectVal);
  const scope = encodeURIComponent(document.getElementById('pkce_scope') ? document.getElementById('pkce_scope').value : document.getElementById('scope').value);
  const state = randomString(24);
  const nonce = randomString(24);
  const url = `${window.location.origin.replace(':3000', ':4444')}/oauth2/auth?response_type=code&scope=${scope}&client_id=${client}&redirect_uri=${redirect}&state=${encodeURIComponent(state)}&nonce=${encodeURIComponent(nonce)}&code_challenge=${r.challenge}&code_challenge_method=S256`;
  document.getElementById('pkce_info').innerText = JSON.stringify(r, null, 2);
  window.open(url, '_blank');
  // store verifier and client info locally so user can exchange later
  localStorage.setItem('pkce_verifier', r.verifier);
  localStorage.setItem('pkce_client_id', clientVal);
  // prefer pkce_client_secret input if present
  const pkceSecretVal = (document.getElementById('pkce_client_secret') && document.getElementById('pkce_client_secret').value)
    ? document.getElementById('pkce_client_secret').value
    : (document.getElementById('client_secret') ? document.getElementById('client_secret').value : '');
  localStorage.setItem('pkce_client_secret', pkceSecretVal || '');
  localStorage.setItem('pkce_redirect_uri', redirectVal);
  document.getElementById('pkce_info').innerText = JSON.stringify(r, null, 2) + "\n\nPKCE verifier stored in localStorage. Use 'Exchange PKCE' button and paste the code from the callback. Click 'Copy Verifier' to copy verifier to clipboard if needed.";
  } catch (err) {
    console.error('PKCE generation failed', err);
    document.getElementById('pkce_info').innerText = (err && err.data) ? JSON.stringify(err.data, null, 2) : String(err);
    showToast('PKCE generation failed');
  }
});

// add a button to exchange code with stored verifier
const exchangeBtn = document.createElement('button');
exchangeBtn.innerText = 'Exchange PKCE (paste code then click)';
exchangeBtn.addEventListener('click', async () => {
  const code = prompt('Paste authorization code (from callback)');
  const verifier = localStorage.getItem('pkce_verifier');
  if (!verifier) return showToast('No verifier found. Generate PKCE first.');
  // prefer stored client_id/redirect_uri saved when PKCE was generated
  const client_id = localStorage.getItem('pkce_client_id') || document.getElementById('client_id').value;
  const redirect_uri = localStorage.getItem('pkce_redirect_uri') || document.getElementById('redirect_uri').value;
  const client_secret = localStorage.getItem('pkce_client_secret') || document.getElementById('client_secret').value || '';
  try {
    const body = { code, redirect_uri, client_id, code_verifier: verifier };
    if (client_secret) body.client_secret = client_secret;
    const res = await fetchJson('/demo/exchange-pkce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    document.getElementById('pkce_info').innerText = JSON.stringify(res, null, 2);
  } catch (err) {
    console.error('PKCE exchange failed', err);
    document.getElementById('pkce_info').innerText = (err && err.data) ? JSON.stringify(err.data, null, 2) : String(err);
    showToast('PKCE exchange failed');
  }
});
document.querySelector('section:nth-of-type(2)').appendChild(exchangeBtn);

document.getElementById('decode_token').addEventListener('click', async () => {
  const token = document.getElementById('token_input').value;
  const res = await fetchJson('/demo/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  document.getElementById('token_output').innerText = JSON.stringify(res, null, 2);
  showToast('Decoded token displayed');
});

document.getElementById('verify_token').addEventListener('click', async () => {
  const token = document.getElementById('token_input').value;
  const res = await fetchJson('/demo/verify/full', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  document.getElementById('token_output').innerText = JSON.stringify(res, null, 2);
  showToast('Verification result displayed');
});

document.getElementById('introspect_btn').addEventListener('click', async () => {
  const token = document.getElementById('introspect_token').value;
  const client_id = document.getElementById('introspect_client_id').value;
  const client_secret = document.getElementById('introspect_client_secret').value;
  const res = await fetchJson('/demo/token/introspect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, client_id, client_secret }) });
  document.getElementById('introspect_output').innerText = JSON.stringify(res, null, 2);
});

document.getElementById('revoke_btn').addEventListener('click', async () => {
  const token = document.getElementById('introspect_token').value;
  const client_id = document.getElementById('introspect_client_id').value;
  const client_secret = document.getElementById('introspect_client_secret').value;
  const res = await fetchJson('/demo/token/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, client_id, client_secret }) });
  document.getElementById('introspect_output').innerText = JSON.stringify(res, null, 2);
  showToast('Token revoke requested');
});

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard')).catch(()=> showToast('Copy failed'));
}

document.getElementById('pkce_copy').addEventListener('click', () => {
  const v = localStorage.getItem('pkce_verifier');
  if (!v) return showToast('No verifier stored');
  copyToClipboard(v);
});

document.getElementById('copy_token').addEventListener('click', () => {
  const t = document.getElementById('token_input').value;
  if (!t) return showToast('No token to copy');
  copyToClipboard(t);
});

document.getElementById('copy_introspect').addEventListener('click', () => {
  const text = document.getElementById('introspect_output').innerText;
  if (!text) return showToast('No introspect result');
  copyToClipboard(text);
});

// delegate to shared ui.js if available
if (typeof showToast === 'undefined') {
  function showToast(msg, timeout = 2500) {
    const t = document.getElementById('toast');
    if (t) { t.innerText = msg; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', timeout); }
  }
}
