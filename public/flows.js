async function fetchJson(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}

document.getElementById('start_auth').addEventListener('click', () => {
  const client = encodeURIComponent(document.getElementById('client_id').value);
  const redirect = encodeURIComponent(document.getElementById('redirect_uri').value);
  const scope = encodeURIComponent(document.getElementById('scope').value);
  const url = `${window.location.origin.replace(':3000', ':4444')}/oauth2/auth?response_type=code&scope=${scope}&client_id=${client}&redirect_uri=${redirect}&state=demo&nonce=demo`;
  window.open(url, '_blank');
});

document.getElementById('generate_pkce').addEventListener('click', async () => {
  const r = await fetchJson('/demo/pkce');
  const client = encodeURIComponent(document.getElementById('client_id').value);
  const redirect = encodeURIComponent(document.getElementById('redirect_uri').value);
  const scope = encodeURIComponent(document.getElementById('scope').value);
  const url = `${window.location.origin.replace(':3000', ':4444')}/oauth2/auth?response_type=code&scope=${scope}&client_id=${client}&redirect_uri=${redirect}&state=demo&nonce=demo&code_challenge=${r.challenge}&code_challenge_method=S256`;
  document.getElementById('pkce_info').innerText = JSON.stringify(r, null, 2);
  window.open(url, '_blank');
  // store verifier locally so user can exchange later
  localStorage.setItem('pkce_verifier', r.verifier);
});

// add a button to exchange code with stored verifier
const exchangeBtn = document.createElement('button');
exchangeBtn.innerText = 'Exchange PKCE (paste code then click)';
exchangeBtn.addEventListener('click', async () => {
  const code = prompt('Paste authorization code (from callback)');
  const verifier = localStorage.getItem('pkce_verifier');
  if (!verifier) return showToast('No verifier found. Generate PKCE first.');
  const client_id = document.getElementById('client_id').value;
  const redirect_uri = document.getElementById('redirect_uri').value;
  const res = await fetchJson('/demo/exchange-pkce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, redirect_uri, client_id, code_verifier: verifier }) });
  document.getElementById('pkce_info').innerText = JSON.stringify(res, null, 2);
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
