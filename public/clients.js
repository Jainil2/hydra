async function listClients(){
  try {
    const res = await fetch('/clients');
    const data = await res.json();
    const table = document.getElementById('clients_table');
    table.innerHTML = '';
    if (!Array.isArray(data)) { table.innerText = JSON.stringify(data, null, 2); return; }
    const header = document.createElement('tr');
    header.innerHTML = '<th>ID</th><th>Client ID</th><th>Redirect URIs</th><th>Grant Types</th>';
    table.appendChild(header);
    data.forEach(c=>{
      const row = document.createElement('tr');
      row.style.borderTop = '1px solid #eee';
      row.innerHTML = `<td>${c.id || ''}</td><td>${c.client_id || ''}</td><td>${(c.redirect_uris||[]).join(', ')}</td><td>${(c.grant_types||[]).join(', ')}</td>`;
      table.appendChild(row);
    });
  } catch(e){ showToast('Failed loading clients'); }
}
document.getElementById('reload_clients').addEventListener('click', listClients);
document.getElementById('create_client').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = new FormData(e.target);
  const body = { client_id: form.get('client_id'), client_secret: form.get('client_secret'), redirect_uris: form.get('redirect_uris').split(','), grant_types: form.get('grant_types').split(',') };
  try {
    const res = await fetch('/clients/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json();
    showToast('Client created');
    listClients();
  } catch(e){ showToast('Create failed'); }
});
// initial
listClients();
