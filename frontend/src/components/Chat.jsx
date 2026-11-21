
import { useState } from 'react';
import { api } from '../services/api';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      text: '¡Hola! Soy el asistente virtual de ElectroFix. Puedo orientarte sobre reparaciones, mantenimiento, repuestos y problemas comunes de tus dispositivos. ¿En qué puedo ayudarte?',
      user: false
    }
  ]);

  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();

    const message = input.trim();
    if (!message || busy) return;

    setMessages(m => [...m, { text: message, user: true }]);
    setInput('');
    setBusy(true);
    setStatus('Preparando respuesta...');

    try {
      const result = await api('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ message })
      });

      setMessages(m => [...m, { text: result.answer, user: false }]);
      setStatus('');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="asistente" className="muted-bg section">
      <div className="wrap">
        <div className="heading">
          <div>
            <p className="tagline">ASISTENTE PERSONALIZADO</p>
            <h2>Asistente ElectroFix</h2>
          </div>
          <p className="muted">
            Consulta servicios, repuestos y orientación inicial.
          </p>
        </div>

        <div className="card chat">
          <div className="chat-head">
            <b>EF</b>
            <div>
              <strong>Asistente ElectroFix</strong>
              <small>Asistente virtual</small>
            </div>
          </div>

          <div className="messages" aria-live="polite">
            {messages.map((m, i) => (
              <p
                className={`bubble ${m.user ? 'user-bubble' : ''}`}
                key={i}
              >
                {m.text}
              </p>
            ))}
          </div>

          <form className="chat-form" onSubmit={submit}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength="2000"
              required
              placeholder="Escribe tu consulta..."
              aria-label="Tu consulta"
            />

            <button
              disabled={busy}
              type="submit"
              aria-label="Enviar consulta"
            >
              ➤
            </button>
          </form>

          <p className="status" role="status">{status}</p>
        </div>
      </div>
    </section>
  );
}
