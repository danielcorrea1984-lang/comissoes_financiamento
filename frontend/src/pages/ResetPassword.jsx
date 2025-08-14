// frontend/src/pages/ResetPasswordWindow.jsx
import React, { useMemo, useState, useEffect } from 'react';
import api from '../api';

export default function ResetPasswordWindow() {
  const params = new URLSearchParams(window.location.search);
  const email = (params.get('email') || '').trim().toLowerCase();

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');

  // garante que os campos estejam sempre vazios ao abrir
  useEffect(() => {
    setPwd('');
    setConfirm('');
  }, [email]);

  const strength = useMemo(() => {
    const checks = [
      /.{8,}/,       // 8+ chars
      /[0-9]/,       // número
      /[a-z]/,       // minúscula
      /[A-Z]/,       // maiúscula
      /[^A-Za-z0-9]/ // especial
    ];
    const score = checks.reduce((acc, rx) => acc + (rx.test(pwd) ? 1 : 0), 0);
    const pct = (score / checks.length) * 100;
    let label = 'Muito fraca';
    let cls = 'bg-danger';
    if (score === 2) { label = 'Fraca'; cls = 'bg-danger'; }
    if (score === 3) { label = 'Média'; cls = 'bg-warning'; }
    if (score === 4) { label = 'Forte'; cls = 'bg-info'; }
    if (score === 5) { label = 'Muito forte'; cls = 'bg-success'; }
    return { score, pct, label, cls };
  }, [pwd]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!email) {
      setErr('Abra esta janela a partir do “Esqueci minha senha”.');
      return;
    }
    if (pwd !== confirm) {
      setErr('As senhas não conferem.');
      return;
    }
    if (pwd.length < 6) {
      setErr('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, password: pwd });
      setOk(true);
    } catch (e) {
      setErr(e?.response?.data?.msg || 'Falha ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  function closeWindow() {
    // fecha apenas a janelinha de reset
    window.close();
  }

  // Layout simples centrado
  const wrap = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f6f7f9'
  };
  const panel = {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
    padding: 20
  };

  return (
    <div style={wrap}>
      <div style={panel}>
        {!ok ? (
          <>
            <h5 className="mb-3 text-center">Definir nova senha</h5>
            <form key={email || 'reset'} onSubmit={submit} autoComplete="off">
              <div className="mb-2">
                <label className="form-label">E-mail</label>
                <input
                  className="form-control"
                  value={email}
                  disabled
                  readOnly
                  autoComplete="off"
                />
              </div>

              <div className="mb-2">
                <label className="form-label">Nova senha</label>
                <div className="input-group">
                  <input
                    className="form-control"
                    type={show ? 'text' : 'password'}
                    value={pwd}
                    onChange={e => setPwd(e.target.value)}
                    autoFocus
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    name="new-password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShow(s => !s)}
                    tabIndex={-1}
                  >
                    {show ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {/* Barra de força */}
                <div className="progress mt-2" style={{ height: 8 }}>
                  <div
                    className={`progress-bar ${strength.cls}`}
                    role="progressbar"
                    style={{ width: `${strength.pct}%` }}
                    aria-valuenow={strength.pct}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
                <small className="text-muted">{strength.label}</small>
              </div>

              <div className="mb-2">
                <label className="form-label">Confirmar senha</label>
                <input
                  className="form-control"
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  name="confirm-password"
                />
              </div>

              {err && <div className="alert alert-danger py-2">{err}</div>}

              <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>

              <button type="button" className="btn btn-link w-100 mt-2" onClick={closeWindow}>
                Voltar ao login
              </button>
            </form>
          </>
        ) : (
          <>
            <h5 className="mb-2 text-center">Senha redefinida!</h5>
            <p className="text-center text-muted">
              Sua senha foi alterada com sucesso.
            </p>
            <button className="btn btn-success w-100" onClick={closeWindow}>
              Voltar ao login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
