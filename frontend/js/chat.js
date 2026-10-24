const chatForm = document.querySelector('#chatForm');
const messages = document.querySelector('#messages');
const chatStatus = document.querySelector('#chatStatus');

function addBubble(text, type = 'bubble') {
  const bubble = document.createElement('p');
  bubble.className = type;
  bubble.textContent = text;
  messages.append(bubble);
  messages.scrollTop = messages.scrollHeight;
}

chatForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.querySelector('#chatInput');
  const button = chatForm.querySelector('button');
  const message = input.value.trim();
  if (!message) return;
  addBubble(message, 'bubble user-bubble');
  input.value = ''; button.disabled = true; chatStatus.textContent = 'ElectroFix AI está respondiendo...';
  try {
    const response = await fetch('/api/ai', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo obtener respuesta.');
    addBubble(data.answer);
    chatStatus.textContent = '';
  } catch (error) { chatStatus.textContent = error.message; }
  finally { button.disabled = false; input.focus(); }
});
