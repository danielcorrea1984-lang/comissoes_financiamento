import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setToken, setUser } from '../api';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modais de recuperação
  const [showForgot, setShowForgot] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password: senha });
      const token = data.access_token;
      setToken(token);
      setUser(data.user);

      // POPUP centralizado e maior
      const largura = 1200;
      const altura = 800;
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
        'resizable=yes'
      ].join(',');

      const win = window.open('/app', 'AJ7App', features);
      if (!win) {
        nav('/app'); // Fallback caso o navegador bloqueie o popup
      }
    } catch (err) {
      setError(err?.response?.data?.msg || 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Lado esquerdo - logo com fundo azul escuro */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#002E5D', // azul escuro AJ7 Seguros
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="/logo.png"
            alt="Logo AJ7 Seguros"
            style={{ maxWidth: '70%', height: 'auto' }}
          />
        </div>

        {/* Lado direito - formulário de login */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div style={{ width: '100%', maxWidth: '350px' }}>
            <h3 className="mb-3 text-center">Entrar</h3>
            <form onSubmit={submit}>
              <input
                className="form-control mb-2"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="form-control mb-2"
                placeholder="Senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <button
                disabled={loading}
                className="btn btn-primary w-100"
                type="submit"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => setShowForgot(true)}
              >
                Esqueci minha senha
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Esqueci minha senha */}
      {showForgot && (
        <ForgotPassword
          onClose={() => setShowForgot(false)}
          onProceed={(emailOk) => {
            setShowForgot(false);
            setResetEmail(emailOk || '');
            setShowReset(true);
          }}
        />
      )}

      {/* Modal: Definir nova senha */}
      {showReset && (
        <ResetPassword
          email={resetEmail}
          onClose={() => setShowReset(false)}
          onSuccess={() => {
            setShowReset(false);
            // opcional: mensagem de sucesso aqui, se quiser
          }}
        />
      )}
    </>
  );
}
