import React, { useState } from 'react';
import api from '../api';

export default function ForgotPassword({ onClose, onProceed }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(''); setError('');
    setLoading(true);
    try {
      // Checa se o e-mail existe
      const { data } = await api.post('/auth/check-email', { email });
      if (data?.exists) {
        // Vai direto para o modal de redefinição com o email preenchido
        onProceed?.(email);
      } else {
        setError('E-mail não encontrado.');
      }
    } catch (err) {
      setError('Falha ao verificar o e-mail.');
    } finally {
      setLoading(false);
    }
  }

  // Modal simples (fundo translúcido, conteúdo 100% opaco)
  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div className="d-flex align-items-center mb-3">
          <h5 className="m-0">Recuperar senha</h5>
          <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="form-label">Informe seu e-mail cadastrado</label>
          <input
            type="email"
            className="form-control mb-2"
            placeholder="seuemail@dominio.com"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />

          {msg && <div className="alert alert-success py-2">{msg}</div>}
          {error && <div className="alert alert-danger py-2">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1050
};
const modalStyle = {
  width: '100%',
  maxWidth: 420,
  background: '#fff',
  borderRadius: 12,
  padding: '16px 16px 18px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
};
