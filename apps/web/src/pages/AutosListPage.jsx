import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AutosListPage({ go }) {
  const [autos, setAutos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/v1/autos').then(setAutos).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Mis vehículos</h2>
      {autos.length === 0 ? (
        <p>No tenés vehículos registrados todavía.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {autos.map((a) => (
            <li key={a.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 8, borderRadius: 4, cursor: 'pointer' }} onClick={() => go('auto', a.id)}>
              <strong>{a.placa}</strong> — {a.marca} {a.modelo} ({a.anio})
              {a.metricas && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Modificaciones: {a.metricas.numeroModificaciones} · Impacto: {a.metricas.impactoTotal} · Indicador: {a.metricas.indicador}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
