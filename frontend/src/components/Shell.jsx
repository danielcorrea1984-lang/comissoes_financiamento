// frontend/src/components/Shell.jsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getUserInfo } from '../api';

export default function Shell({ children, onLogout }) {
  const nav = useNavigate();
  const user = getUserInfo();
  const isAdmin = user?.role === 'admin';

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout?.();
    nav('/login', { replace: true });
  }

  const containerStyle = {
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
    padding: '0 16px'
  };

  const activeClass = ({ isActive }) =>
    'nav-link px-3 py-2 rounded ' + (isActive ? 'bg-primary text-white' : 'text-white');

  return (
    <div>
      {/* Topo */}
<header
  className="app-header py-2"
  style={{ background: '#fff', borderBottom: '1px solid #eee', position: 'relative' }}
>
  <div style={containerStyle} className="d-flex align-items-center">
    {/* Logo à esquerda */}
    <Link to="/app" className="d-flex align-items-center text-decoration-none">
      <img src="/logo.png" alt="AJ7" style={{ height: 42, marginRight: 10 }} />
    </Link>

    {/* Texto centralizado */}
    <div
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        fontWeight: 'bold',
        fontSize: '1.4rem',
        whiteSpace: 'nowrap',
      }}
    >
      Controle de Vendas e Comissões
    </div>

    {/* Usuário e botão sair à direita */}
    <div className="ms-auto d-flex align-items-center">
      <div className="text-end me-3 small">
        <div className="fw-semibold">{user?.nome || 'Usuário'}</div>
        <div className="text-muted">{user?.email}</div>
      </div>
      <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
        Sair
      </button>
    </div>
  </div>
</header>

      {/* Navbar centralizada */}
      <nav className="navbar" style={{ background: 'var(--brand-bg, #0B2A4A)' }}>
        <div style={containerStyle} className="d-flex gap-2">
          <NavLink to="/app" className={activeClass} end>Dashboard</NavLink>
          <NavLink to="/sales" className={activeClass}>Vendas</NavLink>
          {isAdmin && <NavLink to="/cadastros" className={activeClass}>Cadastro</NavLink>}
        </div>
      </nav>

      {/* Conteúdo */}
      <main style={{ ...containerStyle, paddingTop: 16, paddingBottom: 24 }}>
        {children}
      </main>
    </div>
  );
}
