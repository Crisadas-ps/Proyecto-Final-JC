const API_BASE = import.meta.env.VITE_API_BASE || '';
export async function api(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, { credentials: 'include', ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ocurrió un error.');
  return data;
}
