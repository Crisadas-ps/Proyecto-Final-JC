const menuBtn = document.querySelector('#menuBtn');
const nav = document.querySelector('#nav');
menuBtn?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); menuBtn?.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
  document.querySelector('#service').value = button.dataset.service;
  document.querySelector('#solicitud').scrollIntoView({ behavior: 'smooth' });
}));

const productGrid = document.querySelector('#productGrid');
const catalogStatus = document.querySelector('#catalogStatus');
const money = value => value == null ? 'Consultar' : `$${Number(value).toFixed(2)}`;

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('No se pudo consultar el catálogo.');
    const products = await response.json();
    productGrid.replaceChildren();
    if (!products.length) catalogStatus.textContent = 'Todavía no hay productos publicados.';
    else catalogStatus.textContent = `${products.length} productos disponibles para consulta.`;
    products.forEach(product => {
      const card = document.createElement('article');
      card.className = 'card product';
      const icon = document.createElement('div'); icon.className = 'product-icon'; icon.textContent = product.icon || '🔧';
      const category = document.createElement('span'); category.className = 'tagline'; category.textContent = product.category;
      const title = document.createElement('h3'); title.textContent = product.name;
      const description = document.createElement('p'); description.className = 'muted'; description.textContent = product.description;
      const price = document.createElement('div'); price.className = 'price';
      const amount = document.createElement('b'); amount.textContent = product.priceOnRequest ? 'Consultar' : money(product.price);
      const button = document.createElement('button'); button.textContent = 'Consultar';
      button.addEventListener('click', () => {
        document.querySelector('#service').value = 'Pedido de repuestos';
        document.querySelector('#description').value = `Quisiera consultar por ${product.name}. ¿Es compatible con mi dispositivo?`;
        document.querySelector('#solicitud').scrollIntoView({ behavior: 'smooth' });
      });
      price.append(amount, button); card.append(icon, category, title, description, price); productGrid.append(card);
    });
  } catch (error) { catalogStatus.textContent = error.message; }
}
loadProducts();

document.querySelector('#requestForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector('#formStatus');
  if (!form.reportValidity()) return;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true; submit.textContent = 'Enviando...'; status.textContent = '';
  const data = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch('/api/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo enviar la solicitud.');
    status.textContent = `${result.message} Tu código de seguimiento es ${result.code}.`;
    form.reset();
  } catch (error) { status.textContent = error.message; }
  finally { submit.disabled = false; submit.textContent = 'Enviar solicitud'; }
});
