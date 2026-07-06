import React, { useState } from 'react';
import { api } from '../api.js';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      onLogin(res.user);
      sessionStorage.setItem('user', JSON.stringify(res.user));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: '60px auto', fontFamily: 'system-ui' }}>
      <h2>Iniciar sesión</h2>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Usuario
        <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
      </label>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
      <p style={{ fontSize: 12, color: '#666', marginTop: 12 }}>Usuarios de prueba: admin/admin, user/user123</p>
    </form>
  );
}
