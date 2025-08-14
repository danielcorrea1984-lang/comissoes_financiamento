// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import api from '../api';

export default function ForgotPassword({ onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    const eTrim = (email || '').trim().toLowerCase();
    if (!eTrim) {
      setErr('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/check-email', { email: eTrim });
      if (data?.exists) {
        // popup centralizado
        const largura = 500;
        const altura = 420;
        const esquerda = Math.max(0, Math.round((window.screen.width - largura) / 2));
        const topo = Math.max(0, Math.round((window.screen.height - altura) / 2));
        const features = [
          `width=${largura}`,
          `height=${altura}`,
          `left=${esquerda}`,
          `top=${topo}`,
          'menubar=no',
          'toolbar=no',
          'location=no',
          'status=no',
          'scrollbars=yes',
          'resizable=yes,noreferrer' // sem fallback de navegação!
        ].join(',');
        const url = `/reset-password?email=${encodeURIComponent(eTrim)}`;
        const win = window.open(url, 'AJ7ResetPwd', features);
        if (!win) {
          alert('Seu navegador bloqueou o pop-up. Libere pop-ups para este site e tente novamente.');
        }
        onClose?.(); // fecha apenas o modal
      } else {
        setErr('E-mail não encontrado.');
      }
    } catch (e) {
      setErr('Falha ao verificar o e-mail.');
    } finally {
      setLoading(false);
    }
  }

  const backdropStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const panelStyle = {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    color: '#000',
    borderRadius: 8,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    padding: '20px',
  };

  const headerStyle = {
    marginBottom: 10,
    borderBottom: '1px solid #eee',
    paddingBottom: 8,
  };

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true">
      <div style={panelStyle}>
        <div style={headerStyle} className="d-flex align-items-center">
          <h5 className="m-0">Recuperar senha</h5>
          <button type="button" className="btn btn-sm btn-link ms-auto" onClick={onClose}>Fechar</button>
        </div>

        <form onSubmit={submit}>
          <label className="form-label">E-mail</label>
          <input
            className="form-control mb-3"
            placeholder="seuemail@exemplo.com"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />

          {err && <div className="alert alert-danger py-2">{err}</div>}
          {msg && <div className="alert alert-success py-2">{msg}</div>}

          <button className="btn btn-primary w-100" type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
