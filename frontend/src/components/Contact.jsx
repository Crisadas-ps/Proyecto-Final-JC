export default function Contact() {
  return (
    <section id="contacto" className="contact-section">
      <h2>Contáctanos</h2>
      <p>¿Necesitas ayuda con tu dispositivo? Estamos aquí para ayudarte.</p>

      <div className="contact-grid">
        <div className="contact-item">
          <h3>📱 Teléfonos</h3>
          <p>
            <a href="https://wa.me/593978717924" target="_blank" rel="noopener noreferrer">
              0978717924
            </a>
          </p>
          <p>
            <a href="https://wa.me/593960455321" target="_blank" rel="noopener noreferrer">
              0960455321
            </a>
          </p>
        </div>

        <div className="contact-item">
          <h3>✉️ Correos electrónicos</h3>
          <p>
            <a href="mailto:eimycruzquilligana@gmail.com">
              eimycruzquilligana@gmail.com
            </a>
          </p>
          <p>
            <a href="mailto:crsithiansanchezp13@gmail.com">
              crsithiansanchezp13@gmail.com
            </a>
          </p>
        </div>

        <div className="contact-item">
          <h3>🕒 Horario de atención</h3>
          <p>Lunes a viernes</p>
          <p>08:00 - 17:00</p>
        </div>
      </div>
    </section>
  );
}