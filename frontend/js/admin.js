const loginPanel = document.querySelector('#loginPanel');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#loginForm');
const loginStatus = document.querySelector('#loginStatus');
const dashboardStatus = document.querySelector('#dashboardStatus');
const requestsBody = document.querySelector('#requestsBody');

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ocurrió un error.');
  return data;
}

function showDashboard(user) {
  loginPanel.hidden = true; dashboard.hidden = false;
  document.querySelector('#welcomeText').textContent = `Sesión iniciada: ${user.name} (${user.email})`;
  loadRequests();
}

async function loadRequests() {
  dashboardStatus.textContent = 'Cargando solicitudes...';
  try {
    const requests = await api('/api/admin/requests');
    requestsBody.replaceChildren();
    if (!requests.length) dashboardStatus.textContent = 'Todavía no hay solicitudes registradas.';
    else dashboardStatus.textContent = `${requests.length} solicitud(es) encontrada(s).`;
    requests.forEach(item => {
      const row = document.createElement('tr');
      const values = [item.code, item.name, `${item.email}${item.phone ? ` · ${item.phone}` : ''}`, `${item.device} · ${item.service}`, item.message, new Date(item.createdAt).toLocaleString('es-EC')];
      values.forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
      const statusCell = document.createElement('td');
      const select = document.createElement('select');
      ['Pendiente', 'En proceso', 'Finalizada'].forEach(status => {
        const option = document.createElement('option'); option.value = status; option.textContent = status; option.selected = item.status === status; select.append(option);
      });
      select.addEventListener('change', async () => {
        select.disabled = true;
        try { await api(`/api/admin/requests/${encodeURIComponent(item._id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); dashboardStatus.textContent = `Estado actualizado para ${item.code}.`; }
        catch (error) { dashboardStatus.textContent = error.message; select.value = item.status; }
        finally { select.disabled = false; }
      });
      statusCell.append(select); row.append(statusCell); requestsBody.append(row);
    });
  } catch (error) { dashboardStatus.textContent = error.message; }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button'); button.disabled = true; loginStatus.textContent = 'Verificando...';
  const credentials = Object.fromEntries(new FormData(loginForm));
  try { const result = await api('/api/admin/login', { method: 'POST', body: JSON.stringify(credentials) }); loginForm.reset(); showDashboard(result.user); }
  catch (error) { loginStatus.textContent = error.message; }
  finally { button.disabled = false; }
});

document.querySelector('#logoutBtn').addEventListener('click', async () => {
  try { await api('/api/admin/logout', { method: 'POST' }); }
  catch (error) { dashboardStatus.textContent = error.message; }
  dashboard.hidden = true; loginPanel.hidden = false;
});

(async () => {
  try { const result = await api('/api/admin/me'); showDashboard(result.user); }
  catch { loginPanel.hidden = false; dashboard.hidden = true; }
})();
