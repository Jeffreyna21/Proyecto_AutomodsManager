import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AutoDetailPage({ autoId, go }) {
  const [auto, setAuto] = useState(null);
  const [analisis, setAnalisis] = useState(null);
  const [mods, setMods] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api(`/api/v1/autos/${autoId}`),
      api(`/api/v1/autos/${autoId}/analisis`).catch(() => null),
      api(`/api/v1/autos/${autoId}/modificaciones`).catch(() => [])
    ]).then(([a, an, m]) => {
      setAuto(a);
      setAnalisis(an);
      setMods(m);
    }).catch((e) => setError(e.message));
  }, [autoId]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!auto) return <p>Cargando...</p>;

  return (
    <div>
      <button onClick={() => go('autos')} style={{ marginBottom: 12 }}>← Volver</button>
      <h2>{auto.placa} — {auto.marca} {auto.modelo} ({auto.anio})</h2>
      {analisis && analisis.metricas && (
        <section style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Análisis</h3>
          <p>Modificaciones: <strong>{analisis.metricas.numeroModificaciones}</strong></p>
          <p>Impacto total: <strong>{analisis.metricas.impactoTotal}</strong></p>
          <p>Costo total: <strong>${analisis.metricas.costoTotal}</strong></p>
          <p>Indicador: <strong>{analisis.metricas.indicador}</strong></p>
        </section>
      )}
      <section>
        <h3>Modificaciones</h3>
        {mods.length === 0 ? <p>Sin modificaciones.</p> : (
          <ul>
            {mods.map((m) => (
              <li key={m.id}>{m.nombre} — {m.tipoModificacion} — Impacto: {m.nivelImpacto} — ${m.costo}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
