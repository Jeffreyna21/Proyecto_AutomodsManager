import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import AutosListPage from './pages/AutosListPage.jsx';
import AutoDetailPage from './pages/AutoDetailPage.jsx';

export default function App() {
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('user') || 'null'));
  const [page, setPage] = useState(window.location.hash.slice(1) || 'autos');
  const [selectedAutoId, setSelectedAutoId] = useState(null);

  useEffect(() => {
    window.addEventListener('hashchange', () => setPage(window.location.hash.slice(1) || 'autos'));
  }, []);

  function go(p, id = null) {
    window.location.hash = p;
    setPage(p);
    setSelectedAutoId(id);
  }

  function logout() {
    sessionStorage.removeItem('user');
    setUser(null);
    go('autos');
  }

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: 8 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>AutoMods Manager</h1>
        <div>
          <span style={{ marginRight: 12 }}>{user.username}</span>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </header>
      {page === 'autos' && <AutosListPage go={go} />}
      {page === 'auto' && <AutoDetailPage autoId={selectedAutoId} go={go} />}
    </div>
  );
}
