
import { useEffect, useState } from 'react';
import { api } from '../services/api';

const money = (v) =>
  v == null ? 'Consultar' : `$${Number(v).toFixed(2)}`;

export default function Catalog({ onProduct }) {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('Cargando catálogo...');

  useEffect(() => {
    api('/api/products')
      .then((p) => {
        setProducts(p);

        setStatus(
          p.length
            ? `${p.length} productos disponibles para consulta.`
            : 'Todavía no hay productos publicados.'
        );
      })
      .catch((e) => setStatus(e.message));
  }, []);

  return (
    <section id="catalogo" className="section muted-bg">
      <div className="wrap">
        <div className="heading">
          <div>
            <p className="tagline">CATÁLOGO</p>
            <h2>Repuestos y accesorios</h2>
          </div>

          <p className="muted">
            Los mejores precios y servicios para tu dispositivo.
          </p>
        </div>

        <p className="status" role="status">
          {status}
        </p>

        <div className="grid four">
          {products.map((p) => (
            <article className="card product" key={p._id}>
              <div className="product-icon">
                {p.icon || '🔧'}
              </div>

              <span className="tagline">{p.category}</span>

              <h3>{p.name}</h3>

              <p className="muted">{p.description}</p>

              <div className="price">
                <b>
                  {p.priceOnRequest ? 'Consultar' : money(p.price)}
                </b>

                <button onClick={() => onProduct(p)}>
                  Consultar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
